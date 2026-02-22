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
});
