import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from './helpers';

suite('Completion Provider', () => {

    test('Root context should suggest Arazzo keys', async () => {
        const content = `
arazzo: 1.0.1
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        // Position at end of file (root level)
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
        assert.ok(labels.includes('sourceDescriptions'), 'Should suggest "sourceDescriptions"');
    });

    test('Step context should suggest step keys', async () => {
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
        `;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        // Position at end of step context (after "stepId: step1")
        const lastLine = doc.lineCount - 1;
        const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            doc.uri,
            position
        );

        assert.ok(completions, 'Completions should not be undefined');
        const labels = completions.items.map(i => typeof i.label === 'string' ? i.label : i.label.label);
        assert.ok(labels.includes('operationId'), 'Should suggest "operationId"');
        assert.ok(labels.includes('successCriteria'), 'Should suggest "successCriteria"');
    });

    test('Source type value should suggest openapi and arazzo', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
    url: http://example.com
    type: `;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        const lastLine = doc.lineCount - 1;
        const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            doc.uri,
            position
        );

        assert.ok(completions, 'Completions should not be undefined');
        const labels = completions.items.map(i => typeof i.label === 'string' ? i.label : i.label.label);
        assert.ok(labels.includes('openapi'), 'Should suggest "openapi"');
        assert.ok(labels.includes('arazzo'), 'Should suggest "arazzo"');
    });

    test('Runtime expression prefix should be suggested in value positions', async () => {
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
        outputs:
          result: `;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        const lastLine = doc.lineCount - 1;
        const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            doc.uri,
            position
        );

        assert.ok(completions, 'Completions should not be undefined');
        const labels = completions.items.map(i => typeof i.label === 'string' ? i.label : i.label.label);
        assert.ok(labels.some(l => l.startsWith('$')), 'Should suggest runtime expression prefixes');
    });

    test('Non-Arazzo YAML should get no Arazzo completions', async () => {
        const content = `
version: "3.8"
services:
  web:
    image: nginx
    `;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        const lastLine = doc.lineCount - 1;
        const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            doc.uri,
            position
        );

        // Our Arazzo-specific completions (with detail 'Arazzo key') should not appear
        const arazzoItems = completions?.items.filter(i => i.detail === 'Arazzo key') || [];
        assert.strictEqual(arazzoItems.length, 0, `Should not suggest Arazzo keys on non-Arazzo files, got: ${arazzoItems.map(i => typeof i.label === 'string' ? i.label : i.label.label).join(', ')}`);
    });

    test('Info context should suggest info keys', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  `;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const editor = await vscode.window.showTextDocument(doc);

        const lastLine = doc.lineCount - 1;
        const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            doc.uri,
            position
        );

        assert.ok(completions, 'Completions should not be undefined');
        const labels = completions.items.map(i => typeof i.label === 'string' ? i.label : i.label.label);
        assert.ok(labels.includes('version'), 'Should suggest "version"');
        assert.ok(labels.includes('summary'), 'Should suggest "summary"');
    });
});
