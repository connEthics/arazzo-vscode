import * as vscode from 'vscode';
import { isArazzoDocument, detectAndSelectWorkflow } from './arazzo-detection';
import { ParseCache, createDebouncedHandler } from './parse-cache';
import { runValidation } from './validation/index';
import { ArazzoPreviewPanel } from './panels/preview-panel';
import { ArazzoFlowchartPanel } from './panels/flowchart-panel';
import { YamlDocumentSymbolProvider } from './providers/symbol-provider';
import { YamlCompletionItemProvider } from './providers/completion-provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Arazzo VSCode extension is active');

    const cache = new ParseCache();

    context.subscriptions.push(
        vscode.commands.registerCommand('arazzo-vscode.openPreview', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            const entry = cache.get(editor.document);
            if (!entry.isArazzo) {
                vscode.window.showInformationMessage('This file is not an Arazzo specification document.');
                return;
            }
            ArazzoPreviewPanel.createOrShow(context.extensionUri, editor.document.uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('arazzo-vscode.openFlowchart', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }
            const entry = cache.get(editor.document);
            if (!entry.isArazzo) {
                vscode.window.showInformationMessage('This file is not an Arazzo specification document.');
                return;
            }
            ArazzoFlowchartPanel.createOrShow(context.extensionUri, editor.document.uri);
        })
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider({ language: 'yaml' }, new YamlDocumentSymbolProvider())
    );

    const completionProvider = new YamlCompletionItemProvider();
    completionProvider.setCache(cache);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ language: 'yaml' }, completionProvider, ':', ' ', '$', '.')
    );

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('arazzo-yaml');
    context.subscriptions.push(diagnosticCollection);

    const debouncedValidate = createDebouncedHandler(cache, (document) => {
        runValidation(document, diagnosticCollection, cache);
        if (document.languageId === 'yaml') {
            const entry = cache.get(document);
            if (entry.isArazzo) {
                ArazzoPreviewPanel.updateFromCache(document.uri, entry.json);
                ArazzoFlowchartPanel.updateFromCache(document.uri, entry.json);
            }
        }
    });

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => runValidation(doc, diagnosticCollection, cache)));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => debouncedValidate(e.document)));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => cache.delete(doc.uri.toString())));

    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.textEditor.document.languageId === 'yaml') {
            detectAndSelectWorkflow(e.textEditor, ArazzoFlowchartPanel.updateSelection, cache);
        }
    }));

    // Validate all already-open documents (may have been opened before activation)
    vscode.workspace.textDocuments.forEach(doc => runValidation(doc, diagnosticCollection, cache));

    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'yaml') {
        detectAndSelectWorkflow(vscode.window.activeTextEditor, ArazzoFlowchartPanel.updateSelection, cache);
    }
}

export function deactivate() {}
