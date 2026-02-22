import * as vscode from 'vscode';
import { parseDocument, isMap, isSeq, isPair, isScalar, Scalar } from 'yaml';

export class YamlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        const text = document.getText();
        try {
            const yamlDoc = parseDocument(text);

            if (yamlDoc.errors.length > 0) {
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
