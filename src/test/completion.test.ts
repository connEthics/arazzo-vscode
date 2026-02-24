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

    test('Workflow context should suggest workflow keys', async () => {
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
        assert.ok(labels.includes('workflowId'), 'Should suggest "workflowId"');
        assert.ok(labels.includes('summary'), 'Should suggest "summary"');
        assert.ok(labels.includes('description'), 'Should suggest "description"');
        assert.ok(labels.includes('inputs'), 'Should suggest "inputs"');
        assert.ok(labels.includes('dependsOn'), 'Should suggest "dependsOn"');
        assert.ok(labels.includes('steps'), 'Should suggest "steps"');
        assert.ok(labels.includes('outputs'), 'Should suggest "outputs"');
        assert.ok(labels.includes('parameters'), 'Should suggest "parameters"');
    });

    test('Action context should suggest action keys under onSuccess', async () => {
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
        onSuccess:
          - name: successAction
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
        assert.ok(labels.includes('name'), 'Should suggest "name"');
        assert.ok(labels.includes('type'), 'Should suggest "type"');
        assert.ok(labels.includes('workflowId'), 'Should suggest "workflowId"');
        assert.ok(labels.includes('stepId'), 'Should suggest "stepId"');
        assert.ok(labels.includes('retryAfter'), 'Should suggest "retryAfter"');
        assert.ok(labels.includes('retryLimit'), 'Should suggest "retryLimit"');
        assert.ok(labels.includes('criteria'), 'Should suggest "criteria"');
    });

    test('Action type value should suggest goto, retry, end', async () => {
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
        onSuccess:
          - name: successAction
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
        assert.ok(labels.includes('goto'), 'Should suggest "goto"');
        assert.ok(labels.includes('retry'), 'Should suggest "retry"');
        assert.ok(labels.includes('end'), 'Should suggest "end"');
    });

    test('SuccessCriterion context should suggest criterion keys', async () => {
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
        successCriteria:
          - condition: $statusCode == 200
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
        assert.ok(labels.includes('condition'), 'Should suggest "condition"');
        assert.ok(labels.includes('context'), 'Should suggest "context"');
        assert.ok(labels.includes('type'), 'Should suggest "type"');
    });

    test('SuccessCriterion type value should suggest simple, regex, jsonpath, xpath', async () => {
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
        successCriteria:
          - condition: $statusCode == 200
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
        assert.ok(labels.includes('simple'), 'Should suggest "simple"');
        assert.ok(labels.includes('regex'), 'Should suggest "regex"');
        assert.ok(labels.includes('jsonpath'), 'Should suggest "jsonpath"');
        assert.ok(labels.includes('xpath'), 'Should suggest "xpath"');
    });

    test('SourceDescription context should suggest source description keys', async () => {
        const content = `
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: test
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
        assert.ok(labels.includes('name'), 'Should suggest "name"');
        assert.ok(labels.includes('url'), 'Should suggest "url"');
        assert.ok(labels.includes('type'), 'Should suggest "type"');
    });
});
