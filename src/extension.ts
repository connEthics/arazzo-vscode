import * as vscode from 'vscode';
import { parseDocument, isMap, isSeq, isPair, isScalar, Scalar } from 'yaml';

export function activate(context: vscode.ExtensionContext) {
    console.log('Arazzo VSCode extension is active');

    const symbolProvider = new YamlDocumentSymbolProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider({ language: 'yaml' }, symbolProvider)
    );

    const completionProvider = new YamlCompletionItemProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ language: 'yaml' }, completionProvider, ':', ' ')
    );

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('arazzo-yaml');
    context.subscriptions.push(diagnosticCollection);

    const validate = (document: vscode.TextDocument) => {
        if (document.languageId !== 'yaml') {
            return;
        }
        const yamlDoc = parseDocument(document.getText());
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const error of yamlDoc.errors) {
            const range = new vscode.Range(
                document.positionAt(error.pos[0]),
                document.positionAt(error.pos[1])
            );
            diagnostics.push(new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Error));
        }

        if (yamlDoc.contents && isMap(yamlDoc.contents)) {
            validateArazzo(yamlDoc.contents, document, diagnostics);
        }
        
        diagnosticCollection.set(document.uri, diagnostics);
    };

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(validate));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => validate(e.document)));
    
    if (vscode.window.activeTextEditor) {
        validate(vscode.window.activeTextEditor.document);
    }
}

class YamlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        const text = document.getText();
        try {
            const yamlDoc = parseDocument(text);
            
            if (yamlDoc.errors.length > 0) {
                // Avoid logging complex objects to console to prevent TreeError in DebugRepl
                console.warn(`Arazzo VSCode: ${yamlDoc.errors.length} YAML Syntax Errors found.`);
            }

            if (!yamlDoc.contents) {
                return [];
            }

            return this.parseNode(yamlDoc.contents, document);
        } catch (e) {
            console.error('Arazzo VSCode: Error parsing YAML for symbols', e);
            return [];
        }
    }

    private parseNode(node: any, document: vscode.TextDocument, contextKey?: string): vscode.DocumentSymbol[] {
        if (!node) {
            return [];
        }
        
        const symbols: vscode.DocumentSymbol[] = [];

        if (isMap(node)) {
            for (const pair of node.items) {
                if (isPair(pair)) {
                    const keyNode = pair.key as Scalar;
                    const valueNode = pair.value;
                    
                    if (isScalar(keyNode)) {
                        const key = String(keyNode.value);
                        
                        let rangeStart = 0;
                        let rangeEnd = 0;

                        if ((pair as any).range) {
                            rangeStart = (pair as any).range[0];
                            rangeEnd = (pair as any).range[2] || (pair as any).range[1];
                        } else {
                            rangeStart = keyNode.range?.[0] || 0;
                            const valRange = (valueNode as any)?.range;
                            rangeEnd = valRange?.[2] || valRange?.[1] || (keyNode.range?.[1] || 0);
                        }

                        // Safety checks for range
                        if (typeof rangeStart !== 'number' || isNaN(rangeStart)) {
                            rangeStart = 0;
                        }
                        if (typeof rangeEnd !== 'number' || isNaN(rangeEnd)) {
                            rangeEnd = rangeStart;
                        }
                        if (rangeEnd < rangeStart) {
                            rangeEnd = rangeStart;
                        }

                        const selectionStart = keyNode.range?.[0] || rangeStart;
                        const selectionEnd = keyNode.range?.[1] || rangeStart;

                        const range = new vscode.Range(
                            document.positionAt(rangeStart),
                            document.positionAt(rangeEnd)
                        );
                        const selectionRange = new vscode.Range(
                            document.positionAt(selectionStart),
                            document.positionAt(selectionEnd)
                        );

                        let kind = vscode.SymbolKind.Field;
                        if (key === 'workflows') {
                            kind = vscode.SymbolKind.Class;
                        } else if (key === 'steps') {
                            kind = vscode.SymbolKind.Method;
                        } else if (key === 'sourceDescriptions') {
                            kind = vscode.SymbolKind.Module;
                        }

                        const symbol = new vscode.DocumentSymbol(
                            key,
                            '',
                            kind,
                            range,
                            range.contains(selectionRange) ? selectionRange : range
                        );

                        symbol.children = this.parseNode(valueNode, document, key);
                        symbols.push(symbol);
                    }
                }
            }
        } else if (isSeq(node)) {
             node.items.forEach((item: any, index: number) => {
                if (item) {
                    let rangeStart = item.range?.[0] || 0;
                    let rangeEnd = item.range?.[2] || item.range?.[1] || 0;
                    
                    if (typeof rangeStart !== 'number' || isNaN(rangeStart)) {
                        rangeStart = 0;
                    }
                    if (typeof rangeEnd !== 'number' || isNaN(rangeEnd)) {
                        rangeEnd = rangeStart;
                    }
                    if (rangeEnd < rangeStart) {
                        rangeEnd = rangeStart;
                    }

                    const range = new vscode.Range(
                        document.positionAt(rangeStart),
                        document.positionAt(rangeEnd)
                    );

                    let name = String(index);
                    let detail = '';
                    let kind = vscode.SymbolKind.Array;

                    if (isMap(item)) {
                        if (contextKey === 'workflows') {
                            const idNode = item.get('workflowId', true);
                            if (idNode && isScalar(idNode)) {
                                name = String(idNode.value);
                                kind = vscode.SymbolKind.Class;
                                const summary = item.get('summary', true);
                                if (summary && isScalar(summary)) {
                                    detail = String(summary.value);
                                }
                            }
                        } else if (contextKey === 'steps') {
                            const idNode = item.get('stepId', true);
                            if (idNode && isScalar(idNode)) {
                                name = String(idNode.value);
                                kind = vscode.SymbolKind.Function;
                                const description = item.get('description', true);
                                if (description && isScalar(description)) {
                                    detail = String(description.value);
                                }
                            }
                        } else if (contextKey === 'sourceDescriptions') {
                            const nameNode = item.get('name', true);
                            if (nameNode && isScalar(nameNode)) {
                                name = String(nameNode.value);
                                kind = vscode.SymbolKind.Interface;
                            }
                        }
                    }

                    const symbol = new vscode.DocumentSymbol(
                        name,
                        detail,
                        kind,
                        range,
                        range
                    );
                    symbol.children = this.parseNode(item, document);
                    symbols.push(symbol);
                }
             });
        }

        return symbols;
    }
}

class YamlCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        if (!linePrefix.endsWith(': ')) {
            return undefined;
        }

        return [
            new vscode.CompletionItem('true', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('false', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('null', vscode.CompletionItemKind.Keyword),
        ];
    }
}

export function deactivate() {}

function validateArazzo(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const requiredRoot = ['arazzo', 'info', 'sourceDescriptions', 'workflows'];
    checkRequired(root, requiredRoot, document, diagnostics);

    const info = root.get('info', true);
    if (info && isMap(info)) {
        checkRequired(info, ['title', 'version'], document, diagnostics);
    }

    const sourceDescriptions = root.get('sourceDescriptions', true);
    if (sourceDescriptions) {
        if (isSeq(sourceDescriptions)) {
            if (sourceDescriptions.items.length === 0) {
                addDiagnostic(sourceDescriptions, 'sourceDescriptions must have at least one entry', document, diagnostics);
            }
            sourceDescriptions.items.forEach((item: any) => {
                if (isMap(item)) {
                    checkRequired(item, ['name', 'url'], document, diagnostics);
                    const type = item.get('type', true);
                    if (type && isScalar(type)) {
                        const val = String(type.value);
                        if (val !== 'openapi' && val !== 'arazzo') {
                            addDiagnostic(type, 'Type must be "openapi" or "arazzo"', document, diagnostics);
                        }
                    }
                }
            });
        } else {
            addDiagnostic(sourceDescriptions, 'sourceDescriptions must be an array', document, diagnostics);
        }
    }

    const workflows = root.get('workflows', true);
    if (workflows) {
        if (isSeq(workflows)) {
            if (workflows.items.length === 0) {
                addDiagnostic(workflows, 'workflows must have at least one entry', document, diagnostics);
            }
            workflows.items.forEach((workflow: any) => {
                if (isMap(workflow)) {
                    checkRequired(workflow, ['workflowId', 'steps'], document, diagnostics);
                    
                    const steps = workflow.get('steps', true);
                    if (steps) {
                        if (isSeq(steps)) {
                            if (steps.items.length === 0) {
                                addDiagnostic(steps, 'steps must have at least one entry', document, diagnostics);
                            }
                            steps.items.forEach((step: any) => {
                                if (isMap(step)) {
                                    validateStep(step, document, diagnostics);
                                }
                            });
                        } else {
                            addDiagnostic(steps, 'steps must be an array', document, diagnostics);
                        }
                    }
                }
            });
        } else {
            addDiagnostic(workflows, 'workflows must be an array', document, diagnostics);
        }
    }
}

function validateStep(step: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    checkRequired(step, ['stepId'], document, diagnostics);
    
    const hasOperation = step.has('operationId') || step.has('operationPath') || step.has('workflowId');
    if (!hasOperation) {
        addDiagnostic(step, 'Step must contain one of "operationId", "operationPath", or "workflowId"', document, diagnostics);
    }
}

function checkRequired(node: any, fields: string[], document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    fields.forEach(field => {
        if (!node.has(field)) {
            addDiagnostic(node, `Missing required field: ${field}`, document, diagnostics);
        }
    });
}

function addDiagnostic(node: any, message: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const rangeStart = node.range?.[0] || 0;
    const rangeEnd = node.range?.[2] || node.range?.[1] || 0;
    const range = new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd));
    diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
}

