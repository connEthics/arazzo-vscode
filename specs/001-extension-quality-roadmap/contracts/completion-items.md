# Contract: Completion Items

**Trigger Characters**: `:`, ` ` (space), `$`, `.`
**Guard**: Completions only activate when the document root contains an `arazzo` key.

## Context-Aware Key Completions

| Cursor Context | Keys Suggested | Kind |
|---------------|----------------|------|
| Document root (key position) | `arazzo`, `info`, `sourceDescriptions`, `workflows`, `components`, `x-` | Field |
| Inside `info` | `title`, `summary`, `description`, `version` | Field |
| Inside `sourceDescriptions[]` item | `name`, `url`, `type`, `description`, `x-` | Field |
| Inside `workflows[]` item | `workflowId`, `summary`, `description`, `inputs`, `dependsOn`, `steps`, `outputs`, `parameters`, `x-` | Field |
| Inside `steps[]` item | `stepId`, `description`, `operationId`, `operationPath`, `workflowId`, `parameters`, `requestBody`, `successCriteria`, `onSuccess`, `onFailure`, `outputs`, `x-` | Field |
| Inside `onSuccess[]`/`onFailure[]` item | `name`, `type`, `workflowId`, `stepId`, `retryAfter`, `retryLimit`, `criteria` | Field |
| Inside `successCriteria[]` item | `condition`, `context`, `type` | Field |

## Value Completions

| Context (after `: `) | Values Suggested | Kind |
|----------------------|------------------|------|
| `type` in `sourceDescriptions[]` | `openapi`, `arazzo` | Value |
| `type` in `onSuccess[]`/`onFailure[]` | `goto`, `retry`, `end` | Value |
| `type` in `successCriteria[]` | `simple`, `regex`, `jsonpath`, `xpath` | Value |
| Boolean fields | `true`, `false` | Keyword |

## Runtime Expression Completions

| Trigger | Completions | Kind | Resolution |
|---------|-------------|------|------------|
| `$` in value position | `$url`, `$method`, `$statusCode`, `$request.`, `$response.`, `$inputs.`, `$outputs.`, `$steps.`, `$sourceDescriptions.`, `$workflows.` | Variable | Static keywords |
| `$steps.` | Step IDs from current workflow (e.g., `loginStep`, `getTokenStep`) | Variable | Dynamic — reads `stepId` values from containing workflow's `steps[]` |

## Completion Item Properties

All completions include:
- `label`: The completion text
- `kind`: `CompletionItemKind.Field` (keys), `.Value` (enum values), `.Keyword` (boolean), `.Variable` (expressions)
- `detail`: Brief description (e.g., "Arazzo key", "Runtime expression prefix")
- `insertText`: The text to insert (same as label for most; adds `: ` suffix for key completions in key position)
- `sortText`: Prefixed to prioritize Arazzo completions over generic YAML suggestions
