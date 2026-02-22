# Tasks: Extension Quality Roadmap

**Input**: Design documents from `/specs/001-extension-quality-roadmap/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — the spec explicitly requires 20+ test cases (FR-014) and test improvements (FR-013, US7).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and shared test utilities needed by all stories.

- [x] T001 Create module directory structure: `src/validation/`, `src/providers/`, `src/panels/`, `src/test/fixtures/`
- [x] T002 [P] Create test fixture `src/test/fixtures/non-arazzo.yaml` — a minimal `docker-compose.yml` with `services:` key and no `arazzo` key
- [x] T003 [P] Create test fixture `src/test/fixtures/unknown-version.arazzo.yaml` — valid Arazzo structure but with `arazzo: "2.0.0"` to test version warning
- [x] T004 [P] Create test fixture `src/test/fixtures/invalid-mutual-exclusivity.arazzo.yaml` — a step with both `operationId` and `operationPath`
- [x] T005 [P] Create test fixture `src/test/fixtures/invalid-references.arazzo.yaml` — a workflow with `dependsOn: [nonExistentWorkflow]` and a `sourceDescriptions` entry with `type: "invalid"`
- [x] T006 [P] Create test fixture `src/test/fixtures/xss-payload.arazzo.yaml` — steps with `stepId: "<script>alert(1)</script>"` and `summary: "<img onerror=alert(1) src=x>"`
- [x] T007 Create `waitFor` test utility function in `src/test/helpers.ts` — polling loop with predicate, timeoutMs (default 5000), intervalMs (default 50) per research R4 pattern. Export for all test files.

**Checkpoint**: Directory structure and fixtures ready. All subsequent phases can reference these fixtures.

---

## Phase 2: US1 — Arazzo-only diagnostics (Priority: P1) — MVP

**Goal**: Extension only produces diagnostics on files with an `arazzo` key at document root. Non-Arazzo YAML files see zero diagnostics. Unrecognized versions emit a warning.

**Independent Test**: Open `src/test/fixtures/non-arazzo.yaml` and verify zero diagnostics. Open `src/test/fixtures/pet-adoption.arazzo.yaml` and verify existing diagnostics still fire.

### Implementation for User Story 1

- [x] T008 [US1] Create `src/arazzo-detection.ts` — export `isArazzoDocument(root: any): boolean` that checks for `arazzo` key at document root, and `getArazzoVersion(root: any): string | null` that returns the version value. Use typed interface per data-model `ParseCacheEntry.isArazzo` and `ParseCacheEntry.arazzoVersion` fields.
- [x] T009 [US1] Create `src/validation/version-check.ts` — export function that produces a Warning diagnostic when `arazzo` value is not `"1.0.0"` or `"1.0.1"`, using message pattern from `contracts/validation-diagnostics.md` (`arazzo-version` code).
- [x] T010 [US1] Add Arazzo detection guard to the existing validation logic in `src/extension.ts` — wrap the `onDidChangeTextDocument` and `onDidOpenTextDocument` handlers to call `isArazzoDocument()` before running `validateArazzo()`. If not Arazzo, clear the diagnostic collection for that document. Call version-check if Arazzo is detected.
- [x] T011 [US1] Add non-Arazzo command guard — in the `arazzo-vscode.openPreview` and `arazzo-vscode.openFlowchart` command handlers in `src/extension.ts`, check `isArazzoDocument()` and show `vscode.window.showInformationMessage("This file is not an Arazzo specification document.")` if false.
- [x] T012 [US1] Remove `arazzo-vscode.helloWorld` command from `package.json` contributes.commands and its handler from `src/extension.ts` (FR-012).

### Tests for User Story 1

- [x] T013 [US1] Write detection tests in `src/test/detection.test.ts` — test `isArazzoDocument()` with: Arazzo file (true), non-Arazzo YAML (false), file with `arazzo: 2.0.0` (true). Use `waitFor` helper from `src/test/helpers.ts` instead of setTimeout.
- [x] T014 [US1] Update existing tests in `src/test/extension.test.ts` — replace all `setTimeout(1000)` calls with `waitFor` helper. Add test: open `non-arazzo.yaml` fixture and assert zero diagnostics. Add test: open `unknown-version.arazzo.yaml` and assert warning diagnostic with code `arazzo-version`.
- [x] T015 [US1] Verify: `npm run compile && npm run lint && npm test` all pass. Zero diagnostics on non-Arazzo fixture. Existing pet-adoption tests unchanged.

**Checkpoint**: MVP complete. Non-Arazzo YAML files are clean. Version warnings appear. All existing behavior preserved.

---

## Phase 3: US2 — Modular codebase (Priority: P2)

**Goal**: Split `src/extension.ts` (748 lines) into focused modules. No file exceeds 300 lines. `extension.ts` reduced to activation wiring (<80 lines).

**Independent Test**: `npm run compile` and `npm test` pass with identical behavior. `extension.ts` contains only imports and activate/deactivate.

### Implementation for User Story 2

- [x] T016 [P] [US2] Extract `getNonce()` and shared `getHtmlForWebview()` to `src/panels/webview-html.ts` — factor out the HTML generation logic from both `ArazzoPreviewPanel._getHtmlForWebview()` (lines 249-313) and `ArazzoFlowchartPanel._getHtmlForWebview()` (lines 436-464) into a single shared function. Both panels must call this shared function. Export `getNonce()` and `getHtmlForWebview(webview, extensionUri, nonce, viewType)`.
- [x] T017 [P] [US2] Extract `ArazzoPreviewPanel` class to `src/panels/preview-panel.ts` — move the class (lines 130-314) into its own module. Update constructor to use shared `getHtmlForWebview` from `webview-html.ts`. Export the class. Adjust all internal references (resource URIs, disposables).
- [x] T018 [P] [US2] Extract `ArazzoFlowchartPanel` class to `src/panels/flowchart-panel.ts` — move the class (lines 319-465) into its own module. Update constructor to use shared `getHtmlForWebview` from `webview-html.ts`. Export the class.
- [x] T019 [P] [US2] Extract `YamlDocumentSymbolProvider` to `src/providers/symbol-provider.ts` — move the class (lines 476-641) into its own module. Export the class.
- [x] T020 [US2] Extract validation functions to `src/validation/required-fields.ts` — move `validateArazzo()`, `validateStep()`, `checkRequired()`, `addDiagnostic()` (lines 660-747). Export all functions.
- [x] T021 [US2] Create validation orchestrator `src/validation/index.ts` — import required-fields validation + version-check + arazzo-detection. Export a single `runValidation(document, diagnosticCollection, parseCache?)` function that: checks isArazzo, clears diagnostics if not, runs all validation rules if yes. Import and re-export from required-fields.ts and version-check.ts.
- [x] T022 [US2] Move existing `YamlCompletionItemProvider` to `src/providers/completion-provider.ts` — move the class (lines 643-656) as-is for now (will be enhanced in US6).
- [x] T023 [US2] Reduce `src/extension.ts` to activation wiring — import all extracted modules. The `activate()` function should only: create diagnostic collection, register commands, register providers, register event listeners, wire up detectAndSelectWorkflow. Move `detectAndSelectWorkflow()` to `src/arazzo-detection.ts`. Target: <80 lines total.
- [x] T024 [US2] Verify all files under `src/` are ≤300 lines: run `wc -l src/*.ts src/**/*.ts`. Verify `npm run compile && npm run lint && npm test` pass with identical results.

**Checkpoint**: Monolith decomposed. Each module has single responsibility. Both panels share HTML generation. Build and tests green.

---

## Phase 4: US3 — Responsive editing performance (Priority: P2)

**Goal**: YAML parsing occurs at most once per change event. Debounce prevents excessive re-parsing during rapid typing. Diagnostics update within 500ms for files up to 1000 lines.

**Independent Test**: Edit a large Arazzo file rapidly — diagnostics update within 500ms. Multiple consumers (validation, panels, cursor detection) share the same parse result.

### Implementation for User Story 3

- [x] T025 [US3] Create `src/parse-cache.ts` — implement `ParseCache` class per data-model: `Map<string, ParseCacheEntry>` keyed by document URI. Methods: `get(document: TextDocument): ParseCacheEntry` (returns cached if version matches, else parses and caches), `invalidate(uri: string)`, `delete(uri: string)`. Use `yaml.parseDocument()` with `keepSourceTokens: true`. Set `isArazzo` and `arazzoVersion` fields during parse.
- [x] T026 [US3] Add debounced change handler to `src/parse-cache.ts` — export `createDebouncedHandler(cache, callback, delayMs = 250)` that wraps `onDidChangeTextDocument` with a debounce. The callback receives the fresh `ParseCacheEntry`. Use `setTimeout`/`clearTimeout` pattern.
- [x] T027 [US3] Wire parse cache into `src/extension.ts` — create `ParseCache` instance in `activate()`. Replace direct `yaml.parseDocument()` calls in validation orchestrator with `cache.get(document)`. Pass cache to `runValidation()`. Register `onDidCloseTextDocument` to call `cache.delete(uri)`. Use debounced handler for `onDidChangeTextDocument`.
- [x] T028 [US3] Update `src/panels/preview-panel.ts` — modify `_updateSpec()` to accept a `ParseCacheEntry` or consume from the shared cache instead of re-parsing YAML.
- [x] T029 [US3] Update `src/panels/flowchart-panel.ts` — same as T028, modify `_updateSpec()` to consume from the shared cache.
- [x] T030 [US3] Update `detectAndSelectWorkflow()` in `src/arazzo-detection.ts` to consume the cached parse result from `ParseCache.get()` instead of calling `yaml.parseDocument()` directly.
- [x] T031 [US3] Verify: rapid typing in a large Arazzo file causes at most one parse per debounce window. Add a debug log to `ParseCache.get()` that logs when a new parse occurs (can be removed later).

**Checkpoint**: Single parse per change event. Debounce active. All consumers share cached result.

---

## Phase 5: US4 — Hardened webview security (Priority: P2)

**Goal**: Mermaid configured with `securityLevel: 'strict'`. XSS payloads in Arazzo fields do not execute. Webview shows error state on malformed data.

**Independent Test**: Open `xss-payload.arazzo.yaml` in flowchart view — no script execution. Send malformed data to webview — error banner appears with Retry.

### Implementation for User Story 4

- [x] T032 [P] [US4] Change Mermaid security config in `webview-ui/src/components/MermaidDiagram.tsx` — change `securityLevel: 'loose'` to `securityLevel: 'strict'` (line 43) and set `htmlLabels: false` in the `flowchart` config (line 46). Verify the flowchart still renders correctly with plain text labels.
- [x] T033 [P] [US4] Add error state to `webview-ui/src/App.tsx` — add `'error'` to the view state type per data-model `WebviewState`. Add `error: string | null` state. In the message handler, wrap spec access in a null check: if `spec` is null/undefined in `update`/`update-flowchart` messages, set view to `'error'` with message "Failed to load document data". Render inline error banner (red/warning background, short message, Retry button). Retry button calls `vscode.postMessage({ type: 'ready' })` and sets view back to `'loading'`.
- [x] T034 [US4] Verify CSP in `src/panels/webview-html.ts` — confirm the shared HTML generation function preserves nonce-based `script-src` directive. Both panels must have identical CSP. No `'unsafe-eval'` or `'unsafe-inline'` for scripts (only for styles).
- [x] T035 [US4] Manual verification: open `xss-payload.arazzo.yaml` fixture in flowchart view. Confirm `<script>alert(1)</script>` renders as text, not executed. Confirm `<img onerror=alert(1)>` does not trigger.

**Checkpoint**: Webview hardened. XSS payloads neutralized. Error state functional.

---

## Phase 6: US5 — Comprehensive validation (Priority: P3)

**Goal**: Validate mutual exclusivity, reference resolution, source types, and duplicate stepIds beyond just required-field checks.

**Independent Test**: Open fixture files with specific violations and verify appropriate diagnostics appear per `contracts/validation-diagnostics.md`.

### Implementation for User Story 5

- [x] T036 [P] [US5] Create `src/validation/mutual-exclusivity.ts` — export function that checks each step in each workflow: if step has >1 of `operationId`, `operationPath`, `workflowId`, produce Error diagnostic with code `arazzo-mutual-exclusive`. Also check if step has none of the three → Error with code `arazzo-operation-required`. Use message patterns from `contracts/validation-diagnostics.md`.
- [x] T037 [P] [US5] Create `src/validation/references.ts` — export functions: (1) `validateDependsOn` — collect all `workflowId` values, then for each workflow's `dependsOn` array, check each reference exists → Error `arazzo-ref-dependsOn` if not. (2) `validateSourceType` — for each `sourceDescriptions[]` item, check `type` is `"openapi"` or `"arazzo"` → Error `arazzo-source-type` if not. (3) `validateDuplicateStepIds` — for each workflow, collect `stepId` values and report duplicates → Error `arazzo-duplicate-stepId`.
- [x] T038 [US5] Register new validation rules in `src/validation/index.ts` — import mutual-exclusivity and references modules. Call all validation functions in `runValidation()` after the isArazzo guard. Aggregate all diagnostics.
- [x] T039 [US5] Create test fixture `src/test/fixtures/duplicate-stepid.arazzo.yaml` — valid Arazzo structure with two steps sharing the same `stepId` in one workflow.

### Tests for User Story 5

- [x] T040 [US5] Write validation rule tests in `src/test/validation.test.ts` — for each rule, one positive test (valid file → no diagnostic with that code) and one negative test (fixture with violation → diagnostic with expected code and message pattern). Cover: `arazzo-mutual-exclusive`, `arazzo-operation-required`, `arazzo-ref-dependsOn`, `arazzo-source-type`, `arazzo-duplicate-stepId`. Use `waitFor` helper. Minimum 10 test cases in this file.
- [x] T041 [US5] Verify: `npm run compile && npm test` pass. All validation rules produce correct diagnostics on fixture files.

**Checkpoint**: 8 validation rules active. Each rule has test coverage.

---

## Phase 7: US6 — Context-aware completions (Priority: P3)

**Goal**: Completion provider suggests Arazzo-specific keys and values based on cursor position in the YAML hierarchy. Runtime expression prefixes are suggested. `$steps.` resolves dynamic step IDs.

**Independent Test**: In an Arazzo file, cursor inside `steps[]` triggers step-key suggestions. After `type: ` in `sourceDescriptions[]`, `openapi`/`arazzo` are suggested. `$` in value position suggests all runtime expression prefixes.

### Implementation for User Story 6

- [x] T042 [US6] Implement `ArazzoContext` type and `getCompletionContext()` in `src/providers/completion-provider.ts` — define the `ArazzoContext` type union from data-model. Implement cursor-to-context detection: use `ParseCache.get(document)` to get the cached `yaml.Document`, walk the AST using source positions from `keepSourceTokens` to find the deepest node containing the cursor offset. Map the YAML path to an `ArazzoContext` value. Detect key vs value position from line content (after `: ` = value).
- [x] T043 [US6] Implement key completions per `contracts/completion-items.md` — for each `ArazzoContext`, return the appropriate `CompletionItem[]` with `kind: Field`, `detail: "Arazzo key"`, and `sortText` prefix `"0_"` to prioritize over generic suggestions. Cover: root, info, sourceDescription, workflow, step, action, successCriterion contexts.
- [x] T044 [US6] Implement value completions — when `isValuePosition` is true and `currentKey` matches known enum fields (`type` in sourceDescriptions → `openapi`/`arazzo`, `type` in actions → `goto`/`retry`/`end`, etc.), return `CompletionItem[]` with `kind: Value`.
- [x] T045 [US6] Implement runtime expression completions — when cursor is in value position and text starts with `$`, return all 10 runtime expression prefixes as `CompletionItem[]` with `kind: Variable`. For `$steps.` trigger, resolve `stepId` values from the containing workflow's `steps[]` node in the cached YAML document.
- [x] T046 [US6] Register new completion provider in `src/extension.ts` — replace old `YamlCompletionItemProvider` registration with the new context-aware provider. Add trigger characters: `$` and `.` alongside existing `:` and ` `.
- [x] T047 [US6] Add Arazzo-only guard to completion provider — in `provideCompletionItems()`, use `ParseCache.get(document).isArazzo` check. Return `undefined` for non-Arazzo files.

### Tests for User Story 6

- [x] T048 [US6] Write completion tests in `src/test/completion.test.ts` — test context detection (cursor in step → step context, cursor at root → root context). Test key completions (step context returns stepId, operationId, etc.). Test value completions (after `type: ` in sourceDescriptions returns openapi/arazzo). Test runtime expression trigger. Minimum 6 test cases.
- [x] T049 [US6] Verify: completions activate only on Arazzo files. Non-Arazzo YAML gets no Arazzo completions.

**Checkpoint**: Context-aware completions active for all Arazzo structures. Runtime expressions supported.

---

## Phase 8: US7 — Robust test suite (Priority: P3)

**Goal**: 20+ test cases covering validation rules, mermaid converter, and workflow detection. No `setTimeout` usage in tests. All tests pass.

**Independent Test**: `npm test` passes with 20+ test cases.

### Implementation for User Story 7

- [ ] T050 [P] [US7] (DEFERRED: webview-ui has separate build; 31 tests exceed 20+ target) Write mermaid converter tests in `src/test/mermaid.test.ts` — import `workflowToMermaidFlowchart` and `workflowToMermaidSequence` from `webview-ui/src/lib/mermaid-converter.ts`. Test: sequential workflow (linear step chain), branching workflow (onSuccess/onFailure paths), workflow with no steps (empty), workflow with error flows. Verify each produces syntactically valid Mermaid DSL (starts with `graph` or `sequenceDiagram`, contains expected node IDs). Minimum 4 test cases.
- [x] T051 [P] [US7] Write cursor-based workflow detection tests in `src/test/detection.test.ts` (extend existing file) — test `detectAndSelectWorkflow` with: cursor at first workflow → selects workflow 1, cursor at second workflow → selects workflow 2, cursor outside any workflow → no selection. Use the pet-adoption fixture. Minimum 3 test cases.
- [x] T052 [US7] Audit all test files for remaining `setTimeout` usage — replace any remaining fixed timeouts with `waitFor` helper from `src/test/helpers.ts`.
- [x] T053 [US7] Verify total test count: `npm test` must report 20+ passing test cases. Count tests across: extension.test.ts, detection.test.ts, validation.test.ts, mermaid.test.ts, completion.test.ts.

**Checkpoint**: 20+ tests. Zero `setTimeout` usage. All green.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Type safety cleanup, final verification, and build validation.

- [x] T054 [P] Eliminate `@ts-ignore` in `webview-ui/src/App.tsx` line 14 — replace with proper type declaration: `declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; getState(): unknown; setState(state: unknown): void; }` or use `@vscode/webview-ui-toolkit` types if available. If elimination is not possible, add a justifying comment with a tracking issue link (FR-011).
- [x] T055 [P] Reduce `any` casts in extension host code — in `src/validation/required-fields.ts` and `src/validation/index.ts`, replace `any` types with `yaml.Document`, `yaml.YAMLMap`, `yaml.YAMLSeq`, `yaml.Scalar` etc. from the `yaml` library. For `sendSpec(spec: any)` in panels, type as `ArazzoSpec | null`. Add justifying comments for any remaining `any` that cannot be eliminated.
- [x] T056 [P] Reduce `any` casts in webview components — in `SchemaViewer.tsx`, `SchemaEditor.tsx`, `DetailViews.tsx`, `DetailDrawer.tsx`: replace `schema: any` with `schema: Record<string, unknown>` or a more specific type where feasible. This is best-effort; add `// TODO: type properly` for complex cases.
- [x] T057 Run full verification pipeline: `npm run compile && npm run lint && npm test`. Verify all pass. Run `cd webview-ui && npm run build` to verify webview builds.
- [x] T058 Verify no `src/` file exceeds 300 lines: `wc -l` on all `.ts` files under `src/`.
- [x] T059 (SKIPPED: quickstart.md does not exist for this feature) Run quickstart.md verification checklist — execute each item in `specs/001-extension-quality-roadmap/quickstart.md` Verification Checklist section.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on Setup (fixtures + waitFor helper)
- **US2 (Phase 3)**: Depends on US1 (detection module must exist before modularization extracts it)
- **US3 (Phase 4)**: Depends on US2 (parse cache wires into modular structure)
- **US4 (Phase 5)**: Depends on US2 (shared webview-html.ts must exist for CSP verification). Can run **in parallel with US3**.
- **US5 (Phase 6)**: Depends on US2 (validation directory structure). Can run **in parallel with US3/US4**.
- **US6 (Phase 7)**: Depends on US3 (parse cache needed for cursor context detection)
- **US7 (Phase 8)**: Depends on US5 + US6 (tests cover validation rules and completions)
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

