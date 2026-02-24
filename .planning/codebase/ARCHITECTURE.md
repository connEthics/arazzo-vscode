# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Two-Process Model with Message Bridge

The extension implements a classic VS Code extension architecture split into two distinct processes:
1. **Extension Host** (Node.js context) - All VS Code API integration, file parsing, validation, and lifecycle management
2. **Webview UI** (Browser context) - React-based UI for documentation preview and flowchart visualization

These processes communicate asynchronously via `postMessage` with a defined message protocol.

**Key Characteristics:**
- Unified YAML parsing using the `yaml` library (v2) shared between both processes
- In-memory parse cache per document URI to avoid redundant parsing
- Event-driven architecture: file changes trigger debounced validation and panel updates
- Lazy-loaded webview panels (created on-demand, reused if already open)
- Theme-aware UI that responds to VS Code light/dark/high-contrast mode changes
- Language provider pattern: symbol navigation, completion items, and inline diagnostics

## Layers

**Extension Host (`src/extension.ts`):**
- Purpose: Central orchestrator for all VS Code integration and document processing
- Location: `src/extension.ts` (main file, ~90 lines)
- Contains: Command registration, event handlers, provider registration, validation triggering
- Depends on: vscode API, parse-cache, validation/, panels/, providers/, arazzo-detection
- Used by: VS Code - activated via `onLanguage:yaml` trigger

**Validation Layer (`src/validation/`):**
- Purpose: Real-time spec validation producing VS Code diagnostics
- Location: `src/validation/index.ts` (orchestrator), specialized validators in subdirectories
- Contains: Version checking, required field validation, mutual exclusivity rules, reference validation
- Depends on: yaml library, VS Code API (Diagnostic types)
- Used by: Extension host via debounced handler, runs on document open/change/save

**Providers (`src/providers/`):**
- Purpose: Language service implementations - symbols and completions
- Location: `src/providers/symbol-provider.ts`, `src/providers/completion-provider.ts`
- Contains:
  - **YamlDocumentSymbolProvider**: Parses YAML structure into outline tree for navigation
  - **YamlCompletionItemProvider**: Context-aware completion based on cursor position
- Depends on: yaml library, ParseCache, YAML node introspection
- Used by: VS Code, activated via `vscode.languages.register*Provider`

**Panels (`src/panels/`):**
- Purpose: Webview panel lifecycle and message routing
- Location: `src/panels/preview-panel.ts`, `src/panels/flowchart-panel.ts`, `src/panels/webview-html.ts`
- Contains:
  - Static panel managers with instance tracking (Map<uri, panel>)
  - Message handlers for webview-to-extension communication
  - HTML template generation with CSP headers and asset rewriting
- Depends on: vscode API, fs module, webview-ui/build/ artifacts
- Used by: Extension host commands, updated from parse-cache on document changes

**Parse Cache (`src/parse-cache.ts`):**
- Purpose: Shared parsing state to avoid redundant YAML parsing
- Location: `src/parse-cache.ts`
- Contains: Map of URI → {parsed YAML Document, JSON, isArazzo flag, version}
- Depends on: yaml library, arazzo-detection
- Used by: Validation, providers, panel updates, debounced handler

**Detection (`src/arazzo-detection.ts`):**
- Purpose: Arazzo document identification and cursor-based workflow tracking
- Location: `src/arazzo-detection.ts`
- Contains: `isArazzoDocument()`, `getArazzoVersion()`, `detectAndSelectWorkflow()`
- Depends on: yaml node inspection, YAML source ranges
- Used by: Parse cache initialization, extension host for workflow selection

**Webview UI (`webview-ui/src/`):**
- Purpose: React-based document viewer with two rendering modes
- Location: `webview-ui/src/App.tsx` (message listener and view controller)
- Contains: State management for spec, theme, view mode; message dispatch to component tree
- Depends on: React hooks, VS Code webview API, component tree
- Used by: Panels load HTML that bootstraps this React app

## Data Flow

**Workflow: File Open/Change**

1. User opens/modifies YAML file
2. `vscode.workspace.onDidOpenTextDocument` / `onDidChangeTextDocument` triggers
3. ParseCache validates document version - if stale, re-parses YAML
4. ParseCache stores: {parsed YAML Document, JSON, isArazzo flag, version}
5. Debounced handler (250ms) executes `runValidation()` on document
6. Validation orchestrator (`validation/index.ts`) chains validators:
   - Version check (`version-check.ts`)
   - Required fields (`required-fields.ts`)
   - Mutual exclusivity (`mutual-exclusivity.ts`)
   - References validation (`references.ts`)
7. Diagnostics collected and set on `diagnosticCollection`
8. If Arazzo document: `ArazzoPreviewPanel.updateFromCache()` and `ArazzoFlowchartPanel.updateFromCache()` push parsed JSON to webviews
9. Webviews receive `{ type: 'update', spec }` or `{ type: 'update-flowchart', spec }` messages
10. React components re-render with new spec data

**Workflow: Open Preview Command**

1. User clicks "Open Arazzo Preview" button (registered in `contributes.commands`)
2. Command handler checks if active editor has Arazzo document (via ParseCache.isArazzo)
3. `ArazzoPreviewPanel.createOrShow()` called with document URI
4. Panel manager checks if panel already exists for URI; if yes, reuses and reveals it
5. If new: creates webview panel via `vscode.window.createWebviewPanel()`
6. `getHtmlForWebview()` generates HTML with:
   - CSP headers for security
   - Script nonce injection
   - Asset URI rewriting (webview-ui/build/ → webview URI)
