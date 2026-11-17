#!/usr/bin/env node
/**
 * Plays the README scenarios in a real VS Code window, checks that each one works,
 * and writes the Marketplace screenshots and demo GIF to images/v2/.
 *
 *   npm run compile && (cd webview-ui && npm run build)
 *   node scripts/record-demo.mjs                 # screenshots + GIF + MP4
 *   node scripts/record-demo.mjs --shots         # screenshots only
 *   node scripts/record-demo.mjs --gif           # GIF/MP4 only
 *   node scripts/record-demo.mjs --vsix arazzo-vscode-2.0.0.vsix   # test the packaged VSIX
 *   node scripts/record-demo.mjs --tmp <dir>     # where the profile, workspace and raw video go
 *
 * Needs (Linux): the VS Code that `npm test` downloads into .vscode-test/, Xvfb, ffmpeg,
 * ImageMagick (`import`) and Playwright (its Electron driver: nothing to install, never
 * run `playwright install`). Examples come from ../arazzo-demo (ARAZZO_DEMO), with a
 * fallback on src/test/fixtures/v1.1.
 *
 * VS Code is driven through Playwright `_electron` on a private Xvfb display; screenshots
 * and the video are grabbed from that display (x11grab), so they show the real window.
 * A fake mouse pointer and captions are drawn in the workbench page, because Playwright
 * input does not move the X pointer. The window title loses the "[Extension Development
 * Host]" and "[Superuser]" decorations (root in a container), nothing else is retouched.
 * Exit code 1 when a scenario check fails.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node-tools/node_modules/playwright');
}

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repo, 'images/v2');
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const onlyShots = argv.includes('--shots');
const onlyGif = argv.includes('--gif');
const doShots = !onlyGif || onlyShots;
const doGif = !onlyShots || onlyGif;
const vsix = opt('--vsix') && path.resolve(opt('--vsix'));
const tmp = path.resolve(opt('--tmp') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'arazzo-demo-')));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(scenario, ok, detail = '') {
  results.push({ scenario, ok: !!ok, detail });
  console.log(`${ok ? 'OK ' : 'KO '} ${scenario}${detail ? ` — ${detail}` : ''}`);
}

// ── VS Code binary, examples ─────────────────────────────────────────────────
function findCode() {
  const base = path.join(repo, '.vscode-test');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith('vscode-linux-x64-')).sort() : [];
  if (!dirs.length) throw new Error('No VS Code in .vscode-test/: run `xvfb-run -a npm test` once.');
  return path.join(base, dirs[dirs.length - 1], 'code');
}

function prepareWorkspace() {
  const ws = path.join(tmp, 'workspace');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  const demo = path.resolve(repo, process.env.ARAZZO_DEMO ?? '../arazzo-demo', 'app/public/workflows');
  const fixtures = path.join(repo, 'src/test/fixtures/v1.1');
  const copy = (name, keep) => {
    const from = fs.existsSync(path.join(demo, name)) ? path.join(demo, name) : path.join(fixtures, name);
    if (!fs.existsSync(from)) return false;
    fs.mkdirSync(path.join(ws, name));
    for (const f of fs.readdirSync(from)) {
      if (keep.test(f)) fs.copyFileSync(path.join(from, f), path.join(ws, name, f));
    }
    return true;
  };
  copy('e2e-order-to-cash', /\.(ya?ml|json|md)$/);
  copy('e2e-session-renewal', /\.(ya?ml|json|md)$/);
  const travel = copy('mcp-travel-booking', /\.(ya?ml|json|md)$/);
  // A 1.0.1 copy (no $self) to show "Migrate to Arazzo 1.1.0".
  const legacySrc = travel ? 'mcp-travel-booking/mcp-travel-booking.arazzo.yaml' : 'e2e-session-renewal/e2e-session-renewal.arazzo.yaml';
  fs.mkdirSync(path.join(ws, 'legacy-1.0'));
  fs.copyFileSync(path.join(ws, path.dirname(legacySrc), 'openapi.yaml'), path.join(ws, 'legacy-1.0/openapi.yaml'));
  const legacy = fs
    .readFileSync(path.join(ws, legacySrc), 'utf8')
    .replace(/^arazzo: 1\.1\.0$/m, 'arazzo: 1.0.1')
    .replace(/^\$self:.*\n/m, '');
  fs.writeFileSync(path.join(ws, 'legacy-1.0/travel-booking-1.0.arazzo.yaml'), legacy);
  return ws;
}

// ── Xvfb + VS Code session ───────────────────────────────────────────────────
let displayNo = 99;
function freeDisplay() {
  while (fs.existsSync(`/tmp/.X11-unix/X${displayNo}`) || fs.existsSync(`/tmp/.X${displayNo}-lock`)) displayNo++;
  return `:${displayNo++}`;
}

const settingsFor = (theme, zoom) => ({
  'workbench.colorTheme': theme,
  'window.zoomLevel': zoom,
  'editor.fontSize': 14,
  'editor.minimap.enabled': false,
  'editor.stickyScroll.enabled': false,
  'editor.hover.delay': 250,
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoCheckUpdates': false,
  'extensions.autoUpdate': false,
  'extensions.ignoreRecommendations': true,
  'workbench.enableExperiments': false,
  'workbench.startupEditor': 'none',
  'workbench.tips.enabled': false,
  'workbench.layoutControl.enabled': false,
  'workbench.secondarySideBar.defaultVisibility': 'hidden',
  'chat.disableAIFeatures': true,
  'security.workspace.trust.enabled': false,
  'git.enabled': false,
  'files.autoSave': 'off',
});

async function launch({ theme, width, height, zoom, workspace }) {
  const display = freeDisplay();
  const xvfb = spawn('Xvfb', [display, '-screen', '0', `${width}x${height}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' });
  await sleep(1000);
  let profile = path.join(tmp, `profile-${display.slice(1)}`);
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(profile, { recursive: true });
  // VS Code's IPC socket lives in the user-data dir and a Unix socket path is limited to
  // ~107 bytes: go through a short symlink when --tmp is deep.
  if (profile.length > 60) {
    const link = path.join(os.tmpdir(), `azr-${process.pid}-${display.slice(1)}`);
    fs.rmSync(link, { force: true });
    fs.symlinkSync(profile, link);
    profile = link;
  }
  const userData = path.join(profile, 'user-data');
  const extensions = path.join(profile, 'extensions');
  fs.mkdirSync(path.join(userData, 'User'), { recursive: true });
  fs.mkdirSync(extensions, { recursive: true });
  const settingsFile = path.join(userData, 'User/settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify(settingsFor(theme, zoom), null, 2));
  const code = findCode();
  const common = ['--no-sandbox', `--user-data-dir=${userData}`, `--extensions-dir=${extensions}`];
  if (vsix) {
    // The CLI wrapper (bin/code) runs VS Code as Node for --install-extension.
    const r = spawnSync(path.join(path.dirname(code), 'bin/code'), [...common, '--install-extension', vsix], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`VSIX install failed: ${r.stderr || r.stdout}`);
  }
  const app = await playwright._electron.launch({
    executablePath: code,
    args: [
      ...common,
      ...(vsix ? [] : [`--extensionDevelopmentPath=${repo}`]),
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-gpu',
      workspace,
    ],
    env: { ...process.env, DISPLAY: display },
    timeout: 90_000,
  });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: w, height: h }), [width, height]);
  await page.waitForSelector('.monaco-workbench', { timeout: 60_000 });
  await page.evaluate(installOverlay);
  await sleep(2500);
  const s = new Session(app, page, xvfb, display, { width, height, settingsFile, zoom });
  await s.command('Notifications: Clear All Notifications');
  return s;
}

/** Runs in the workbench page: pointer, click ripple, caption and title clean-up. */
function installOverlay() {
  const style = document.createElement('style');
  style.textContent = `
    #demo-pointer { position: fixed; z-index: 2147483647; left: -40px; top: -40px; width: 22px; height: 30px;
      pointer-events: none; transition-property: left, top; transition-timing-function: cubic-bezier(.3,.7,.3,1);
      filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
    .demo-ripple { position: fixed; z-index: 2147483646; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
      border: 3px solid #f5c400; pointer-events: none; animation: demo-ripple .6s ease-out forwards; }
    @keyframes demo-ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
    #demo-caption { position: fixed; z-index: 2147483645; left: 50%; bottom: 40px; transform: translateX(-50%);
      padding: 9px 18px; border-radius: 10px; background: rgba(15,23,42,.92); color: #fff; border: 1px solid rgba(148,163,184,.5);
      font: 600 17px/1.3 -apple-system, "Segoe UI", Ubuntu, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.45);
      pointer-events: none; opacity: 0; transition: opacity .25s; white-space: nowrap; }
    #demo-caption b { color: #f5c400; font-weight: 700; }`;
  document.head.appendChild(style);
  const pointer = document.createElement('div');
  pointer.id = 'demo-pointer';
  // The workbench enforces Trusted Types: build the SVG with DOM calls, no innerHTML.
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 22 30', width: '22', height: '30' })) svg.setAttribute(k, v);
  const arrow = document.createElementNS(ns, 'path');
  const attrs = { d: 'M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26 L12 16.8 L19.5 16.5 Z', fill: '#fff', stroke: '#000', 'stroke-width': '1.6', 'stroke-linejoin': 'round' };
  for (const [k, v] of Object.entries(attrs)) arrow.setAttribute(k, v);
  svg.appendChild(arrow);
  pointer.appendChild(svg);
  document.body.appendChild(pointer);
  const caption = document.createElement('div');
  caption.id = 'demo-caption';
  document.body.appendChild(caption);
  const clean = () => {
    const walker = document.createTreeWalker(document.querySelector('.part.titlebar') ?? document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.nodeValue.replace('[Extension Development Host] ', '').replace(' [Superuser]', '');
      if (t !== n.nodeValue) n.nodeValue = t;
    }
  };
  new MutationObserver(clean).observe(document.body, { subtree: true, childList: true, characterData: true });
  clean();
}

