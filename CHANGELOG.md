# Change Log

All notable changes to **Arazzo for VS Code — by ConnEthics** (`connethics.arazzo-vscode`) are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - Unreleased

Version 2.0 targets the **Arazzo 1.1.0** specification, published by the OpenAPI Initiative on 2026-05-17. Arazzo 1.0.x documents remain fully supported.

### Added

- **Arazzo 1.1.0 support**: `arazzo: 1.1.0` is detected, and all the new structures are understood: AsyncAPI sources (`type: asyncapi`), `channelPath` steps with `action: send|receive`, `correlationId` and `timeout`, step-level `dependsOn`, workflow reuse from success and failure actions (`workflowId` + `parameters`), Selector Objects, versioned Expression Type Objects, `in: querystring` and `$self`.
- **Two-layer validation** with the `@connethics/arazzo-core` engine:
  - the official OpenAPI Initiative JSON Schema of the document's version (1.0 `2025-10-15` or 1.1 `2026-04-15`);
  - more than 100 semantic rules: step target exclusivity, AsyncAPI-only `action` and `correlationId`, `dependsOn` and `goto` resolution, cycle detection, runtime expression, Selector and criterion syntax, `$steps` / `$inputs` / `$components` / `$sourceDescriptions` resolution, unique IDs, `querystring` exclusivity and 1.0/1.1 feature mismatches.
  - Every diagnostic has a stable code linked to its section of the specification. Unused sources and components are faded.
- **Arazzo 1.1 completion**: new keys, enumerations (`asyncapi`, `send`/`receive`, `querystring`, `jsonpath`/`xpath`/`jsonpointer` and their versions), `$message.header.` / `$message.payload`, `$self`, and existing step and workflow IDs for `dependsOn` and `goto`.
- **Quick fixes**:
  - **Migrate to Arazzo 1.1.0**, also available as the command `Arazzo: Migrate to Arazzo 1.1.0`;
  - add `$self`;
  - "did you mean" for unknown `stepId` / `workflowId` targets;
  - rewrite a dotted expression as a JSON Pointer.
- **Snippets** (YAML): new Arazzo 1.1 document, workflow, HTTP step, AsyncAPI `send` and `receive` steps, `dependsOn` join, Selector (JSONPath RFC 9535), failure action that runs a workflow and then retries, workflow shaped as an MCP tool.
- **Interactive workflow graph** based on `@connethics/arazzo-flow` (React Flow and ELK). It replaces the Mermaid flowchart.
  - Semantic nodes: HTTP, AsyncAPI `send` / `receive`, sub-workflow, `dependsOn` join, inputs, outputs and end.
  - Typed edges: sequence, success and failure `goto`, retry loops with `×N / Ns`, `end`, `dependsOn` and workflow calls.
  - Zoom, fit and minimap, step search, full keyboard navigation, a synchronized list view, legend, top-down or left-right layout, swimlanes per source, and graceful degradation for large workflows.
  - Colors follow the VS Code theme (`--vscode-*`), high-contrast themes included.
  - HTTP method badges are read from the local OpenAPI sources.
  - Validation diagnostics appear as badges on the nodes.
  - Clicking a node moves the editor cursor to the step, and double-click or `Enter` focuses the editor. Moving the cursor in the YAML selects the node.
  - Export to SVG, PNG or a Mermaid file, and "Copy as Mermaid".
- **Documentation view for Arazzo 1.1**: AsyncAPI message cards (`send` / `receive`, correlation ID, timeout), Selector values, step `dependsOn` ("waits for"), `$self` and `querystring` parameters.
- `THIRD-PARTY-NOTICES.md` and the license files of the bundled components ship in the VSIX.

### Changed

- **New name**: *Arazzo for VS Code — by ConnEthics* (previously *Arazzo VSCode*). The extension ID `connethics.arazzo-vscode` is unchanged.
- New 256 px icon (73 KB instead of 4.3 MB), a Marketplace banner, and a refreshed description, keywords and categories.
- Validation, the outline, completion, quick fixes and the panels share a single parse per document version (`ParseCache`).
- The webview moved to **React 19**.
- The ELK layout runs in a Web Worker started from a `blob:` URL. The webview Content Security Policy now allows `connect-src ${webview.cspSource}` and `worker-src blob:`, still without `unsafe-eval`. If the worker can't start, layout falls back to the main thread.
- The shared ConnEthics packages are vendored in `vendor/@connethics/` and checked by `npm run vendor:check`.
- README rewritten for Arazzo 1.1, the MCP and E2E use cases, Arazzo Studio and the Skill file.

### Removed

- **Mermaid** as a rendering engine, along with its lazy-loaded diagram chunks. The webview build shrank from 3.77 MB to 2.48 MB, ELK included. Mermaid remains available as an export format, generated without the library.
- The unused sequence-diagram view of the webview.
- The hand-written validators (`required-fields`, `mutual-exclusivity`, `references`, `version-check`), replaced by `@connethics/arazzo-core`.

### Fixed

- Duplicate diagnostics, for example when a step had several targets or none.
- The flowchart now draws retries, `goto` to other workflows, workflow-level actions and `dependsOn`, which the Mermaid diagram ignored.
- HTTP methods are no longer guessed from the `operationId` name.
- The outline no longer re-parses the document on every request.

## [1.0.2] - 2026-02-23

### Changed
- **License**: Updated to MIT license.

### Security
- **No Telemetry**: This extension collects no telemetry, analytics, or usage data.

## [0.0.3] - 2025-12-28

### Added
- **Synchronized Views**: Clicking a step in the Flowchart view now automatically scrolls to the corresponding step details in the Documentation view.
- **Marketplace Metadata**: Added categories and keywords for better discoverability.

## [0.0.2] - 2025-12-28

### Added
- **Flowchart View**:
    - New command `Open Arazzo Flowchart` to visualize workflows as diagrams.
    - Automatic detection of the active workflow based on cursor position.
    - Manual workflow selector.
    - Mermaid.js integration for rendering.
- **Interactive Preview Panel**:
    - View Arazzo specifications in a dedicated webview panel.
    - Live updates as you type.
    - Multi-tab support for viewing multiple specifications simultaneously.
    - Deep linking and navigation (Table of Contents, Step-to-Step jumps).
    - Native VS Code theme integration.

## [0.0.1]

- Initial release
