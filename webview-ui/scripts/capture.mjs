#!/usr/bin/env node
/**
 * Screenshot harness of the webview build (no VS Code needed).
 *
 *   cd webview-ui && npm run build && node scripts/capture.mjs [--check-only]
 *
 * Reproduces the webview conditions that matter for the graph:
 * - the page and the build are served from two different origins (like
 *   `vscode-webview://` vs `https://*.vscode-cdn.net`), with the extension's
 *   CSP (src/panels/webview-html.ts buildCsp) and nonce'd scripts;
 * - `acquireVsCodeApi()` is simulated (posted messages kept in `window.__posted`);
 * - `body.vscode-*` classes + `--vscode-*` variables of Light+, Dark+, High Contrast.
 * Then sends `update-flowchart` / `update` with the order-to-cash fixture and writes
 * ../images/v2/{graph-dark,graph-light,graph-hc,docs-async}.png (deviceScaleFactor 2).
 * Uses the preinstalled Chromium (never runs `playwright install`).
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node-tools/node_modules/playwright');
}

const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, '../build');
const repo = join(here, '../..');
const outDir = join(repo, 'images/v2');
const checkOnly = process.argv.includes('--check-only');

// ── VS Code themes (values of the built-in Light+, Dark+, High Contrast) ─────────
const common = {
  'font-family': '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif',
  'editor-font-family': '"Droid Sans Mono", "monospace", monospace',
  'font-size': '13px',
};
const THEMES = {
  'vscode-light': {
    ...common,
    'editor-background': '#ffffff', 'editor-foreground': '#000000', foreground: '#616161', descriptionForeground: '#717171',
    'editorWidget-background': '#f3f3f3', 'editorWidget-border': '#c8c8c8', 'widget-shadow': '#00000029', 'panel-border': '#80808059',
    focusBorder: '#0090f1', 'list-hoverBackground': '#e8e8e8', 'toolbar-hoverBackground': '#b8b8b850',
    'inputOption-activeBackground': '#0090f133', 'inputOption-activeBorder': '#007acc', 'inputOption-activeForeground': '#000000',
    'input-placeholderForeground': '#767676', 'textCodeBlock-background': '#dcdcdc66', 'editorIndentGuide-background1': '#d3d3d3',
    'textLink-foreground': '#006ab1', 'testing-iconPassed': '#388a34', 'testing-iconFailed': '#f14c4c', errorForeground: '#a1260d',
    'charts-red': '#e51400', 'charts-blue': '#1a85ff', 'charts-yellow': '#bf8803', 'charts-orange': '#d18616', 'charts-green': '#388a34',
    'charts-purple': '#652d90', 'terminal-ansiCyan': '#0598bc', 'terminal-ansiMagenta': '#bc05bc', 'terminal-ansiBlue': '#0451a5',
    'editorError-foreground': '#e51400', 'editorWarning-foreground': '#bf8803', 'editorInfo-foreground': '#1a85ff',
    'sideBar-background': '#f3f3f3', 'dropdown-background': '#ffffff', 'dropdown-foreground': '#616161', 'dropdown-border': '#cecece',
    'button-secondaryBackground': '#5f6a79', 'button-secondaryForeground': '#ffffff', 'button-secondaryHoverBackground': '#4c5561',
  },
  'vscode-dark': {
    ...common,
    'editor-background': '#1e1e1e', 'editor-foreground': '#d4d4d4', foreground: '#cccccc', descriptionForeground: '#ccccccb3',
    'editorWidget-background': '#252526', 'editorWidget-border': '#454545', 'widget-shadow': '#0000005c', 'panel-border': '#80808059',
    focusBorder: '#007fd4', 'list-hoverBackground': '#2a2d2e', 'toolbar-hoverBackground': '#5a5d5e50',
    'inputOption-activeBackground': '#007fd466', 'inputOption-activeBorder': '#007acc', 'inputOption-activeForeground': '#ffffff',
    'input-placeholderForeground': '#a6a6a6', 'textCodeBlock-background': '#0a0a0a66', 'editorIndentGuide-background1': '#404040',
    'textLink-foreground': '#3794ff', 'testing-iconPassed': '#73c991', 'testing-iconFailed': '#f14c4c', errorForeground: '#f48771',
    'charts-red': '#f14c4c', 'charts-blue': '#3794ff', 'charts-yellow': '#cca700', 'charts-orange': '#d18616', 'charts-green': '#89d185',
    'charts-purple': '#b180d7', 'terminal-ansiCyan': '#11a8cd', 'terminal-ansiMagenta': '#bc3fbc', 'terminal-ansiBlue': '#2472c8',
    'editorError-foreground': '#f14c4c', 'editorWarning-foreground': '#cca700', 'editorInfo-foreground': '#3794ff',
    'sideBar-background': '#252526', 'dropdown-background': '#3c3c3c', 'dropdown-foreground': '#f0f0f0', 'dropdown-border': '#3c3c3c',
    'button-secondaryBackground': '#3a3d41', 'button-secondaryForeground': '#ffffff', 'button-secondaryHoverBackground': '#45494e',
  },
  'vscode-high-contrast': {
    ...common,
    'editor-background': '#000000', 'editor-foreground': '#ffffff', foreground: '#ffffff', descriptionForeground: '#ffffff',
    'editorWidget-background': '#0c141f', 'editorWidget-border': '#6fc3df', contrastBorder: '#6fc3df', contrastActiveBorder: '#f38518',
    'panel-border': '#6fc3df', focusBorder: '#f38518', 'list-hoverBackground': '#00000000', 'toolbar-hoverBackground': '#00000000',
    'inputOption-activeBackground': '#00000000', 'inputOption-activeBorder': '#6fc3df', 'inputOption-activeForeground': '#ffffff',
    'input-placeholderForeground': '#ffffffb3', 'textCodeBlock-background': '#000000', 'editorIndentGuide-background1': '#ffffff',
    'textLink-foreground': '#21a6ff', 'testing-iconPassed': '#73c991', 'testing-iconFailed': '#f14c4c', errorForeground: '#f48771',
    'charts-red': '#f14c4c', 'charts-blue': '#3794ff', 'charts-yellow': '#cca700', 'charts-orange': '#d18616', 'charts-green': '#89d185',
    'charts-purple': '#b180d7', 'terminal-ansiCyan': '#00ffff', 'terminal-ansiMagenta': '#ff00ff', 'terminal-ansiBlue': '#57a3ff',
    'editorError-foreground': '#f48771', 'editorWarning-foreground': '#ffd370', 'editorInfo-foreground': '#3794ff',
    'sideBar-background': '#000000', 'dropdown-background': '#000000', 'dropdown-foreground': '#ffffff', 'dropdown-border': '#6fc3df',
    'button-secondaryBackground': '#000000', 'button-secondaryForeground': '#ffffff', 'button-border': '#6fc3df',
  },
};

// ── Fixture, diagnostics (arazzo-core, as the extension host computes them), OpenAPI ──
const fixDir = join(repo, 'src/test/fixtures/v1.1/e2e-order-to-cash');
const text = await readFile(join(fixDir, 'e2e-order-to-cash.arazzo.yaml'), 'utf8');
const core = await import(pathToFileURL(join(repo, 'vendor/@connethics/arazzo-core/dist/index.js')).href);
const parsed = core.parseArazzo(text);
const diagnostics = core.validate(parsed.doc, { yamlDoc: parsed.yamlDoc });
const spec = parsed.doc;
const sources = { commerce: parse(await readFile(join(fixDir, 'openapi.yaml'), 'utf8')) };

// ── Servers: resources (build, CORS) and page (CSP + nonce), on two origins ─────────
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.md': 'text/markdown' };
const resources = http.createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(build, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream', 'access-control-allow-origin': '*' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => resources.listen(0, '127.0.0.1', r));
const cspSource = `http://127.0.0.1:${resources.address().port}`;

// Same policy as src/panels/webview-html.ts (buildCsp), `cspSource` = resource origin.
const csp = (nonce, { connect = true, worker = true } = {}) =>
  [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}' ${cspSource}`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource}`,
    `img-src ${cspSource} data:`,
    connect && `connect-src ${cspSource}`,
    worker && `worker-src blob:`,
  ].filter(Boolean).join('; ') + ';';

const indexHtml = await readFile(join(build, 'index.html'), 'utf8');
function page(kind, opts) {
  const nonce = 'harness' + Math.random().toString(36).slice(2);
  const vars = Object.entries(THEMES[kind === 'vscode-high-contrast-light' ? 'vscode-high-contrast' : kind]).map(([k, v]) => `--vscode-${k}: ${v}`).join("; ").replace(/"/g, "&quot;");
  const bodyClass = kind === 'vscode-high-contrast' ? 'vscode-high-contrast' : kind;
  const shim = `<script nonce="${nonce}">
    window.__posted = []; window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
    window.acquireVsCodeApi = () => ({ postMessage: (m) => window.__posted.push(m), getState: () => undefined, setState: () => {} });
  </script>`;
  return indexHtml
    .replace('<html lang="en">', `<html lang="en" style="${vars}">`)
    .replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp(nonce, opts)}">\n${shim}`)
    .replace(/<script(?! nonce)/g, `<script nonce="${nonce}"`)
    .replace(/(src|href)="\.?\/assets\/([^"]+)"/g, (_m, a, f) => `${a}="${cspSource}/assets/${f}"`)
    .replace('<body>', `<body class="${bodyClass}" data-vscode-theme-kind="${bodyClass}">`);
}
const pages = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(page(u.searchParams.get('theme') ?? 'vscode-dark', { connect: u.searchParams.get('connect') !== '0', worker: u.searchParams.get('worker') !== '0' }));
});
await new Promise((r) => pages.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${pages.address().port}`;

// ── Browser ─────────────────────────────────────────────────────────────────────
const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
if (!checkOnly) await mkdir(outDir, { recursive: true });

async function open(query) {
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  const workers = [];
  p.on('worker', (w) => workers.push(w.url()));
  await p.goto(`${origin}/?${query}`);
  await p.waitForFunction(() => window.__posted.some((m) => m.type === 'ready'));
  return { p, logs, workers };
}
const post = (p, msg) => p.evaluate((m) => window.postMessage(m, '*'), msg);
async function graphReady(p) {
  await p.waitForSelector('.react-flow__node[data-id="step:closeOrder"]', { timeout: 20000 });
  await p.waitForTimeout(900); // initial fit + fonts
}

const results = [];
async function shootGraph(theme, file, select) {
  const { p, logs, workers } = await open(`theme=${theme}`);
  const t0 = Date.now();
  await post(p, { type: 'update-flowchart', spec, workflowId: 'orderToCash', diagnostics, sources });
  if (select) await post(p, { type: 'select-workflow', workflowId: 'orderToCash', stepId: select });
  await graphReady(p);
  if (process.env.DEBUG_STYLES) console.log(await p.evaluate(() => { const h = document.querySelector(".arazzo-flowchart__bar"); const cs = getComputedStyle(h); return [cs.backgroundColor, cs.color, getComputedStyle(document.documentElement).getPropertyValue("--vscode-sideBar-background"), document.documentElement.getAttribute("style")?.length, getComputedStyle(document.querySelector(".arazzo-flowchart")).backgroundColor]; }));
  const csp = await p.evaluate(() => window.__csp);
  results.push({ file, theme, ms: Date.now() - t0, workers, csp, errors: logs.filter((l) => /error|warn/i.test(l)) });
  if (!checkOnly) await p.screenshot({ path: join(outDir, file) });
  return p;
}

const dark = await shootGraph('vscode-dark', 'graph-dark.png', 'awaitOrderConfirmation');
// Click → step-selected (focus kept), double-click → reveal.
await dark.click('.react-flow__node[data-id="step:capturePayment"]');
await dark.dblclick('.react-flow__node[data-id="step:closeOrder"]');
const posted = await dark.evaluate(() => window.__posted.filter((m) => m.type === 'step-selected'));
await (await shootGraph('vscode-light', 'graph-light.png', 'capturePayment')).close();
await (await shootGraph('vscode-high-contrast', 'graph-hc.png', 'createInvoice')).close();

// Documentation view (1.1): AsyncAPI receive step, Selectors, dependsOn, $self.
{
  const { p } = await open('theme=vscode-dark');
  await post(p, { type: 'update', spec });
  await p.waitForSelector('#step-orderToCash-awaitOrderConfirmation');
  await p.evaluate(() => {
    const el = document.getElementById('step-orderToCash-awaitOrderConfirmation');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16);
  });
  await p.waitForTimeout(300);
  if (!checkOnly) await p.screenshot({ path: join(outDir, 'docs-async.png') });
  await p.close();
}

// Fallback check: CSP without connect-src → no worker, ELK on the main thread
// through the nonce'd classic script (elk-main-thread.ts); the graph must still render.
const fallback = await open('theme=vscode-dark&connect=0');
await post(fallback.p, { type: 'update-flowchart', spec, workflowId: 'orderToCash' });
await graphReady(fallback.p);
const fallbackNodes = await fallback.p.locator('.react-flow__node').count();

console.log(JSON.stringify({ results, stepSelected: posted, fallback: { nodes: fallbackNodes, workers: fallback.workers, logs: fallback.logs.filter((l) => /arazzo|error/i.test(l)) } }, null, 2));
await browser.close();
resources.close();
pages.close();
