import * as vscode from 'vscode';
import { isMap, isPair, isScalar } from 'yaml';
import type { Pair, YAMLMap } from 'yaml';
import { LATEST_ARAZZO_VERSION, locate } from '../arazzo-core';
import type { Diagnostic as CoreDiagnostic, JsonPath } from '../arazzo-core';
import { ParseCache, ParseCacheEntry, getCoreDiagnostics } from '../parse-cache';
import { DIAGNOSTIC_SOURCE, coreDiagnosticRange, diagnosticCode } from '../validation/index';

export const MIGRATE_COMMAND = 'arazzo-vscode.migrateTo11';
export const SELECT_SELF_COMMAND = 'arazzo-vscode.selectSelfValue';

export const MIGRATE_TITLE = `Migrate to Arazzo ${LATEST_ARAZZO_VERSION}`;
export const ADD_SELF_TITLE = 'Add "$self" (canonical URI of this document)';

/** Diagnostics fixed by the migration. */
const MIGRATION_CODES = new Set(['arazzo-version', 'arazzo-version-format', 'arazzo-version-feature-mismatch']);

/** Unresolved references for which a "did you mean" fix is offered. */
const REFERENCE_CODES = new Set(['arazzo-action-goto-step-exists', 'arazzo-step-depends-on-resolved', 'arazzo-action-goto-workflow-exists']);

const DOTTED_EXPRESSION_RE = /^"(.+)" is not valid runtime expression syntax: use a JSON Pointer after "#" \(e\.g\. "(.+)"\)$/;

function rootPair(root: YAMLMap, key: string): Pair | undefined {
    return root.items.find((p): p is Pair => isPair(p) && isScalar(p.key) && String(p.key.value) === key);
}

/** Suggested `$self` value, to be edited by the author. */
export function suggestedSelf(document: vscode.TextDocument): string {
    const base = document.uri.path.split('/').pop() ?? '';
    const file = /\.(ya?ml|json)$/i.test(base) ? base : 'workflow.arazzo.yaml';
    return `https://example.com/arazzo/${file}`;
}

/** Edits inserting `$self` after the `arazzo` entry (block mappings only). */
function selfInsertion(document: vscode.TextDocument, root: YAMLMap, edit: vscode.WorkspaceEdit): boolean {
    if (root.flow || root.has('$self')) {
        return false;
    }
    const arazzo = rootPair(root, 'arazzo');
    const keyStart = (arazzo?.key as { range?: number[] } | undefined)?.range?.[0] ?? 0;
    const anchor = document.positionAt(keyStart);
    const indent = document.lineAt(anchor.line).text.slice(0, anchor.character);
    const at = anchor.line + 1 < document.lineCount
        ? new vscode.Position(anchor.line + 1, 0)
        : document.lineAt(anchor.line).range.end;
    const prefix = at.character === 0 ? '' : '\n';
    edit.insert(document.uri, at, `${prefix}${indent}$self: ${suggestedSelf(document)}\n`);
    return true;
}

/** Edit migrating a document to Arazzo 1.1.0: bump `arazzo` and add a suggested `$self`. */
export function buildMigrationEdit(document: vscode.TextDocument, entry: ParseCacheEntry): vscode.WorkspaceEdit | undefined {
    const root = entry.parsed.contents;
    if (!root || !isMap(root)) {
        return undefined;
    }
    const edit = new vscode.WorkspaceEdit();
    const arazzo = rootPair(root, 'arazzo');
    if (!arazzo) {
        return undefined;
    }
    const value = arazzo.value;
    if (isScalar(value) && value.range) {
        if (String(value.value) !== LATEST_ARAZZO_VERSION) {
            const range = new vscode.Range(document.positionAt(value.range[0]), document.positionAt(value.range[1]));
            const original = document.getText(range);
            const quote = /^["']/.test(original) ? original[0] : '';
            edit.replace(document.uri, range, `${quote}${LATEST_ARAZZO_VERSION}${quote}`);
        }
    } else {
        const keyEnd = (arazzo.key as { range?: number[] } | undefined)?.range?.[1] ?? 0;
        const after = document.positionAt(keyEnd);
        const colon = document.lineAt(after.line).text.indexOf(':', after.character);
        edit.insert(document.uri, new vscode.Position(after.line, colon >= 0 ? colon + 1 : after.character), ` ${LATEST_ARAZZO_VERSION}`);
    }
    selfInsertion(document, root, edit);
    return edit.size > 0 ? edit : undefined;
}

/** Levenshtein distance (small strings: identifiers). */
function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = tmp;
        }
    }
    return row[b.length];
}

/** Closest candidates to `value` (at most 3, within a third of its length). */
export function closest(value: string, candidates: string[]): string[] {
    const max = Math.max(2, Math.floor(value.length / 3));
    return [...new Set(candidates)]
        .filter(c => c !== value)
        .map(c => ({ c, d: distance(value.toLowerCase(), c.toLowerCase()) }))
        .filter(x => x.d <= max)
        .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
        .slice(0, 3)
        .map(x => x.c);
}

function valueAt(doc: unknown, path: JsonPath): unknown {
    let cur = doc;
    for (const seg of path) {
        if (cur === null || typeof cur !== 'object') {
            return undefined;
        }
        cur = (cur as Record<string | number, unknown>)[seg];
    }
    return cur;
}

export class ArazzoCodeActionProvider implements vscode.CodeActionProvider {
    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    constructor(private readonly cache: ParseCache) {}

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const entry = this.cache.get(document);
        const root = entry.parsed.contents;
        if (!entry.isArazzo || !root || !isMap(root)) {
            return [];
        }
        const actions: vscode.CodeAction[] = [];
        const ours = context.diagnostics.filter(d => d.source === DIAGNOSTIC_SOURCE);

