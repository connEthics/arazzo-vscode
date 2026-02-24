# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**None detected** - This is a self-contained VS Code extension with no external API integrations.

## Data Storage

**Databases:**
- Not applicable - No database integration

**File Storage:**
- Local filesystem only - YAML files are read/written via VS Code Document API (`vscode.workspace`)

**Caching:**
- In-memory parse cache per document URI in `src/parse-cache.ts`
- Cache maps document URI → parsed JSON and metadata
- No persistent storage

## Authentication & Identity

**Auth Provider:**
- Not required - Extension runs locally in VS Code

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- console logging only in `src/extension.ts` (line 11: `console.log('Arazzo VSCode extension is active')`)
- VS Code Output channel available via `vscode.window.showErrorMessage()` and `vscode.window.showInformationMessage()`

## CI/CD & Deployment

**Hosting:**
- VS Code Marketplace (published extension)
- GitHub repository: `https://github.com/connEthics/arazzo-vscode.git`

**CI Pipeline:**
- Not detected - No GitHub Actions or CI configuration files found

## Environment Configuration

**Required env vars:**
- None - Extension is configuration-free

**Secrets location:**
- Not applicable - No secrets management

## Webhooks & Callbacks

**Incoming:**
- None - Extension does not expose webhook endpoints

**Outgoing:**
- None - Extension makes no outbound HTTP requests

## Internal Communication

**Webview Message Protocol (Extension ↔ Webview):**

Messages from extension to webview (`vscode.postMessage()`):
- `{ type: 'ready' }` - Webview signals ready to receive data
- `{ type: 'update', spec }` - Push parsed Arazzo spec to documentation view
- `{ type: 'update-flowchart', spec, workflowId }` - Push spec to flowchart view
- `{ type: 'select-workflow', workflowId }` - Auto-select workflow from editor cursor position
- `{ type: 'scroll-to-step', stepId, workflowId }` - Navigate to specific step in preview

Messages from webview to extension:
- `{ type: 'ready' }` - Webview initialized (sent in `webview-ui/src/App.tsx` line 60)
- `{ type: 'alert', text }` - Error message from webview

**Implementation Files:**
- Extension: `src/panels/preview-panel.ts` (PreviewPanel.postMessage)
- Extension: `src/panels/flowchart-panel.ts` (FlowchartPanel.postMessage)
- Webview: `webview-ui/src/App.tsx` (message event listener)

## Content Sources

**Arazzo Specification Reference:**
- OpenAPI Arazzo spec: `https://spec.openapis.org/arazzo/latest.html` (referenced in `webview-ui/src/types/arazzo.ts`)

**External Documentation:**
- Arazzo online playground: `https://arazzo.connethics.com/` (mentioned in README.md)

---

*Integration audit: 2026-02-24*
