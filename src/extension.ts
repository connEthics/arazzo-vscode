import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseDocument, isMap, isSeq, isPair, isScalar, Scalar } from 'yaml';

export function activate(context: vscode.ExtensionContext) {
    console.log('Arazzo VSCode extension is active');

    // Register the preview command
    context.subscriptions.push(
        vscode.commands.registerCommand('arazzo-vscode.openPreview', () => {
            if (vscode.window.activeTextEditor) {
                ArazzoPreviewPanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document.uri);
            } else {
                vscode.window.showErrorMessage('No active editor found');
            }
        })
    );

    const symbolProvider = new YamlDocumentSymbolProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider({ language: 'yaml' }, symbolProvider)
    );

    const completionProvider = new YamlCompletionItemProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ language: 'yaml' }, completionProvider, ':', ' ')
    );

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('arazzo-yaml');
    context.subscriptions.push(diagnosticCollection);

    const validate = (document: vscode.TextDocument) => {
        if (document.languageId !== 'yaml') {
            return;
        }
        const yamlDoc = parseDocument(document.getText());
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const error of yamlDoc.errors) {
            const range = new vscode.Range(
                document.positionAt(error.pos[0]),
                document.positionAt(error.pos[1])
            );
            diagnostics.push(new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Error));
        }

        if (yamlDoc.contents && isMap(yamlDoc.contents)) {
            validateArazzo(yamlDoc.contents, document, diagnostics);
        }
        
        diagnosticCollection.set(document.uri, diagnostics);
    };

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(validate));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        validate(e.document);
        if (e.document.languageId === 'yaml') {
            ArazzoPreviewPanel.update(e.document.uri);
        }
    }));
    
    if (vscode.window.activeTextEditor) {
        validate(vscode.window.activeTextEditor.document);
    }
}

/**
 * Manages the Arazzo Preview webview panel
 */
class ArazzoPreviewPanel {
    public static panels: Map<string, ArazzoPreviewPanel> = new Map();
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _resourceUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._resourceUri = resourceUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
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

