import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Arazzo Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Valid Arazzo file should have no errors', async () => {
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
		const doc = await vscode.workspace.openTextDocument({
			content,
			language: 'yaml'
		});
		
		// Wait for diagnostics to update
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		const diagnostics = vscode.languages.getDiagnostics(doc.uri);
		assert.strictEqual(diagnostics.length, 0, `Expected 0 diagnostics, got ${diagnostics.length}: ${JSON.stringify(diagnostics)}`);
	});

	test('Missing required fields should report errors', async () => {
		const content = `
arazzo: 1.0.1
# Missing info, sourceDescriptions, workflows
`;
		const doc = await vscode.workspace.openTextDocument({
			content,
			language: 'yaml'
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const diagnostics = vscode.languages.getDiagnostics(doc.uri);
		const messages = diagnostics.map(d => d.message);
		
		assert.ok(messages.some(m => m.includes('Missing required field: info')), 'Missing info error not found');
		assert.ok(messages.some(m => m.includes('Missing required field: sourceDescriptions')), 'Missing sourceDescriptions error not found');
		assert.ok(messages.some(m => m.includes('Missing required field: workflows')), 'Missing workflows error not found');
	});

	test('Outline should provide correct symbols', async () => {
		const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: mySource
    url: http://example.com
    type: openapi
workflows:
  - workflowId: myWorkflow
    summary: My Workflow Summary
    steps:
      - stepId: myStep
        description: My Step Description
        operationId: testOp
`;
		const doc = await vscode.workspace.openTextDocument({
			content,
			language: 'yaml'
		});

		// Wait for extension to activate and register provider
		await new Promise(resolve => setTimeout(resolve, 1000));

		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			doc.uri
		);

		assert.ok(symbols, 'Symbols should not be undefined');
		assert.ok(symbols.length > 0, 'Should find symbols');

		// Check Workflows
		const workflowsSymbol = symbols.find(s => s.name === 'workflows');
		assert.ok(workflowsSymbol, 'Should find workflows symbol');
		assert.strictEqual(workflowsSymbol.kind, vscode.SymbolKind.Class);

		const myWorkflow = workflowsSymbol.children.find(s => s.name === 'myWorkflow');
		assert.ok(myWorkflow, 'Should find myWorkflow');
		assert.strictEqual(myWorkflow.detail, 'My Workflow Summary');

		// Check Steps
		const stepsSymbol = myWorkflow.children.find(s => s.name === 'steps');
		assert.ok(stepsSymbol, 'Should find steps symbol');

		const myStep = stepsSymbol.children.find(s => s.name === 'myStep');
		assert.ok(myStep, 'Should find myStep');
		assert.strictEqual(myStep.detail, 'My Step Description');
		assert.strictEqual(myStep.kind, vscode.SymbolKind.Function);
	});
});
