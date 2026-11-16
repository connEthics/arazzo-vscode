import * as vscode from 'vscode';

/**
 * Polling-based wait utility for VS Code extension tests.
 * Replaces fixed setTimeout delays with condition-based waiting.
 */
export async function waitFor(
    predicate: () => boolean,
    timeoutMs = 5000,
    intervalMs = 50
): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error(`waitFor timed out after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

/** Rule id of a diagnostic (`code` is `{ value, target }` when the rule links to the spec). */
export function codeOf(d: vscode.Diagnostic): string | undefined {
    if (d.code === undefined) {
        return undefined;
    }
    return typeof d.code === 'object' ? String(d.code.value) : String(d.code);
}

/** Diagnostics with the given rule id. */
export function withCode(diagnostics: readonly vscode.Diagnostic[], code: string): vscode.Diagnostic[] {
    return diagnostics.filter(d => codeOf(d) === code);
}

export function errorsOf(diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] {
    return diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
}

export function describe(diagnostics: readonly vscode.Diagnostic[]): string {
    return diagnostics.map(d => `${codeOf(d)}@${d.range.start.line}: ${d.message}`).join('\n');
}

/** Make sure the extension is active (validation runs on open once it is). */
export async function ensureActivated(): Promise<void> {
    const ext = vscode.extensions.getExtension('connethics.arazzo-vscode');
    if (ext && !ext.isActive) {
        await ext.activate();
    }
}

/**
 * Diagnostics of a document once validation has settled: waits for the
 * extension, then for `predicate` (default: any Arazzo diagnostic) or `settleMs`.
 */
export async function settledDiagnostics(
    uri: vscode.Uri,
    predicate?: (diagnostics: vscode.Diagnostic[]) => boolean,
    settleMs = 600
): Promise<vscode.Diagnostic[]> {
    await ensureActivated();
    if (predicate) {
        await waitFor(() => predicate(vscode.languages.getDiagnostics(uri)));
    } else {
        await new Promise(resolve => setTimeout(resolve, settleMs));
    }
    return vscode.languages.getDiagnostics(uri);
}

export function labelsOf(list: vscode.CompletionList | undefined): string[] {
    return (list?.items ?? []).map(i => typeof i.label === 'string' ? i.label : i.label.label);
}

/** Completion labels at the end of the last line of an untitled YAML document. */
export async function completionLabelsAtEnd(content: string): Promise<string[]> {
    const doc = await vscode.workspace.openTextDocument({ content, language: 'yaml' });
    await vscode.window.showTextDocument(doc);
    await ensureActivated();
    const lastLine = doc.lineCount - 1;
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        doc.uri,
        new vscode.Position(lastLine, doc.lineAt(lastLine).text.length)
    );
    return labelsOf(list);
}
