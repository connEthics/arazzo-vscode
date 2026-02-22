# Research: Extension Quality Roadmap

**Date**: 2026-02-22 | **Branch**: `001-extension-quality-roadmap`

## R1: Module Decomposition Strategy

**Decision**: Split `extension.ts` (748 lines) into 5 module groups using parameter passing for shared state (diagnostics collection, parse cache instance created in `activate()` and passed to consumers).

**Rationale**: VS Code extensions have a single `activate()` entry point that creates shared resources. The simplest pattern is to create shared instances in `activate()` and pass them as constructor/function parameters to each module. This avoids singletons (hard to test) and DI frameworks (overkill for this scale). The current code already groups naturally into: panel management (2 classes, ~340 lines), symbol provider (~165 lines), validation (~90 lines), completion (~15 lines), and activation wiring (~90 lines).

**Proposed modules** (all under 300 lines):
- `extension.ts` — activation wiring, imports, event binding (<80 lines)
- `panels/preview-panel.ts` — ArazzoPreviewPanel class (~130 lines)
- `panels/flowchart-panel.ts` — ArazzoFlowchartPanel class (~150 lines)
- `panels/webview-html.ts` — shared `getHtmlForWebview()` + `getNonce()` (~80 lines)
- `providers/symbol-provider.ts` — YamlDocumentSymbolProvider (~170 lines)
- `providers/completion-provider.ts` — new context-aware completions (~200 lines)
- `validation/index.ts` — orchestrator + Arazzo detection (~100 lines)
- `validation/required-fields.ts` — existing checkRequired/addDiagnostic (~50 lines)
- `validation/rules.ts` — mutual exclusivity, references, version check (~150 lines)
- `parse-cache.ts` — ParseCache class + debounced handler (~80 lines)

**Alternatives considered**:
- Singleton modules: Rejected — harder to test, implicit coupling
- DI container (tsyringe/inversify): Rejected — overkill, adds dependency, VS Code extensions don't conventionally use DI
- Barrel re-exports from `src/index.ts`: Rejected — webpack entry is `extension.ts`, barrel adds indirection

## R2: YAML Parse Caching Pattern

**Decision**: Use a `Map<string, { version: number; parsed: Document }>` keyed by document URI string. Invalidate on `onDidChangeTextDocument` by comparing `document.version`. The cache is a single instance created in `activate()` and shared via parameter passing.

**Rationale**: VS Code's `TextDocument.version` increments on every edit. By storing the version alongside the parse result, we can skip re-parsing when the version hasn't changed. The `yaml` library's `parseDocument()` returns a `Document` with CST nodes that include source positions — essential for diagnostics and cursor-based context detection. A simple Map is sufficient since VS Code manages document lifecycles; we clean entries on `onDidCloseTextDocument`.

**Alternatives considered**:
- WeakMap keyed by TextDocument: Rejected — TextDocument references aren't stable across events; URI string is the stable key
- VS Code's `workspace.fs` caching: Rejected — that's file system caching, not parsed AST caching
- LRU cache with size limit: Rejected — VS Code already limits open documents; Map cleanup on close is sufficient

## R3: Mermaid Security Level

**Decision**: Use `securityLevel: 'strict'` (not `sandbox`).

**Rationale**: In Mermaid v10, `strict` disables HTML label parsing and click events, which eliminates XSS via node labels — exactly the attack vector we need to close (`stepId`, `workflowId`, `summary` injection). `sandbox` mode renders diagrams inside an iframe sandbox, which adds isolation but creates complications in VS Code webviews (nested iframe within webview iframe, potential CSP conflicts, styling inheritance issues). Since we already have CSP with nonce-based script execution, `strict` mode provides the necessary protection without iframe overhead. Setting `htmlLabels: false` in the flowchart config ensures labels are rendered as plain text in SVG `<text>` elements.