        // 1. Migration to 1.1.0 — from a version diagnostic, or on the `arazzo` line of an older document.
        const migrationDiags = ours.filter(d => MIGRATION_CODES.has(diagnosticCode(d) ?? ''));
        const arazzoLine = this.arazzoLine(document, root);
        const onArazzoLine = arazzoLine !== undefined && range.start.line <= arazzoLine && range.end.line >= arazzoLine;
        if ((migrationDiags.length > 0 || onArazzoLine) && entry.arazzoVersion !== LATEST_ARAZZO_VERSION) {
            const edit = buildMigrationEdit(document, entry);
            if (edit) {
                const action = new vscode.CodeAction(MIGRATE_TITLE, vscode.CodeActionKind.QuickFix);
                action.edit = edit;
                action.diagnostics = migrationDiags;
                action.isPreferred = migrationDiags.length > 0;
                action.command = { command: SELECT_SELF_COMMAND, title: 'Select $self', arguments: [document.uri] };
                actions.push(action);
            }
        }

        // 2. `$self` recommended (1.1 document without `$self`).
        for (const d of ours.filter(d => diagnosticCode(d) === 'arazzo-self-recommended')) {
            const edit = new vscode.WorkspaceEdit();
            if (selfInsertion(document, root, edit)) {
                const action = new vscode.CodeAction(ADD_SELF_TITLE, vscode.CodeActionKind.QuickFix);
                action.edit = edit;
                action.diagnostics = [d];
                action.isPreferred = true;
                action.command = { command: SELECT_SELF_COMMAND, title: 'Select $self', arguments: [document.uri] };
                actions.push(action);
            }
        }

        // 3. Unresolved step / workflow reference: "did you mean".
        for (const d of ours.filter(d => REFERENCE_CODES.has(diagnosticCode(d) ?? ''))) {
            const core = this.coreDiagnosticFor(document, entry, d);
            if (!core) {
                continue;
            }
            const value = valueAt(entry.json, core.path);
            if (typeof value !== 'string' || value.startsWith('$')) {
                continue;
            }
            for (const candidate of closest(value, this.candidatesFor(entry, core))) {
                const target = locate(entry.parsed, core.path);
                if (!target?.exact) {
                    continue;
                }
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, new vscode.Range(document.positionAt(target.start), document.positionAt(target.end)), candidate);
                const action = new vscode.CodeAction(`Change to "${candidate}"`, vscode.CodeActionKind.QuickFix);
                action.edit = edit;
                action.diagnostics = [d];
                actions.push(action);
            }
        }

        // 4. `$response.body.a.b` → `$response.body#/a/b`.
        for (const d of ours.filter(d => diagnosticCode(d) === 'arazzo-expression-syntax')) {
            const m = DOTTED_EXPRESSION_RE.exec(d.message);
            if (!m) {
                continue;
            }
            const text = document.getText(d.range);
            const at = text.indexOf(m[1]);
            if (at < 0) {
                continue;
            }
            const start = document.positionAt(document.offsetAt(d.range.start) + at);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(start, start.translate(0, m[1].length)), m[2]);
            const action = new vscode.CodeAction(`Use JSON Pointer: ${m[2]}`, vscode.CodeActionKind.QuickFix);
            action.edit = edit;
            action.diagnostics = [d];
            action.isPreferred = true;
            actions.push(action);
        }

        return actions;
    }

    private arazzoLine(document: vscode.TextDocument, root: YAMLMap): number | undefined {
        const start = (rootPair(root, 'arazzo')?.key as { range?: number[] } | undefined)?.range?.[0];
        return start === undefined ? undefined : document.positionAt(start).line;
    }

    /** The arazzo-core diagnostic behind a VS Code diagnostic (same rule, same range). */
    private coreDiagnosticFor(document: vscode.TextDocument, entry: ParseCacheEntry, d: vscode.Diagnostic): CoreDiagnostic | undefined {
        const code = diagnosticCode(d);
        return getCoreDiagnostics(entry).find(c => c.code === code && coreDiagnosticRange(document, entry, c).isEqual(d.range));
    }

    private candidatesFor(entry: ParseCacheEntry, d: CoreDiagnostic): string[] {
        const doc = entry.json;
        const workflows = Array.isArray(doc?.workflows) ? doc.workflows : [];
        if (d.code === 'arazzo-action-goto-workflow-exists') {
            return workflows.map(w => w?.workflowId).filter((id): id is string => typeof id === 'string');
        }
        if (d.path[0] !== 'workflows' || typeof d.path[1] !== 'number') {
            return [];
        }
        const steps = workflows[d.path[1]]?.steps;
        return (Array.isArray(steps) ? steps : []).map(s => s?.stepId).filter((id): id is string => typeof id === 'string');
    }
}

/** Select the `$self` value so that the suggested URI can be edited right away. */
export function selectSelfValue(cache: ParseCache, uri?: vscode.Uri): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || (uri && editor.document.uri.toString() !== uri.toString())) {
        return;
    }
    const target = locate(cache.get(editor.document).parsed, ['$self']);
    if (target?.exact) {
        const range = new vscode.Range(editor.document.positionAt(target.start), editor.document.positionAt(target.end));
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range);
    }
}

/** Command: migrate the active document to Arazzo 1.1.0. */
export async function migrateActiveDocument(cache: ParseCache): Promise<void> {
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
    const edit = buildMigrationEdit(editor.document, entry);
    if (!edit) {
        vscode.window.showInformationMessage(`This document already targets Arazzo ${LATEST_ARAZZO_VERSION}.`);
        return;
    }
    if (await vscode.workspace.applyEdit(edit)) {
        selectSelfValue(cache, editor.document.uri);
    }
}
