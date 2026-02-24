import * as vscode from 'vscode';
import * as path from 'path';
import { parseDocument, isMap } from 'yaml';
import { getHtmlForWebview } from './webview-html';
import { ArazzoPreviewPanel } from './preview-panel';

export class ArazzoFlowchartPanel {
    public static panels: Map<string, ArazzoFlowchartPanel> = new Map();
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _resourceUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentWorkflowId: string | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._resourceUri = resourceUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'ready':
                        this._updateSpec();
                        return;
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'step-selected':
                        ArazzoPreviewPanel.scrollToStep(this._resourceUri, message.stepId, message.workflowId);
                        return;
                }
            },
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

    public static updateFromCache(resourceUri: vscode.Uri, json: any) {
        const key = resourceUri.toString();
        const panel = ArazzoFlowchartPanel.panels.get(key);
        if (panel) {
            panel._panel.webview.postMessage({
                type: 'update-flowchart',
                spec: json,
                workflowId: panel._currentWorkflowId
            });
        }
    }

    public static updateSelection(resourceUri: vscode.Uri, workflowId: string) {
        const key = resourceUri.toString();
        if (ArazzoFlowchartPanel.panels.has(key)) {
            ArazzoFlowchartPanel.panels.get(key)?.selectWorkflow(workflowId);
        }
    }

    public selectWorkflow(workflowId: string) {
        if (this._currentWorkflowId !== workflowId) {
            this._currentWorkflowId = workflowId;
            this._panel.webview.postMessage({ type: 'select-workflow', workflowId: workflowId });
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

    private async _updateSpec() {
        try {
            const document = await vscode.workspace.openTextDocument(this._resourceUri);
            const yamlDoc = parseDocument(document.getText());
            if (yamlDoc.contents && isMap(yamlDoc.contents)) {
                this._panel.webview.postMessage({
                    type: 'update-flowchart',
                    spec: yamlDoc.toJSON(),
                    workflowId: this._currentWorkflowId
                });
            }
        } catch (e) {
            console.error('Error updating spec', e);
        }
    }

    private _update() {
        this._panel.webview.html = getHtmlForWebview(this._panel.webview, this._extensionUri);
    }
}
