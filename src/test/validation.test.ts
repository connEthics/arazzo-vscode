import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { waitFor, codeOf, withCode, errorsOf, describe, settledDiagnostics } from './helpers';

suite('Validation Rules', () => {

    test('Valid Arazzo file should have no mutual-exclusive or reference errors', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: testStep
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive').length, 0);
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-missing').length, 0);
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-workflow-depends-on-resolved').length, 0);
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-source-type-enum').length, 0);
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-step-id-unique').length, 0);
    });

    test('Mutual exclusivity: step with operationId and operationPath should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-mutual-exclusivity.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-step-target-exclusive');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const mutualExcl = diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive');
        assert.ok(mutualExcl.length > 0, 'Should find mutual-exclusive error');
        assert.strictEqual(mutualExcl[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Operation required: step with none of operationId/operationPath/workflowId should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: emptyStep
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-step-target-missing');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const opRequired = diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-missing');
        assert.ok(opRequired.length > 0, 'Should find operation-required error');
    });

    test('DependsOn reference: non-existent workflow should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-references.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-workflow-depends-on-resolved');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const refErrors = diagnostics.filter(d => codeOf(d) === 'arazzo-workflow-depends-on-resolved');
        assert.ok(refErrors.length > 0, 'Should find dependsOn reference error');
        assert.ok(refErrors[0].message.includes('nonExistent'), 'Message should mention the missing workflow');
    });

    test('Source type: invalid type should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-references.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-source-type-enum');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const sourceTypeErrors = diagnostics.filter(d => codeOf(d) === 'arazzo-source-type-enum');
        assert.ok(sourceTypeErrors.length > 0, 'Should find source-type error');
    });

    test('Duplicate stepId should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/duplicate-stepid.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-step-id-unique');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const dupErrors = diagnostics.filter(d => codeOf(d) === 'arazzo-step-id-unique');
        assert.ok(dupErrors.length > 0, 'Should find duplicate stepId error');
        assert.ok(dupErrors[0].message.includes('duplicateStep'), 'Message should mention the duplicate stepId');
    });

    test('Valid source type openapi should not produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-source-type-enum').length, 0);
    });

    test('Valid source type arazzo should not produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: arazzo
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-source-type-enum').length, 0);
    });

    test('Step with only operationPath should not produce mutual-exclusive error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationPath: "{$sourceDescriptions.test.url}#/paths/~1pets/get"
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive').length, 0);
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-missing').length, 0);
    });

    test('Valid dependsOn with existing workflow should not produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: first
    steps:
      - stepId: step1
        operationId: op1
  - workflowId: second
    dependsOn:
      - first
    steps:
      - stepId: step1
        operationId: op2
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(diagnostics.filter(d => codeOf(d) === 'arazzo-workflow-depends-on-resolved').length, 0);
    });

    // =========================================================================
    // Required fields: root-level
    // =========================================================================

    test('Root missing arazzo field is not recognized as Arazzo document', async () => {
        // Without the `arazzo` key, the validator does not recognize the file
        // as an Arazzo spec, so no diagnostics are produced — by design.
        const content = `
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        // Short wait to let any async validation settle
        await new Promise(r => setTimeout(r, 1500));

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const arazzoDiags = diagnostics.filter(d => d.source === 'arazzo');
        assert.strictEqual(arazzoDiags.length, 0, 'No Arazzo diagnostics should be produced for a file without arazzo key');
    });

    test('Root missing info field should produce error', async () => {
        const content = `
arazzo: 1.0.1
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: info'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: info'));
        assert.ok(missing.length > 0, 'Should find missing info field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Root missing sourceDescriptions field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: sourceDescriptions'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: sourceDescriptions'));
        assert.ok(missing.length > 0, 'Should find missing sourceDescriptions field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Root missing workflows field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: workflows'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: workflows'));
        assert.ok(missing.length > 0, 'Should find missing workflows field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Required fields: info object
    // =========================================================================

    test('Info missing title field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: title'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: title'));
        assert.ok(missing.length > 0, 'Should find missing title field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Info missing version field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: version'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: version'));
        assert.ok(missing.length > 0, 'Should find missing version field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Required fields: sourceDescription entries
    // =========================================================================

    test('SourceDescription missing name field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: name'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: name'));
        assert.ok(missing.length > 0, 'Should find missing name field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('SourceDescription missing url field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: url'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: url'));
        assert.ok(missing.length > 0, 'Should find missing url field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Required fields: workflow and step
    // =========================================================================

    test('Workflow missing workflowId field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: workflowId'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: workflowId'));
        assert.ok(missing.length > 0, 'Should find missing workflowId field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Workflow missing steps field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: steps'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: steps'));
        assert.ok(missing.length > 0, 'Should find missing steps field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Step missing stepId field should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('Missing required field: stepId'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const missing = diagnostics.filter(d => d.message.includes('Missing required field: stepId'));
        assert.ok(missing.length > 0, 'Should find missing stepId field error');
        assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Array validation: empty arrays
    // =========================================================================

    test('Empty sourceDescriptions array should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('sourceDescriptions must have at least one entry'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const errors = diagnostics.filter(d => d.message.includes('sourceDescriptions must have at least one entry'));
        assert.ok(errors.length > 0, 'Should find empty sourceDescriptions error');
        assert.strictEqual(errors[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Empty steps array should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps: []
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('steps must have at least one entry'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const errors = diagnostics.filter(d => d.message.includes('steps must have at least one entry'));
        assert.ok(errors.length > 0, 'Should find empty steps error');
        assert.strictEqual(errors[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Array validation: non-array types
    // =========================================================================

    test('sourceDescriptions as object should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  name: test
  url: http://example.com
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('sourceDescriptions must be an array'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const errors = diagnostics.filter(d => d.message.includes('sourceDescriptions must be an array'));
        assert.ok(errors.length > 0, 'Should find sourceDescriptions not-an-array error');
        assert.strictEqual(errors[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('workflows as object should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  workflowId: testWorkflow
  steps:
    - stepId: step1
      operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('workflows must be an array'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const errors = diagnostics.filter(d => d.message.includes('workflows must be an array'));
        assert.ok(errors.length > 0, 'Should find workflows not-an-array error');
        assert.strictEqual(errors[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('steps as object should produce error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      stepId: step1
      operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.message.includes('steps must be an array'));
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const errors = diagnostics.filter(d => d.message.includes('steps must be an array'));
        assert.ok(errors.length > 0, 'Should find steps not-an-array error');
        assert.strictEqual(errors[0].severity, vscode.DiagnosticSeverity.Error);
    });

    // =========================================================================
    // Version check
    // =========================================================================

    test('Unknown arazzo version 2.0.0 should produce warning with code arazzo-version', async () => {
        const content = `
arazzo: 2.0.0
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-version');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const versionWarning = diagnostics.find(d => codeOf(d) === 'arazzo-version');
        assert.ok(versionWarning, 'Should find arazzo-version warning');
        assert.strictEqual(versionWarning.severity, vscode.DiagnosticSeverity.Warning);
        assert.ok(versionWarning.message.includes('2.0.0'), 'Warning should mention the version');
    });

    test('Known arazzo version 1.0.0 should not produce version warning', async () => {
        const content = `
arazzo: 1.0.0
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(
            diagnostics.filter(d => codeOf(d) === 'arazzo-version').length,
            0,
            'Should not find any arazzo-version warning for known version 1.0.0'
        );
    });

    const versionDoc = (version: string) => `
arazzo: ${version}
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;

    for (const version of ['1.0.1', '1.1.0']) {
        test(`Known arazzo version ${version} should not produce version warning`, async () => {
            const doc = await vscode.workspace.openTextDocument({ content: versionDoc(version), language: 'yaml' });
            const diagnostics = await settledDiagnostics(doc.uri);
            assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
            assert.strictEqual(withCode(diagnostics, 'arazzo-version').length, 0);
        });
    }

    test('Unknown arazzo version 1.2.0 should produce arazzo-version warning listing 1.1.x', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: versionDoc('1.2.0'), language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-version').length > 0);
        const [warning] = withCode(diagnostics, 'arazzo-version');
        assert.strictEqual(warning.severity, vscode.DiagnosticSeverity.Warning);
        assert.ok(warning.message.includes('1.2.0'), warning.message);
        assert.ok(warning.message.includes('1.1.x'), 'Known versions should include 1.1.x');
        assert.strictEqual(warning.range.start.line, 1, 'Warning should be on the arazzo value');
    });

    test('Malformed arazzo version "1.1" should produce arazzo-version-format error', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: versionDoc('"1.1"'), language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-version-format').length > 0);
        assert.strictEqual(withCode(diagnostics, 'arazzo-version-format')[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Diagnostics carry the rule id, the arazzo source and a link to the 1.1.0 specification', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/duplicate-stepid.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-step-id-unique').length > 0);
        const [dup] = withCode(diagnostics, 'arazzo-step-id-unique');
        assert.strictEqual(dup.source, 'arazzo');
        assert.ok(typeof dup.code === 'object', 'code should be { value, target }');
        const target = (dup.code as { target: vscode.Uri }).target.toString();
        assert.ok(target.startsWith('https://spec.openapis.org/arazzo/v1.1.0.html#step-object'), target);
        // The range covers the duplicated stepId value only.
        assert.strictEqual(doc.getText(dup.range), 'duplicateStep');
    });

    test('No duplicate diagnostics (same rule, same range)', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-mutual-exclusivity.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-step-target-exclusive').length > 0);
        const keys = diagnostics.map(d => `${codeOf(d)}|${d.range.start.line}:${d.range.start.character}`);
        assert.strictEqual(new Set(keys).size, keys.length, keys.join('\n'));
        assert.strictEqual(withCode(diagnostics, 'arazzo-step-target-exclusive').length, 1);
    });

    // =========================================================================
    // Operation type combinations (mutual exclusivity)
    // =========================================================================

    test('Step with only workflowId should not produce mutual-exclusive error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        workflowId: anotherWorkflow
  - workflowId: anotherWorkflow
    steps:
      - stepId: step1
        operationId: testOp
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        const diagnostics = await settledDiagnostics(doc.uri);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
        assert.strictEqual(
            diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive').length,
            0,
            'Step with only workflowId should not have mutual-exclusive error'
        );
        assert.strictEqual(
            diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-missing').length,
            0,
            'Step with workflowId should not have operation-required error'
        );
    });

    test('Step with operationId and workflowId should produce mutual-exclusive error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: testOp
        workflowId: anotherWorkflow
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-step-target-exclusive');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const mutualExcl = diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive');
        assert.ok(mutualExcl.length > 0, 'Should find mutual-exclusive error for operationId + workflowId');
        assert.strictEqual(mutualExcl[0].severity, vscode.DiagnosticSeverity.Error);
    });

    test('Step with operationPath and workflowId should produce mutual-exclusive error', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationPath: "{$sourceDescriptions.test.url}#/paths/~1pets/get"
        workflowId: anotherWorkflow
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => codeOf(d) === 'arazzo-step-target-exclusive');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const mutualExcl = diagnostics.filter(d => codeOf(d) === 'arazzo-step-target-exclusive');
        assert.ok(mutualExcl.length > 0, 'Should find mutual-exclusive error for operationPath + workflowId');
        assert.strictEqual(mutualExcl[0].severity, vscode.DiagnosticSeverity.Error);
    });
});
