# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Arazzo for VS Code — by ConnEthics** (`connethics.arazzo-vscode`, published on the VS Code Marketplace) is a VS Code extension for authoring, validating and visualizing [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) workflow documents, versions 1.0.x and **1.1.0**, against OpenAPI and AsyncAPI sources. It provides:

- two-layer validation (official JSON Schema + semantic rules);
- completion, quick fixes (including "Migrate to Arazzo 1.1.0") and snippets;
- outline symbols;
- an interactive workflow graph and a live documentation view, both in webviews.

Validation and the graph come from two ConnEthics packages that are vendored in `vendor/` (see below).

## Build & Development Commands

```bash
# Extension (repo root)
npm run compile          # webpack dev build → dist/extension.js
npm run watch            # webpack watch mode
npm run package          # production build (hidden source maps), used by vscode:prepublish
npm run lint             # eslint src/
npm run compile-tests    # tsc → out/ (mocha tests)
npm test                 # pretest (compile-tests + compile + lint), then vscode-test
xvfb-run -a npm test     # same on a headless Linux machine (VS Code needs a display)

# Vendored ConnEthics packages
npm run vendor:check     # verify vendor/@connethics/* against VENDOR.json (SHA-256)
npm run vendor:sync      # re-copy from ../arazzo-demo (needs that checkout and its built packages/)

# Webview UI (run from webview-ui/)
npm run build            # tsc + vite build → webview-ui/build/
npm run dev              # Vite dev server
npm test                 # vitest (jsdom, mocked ELK)
node scripts/capture.mjs # README screenshots → ../images/v2/*.png (Playwright, preinstalled Chromium; never run `playwright install`)

# Marketplace package (never `vsce publish` without an explicit request)
npx @vscode/vsce package # runs vscode:prepublish: webview npm install + build, then npm run package
npx @vscode/vsce ls      # list the files that go into the VSIX
```

**Important**: the extension renders its panels from `webview-ui/build/`. Rebuild the webview after any UI change, and after `vendor:sync` of arazzo-flow or arazzo-core.

## Architecture

### Extension host (`src/`)

- `extension.ts`: `activate()` only, about 110 lines. It registers commands, providers, the diagnostic collection `arazzo-yaml`, the debounced change handler (250 ms) and the cursor → graph sync.
- `arazzo-core.ts`: **the only import point** of `@connethics/arazzo-core`. It does `export * from '../vendor/@connethics/arazzo-core/dist/index.cjs'`. The relative path works both for webpack and for the tsc-compiled tests in `out/`. Always import core through this module.
- `parse-cache.ts`: `ParseCache` holds one `parseArazzo()` per document version and is shared by validation, completion, symbols, code actions and panels. `getCoreDiagnostics(entry)` memoizes `validate()`. `createDebouncedHandler()` is also defined here.
- `arazzo-detection.ts`: Arazzo document and version detection (`KNOWN_ARAZZO_VERSIONS` and `LATEST_ARAZZO_VERSION`, re-exported from core). `detectAndSelectWorkflow()` maps the cursor to a workflow and step and pushes the result to the graph.
- `validation/index.ts`: maps core diagnostics to `vscode.Diagnostic`. It handles the range (from the YAML node or the JSON path), the severity, `code: { value, target }` with the spec link, `source: 'arazzo'` and the `Unnecessary` tag for unused sources and components. YAML syntax errors are added as well. `validation/spec-links.ts` maps a rule's `§section` to an anchor of the 1.1.0 spec.
- `providers/completion-provider.ts`: context-aware keys and enumerations, runtime expressions (`$message.*`, `$self`…), and `dependsOn` / `goto` targets.
- `providers/code-action-provider.ts`: quick fixes:
  - migrate to 1.1.0 (`arazzo-vscode.migrateTo11`);
  - add `$self` (followed by the internal command `arazzo-vscode.selectSelfValue`);
  - "did you mean" for unresolved step and workflow IDs;
  - dotted expression → JSON Pointer.
- `providers/symbol-provider.ts`: outline built from the cached parse.
- `panels/preview-panel.ts`: `ArazzoPreviewPanel`, the documentation view, one panel per document URI.
- `panels/flowchart-panel.ts`: `ArazzoFlowchartPanel`, the graph. It also contains:
  - `findStepRange()`, which maps a step to editor offsets;
  - `loadLocalSources()`, which reads local OpenAPI sources (relative or `file:` URLs, ≤ 5 MB, never remote) to show HTTP method badges;
  - the export save dialog.
- `panels/webview-html.ts`: `getHtmlForWebview()` (shared by both panels) and `buildCsp()`.

Validation rules live in arazzo-core, not here. To change a rule, change `arazzo-demo/packages/arazzo-core`, then run `vendor:sync`.

### Vendored packages (`vendor/@connethics/`)

