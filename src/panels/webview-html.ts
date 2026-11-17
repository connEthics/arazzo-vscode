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

/**
 * Content-Security-Policy of the Arazzo webviews (preview and flowchart).
 *
 * - `script-src 'nonce-…' ${cspSource}`: the bundle (module script rewritten with
 *   the nonce) and, for the ELK main-thread fallback only, `assets/elk-worker.js`
 *   loaded as a nonce'd classic script (webview-ui/src/lib/elk-main-thread.ts).
 *   No `unsafe-eval`: neither ELK nor React Flow needs it.
 * - `style-src ${cspSource} 'unsafe-inline'`: Tailwind CSS file plus the inline
 *   `style` attributes React Flow uses to position nodes and edges.
 * - `img-src ${cspSource} data:`: `data:` for the PNG export (html-to-image
 *   draws a `data:` SVG on a canvas).
 * - `connect-src ${cspSource}` and `worker-src blob:` — the ELK layout worker.
 *   The webview document lives on a `vscode-webview://` origin while extension
 *   files are served from `${cspSource}` (`https://*.vscode-cdn.net`), so
 *   `new Worker(<resource URL>)` is a cross-origin worker and Chromium refuses
 *   it whatever the CSP says. The webview therefore fetches `elk-worker.js`
 *   (connect-src) and starts it from a `blob:` URL (worker-src) through the
 *   `createWorker` option of @connethics/arazzo-flow
 *   (webview-ui/src/lib/elk-host.ts). `worker-src` is limited to `blob:`: no
 *   worker is ever started from a resource URL. A blob worker inherits this
 *   policy, which is fine since ELK uses neither eval nor importScripts.
 *   If either directive is missing, the graph still renders: arazzo-flow falls
 *   back to ELK on the main thread (slower first layout, UI blocked meanwhile).
 */
export function buildCsp(cspSource: string, nonce: string): string {
    return [
        `default-src 'none'`,
        `script-src 'nonce-${nonce}' ${cspSource}`,
        `style-src ${cspSource} 'unsafe-inline'`,
        `font-src ${cspSource}`,
        `img-src ${cspSource} data:`,
        `connect-src ${cspSource}`,
        `worker-src blob:`,
    ].join('; ') + ';';
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
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(webview.cspSource, nonce)}">`;
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
