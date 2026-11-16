import * as vscode from 'vscode';
import { diagnosticRange } from '@connethics/arazzo-core';
import type { Diagnostic as CoreDiagnostic, ParseError, Severity } from '@connethics/arazzo-core';
import { ParseCache, ParseCacheEntry, getCoreDiagnostics } from '../parse-cache';
import { specLinkForRule } from './spec-links';

export { specLinkForRule, SPEC_URL } from './spec-links';

/** `source` of every diagnostic produced by the extension. */
export const DIAGNOSTIC_SOURCE = 'arazzo';

const SEVERITY: Record<Severity, vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint,
};

/** Rules that flag dead content (rendered faded). */
const UNNECESSARY_CODES = new Set<string>(['arazzo-source-unused', 'arazzo-components-unused']);

/** The rule id of a VS Code diagnostic (`code` is `{ value, target }` when a spec link exists). */
export function diagnosticCode(d: vscode.Diagnostic): string | undefined {
    const code = d.code;
    if (code === undefined) {
        return undefined;
    }
    return typeof code === 'object' ? String(code.value) : String(code);
}

function toRange(document: vscode.TextDocument, start: number, end: number): vscode.Range {
    return new vscode.Range(document.positionAt(start), document.positionAt(Math.max(start, end)));
}

/** Source range of a core diagnostic (from `validate`, or re-located from its JSON path). */
export function coreDiagnosticRange(document: vscode.TextDocument, entry: ParseCacheEntry, d: CoreDiagnostic): vscode.Range {
    const r = d.range ?? diagnosticRange(entry.parsed, d.path) ?? { start: 0, end: 0 };
    return toRange(document, r.start, r.end);
}

/** Convert an arazzo-core diagnostic to a VS Code diagnostic. */
export function toVscodeDiagnostic(document: vscode.TextDocument, entry: ParseCacheEntry, d: CoreDiagnostic): vscode.Diagnostic {
    const diag = new vscode.Diagnostic(coreDiagnosticRange(document, entry, d), d.message, SEVERITY[d.severity]);
    const link = specLinkForRule(d.code);
    diag.code = link ? { value: d.code, target: vscode.Uri.parse(link) } : d.code;
    diag.source = DIAGNOSTIC_SOURCE;
    if (UNNECESSARY_CODES.has(d.code)) {
        diag.tags = [vscode.DiagnosticTag.Unnecessary];
    }
    return diag;
}

function syntaxDiagnostic(document: vscode.TextDocument, e: ParseError): vscode.Diagnostic {
    const diag = new vscode.Diagnostic(
        toRange(document, e.range.start, e.range.end),
        e.message,
        e.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    );
    diag.code = e.code;
    diag.source = DIAGNOSTIC_SOURCE;
    return diag;
}

/** All diagnostics of an Arazzo document: YAML syntax + arazzo-core (schema and semantic layers). */
export function computeDiagnostics(document: vscode.TextDocument, entry: ParseCacheEntry): vscode.Diagnostic[] {
    if (!entry.isArazzo) {
        return [];
    }
    return [
        ...entry.errors.map(e => syntaxDiagnostic(document, e)),
        ...getCoreDiagnostics(entry).map(d => toVscodeDiagnostic(document, entry, d)),
    ];
}

export function runValidation(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
    cache: ParseCache
): void {
    if (document.languageId !== 'yaml') {
        return;
    }
    const entry = cache.get(document);
    if (!entry.isArazzo) {
        diagnosticCollection.delete(document.uri);
        return;
    }
    diagnosticCollection.set(document.uri, computeDiagnostics(document, entry));
}
