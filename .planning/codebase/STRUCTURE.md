# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
arazzo-vscode/
├── src/                        # Extension Host (Node.js runtime)
│   ├── extension.ts            # Main extension entry point (~90 lines)
│   ├── arazzo-detection.ts     # Arazzo document detection and workflow tracking
│   ├── parse-cache.ts          # In-memory YAML parse cache per URI
│   ├── panels/                 # Webview panel managers
│   │   ├── preview-panel.ts    # Documentation/spec preview panel
│   │   ├── flowchart-panel.ts  # Workflow flowchart visualization panel
│   │   └── webview-html.ts     # HTML template generation with CSP headers
│   ├── providers/              # VS Code language service providers
│   │   ├── symbol-provider.ts  # Document outline (Breadcrumb, Go to Symbol)
│   │   └── completion-provider.ts  # YAML key/value completion
│   ├── validation/             # Real-time spec validation rules
│   │   ├── index.ts            # Validation orchestrator
│   │   ├── version-check.ts    # Arazzo version validation (1.0.0, 1.0.1)
│   │   ├── required-fields.ts  # Required field checks per spec level
│   │   ├── mutual-exclusivity.ts # Mutually exclusive field validation
│   │   └── references.ts       # Reference, sourceType, and duplicate step ID checks
│   └── test/                   # VS Code integration tests
│       ├── extension.test.ts   # Core extension functionality tests
│       ├── validation.test.ts  # Validation rules tests
│       ├── completion.test.ts  # Completion provider tests
│       ├── detection.test.ts   # Arazzo detection tests
│       ├── helpers.ts          # Test fixtures and utilities
│       └── fixtures/           # YAML test files
│
├── webview-ui/                 # Webview UI (React + Vite, browser runtime)
│   ├── src/
│   │   ├── main.tsx            # React entry point (mounts App to root)
│   │   ├── App.tsx             # Message listener and view controller
│   │   ├── types/
│   │   │   └── arazzo.ts       # Complete TypeScript types for Arazzo spec
│   │   ├── components/
│   │   │   ├── UnifiedDocumentationView.tsx  # Full spec documentation renderer
│   │   │   ├── FlowchartView.tsx  # Workflow flowchart view dispatcher
│   │   │   ├── MermaidDiagram.tsx # Mermaid.js flowchart rendering
│   │   │   ├── DetailViews.tsx  # Step/workflow detail drawer content
│   │   │   ├── DetailDrawer.tsx # Drawer container for detail views
│   │   │   ├── ActionFormEditor.tsx  # Action definition form
│   │   │   ├── WorkflowInputsEditor.tsx  # Workflow input schema editor
│   │   │   ├── ExpressionInput.tsx  # Runtime expression editor
│   │   │   ├── StepCard.tsx    # Step display card
│   │   │   ├── SchemaEditor.tsx # JSON schema editor (minimal)
│   │   │   ├── arazzo/         # Arazzo-specific components
│   │   │   │   ├── ArazzoSpecHeader.tsx  # Title, version, description
│   │   │   │   ├── WorkflowList.tsx  # Workflow selector list
│   │   │   │   ├── WorkflowHeader.tsx  # Workflow title and metadata
│   │   │   │   ├── WorkflowBody.tsx  # Workflow inputs/steps/outputs
│   │   │   │   ├── StepHeader.tsx  # Step operation ID and description
│   │   │   │   ├── StepBody.tsx  # Step details (parameters, requestBody, criteria)
│   │   │   │   ├── SourceDescriptionsList.tsx  # Source descriptions table
│   │   │   │   ├── DependsOnList.tsx  # Workflow dependencies
│   │   │   │   ├── ActionList.tsx  # Success/failure actions list
│   │   │   │   ├── PayloadReplacements.tsx  # Request/response payload display
│   │   │   │   ├── CriterionBadge.tsx  # Success criterion badge
│   │   │   │   ├── ReusableRef.tsx  # $ref component link display
│   │   │   │   ├── SchemaViewer.tsx  # JSON schema property viewer
│   │   │   │   └── index.ts    # Barrel export
│   │   │   └── primitives/     # Reusable UI primitives
│   │   │       ├── Card.tsx, ContentCard.tsx  # Card containers
│   │   │       ├── Badge.tsx   # Small label badges
│   │   │       ├── CodeBlock.tsx  # Code display with copy
│   │   │       ├── CollapsibleSection.tsx  # Collapsible content
│   │   │       ├── Expandable.tsx  # Expandable detail
│   │   │       ├── PropertyList.tsx  # Key-value pair display
│   │   │       ├── MarkdownText.tsx  # CommonMark renderer
│   │   │       ├── EditableField.tsx  # Inline text editing
│   │   │       ├── EditableListItem.tsx  # List item with edit/delete
│   │   │       ├── CopyButton.tsx  # Copy-to-clipboard button
│   │   │       ├── SectionHeader.tsx  # Section title styling
│   │   │       ├── PageContainer.tsx  # Scrollable content wrapper
│   │   │       └── index.ts    # Barrel export
│   │   ├── lib/
│   │   │   ├── mermaid-converter.ts  # Workflow → Mermaid DSL conversion
│   │   │   └── arazzo-utils.ts  # Utility functions for Arazzo spec navigation
│   │   ├── hooks/
│   │   │   └── useThemeClasses.ts  # VS Code theme detection hook
│   │   └── index.html          # HTML template (Vite entry point)
│   ├── build/                  # Build output (generated by Vite, committed for distribution)
│   │   ├── index.html          # Entry HTML (rewritten by webview-html.ts)
│   │   └── assets/             # JavaScript, CSS, fonts
│   ├── package.json            # Vite + React + Tailwind dependencies
│   ├── vite.config.ts          # Vite build configuration
│   ├── tsconfig.json           # TypeScript config (ES2020 target, @alias)
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── postcss.config.js       # PostCSS for Tailwind processing
│
├── dist/                       # Extension output (generated by webpack)
│   └── extension.js            # Bundled extension host
│
├── out/                        # Compiled test output (generated by tsc)
│
├── .vscode/                    # VS Code workspace settings
├── .vscode-test/               # Test runner environment cache
├── images/                     # Extension icon and screenshots
├── specs/                      # Arazzo spec examples and references
├── .planning/                  # GSD planning documents
│
├── webpack.config.js           # Extension bundler config (Node16 module, ES2022 target)
├── tsconfig.json               # Extension TypeScript config (strict mode)
├── package.json                # Extension dependencies and scripts
├── eslint.config.mjs           # ESLint rules
├── language-configuration.json # VS Code language configuration for YAML
├── .vscodeignore                # Packager ignore patterns
├── .gitignore                  # Git ignore patterns
├── CHANGELOG.md                # Version history
├── CONTRIBUTING.md             # Development guide
├── README.md                   # User documentation
└── CLAUDE.md                   # Development instructions
```

## Directory Purposes

**`src/`:**
- Purpose: Extension Host implementation (runs in Node.js context)
- Contains: TypeScript source for all VS Code API integration, file parsing, validation
- Key files: `extension.ts` (main), `arazzo-detection.ts`, `parse-cache.ts`

**`src/panels/`:**
- Purpose: Webview panel lifecycle and message routing
- Contains: Panel managers with message handlers and HTML generation
- Key files: `preview-panel.ts`, `flowchart-panel.ts`, `webview-html.ts`

**`src/providers/`:**
- Purpose: VS Code language service providers
- Contains: Symbol provider for outline/breadcrumbs, completion provider for YAML suggestions
- Key files: `symbol-provider.ts` (~150 lines), `completion-provider.ts` (~200 lines)

**`src/validation/`:**
- Purpose: Real-time Arazzo spec validation rules
- Contains: Version checks, required fields, mutual exclusivity, reference validation
- Key files: `index.ts` (orchestrator), plus specialized validators

**`src/test/`:**
- Purpose: VS Code integration tests using `@vscode/test-electron`
- Contains: Test fixtures (YAML files), test helpers, test suites
- Key files: `extension.test.ts`, `validation.test.ts`, `completion.test.ts`, `detection.test.ts`

**`webview-ui/src/`:**
- Purpose: React-based webview UI (runs in browser context within VS Code panel)
- Contains: React components, type definitions, utilities, hooks
- Key files: `App.tsx` (message listener), `main.tsx` (React mount), `types/arazzo.ts` (types)

**`webview-ui/src/components/`:**
- Purpose: UI component library for spec documentation and flowchart visualization
- Contains: 11 main feature components, 14+ Arazzo-specific components, 13+ primitive components
- Organization:
  - Top-level: Page-level views (UnifiedDocumentationView, FlowchartView)
  - `arazzo/`: Spec-aware components for rendering Arazzo objects
  - `primitives/`: Reusable styled components (Card, Badge, etc.)

**`webview-ui/src/lib/`:**
- Purpose: Utility functions and converters
- Contains: Mermaid DSL generation, Arazzo spec navigation helpers
- Key files: `mermaid-converter.ts` (workflow → flowchart), `arazzo-utils.ts`

**`webview-ui/src/hooks/`:**
- Purpose: React hooks for cross-cutting concerns
- Contains: Theme detection hook for VS Code dark/light/high-contrast mode
- Key files: `useThemeClasses.ts`

**`webview-ui/build/`:**
- Purpose: Vite build output for webview (static assets)
- Contains: Pre-built HTML, JavaScript bundles, CSS, fonts
- Note: Generated by `npm run build`, committed to repo for distribution

**`dist/`:**
- Purpose: Webpack output for extension host
- Contains: Single bundled file `extension.js` with all node_modules bundled
- Generated: By `npm run compile` or `npm run package`

**`out/`:**
- Purpose: TypeScript compilation output for tests
- Contains: `.js` files compiled from `src/**/*.ts`
- Generated: By `tsc` via `npm run compile-tests`

## Key File Locations

**Entry Points:**
- `src/extension.ts`: Extension activation function called by VS Code
- `webview-ui/src/main.tsx`: React app mount (runs inside webview panel)
- `webview-ui/src/App.tsx`: Message listener and view router

**Configuration:**
- `package.json`: Extension manifest (commands, activation events, dependencies)
- `webpack.config.js`: Extension bundler (ts-loader, externals)
- `webview-ui/vite.config.ts`: Webview bundler (React plugin, build output)
- `tsconfig.json`: Extension TypeScript (Node16 module, ES2022 target, strict: true)
- `webview-ui/tsconfig.json`: Webview TypeScript (ES2020 target, DOM lib)
- `language-configuration.json`: YAML syntax highlighting config for VS Code

**Core Logic:**
- `src/arazzo-detection.ts`: Document type detection, version checking
- `src/parse-cache.ts`: YAML parsing cache implementation
- `src/validation/index.ts`: Validation chain orchestrator
- `webview-ui/src/types/arazzo.ts`: Complete Arazzo spec type definitions (~500+ lines)
- `webview-ui/src/lib/mermaid-converter.ts`: Workflow → Mermaid flowchart DSL

**Testing:**
- `src/test/extension.test.ts`: Core extension tests
- `src/test/validation.test.ts`: Validation rule tests
- `src/test/completion.test.ts`: Completion provider tests
- `src/test/detection.test.ts`: Arazzo detection tests
- `src/test/helpers.ts`: Test utilities and fixture loading
- `src/test/fixtures/`: YAML test files (valid/invalid Arazzo specs)

## Naming Conventions

**Files:**
- Component files: `PascalCase.tsx` (React) or `PascalCase.ts` (Classes)
- Utility files: `kebab-case.ts` (functions/utilities)
- Test files: `feature.test.ts` (test file pattern)
- Config files: `lowercase.config.js` or `tsconfig.json`

**Directories:**
- Feature directories: `lowercase/` (src/validation, src/providers, src/panels, webview-ui/src/lib)
- Component directories: `lowercase/` (src/components, webview-ui/src/components)
- Type directories: `types/` (webview-ui/src/types)
- Test directories: `test/` (src/test)

**React Components:**
- Named exports: `export function ComponentName()` and `export default ComponentName`
- Hooks: `useHookName()` in `webview-ui/src/hooks/`
- Primitives: Located in `webview-ui/src/components/primitives/`

**Functions and Variables:**
- camelCase for functions: `getHtmlForWebview()`, `detectAndSelectWorkflow()`
- camelCase for variables: `const cache = new ParseCache()`
- CONSTANTS: `KNOWN_ARAZZO_VERSIONS` (seen in arazzo-detection.ts)
- Private members: `_panel`, `_extensionUri` (leading underscore in classes)

## Where to Add New Code

**New Feature (e.g., new validation rule):**
- Implementation: `src/validation/feature-name.ts`
- Export: Add to `src/validation/index.ts` export statement
- Integration: Call from `runValidation()` in `src/validation/index.ts`
- Tests: Add to `src/test/validation.test.ts` with fixtures in `src/test/fixtures/`

**New UI Component:**
- Arazzo-aware component: `webview-ui/src/components/arazzo/ComponentName.tsx`
- Primitive/reusable: `webview-ui/src/components/primitives/ComponentName.tsx`
- Page-level view: `webview-ui/src/components/ComponentName.tsx` (sibling to UnifiedDocumentationView)
- Export: Add to `webview-ui/src/components/arazzo/index.ts` or `primitives/index.ts`
- Usage: Import from barrel file or direct path

**New Language Provider:**
- Implementation: `src/providers/feature-provider.ts`
- Registration: In `src/extension.ts` activate() function via `vscode.languages.register*Provider()`
- Tests: Add to `src/test/extension.test.ts`

**New Utility:**
- Extension utilities: `src/utils/utility-name.ts` or add to existing module
- Webview utilities: `webview-ui/src/lib/utility-name.ts`
- Arazzo spec helpers: `webview-ui/src/lib/arazzo-utils.ts`

**New Test:**
- Add to appropriate test file: `src/test/feature.test.ts`
- Fixtures: Add YAML files to `src/test/fixtures/`
- Helpers: Update `src/test/helpers.ts` if new utilities needed

## Special Directories

**`webview-ui/build/`:**
- Purpose: Pre-built static assets for webview distribution
- Generated: By `cd webview-ui && npm run build`
- Committed: Yes - required for extension distribution in marketplace
- Contents: index.html with rewritten asset paths, assets/ folder with JS/CSS/fonts

**`dist/`:**
- Purpose: Bundled extension host for distribution
- Generated: By `npm run compile` (dev) or `npm run package` (production)
- Committed: No - regenerated for each build
- Input: `src/` TypeScript, output: single `extension.js` file

**`out/`:**
- Purpose: Test compilation output
- Generated: By `npm run compile-tests` (tsc compilation)
- Committed: No - regenerated for testing
- Input: `src/test/` TypeScript, output: `out/test/` JavaScript

**`.vscode-test/`:**
- Purpose: VS Code runtime cache for test execution
- Generated: By `npm test` (downloads VS Code if needed)
- Committed: No - large, platform-specific binaries
- Used by: `@vscode/test-electron` test runner

---

*Structure analysis: 2026-02-24*
