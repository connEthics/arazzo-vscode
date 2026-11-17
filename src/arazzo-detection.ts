import * as vscode from 'vscode';
import { isMap, isSeq, isScalar } from 'yaml';
import {
    KNOWN_ARAZZO_VERSIONS,
    LATEST_ARAZZO_VERSION,
    isArazzoDocument as coreIsArazzoDocument,
    getArazzoVersion as coreGetArazzoVersion,
    isKnownArazzoVersion as coreIsKnownArazzoVersion,
    parseArazzo,
} from './arazzo-core';
import type { ParseCache } from './parse-cache';

/** Versions published by the OAI (`1.0.0`, `1.0.1`, `1.1.0`), re-exported from arazzo-core. */
export { KNOWN_ARAZZO_VERSIONS, LATEST_ARAZZO_VERSION };

/**
 * Check if a document root contains an `arazzo` key, indicating it is an
 * Arazzo specification file. Accepts either a `yaml` node (YAMLMap) or the
 * plain JS value of the document.
 */
export function isArazzoDocument(root: unknown): boolean {
    if (!root) {
        return false;
    }
    if (isMap(root)) {
        return root.has('arazzo');
    }
    return coreIsArazzoDocument(root);
}

/**
 * Get the Arazzo version value from a document root (`yaml` node or plain value).
 * Returns null if the document is not an Arazzo document.
 */
export function getArazzoVersion(root: unknown): string | null {
    if (!root) {
        return null;
    }
    if (isMap(root)) {
        const versionNode = root.get('arazzo', true);
        return versionNode && isScalar(versionNode) && versionNode.value !== null ? String(versionNode.value) : null;
    }
    return coreGetArazzoVersion(root);
}

/**
 * Check if the given version is a recognized Arazzo version (any `1.0.x` or `1.1.x`).
 */
export function isKnownArazzoVersion(version: string): boolean {
    return coreIsKnownArazzoVersion(version);
}

/** `stepId` of the step whose mapping contains `line`, if any. */
function stepAtLine(document: vscode.TextDocument, steps: unknown, line: number): string | undefined {
    if (!isSeq(steps)) {
        return undefined;
    }
    for (const step of steps.items) {
        if (!isMap(step) || !step.range) {
            continue;
        }
        const startLine = document.positionAt(step.range[0]).line;
        const endLine = document.positionAt(step.range[2] || step.range[1]).line;
        if (line >= startLine && line <= endLine) {
            const id = step.get('stepId', true);
            return id && isScalar(id) && id.value !== null ? String(id.value) : undefined;
        }
    }
    return undefined;
}

/**
 * Detect which workflow (and step) the cursor is in and update the flowchart panel selection.
 */
export function detectAndSelectWorkflow(
    editor: vscode.TextEditor,
    updateSelection: (resourceUri: vscode.Uri, workflowId: string, stepId?: string) => void,
    cache?: ParseCache
): void {
    try {
        const contents = cache
            ? cache.get(editor.document).parsed.contents
            : parseArazzo(editor.document.getText()).yamlDoc.contents;
        if (!contents || !isMap(contents) || !contents.has('arazzo')) {
            return;
        }

        const cursorLine = editor.selection.active.line;
        const workflows = contents.get('workflows', true);
        if (!workflows || !isSeq(workflows)) {
            return;
        }
        for (const item of workflows.items) {
            if (!isMap(item) || !item.range) {
                continue;
            }
            const startLine = editor.document.positionAt(item.range[0]).line;
            const endLine = editor.document.positionAt(item.range[2] || item.range[1]).line;
            if (cursorLine >= startLine && cursorLine <= endLine) {
                const workflowIdNode = item.get('workflowId', true);
                if (workflowIdNode && isScalar(workflowIdNode)) {
                    updateSelection(editor.document.uri, String(workflowIdNode.value), stepAtLine(editor.document, item.get('steps', true), cursorLine));
                    return;
                }
            }
        }
    } catch (e) {
        console.error('Error detecting workflow', e);
    }
}

