# Implementation Plan: Extension Quality Roadmap

**Branch**: `001-extension-quality-roadmap` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-extension-quality-roadmap/spec.md`

## Summary

Refactor the Arazzo VS Code extension from a monolithic 748-line `extension.ts` into focused modules, add Arazzo-only file detection, implement YAML parse caching with debounce, harden webview security (Mermaid `securityLevel` → `strict`, sanitize `dangerouslySetInnerHTML`), expand validation rules (mutual exclusivity, reference resolution), build context-aware completions with runtime expression prefixes, and grow the test suite from 3 to 20+ cases. The approach is incremental: detection and modularization first (enabling all subsequent work), then performance/security hardening in parallel, then validation/completions/testing.

## Technical Context

**Language/Version**: TypeScript 5.2 (strict mode), ES2022 target (extension), ES2020 target (webview)
**Primary Dependencies**: VS Code Extension API, webpack 5 (extension bundler), Vite 5 + React 18 + Tailwind 3 (webview), `yaml` v2 (parsing), `mermaid` v10.9 (flowcharts), `lucide-react` (icons)
**Storage**: N/A (in-memory parse cache per document URI)
**Testing**: `@vscode/test-cli` + `@vscode/test-electron` (Mocha-based integration tests); test fixtures in `src/test/`
**Target Platform**: VS Code desktop (Node.js extension host + webview)
**Project Type**: VS Code extension (two-process: extension host + webview)
**Performance Goals**: Diagnostics update within 500ms of last keystroke for files up to 1000 lines; YAML parsed at most once per change event cycle
**Constraints**: No file in `src/` > 300 lines; no fixed `setTimeout` in tests; CSP must use nonce-only script execution; Mermaid `securityLevel` must be `strict` or `sandbox`
**Scale/Scope**: Single-document validation only; ~750 lines of extension code to refactor; ~40 React components in webview (minimal changes needed)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Arazzo Spec Fidelity | PASS | Types in `webview-ui/src/types/arazzo.ts` remain canonical. New validation rules (FR-007, FR-008) align with Arazzo 1.0.1 spec. Version detection (FR-001) accepts any `arazzo` key, warns on unrecognized versions. |
| II. Arazzo-Only Activation | PASS | FR-001 adds `arazzo` root key detection as guard for all diagnostics/completions. Currently missing — this plan addresses it as P1. |
| III. Modular Architecture | PASS | FR-004 targets 300-line max per file. Plan decomposes `extension.ts` (748 lines) into 5–6 modules. |
| IV. Performance by Design | PASS | FR-002/FR-003 implement parse cache + 200-300ms debounce. SC-005 sets measurable 500ms target for files up to 1000 lines. |
| V. Security-First Webview | PASS | FR-006 changes Mermaid from `loose` to `strict`/`sandbox`. CSP already uses nonce-based scripts. `dangerouslySetInnerHTML` for Mermaid SVG output will be sanitized. |
| TypeScript Strict | PASS | Already enabled in both tsconfigs. FR-011 addresses `any` casts (~20+ in extension, ~10+ in webview). |
| Testing Standards | PASS | FR-013 eliminates `setTimeout` waits. FR-014 targets 20+ test cases. Each validation rule gets positive + negative tests. |
| Marketplace Hygiene | PASS | FR-012 removes `helloWorld` command from manifest. |
| Build Pipeline | PASS | Webpack (extension) + Vite (webview) pipeline unchanged. Plan requires both build successfully. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-extension-quality-roadmap/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── extension.ts              # Activation wiring only (<80 lines)
├── arazzo-detection.ts       # isArazzoDocument(), version warning logic
├── parse-cache.ts            # ParseCache class, debounced change handler
├── validation/
│   ├── index.ts              # validateArazzo() orchestrator
│   ├── required-fields.ts    # checkRequired(), addDiagnostic()
│   ├── mutual-exclusivity.ts # operationId/operationPath/workflowId checks
│   ├── references.ts         # dependsOn, sourceDescriptions.type validation
│   └── version-check.ts      # Unrecognized Arazzo version warning
├── providers/
│   ├── symbol-provider.ts    # YamlDocumentSymbolProvider
│   └── completion-provider.ts # Context-aware Arazzo completions
├── panels/
│   ├── preview-panel.ts      # ArazzoPreviewPanel
│   ├── flowchart-panel.ts    # ArazzoFlowchartPanel
│   └── webview-html.ts       # Shared getHtmlForWebview() + getNonce()
└── test/
    ├── extension.test.ts     # Integration tests (existing, updated)
    ├── validation.test.ts    # Validation rule tests
    ├── mermaid.test.ts       # Mermaid converter tests
    ├── detection.test.ts     # Arazzo detection tests
    ├── completion.test.ts    # Completion provider tests
    └── fixtures/
        ├── pet-adoption.arazzo.yaml  # Existing valid fixture
        ├── invalid-mutual-exclusivity.arazzo.yaml
        ├── invalid-references.arazzo.yaml
        ├── non-arazzo.yaml
        └── unknown-version.arazzo.yaml

webview-ui/src/
├── components/
│   └── MermaidDiagram.tsx    # Updated: securityLevel → strict, sanitize SVG
└── (rest unchanged)
```

**Structure Decision**: Single-project layout matching existing conventions. The `src/` directory gains subdirectories for `validation/`, `providers/`, and `panels/` to decompose the monolithic `extension.ts`. Webview changes are minimal (Mermaid security config + error state banner). Test fixtures directory added for validation test cases.

## Constitution Re-Check (Post Phase 1 Design)

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| I. Arazzo Spec Fidelity | PASS | 8 validation rules in `contracts/validation-diagnostics.md` map to Arazzo 1.0.1 spec. Canonical types unchanged. |
| II. Arazzo-Only Activation | PASS | `ParseCacheEntry.isArazzo` guard. Both validation and completion contracts specify Arazzo-only guard. |
| III. Modular Architecture | PASS | 10 source modules in structure plan, all estimated <300 lines. Shared `webview-html.ts` eliminates duplication. |
| IV. Performance by Design | PASS | `ParseCacheEntry` with version-based invalidation. Single parse consumed by validation, completions, panels, cursor detection. |
| V. Security-First Webview | PASS | Research R3: `strict` mode + `htmlLabels: false`. Error state contract in `contracts/message-protocol.md`. |

**Gate result: PASS — no violations introduced by design artifacts.**

## Complexity Tracking

> No constitution violations to justify. All gates pass.
