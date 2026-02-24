import * as vscode from 'vscode';
import { isMap, isSeq } from 'yaml';
import { addDiagnostic } from './required-fields';

export function validateMutualExclusivity(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const workflows = root.get('workflows', true);
    if (!workflows || !isSeq(workflows)) {
        return;
    }

    for (const workflow of workflows.items) {
        if (!isMap(workflow)) {
            continue;
        }
        const steps = workflow.get('steps', true);
        if (!steps || !isSeq(steps)) {
            continue;
        }

        for (const step of steps.items) {
            if (!isMap(step)) {
                continue;
            }

            const hasOperationId = step.has('operationId');
            const hasOperationPath = step.has('operationPath');
            const hasWorkflowId = step.has('workflowId');
            const count = [hasOperationId, hasOperationPath, hasWorkflowId].filter(Boolean).length;

            if (count > 1) {
                const diag = new vscode.Diagnostic(
                    getRangeForNode(step, document),
                    'Step must contain only one of "operationId", "operationPath", or "workflowId"',
                    vscode.DiagnosticSeverity.Error
                );
                diag.code = 'arazzo-mutual-exclusive';
                diagnostics.push(diag);
            }

            if (count === 0) {
                const diag = new vscode.Diagnostic(
                    getRangeForNode(step, document),
                    'Step must contain one of "operationId", "operationPath", or "workflowId"',
                    vscode.DiagnosticSeverity.Error
                );
                diag.code = 'arazzo-operation-required';
                diagnostics.push(diag);
            }
        }
    }
}

function getRangeForNode(node: any, document: vscode.TextDocument): vscode.Range {
    const rangeStart = node.range?.[0] || 0;
    const rangeEnd = node.range?.[2] || node.range?.[1] || 0;
    return new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd));
}
