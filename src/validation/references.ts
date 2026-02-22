import * as vscode from 'vscode';
import { isMap, isSeq, isScalar } from 'yaml';

export function validateDependsOn(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const workflows = root.get('workflows', true);
    if (!workflows || !isSeq(workflows)) {
        return;
    }

    const workflowIds = new Set<string>();
    for (const workflow of workflows.items) {
        if (isMap(workflow)) {
            const idNode = workflow.get('workflowId', true);
            if (idNode && isScalar(idNode)) {
                workflowIds.add(String(idNode.value));
            }
        }
    }

    for (const workflow of workflows.items) {
        if (!isMap(workflow)) {
            continue;
        }
        const dependsOn = workflow.get('dependsOn', true);
        if (!dependsOn || !isSeq(dependsOn)) {
            continue;
        }

        for (const dep of dependsOn.items) {
            if (isScalar(dep)) {
                const depId = String(dep.value);
                if (!workflowIds.has(depId)) {
                    const rangeStart = dep.range?.[0] || 0;
                    const rangeEnd = dep.range?.[1] || rangeStart;
                    const diag = new vscode.Diagnostic(
                        new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd)),
                        `Referenced workflow "${depId}" not found in dependsOn`,
                        vscode.DiagnosticSeverity.Error
                    );
                    diag.code = 'arazzo-ref-dependsOn';
                    diagnostics.push(diag);
                }
            }
        }
    }
}

export function validateSourceType(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    const sourceDescriptions = root.get('sourceDescriptions', true);
    if (!sourceDescriptions || !isSeq(sourceDescriptions)) {
        return;
    }

    for (const item of sourceDescriptions.items) {
        if (!isMap(item)) {
            continue;
        }
        const typeNode = item.get('type', true);
        if (typeNode && isScalar(typeNode)) {
            const val = String(typeNode.value);
            if (val !== 'openapi' && val !== 'arazzo') {
                const rangeStart = typeNode.range?.[0] || 0;
                const rangeEnd = typeNode.range?.[1] || rangeStart;
                const diag = new vscode.Diagnostic(
                    new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd)),
                    `Source type must be "openapi" or "arazzo", got "${val}"`,
                    vscode.DiagnosticSeverity.Error
                );
                diag.code = 'arazzo-source-type';
                diagnostics.push(diag);
            }
        }
    }
}

export function validateDuplicateStepIds(root: any, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
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

        const seenIds = new Map<string, number>();
        for (const step of steps.items) {
            if (!isMap(step)) {
                continue;
            }
            const idNode = step.get('stepId', true);
            if (idNode && isScalar(idNode)) {
                const stepId = String(idNode.value);
                const count = (seenIds.get(stepId) || 0) + 1;
                seenIds.set(stepId, count);

                if (count > 1) {
                    const rangeStart = idNode.range?.[0] || 0;
                    const rangeEnd = idNode.range?.[1] || rangeStart;
                    const diag = new vscode.Diagnostic(
                        new vscode.Range(document.positionAt(rangeStart), document.positionAt(rangeEnd)),
                        `Duplicate stepId "${stepId}" in workflow`,
                        vscode.DiagnosticSeverity.Error
                    );
                    diag.code = 'arazzo-duplicate-stepId';
                    diagnostics.push(diag);
                }
            }
        }
    }
}
