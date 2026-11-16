import * as vscode from 'vscode';
import { isMap, isSeq } from 'yaml';
import type { YAMLMap, YAMLSeq } from 'yaml';
import { DEFAULT_EXPRESSION_VERSIONS, LATEST_ARAZZO_VERSION } from '@connethics/arazzo-core';
import type { ArazzoDocument, Step, Workflow } from '@connethics/arazzo-core';
import { ParseCache, ParseCacheEntry } from '../parse-cache';

export type ArazzoContext =
    | 'root'
    | 'info'
    | 'sourceDescription'
    | 'workflow'
    | 'step'
    | 'successAction'
    | 'failureAction'
    | 'successCriterion'
    | 'expressionType'
    | 'selector'
    | 'parameter'
    | 'requestBody'
    | 'replacement'
    | 'components'
    | 'unknown';

const KEYS: Record<Exclude<ArazzoContext, 'unknown'>, string[]> = {
    root: ['arazzo', '$self', 'info', 'sourceDescriptions', 'workflows', 'components'],
    info: ['title', 'version', 'summary', 'description'],
    sourceDescription: ['name', 'url', 'type'],
    workflow: ['workflowId', 'summary', 'description', 'inputs', 'dependsOn', 'steps', 'outputs', 'parameters', 'successActions', 'failureActions'],
    step: [
        'stepId', 'description', 'operationId', 'operationPath', 'workflowId', 'channelPath', 'action', 'correlationId',
        'timeout', 'dependsOn', 'parameters', 'requestBody', 'successCriteria', 'onSuccess', 'onFailure', 'outputs',
    ],
    successAction: ['name', 'type', 'workflowId', 'stepId', 'parameters', 'criteria', 'reference'],
    failureAction: ['name', 'type', 'workflowId', 'stepId', 'parameters', 'retryAfter', 'retryLimit', 'criteria', 'reference'],
    successCriterion: ['condition', 'context', 'type'],
    expressionType: ['type', 'version'],
    selector: ['context', 'selector', 'type'],
    parameter: ['name', 'in', 'value', 'reference'],
    requestBody: ['contentType', 'payload', 'replacements'],
    replacement: ['target', 'targetSelectorType', 'value'],
    components: ['inputs', 'parameters', 'successActions', 'failureActions'],
};

/** Documentation shown next to the 1.1 keys. */
const KEY_DETAILS: Record<string, string> = {
    $self: 'Arazzo 1.1: canonical URI of this document',
    channelPath: 'Arazzo 1.1: AsyncAPI channel ({$sourceDescriptions.<name>.url}#/channels/<key>)',
    action: 'Arazzo 1.1: send | receive (AsyncAPI step)',
    correlationId: 'Arazzo 1.1: runtime expression correlating the received message',
    timeout: 'Arazzo 1.1: maximum wait in milliseconds',
    dependsOn: 'Steps (1.1) or workflows that must complete first',
    selector: 'Arazzo 1.1: JSONPath / XPath / JSON Pointer expression',
    targetSelectorType: 'Arazzo 1.1: jsonpath | xpath | jsonpointer',
    replacements: 'Locations and values to set within the payload',
};

const EXPRESSION_TYPES = ['jsonpath', 'xpath', 'jsonpointer'];

const EXPRESSION_VERSIONS: Record<string, string[]> = {
    jsonpath: ['rfc9535', 'draft-goessner-dispatch-jsonpath-00'],
    xpath: ['xpath-31', 'xpath-30', 'xpath-20', 'xpath-10'],
    jsonpointer: ['rfc6901'],
};

const RUNTIME_EXPRESSIONS: Array<[string, string]> = [
    ['$url', 'URL of the request'],
    ['$method', 'HTTP method of the request'],
    ['$statusCode', 'HTTP status code of the response'],
    ['$request.header.', 'Request header'],
    ['$request.query.', 'Request query parameter'],
    ['$request.path.', 'Request path parameter'],
    ['$request.body', 'Request body (add #/json/pointer)'],
    ['$response.header.', 'Response header'],
    ['$response.body', 'Response body (add #/json/pointer)'],
    ['$message.header.', 'Arazzo 1.1: header of the AsyncAPI message'],
    ['$message.payload', 'Arazzo 1.1: payload of the AsyncAPI message (add #/json/pointer)'],
    ['$inputs.', 'Workflow input'],
    ['$outputs.', 'Workflow output'],
    ['$steps.', 'Output of a step'],
    ['$workflows.', 'Input or output of a workflow'],
    ['$sourceDescriptions.', 'Source description'],
    ['$components.', 'Reusable component'],
    ['$self', 'Arazzo 1.1: canonical URI of this document'],
];