class Session {
  constructor(app, page, xvfb, display, info) {
    Object.assign(this, { app, page, xvfb, display, ...info });
    this.pointer = { x: info.width / 2, y: info.height / 2 };
  }

  async close() {
    await this.app.close().catch(() => {});
    this.xvfb.kill();
  }

  /** PNG of the whole X display (the real window, at device pixels), without the demo pointer. */
  async shot(name) {
    await this.page.evaluate(() => (document.getElementById('demo-pointer').style.visibility = 'hidden'));
    await this.page.mouse.move(this.width / (1.2 ** this.zoom) - 3, 300);
    await sleep(400);
    const file = path.join(outDir, name);
    const r = spawnSync('import', ['-display', this.display, '-window', 'root', '-strip', file]);
    if (r.status !== 0) throw new Error(`import failed: ${r.stderr}`);
    console.log(`   → ${path.relative(repo, file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
    await this.page.evaluate(() => (document.getElementById('demo-pointer').style.visibility = 'visible'));
  }

  async caption(html) {
    // `<b>…</b>` only, rendered with DOM calls (Trusted Types).
    await this.page.evaluate((h) => {
      const c = document.getElementById('demo-caption');
      c.replaceChildren(
        ...(h ?? '').split(/(<b>.*?<\/b>)/).filter(Boolean).map((part) => {
          const bold = /^<b>(.*)<\/b>$/.exec(part);
          if (!bold) return document.createTextNode(part);
          const b = document.createElement('b');
          b.textContent = bold[1];
          return b;
        }),
      );
      c.style.opacity = h ? '1' : '0';
    }, html ?? null);
  }

  /** Moves the visible pointer (CSS pixels of the workbench page) and the real mouse. */
  async moveTo(x, y, ms = 650) {
    await this.page.evaluate(
      ([px, py, d]) => {
        const p = document.getElementById('demo-pointer');
        p.style.transitionDuration = `${d}ms`;
        p.style.left = `${px - 2}px`;
        p.style.top = `${py - 2}px`;
      },
      [x, y, ms],
    );
    await this.page.mouse.move(x, y, { steps: 8 });
    await sleep(ms + 50);
    this.pointer = { x, y };
  }

  async click(x, y, { double = false, ms } = {}) {
    await this.moveTo(x, y, ms);
    await this.page.evaluate(([px, py]) => {
      const r = document.createElement('div');
      r.className = 'demo-ripple';
      r.style.left = `${px}px`;
      r.style.top = `${py}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, [x, y]);
    await this.page.mouse.click(x, y, { clickCount: double ? 2 : 1 });
  }

