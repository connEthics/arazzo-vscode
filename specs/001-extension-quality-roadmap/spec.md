# Feature Specification: Extension Quality Roadmap

**Feature Branch**: `001-extension-quality-roadmap`
**Created**: 2026-02-22
**Status**: Draft
**Input**: Roadmap from code review identifying critical and moderate issues across architecture, performance, security, validation, and testing.

## Clarifications

### Session 2026-02-22

- Q: How should the extension handle the `arazzo` version key value for detection and validation? → A: Detect on any `arazzo` key presence; warn on unrecognized versions but still validate/render.
- Q: What should be explicitly out of scope for this roadmap? → A: Remote URL resolution, multi-file workspace validation, Arazzo authoring wizards, and OpenAPI spec cross-referencing.
- Q: What measurable performance target should replace "no perceptible lag" in SC-005? → A: Diagnostics update within 500ms of last keystroke for files up to 1000 lines.
- Q: What should the webview error state look like when it receives invalid data? → A: Inline error banner with short message and Retry button; previous content is cleared.
- Q: How far should runtime expression completion support extend beyond `$steps.`? → A: `$steps.` with dynamic step ID lookup plus static keyword completions for all other Arazzo runtime expression prefixes.

## Out of Scope

The following are explicitly excluded from this roadmap:

- **Remote URL resolution**: The extension MUST NOT fetch or resolve URLs in `sourceDescriptions` or any other field at validation or editing time.
- **Multi-file workspace validation**: Validation operates on a single open document only; cross-file reference resolution is not supported.
- **Arazzo authoring wizards**: No guided creation flows, scaffolding commands, or template generators.
- **OpenAPI spec cross-referencing**: No validation of `operationId` or `operationPath` against referenced OpenAPI documents.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arazzo-only diagnostics (Priority: P1)

As a developer editing YAML files in VS Code, I want the Arazzo extension to only produce diagnostics on actual Arazzo specification files, so that my non-Arazzo YAML files (docker-compose, CI pipelines, Kubernetes manifests) remain free of irrelevant "Missing required field" errors.

**Why this priority**: This is the most impactful UX issue. Every YAML user sees false errors today, damaging trust and generating negative Marketplace reviews. Fixing this unblocks all other improvements.

**Independent Test**: Open a `docker-compose.yml` file and verify zero Arazzo diagnostics appear. Open a valid Arazzo file and verify diagnostics still fire correctly.

**Acceptance Scenarios**:

1. **Given** a YAML file without an `arazzo` key at document root, **When** the file is opened or edited, **Then** no Arazzo diagnostics appear
2. **Given** a YAML file with `arazzo: 1.0.1` at the root, **When** required fields are missing, **Then** appropriate "Missing required field" diagnostics appear
5. **Given** a YAML file with `arazzo: 2.0.0` (unrecognized version) at the root, **When** the file is opened, **Then** diagnostics activate AND a warning diagnostic reports the unrecognized version
3. **Given** a non-Arazzo YAML file is open, **When** the user runs an Arazzo command, **Then** a user-friendly message explains the file is not an Arazzo document

---

### User Story 2 - Modular codebase (Priority: P2)

As a contributor to the extension, I want the codebase split into focused modules instead of a single 749-line file, so that I can navigate, understand, and modify individual features without parsing the entire codebase.

**Why this priority**: The monolithic architecture blocks all further development. Every change (validation, completion, panels) requires understanding the entire file. Modularization enables parallel work on subsequent stories.

**Independent Test**: After refactoring, `npm run compile` and `npm test` pass with identical behavior. No file exceeds 300 lines. Each module has a single responsibility.

**Acceptance Scenarios**:

1. **Given** the refactored codebase, **When** `npm run compile` is run, **Then** it builds without errors
2. **Given** the refactored codebase, **When** `npm test` is run, **Then** all existing tests pass with identical results
3. **Given** the refactored codebase, **When** a contributor opens `src/extension.ts`, **Then** it contains only activation wiring and imports, under 80 lines
4. **Given** the webview HTML generation, **When** either panel creates a webview, **Then** both use the same shared function with zero duplication

---

### User Story 3 - Responsive editing performance (Priority: P2)

As a developer editing a large Arazzo file (500+ lines), I want the extension to respond smoothly without lag, so that my editing experience is not degraded by repeated YAML parsing.

**Why this priority**: Currently 4 full YAML parses occur per keystroke. On large files, this creates noticeable lag. Solving this requires a parsing cache and debounce, which also reduces resource consumption.

**Independent Test**: Edit a 1000-line Arazzo file with rapid typing and verify diagnostics update within 500ms of the last keystroke. Verify that YAML is parsed at most once per change event cycle.

