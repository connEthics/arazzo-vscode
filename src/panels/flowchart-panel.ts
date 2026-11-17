import * as vscode from 'vscode';
import * as path from 'path';
import { isMap, isScalar, isSeq, parse as parseYaml } from 'yaml';
import type { Document } from 'yaml';
import { parseArazzo, validate } from '../arazzo-core';
import type { Diagnostic as CoreDiagnostic } from '../arazzo-core';
import { getHtmlForWebview } from './webview-html';
import { ArazzoPreviewPanel } from './preview-panel';

/** Largest OpenAPI source read to label HTTP methods in the graph. */
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/** Webview → extension messages of the flowchart panel. */
export type FlowchartMessage =
    | { type: 'ready' }
    | { type: 'alert'; text: string }
    | { type: 'step-selected'; stepId: string; workflowId: string; reveal?: boolean }
    | { type: 'workflow-selected'; workflowId: string }
    | { type: 'copy-mermaid'; text: string; workflowId?: string }
    | { type: 'export'; format: string; filename: string; encoding: 'utf8' | 'base64'; data: string };

/**
 * Offsets of a step in the YAML document: the `stepId` value (selection) and
 * the whole step mapping. `undefined` when the step does not exist.
 */
export function findStepRange(yamlDoc: Document, workflowId: string, stepId: string): { start: number; end: number; stepStart: number } | undefined {
    const root = yamlDoc.contents;
    if (!isMap(root)) {
        return undefined;
    }
    const workflows = root.get('workflows', true);
    if (!isSeq(workflows)) {
        return undefined;
    }
    for (const wf of workflows.items) {
        if (!isMap(wf) || String((wf.get('workflowId', true) as { value?: unknown } | undefined)?.value) !== workflowId) {
            continue;
        }
        const steps = wf.get('steps', true);
        if (!isSeq(steps)) {
            return undefined;
        }
        for (const step of steps.items) {
            if (!isMap(step)) {
                continue;
            }
            const id = step.get('stepId', true);
            if (isScalar(id) && String(id.value) === stepId && id.range) {
                return { start: id.range[0], end: id.range[1], stepStart: step.range?.[0] ?? id.range[0] };
            }
        }
    }
    return undefined;
}

/**
 * Parsed OpenAPI documents of the local `sourceDescriptions` (relative URLs or
 * `file:` URLs), keyed by source name. The graph uses them to show the real
 * HTTP method of each operation instead of guessing it from its name.
 */
export async function loadLocalSources(resourceUri: vscode.Uri, spec: unknown): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    const list = (spec as { sourceDescriptions?: unknown })?.sourceDescriptions;
    if (!Array.isArray(list)) {
        return out;
    }
    const baseDir = vscode.Uri.joinPath(resourceUri, '..');
    await Promise.all(list.map(async (src: { name?: unknown; url?: unknown; type?: unknown }) => {
        if (typeof src?.name !== 'string' || typeof src.url !== 'string' || (src.type !== undefined && src.type !== 'openapi')) {
            return;
        }
        let target: vscode.Uri;
        if (/^file:/i.test(src.url)) {
            target = vscode.Uri.parse(src.url);
        } else if (/^[a-z][a-z0-9+.-]*:/i.test(src.url)) {
            return; // remote: never fetched from the extension
        } else {
            target = vscode.Uri.joinPath(baseDir, src.url.split('#')[0]);
        }
        try {
            const stat = await vscode.workspace.fs.stat(target);
            // Regular files only: devices and FIFOs report size 0 and would be
            // read forever (e.g. `url: file:///dev/zero`).
            if ((stat.type & vscode.FileType.File) === 0 || stat.size > MAX_SOURCE_BYTES) {
                return;
            }
            const text = Buffer.from(await vscode.workspace.fs.readFile(target)).toString('utf8');
            const doc = parseYaml(text, { logLevel: 'silent' });
            if (doc && typeof doc === 'object') {
                out[src.name] = doc;
            }
        } catch {
            /* missing or unreadable source: no method badges for it */
        }
    }));
    return out;
}

export class ArazzoFlowchartPanel {
    public static panels: Map<string, ArazzoFlowchartPanel> = new Map();
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _resourceUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentWorkflowId: string | undefined;
    private _currentStepId: string | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._resourceUri = resourceUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            (message: FlowchartMessage) => this._onMessage(message),
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;
        const key = resourceUri.toString();

