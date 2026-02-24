# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- Extension source: `camelCase` with `.ts` extension (e.g., `arazzo-detection.ts`, `parse-cache.ts`, `symbol-provider.ts`)
- Test files: `*.test.ts` suffix (e.g., `extension.test.ts`, `validation.test.ts`)
- React components: PascalCase with `.tsx` extension (e.g., `UnifiedDocumentationView.tsx`, `FlowchartView.tsx`)
- Utility/type files: `camelCase.ts` (e.g., `helpers.ts`, `webview-html.ts`)

**Functions:**
- camelCase for all functions (enforced by ESLint `@typescript-eslint/naming-convention`)
- Public static methods follow camelCase (e.g., `createOrShow()`, `updateFromCache()`, `provideDocumentSymbols()`)
- Private methods prefixed with underscore: `_update()`, `_updateSpec()`, `_disposables`

**Variables:**
- camelCase throughout (enforced by ESLint)
- Constants in camelCase, not UPPER_CASE (e.g., `KNOWN_ARAZZO_VERSIONS`, `ROOT_KEYS`)
- Type discriminator fields: lowercase with hyphens (e.g., `'arazzo-version'`, `'arazzo-mutual-exclusive'`)

**Types:**
- Type aliases: PascalCase (e.g., `ParseCacheEntry`, `ArazzoContext`, `ArazzoSpec`)
- Interfaces: PascalCase without `I` prefix (e.g., `ParseCacheEntry`, `DocumentSymbolProvider`)
- Union types: explicit, descriptive names (e.g., `'root' | 'info' | 'sourceDescription' | 'workflow' | 'step'`)

## Code Style

**Formatting:**
- No explicit formatter configured (Prettier not in use)
- Tab size: 4 spaces for extension, 2 spaces for webview-ui (inferred from source)
- Line endings: LF
- Trailing commas: Used in all contexts

**Linting:**
- ESLint 9.39.1 with `typescript-eslint`
- Config file: `eslint.config.mjs` (flat config format)
- Key rules enabled:
  - `@typescript-eslint/naming-convention`: camelCase for imports
  - `curly`: Require curly braces around blocks (warn)
  - `eqeqeq`: Use strict equality (`===` not `==`) (warn)
  - `no-throw-literal`: Don't throw bare strings (warn)
  - `semi`: Require semicolons (warn)

**TypeScript:**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Target: ES2022 (extension), ES2020 (webview)
- Module: Node16 (extension), ESNext (webview)
- Source maps enabled in development, hidden in production
- Additional strictness flags commented but not enforced:
  - `noImplicitReturns` (not enforced)
  - `noFallthroughCasesInSwitch` (not enforced)
  - `noUnusedParameters` (not enforced in extension, enforced in webview)

## Import Organization

**Order (extension):**
1. VS Code API imports: `import * as vscode from 'vscode'`
2. Node stdlib: `import * as path from 'path'`
3. YAML library: `import { ... } from 'yaml'`
4. Local imports: relative paths or typed imports

**Order (webview-ui):**
1. React imports: `import { useState, useEffect } from 'react'`
2. Component imports: local components
3. Type imports: `import type { ... }` for type-only imports
4. Utility imports: helpers and hooks

**Path Aliases:**
- Webview-UI uses: `"@/*": ["./src/*"]` for `@/components`, `@/types`, `@/hooks`
- Extension: No path aliases configured

## Error Handling

**Patterns:**
- Try-catch blocks used in provider methods (e.g., `YamlDocumentSymbolProvider.provideDocumentSymbols()`)
- Errors logged with `console.error()` for unrecoverable issues
- Errors logged with `console.warn()` for recoverable issues (malformed YAML)
- Empty array returned on parse failure in providers instead of throwing
- Graceful degradation: if parsing fails, features degrade (no symbols, no validation)
- Range validation in symbol provider: check for NaN and negative ranges before creating vscode.Range objects

Example from `symbol-provider.ts`:
```typescript
try {
  const yamlDoc = parseDocument(text);
  if (yamlDoc.errors.length > 0) {
    console.warn(`Arazzo VSCode: ${yamlDoc.errors.length} YAML Syntax Errors found.`);
  }
  if (!yamlDoc.contents) {
    return [];
  }
  return this.parseNode(yamlDoc.contents, document);
} catch (e) {
  console.error('Arazzo VSCode: Error parsing YAML for symbols', e);
  return [];
}
```