**Acceptance Scenarios**:

1. **Given** a user types rapidly in a large Arazzo file, **When** change events fire, **Then** YAML parsing occurs at most once per debounce window (200-300ms)
2. **Given** a parsed YAML document is cached, **When** validation, preview update, flowchart update, and cursor detection all need the parsed result, **Then** they all consume the same cached instance
3. **Given** the document has not changed since last parse, **When** any component requests the parsed document, **Then** no re-parsing occurs

---

### User Story 4 - Hardened webview security (Priority: P2)

As a user opening untrusted Arazzo files, I want the webview to be protected against injection attacks via malicious `stepId`, `workflowId`, or `summary` fields, so that opening a malicious file cannot execute arbitrary JavaScript.

**Why this priority**: Security issues can result in extension removal from the Marketplace. The current `securityLevel: 'loose'` in Mermaid combined with `dangerouslySetInnerHTML` creates a real attack surface.

**Independent Test**: Create an Arazzo file with XSS payloads in `stepId` and `summary` fields. Open the flowchart view and verify no script execution occurs.

**Acceptance Scenarios**:

1. **Given** a Mermaid diagram is rendered, **When** the configuration is inspected, **Then** `securityLevel` is set to `'strict'` or `'sandbox'`
2. **Given** an Arazzo file with `stepId: "<script>alert(1)</script>"`, **When** the flowchart view renders, **Then** the script tag is sanitized and no JavaScript executes
3. **Given** the Content Security Policy, **When** inspected, **Then** it restricts scripts to nonce-based execution only

---

### User Story 5 - Comprehensive validation (Priority: P3)

As an Arazzo specification author, I want the extension to validate beyond required-field presence, so that I catch referencing errors, mutual exclusivity violations, and expression syntax issues before running my workflows.

**Why this priority**: Deeper validation is the main differentiator against generic YAML editors. This story delivers incremental value with each validation rule added.

**Independent Test**: Open Arazzo files with specific validation errors (invalid `dependsOn` references, multiple operation identifiers on one step, malformed Runtime Expressions) and verify appropriate diagnostics appear.

**Acceptance Scenarios**:

1. **Given** a step with both `operationId` and `operationPath`, **When** validated, **Then** a diagnostic reports mutual exclusivity violation
2. **Given** a workflow with `dependsOn: [nonExistentWorkflow]`, **When** validated, **Then** a diagnostic reports the unknown workflow reference
3. **Given** a `sourceDescriptions` entry with `type: "invalid"`, **When** validated, **Then** a diagnostic reports the invalid type value (must be "openapi" or "arazzo")
4. **Given** a step with no `operationId`, `operationPath`, or `workflowId`, **When** validated, **Then** a diagnostic reports that one is required

---

### User Story 6 - Context-aware completions (Priority: P3)

As an Arazzo specification author, I want the extension to suggest Arazzo-specific keys and values as I type, so that I can author workflows faster and with fewer errors.

**Why this priority**: Completions are a key IDE feature that drives adoption. The current provider only suggests `true`/`false`/`null`, which provides no Arazzo-specific value.

**Independent Test**: In an Arazzo file, type under `workflows:` and verify Arazzo keys like `workflowId`, `steps`, `summary` are suggested. After `type: `, verify `openapi` and `arazzo` appear.

**Acceptance Scenarios**:

1. **Given** the cursor is inside a `sourceDescriptions` item after a key trigger, **When** completion is invoked, **Then** Arazzo keys (`name`, `url`, `type`, `description`) are suggested
2. **Given** the cursor is after `type: ` inside a `sourceDescriptions` item, **When** completion is invoked, **Then** `openapi` and `arazzo` are suggested
3. **Given** the cursor is inside a `steps` item, **When** completion is invoked, **Then** step-specific keys (`stepId`, `operationId`, `operationPath`, `workflowId`, `parameters`, `successCriteria`, `onSuccess`, `onFailure`) are suggested
4. **Given** the user types `$steps.`, **When** completion is invoked, **Then** existing step IDs from the current workflow are suggested
5. **Given** the user types `$` in a value position, **When** completion is invoked, **Then** all Arazzo runtime expression prefixes (`$url`, `$method`, `$statusCode`, `$request.`, `$response.`, `$inputs.`, `$outputs.`, `$steps.`, `$sourceDescriptions.`, `$workflows.`) are suggested as static keywords

---

### User Story 7 - Robust test suite (Priority: P3)

As a contributor, I want a comprehensive test suite covering validation rules, mermaid conversion, and cursor-based workflow detection, so that regressions are caught automatically.

**Why this priority**: With only 3 tests today, any refactoring or feature addition risks silent regressions. This story builds confidence for all other stories.