The source of truth is **arazzo-demo** (`packages/arazzo-core`, `packages/arazzo-flow`, MIT). `scripts/sync-shared.mjs` (in arazzo-demo) copies their built `dist/` here, with a SHA-256 manifest in `VENDOR.json`. `scripts/vendor-check.mjs` verifies the copy: it delegates to arazzo-demo when `../arazzo-demo` exists (or `ARAZZO_DEMO`), and runs a standalone check otherwise. **Never edit vendored files by hand.**

- `arazzo-core`:
  - TypeScript types for Arazzo 1.0/1.1;
  - `parseArazzo` (`yaml` v2, with source ranges);
  - `validate`: ajv standalone validators for the official 1.0 and 1.1 schemas, plus 100+ semantic rules (`RULES`);
  - `workflowToGraph` / `graphToMermaid`.
  - Only runtime dependency: `yaml`, resolved from this repo's `node_modules`.
- `arazzo-flow`:
  - the read-only React graph (`ArazzoGraph`, `ArazzoGraphFromDocument`), built on `@xyflow/react` 12 and ELK;
  - `style.css` (pure CSS `--af-*` variables, `theme="vscode"` maps them onto `--vscode-*`);
  - `elk-worker.js`, a verbatim copy of `elkjs/lib/elk-worker.min.js` (EPL-2.0, license in `dist/elk-worker.LICENSE.md`).

### Webview UI (`webview-ui/`)

React 19 + Vite 5 + Tailwind 3. The app is a single bundle, used by both panels.

- `App.tsx`: message bridge with the extension. It picks the mode from the first message: `update` → documentation, `update-flowchart` → graph. It also handles theme detection (`body.vscode-dark` / `vscode-high-contrast[-light]`) and keeps graph options in `vscode.setState`.
- `components/FlowchartView.tsx`: workflow selector, "Copy as Mermaid", and `<ArazzoGraphFromDocument theme="vscode">` from arazzo-flow, with diagnostics, OpenAPI method resolver, selection, export and options.
- `components/UnifiedDocumentationView.tsx` + `components/arazzo/*` + `components/primitives/*`: the documentation view. It covers 1.1 rendering: `AsyncMessageCard`, `SelectorValue`, `DependsOnList`, `$self` and `querystring`.
- `lib/elk-host.ts`: ELK worker strategy. It uses a same-origin worker URL when possible. Otherwise it fetches `elk-worker.js` and starts it from a `blob:` URL (`createWorker`). If that fails, ELK runs on the main thread. `lib/elk-main-thread.ts` makes that fallback reuse the same `elk-worker.js` loaded as a nonce'd classic script, so the build ships ELK once.
- `lib/arazzo-11.ts` and `lib/arazzo-utils.ts`: 1.1 helpers (async step, Selector, operationId split).
- `types/arazzo.ts`: type-only re-export of arazzo-core, plus a few legacy fields.
- `vite.config.ts`: `sharedAliases` (`@connethics/*` → `../vendor/...`, `elk-worker.js?url`, ELK fallback shim) and `sharedDedupe`. `vitest.config.ts` reuses them. The build outputs fixed names (`assets/[name].js`), with `index.js`, `index.css` and `elk-worker.js`.

### Message protocol (extension ↔ webview)

| Direction | Panel | Message |
|---|---|---|
| webview → ext | both | `{ type: 'ready' }`: the webview mounted, so the extension sends the spec |
| webview → ext | both | `{ type: 'alert', text }`: show an error message |
| ext → webview | preview | `{ type: 'update', spec }` |
| ext → webview | preview | `{ type: 'scroll-to-step', stepId, workflowId }` (after a node click in the graph) |
| ext → webview | flowchart | `{ type: 'update-flowchart', spec, workflowId?, diagnostics?, sources? }`. `diagnostics` are arazzo-core diagnostics and `sources` are parsed local OpenAPI documents keyed by source name. |
| ext → webview | flowchart | `{ type: 'select-workflow', workflowId, stepId? }` (editor cursor → graph) |
| webview → ext | flowchart | `{ type: 'step-selected', stepId, workflowId, reveal }`. It moves the editor cursor; `reveal: true` (Enter or double-click) also focuses the editor. It also scrolls the preview. |
| webview → ext | flowchart | `{ type: 'workflow-selected', workflowId }` |
| webview → ext | flowchart | `{ type: 'copy-mermaid', text, workflowId }`: the extension writes the clipboard |
| webview → ext | flowchart | `{ type: 'export', format, filename, encoding: 'utf8' \| 'base64', data }`: the extension opens a save dialog |

The types are `FlowchartMessage` in `src/panels/flowchart-panel.ts`. The handlers are in `App.tsx`.

### Content Security Policy (`buildCsp` in `src/panels/webview-html.ts`)

`default-src 'none'; script-src 'nonce-…' ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; img-src ${cspSource} data:; connect-src ${cspSource}; worker-src blob:`

