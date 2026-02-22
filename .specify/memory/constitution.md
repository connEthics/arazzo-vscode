<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0
  Added sections: Core Principles (5), Extension Quality Standards, Development Workflow, Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (Constitution Check section aligns)
    - .specify/templates/spec-template.md ✅ compatible (user stories structure aligns)
    - .specify/templates/tasks-template.md ✅ compatible (phase structure aligns)
  Follow-up TODOs: None
-->

# Arazzo VS Code Extension Constitution

## Core Principles

### I. Arazzo Spec Fidelity

All features MUST faithfully implement the Arazzo 1.0.1 specification (https://spec.openapis.org/arazzo/latest.html). TypeScript types in `webview-ui/src/types/arazzo.ts` serve as the canonical type source and MUST stay synchronized with the official spec. Any deviation from the spec MUST be explicitly documented as an extension (`x-` prefix) or flagged as a known limitation. Validation logic MUST NOT produce false positives on valid Arazzo documents nor miss required-field violations defined in the spec.

### II. Arazzo-Only Activation

The extension MUST NOT interfere with non-Arazzo YAML files. All diagnostics, completions, and symbol providers MUST verify the presence of the `arazzo` key at the document root before engaging. Users of `docker-compose.yml`, GitHub Actions, Kubernetes manifests, or any other YAML format MUST NOT see Arazzo-specific errors or completions. This principle is non-negotiable as it directly impacts user trust and extension reviews on the Marketplace.

### III. Modular Architecture

No single source file MUST exceed 300 lines of meaningful code. The extension host code MUST be decomposed into focused modules: panels, providers, validation, and utilities. Shared logic (HTML generation, YAML parsing cache) MUST be factored into reusable functions, not duplicated across classes. The webview MUST remain a self-contained React application with clear component boundaries (domain components in `arazzo/`, primitives in `primitives/`).

### IV. Performance by Design

YAML parsing is the critical path. The extension MUST parse each document at most once per change event, using a shared cache invalidated on document change. All change-event handlers (validation, preview update, flowchart update, cursor detection) MUST consume the cached parse result. A debounce of 200-300ms MUST be applied on `onDidChangeTextDocument` to prevent excessive re-parsing during rapid typing. The webview MUST memoize expensive renders (Mermaid diagram generation, documentation tree).

### V. Security-First Webview

The webview runs untrusted content (user-authored YAML rendered as HTML/SVG). Mermaid MUST be configured with `securityLevel: 'strict'` or `'sandbox'`, never `'loose'`. The Content Security Policy MUST restrict script sources to nonce-based execution. SVG content rendered via `dangerouslySetInnerHTML` MUST be treated as a known risk area and sanitized when Mermaid produces output from user-controlled labels (`stepId`, `workflowId`, `summary`).

## Extension Quality Standards

- **TypeScript strict mode**: MUST remain enabled. No `@ts-ignore` or `any` casts unless a comment explains why the type system cannot express the constraint and links to a tracking issue.
- **Testing**: Every new validator rule MUST have a corresponding test case. Webview components MUST have at minimum smoke tests. Integration tests MUST NOT rely on fixed `setTimeout` delays; use conditional waiting or VS Code test utilities.
- **Completion provider**: MUST provide context-aware completions for Arazzo-specific keys, not generic YAML keywords only.
- **Marketplace hygiene**: No scaffold/debug commands (`helloWorld`) in the published manifest. Commands MUST have meaningful titles and icons.

## Development Workflow

- **Build pipeline**: Extension is bundled via webpack (`dist/extension.js`). Webview is built via Vite (`webview-ui/build/`). Both MUST build successfully before any commit.
- **Webview rebuild**: After any change in `webview-ui/`, the webview MUST be rebuilt (`cd webview-ui && npm run build`) before testing in VS Code.
- **Branch strategy**: Feature branches off `main`. PRs MUST pass `npm run lint` and `npm test`.
- **Spec alignment**: When the Arazzo specification publishes a new version, a tracking issue MUST be created to evaluate type and validation updates within 30 days.

## Governance

This constitution supersedes conflicting guidance in README, CONTRIBUTING, or inline comments. Amendments require:

1. A documented rationale in the PR description.
2. Review by at least one maintainer.
3. Version bump of this constitution (MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications).
4. Update of dependent templates (plan, spec, tasks) if affected.

Compliance is verified during code review. Any complexity or deviation from these principles MUST be justified in the PR and tracked.

**Version**: 1.0.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22