**Independent Test**: Run `npm test` and verify all test suites pass. Verify test count exceeds 20 covering validation, symbol provider, and mermaid converter.

**Acceptance Scenarios**:

1. **Given** the test suite, **When** `npm test` is run, **Then** all tests pass without `setTimeout`-based synchronization
2. **Given** the mermaid converter, **When** tested with various workflow structures (sequential, branching, error flows), **Then** it produces valid Mermaid syntax
3. **Given** the Arazzo validator, **When** tested with each validation rule, **Then** each rule has at least one positive and one negative test case
4. **Given** cursor-based workflow detection, **When** tested with cursor at various positions, **Then** the correct workflow is identified

---

### Edge Cases

- What happens when an Arazzo file has YAML syntax errors? Validation MUST still report YAML errors without crashing.
- What happens when `sourceDescriptions` references an unreachable URL? The extension MUST NOT attempt to fetch URLs at validation time (that is a future feature).
- What happens when a file transitions from non-Arazzo YAML to Arazzo (user adds `arazzo:` key)? Diagnostics MUST activate dynamically on the next change event.
- What happens when the webview receives invalid JSON from the extension? The webview MUST clear previous content and display an inline error banner with a short message (e.g., "Failed to load document data") and a Retry button that re-requests data from the extension.
- What happens when two steps in the same workflow share the same `stepId`? A diagnostic MUST report the duplicate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST detect Arazzo files by checking for the presence of the `arazzo` key at document root (any value) before producing diagnostics or completions. For unrecognized version values (not `1.0.0` or `1.0.1`), the extension MUST emit a warning diagnostic but still activate all features
- **FR-002**: Extension MUST parse each YAML document at most once per change event, using a shared cached parse result
- **FR-003**: Extension MUST apply a debounce (200-300ms) on text change events before triggering parsing
- **FR-004**: Extension MUST split `src/extension.ts` into modules where no single file exceeds 300 lines
- **FR-005**: Webview HTML generation MUST use a single shared function for both preview and flowchart panels
- **FR-006**: Mermaid MUST be configured with `securityLevel: 'strict'` or `'sandbox'`
- **FR-007**: Extension MUST validate mutual exclusivity of `operationId`, `operationPath`, and `workflowId` on steps
- **FR-008**: Extension MUST validate that `dependsOn` references point to existing workflow IDs
- **FR-009**: Completion provider MUST suggest context-appropriate Arazzo keys based on cursor position in the YAML structure
- **FR-010**: Completion provider MUST suggest Arazzo-specific values (`openapi`/`arazzo` for `type` field) and runtime expression prefixes (`$url`, `$method`, `$statusCode`, `$request.`, `$response.`, `$inputs.`, `$outputs.`, `$steps.`, `$sourceDescriptions.`, `$workflows.`) as static keyword completions, with `$steps.` additionally resolving dynamic step IDs from the current workflow
- **FR-011**: All `@ts-ignore` and untyped `any` casts MUST be eliminated or justified with a comment and tracking issue
- **FR-012**: The `helloWorld` command MUST be removed from `package.json`
- **FR-013**: Test suite MUST NOT use fixed `setTimeout` for synchronization; use conditional waiting
- **FR-014**: Test suite MUST cover validation rules, mermaid converter, and workflow detection with 20+ test cases

### Key Entities

- **ArazzoDocument**: A parsed YAML document identified as Arazzo by the presence of the `arazzo` root key. Central entity consumed by validation, preview, and flowchart generation.
- **ValidationRule**: A discrete check applied to an ArazzoDocument (required fields, mutual exclusivity, reference resolution, expression syntax).
- **ParseCache**: An in-memory store mapping document URIs to their most recent parse result, invalidated on document change events.
- **CompletionContext**: The cursor position within the YAML hierarchy, used to determine which Arazzo keys and values to suggest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero Arazzo diagnostics appear on non-Arazzo YAML files (100% precision)
- **SC-002**: All valid Arazzo files that currently validate correctly continue to do so (zero regressions)
- **SC-003**: No source file in `src/` exceeds 300 lines of code
- **SC-004**: YAML parsing occurs at most once per change event cycle (verifiable via logging or instrumentation)
- **SC-005**: Diagnostics update within 500ms of last keystroke for Arazzo files up to 1000 lines
- **SC-006**: XSS payloads in Arazzo fields (`stepId`, `workflowId`, `summary`) do not execute in the webview
- **SC-007**: Test suite passes with 20+ test cases covering all validation rules, mermaid converter, and workflow detection
- **SC-008**: `npm run compile`, `npm run lint`, and `npm test` all pass on the refactored codebase
