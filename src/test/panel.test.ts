import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ArazzoPreviewPanel } from '../panels/preview-panel';
import * as fs from 'fs';
import { ArazzoFlowchartPanel, findStepRange, loadLocalSources } from '../panels/flowchart-panel';
import { buildCsp } from '../panels/webview-html';
import { parseArazzo } from '../arazzo-core';

suite('Panel Lifecycle', () => {

    test('Preview panel: updateFromCache is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent.arazzo.yaml');

        // Should not throw when no panel exists
        ArazzoPreviewPanel.updateFromCache(fakeUri, { arazzo: '1.0.0' });

        // Verify no panel was created
        assert.strictEqual(ArazzoPreviewPanel.panels.has(fakeUri.toString()), false);
    });

    test('Preview panel: update is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent2.arazzo.yaml');

        // Should not throw when no panel exists
        ArazzoPreviewPanel.update(fakeUri);

        assert.strictEqual(ArazzoPreviewPanel.panels.has(fakeUri.toString()), false);
    });

    test('Preview panel: scrollToStep is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent3.arazzo.yaml');

        // Should not throw when no panel exists
        ArazzoPreviewPanel.scrollToStep(fakeUri, 'stepId', 'workflowId');

        assert.strictEqual(ArazzoPreviewPanel.panels.has(fakeUri.toString()), false);
    });

    test('Flowchart panel: updateFromCache is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent4.arazzo.yaml');

        // Should not throw when no panel exists
        ArazzoFlowchartPanel.updateFromCache(fakeUri, { arazzo: '1.0.0' });

        assert.strictEqual(ArazzoFlowchartPanel.panels.has(fakeUri.toString()), false);
    });

    test('Flowchart panel: updateSelection is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent5.arazzo.yaml');

        // Should not throw when no panel exists
        ArazzoFlowchartPanel.updateSelection(fakeUri, 'testWorkflow');

        assert.strictEqual(ArazzoFlowchartPanel.panels.has(fakeUri.toString()), false);
    });

    test('Preview panel: createOrShow registers panel and dispose removes it', () => {
        // Use a real fixture file
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/pet-adoption.arazzo.yaml');
        const fixtureUri = vscode.Uri.file(fixturePath);
        const extensionUri = vscode.extensions.getExtension('connethics.arazzo-vscode')?.extensionUri
            || vscode.Uri.file(path.resolve(__dirname, '../../'));

        const key = fixtureUri.toString();

        // Create a panel
        ArazzoPreviewPanel.createOrShow(extensionUri, fixtureUri);

        // Panel should be registered
        assert.strictEqual(ArazzoPreviewPanel.panels.has(key), true, 'Panel should be registered after createOrShow');

        // Get the panel and dispose it
        const panel = ArazzoPreviewPanel.panels.get(key);
        assert.ok(panel, 'Panel instance should exist');

        panel!.dispose();

        // Panel should be removed after dispose
        assert.strictEqual(ArazzoPreviewPanel.panels.has(key), false, 'Panel should be removed after dispose');
    });

    test('Preview panel: createOrShow reuses existing panel for same URI', () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/pet-adoption.arazzo.yaml');
        const fixtureUri = vscode.Uri.file(fixturePath);
        const extensionUri = vscode.extensions.getExtension('connethics.arazzo-vscode')?.extensionUri
            || vscode.Uri.file(path.resolve(__dirname, '../../'));

        const key = fixtureUri.toString();

        // Create first panel
        ArazzoPreviewPanel.createOrShow(extensionUri, fixtureUri);
        const firstPanel = ArazzoPreviewPanel.panels.get(key);

        // Create again - should reuse
        ArazzoPreviewPanel.createOrShow(extensionUri, fixtureUri);
        const secondPanel = ArazzoPreviewPanel.panels.get(key);

        assert.strictEqual(firstPanel, secondPanel, 'Should reuse the same panel instance');

        // Cleanup
        firstPanel?.dispose();
    });

    test('Flowchart panel: createOrShow registers panel and dispose removes it', () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/pet-adoption.arazzo.yaml');
        const fixtureUri = vscode.Uri.file(fixturePath);
        const extensionUri = vscode.extensions.getExtension('connethics.arazzo-vscode')?.extensionUri
            || vscode.Uri.file(path.resolve(__dirname, '../../'));

        const key = fixtureUri.toString();

        // Create a panel
        ArazzoFlowchartPanel.createOrShow(extensionUri, fixtureUri);

        assert.strictEqual(ArazzoFlowchartPanel.panels.has(key), true, 'Flowchart panel should be registered');

        const panel = ArazzoFlowchartPanel.panels.get(key);
        assert.ok(panel, 'Flowchart panel instance should exist');

        panel!.dispose();

        assert.strictEqual(ArazzoFlowchartPanel.panels.has(key), false, 'Flowchart panel should be removed after dispose');
    });

    test('CSP: nonce scripts, ELK worker from blob: only, fetch of extension resources', () => {
        const csp = buildCsp('https://res.vscode-cdn.net', 'N0nce');
        const directives = new Map(csp.split(';').map(d => d.trim()).filter(Boolean).map(d => {
            const [name, ...values] = d.split(/\s+/);
            return [name, values] as [string, string[]];
        }));
        assert.deepStrictEqual(directives.get('default-src'), ["'none'"]);
        assert.deepStrictEqual(directives.get('script-src'), ["'nonce-N0nce'", 'https://res.vscode-cdn.net']);
        assert.deepStrictEqual(directives.get('worker-src'), ['blob:']);
        assert.deepStrictEqual(directives.get('connect-src'), ['https://res.vscode-cdn.net']);
        assert.ok(!csp.includes('unsafe-eval'), 'no unsafe-eval');
    });

    test('Webview build ships a single ELK worker script', () => {
        const assets = path.resolve(__dirname, '../../webview-ui/build/assets');
        assert.ok(fs.existsSync(path.join(assets, 'elk-worker.js')), 'build/assets/elk-worker.js');
        const js = fs.readdirSync(assets).filter(f => f.endsWith('.js'));
        const elkCopies = js.filter(f => fs.statSync(path.join(assets, f)).size > 1_000_000);
        assert.deepStrictEqual(elkCopies, ['elk-worker.js'], 'ELK must not be bundled twice');
        assert.ok(!js.some(f => /mermaid|flowDiagram|sequenceDiagram/.test(f)), 'no Mermaid renderer');
    });

    test('Flowchart panel: findStepRange locates the stepId of a step', () => {
        const text = fs.readFileSync(path.resolve(__dirname, '../../src/test/fixtures/v1.1/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml'), 'utf8');
        const { yamlDoc } = parseArazzo(text);
        const range = findStepRange(yamlDoc, 'orderToCash', 'capturePayment');
        assert.ok(range, 'range found');
        assert.strictEqual(text.slice(range!.start, range!.end), 'capturePayment');
        assert.ok(text.slice(range!.stepStart).startsWith('stepId: capturePayment'));
        assert.strictEqual(findStepRange(yamlDoc, 'orderToCash', 'nope'), undefined);
        assert.strictEqual(findStepRange(yamlDoc, 'nope', 'capturePayment'), undefined);
    });

    test('Flowchart panel: loadLocalSources reads local OpenAPI sources only', async () => {
        const dir = path.resolve(__dirname, '../../src/test/fixtures/v1.1/e2e-order-to-cash');
        const uri = vscode.Uri.file(path.join(dir, 'e2e-order-to-cash.arazzo.yaml'));
        const sources = await loadLocalSources(uri, {
            sourceDescriptions: [
                { name: 'commerce', url: './openapi.yaml', type: 'openapi' },
                { name: 'orderEvents', url: './asyncapi.yaml', type: 'asyncapi' },
                { name: 'remote', url: 'https://example.com/openapi.yaml', type: 'openapi' },
                { name: 'missing', url: './missing.yaml', type: 'openapi' },
            ],
        });
        assert.deepStrictEqual(Object.keys(sources), ['commerce']);
        assert.ok((sources.commerce as { paths?: object }).paths, 'parsed OpenAPI');
    });

    test('Flowchart panel: loadLocalSources skips directories and non-regular files', async function () {
        const dir = path.resolve(__dirname, '../../src/test/fixtures/v1.1/e2e-order-to-cash');
        const uri = vscode.Uri.file(path.join(dir, 'e2e-order-to-cash.arazzo.yaml'));
        const sourceDescriptions = [
            { name: 'dir', url: '.', type: 'openapi' },
            { name: 'commerce', url: './openapi.yaml', type: 'openapi' },
        ];
        if (process.platform !== 'win32' && fs.existsSync('/dev/zero')) {
            // size 0 for stat, endless for read: must be skipped, not read
            sourceDescriptions.push({ name: 'device', url: 'file:///dev/zero', type: 'openapi' });
        }
        const sources = await loadLocalSources(uri, { sourceDescriptions });
        assert.deepStrictEqual(Object.keys(sources), ['commerce']);
    });

    test('Flowchart panel: updateSelection with a stepId is a no-op when no panel exists', () => {
        const fakeUri = vscode.Uri.parse('file:///fake/nonexistent6.arazzo.yaml');
        ArazzoFlowchartPanel.updateSelection(fakeUri, 'testWorkflow', 'step1');
        assert.strictEqual(ArazzoFlowchartPanel.panels.has(fakeUri.toString()), false);
    });

    test('Flowchart panel: revealStep moves the editor cursor to the step', async () => {
        const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/v1.1/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml');
        const fixtureUri = vscode.Uri.file(fixturePath);
        const extensionUri = vscode.extensions.getExtension('connethics.arazzo-vscode')?.extensionUri
            || vscode.Uri.file(path.resolve(__dirname, '../../'));
        const doc = await vscode.workspace.openTextDocument(fixtureUri);
        await vscode.window.showTextDocument(doc);
        ArazzoFlowchartPanel.createOrShow(extensionUri, fixtureUri);
        const panel = ArazzoFlowchartPanel.panels.get(fixtureUri.toString())!;
        try {
            assert.strictEqual(await panel.revealStep('orderToCash', 'closeOrder', false), true);
            const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === fixtureUri.toString())!;
            assert.strictEqual(doc.getText(editor.selection), 'closeOrder');
            assert.strictEqual(await panel.revealStep('orderToCash', 'unknownStep', false), false);
        } finally {
            panel.dispose();
        }
    });
});
