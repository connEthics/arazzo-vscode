import * as vscode from 'vscode';
import * as fs from 'fs';

export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const buildPath = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build');
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

    const nonce = getNonce();

    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">`;
    htmlContent = htmlContent.replace('<head>', `<head>\n${cspMeta}`);

    htmlContent = htmlContent.replace(/<script/g, `<script nonce="${nonce}"`);

    htmlContent = htmlContent.replace(
        /(src|href)="(?:\.|)\/assets\/([^"]+)"/g,
        (_match, attr, assetPath) => {
            const assetUri = vscode.Uri.joinPath(buildPath, 'assets', assetPath);
            return `${attr}="${webview.asWebviewUri(assetUri)}"`;
        }
    );

    return htmlContent;
}
