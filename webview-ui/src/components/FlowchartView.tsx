import { useMemo } from 'react';
import type { ArazzoSpec } from '../types/arazzo';
import MermaidDiagram from './MermaidDiagram';
import { workflowToMermaidFlowchart } from '../lib/mermaid-converter';
import { getThemeClasses } from '../hooks/useThemeClasses';

interface FlowchartViewProps {
    spec: ArazzoSpec;
    isDark: boolean;
    selectedWorkflowId?: string;
    onWorkflowSelect: (id: string) => void;
}

export default function FlowchartView({ spec, isDark, selectedWorkflowId, onWorkflowSelect }: FlowchartViewProps) {
    const theme = getThemeClasses(isDark);
    
    // Default to first workflow if none selected
    const activeWorkflowId = selectedWorkflowId || (spec.workflows.length > 0 ? spec.workflows[0].workflowId : undefined);

    const chart = useMemo(() => {
        if (!activeWorkflowId) return '';
        try {
            return workflowToMermaidFlowchart(spec, activeWorkflowId, { direction: 'TB' });
        } catch (e) {
            console.error('Failed to generate flowchart', e);
            return '';
        }
    }, [spec, activeWorkflowId]);

    return (
        <div className={`h-screen flex flex-col ${theme.bg} ${theme.text}`}>
            {/* Header with Selector */}
            <div className={`p-4 border-b ${theme.border} flex items-center justify-between bg-opacity-50 backdrop-blur-sm sticky top-0 z-10`}>
                <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-lg">Flowchart</h2>
                    <div className="relative">
                        <select
                            value={activeWorkflowId || ''}
                            onChange={(e) => onWorkflowSelect(e.target.value)}
                            className={`appearance-none pl-3 pr-8 py-1.5 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                isDark 
                                    ? 'bg-slate-800 border-slate-600 text-slate-200' 
                                    : 'bg-white border-gray-300 text-gray-700'
                            }`}
                        >
                            {spec.workflows.map(w => (
                                <option key={w.workflowId} value={w.workflowId}>
                                    {w.workflowId} {w.summary ? `- ${w.summary}` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="text-xs opacity-60">
                    {spec.info.title} v{spec.info.version}
                </div>
            </div>

            {/* Diagram Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeWorkflowId ? (
                    <MermaidDiagram 
                        chart={chart} 
                        isDark={isDark}
                        steps={spec.workflows.find(w => w.workflowId === activeWorkflowId)?.steps}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full opacity-50">
                        No workflow selected
                    </div>
                )}
            </div>
        </div>
    );
}
