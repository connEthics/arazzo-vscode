# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Runner:**
- `@vscode/test-cli` v0.0.12 with `@vscode/test-electron` v2.5.2
- Config: Configured via package.json scripts, no separate test config file
- Test compilation: TypeScript → `out/` directory via `tsc -p . --outDir out`

**Assertion Library:**
- Node.js built-in `assert` module (no external assertion library)
- Usage: `assert.strictEqual()`, `assert.ok()`, `assert.throws()`, etc.

**Run Commands:**
```bash
npm run compile-tests      # Compile TS test files to out/
npm run watch-tests        # Watch mode for test compilation
npm test                   # Run VS Code integration tests via @vscode/test-cli
npm run pretest            # Compile tests + compile extension + lint (runs before test)
```

## Test File Organization

**Location:**
- Co-located with source: `src/test/` directory
- Test files: `src/test/*.test.ts`
- Fixtures: `src/test/fixtures/` for test YAML files

**Naming:**
- Test files: `*.test.ts` suffix
  - `extension.test.ts` - Main extension functionality
  - `validation.test.ts` - Validation rules
  - `completion.test.ts` - Completion provider
  - `detection.test.ts` - Arazzo detection logic
- Fixture files: `*.arazzo.yaml` or `.yaml`
  - `invalid-mutual-exclusivity.arazzo.yaml`
  - `invalid-references.arazzo.yaml`
  - `non-arazzo.yaml`
  - `duplicate-stepid.arazzo.yaml`

**Structure:**
```
src/test/
├── extension.test.ts       # Integration tests (144 lines)
├── validation.test.ts      # Validation rule tests (239 lines)
├── completion.test.ts      # Completion provider tests (167 lines)
├── detection.test.ts       # Detection logic tests (109 lines)
├── helpers.ts              # Shared test utilities
└── fixtures/
    ├── invalid-mutual-exclusivity.arazzo.yaml
    ├── invalid-references.arazzo.yaml
    ├── non-arazzo.yaml
    ├── duplicate-stepid.arazzo.yaml
    └── unknown-version.arazzo.yaml
```

## Test Structure

**Suite Organization:**
```typescript
suite('Arazzo Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Valid Arazzo file should have no errors', async () => {
    // Arrange: Create test document
    const content = `...`;
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'yaml'
    });

    // Act & Assert: Wait for async diagnostics, then verify
    await waitFor(() => {
      const diagnostics = vscode.languages.getDiagnostics(doc.uri);
      return diagnostics.length === 0;
    });

    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    assert.strictEqual(diagnostics.length, 0);
  });
});
```

**Patterns:**
- `suite()` wraps test group with description
- `test()` defines individual test case
- All tests are `async` due to VS Code extension async nature
- Setup happens inline in test (no beforeEach/afterEach used)
- Teardown: VS Code handles cleanup automatically for in-memory documents

## Async Testing

**Pattern:**
```typescript
const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

await waitFor(() => {
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  return diagnostics.length === 0;
});

const diagnostics = vscode.languages.getDiagnostics(doc.uri);
assert.strictEqual(diagnostics.length, 0);
```

**Key points:**
- `await` all document creation and command execution
- Use `waitFor()` helper to poll for async results (diagnostics, symbols) instead of fixed `setTimeout()`
- Default timeout: 5000ms, polling interval: 50ms

**Implementation of `waitFor()` helper (helpers.ts):**
```typescript
export async function waitFor(
    predicate: () => boolean,
    timeoutMs = 5000,
    intervalMs = 50
): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error(`waitFor timed out after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}
```

## Fixture Files

**Test Data:**
- Real Arazzo YAML files in `src/test/fixtures/`
- Used for negative tests (files with known issues)

**Fixture Examples:**

`invalid-mutual-exclusivity.arazzo.yaml`: Step with both `operationId` and `operationPath` (invalid)

`invalid-references.arazzo.yaml`: Missing workflow references, invalid source types

`duplicate-stepid.arazzo.yaml`: Same `stepId` used twice in different steps

`non-arazzo.yaml`: Valid YAML but not Arazzo (no `arazzo` key)

`unknown-version.arazzo.yaml`: Arazzo file with unrecognized version

**Usage Pattern:**
```typescript
test('Mutual exclusivity: step with operationId and operationPath should produce error', async () => {
  const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-mutual-exclusivity.arazzo.yaml');
  const doc = await vscode.workspace.openTextDocument(fixturePath);

  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    return diagnostics.some(d => d.code === 'arazzo-mutual-exclusive');
  });

  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  const mutualExcl = diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive');
  assert.ok(mutualExcl.length > 0, 'Should find mutual-exclusive error');
});
```

## Test Types

**Unit Tests (detection.test.ts):**
- Pure function testing without VS Code extension context
- No async operations
- Direct function calls: `isArazzoDocument()`, `getArazzoVersion()`, `isKnownArazzoVersion()`
- Example:
```typescript
test('isArazzoDocument returns true for Arazzo file', () => {
  const doc = parseDocument('arazzo: "1.0.1"\ninfo:\n  title: Test\n');
  assert.ok(doc.contents && isMap(doc.contents));
  assert.strictEqual(isArazzoDocument(doc.contents), true);
});
```

**Integration Tests (extension.test.ts, validation.test.ts, completion.test.ts):**
- Full VS Code extension activation context
- Tests providers (symbol, completion)
- Tests diagnostics collection
- Tests YAML parsing + validation pipeline
- Example:
```typescript
test('Valid Arazzo file should have no errors', async () => {
  const content = `arazzo: 1.0.1\n...`;
  const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    return diagnostics.length === 0;
  });
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  assert.strictEqual(diagnostics.length, 0);
});
```

**Negative Tests (validation.test.ts):**
- Verify error detection for invalid specs
- Check error messages and severity levels
- Example:
```typescript
test('Operation required: step with none of operationId/operationPath/workflowId should produce error', async () => {
  const content = `arazzo: 1.0.1\n... steps:\n  - stepId: emptyStep`;
  const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    return diagnostics.some(d => d.code === 'arazzo-operation-required');
  });
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  const opRequired = diagnostics.filter(d => d.code === 'arazzo-operation-required');
  assert.ok(opRequired.length > 0, 'Should find operation-required error');
});
```

## Validation Rule Testing

**Pattern:**
- Each validation rule has dedicated tests in `validation.test.ts`
- Tests verify both success (no errors) and failure (expected errors) cases
- Diagnostic codes used as test anchors:
  - `'arazzo-version'` - Unknown Arazzo version
  - `'arazzo-mutual-exclusive'` - Step with both operationId and operationPath
  - `'arazzo-operation-required'` - Step missing operation specification
  - `'arazzo-ref-dependsOn'` - Invalid dependsOn workflow reference
  - `'arazzo-source-type'` - Invalid source type (not openapi or arazzo)
  - `'arazzo-duplicate-stepId'` - Duplicate step IDs in same workflow

**Structure:**
```typescript
// Success case
test('Valid source type openapi should not produce error', async () => {
  const content = `arazzo: 1.0.1\n...`;
  const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    return diagnostics.length === 0;
  });
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-source-type').length, 0);
});