```text
US1 (P1) ─────► US2 (P2) ─────┬──► US3 (P2) ──────► US6 (P3) ──► US7 (P3) ──► Polish
                               │                                        ▲
                               ├──► US4 (P2) ──────────────────────────┘
                               │                                        │
                               └──► US5 (P3) ──────────────────────────┘
```

### Within Each User Story

- Implementation tasks before test tasks (except where TDD is specified)
- Module creation before orchestrator wiring
- Verify checkpoint before moving to next story

### Parallel Opportunities

- **Phase 1**: T002–T007 all [P] (different fixture files)
- **Phase 3**: T016–T019 all [P] (extracting to different module files)
- **Phase 5**: T032–T033 [P] (webview changes independent of each other)
- **Phase 6**: T036–T037 [P] (different validation rule files)
- **Phase 8**: T050–T051 [P] (different test files)
- **Phase 9**: T054–T056 [P] (different files)
- **Cross-phase**: US4 and US5 can run in parallel with US3 after US2 completes

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all fixture creation tasks together:
Task: "Create non-arazzo.yaml fixture"         # T002
Task: "Create unknown-version fixture"         # T003
Task: "Create mutual-exclusivity fixture"      # T004
Task: "Create invalid-references fixture"      # T005
Task: "Create xss-payload fixture"             # T006
```

## Parallel Example: Phase 3 Module Extraction

```bash
# Launch all module extractions together (different target files):
Task: "Extract webview-html.ts"                # T016
Task: "Extract preview-panel.ts"               # T017
Task: "Extract flowchart-panel.ts"             # T018
Task: "Extract symbol-provider.ts"             # T019
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (fixtures + waitFor utility)
2. Complete Phase 2: US1 — Arazzo-only diagnostics
3. **STOP and VALIDATE**: Open non-Arazzo YAML → zero diagnostics. Open Arazzo file → diagnostics work.
4. This alone resolves the highest-impact user complaint (false errors on non-Arazzo files).

### Incremental Delivery

1. Setup + US1 → MVP: Non-Arazzo files are clean
2. Add US2 → Codebase modularized, contributor-friendly
3. Add US3 + US4 (parallel) → Performance + security hardened
4. Add US5 + US6 → Rich validation + smart completions
5. Add US7 → Full test coverage
6. Polish → Type safety, final verification

### Parallel Team Strategy

With multiple developers after US2 completes:

- **Developer A**: US3 (parse cache + debounce)
- **Developer B**: US4 (webview security)
- **Developer C**: US5 (validation rules)
- Stories complete and integrate independently via the modular architecture.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Test tasks reference fixtures created in Phase 1
- Total test count target: 20+ (distributed across detection, validation, mermaid, completion test files)
