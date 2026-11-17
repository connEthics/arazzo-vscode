import { useCallback, useMemo, useRef, useState } from 'react';
import {
    ArazzoGraphFromDocument,
    createOpenApiResolver,
    type ArazzoGraphApi,
    type ArazzoGraphOptions,
    type ElkConfig,
    type ExportEvent,
} from '@connethics/arazzo-flow';
import '@connethics/arazzo-flow/style.css';
import type { Diagnostic, GraphNode } from '@connethics/arazzo-core';
import type { ArazzoSpec } from '../types/arazzo';
import { useElkConfig } from '../lib/elk-host';

export interface StepNavigation {
    stepId: string;
    workflowId: string;
    /** true: Enter / double-click (the editor takes the focus); false: click (focus stays in the graph). */
    reveal: boolean;
}

interface FlowchartViewProps {
    spec: ArazzoSpec;
    selectedWorkflowId?: string;
    /** Editor cursor → graph (stepId of the step under the cursor). */
    selectedStepId?: string | null;
    onWorkflowSelect: (id: string) => void;
    /** Graph → editor (`step-selected` message). */
    onStepNavigate?: (nav: StepNavigation) => void;
    /** "Copy as Mermaid" (the host writes the clipboard). */
    onCopyMermaid?: (text: string, workflowId: string) => void;
    /** Toolbar exports (SVG / PNG / Mermaid file), saved by the host. */
    onExport?: (e: ExportEvent) => void;
    /** arazzo-core diagnostics computed by the extension host, shown as node badges. */
    diagnostics?: Diagnostic[];
    /** Parsed OpenAPI sources by `sourceDescriptions[].name`: HTTP method badges. */
    sources?: Record<string, unknown>;
    /** High-contrast VS Code theme (`body.vscode-high-contrast[-light]`). */
    highContrast?: boolean;
    lang?: 'fr' | 'en';
    /** Persisted toolbar options (`vscode.getState`). */
    options?: Partial<ArazzoGraphOptions>;
    onOptionsChange?: (o: ArazzoGraphOptions) => void;
    /** Tests: `{ engine }` (mocked ELK). Default: worker resolved by elk-host. */
    elk?: ElkConfig;
}

const isStep = (node: GraphNode | null): node is GraphNode & { step: NonNullable<GraphNode['step']> } => !!node?.step;

export default function FlowchartView({
    spec,
    selectedWorkflowId,
    selectedStepId,
    onWorkflowSelect,
    onStepNavigate,
    onCopyMermaid,
    onExport,
    diagnostics,
    sources,
    highContrast,
    lang = 'en',
    options,
    onOptionsChange,
    elk,
}: FlowchartViewProps) {
    const graphRef = useRef<ArazzoGraphApi>(null);
    const elkConfig = useElkConfig(elk);
    const [copied, setCopied] = useState(false);
    const workflows = Array.isArray(spec.workflows) ? spec.workflows : [];

    // Default to the first workflow if none (or an unknown one) is selected.
    const activeWorkflowId = workflows.some(w => w.workflowId === selectedWorkflowId)
        ? selectedWorkflowId
        : workflows[0]?.workflowId;

    const resolveOperation = useMemo(
        () => (sources && Object.keys(sources).length > 0 ? createOpenApiResolver(sources) : undefined),
        [sources],
    );

    const navigate = useCallback((node: GraphNode | null, workflowId: string | undefined, reveal: boolean) => {
        if (isStep(node) && workflowId) {
            onStepNavigate?.({ stepId: node.step.stepId, workflowId, reveal });
        }
    }, [onStepNavigate]);

    const copyMermaid = useCallback(() => {
        const text = graphRef.current?.toMermaid();
        if (!text || !activeWorkflowId) return;
        onCopyMermaid?.(text, activeWorkflowId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [onCopyMermaid, activeWorkflowId]);

    const info = spec.info ?? { title: '', version: '' };

    return (
        <div className="arazzo-flowchart h-screen flex flex-col">
            <header className="arazzo-flowchart__bar">
                <div className="flex items-center gap-3 min-w-0">
                    <label htmlFor="arazzo-workflow-select" className="font-semibold text-sm whitespace-nowrap">Workflow</label>
                    <select
                        id="arazzo-workflow-select"
                        value={activeWorkflowId || ''}
                        onChange={(e) => onWorkflowSelect(e.target.value)}
                        className="arazzo-flowchart__select"
                    >
                        {workflows.map(w => (
                            <option key={w.workflowId} value={w.workflowId}>
                                {w.workflowId}{w.summary ? ` — ${w.summary}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                    <span className="arazzo-flowchart__meta truncate" title={`${info.title} v${info.version}`}>
                        {info.title} <span className="opacity-70">v{info.version}</span>
                    </span>
                    <button
                        type="button"
                        className="arazzo-flowchart__button"
                        onClick={copyMermaid}
                        disabled={!activeWorkflowId}
                        title="Copy this workflow as a Mermaid flowchart"
                    >
                        {copied ? 'Copied' : 'Copy as Mermaid'}
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 relative">
                {!activeWorkflowId ? (
                    <div className="flex items-center justify-center h-full opacity-60">No workflow in this document</div>
                ) : !elkConfig ? (
                    <div className="flex items-center justify-center h-full opacity-60" role="status">Preparing layout…</div>
                ) : (
                    <ArazzoGraphFromDocument
                        ref={graphRef}
                        doc={spec}
                        workflowId={activeWorkflowId}
                        resolveOperation={resolveOperation}
                        diagnostics={diagnostics}
                        theme="vscode"
                        highContrast={highContrast}
                        lang={lang}
                        elk={elkConfig}
                        layout={options?.layout}
                        lanes={options?.lanes}
                        density={options?.density}
                        selectedStepId={selectedStepId ?? null}
                        onSelectStep={(_id, node, sel) => navigate(node, sel?.workflowId, false)}
                        onRevealStep={(_id, node, sel) => navigate(node, sel.workflowId, true)}
                        onOpenWorkflow={(id) => workflows.some(w => w.workflowId === id) && onWorkflowSelect(id)}
                        onExport={onExport}
                        onOptionsChange={onOptionsChange}
                        fallback={<div className="flex items-center justify-center h-full opacity-60">Workflow “{activeWorkflowId}” cannot be drawn</div>}
                        style={{ width: '100%', height: '100%' }}
                    />
                )}
            </main>
        </div>
    );
}
