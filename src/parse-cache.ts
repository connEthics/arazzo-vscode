import * as vscode from 'vscode';
import type { Document } from 'yaml';
import { parseArazzo, validate } from '@connethics/arazzo-core';
import type { ArazzoDocument, Diagnostic as CoreDiagnostic, ParseError } from '@connethics/arazzo-core';

export interface ParseCacheEntry {
    /** `TextDocument.version` the entry was computed for. */
    version: number;
    /** `yaml` v2 Document (source positions). */
    parsed: Document.Parsed;
    /** Plain JS value of the document (`undefined` when empty or unusable). */
    json: ArazzoDocument | undefined;
    /** YAML syntax errors and warnings. */
    errors: ParseError[];
    /** True when the root is a mapping with an `arazzo` key. */
    isArazzo: boolean;
    /** Value of the `arazzo` field, or `null`. */
    arazzoVersion: string | null;
    /** arazzo-core diagnostics, computed lazily by {@link getCoreDiagnostics}. */
    diagnostics?: CoreDiagnostic[];
}

/** One parse per document version, shared by validation, completion, symbols, code actions and panels. */
export class ParseCache {
    private cache = new Map<string, ParseCacheEntry>();

    get(document: vscode.TextDocument): ParseCacheEntry {
        const key = document.uri.toString();
        const existing = this.cache.get(key);
        if (existing && existing.version === document.version) {
            return existing;
        }

        const result = parseArazzo(document.getText());
        const entry: ParseCacheEntry = {
            version: document.version,
            parsed: result.yamlDoc,
            json: result.doc,
            errors: result.errors,
            isArazzo: result.isArazzo,
            arazzoVersion: result.version,
        };

        this.cache.set(key, entry);
        return entry;
    }

    invalidate(uri: string): void {
        this.cache.delete(uri);
    }

    delete(uri: string): void {
        this.cache.delete(uri);
    }
}

/** arazzo-core diagnostics of an entry (schema + semantic layers), memoized on the entry. */
export function getCoreDiagnostics(entry: ParseCacheEntry): CoreDiagnostic[] {
    if (!entry.diagnostics) {
        entry.diagnostics = entry.isArazzo && entry.json !== undefined
            ? validate(entry.json, { yamlDoc: entry.parsed })
            : [];
    }
    return entry.diagnostics;
}

export function createDebouncedHandler(
    cache: ParseCache,
    callback: (document: vscode.TextDocument, entry: ParseCacheEntry) => void,
    delayMs = 250
): (document: vscode.TextDocument) => void {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    return (document: vscode.TextDocument) => {
        const key = document.uri.toString();
        const existing = timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        timers.set(key, setTimeout(() => {
            timers.delete(key);
            const entry = cache.get(document);
            callback(document, entry);
        }, delayMs));
    };
}
