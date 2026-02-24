import * as vscode from 'vscode';
import { parseDocument, isMap, isSeq, isScalar, Document } from 'yaml';
import type { ParseCache } from './parse-cache';

const KNOWN_ARAZZO_VERSIONS = ['1.0.0', '1.0.1'];

/**
 * Check if a YAML document root contains an `arazzo` key,
 * indicating it is an Arazzo specification file.
 */
export function isArazzoDocument(root: unknown): boolean {
    if (!root || !isMap(root)) {
        return false;
    }
    return root.has('arazzo');
}

/**
 * Get the Arazzo version value from a document root.
 * Returns null if the document is not an Arazzo document.
 */
export function getArazzoVersion(root: unknown): string | null {
    if (!root || !isMap(root)) {
        return null;
    }
    const versionNode = root.get('arazzo', true);
    if (versionNode && isScalar(versionNode)) {
        return String(versionNode.value);
    }
    return null;
}

/**
 * Check if the given version is a recognized Arazzo version.
 */
export function isKnownArazzoVersion(version: string): boolean {
    return KNOWN_ARAZZO_VERSIONS.includes(version);
}

/**
 * Detect which workflow the cursor is in and update the flowchart panel selection.
 */
export function detectAndSelectWorkflow(
    editor: vscode.TextEditor,
    updateSelection: (resourceUri: vscode.Uri, workflowId: string) => void,
    cache?: ParseCache
): void {
    try {
        const yamlDoc = cache ? cache.get(editor.document).parsed : parseDocument(editor.document.getText());
        const cursorLine = editor.selection.active.line;

        if (!yamlDoc.contents || !isMap(yamlDoc.contents)) {
            return;
        }

        if (!isArazzoDocument(yamlDoc.contents)) {
            return;
        }

        const workflows = yamlDoc.contents.get('workflows', true);
        if (workflows && isSeq(workflows)) {
            for (const item of workflows.items) {
                if (isMap(item)) {
                    const range = (item as any).range as number[] | undefined;
                    if (range) {
                        const startLine = editor.document.positionAt(range[0]).line;
                        const endLine = editor.document.positionAt(range[2] || range[1]).line;

                        if (cursorLine >= startLine && cursorLine <= endLine) {
                            const workflowIdNode = item.get('workflowId', true);
                            if (workflowIdNode && isScalar(workflowIdNode)) {
                                const workflowId = String(workflowIdNode.value);
                                updateSelection(editor.document.uri, workflowId);
                                return;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error detecting workflow', e);
    }
}