7. Webview loads, React App.tsx mounts
8. App.tsx sends `{ type: 'ready' }` message to extension
9. Extension responds with current parsed spec via `{ type: 'update', spec }`
10. UnifiedDocumentationView renders specification docs

**Workflow: Cursor Position → Workflow Selection**

1. User moves cursor in YAML editor
2. `vscode.window.onDidChangeTextEditorSelection` triggers
3. `detectAndSelectWorkflow()` called with editor and selection position
4. Function uses YAML source ranges from ParseCache to find workflow containing cursor line
5. If workflow found: calls `ArazzoFlowchartPanel.updateSelection(uri, workflowId)`
6. Panel sends `{ type: 'select-workflow', workflowId }` to webview
7. Flowchart view highlights selected workflow

**Workflow: Flowchart Step Click → Editor Navigation**

1. User clicks step in flowchart (MermaidDiagram.tsx)
2. Webview sends `{ type: 'step-selected', stepId, workflowId }` message
3. Extension receives and calls `ArazzoPreviewPanel.scrollToStep()`
4. Extension finds step in parsed spec and uses editor.reveal/selection to navigate
5. Preview panel scrolls/jumps to step in documentation

**State Management:**
- **Extension Host**: Mutable ParseCache, mutable panel registries, event subscriptions
- **Webview**: React useState for {spec, isDark, viewMode, selectedWorkflowId, error}
- **Shared Immutable State**: Parsed YAML Document (from yaml library)

## Key Abstractions

**Arazzo Document:**
- Purpose: Represents a valid Arazzo specification file
- Examples: Any YAML file with root `arazzo` key, versions 1.0.0 or 1.0.1
- Pattern: Identified via `isArazzoDocument()`, stored in ParseCache as `isArazzo: boolean`

**Panel Manager:**
- Purpose: Lifecycle management for webview panels with message routing
- Examples: `ArazzoPreviewPanel`, `ArazzoFlowchartPanel` (both follow same pattern)
- Pattern: Static class with Map<uri, instance>, singleton per URI, disposal cleanup

**Message Protocol:**
- Purpose: Typed communication between extension and webview
- Examples: `{ type: 'update', spec }`, `{ type: 'step-selected', stepId, workflowId }`
- Pattern: Enum-like type strings with payload, one-way message dispatch (postMessage)

**Language Providers:**
- Purpose: Implement vscode.DocumentSymbolProvider and vscode.CompletionItemProvider
- Examples: Symbol tree for outline navigation, completion suggestions for YAML keys/values
- Pattern: Register via `vscode.languages.register*Provider()`, cached by document version

**Validation Chain:**
- Purpose: Composable validators producing diagnostics
- Examples: Each validator file exports function(root, document, diagnostics): void
- Pattern: Mutate shared diagnostics array, any validator can add multiple errors

## Entry Points

**Extension Activation (`src/extension.ts`):**
- Location: `src/extension.ts` lines 10-87
- Triggers: VS Code activates on `onLanguage:yaml`
- Responsibilities:
  - Initialize ParseCache singleton
  - Register all commands (openPreview, openFlowchart)
  - Register language providers (symbol, completion)
  - Create diagnostic collection
  - Subscribe to document/editor events
  - Validate all already-open documents on activation

**Webview Entry (`webview-ui/src/main.tsx` + `src/panels/webview-html.ts`):**
- Location: HTML template generated by `getHtmlForWebview()` references webview-ui/build/index.html
- Triggers: Panel created via command or document change
- Responsibilities:
  - Load pre-built React app from `webview-ui/build/`
  - Establish message listener to receive spec updates
  - Send 'ready' message to signal readiness
  - React App.tsx handles state and routing to UnifiedDocumentationView or FlowchartView

**Command Entry Points:**
- `arazzo-vscode.openPreview`: Registered in extension.ts, triggers ArazzoPreviewPanel creation
- `arazzo-vscode.openFlowchart`: Registered in extension.ts, triggers ArazzoFlowchartPanel creation

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**
- **YAML Parse Errors**: Caught by `yaml` library, added to diagnostics collection with line/column range
- **Non-Arazzo YAML**: Silently ignored - diagnostics cleared, panels not updated
- **Validation Errors**: Collected into diagnostics and underlined in editor with hover messages
- **Webview Loading Failure**: Fallback HTML error message rendered if `webview-ui/build/index.html` not found
- **Parse Cache Stale**: Automatic re-parse on document version change, old cache discarded
- **Message Routing Failures**: Silent error - invalid messages ignored by message handlers (switch statement coverage)

## Cross-Cutting Concerns

**Logging:**
- Approach: Browser `console.log/error` in extension host (forwarded to "Output" panel)
- Used in: Parse cache updates, YAML parsing errors, workflow detection, validation issues

**Validation:**
- Approach: Orchestrated chain of validators in `validation/index.ts`, each produces diagnostic entries
- Locations: `validation/version-check.ts`, `validation/required-fields.ts`, `validation/mutual-exclusivity.ts`, `validation/references.ts`
- Triggers: Debounced on file change (250ms), immediate on file open

**Authentication:**
- Approach: Not applicable - extension does not require authentication

**Performance Optimization:**
- Debounced validation (250ms) to avoid excessive parsing during typing
- Parse cache per document URI avoids redundant YAML parsing
- Lazy webview panel creation - panels created on-demand, reused if already open
- Mermaid diagram rendering only when flowchart view mode selected

---

*Architecture analysis: 2026-02-24*
