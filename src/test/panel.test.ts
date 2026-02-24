import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ArazzoPreviewPanel } from '../panels/preview-panel';
import { ArazzoFlowchartPanel } from '../panels/flowchart-panel';

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
});