        if (ArazzoFlowchartPanel.panels.has(key)) {
            ArazzoFlowchartPanel.panels.get(key)?._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'arazzoFlowchart',
            `Flowchart ${path.basename(resourceUri.fsPath)}`,
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build')
                ]
            }
        );

        const flowchartPanel = new ArazzoFlowchartPanel(panel, extensionUri, resourceUri);
        ArazzoFlowchartPanel.panels.set(key, flowchartPanel);
    }

    public static update(resourceUri: vscode.Uri) {
        const key = resourceUri.toString();
        if (ArazzoFlowchartPanel.panels.has(key)) {
            ArazzoFlowchartPanel.panels.get(key)?._updateSpec();
        }
    }

    /** Pushes the cached parse (and its arazzo-core diagnostics) to the panel of `resourceUri`, if open. */
    public static updateFromCache(resourceUri: vscode.Uri, json: unknown, diagnostics?: CoreDiagnostic[]) {
        const panel = ArazzoFlowchartPanel.panels.get(resourceUri.toString());
        if (panel) {
            void panel._post(json, diagnostics);
        }
    }

    /** Editor cursor → graph: workflow (and step) under the cursor. */
    public static updateSelection(resourceUri: vscode.Uri, workflowId: string, stepId?: string) {
        ArazzoFlowchartPanel.panels.get(resourceUri.toString())?.selectWorkflow(workflowId, stepId);
    }

    public selectWorkflow(workflowId: string, stepId?: string) {
        if (this._currentWorkflowId !== workflowId || this._currentStepId !== stepId) {
            this._currentWorkflowId = workflowId;
            this._currentStepId = stepId;
            this._panel.webview.postMessage({ type: 'select-workflow', workflowId, stepId });
        }
    }

    public dispose() {
        ArazzoFlowchartPanel.panels.delete(this._resourceUri.toString());
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _onMessage(message: FlowchartMessage) {
        switch (message?.type) {
            case 'ready':
                void this._updateSpec();
                return;
            case 'alert':
                vscode.window.showErrorMessage(message.text);
                return;
            case 'step-selected':
                if (typeof message.stepId === 'string' && typeof message.workflowId === 'string') {
                    this._currentWorkflowId = message.workflowId;
                    this._currentStepId = message.stepId;
                    void this.revealStep(message.workflowId, message.stepId, message.reveal === true);
                    ArazzoPreviewPanel.scrollToStep(this._resourceUri, message.stepId, message.workflowId);
                }
                return;
            case 'workflow-selected':
                if (typeof message.workflowId === 'string') {
                    this._currentWorkflowId = message.workflowId;
                    this._currentStepId = undefined;
                }
                return;
            case 'copy-mermaid':
                if (typeof message.text === 'string') {
                    void vscode.env.clipboard.writeText(message.text).then(() =>
                        vscode.window.setStatusBarMessage(`$(check) Mermaid flowchart of ${message.workflowId ?? 'the workflow'} copied`, 3000)
                    );
                }
                return;
            case 'export':
                void this._saveExport(message);
                return;
        }
    }

    /**
     * Graph → editor: moves the cursor of the document's editor to the step.
     * `reveal` (Enter / double-click) gives the focus to the editor; a plain
     * click keeps it in the graph so that keyboard navigation goes on.
     */
    public async revealStep(workflowId: string, stepId: string, reveal: boolean): Promise<boolean> {
        const document = await vscode.workspace.openTextDocument(this._resourceUri);
        const range = findStepRange(parseArazzo(document.getText()).yamlDoc, workflowId, stepId);
        if (!range) {
            return false;
        }
        const visible = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === this._resourceUri.toString());
        const editor = await vscode.window.showTextDocument(document, {
            viewColumn: visible?.viewColumn ?? vscode.ViewColumn.One,
            preserveFocus: !reveal,
            preview: false,
        });
        const start = document.positionAt(range.start);
        editor.selection = new vscode.Selection(start, document.positionAt(range.end));
        editor.revealRange(new vscode.Range(document.positionAt(range.stepStart), start), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        return true;
    }

    private async _saveExport(message: Extract<FlowchartMessage, { type: 'export' }>) {
        if (typeof message.data !== 'string' || typeof message.filename !== 'string') {
            return;
        }
        const filename = path.basename(message.filename).replace(/[^\w.-]/g, '_') || 'workflow';
        const target = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(this._resourceUri, '..', filename),
            saveLabel: `Export ${String(message.format).toUpperCase()}`,
        });
        if (!target) {
            return;
        }
        const bytes = message.encoding === 'base64' ? Buffer.from(message.data, 'base64') : Buffer.from(message.data, 'utf8');
        await vscode.workspace.fs.writeFile(target, bytes);
        vscode.window.setStatusBarMessage(`$(check) Exported ${path.basename(target.fsPath)}`, 3000);
    }

    private async _post(spec: unknown, diagnostics?: CoreDiagnostic[]) {
        const sources = await loadLocalSources(this._resourceUri, spec);
        await this._panel.webview.postMessage({
            type: 'update-flowchart',
            spec,
            workflowId: this._currentWorkflowId,
            diagnostics,
            sources,
        });
        if (this._currentWorkflowId) {
            this._panel.webview.postMessage({ type: 'select-workflow', workflowId: this._currentWorkflowId, stepId: this._currentStepId });
        }
    }

    private async _updateSpec() {
        try {
            const document = await vscode.workspace.openTextDocument(this._resourceUri);
            const result = parseArazzo(document.getText());
            if (result.yamlDoc.contents && isMap(result.yamlDoc.contents) && result.doc !== undefined) {
                const diagnostics = result.isArazzo ? validate(result.doc, { yamlDoc: result.yamlDoc }) : [];
                await this._post(result.doc, diagnostics);
            }
        } catch (e) {
            console.error('Error updating spec', e);
        }
    }

    private _update() {
        this._panel.webview.html = getHtmlForWebview(this._panel.webview, this._extensionUri);
    }
}