  async clickBox(box, dx = 0.5, dy = 0.5, o) {
    await this.click(box.x + box.width * dx, box.y + box.height * dy, o);
  }

  async key(k, times = 1, delay = 0) {
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press(k);
      if (delay) await sleep(delay);
    }
  }

  async type(text, delay = 70) {
    await this.page.keyboard.type(text, { delay });
  }

  async quickInputVisible() {
    return this.page.evaluate(() => {
      const q = document.querySelector('.quick-input-widget');
      return !!q && getComputedStyle(q).display !== 'none' && q.getBoundingClientRect().height > 0;
    });
  }

  /** Opens a quick input with `shortcut`, types `text` and accepts it; never types into the editor. */
  async quickInput(shortcut, text, { delay = 0, settle = 600 } = {}) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.key(shortcut);
      if (await waitFor(() => this.quickInputVisible(), 1500)) {
        await sleep(150);
        await this.type(text, delay);
        await sleep(settle);
        await this.key('Enter');
        await waitFor(async () => !(await this.quickInputVisible()), 2000);
        return;
      }
    }
    throw new Error(`quick input ${shortcut} did not open`);
  }

  async command(title, { delay = 0, settle = 600, after = 700 } = {}) {
    await this.quickInput('F1', title, { delay, settle });
    await sleep(after);
  }

  async quickOpen(name) {
    await this.quickInput('Control+P', name, { settle: 700 });
    await sleep(1500);
  }

  async focusEditor() {
    await this.key('Control+1');
    await sleep(400);
  }

  async gotoLine(n) {
    await this.quickInput('Control+G', String(n), { settle: 150 });
    await sleep(300);
  }

  /** Box (CSS px) of `text` in the visible lines of the focused or first editor. */
  async textBox(text, { nth = 0 } = {}) {
    return this.page.evaluate(
      ([t, n]) => {
        const editors = [...document.querySelectorAll('.editor-instance .monaco-editor')].filter((e) => e.getBoundingClientRect().width > 0);
        const ed = editors.find((e) => e.classList.contains('focused')) ?? editors[0];
        if (!ed) return null;
        const lines = [...ed.querySelectorAll('.view-line')].sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
        let seen = 0;
        for (const line of lines) {
          const idx = line.textContent.replace(/ /g, ' ').indexOf(t);
          if (idx < 0 || seen++ < n) continue;
          // Map the character offset to a DOM range over the line's text nodes.
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          let pos = 0;
          const range = document.createRange();
          let started = false;
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const len = node.nodeValue.length;
            if (!started && idx < pos + len) {
              range.setStart(node, idx - pos);
              started = true;
            }
            if (started && idx + t.length <= pos + len) {
              range.setEnd(node, idx + t.length - pos);
              const r = range.getBoundingClientRect();
              const edBox = ed.getBoundingClientRect();
              if (r.top < edBox.top || r.bottom > edBox.bottom) return null;
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            }
            pos += len;
          }
        }
        return null;
      },
      [text, nth],
    );
  }

  /** Text of the lines of the focused editor model around the cursor, via the DOM. */
  async lineText(contains) {
    return this.page.evaluate((c) => {
      const ed = document.querySelector('.editor-instance .monaco-editor.focused') ?? document.querySelector('.editor-instance .monaco-editor');
      return [...ed.querySelectorAll('.view-line')].map((l) => l.textContent.replace(/ /g, ' ')).find((t) => t.includes(c)) ?? null;
    }, contains);
  }

  async firstLines(n) {
    return this.page.evaluate((k) => {
      const ed = document.querySelector('.editor-instance .monaco-editor.focused') ?? document.querySelector('.editor-instance .monaco-editor');
      return [...ed.querySelectorAll('.view-line')]
        .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
        .slice(0, k)
        .map((l) => l.textContent.replace(/ /g, ' '));
    }, n);
  }

  async squiggles(kind = 'error') {
    return this.page.evaluate((k) => document.querySelectorAll(`.editor-instance .squiggly-${k}`).length, kind);
  }

  async menuItems(selector) {
    return this.page.locator(selector).allInnerTexts().catch(() => []);
  }

  /** Content frame of a webview: the one whose document matches `selector`. */
  async webview(selector, timeout = 20_000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      for (const f of this.page.frames()) {
        if (!f.url().startsWith('vscode-webview:')) continue;
        const has = await f.evaluate((s) => !!document.querySelector(s), selector).catch(() => false);
        if (has) return f;
      }
      await sleep(250);
    }
    return null;
  }

  async explorerRow(name) {
    return this.page.evaluate((n) => {
      const row = [...document.querySelectorAll('.explorer-folders-view .monaco-list-row')].find((r) => r.textContent.trim() === n);
      const b = row?.getBoundingClientRect();
      return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null;
    }, name);
  }

  async setTheme(theme) {
    fs.writeFileSync(this.settingsFile, JSON.stringify(settingsFor(theme, this.zoom), null, 2));
    await sleep(2500);
  }
}

