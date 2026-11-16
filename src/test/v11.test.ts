import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { codeOf, describe, errorsOf, settledDiagnostics, withCode } from './helpers';
import { ADD_SELF_TITLE, MIGRATE_TITLE } from '../providers/code-action-provider';

const fixture = (...parts: string[]) => path.resolve(__dirname, '../../src/test/fixtures/v1.1', ...parts);

async function codeActions(doc: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[]> {
    const actions = await vscode.commands.executeCommand<(vscode.CodeAction | vscode.Command)[]>(
        'vscode.executeCodeActionProvider',
        doc.uri,
        range
    );
    return (actions ?? []).filter((a): a is vscode.CodeAction => 'title' in a && !('command' in a && typeof a.command === 'string'));
}

async function apply(action: vscode.CodeAction | undefined): Promise<void> {
    assert.ok(action, 'Code action not found');
    assert.ok(action.edit, 'Code action should carry a WorkspaceEdit');
    assert.ok(await vscode.workspace.applyEdit(action.edit));
}

const LEGACY_DOC = `arazzo: 1.0.1
info:
  title: Legacy
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: buy
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.shop.createOrder
`;

suite('Arazzo 1.1', () => {

    for (const [name, file] of [
        ['order-to-cash', 'e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml'],
        ['session-renewal', 'e2e-session-renewal/e2e-session-renewal.arazzo.yaml'],
    ]) {
        test(`E1 fixture ${name} validates with 0 error and no duplicate`, async () => {
            const doc = await vscode.workspace.openTextDocument(fixture(...file.split('/')));
            const diagnostics = await settledDiagnostics(doc.uri);
            assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));
            assert.strictEqual(withCode(diagnostics, 'arazzo-version').length, 0);
            const keys = diagnostics.map(d => `${codeOf(d)}|${d.range.start.line}:${d.range.start.character}`);
            assert.strictEqual(new Set(keys).size, keys.length, 'No duplicate diagnostics');
        });
    }

    test('order-to-cash outline lists the workflow and its async step (symbols from the parse cache)', async () => {
        const doc = await vscode.workspace.openTextDocument(fixture('e2e-order-to-cash', 'e2e-order-to-cash.arazzo.yaml'));
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', doc.uri);
        const workflows = symbols?.find(s => s.name === 'workflows');
        const orderToCash = workflows?.children.find(s => s.name === 'orderToCash');
        assert.ok(orderToCash, 'Should find orderToCash');
        const steps = orderToCash.children.find(s => s.name === 'steps');
        assert.ok(steps?.children.some(s => s.name === 'awaitOrderConfirmation'), 'Should find the receive step');
    });

    test('1.1 features in a 1.0.1 document are reported as arazzo-version-feature-mismatch', async () => {
        const content = LEGACY_DOC.replace(
            '        operationId: $sourceDescriptions.shop.createOrder\n',
            '        operationId: $sourceDescriptions.shop.createOrder\n        timeout: 1000\n'
        );
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-version-feature-mismatch').length > 0);
        const [mismatch] = withCode(diagnostics, 'arazzo-version-feature-mismatch');
        assert.strictEqual(doc.getText(mismatch.range), '1000', 'The range covers the timeout value');

        // The quick fix attached to the diagnostic migrates the document.
        const actions = await codeActions(doc, mismatch.range);
        const migrate = actions.find(a => a.title === MIGRATE_TITLE);
        assert.ok(migrate?.isPreferred, 'Migration should be the preferred fix');
        await apply(migrate);
        const after = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-version-feature-mismatch').length === 0);
        assert.strictEqual(errorsOf(after).length, 0, describe(errorsOf(after)));
    });

    test('Quick fix "Migrate to Arazzo 1.1.0" bumps the version and adds a suggested $self', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: LEGACY_DOC, language: 'yaml' });
        await settledDiagnostics(doc.uri);
        const actions = await codeActions(doc, new vscode.Range(0, 0, 0, 0));
        await apply(actions.find(a => a.title === MIGRATE_TITLE));

        const lines = doc.getText().split('\n');
        assert.strictEqual(lines[0], 'arazzo: 1.1.0');
        assert.ok(/^\$self: https:\/\/example\.com\/arazzo\/\S+$/.test(lines[1]), `Unexpected $self line: ${lines[1]}`);
        assert.strictEqual(lines[2], 'info:');

        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-self-recommended').length === 0);
        assert.strictEqual(errorsOf(diagnostics).length, 0, describe(errorsOf(diagnostics)));

        // Nothing left to migrate.
        const again = await codeActions(doc, new vscode.Range(0, 0, 0, 0));
        assert.ok(!again.some(a => a.title === MIGRATE_TITLE), 'No migration offered on a 1.1.0 document');
    });

    test('Migration keeps the quoting style of the version', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: LEGACY_DOC.replace('arazzo: 1.0.1', 'arazzo: "1.0.1"'), language: 'yaml' });
        await settledDiagnostics(doc.uri);
        await apply((await codeActions(doc, new vscode.Range(0, 0, 0, 0))).find(a => a.title === MIGRATE_TITLE));
        assert.ok(doc.getText().startsWith('arazzo: "1.1.0"\n$self: '), doc.getText().slice(0, 80));
    });

    test('Quick fix adds $self to a 1.1.0 document', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: LEGACY_DOC.replace('arazzo: 1.0.1', 'arazzo: 1.1.0'), language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-self-recommended').length > 0);
        const [info] = withCode(diagnostics, 'arazzo-self-recommended');
        assert.strictEqual(info.severity, vscode.DiagnosticSeverity.Information);
        await apply((await codeActions(doc, info.range)).find(a => a.title === ADD_SELF_TITLE));
        assert.ok(doc.lineAt(1).text.startsWith('$self: https://'), doc.lineAt(1).text);
    });

    test('Quick fix suggests the closest stepId for an unknown goto / dependsOn target', async () => {
        const content = `arazzo: 1.1.0
$self: https://example.com/arazzo/t.arazzo.yaml
info:
  title: T
  version: 1.0.0
sourceDescriptions:
  - name: api
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: w
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.api.create
        onFailure:
          - name: again
            type: goto
            stepId: createOrdr
      - stepId: read
        operationId: $sourceDescriptions.api.read
        dependsOn: [createOder]
`;
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-step-depends-on-resolved').length > 0);

        const [gotoDiag] = withCode(diagnostics, 'arazzo-action-goto-step-exists');
        await apply((await codeActions(doc, gotoDiag.range)).find(a => a.title === 'Change to "createOrder"'));
        assert.ok(doc.getText().includes('stepId: createOrder\n      - stepId: read'), 'goto stepId should be fixed');

        const fresh = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-action-goto-step-exists').length === 0);
        const [depDiag] = withCode(fresh, 'arazzo-step-depends-on-resolved');
        await apply((await codeActions(doc, depDiag.range)).find(a => a.title === 'Change to "createOrder"'));
        assert.ok(doc.getText().includes('dependsOn: [createOrder]'), 'dependsOn should be fixed');
    });

    test('Quick fix rewrites $response.body.a.b as a JSON Pointer', async () => {
        const content = LEGACY_DOC.replace('arazzo: 1.0.1', 'arazzo: 1.1.0\n$self: https://example.com/arazzo/t.arazzo.yaml')
            + '        outputs:\n          id: $response.body.order.id\n';
        const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
        const diagnostics = await settledDiagnostics(doc.uri, ds => withCode(ds, 'arazzo-expression-syntax').length > 0);
        const [warning] = withCode(diagnostics, 'arazzo-expression-syntax');
        assert.strictEqual(warning.severity, vscode.DiagnosticSeverity.Warning);
        await apply((await codeActions(doc, warning.range)).find(a => a.title.startsWith('Use JSON Pointer')));
        assert.ok(doc.getText().includes('id: $response.body#/order/id'), doc.getText());
    });
});
