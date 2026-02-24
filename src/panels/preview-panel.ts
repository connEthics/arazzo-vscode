import * as vscode from 'vscode';
import * as path from 'path';
import { parseDocument, isMap } from 'yaml';
import { getHtmlForWebview } from './webview-html';

export class ArazzoPreviewPanel {
    public static panels: Map<string, ArazzoPreviewPanel> = new Map();
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _resourceUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

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
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;
        const key = resourceUri.toString();

        if (ArazzoPreviewPanel.panels.has(key)) {
            ArazzoPreviewPanel.panels.get(key)?._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'arazzoPreview',
            `Preview ${path.basename(resourceUri.fsPath)}`,
            column,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build')
                ]
            }
        );

        const previewPanel = new ArazzoPreviewPanel(panel, extensionUri, resourceUri);
        ArazzoPreviewPanel.panels.set(key, previewPanel);
    }

    public static update(resourceUri: vscode.Uri) {
        const key = resourceUri.toString();
        if (ArazzoPreviewPanel.panels.has(key)) {
            ArazzoPreviewPanel.panels.get(key)?._updateSpec();
        }
    }

    public static updateFromCache(resourceUri: vscode.Uri, json: any) {
        const key = resourceUri.toString();
        if (ArazzoPreviewPanel.panels.has(key)) {
            ArazzoPreviewPanel.panels.get(key)?.sendSpec(json);
        }
    }

    public dispose() {
        ArazzoPreviewPanel.panels.delete(this._resourceUri.toString());
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public sendSpec(spec: any) {
        this._panel.webview.postMessage({ type: 'update', spec: spec });
    }

    public static scrollToStep(resourceUri: vscode.Uri, stepId: string, workflowId: string) {
        const key = resourceUri.toString();
        if (ArazzoPreviewPanel.panels.has(key)) {
            ArazzoPreviewPanel.panels.get(key)?._panel.webview.postMessage({
                type: 'scroll-to-step',
                stepId: stepId,
                workflowId: workflowId
            });
        }
    }

    private async _updateSpec() {
        try {
            const document = await vscode.workspace.openTextDocument(this._resourceUri);
            const yamlDoc = parseDocument(document.getText());
            if (yamlDoc.contents && isMap(yamlDoc.contents)) {
                this.sendSpec(yamlDoc.toJSON());
            }
        } catch (e) {
            console.error('Error updating spec', e);
        }
    }

    private _update() {
        this._panel.webview.html = getHtmlForWebview(this._panel.webview, this._extensionUri);
    }
}