/** Keys whose value is an enumeration or an identifier (no runtime expression suggested by default). */
const NON_EXPRESSION_KEYS = new Set([
    'type', 'targetSelectorType', 'version', 'in', 'action', 'arazzo', 'dependsOn', 'stepId', 'workflowId',
    'name', 'url', 'title', 'summary', 'description', 'timeout', 'retryAfter', 'retryLimit', 'contentType',
]);

interface LineShape {
    /** Column of the first character after indentation and `- ` markers. */
    keyCol: number;
    key?: string;
}

/** Shape of a YAML line: content column and mapping key, or `undefined` for blank and comment lines. */
function lineShape(text: string): LineShape | undefined {
    const m = /^(\s*)((?:-\s+)*)(.*)$/.exec(text);
    if (!m || m[3].length === 0 || m[3].startsWith('#')) {
        return m && m[2].length > 0 && m[3].length === 0 ? { keyCol: m[1].length + m[2].length } : undefined;
    }
    const keyCol = m[1].length + m[2].length;
    const k = /^(["']?)([^\s"':#][^"':#]*?)\1:(?:\s|$)/.exec(m[3]);
    return { keyCol, key: k ? k[2] : undefined };
}

/** Mapping keys enclosing `line` at `indent`, outermost first. */
function ancestorKeys(document: vscode.TextDocument, line: number, indent: number): string[] {
    const chain: string[] = [];
    let limit = indent;
    for (let i = line - 1; i >= 0 && limit > 0; i--) {
        const shape = lineShape(document.lineAt(i).text);
        if (shape?.key !== undefined && shape.keyCol < limit) {
            chain.unshift(shape.key);
            limit = shape.keyCol;
        }
    }
    return chain;
}

/** Arazzo object being edited, from the chain of enclosing keys. */
export function contextFromChain(chain: string[]): ArazzoContext {
    const n = chain.length;
    if (n === 0) {
        return 'root';
    }
    if (chain.includes('inputs') || chain.includes('payload')) {
        return 'unknown'; // JSON Schema / free-form payload
    }
    const k = chain[n - 1];
    const p = chain[n - 2];
    const g = chain[n - 3];
    if (p === 'components' && ['parameters', 'successActions', 'failureActions'].includes(k)) {
        return 'unknown'; // component names
    }
    switch (k) {
        case 'info': return 'info';
        case 'sourceDescriptions': return 'sourceDescription';
        case 'workflows': return 'workflow';
        case 'steps': return 'step';
        case 'onSuccess':
        case 'successActions': return 'successAction';
        case 'onFailure':
        case 'failureActions': return 'failureAction';
        case 'successCriteria':
        case 'criteria': return 'successCriterion';
        case 'type':
        case 'targetSelectorType': return 'expressionType';
        case 'parameters': return 'parameter';
        case 'requestBody': return 'requestBody';
        case 'replacements': return 'replacement';
        case 'components': return 'components';
        case 'value': return 'selector';
        case 'outputs':
        case 'description':
        case 'summary': return 'unknown';
    }
    if (p === 'outputs') {
        return 'selector';
    }
    if (g === 'components') {
        if (p === 'parameters') { return 'parameter'; }
        if (p === 'successActions') { return 'successAction'; }
        if (p === 'failureActions') { return 'failureAction'; }
    }
    return 'unknown';
}

interface Scope {
    doc: ArazzoDocument | undefined;
    workflow?: Workflow;
    step?: Step;
}

/** Index of the last sequence item starting before `offset` (the item being edited). */
function itemAt(seq: YAMLSeq, offset: number): number {
    let found = -1;
    seq.items.forEach((item, i) => {
        const range = (item as { range?: [number, number, number] } | null)?.range;
        if (range && range[0] <= offset) {
            found = i;
        }
    });
    return found;
}

/** Workflow and step enclosing `offset`, from the cached `yaml` document. */
function scopeAt(entry: ParseCacheEntry, offset: number): Scope {
    const doc = entry.json;
    const scope: Scope = { doc };
    const root = entry.parsed.contents;
    if (!root || !isMap(root)) {
        return scope;
    }
    const workflows = root.get('workflows', true);
    if (!workflows || !isSeq(workflows) || !workflows.range || offset < workflows.range[0]) {
        return scope;
    }
    const wi = itemAt(workflows, offset);
    if (wi < 0) {
        return scope;
    }
    scope.workflow = doc?.workflows?.[wi];
    const steps = (workflows.items[wi] as YAMLMap | null)?.get?.('steps', true);
    if (steps && isSeq(steps) && steps.range && offset >= steps.range[0]) {
        const si = itemAt(steps, offset);
        if (si >= 0) {
            scope.step = scope.workflow?.steps?.[si];
        }
    }
    return scope;
}

const asArray = <T>(v: T[] | undefined | unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

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
        const entry = this.cache?.get(document);
        if (!entry || !entry.isArazzo) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const m = /^(\s*)((?:-\s+)*)(.*)$/.exec(linePrefix)!;
        const hasDash = m[2].length > 0;
        const rest = m[3];
        const indent = m[1].length + m[2].length;
        const chain = ancestorKeys(document, position.line, indent);
        const context = contextFromChain(chain);
        const scope = scopeAt(entry, document.offsetAt(position));

        const kv = /^(["']?)([^\s"':#][^"':#]*?)\1:\s+(.*)$/.exec(rest);
        if (kv) {
            return this.getValueCompletions(kv[2], kv[3], context, indent, document, position, scope);
        }
        // Scalar item of a list of identifiers (`dependsOn:\n  - <cursor>`).
        if (hasDash && chain[chain.length - 1] === 'dependsOn' && !rest.includes(':')) {
            const parentContext = contextFromChain(chain.slice(0, -1));
            return this.getValueCompletions('dependsOn', rest, parentContext, indent, document, position, scope);
        }
        return this.getKeyCompletions(context, new vscode.Range(position.line, indent, position.line, position.character));
    }

    private getKeyCompletions(context: ArazzoContext, range: vscode.Range): vscode.CompletionItem[] {
        if (context === 'unknown') {
            return [];
        }
        return KEYS[context].map((key, index) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Field);
            item.detail = 'Arazzo key';
            if (KEY_DETAILS[key]) {
                item.documentation = KEY_DETAILS[key];
            }
            item.sortText = `0_${String(index).padStart(3, '0')}`;
            item.insertText = `${key}: `;
            item.range = range;
            item.filterText = key;
            return item;
        });
    }

    private getValueCompletions(
        key: string,
        partial: string,
        context: ArazzoContext,
        indent: number,
        document: vscode.TextDocument,
        position: vscode.Position,
        scope: Scope
    ): vscode.CompletionItem[] {
        const valueRange = new vscode.Range(position.line, position.character - partial.length, position.line, position.character);
        const items: vscode.CompletionItem[] = [];
        const add = (label: string, detail: string, kind = vscode.CompletionItemKind.Value) => {
            const item = new vscode.CompletionItem(label, kind);
            item.detail = detail;
            item.sortText = `0_${String(items.length).padStart(3, '0')}`;
            item.range = valueRange;
            items.push(item);
            return item;
        };
        const doc = scope.doc;
        const sources = asArray<{ name?: unknown; type?: unknown }>(doc?.sourceDescriptions);
        const sourceNames = (type?: string) =>
            sources.filter(s => typeof s.name === 'string' && (!type || s.type === type)).map(s => String(s.name));
        const workflowIds = asArray<Workflow>(doc?.workflows).map(w => w?.workflowId).filter((id): id is string => typeof id === 'string');
        const stepIds = asArray<Step>(scope.workflow?.steps).map(s => s?.stepId).filter((id): id is string => typeof id === 'string');

        switch (key) {
            case 'type':
                if (context === 'sourceDescription') {
                    add('openapi', 'Source type');
                    add('asyncapi', 'Source type (Arazzo 1.1)');
                    add('arazzo', 'Source type');
                } else if (context === 'successAction') {
                    add('end', 'Action type');
                    add('goto', 'Action type');
                } else if (context === 'failureAction') {
                    add('end', 'Action type');
                    add('goto', 'Action type');
                    add('retry', 'Action type');
                } else if (context === 'successCriterion') {
                    for (const t of ['simple', 'regex', 'jsonpath', 'xpath']) {
                        add(t, 'Criterion type');
                    }
                } else if (context === 'expressionType' || context === 'selector') {
                    for (const t of EXPRESSION_TYPES) {
                        add(t, context === 'selector' ? 'Selector type (Arazzo 1.1)' : 'Expression type (Arazzo 1.1)');
                    }
                }
                break;
            case 'targetSelectorType':
                for (const t of EXPRESSION_TYPES) {
                    add(t, 'Target selector type (Arazzo 1.1)');
                }
                break;
            case 'version':
                if (context === 'expressionType') {
                    const sibling = siblingValue(document, position.line, indent, 'type');
                    const types = sibling && EXPRESSION_VERSIONS[sibling] ? [sibling] : Object.keys(EXPRESSION_VERSIONS);
                    for (const t of types) {
                        for (const v of EXPRESSION_VERSIONS[t]) {
                            const item = add(v, `${t} version`);
                            if (DEFAULT_EXPRESSION_VERSIONS[t as keyof typeof DEFAULT_EXPRESSION_VERSIONS] === v) {
                                item.preselect = true;
                            }
                        }
                    }
                }
                break;
            case 'in':
                if (context === 'parameter') {
                    add('path', 'Parameter location');
                    add('query', 'Parameter location');
                    add('querystring', 'Parameter location (Arazzo 1.1, whole query string)');
                    add('header', 'Parameter location');
                    add('cookie', 'Parameter location');
                    add('channel', 'Parameter location (AsyncAPI channel parameter)');
                }
                break;
            case 'action':
                if (context === 'step') {
                    add('send', 'AsyncAPI action (Arazzo 1.1)');
                    add('receive', 'AsyncAPI action (Arazzo 1.1)');
                }
                break;
            case 'arazzo':
                if (context === 'root') {
                    add(LATEST_ARAZZO_VERSION, 'Arazzo version').preselect = true;
                    add('1.0.1', 'Arazzo version');
                }
                break;
            case 'dependsOn':
                if (context === 'step') {
                    for (const id of stepIds.filter(id => id !== scope.step?.stepId)) {
                        add(id, `Step of workflow ${scope.workflow?.workflowId ?? ''}`.trim(), vscode.CompletionItemKind.Reference);
                    }
                } else if (context === 'workflow') {
                    for (const id of workflowIds.filter(id => id !== scope.workflow?.workflowId)) {
                        add(id, 'Workflow', vscode.CompletionItemKind.Reference);
                    }
                    for (const name of sourceNames('arazzo')) {
                        add(`$sourceDescriptions.${name}.`, 'Workflow of an Arazzo source', vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'stepId':
                if (context === 'successAction' || context === 'failureAction') {
                    for (const id of stepIds) {
                        add(id, `Step of workflow ${scope.workflow?.workflowId ?? ''}`.trim(), vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'workflowId':
                if (context === 'successAction' || context === 'failureAction' || context === 'step') {
                    for (const id of workflowIds.filter(id => context !== 'step' || id !== scope.workflow?.workflowId)) {
                        add(id, 'Workflow', vscode.CompletionItemKind.Reference);
                    }
                    for (const name of sourceNames('arazzo')) {
                        add(`$sourceDescriptions.${name}.`, 'Workflow of an Arazzo source', vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'operationId':
                if (context === 'step') {
                    for (const name of sources.filter(s => s.type !== 'arazzo' && typeof s.name === 'string').map(s => String(s.name))) {
                        add(`$sourceDescriptions.${name}.`, 'Operation of a source', vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'operationPath':
                if (context === 'step') {
                    for (const name of sourceNames('openapi')) {
                        add(`{$sourceDescriptions.${name}.url}#/paths/`, 'OpenAPI operation (JSON Pointer)', vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'channelPath':
                if (context === 'step') {
                    for (const name of sourceNames('asyncapi')) {
                        add(`{$sourceDescriptions.${name}.url}#/channels/`, 'AsyncAPI channel (Arazzo 1.1)', vscode.CompletionItemKind.Reference);
                    }
                }
                break;
            case 'reference': {
                const kind = context === 'parameter' ? 'parameters'
                    : context === 'successAction' ? 'successActions'
                        : context === 'failureAction' ? 'failureActions' : undefined;
                const components = (doc?.components ?? {}) as Record<string, unknown>;
                for (const k of kind ? [kind] : ['parameters', 'successActions', 'failureActions']) {
                    const group = components[k];
                    if (group && typeof group === 'object') {
                        for (const name of Object.keys(group)) {
                            add(`$components.${k}.${name}`, 'Reusable component', vscode.CompletionItemKind.Reference);
                        }
                    }
                }
                break;
            }
        }

        if (!NON_EXPRESSION_KEYS.has(key) || partial.includes('$')) {
            items.push(...this.getExpressionCompletions(partial, position, scope));
        }
        return items;
    }

    private getExpressionCompletions(partial: string, position: vscode.Position, scope: Scope): vscode.CompletionItem[] {
        const token = /\$[\w.\-#/~[\]]*$/.exec(partial)?.[0] ?? '';
        if (!token && partial.trim().length > 0) {
            return [];
        }
        const range = new vscode.Range(position.line, position.character - token.length, position.line, position.character);
        const items: vscode.CompletionItem[] = [];
        const add = (label: string, detail: string, sort: string) => {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Variable);
            item.detail = detail;
            item.sortText = sort;
            item.range = range;
            item.filterText = label;
            items.push(item);
        };

        for (const [expr, detail] of RUNTIME_EXPRESSIONS) {
            add(expr, `Runtime expression — ${detail}`, `1_${expr}`);
        }

        const doc = scope.doc;
        if (token.startsWith('$steps.')) {
            const steps = asArray<Step>(scope.workflow?.steps ?? asArray<Workflow>(doc?.workflows).flatMap(w => asArray<Step>(w?.steps)));
            for (const step of steps) {
                if (typeof step?.stepId !== 'string') {
                    continue;
                }
                add(`$steps.${step.stepId}`, 'Step reference', `0_${step.stepId}`);
                for (const out of Object.keys(step.outputs ?? {})) {
                    add(`$steps.${step.stepId}.outputs.${out}`, 'Step output', `0_${step.stepId}.${out}`);
                }
            }
        }
        if (token.startsWith('$inputs.')) {
            const props = (scope.workflow?.inputs as { properties?: Record<string, unknown> } | undefined)?.properties;
            for (const name of Object.keys(props ?? {})) {
                add(`$inputs.${name}`, 'Workflow input', `0_${name}`);
            }
        }
        if (token.startsWith('$workflows.')) {
            for (const wf of asArray<Workflow>(doc?.workflows)) {
                if (typeof wf?.workflowId !== 'string') {
                    continue;
                }
                for (const out of Object.keys(wf.outputs ?? {})) {
                    add(`$workflows.${wf.workflowId}.outputs.${out}`, 'Workflow output', `0_${wf.workflowId}.${out}`);
                }
                const props = (wf.inputs as { properties?: Record<string, unknown> } | undefined)?.properties;
                for (const name of Object.keys(props ?? {})) {
                    add(`$workflows.${wf.workflowId}.inputs.${name}`, 'Workflow input', `0_${wf.workflowId}.in.${name}`);
                }
            }
        }
        if (token.startsWith('$sourceDescriptions.')) {
            for (const s of asArray<{ name?: unknown }>(doc?.sourceDescriptions)) {
                if (typeof s?.name === 'string') {
                    add(`$sourceDescriptions.${s.name}`, 'Source description', `0_${s.name}`);
                    add(`$sourceDescriptions.${s.name}.url`, 'Source description URL', `0_${s.name}.url`);
                }
            }
        }
        if (token.startsWith('$components.')) {
            const components = (doc?.components ?? {}) as Record<string, unknown>;
            for (const kind of ['parameters', 'successActions', 'failureActions']) {
                const group = components[kind];
                if (group && typeof group === 'object') {
                    for (const name of Object.keys(group)) {
                        add(`$components.${kind}.${name}`, 'Reusable component', `0_${kind}.${name}`);
                    }
                }
            }
        }
        return items;
    }
}

/** Value of a sibling scalar `key` in the mapping whose keys start at column `indent`. */
function siblingValue(document: vscode.TextDocument, line: number, indent: number, key: string): string | undefined {
    const scan = (from: number, step: 1 | -1): string | undefined => {
        for (let i = from; i >= 0 && i < document.lineCount; i += step) {
            const text = document.lineAt(i).text;
            const shape = lineShape(text);
            if (!shape) {
                continue;
            }
            if (shape.keyCol < indent) {
                return undefined;
            }
            const startsItem = /^\s*-\s/.test(text) && shape.keyCol === indent;
            if (startsItem && step === 1) {
                return undefined; // next item of the sequence
            }
            if (shape.keyCol === indent && shape.key === key) {
                return /:\s*["']?([\w-]+)/.exec(text.slice(shape.keyCol))?.[1];
            }
            if (startsItem) {
                return undefined; // first line of the current item: nothing above belongs to it
            }
        }
        return undefined;
    };
    return scan(line - 1, -1) ?? scan(line + 1, 1);
}
