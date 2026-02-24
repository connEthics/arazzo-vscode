import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseDocument, isMap } from 'yaml';
import { isArazzoDocument, getArazzoVersion, isKnownArazzoVersion, detectAndSelectWorkflow } from '../arazzo-detection';

suite('Arazzo Detection', () => {
	test('isArazzoDocument returns true for Arazzo file', () => {
		const doc = parseDocument('arazzo: "1.0.1"\ninfo:\n  title: Test\n');
		assert.ok(doc.contents && isMap(doc.contents));
		assert.strictEqual(isArazzoDocument(doc.contents), true);
	});

	test('isArazzoDocument returns false for non-Arazzo YAML', () => {
		const doc = parseDocument('version: "3.8"\nservices:\n  web:\n    image: nginx\n');
		assert.ok(doc.contents && isMap(doc.contents));
		assert.strictEqual(isArazzoDocument(doc.contents), false);
	});

	test('isArazzoDocument returns true for unknown Arazzo version', () => {
		const doc = parseDocument('arazzo: "2.0.0"\ninfo:\n  title: Test\n');
		assert.ok(doc.contents && isMap(doc.contents));
		assert.strictEqual(isArazzoDocument(doc.contents), true);
	});

	test('isArazzoDocument returns false for null/undefined', () => {
		assert.strictEqual(isArazzoDocument(null), false);
		assert.strictEqual(isArazzoDocument(undefined), false);
	});

	test('getArazzoVersion returns version string', () => {
		const doc = parseDocument('arazzo: "1.0.1"\n');
		assert.strictEqual(getArazzoVersion(doc.contents), '1.0.1');
	});

	test('getArazzoVersion returns null for non-Arazzo', () => {
		const doc = parseDocument('version: "3"\n');
		assert.strictEqual(getArazzoVersion(doc.contents), null);
	});

	test('isKnownArazzoVersion returns true for 1.0.0 and 1.0.1', () => {
		assert.strictEqual(isKnownArazzoVersion('1.0.0'), true);
		assert.strictEqual(isKnownArazzoVersion('1.0.1'), true);
	});

	test('isKnownArazzoVersion returns false for unknown versions', () => {
		assert.strictEqual(isKnownArazzoVersion('2.0.0'), false);
		assert.strictEqual(isKnownArazzoVersion('0.1.0'), false);
	});

	test('detectAndSelectWorkflow selects workflow at cursor', async () => {
		const content = `arazzo: "1.0.1"
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: firstWorkflow
    steps:
      - stepId: step1
        operationId: op1
  - workflowId: secondWorkflow
    steps:
      - stepId: step2
        operationId: op2
`;
		const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
		const editor = await vscode.window.showTextDocument(doc);

		// Move cursor to first workflow (line 10: workflowId: firstWorkflow)
		editor.selection = new vscode.Selection(new vscode.Position(11, 0), new vscode.Position(11, 0));
		let selectedId: string | undefined;
		detectAndSelectWorkflow(editor, (_uri, wfId) => { selectedId = wfId; });
		assert.strictEqual(selectedId, 'firstWorkflow', 'Should select first workflow');

		// Move cursor to second workflow (line 14: workflowId: secondWorkflow)
		editor.selection = new vscode.Selection(new vscode.Position(15, 0), new vscode.Position(15, 0));
		selectedId = undefined;
		detectAndSelectWorkflow(editor, (_uri, wfId) => { selectedId = wfId; });
		assert.strictEqual(selectedId, 'secondWorkflow', 'Should select second workflow');
	});

	test('detectAndSelectWorkflow does not select outside workflows', async () => {
		const content = `arazzo: "1.0.1"
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: openapi
workflows:
  - workflowId: firstWorkflow
    steps:
      - stepId: step1
        operationId: op1
`;
		const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
		const editor = await vscode.window.showTextDocument(doc);

		// Move cursor to info section (line 1)
		editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 0));
		let selectedId: string | undefined;
		detectAndSelectWorkflow(editor, (_uri, wfId) => { selectedId = wfId; });
		assert.strictEqual(selectedId, undefined, 'Should not select any workflow outside workflows section');
	});
});