## Logging

**Framework:** `console` API (no logging library)

**Patterns:**
- Extension activation: `console.log('Arazzo VSCode extension is active')`
- Errors: `console.error('Arazzo VSCode: ...', error)`
- Warnings: `console.warn('Arazzo VSCode: ...', context)`
- Prefix convention: "Arazzo VSCode:" for clarity in VS Code output
- React component warnings (webview): standard `console.warn()` without prefix

## Comments

**When to Comment:**
- JSDoc comments for exported functions and types (used in `arazzo-detection.ts`, `parse-cache.ts`)
- Inline comments explain non-obvious logic (e.g., YAML node range handling in symbol provider)
- TODO comments not observed in codebase

**JSDoc/TSDoc:**
- Standard JSDoc format with parameter/return descriptions
- Example from `arazzo-detection.ts`:
```typescript
/**
 * Check if a YAML document root contains an `arazzo` key,
 * indicating it is an Arazzo specification file.
 */
export function isArazzoDocument(root: unknown): boolean {
```

## Function Design

**Size:**
- Methods tend to be compact (10-50 lines)
- Validation functions modularized by concern (version check, required fields, mutual exclusivity, references)
- Recursive parsing for nested YAML structures in `symbol-provider.ts`

**Parameters:**
- Explicit parameter types (no implicit `any`)
- Optional parameters marked with `?` (e.g., `cache?: ParseCache`)
- Callbacks as function parameters: `(document) => void`
- Union types for discriminated messages: `type: 'ready' | 'update' | 'update-flowchart'`

**Return Values:**
- Validation functions return `void`, accumulate diagnostics via mutation
- Providers return array or undefined: `vscode.ProviderResult<vscode.CompletionItem[]>`
- Cache getter returns typed `ParseCacheEntry` object
- Memoization used in React components: `useMemo(() => filteredData, [spec.workflows])`

## Module Design

**Exports:**
- Named exports for most utilities and providers
- Single default export in React components (`export default UnifiedDocumentationView`)
- Index barrel files in validation: `export { validateArazzo, validateStep, ... } from './required-fields'`

**Barrel Files:**
- `src/validation/index.ts` exports all validation functions from submodules
- Allows clean import: `import { validateArazzo, validateMutualExclusivity } from './validation/index'`

## Class Design

**Patterns:**
- Private fields use underscore prefix: `private _panel: vscode.WebviewPanel`
- Static methods for factory patterns: `ArazzoPreviewPanel.createOrShow()`
- Static collections for state management: `public static panels: Map<string, ArazzoPreviewPanel>`
- Implementation of VS Code provider interfaces via `implements vscode.DocumentSymbolProvider`

**Example (preview-panel.ts):**
```typescript
export class ArazzoPreviewPanel {
    public static panels: Map<string, ArazzoPreviewPanel> = new Map();
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        // ...
    }

    public static createOrShow(extensionUri: vscode.Uri, resourceUri: vscode.Uri) {
        // ...
    }
}
```

## React Component Patterns (Webview-UI)

**Functional Components:**
- Hooks-based (React 18): `useState`, `useEffect`, `useMemo`
- Props fully typed with interfaces: `interface UnifiedDocumentationViewProps { ... }`
- Memoization for expensive computations: `const displayedWorkflows = useMemo(() => {...}, [dependencies])`

**Styling:**
- Tailwind CSS classes directly in JSX
- Dark mode variant: `className={theme.text}` using utility hooks
- Theme detection: `document.body.classList.contains('vscode-dark')`
- Custom theme utilities in `useThemeClasses` hook

Example:
```typescript
const theme = getThemeClasses(isDark);
return <div className={`max-w-5xl mx-auto space-y-12 pb-20 ${theme.text}`}>
```

**Message Protocol:**
- VS Code webview communication via `postMessage` with typed message objects
- Message types: `'ready'`, `'update'`, `'update-flowchart'`, `'select-workflow'`, `'scroll-to-step'`
- Extension listening: `window.addEventListener('message', handleMessage)`

---

*Convention analysis: 2026-02-24*