// Failure case
test('Source type: invalid type should produce error', async () => {
  const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-references.arazzo.yaml');
  const doc = await vscode.workspace.openTextDocument(fixturePath);
  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    return diagnostics.some(d => d.code === 'arazzo-source-type');
  });
  const diagnostics = vscode.languages.getDiagnostics(doc.uri);
  const sourceTypeErrors = diagnostics.filter(d => d.code === 'arazzo-source-type');
  assert.ok(sourceTypeErrors.length > 0, 'Should find source-type error');
});
```

## Symbol Provider Testing

**Pattern:**
- Execute `vscode.executeDocumentSymbolProvider` command to test symbol generation
- Verify symbol hierarchy and metadata

**Example (extension.test.ts):**
```typescript
test('Outline should provide correct symbols', async () => {
  const content = `arazzo: 1.0.1\n...workflows:\n  - workflowId: myWorkflow\n    steps:\n      - stepId: myStep`;
  const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

  let symbols: vscode.DocumentSymbol[] | undefined;
  await waitFor(() => true, 1000);

  symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    doc.uri
  );

  assert.ok(symbols, 'Symbols should not be undefined');
  const workflowsSymbol = symbols.find(s => s.name === 'workflows');
  assert.ok(workflowsSymbol, 'Should find workflows symbol');
  assert.strictEqual(workflowsSymbol.kind, vscode.SymbolKind.Class);

  const myWorkflow = workflowsSymbol.children.find(s => s.name === 'myWorkflow');
  assert.ok(myWorkflow, 'Should find myWorkflow');
  assert.strictEqual(myWorkflow.detail, 'My Workflow Summary');
});
```

## Completion Provider Testing

**Pattern:**
- Execute `vscode.executeCompletionItemProvider` command
- Test context detection (root, step, source, etc.)
- Verify suggestion labels

**Example (completion.test.ts):**
```typescript
test('Root context should suggest Arazzo keys', async () => {
  const content = `arazzo: 1.0.1`;
  const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
  const editor = await vscode.window.showTextDocument(doc);

  const position = new vscode.Position(2, 0);
  const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    doc.uri,
    position
  );

  assert.ok(completions, 'Completions should not be undefined');
  const labels = completions.items.map(i => typeof i.label === 'string' ? i.label : i.label.label);
  assert.ok(labels.includes('info'), 'Should suggest "info"');
  assert.ok(labels.includes('workflows'), 'Should suggest "workflows"');
});
```

## Coverage

**Requirements:** No explicit coverage target enforced

**View Coverage:** No coverage command available

**Practical coverage:**
- Extension functionality: Covered via integration tests
- Validation rules: Each rule tested with positive and negative cases
- Completion: Context detection and suggestion logic tested
- Detection: Arazzo version and document detection tested

## Current Test Count

- **Total test files:** 4 (`extension.test.ts`, `validation.test.ts`, `completion.test.ts`, `detection.test.ts`)
- **Total lines:** ~660 lines of test code
- **Estimated test cases:** ~30+ individual tests across all suites

## Gaps

- No E2E tests for webview UI rendering
- No mocking of VS Code API (tests use real extension context)
- No performance/load tests
- Limited negative test coverage for edge cases in symbol provider range handling
- No tests for panel lifecycle (create, update, dispose)
- No tests for cache invalidation

---

*Testing analysis: 2026-02-24*