        // If we already have a panel for this resource, show it.
        if (ArazzoPreviewPanel.panels.has(key)) {
            ArazzoPreviewPanel.panels.get(key)?._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'arazzoPreview',
            `Preview ${path.basename(resourceUri.fsPath)}`,
            column,
            {
                // Enable javascript in the webview
                enableScripts: true,

                // And restrict the webview to only loading content from our extension's `webview-ui/build` directory.
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

    public dispose() {
        ArazzoPreviewPanel.panels.delete(this._resourceUri.toString());

        // Clean up our resources
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
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // The path to the build directory of the webview
        const buildPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build');
        const indexHtmlPath = vscode.Uri.joinPath(buildPath, 'index.html');

        let htmlContent = '';
        try {
            htmlContent = fs.readFileSync(indexHtmlPath.fsPath, 'utf8');
        } catch (e) {
            console.error('Error reading index.html', e);
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
            </head>
            <body>
                <h1>Error loading webview</h1>
                <p>Could not read index.html from ${indexHtmlPath.fsPath}</p>
            </body>
            </html>`;
        }

        // Generate nonce for CSP
        const nonce = getNonce();

        // Inject CSP meta tag
        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">`;
        htmlContent = htmlContent.replace('<head>', `<head>\n${cspMeta}`);

        // Add nonce to script tags
        htmlContent = htmlContent.replace(/<script/g, `<script nonce="${nonce}"`);

        // Replace the script and style tags with the correct URIs
        // The build output usually has relative paths like "./assets/..." or "/assets/..."
        // We need to convert them to webview URIs

        // 1. Get the base URI for assets
        const assetsUri = webview.asWebviewUri(buildPath);

        // 2. Replace absolute paths (starting with /) and relative paths (starting with ./)
        // Note: Vite build output in index.html typically looks like:
        // <script type="module" crossorigin src="/assets/index-....js"></script>
        // <link rel="stylesheet" crossorigin href="/assets/index-....css">
        
        // We need to replace `src="/assets/` with `src="${assetsUri}/assets/`
        // and `href="/assets/` with `href="${assetsUri}/assets/`
        
        // However, since we don't know the exact structure, a more robust way is to use a base tag
        // or replace specific patterns.
        
        // Let's try replacing the specific asset patterns found in Vite builds
        
        // Replace src="/assets/..." or src="./assets/..."
        htmlContent = htmlContent.replace(
            /(src|href)="(?:\.|)\/assets\/([^"]+)"/g,
            (match, attr, path) => {
                const assetUri = vscode.Uri.joinPath(buildPath, 'assets', path);
                return `${attr}="${webview.asWebviewUri(assetUri)}"`;
            }
        );

        return htmlContent;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

class YamlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        const text = document.getText();
        try {
            const yamlDoc = parseDocument(text);
            
            if (yamlDoc.errors.length > 0) {
                // Avoid logging complex objects to console to prevent TreeError in DebugRepl
                console.warn(`Arazzo VSCode: ${yamlDoc.errors.length} YAML Syntax Errors found.`);
            }

            if (!yamlDoc.contents) {
                return [];
            }

            return this.parseNode(yamlDoc.contents, document);
        } catch (e) {
            console.error('Arazzo VSCode: Error parsing YAML for symbols', e);
            return [];
        }
    }

    private parseNode(node: any, document: vscode.TextDocument, contextKey?: string): vscode.DocumentSymbol[] {
        if (!node) {
            return [];
        }
        
        const symbols: vscode.DocumentSymbol[] = [];

        if (isMap(node)) {
            for (const pair of node.items) {
                if (isPair(pair)) {
                    const keyNode = pair.key as Scalar;
                    const valueNode = pair.value;
                    
                    if (isScalar(keyNode)) {
                        const key = String(keyNode.value);
                        
                        let rangeStart = 0;
                        let rangeEnd = 0;

                        if ((pair as any).range) {
                            rangeStart = (pair as any).range[0];
                            rangeEnd = (pair as any).range[2] || (pair as any).range[1];
                        } else {
                            rangeStart = keyNode.range?.[0] || 0;
                            const valRange = (valueNode as any)?.range;
                            rangeEnd = valRange?.[2] || valRange?.[1] || (keyNode.range?.[1] || 0);
                        }

                        // Safety checks for range
                        if (typeof rangeStart !== 'number' || isNaN(rangeStart)) {
                            rangeStart = 0;
                        }
                        if (typeof rangeEnd !== 'number' || isNaN(rangeEnd)) {
                            rangeEnd = rangeStart;
                        }
                        if (rangeEnd < rangeStart) {
                            rangeEnd = rangeStart;
                        }

                        const selectionStart = keyNode.range?.[0] || rangeStart;
                        const selectionEnd = keyNode.range?.[1] || rangeStart;

                        const range = new vscode.Range(
                            document.positionAt(rangeStart),
                            document.positionAt(rangeEnd)
                        );
                        const selectionRange = new vscode.Range(
                            document.positionAt(selectionStart),
                            document.positionAt(selectionEnd)
                        );

                        let kind = vscode.SymbolKind.Field;
                        if (key === 'workflows') {
                            kind = vscode.SymbolKind.Class;
                        } else if (key === 'steps') {
                            kind = vscode.SymbolKind.Method;
                        } else if (key === 'sourceDescriptions') {
                            kind = vscode.SymbolKind.Module;
                        }

                        const symbol = new vscode.DocumentSymbol(
                            key,
                            '',
                            kind,
                            range,
                            range.contains(selectionRange) ? selectionRange : range
                        );

                        symbol.children = this.parseNode(valueNode, document, key);
                        symbols.push(symbol);
                    }
                }
            }
        } else if (isSeq(node)) {
             node.items.forEach((item: any, index: number) => {
                if (item) {
                    let rangeStart = item.range?.[0] || 0;
                    let rangeEnd = item.range?.[2] || item.range?.[1] || 0;
                    
                    if (typeof rangeStart !== 'number' || isNaN(rangeStart)) {
                        rangeStart = 0;
                    }
                    if (typeof rangeEnd !== 'number' || isNaN(rangeEnd)) {
                        rangeEnd = rangeStart;
                    }
                    if (rangeEnd < rangeStart) {
                        rangeEnd = rangeStart;
                    }

                    const range = new vscode.Range(
                        document.positionAt(rangeStart),
                        document.positionAt(rangeEnd)
                    );

                    let name = String(index);
                    let detail = '';
                    let kind = vscode.SymbolKind.Array;

                    if (isMap(item)) {
                        if (contextKey === 'workflows') {
                            const idNode = item.get('workflowId', true);
                            if (idNode && isScalar(idNode)) {
                                name = String(idNode.value);
                                kind = vscode.SymbolKind.Class;
                                const summary = item.get('summary', true);
                                if (summary && isScalar(summary)) {
                                    detail = String(summary.value);
                                }
                            }
                        } else if (contextKey === 'steps') {
                            const idNode = item.get('stepId', true);
                            if (idNode && isScalar(idNode)) {
                                name = String(idNode.value);
                                kind = vscode.SymbolKind.Function;
                                const description = item.get('description', true);
                                if (description && isScalar(description)) {
                                    detail = String(description.value);
                                }
                            }
                        } else if (contextKey === 'sourceDescriptions') {
                            const nameNode = item.get('name', true);
                            if (nameNode && isScalar(nameNode)) {
                                name = String(nameNode.value);
                                kind = vscode.SymbolKind.Interface;
                            }
                        }
                    }

                    const symbol = new vscode.DocumentSymbol(
                        name,
                        detail,
                        kind,
                        range,
                        range
                    );
                    symbol.children = this.parseNode(item, document);
                    symbols.push(symbol);
                }
             });
        }

        return symbols;
    }
}

class YamlCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        if (!linePrefix.endsWith(': ')) {
            return undefined;
        }