- Every `<script>` of `build/index.html` receives the nonce, and asset URLs are rewritten with `asWebviewUri`.
- `'unsafe-inline'` styles are needed by React Flow's positioning. `data:` images are needed by the PNG export.
- `connect-src` + `worker-src blob:` serve the ELK worker. Workers from a resource URL are cross-origin in a webview, hence the blob.
- There is no `unsafe-eval`. Keep it that way. The rationale is documented in the function's comment and in `lib/elk-host.ts`.

### Build pipeline and packaging

- Extension: webpack (`webpack.config.js`, `target: node`, `vscode` external) → `dist/extension.js` (CommonJS). arazzo-core and `yaml` are bundled into it.
- Webview: Vite → `webview-ui/build/` (static assets loaded by the panels via `localResourceRoots`).
- Tests: tsc → `out/test/`, run by `@vscode/test-cli` (`.vscode-test.mjs`, mocha timeout 10 s; VS Code downloaded into `.vscode-test/`).
- `.vscodeignore` is a whitelist in practice. The VSIX keeps:
  - `dist/`, `webview-ui/build/`, `snippets/` and `images/icon.png`;
  - `README`, `CHANGELOG`, `LICENSE` and `THIRD-PARTY-NOTICES.md`;
  - the vendored `LICENSE` files and `elk-worker.LICENSE.md`.
  It excludes `src/`, `out/`, `vendor/` sources, `specs/`, `images/v2/`, `scripts/`, `context/`, the webview sources and `node_modules`.
- README images use relative paths (`images/v2/*.png`). `vsce` rewrites them to `https://github.com/connEthics/arazzo-vscode/raw/HEAD/...`, so they must exist on the default branch when publishing. Otherwise, pass `--githubBranch <branch>`.
- `snippets/arazzo.code-snippets` (YAML) is contributed through `contributes.snippets`.

### Key dependencies

- `yaml` v2: parsing with source ranges, in the extension and the webview.
- `@xyflow/react` 12, `elkjs` 0.11 and `html-to-image`: the graph, through arazzo-flow.
- `react` 19, `tailwindcss` 3, `lucide-react`, `react-markdown` + `remark-gfm`: the webview UI.
- There is no Mermaid library. The Mermaid export is generated by arazzo-core (`graphToMermaid`).

## Testing

- **Mocha integration tests** (`src/test/*.test.ts`, run inside VS Code):
  - `extension.test.ts`, `validation.test.ts` (core diagnostics → VS Code), `v11.test.ts` (1.1 fixtures);
  - `completion.test.ts`, `detection.test.ts`, `panel.test.ts` (panel lifecycle, CSP, single ELK asset, `findStepRange`, `loadLocalSources`, `revealStep`);
  - `helpers.ts` holds the shared helpers.
  - Fixtures live in `src/test/fixtures/`. `fixtures/v1.1/` contains the `e2e-order-to-cash` (OpenAPI + AsyncAPI) and `e2e-session-renewal` examples from arazzo-demo.
  - Diagnostics are debounced, so the tests wait for them.
- **Vitest** (`webview-ui/src/test/`): components, the 1.1 documentation view, the flowchart (with mocked ELK, `mock-elk.ts`) and `elk-host`.
- Headless Linux: `xvfb-run -a npm test`.

## Conventions

- TypeScript strict mode in both projects. ESLint (`typescript-eslint`, camelCase naming) on `src/`.
- Activation: `onLanguage:yaml`. A YAML file is an Arazzo document when its root mapping has an `arazzo` key.
- The webview follows the VS Code theme: `body.vscode-*` classes, `--vscode-*` variables and the Tailwind `vscode-dark` variant. Graph colors come from the VS Code theme (`--vscode-charts-*`, `--vscode-testing-*`…), not from the ConnEthics palette, which is reserved for the web apps.
- Product name: "Arazzo for VS Code — by ConnEthics". Always spell it **ConnEthics** in prose; `connethics` is for identifiers only.
- No telemetry. Remote sources are never fetched.

## Specs and plans

- `specs/002-arazzo-1-1-refonte/` covers the Arazzo 1.1.0 overhaul across the three ConnEthics repos (arazzo-vscode, arazzo-demo, website):
  - `plan.md` and `tasks.md`: work packages, user decisions (naming, licenses, VS Code colors);
  - `research/`: 1.1 spec delta, positioning, MCP, E2E runners, graph UI benchmark, plus the official schemas;
  - `brand/`: BRAND.md, tokens, icon;
  - `design/`: UI-SPEC.md and graph mock-ups.
- The working branch of the overhaul is `claude/arazzo-1-1-0-refonte-iv866m`.
- `context/arazzo-spec.md` is a local copy of the **1.0.1** specification text and is outdated. For 1.1.0, use `research/01-spec-delta-1.1.md` and https://spec.openapis.org/arazzo/v1.1.0.html.