/** Gives the graph more room than the YAML and zooms in one step, for legible cards. */
async function roomForGraph(s, graph, { narrower = 2, zoomIn = 1 } = {}) {
  await s.focusEditor();
  for (let i = 0; i < narrower; i++) await s.command('View: Decrease Current View Width');
  await sleep(1200);
  for (let i = 0; i < zoomIn; i++) {
    const b = await graph.locator('button[aria-label^="Zoom in"]').boundingBox();
    await s.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(400);
  }
  await s.focusEditor();
}

const graphNode = (frame, stepId) => frame.locator(`.react-flow__node[data-id="step:${stepId}"]`);
async function selectedNodes(frame) {
  return frame.evaluate(() =>
    [...document.querySelectorAll('.react-flow__node')].filter((n) => n.querySelector('[data-selected="true"]')).map((n) => n.dataset.id),
  );
}
async function waitFor(fn, timeout = 6000) {
  const end = Date.now() + timeout;
  let v;
  while (Date.now() < end) {
    v = await fn();
    if (v) return v;
    await sleep(150);
  }
  return v;
}

// ── Screenshots (1600×1000, zoom 1) ──────────────────────────────────────────
async function screenshots(workspace) {
  const s = await launch({ theme: 'Default Dark Modern', width: 1600, height: 1000, zoom: 1, workspace });
  try {
    // Graph beside the editor.
    await s.quickOpen('e2e-order-to-cash.arazzo.yaml');
    await s.key('Control+B');
    await s.command('Open Arazzo Flowchart');
    const graph = await s.webview('.react-flow__node');
    check('4. Graph: Open Arazzo Flowchart shows the graph beside the editor', graph);
    await sleep(2500);
    await roomForGraph(s, graph);
    await s.focusEditor();
    await s.gotoLine(64);
    const sel = await waitFor(async () => (await selectedNodes(graph)).includes('step:awaitOrderConfirmation'));
    check('4. Graph: editor cursor → node selected', sel, 'line 64 → awaitOrderConfirmation');
    await s.clickBox(await graphNode(graph, 'capturePayment').boundingBox(), 0.5, 0.5, { ms: 0 });
    const jumped = await waitFor(() => s.lineText('stepId: capturePayment'));
    check('4. Graph: click on a node → editor jumps to the step', jumped);
    await s.focusEditor();
    await s.gotoLine(64);
    await sleep(800);
    await s.shot('vscode-graph-dark.png');

    // Validation: unknown dependsOn target + Problems + quick fix.
    await s.gotoLine(86);
    await s.key('End');
    await s.key('ArrowLeft', 5);
    await s.key('Backspace');
    const errors = await waitFor(() => s.squiggles('error'));
    check('1. Validation: typo in dependsOn is underlined', errors > 0, `${errors} error squiggle(s)`);
    await s.key('Control+Shift+M');
    await sleep(800);
    const problems = await s.menuItems('.markers-panel .monaco-list-row');
    check('1. Validation: Problems panel lists the error', problems.some((p) => p.includes('awaitOrderConfiration')), problems.find((p) => p.includes('awaitOrderConfiration'))?.split('\n')[0]);
    await s.focusEditor();
    await s.key('Control+.');
    await sleep(1000);
    const fixes = await s.menuItems('.action-widget .monaco-list-row');
    check('1. Validation: "did you mean" quick fix offered', fixes.some((f) => f.includes('awaitOrderConfirmation')), fixes.join(' | '));
    await s.shot('vscode-validation.png');
    await s.key('Enter');
    await sleep(1200);
    check('1. Validation: quick fix applied, no error left', (await s.squiggles('error')) === 0 && (await s.lineText('- awaitOrderConfirmation')));
    await s.key('Control+J'); // hide the panel

    // Completion.
    await s.gotoLine(69);
    await s.key('End');
    await s.key('Shift+Home');
    await s.type('action: ', 40);
    await sleep(1000);
    let items = await s.menuItems('.suggest-widget .monaco-list-row');
    check('2. Completion: action → send / receive', items.some((i) => i.startsWith('send')) && items.some((i) => i.startsWith('receive')), items.map((i) => i.split('\n')[0]).join(', '));
    await s.key('Escape');
    await s.key('Control+Z', 3);
    await s.gotoLine(125);
    await s.key('End');
    await s.key('Enter');
    await s.type('trackingRef: $steps.', 40);
    await sleep(1200);
    items = (await s.menuItems('.suggest-widget .monaco-list-row')).map((i) => i.split('\n')[0]);
    const earlierOnly = items.some((i) => i.startsWith('$steps.capturePayment')) && !items.some((i) => /^\$steps\.(closeOrder|createShipment)/.test(i));
    check('2. Completion: $steps. → earlier steps and their outputs', earlierOnly, items.slice(0, 6).join(', '));
    await s.shot('vscode-completion.png');
    await s.key('Escape');
    await s.command('File: Revert File');

    // Documentation view.
    await s.command('Open Arazzo Preview');
    const docs = await s.webview('#step-orderToCash-awaitOrderConfirmation');
    check('5. Documentation: Open Arazzo Preview renders the steps', docs);
    await sleep(1500);
    await docs.evaluate(() => document.getElementById('step-orderToCash-awaitOrderConfirmation').scrollIntoView({ block: 'start' }));
    await sleep(800);
    const asyncCard = await docs.evaluate(() => document.getElementById('step-orderToCash-awaitOrderConfirmation').textContent);
    check('5. Documentation: AsyncAPI receive step (correlation id, timeout)', /receive/i.test(asyncCard) && asyncCard.includes('6000 ms'));
    await s.focusEditor();
    await s.gotoLine(64);
    await sleep(500);
    await s.shot('vscode-docs.png');

    // Migration (sidebar visible, to show the 1.0 example next to the others).
    await s.key('Control+B');
    await s.focusEditor();
    await s.command('View: Close Editors in Other Groups');
    await s.quickOpen('travel-booking-1.0.arazzo.yaml');
    await s.key('Control+Home');
    await s.key('End');
    await sleep(800);
    await s.key('Control+.');
    await sleep(1000);
    const migrate = await s.menuItems('.action-widget .monaco-list-row');
    check('3. Migration: quick fix offered on a 1.0.1 document', migrate.some((m) => m.includes('Migrate to Arazzo 1.1.0')), migrate.join(' | '));
    await s.shot('vscode-migrate.png');
    await s.key('Enter');
    await sleep(1200);
    const head = await s.firstLines(2);
    check('3. Migration: arazzo: 1.1.0 and $self inserted', head[0] === 'arazzo: 1.1.0' && head[1]?.startsWith('$self: '), head.join(' / '));
    await s.key('Escape');
    await s.command('File: Revert File');

    // Snippet in a new YAML file.
    await s.key('Control+N'); // the palette would also match "Compare New Untitled Text Files"
    await sleep(800);
    await s.command('Change Language Mode');
    await s.type('YAML', 0); // the language picker is a second quick input
    await sleep(700);
    await s.key('Enter');
    await waitFor(async () => !(await s.quickInputVisible()), 2000);
    await sleep(800);
    await s.type('arazzo', 60);
    await sleep(800);
    await s.key('Control+Space');
    await sleep(800);
    const snip = await s.menuItems('.suggest-widget .monaco-list-row');
    const idx = snip.findIndex((x) => x.includes('Arazzo 1.1 document'));
    for (let i = 0; i < idx; i++) await s.key('ArrowDown');
    if (idx >= 0) await s.key('Enter');
    await sleep(800);
    const snipHead = await s.firstLines(2);
    if (process.env.DEMO_DEBUG) await s.shot('debug-snippet.png');
    check('6. Snippet: "arazzo" inserts an Arazzo 1.1.0 document', idx >= 0 && snipHead[0] === 'arazzo: 1.1.0', snipHead.join(' / '));
    await s.command('View: Revert and Close Editor');

    // Light theme: same graph, theme switched live.
    await s.key('Control+B');
    await s.quickOpen('e2e-order-to-cash.arazzo.yaml');
    await s.command('View: Close Editors in Other Groups');
    await s.command('Open Arazzo Flowchart');
    const graph2 = await s.webview('.react-flow__node');
    await sleep(2500);
    await roomForGraph(s, graph2);
    await s.setTheme('Default Light Modern');
    await sleep(1500);
    await s.focusEditor();
    await s.gotoLine(100);
    const light = await graph2.evaluate(() => document.body.className);
    check('4. Graph: follows a live switch to Light Modern', /vscode-light/.test(light), light);
    await sleep(800);
    await s.shot('vscode-graph-light.png');
  } finally {
    await s.close();
  }
}

