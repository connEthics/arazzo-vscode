import { memo, useMemo } from 'react';
import type { ArazzoSpec, Workflow, Step, SourceDescription } from '../types/arazzo';
import { 
  ArazzoSpecHeader, 
  SourceDescriptionsList, 
  WorkflowList, 
  DependsOnList, 
  WorkflowHeader, 
  WorkflowBody 
} from './arazzo';
import StepCard from './StepCard';
import { getThemeClasses } from '../hooks/useThemeClasses';
import { sourceOfPath, splitOperationId } from '../lib/arazzo-11';

interface UnifiedDocumentationViewProps {
  spec: ArazzoSpec;
  isDark: boolean;
  selectedWorkflowId?: string;
  onWorkflowSelect?: (workflowId: string) => void;
  onStepClick?: (stepId: string, workflowId?: string) => void;
  onRefClick?: (reference: string) => void;
}

/**
 * Unified documentation view that renders the full Arazzo specification.
 * Used in both the standalone viewer and the VS Code extension.
 */
function UnifiedDocumentationView({
  spec,
  isDark,
  selectedWorkflowId,
  onWorkflowSelect,
  onStepClick,
  onRefClick,
}: UnifiedDocumentationViewProps) {
  const theme = getThemeClasses(isDark);

  // Filter workflows if one is selected, otherwise show all
  const displayedWorkflows = useMemo(() => {
    if (selectedWorkflowId) {
      return spec.workflows.filter((w: Workflow) => w.workflowId === selectedWorkflowId);
    }
    return spec.workflows;
  }, [spec.workflows, selectedWorkflowId]);

  // Source description a step talks to: `$sourceDescriptions.<name>.op`, legacy
  // `<name>.op`, `{$sourceDescriptions.<name>.url}#…` paths, or the only API source.
  const getSourceForStep = (step: Step): SourceDescription | undefined => {
    const sources = spec.sourceDescriptions ?? [];
    const name = splitOperationId(step.operationId).source ?? sourceOfPath(step.channelPath ?? step.operationPath);
    if (name) return sources.find((s: SourceDescription) => s.name === name);
    if (step.operationId) {
      const apis = sources.filter((s: SourceDescription) => s.type !== 'arazzo');
      if (apis.length === 1) return apis[0];
    }
    return undefined;
  };

  return (
    <div className={`max-w-5xl mx-auto space-y-12 pb-20 ${theme.text}`}>
      
      {/* 1. Specification Header */}
      <section className="space-y-8">
        <ArazzoSpecHeader 
          info={spec.info} 
          arazzoVersion={spec.arazzo} 
          selfUri={typeof spec.$self === 'string' ? spec.$self : undefined}
          isDark={isDark} 
          centered={!selectedWorkflowId}
          size={selectedWorkflowId ? 'md' : 'lg'}
        />
        
        {/* Source Descriptions */}
        {spec.sourceDescriptions && spec.sourceDescriptions.length > 0 && (
          <div className="mt-8">
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${theme.muted}`}>
              API Sources
            </h3>
            <SourceDescriptionsList 
              sources={spec.sourceDescriptions} 
              isDark={isDark} 
              compact={!!selectedWorkflowId}
            />
          </div>
        )}
      </section>

      {/* 2. Table of Contents (only when showing all workflows) */}
      {!selectedWorkflowId && spec.workflows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Workflows</h2>
          <WorkflowList 
            workflows={spec.workflows} 
            isDark={isDark} 
            variant="toc" 
            onWorkflowSelect={onWorkflowSelect}
            onStepClick={onStepClick}
            showSteps
          />
        </section>
      )}

      {/* 3. Workflows Detail View */}
      <section className="space-y-16">
        {displayedWorkflows.map((workflow: Workflow, wfIndex: number) => (
          <div 
            key={workflow.workflowId} 
            id={`workflow-${workflow.workflowId}`}
            className={`scroll-mt-20 ${wfIndex > 0 ? 'pt-8 border-t ' + theme.border : ''}`}
          >
            {/* Workflow Header */}
            <WorkflowHeader 
              workflow={workflow} 
              index={!selectedWorkflowId ? wfIndex : undefined}
              isDark={isDark} 
            />

            {/* Dependencies */}
            {workflow.dependsOn && workflow.dependsOn.length > 0 && (
              <div className="mb-6">
                <DependsOnList 
                  dependencies={workflow.dependsOn} 
                  isDark={isDark} 
                  onWorkflowClick={onWorkflowSelect}
                />
              </div>
            )}

            {/* Workflow Inputs & Outputs */}
            {(workflow.inputs || workflow.outputs) && (
              <div className={`mb-8 p-6 rounded-xl border ${theme.card}`}>
                <WorkflowBody 
                  workflow={workflow} 
                  isDark={isDark} 
                />
              </div>
            )}

            {/* Steps List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  Workflow Steps
                  <span className={`ml-2 text-sm font-normal ${theme.muted}`}>
                    ({workflow.steps.length})
                  </span>
                </h3>
              </div>

              <div className="space-y-6">
                {workflow.steps.map((step: Step, stepIndex: number) => (
                  <StepCard 
                    key={step.stepId}
                    step={step}
                    workflowId={workflow.workflowId}
                    index={stepIndex}
                    sourceForStep={getSourceForStep(step)}
                    isDark={isDark}
                    onStepClick={onStepClick}
                    onWorkflowClick={onWorkflowSelect}
                    onRefClick={onRefClick}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default memo(UnifiedDocumentationView);
