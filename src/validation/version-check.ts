import * as vscode from 'vscode';
import { isMap, isScalar } from 'yaml';
import { getArazzoVersion, isKnownArazzoVersion } from '../arazzo-detection';

/**
 * Check the Arazzo version and produce a warning diagnostic if unrecognized.
 */
export function validateArazzoVersion(
    root: unknown,
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
): void {
    if (!root || !isMap(root)) {
        return;
    }

    const version = getArazzoVersion(root);
    if (version === null) {
        return;
    }

    if (!isKnownArazzoVersion(version)) {
        const versionNode = root.get('arazzo', true);
        if (versionNode && isScalar(versionNode)) {
            const rangeStart = versionNode.range?.[0] || 0;
            const rangeEnd = versionNode.range?.[1] || rangeStart;
            const range = new vscode.Range(
                document.positionAt(rangeStart),
                document.positionAt(rangeEnd)
            );
            const diagnostic = new vscode.Diagnostic(
                range,
                `Unrecognized Arazzo version: ${version}. Known versions: 1.0.0, 1.0.1`,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = 'arazzo-version';
            diagnostic.source = 'arazzo';
            diagnostics.push(diagnostic);
        }
    }
}