        return [
            new vscode.CompletionItem('true', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('false', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('null', vscode.CompletionItemKind.Keyword),
        ];
    }
}

export function deactivate() {}

function validateArazzo(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const requiredRoot = ['arazzo', 'info', 'sourceDescriptions', 'workflows'];
    checkRequired(root, requiredRoot, document, diagnostics);

    const info = root.get('info', true);
    if (info && isMap(info)) {
        checkRequired(info, ['title', 'version'], document, diagnostics);
    }

    const sourceDescriptions = root.get('sourceDescriptions', true);
    if (sourceDescriptions) {
        if (isSeq(sourceDescriptions)) {
            if (sourceDescriptions.items.length === 0) {
                addDiagnostic(sourceDescriptions, 'sourceDescriptions must have at least one entry', document, diagnostics);
            }
            sourceDescriptions.items.forEach((item: any) => {
                if (isMap(item)) {
                    checkRequired(item, ['name', 'url'], document, diagnostics);
                    const type = item.get('type', true);
                    if (type && isScalar(type)) {
                        const val = String(type.value);
                        if (val !== 'openapi' && val !== 'arazzo') {
                            addDiagnostic(type, 'Type must be "openapi" or "arazzo"', document, diagnostics);
                        }
                    }
                }
            });
        } else {
            addDiagnostic(sourceDescriptions, 'sourceDescriptions must be an array', document, diagnostics);
        }
    }

    const workflows = root.get('workflows', true);
    if (workflows) {
        if (isSeq(workflows)) {
            if (workflows.items.length === 0) {
                addDiagnostic(workflows, 'workflows must have at least one entry', document, diagnostics);
            }
            workflows.items.forEach((workflow: any) => {
                if (isMap(workflow)) {
                    checkRequired(workflow, ['workflowId', 'steps'], document, diagnostics);
                    
                    const steps = workflow.get('steps', true);
                    if (steps) {
                        if (isSeq(steps)) {
                            if (steps.items.length === 0) {
                                addDiagnostic(steps, 'steps must have at least one entry', document, diagnostics);
                            }
                            steps.items.forEach((step: any) => {
                                if (isMap(step)) {
                                    validateStep(step, document, diagnostics);
                                }
                            });
                        } else {
                            addDiagnostic(steps, 'steps must be an array', document, diagnostics);
                        }
                    }
                }
            });
        } else {
            addDiagnostic(workflows, 'workflows must be an array', document, diagnostics);
        }
    }
}

function validateStep(step: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    checkRequired(step, ['stepId'], document, diagnostics);
    
    const hasOperation = step.has('operationId') || step.has('operationPath') || step.has('workflowId');
    if (!hasOperation) {
        addDiagnostic(step, 'Step must contain one of "operationId", "operationPath", or "workflowId"', document, diagnostics);
    }
}

function checkRequired(node: any, fields: string[], document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    fields.forEach(field => {
        if (!node.has(field)) {
            addDiagnostic(node, `Missing required field: ${field}`, document, diagnostics);
        }
    });
}

function addDiagnostic(node: any, message: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const rangeStart = node.range?.[0] || 0;
    const rangeEnd = node.range?.[2] || node.range?.[1] || 0;
    const range = new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd));
    diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
}

