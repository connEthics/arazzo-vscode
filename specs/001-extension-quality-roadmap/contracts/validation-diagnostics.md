# Contract: Validation Diagnostics

**Diagnostic Source**: `"arazzo"` (all diagnostics use this source identifier)

## Diagnostic Rules

| Rule | Code | Severity | Message Pattern | Condition |
|------|------|----------|-----------------|-----------|
| Required top-level fields | `arazzo-required` | Error | `Missing required field: {field}` | `info`, `sourceDescriptions`, or `workflows` absent |
| Required step fields | `arazzo-step-required` | Error | `Missing required field: {field}` | `stepId` absent in a step |
| Mutual exclusivity | `arazzo-mutual-exclusive` | Error | `Step must have only one of: operationId, operationPath, workflowId` | Step has >1 of the three |
| Step operation required | `arazzo-operation-required` | Error | `Step must specify one of: operationId, operationPath, workflowId` | Step has none of the three |
| dependsOn reference | `arazzo-ref-dependsOn` | Error | `Unknown workflow reference in dependsOn: {id}` | `dependsOn` references non-existent workflow ID |
| Source type | `arazzo-source-type` | Error | `Invalid sourceDescriptions type: {value}. Must be "openapi" or "arazzo"` | `type` not `openapi`/`arazzo` |
| Duplicate stepId | `arazzo-duplicate-stepId` | Error | `Duplicate stepId "{id}" in workflow "{workflowId}"` | Two steps share stepId in same workflow |
| Unrecognized version | `arazzo-version` | Warning | `Unrecognized Arazzo version: {version}. Known versions: 1.0.0, 1.0.1` | `arazzo` key value not in known set |

## Diagnostic Positioning

All diagnostics point to the relevant YAML node's source range using positions from the `yaml` library's CST. If a node lacks source position information (e.g., implicit/missing key), the diagnostic falls back to line 0, column 0.

## Guard: Arazzo-Only Activation

Diagnostics are ONLY produced when the document root contains an `arazzo` key. Non-Arazzo YAML files receive zero diagnostics from this extension. The diagnostic collection is cleared when a document is determined to be non-Arazzo.
