import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { completionLabelsAtEnd } from './helpers';

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
        assert.ok(labels.includes('criteria'), 'Should suggest "criteria"');
        assert.ok(labels.includes('parameters'), 'Should suggest "parameters" (Arazzo 1.1)');
        assert.ok(!labels.includes('retryAfter'), '"retryAfter" only applies to failure actions');
        assert.ok(!labels.includes('retryLimit'), '"retryLimit" only applies to failure actions');
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
        onFailure:
          - name: failureAction
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
    // =========================================================================
    // Arazzo 1.1
    // =========================================================================

    const header11 = `arazzo: 1.1.0
$self: https://example.com/arazzo/test.arazzo.yaml
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
  - name: events
    url: ./asyncapi.yaml
    type: asyncapi
components:
  parameters:
    traceId:
      name: X-Trace-Id
      in: header
      value: abc
workflows:
  - workflowId: renew
    steps:
      - stepId: renewStep
        operationId: $sourceDescriptions.shop.renew
  - workflowId: main
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.shop.createOrder
        outputs:
          orderId: $response.body#/id
      - stepId: awaitConfirmation
`;

    test('1.1 root keys include $self and components', async () => {
        const labels = await completionLabelsAtEnd('arazzo: 1.1.0\n');
        assert.ok(labels.includes('$self'), 'Should suggest "$self"');
        assert.ok(labels.includes('components'), 'Should suggest "components"');
    });

    test('1.1 step keys include channelPath, action, correlationId, timeout and dependsOn', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        ');
        for (const key of ['channelPath', 'action', 'correlationId', 'timeout', 'dependsOn']) {
            assert.ok(labels.includes(key), `Should suggest "${key}", got ${labels.join(', ')}`);
        }
    });

    test('1.1 step action value should suggest send and receive', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        action: ');
        assert.ok(labels.includes('send'), 'Should suggest "send"');
        assert.ok(labels.includes('receive'), 'Should suggest "receive"');
    });

    test('1.1 channelPath value should suggest the AsyncAPI sources only', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        channelPath: ');
        assert.ok(labels.includes('{$sourceDescriptions.events.url}#/channels/'), labels.join(', '));
        assert.ok(!labels.some(l => l.includes('sourceDescriptions.shop')), 'OpenAPI sources are not channels');
    });

    test('1.1 source type value should suggest asyncapi', async () => {
        const labels = await completionLabelsAtEnd('arazzo: 1.1.0\nsourceDescriptions:\n  - name: events\n    type: ');
        assert.ok(labels.includes('asyncapi'), 'Should suggest "asyncapi"');
    });

    test('1.1 step dependsOn items should suggest the other steps of the workflow', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        dependsOn:\n          - ');
        assert.ok(labels.includes('createOrder'), labels.join(', '));
        assert.ok(!labels.includes('awaitConfirmation'), 'A step cannot depend on itself');
        assert.ok(!labels.includes('renewStep'), 'Steps of other workflows are not local dependsOn targets');
    });

    test('goto stepId and workflowId values should come from the document', async () => {
        const base = header11 + '        operationId: $sourceDescriptions.shop.confirm\n        onFailure:\n          - name: again\n            type: goto\n';
        const steps = await completionLabelsAtEnd(base + '            stepId: ');
        assert.ok(steps.includes('createOrder') && steps.includes('awaitConfirmation'), steps.join(', '));
        const workflows = await completionLabelsAtEnd(base + '            workflowId: ');
        assert.ok(workflows.includes('renew') && workflows.includes('main'), workflows.join(', '));
    });

    test('1.1 parameter in value should suggest querystring', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        parameters:\n          - name: q\n            in: ');
        assert.ok(labels.includes('querystring'), labels.join(', '));
        assert.ok(labels.includes('header'), labels.join(', '));
    });

    test('1.1 expression type object should suggest jsonpointer and its versions', async () => {
        const base = header11 + '        successCriteria:\n          - context: $response.body\n            condition: $[?@.ok]\n            type:\n';
        const types = await completionLabelsAtEnd(base + '              type: ');
        assert.ok(types.includes('jsonpath') && types.includes('xpath') && types.includes('jsonpointer'), types.join(', '));
        const versions = await completionLabelsAtEnd(base + '              type: jsonpath\n              version: ');
        assert.ok(versions.includes('rfc9535'), versions.join(', '));
        assert.ok(!versions.includes('xpath-31'), 'Only the versions of the sibling type');
    });

    test('1.1 selector keys are suggested for an output value', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        outputs:\n          total:\n            ');
        for (const key of ['context', 'selector', 'type']) {
            assert.ok(labels.includes(key), `Should suggest "${key}", got ${labels.join(', ')}`);
        }
    });

    test('1.1 requestBody keys include replacements and components keys are suggested', async () => {
        const body = await completionLabelsAtEnd(header11 + '        requestBody:\n          ');
        assert.ok(body.includes('replacements'), body.join(', '));
        const components = await completionLabelsAtEnd('arazzo: 1.1.0\ncomponents:\n  ');
        for (const key of ['inputs', 'parameters', 'successActions', 'failureActions']) {
            assert.ok(components.includes(key), `Should suggest "${key}"`);
        }
    });

    test('1.1 runtime expressions include $message, $self, $components and $sourceDescriptions', async () => {
        const labels = await completionLabelsAtEnd(header11 + '        correlationId: $');
        for (const expr of ['$message.payload', '$message.header.', '$self', '$components.', '$sourceDescriptions.']) {
            assert.ok(labels.includes(expr), `Should suggest "${expr}", got ${labels.join(', ')}`);
        }
        const steps = await completionLabelsAtEnd(header11 + '        correlationId: $steps.');
        assert.ok(steps.includes('$steps.createOrder.outputs.orderId'), steps.join(', '));
        const components = await completionLabelsAtEnd(header11 + '        parameters:\n          - reference: $components.');
        assert.ok(components.includes('$components.parameters.traceId'), components.join(', '));
    });

    test('order-to-cash fixture: channelPath and action are suggested in a new step', async () => {
        const fixture = path.resolve(__dirname, '../../src/test/fixtures/v1.1/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml');
        const text = fs.readFileSync(fixture, 'utf8');
        const marker = '    steps:\n';
        const at = text.indexOf(marker) + marker.length;
        const content = text.slice(0, at) + '      - stepId: newStep\n        ' ;
        const keys = await completionLabelsAtEnd(content);
        assert.ok(keys.includes('channelPath') && keys.includes('action'), keys.join(', '));
        const channels = await completionLabelsAtEnd(text.slice(0, at) + '      - stepId: newStep\n        channelPath: ');
        assert.ok(channels.includes('{$sourceDescriptions.orderEvents.url}#/channels/'), channels.join(', '));
    });
});
