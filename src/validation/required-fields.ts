import * as vscode from 'vscode';
import { isMap, isSeq, isScalar } from 'yaml';

export function validateArazzo(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
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

export function validateStep(step: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    checkRequired(step, ['stepId'], document, diagnostics);

    const hasOperation = step.has('operationId') || step.has('operationPath') || step.has('workflowId');
    if (!hasOperation) {
        addDiagnostic(step, 'Step must contain one of "operationId", "operationPath", or "workflowId"', document, diagnostics);
    }
}

export function checkRequired(node: any, fields: string[], document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    fields.forEach(field => {
        if (!node.has(field)) {
            addDiagnostic(node, `Missing required field: ${field}`, document, diagnostics);
        }
    });
}

export function addDiagnostic(node: any, message: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const rangeStart = node.range?.[0] || 0;
    const rangeEnd = node.range?.[2] || node.range?.[1] || 0;
    const range = new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd));
    diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
}
