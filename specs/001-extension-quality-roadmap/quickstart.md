# Quickstart: Extension Quality Roadmap

**Branch**: `001-extension-quality-roadmap`

## Prerequisites

- Node.js 18+
- VS Code 1.85+ (for testing the extension)
- Git

## Setup

```bash
git checkout 001-extension-quality-roadmap
npm install
cd webview-ui && npm install && cd ..
```

## Build & Verify

```bash
# Build extension
npm run compile

# Build webview (required for preview/flowchart panels)
cd webview-ui && npm run build && cd ..

# Lint
npm run lint

# Run tests
npm test
```

## Development Loop

```bash
# Terminal 1: Watch extension (auto-recompile on save)
npm run watch

# Terminal 2: Watch webview (if making webview changes)
cd webview-ui && npm run dev
```

Press `F5` in VS Code to launch the Extension Development Host. Open any `.arazzo.yaml` file to test.

## Implementation Order

This roadmap has dependency-ordered phases:

1. **Arazzo detection** (US1) — Must come first; all other features depend on the `isArazzo` guard.
2. **Module decomposition** (US2) — Extract modules from `extension.ts`. Enables parallel work on subsequent stories.
3. **Parse cache + debounce** (US3) — Shared infrastructure consumed by validation, completions, and panels.
4. **Webview security** (US4) — Independent of extension-side changes. Can be done in parallel with US3.
5. **Validation rules** (US5) — Depends on detection (US1) and benefits from modular validation directory (US2).
6. **Completions** (US6) — Depends on parse cache (US3) for cursor context detection.
7. **Test suite** (US7) — Incremental; add tests alongside each story. Final batch covers cross-cutting scenarios.

## Key Files to Modify

| File | Change |
|------|--------|
| `src/extension.ts` | Reduce to activation wiring (<80 lines) |
| `src/panels/*.ts` | New — extracted panel classes |
| `src/providers/*.ts` | New — extracted + enhanced providers |
| `src/validation/*.ts` | New — extracted + expanded validation |
| `src/parse-cache.ts` | New — YAML parse cache with debounce |
| `src/arazzo-detection.ts` | New — Arazzo file detection logic |
| `webview-ui/src/components/MermaidDiagram.tsx` | Change `securityLevel` to `strict`, set `htmlLabels: false` |
| `webview-ui/src/App.tsx` | Add error state handling with inline banner + Retry |
| `package.json` | Remove `helloWorld` command |
| `src/test/*.ts` | New test files + update existing tests |

## Verification Checklist

After implementation, verify all success criteria:

- [ ] Open `docker-compose.yml` — zero Arazzo diagnostics (SC-001)
- [ ] Open valid Arazzo file — existing diagnostics unchanged (SC-002)
- [ ] `wc -l src/*.ts src/**/*.ts` — no file exceeds 300 lines (SC-003)
- [ ] Rapid typing in 1000-line Arazzo file — diagnostics update within 500ms (SC-005)
- [ ] Arazzo file with `stepId: "<script>alert(1)</script>"` — no XSS in flowchart (SC-006)
- [ ] `npm test` — 20+ tests pass (SC-007)
- [ ] `npm run compile && npm run lint && npm test` — all green (SC-008)