// ── Demo GIF (1280×800, zoom 0, scaled to 1200 px) ───────────────────────────
async function demo(workspace) {
  const s = await launch({ theme: 'Default Dark Modern', width: 1280, height: 800, zoom: 0, workspace });
  const raw = path.join(tmp, 'demo-raw.mkv');
  let ffmpeg;
  try {
    // Expand the example folder before recording.
    const folder = await s.explorerRow('e2e-order-to-cash');
    if (folder) await s.page.mouse.click(folder.x + 40, folder.y + folder.height / 2);
    await sleep(800);
    await s.moveTo(640, 420, 0);

    ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', '15', '-video_size', `${s.width}x${s.height}`,
      '-i', s.display, '-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', raw], { stdio: ['pipe', 'inherit', 'inherit'] });
    await sleep(400);

    await s.caption('<b>Arazzo for VS Code</b> — by ConnEthics');
    await sleep(1000);

    // 1. Open the workflow.
    await s.caption('Open an Arazzo 1.1 workflow');
    const file = await s.explorerRow('e2e-order-to-cash.arazzo.yaml');
    await s.clickBox(file, 0.35, 0.5);
    await sleep(900);

    // 2. Graph beside the editor.
    await s.caption('<b>Open Arazzo Flowchart</b>: the graph opens beside the YAML');
    await s.key('Control+B');
    await s.command('Open Arazzo Flowchart', { delay: 30, settle: 350, after: 300 });
    const graph = await s.webview('.react-flow__node');
    await sleep(1300);
    await roomForGraph(s, graph, { narrower: 0 });
    await sleep(500);

    // 3. Node → editor.
    await s.caption('Click a step in the graph → the editor jumps to it');
    await s.clickBox(await graphNode(graph, 'awaitOrderConfirmation').boundingBox(), 0.5, 0.45, { ms: 700 });
    await sleep(1300);

    // 4. Cursor → node.
    await s.caption('Move the cursor in the YAML → the graph follows');
    const stepLine = await s.textBox('stepId: awaitOrderConfirmation');
    if (stepLine) await s.click(stepLine.x + stepLine.width + 4, stepLine.y + stepLine.height / 2, { ms: 700 });
    else await s.key('Control+1');
    await sleep(300);
    await s.key('ArrowDown', 22, 70);
    const followed = (await selectedNodes(graph)).includes('step:capturePayment');
    check('GIF: cursor moved into capturePayment selects its node', followed);
    await sleep(900);

    // 5. Error + quick fix.
    await s.caption('Validation as you type: unknown step in <b>dependsOn</b>');
    await s.key('End');
    await s.key('ArrowLeft', 5, 40);
    await s.key('Backspace');
    await waitFor(() => s.squiggles('error'));
    await sleep(500);
    const typo = await s.textBox('awaitOrderConfiration');
    if (typo) await s.moveTo(typo.x + typo.width * 0.6, typo.y + typo.height / 2, 600);
    await sleep(1500);
    await s.caption('Quick fix: <b>Did you mean…?</b>');
    await s.moveTo(s.pointer.x + 120, s.pointer.y + 160, 400);
    await s.key('Control+.');
    await sleep(1100);
    await s.key('Enter');
    await sleep(500);
    check('GIF: quick fix removes the error', (await waitFor(async () => (await s.squiggles('error')) === 0)) === true);
    await sleep(700);

    // 6. Documentation view.
    await s.caption('<b>Open Arazzo Preview</b>: live docs, AsyncAPI steps included');
    await s.command('Open Arazzo Preview', { delay: 30, settle: 350, after: 300 });
    const docs = await s.webview('#step-orderToCash-awaitOrderConfirmation');
    await sleep(900);
    const remaining = () => docs.evaluate(() => document.getElementById('step-orderToCash-awaitOrderConfirmation').getBoundingClientRect().top - 12);
    await s.moveTo(s.width * 0.78, s.height * 0.55, 600);
    for (let i = 0, left = await remaining(); i < 80 && left > 20; i++, left = await remaining()) {
      await s.page.mouse.wheel(0, Math.min(150, left));
      await sleep(30);
    }
    check('GIF: preview scrolled to the AsyncAPI receive step', (await remaining()) < 200);
    await sleep(1500);
    await s.caption('<b>Arazzo for VS Code</b> — free on the VS Code Marketplace');
    await sleep(1400);
  } finally {
    if (ffmpeg) {
      ffmpeg.stdin.write('q');
      await new Promise((r) => ffmpeg.on('close', r));
    }
    await s.close();
  }
  encode(raw);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
}

