# Data Model: Extension Quality Roadmap

**Date**: 2026-02-22 | **Branch**: `001-extension-quality-roadmap`

## Entities

### ParseCacheEntry

In-memory cached result of parsing a YAML document.

| Field | Type | Description |
|-------|------|-------------|
| `uri` | `string` | Document URI (key). Corresponds to `vscode.TextDocument.uri.toString()`. |
| `version` | `number` | Document version at time of parse. Matches `vscode.TextDocument.version`. |
| `document` | `yaml.Document \| null` | Parsed YAML Document from `yaml.parseDocument()`. `null` if YAML syntax error. |
| `error` | `string \| null` | YAML parse error message if parsing failed. `null` on success. |
| `isArazzo` | `boolean` | Whether the document root contains an `arazzo` key. Determined during parse. |
| `arazzoVersion` | `string \| null` | Value of the `arazzo` root key (e.g., `"1.0.1"`). `null` if not Arazzo. |

**Identity**: Unique by `uri`.
**Lifecycle**: Created on first document access after change event. Invalidated when `document.version` differs from cached `version`. Removed on `onDidCloseTextDocument`.

### ValidationRule

A discrete validation check applied to an ArazzoDocument.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique rule identifier (e.g., `required-fields`, `mutual-exclusivity`, `dependsOn-refs`). |
| `name` | `string` | Human-readable rule name for diagnostics source. |
| `severity` | `vscode.DiagnosticSeverity` | Error or Warning. |
| `validate` | `(doc: yaml.Document, textDoc: vscode.TextDocument) => vscode.Diagnostic[]` | Function that inspects the parsed document and returns diagnostics. |

**Validation rules defined in this roadmap**:

| Rule ID | Severity | Description | Spec Ref |
|---------|----------|-------------|----------|
| `required-fields` | Error | Missing required top-level fields (`info`, `sourceDescriptions`, `workflows`) | FR-001 |
| `step-required-fields` | Error | Missing required step fields | FR-001 |
| `mutual-exclusivity` | Error | Step has >1 of `operationId`, `operationPath`, `workflowId` | FR-007 |
| `step-operation-required` | Error | Step has none of `operationId`, `operationPath`, `workflowId` | FR-007 |
| `dependsOn-refs` | Error | `dependsOn` references non-existent workflow ID | FR-008 |
| `source-type` | Error | `sourceDescriptions[].type` not `openapi` or `arazzo` | US5-AS3 |
| `duplicate-stepId` | Error | Two steps in same workflow share `stepId` | Edge Case |
| `unrecognized-version` | Warning | `arazzo` value is not `1.0.0` or `1.0.1` | FR-001 |

### CompletionContext

Determined from cursor position within the YAML AST.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | YAML path from root to cursor (e.g., `["workflows", "0", "steps", "1"]`). |
| `contextType` | `ArazzoContext` | Enum: `root`, `info`, `sourceDescription`, `workflow`, `step`, `successCriterion`, `action`, `parameter`, `value`. |
| `isValuePosition` | `boolean` | `true` if cursor is after `: ` (value position), `false` if key position. |
| `currentKey` | `string \| null` | The YAML key the cursor is on/after (e.g., `"type"` for `type: |`). |
| `parentWorkflow` | `object \| null` | Reference to the containing workflow node, for dynamic step ID resolution. |

**Type union for `ArazzoContext`**:
```typescript
type ArazzoContext =
  | 'root'              // Top-level document keys
  | 'info'              // Inside info object
  | 'sourceDescription' // Inside a sourceDescriptions[] item
  | 'workflow'          // Inside a workflows[] item (top-level keys)
  | 'step'             // Inside a steps[] item
  | 'successCriterion' // Inside successCriteria[] item
  | 'action'           // Inside onSuccess[]/onFailure[] item
  | 'parameter'        // Inside parameters[] item
  | 'value'            // Generic value position (for expression completions)
  | 'unknown'          // Cannot determine context
```

### WebviewState

React state model for the webview application (in `App.tsx`).

| Field | Type | Description |
|-------|------|-------------|
| `view` | `'loading' \| 'documentation' \| 'flowchart' \| 'error'` | Current view mode. `'error'` is the new error state. |
| `spec` | `ArazzoSpec \| null` | Parsed Arazzo spec received from extension. |
| `selectedWorkflow` | `string \| null` | Currently selected workflow ID. |
| `error` | `string \| null` | Error message when view is `'error'`. |
| `theme` | `'light' \| 'dark' \| 'high-contrast'` | Detected VS Code theme. |

**State transitions**:
- `loading` → `documentation` (on `update` message with valid spec)
- `loading` → `flowchart` (on `update-flowchart` message with valid spec)
- `loading` → `error` (on malformed message or parse failure)
- `documentation` → `error` (on subsequent malformed message)
- `flowchart` → `error` (on subsequent malformed message)
- `error` → `loading` (on Retry button click → sends `ready` message)
- Any → `documentation`/`flowchart` (on valid `update`/`update-flowchart` message)

## Relationships

```text
ParseCacheEntry 1──* ValidationRule    (each cache entry is validated by all rules)
ParseCacheEntry 1──1 CompletionContext (cursor + cached doc → completion context)
ParseCacheEntry 1──1 WebviewState.spec (cached doc serialized → webview spec)
```

## Data Volume Assumptions

- **Parse cache**: At most ~10 entries (number of concurrently open YAML files). Each entry holds one `yaml.Document` in memory (~5-50KB depending on file size). No persistence needed.
- **Validation rules**: Fixed set of 8 rules. Evaluated synchronously on cached document. Sub-millisecond per rule.
- **Completion context**: Computed on-demand per keystroke. No caching needed (fast AST walk).
- **File size target**: Up to 1000 lines (~30-50KB YAML). Parse time <50ms on modern hardware.