**Alternatives considered**:
- `sandbox` mode: Rejected — iframe-in-webview causes CSP and styling complications in VS Code; over-isolation for our use case
- `loose` with manual sanitization: Rejected — fragile, error-prone, violates Constitution principle V
- Keep `loose` + DOMPurify: Rejected — adds dependency, still allows HTML in labels which is unnecessary

## R4: Test Async Waiting Strategy

**Decision**: Replace `setTimeout(1000)` with polling loops that check for the expected condition (diagnostics count, symbol count) with a timeout.

**Rationale**: The current tests wait a fixed 1 second for diagnostics/symbols to appear. This is fragile (too short on slow CI, wasteful on fast machines). The standard pattern for VS Code extension tests is to poll the condition with exponential backoff or fixed intervals, wrapped in a timeout. A simple `waitForCondition(predicate, timeoutMs, intervalMs)` utility handles all cases: diagnostics appearing, symbols loading, and document changes propagating.

**Pattern**:
```typescript
async function waitFor(predicate: () => boolean, timeoutMs = 5000, intervalMs = 50): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timeout waiting for condition');
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
```

**Alternatives considered**:
- VS Code `workspace.onDidChangeDiagnostics` event: Viable but requires event-based test architecture; polling is simpler and covers all async scenarios uniformly
- `vscode-test` built-in waitFor: Does not exist in `@vscode/test-electron`
- Longer fixed timeout (5s): Rejected — still fragile, just slower to fail

## R5: YAML Cursor Context Detection for Completions

**Decision**: Use the `yaml` library's `parseDocument()` with `keepSourceTokens: true` to get CST nodes with source ranges, then walk the AST to find which Arazzo structure the cursor is inside (root, sourceDescriptions item, workflow, step, etc.).

**Rationale**: The `yaml` v2 library preserves source positions on CST/AST nodes when `keepSourceTokens` is enabled. By finding the deepest node whose range contains the cursor position, we can determine the YAML path (e.g., `workflows[0].steps[1]`) and map it to Arazzo completion context. This approach reuses the existing `yaml` dependency and the parse cache, avoiding a second parser.

**Context detection hierarchy for completions**:
1. Document root → suggest top-level Arazzo keys (`arazzo`, `info`, `sourceDescriptions`, `workflows`)
2. Inside `sourceDescriptions` item → suggest `name`, `url`, `type`, `description`
3. After `type: ` in sourceDescriptions → suggest `openapi`, `arazzo`
4. Inside `workflows` item → suggest `workflowId`, `summary`, `description`, `inputs`, `dependsOn`, `steps`, `outputs`, `parameters`
5. Inside `steps` item → suggest `stepId`, `operationId`, `operationPath`, `workflowId`, `parameters`, `requestBody`, `successCriteria`, `onSuccess`, `onFailure`, `outputs`
6. Value position with `$` → suggest runtime expression prefixes
7. After `$steps.` → dynamically resolve step IDs from current workflow

**Alternatives considered**:
- Regex-based line parsing: Rejected — brittle, can't handle multi-line YAML or nested structures
- Tree-sitter YAML grammar: Rejected — adds large dependency, not needed when `yaml` v2 already provides CST
- Language Server Protocol (LSP): Rejected — massive scope increase, out of scope per clarification (no authoring wizards)

## R6: Webview Error State Implementation

**Decision**: Add a React error boundary + explicit error state in `App.tsx` that clears previous content and renders an inline banner with message and Retry button.

**Rationale**: The webview receives data via `postMessage`. If the extension sends malformed data or the parse fails, the React state should transition to an error view. A Retry button sends a `{ type: 'ready' }` message back to the extension, which triggers a fresh data push. This is the standard VS Code webview error pattern and requires minimal changes — just a state variable and conditional render in `App.tsx`.

**Alternatives considered**:
- Toast notification: Rejected — not standard in VS Code webviews, transient (user might miss it)
- Console.error only: Rejected — user-invisible, violates edge case requirement
- Error boundary catching render exceptions: Needed as defense-in-depth, but the primary error path is invalid message data (caught before render)
