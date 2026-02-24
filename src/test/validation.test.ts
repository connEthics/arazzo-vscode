import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { waitFor } from './helpers';

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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive').length, 0);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-operation-required').length, 0);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-ref-dependsOn').length, 0);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-source-type').length, 0);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-duplicate-stepId').length, 0);
    });

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
            return diagnostics.some(d => d.code === 'arazzo-operation-required');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const opRequired = diagnostics.filter(d => d.code === 'arazzo-operation-required');
        assert.ok(opRequired.length > 0, 'Should find operation-required error');
    });

    test('DependsOn reference: non-existent workflow should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/invalid-references.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.code === 'arazzo-ref-dependsOn');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const refErrors = diagnostics.filter(d => d.code === 'arazzo-ref-dependsOn');
        assert.ok(refErrors.length > 0, 'Should find dependsOn reference error');
        assert.ok(refErrors[0].message.includes('nonExistent'), 'Message should mention the missing workflow');
    });

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

    test('Duplicate stepId should produce error', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/duplicate-stepid.arazzo.yaml');
        const doc = await vscode.workspace.openTextDocument(fixturePath);

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.some(d => d.code === 'arazzo-duplicate-stepId');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const dupErrors = diagnostics.filter(d => d.code === 'arazzo-duplicate-stepId');
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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-source-type').length, 0);
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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-source-type').length, 0);
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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive').length, 0);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-operation-required').length, 0);
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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(diagnostics.filter(d => d.code === 'arazzo-ref-dependsOn').length, 0);
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
            return diagnostics.some(d => d.code === 'arazzo-version');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const versionWarning = diagnostics.find(d => d.code === 'arazzo-version');
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

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(
            diagnostics.filter(d => d.code === 'arazzo-version').length,
            0,
            'Should not find any arazzo-version warning for known version 1.0.0'
        );
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
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });

        await waitFor(() => {
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            return diagnostics.length === 0;
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.strictEqual(
            diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive').length,
            0,
            'Step with only workflowId should not have mutual-exclusive error'
        );
        assert.strictEqual(
            diagnostics.filter(d => d.code === 'arazzo-operation-required').length,
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
            return diagnostics.some(d => d.code === 'arazzo-mutual-exclusive');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const mutualExcl = diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive');
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
            return diagnostics.some(d => d.code === 'arazzo-mutual-exclusive');
        });

        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        const mutualExcl = diagnostics.filter(d => d.code === 'arazzo-mutual-exclusive');
        assert.ok(mutualExcl.length > 0, 'Should find mutual-exclusive error for operationPath + workflowId');
        assert.strictEqual(mutualExcl[0].severity, vscode.DiagnosticSeverity.Error);
    });
});