function encode(raw) {
  const gif = path.join(outDir, 'demo.gif');
  const mp4 = path.join(outDir, 'demo.mp4');
  const palette = path.join(tmp, 'palette.png');
  const filters = 'fps=12,scale=1200:-1:flags=lanczos';
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', `${filters},palettegen=max_colors=192:stats_mode=diff`, palette]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-i', palette, '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, gif]);
  if (spawnSync('gifsicle', ['--version']).status === 0) run('gifsicle', ['-O3', '--batch', gif]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1200:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', gif], { encoding: 'utf8' }).stdout.trim();
  for (const f of [gif, mp4]) console.log(`   → ${path.relative(repo, f)} (${(fs.statSync(f).size / 1048576).toFixed(2)} MB)`);
  console.log(`   GIF duration: ${Number(dur).toFixed(1)} s`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true });
for (const f of ['dist/extension.js', 'webview-ui/build/index.html']) {
  if (!vsix && !fs.existsSync(path.join(repo, f))) throw new Error(`${f} is missing: run npm run compile and (cd webview-ui && npm run build)`);
}
const workspace = prepareWorkspace();
console.log(`Workspace and profiles in ${tmp}${vsix ? `, testing ${path.basename(vsix)}` : ''}`);
if (doShots) await screenshots(workspace);
if (doGif) await demo(workspace);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
