import * as vscode from 'vscode';
import { parseDocument, Document } from 'yaml';
import { isArazzoDocument, getArazzoVersion } from './arazzo-detection';

export interface ParseCacheEntry {
    version: number;
    parsed: Document;
    json: any;
    isArazzo: boolean;
    arazzoVersion: string | null;
}

export class ParseCache {
    private cache = new Map<string, ParseCacheEntry>();

    get(document: vscode.TextDocument): ParseCacheEntry {
        const key = document.uri.toString();
        const existing = this.cache.get(key);
        if (existing && existing.version === document.version) {
            return existing;
        }

        const parsed = parseDocument(document.getText(), { keepSourceTokens: true });
        const isArazzo = !!(parsed.contents && isArazzoDocument(parsed.contents));
        const arazzoVersion = parsed.contents ? getArazzoVersion(parsed.contents) : null;

        const entry: ParseCacheEntry = {
            version: document.version,
            parsed,
            json: parsed.toJSON(),
            isArazzo,
            arazzoVersion,
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
