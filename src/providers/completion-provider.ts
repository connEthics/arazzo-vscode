import * as vscode from 'vscode';
import { isMap, isSeq, isScalar } from 'yaml';
import { ParseCache } from '../parse-cache';

export type ArazzoContext =
    | 'root'
    | 'info'
    | 'sourceDescription'
    | 'workflow'
    | 'step'
    | 'action'
    | 'successCriterion'
    | 'unknown';

const ROOT_KEYS = ['arazzo', 'info', 'sourceDescriptions', 'workflows', 'components'];
const INFO_KEYS = ['title', 'version', 'summary', 'description'];
const SOURCE_DESC_KEYS = ['name', 'url', 'type'];
const WORKFLOW_KEYS = ['workflowId', 'summary', 'description', 'inputs', 'dependsOn', 'steps', 'outputs', 'parameters', 'successActions', 'failureActions'];
const STEP_KEYS = ['stepId', 'description', 'operationId', 'operationPath', 'workflowId', 'parameters', 'requestBody', 'successCriteria', 'onSuccess', 'onFailure', 'outputs'];
const ACTION_KEYS = ['name', 'type', 'workflowId', 'stepId', 'retryAfter', 'retryLimit', 'criteria'];
const CRITERION_KEYS = ['condition', 'context', 'type'];

const RUNTIME_EXPRESSIONS = [
    '$url', '$method', '$statusCode', '$request.header.', '$request.query.', '$request.body',
    '$response.header.', '$response.body', '$inputs.', '$outputs.', '$steps.'
];

export class YamlCompletionItemProvider implements vscode.CompletionItemProvider {
    private cache?: ParseCache;

    setCache(cache: ParseCache) {
        this.cache = cache;
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (this.cache) {
            const entry = this.cache.get(document);
            if (!entry.isArazzo) {
                return undefined;
            }
        }

        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);

        const isValuePosition = /:\s+/.test(linePrefix) || linePrefix.trimStart().startsWith('- ');
        const context = this.detectContext(document, position);

        if (isValuePosition) {
            return this.getValueCompletions(linePrefix, context, document);
        }

        return this.getKeyCompletions(context, linePrefix);
    }

    private detectContext(document: vscode.TextDocument, position: vscode.Position): ArazzoContext {
        const line = position.line;

        for (let i = line; i >= 0; i--) {
            const text = document.lineAt(i).text;
            const trimmed = text.trimStart();
            const indent = text.length - trimmed.length;

            if (indent === 0 && trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
                if (trimmed.startsWith('info:')) { return 'info'; }
                if (trimmed.startsWith('sourceDescriptions:')) { return 'sourceDescription'; }
                if (trimmed.startsWith('workflows:')) { return 'workflow'; }
                if (trimmed.startsWith('arazzo:')) { return 'root'; }
                return 'root';
            }

            if (trimmed.startsWith('successCriteria:') || trimmed.startsWith('criteria:')) {
                return 'successCriterion';
            }
            if (trimmed.startsWith('onSuccess:') || trimmed.startsWith('onFailure:') ||
                trimmed.startsWith('successActions:') || trimmed.startsWith('failureActions:')) {
                return 'action';
            }
            if (trimmed.startsWith('steps:')) {
                return 'step';
            }
        }

        return 'root';
    }

    private getKeyCompletions(context: ArazzoContext, linePrefix: string): vscode.CompletionItem[] {
        let keys: string[];
        switch (context) {
            case 'root': keys = ROOT_KEYS; break;
            case 'info': keys = INFO_KEYS; break;
            case 'sourceDescription': keys = SOURCE_DESC_KEYS; break;
            case 'workflow': keys = WORKFLOW_KEYS; break;
            case 'step': keys = STEP_KEYS; break;
            case 'action': keys = ACTION_KEYS; break;
            case 'successCriterion': keys = CRITERION_KEYS; break;
            default: keys = ROOT_KEYS;
        }

        return keys.map((key, index) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);
            item.detail = 'Arazzo key';
            item.sortText = `0_${String(index).padStart(3, '0')}`;
            if (!linePrefix.includes(': ')) {
                item.insertText = `${key}: `;
            }
            return item;
        });
    }

    private getValueCompletions(linePrefix: string, context: ArazzoContext, document: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Detect the key before ": "
        const keyMatch = linePrefix.match(/(\w+):\s*$/);
        const currentKey = keyMatch ? keyMatch[1] : '';

        // Type enum values
        if (currentKey === 'type') {
            if (context === 'sourceDescription') {
                items.push(this.makeValueItem('openapi', 'Source type'));
                items.push(this.makeValueItem('arazzo', 'Source type'));
            } else if (context === 'action') {
                items.push(this.makeValueItem('goto', 'Action type'));
                items.push(this.makeValueItem('retry', 'Action type'));
                items.push(this.makeValueItem('end', 'Action type'));
            } else if (context === 'successCriterion') {
                items.push(this.makeValueItem('simple', 'Criterion type'));
                items.push(this.makeValueItem('regex', 'Criterion type'));
                items.push(this.makeValueItem('jsonpath', 'Criterion type'));
                items.push(this.makeValueItem('xpath', 'Criterion type'));
            }
        }

        // Runtime expression prefixes
        if (linePrefix.includes('$') || linePrefix.endsWith(': ')) {
            for (const expr of RUNTIME_EXPRESSIONS) {
                const item = new vscode.CompletionItem(expr, vscode.CompletionItemKind.Variable);
                item.detail = 'Runtime expression';
                item.sortText = `1_${expr}`;
                items.push(item);
            }

            // Dynamic $steps. resolution
            if (this.cache && linePrefix.includes('$steps.')) {
                const stepIds = this.resolveStepIds(document);
                for (const stepId of stepIds) {
                    const item = new vscode.CompletionItem(`$steps.${stepId}`, vscode.CompletionItemKind.Variable);
                    item.detail = 'Step reference';
                    item.sortText = `0_${stepId}`;
                    items.push(item);
                }
            }
        }

        return items;
    }

    private makeValueItem(label: string, detail: string): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);
        item.detail = detail;
        item.sortText = `0_${label}`;
        return item;
    }

    private resolveStepIds(document: vscode.TextDocument): string[] {
        if (!this.cache) { return []; }
        const entry = this.cache.get(document);
        const root = entry.parsed.contents;
        if (!root || !isMap(root)) { return []; }

        const stepIds: string[] = [];
        const workflows = root.get('workflows', true);
        if (workflows && isSeq(workflows)) {
            for (const workflow of workflows.items) {
                if (isMap(workflow)) {
                    const steps = workflow.get('steps', true);
                    if (steps && isSeq(steps)) {
                        for (const step of steps.items) {
                            if (isMap(step)) {
                                const idNode = step.get('stepId', true);
                                if (idNode && isScalar(idNode)) {
                                    stepIds.push(String(idNode.value));
                                }
                            }
                        }
                    }
                }
            }
        }
        return stepIds;
    }
}
