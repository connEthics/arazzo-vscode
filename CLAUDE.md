# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension for visualizing and editing Arazzo YAML workflow specifications (OpenAPI's format for multi-step API workflows). Provides live preview, flowchart diagrams, validation, and outline navigation. Published on the VS Code Marketplace.

## Build & Development Commands

```bash
# Extension
npm run compile          # webpack dev build
npm run watch            # webpack watch mode (use during development)
npm run package          # production build (hidden source maps)
npm run lint             # eslint on src/
npm test                 # run VS Code integration tests
npm run compile-tests    # compile test files to out/

# Webview UI (must run from webview-ui/)
cd webview-ui && npm run build   # production build (outputs to webview-ui/build/)
cd webview-ui && npm run dev     # Vite dev server

# Packaging for marketplace
cd webview-ui && npm install && npm run build
npx @vscode/vsce package
```

**Important**: The webview must be built (`webview-ui/build/`) before the extension can render preview/flowchart panels. Always rebuild the webview after UI changes.

## Architecture

### Two-Process Model

The extension runs in two contexts that communicate via `postMessage`:

1. **Extension Host** (`src/extension.ts`) — All extension logic lives in this single file (~750 lines). Contains:
   - `ArazzoPreviewPanel` / `ArazzoFlowchartPanel` — Webview panel managers
   - `YamlDocumentSymbolProvider` — Outline/symbol navigation for YAML
   - `YamlCompletionItemProvider` — Basic YAML completion
   - `validateArazzo()` / `validateStep()` — Real-time spec validation producing VS Code diagnostics
   - `detectAndSelectWorkflow()` — Cursor position → active workflow auto-sync

2. **Webview UI** (`webview-ui/`) — React + Vite + Tailwind app loaded inside VS Code panels:
   - `App.tsx` — Message bridge between VS Code API and React components
   - `UnifiedDocumentationView` — Full spec documentation renderer
   - `FlowchartView` — Mermaid.js-based workflow visualization
   - `types/arazzo.ts` — Complete Arazzo spec TypeScript types
   - `lib/mermaid-converter.ts` — Workflow → Mermaid DSL conversion

### Message Protocol (Extension ↔ Webview)

- `{ type: 'ready' }` — Webview signals ready to receive data
- `{ type: 'update', spec }` — Push parsed spec to documentation view
- `{ type: 'update-flowchart', spec, workflowId }` — Push spec to flowchart view
- `{ type: 'select-workflow', workflowId }` — Auto-select workflow from cursor
- `{ type: 'scroll-to-step', stepId, workflowId }` — Navigate to step in preview
- `{ type: 'step-selected', stepId, workflowId }` — Step clicked in flowchart → navigate editor

### Build Pipeline

- **Extension**: webpack (`webpack.config.js`) → `dist/extension.js` (CommonJS)
- **Webview**: Vite (`webview-ui/vite.config.ts`) → `webview-ui/build/` (static assets)
- **Tests**: tsc → `out/test/` then run via `@vscode/test-cli`

### Key Dependencies

- `yaml` (v2) — YAML parsing/serialization (used in both extension and webview)
- `mermaid` (v10) — Flowchart rendering in webview
- `react` (v18) + `tailwindcss` (v3) — Webview UI framework
- `lucide-react` — Icon library

## Testing

Tests are VS Code integration tests in `src/test/extension.test.ts` using `@vscode/test-electron`. They validate Arazzo file parsing, diagnostics, and symbol providers against fixture files. Tests include 1-second delays for async diagnostic/symbol provider updates.

## Conventions

- TypeScript strict mode enabled (`tsconfig.json`)
- ESLint with `typescript-eslint` and camelCase naming conventions
- Extension activates on `onLanguage:yaml`
- Webview uses VS Code theme detection (light/dark/high-contrast) via `document.body.className`
- Tailwind classes use `vscode-dark` variant for theme-aware styling

## Active Technologies
- TypeScript 5.2 (strict mode), ES2022 target (extension), ES2020 target (webview) + VS Code Extension API, webpack 5 (extension bundler), Vite 5 + React 18 + Tailwind 3 (webview), `yaml` v2 (parsing), `mermaid` v10.9 (flowcharts), `lucide-react` (icons) (001-extension-quality-roadmap)
- N/A (in-memory parse cache per document URI) (001-extension-quality-roadmap)

## Recent Changes
- 001-extension-quality-roadmap: Added TypeScript 5.2 (strict mode), ES2022 target (extension), ES2020 target (webview) + VS Code Extension API, webpack 5 (extension bundler), Vite 5 + React 18 + Tailwind 3 (webview), `yaml` v2 (parsing), `mermaid` v10.9 (flowcharts), `lucide-react` (icons)
