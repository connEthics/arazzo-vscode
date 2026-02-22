import * as vscode from 'vscode';
import { parseDocument, isMap } from 'yaml';
import { isArazzoDocument } from '../arazzo-detection';
import { ParseCache } from '../parse-cache';
import { validateArazzoVersion } from './version-check';
import { validateArazzo } from './required-fields';
import { validateMutualExclusivity } from './mutual-exclusivity';
import { validateDependsOn, validateSourceType, validateDuplicateStepIds } from './references';

export { validateArazzo, validateStep, checkRequired, addDiagnostic } from './required-fields';
export { validateArazzoVersion } from './version-check';
export { validateMutualExclusivity } from './mutual-exclusivity';
export { validateDependsOn, validateSourceType, validateDuplicateStepIds } from './references';

export function runValidation(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
    cache?: ParseCache
): void {
    if (document.languageId !== 'yaml') {
        return;
    }

    const yamlDoc = cache ? cache.get(document).parsed : parseDocument(document.getText());

    if (!yamlDoc.contents || !isMap(yamlDoc.contents) || !isArazzoDocument(yamlDoc.contents)) {
        diagnosticCollection.delete(document.uri);
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    for (const error of yamlDoc.errors) {
        const range = new vscode.Range(
            document.positionAt(error.pos[0]),
            document.positionAt(error.pos[1])
        );
        diagnostics.push(new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Error));
    }

    validateArazzoVersion(yamlDoc.contents, document, diagnostics);
    validateArazzo(yamlDoc.contents, document, diagnostics);
    validateMutualExclusivity(yamlDoc.contents, document, diagnostics);
    validateDependsOn(yamlDoc.contents, document, diagnostics);
    validateSourceType(yamlDoc.contents, document, diagnostics);
    validateDuplicateStepIds(yamlDoc.contents, document, diagnostics);

    diagnosticCollection.set(document.uri, diagnostics);
}
