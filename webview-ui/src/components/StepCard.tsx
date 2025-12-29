import { memo } from 'react';
import type { Step, SourceDescription } from '../types/arazzo';
import { StepHeader, StepBody } from './arazzo';
import { getThemeClasses } from '../hooks/useThemeClasses';

interface StepCardProps {
  step: Step;
  index: number;
  workflowId?: string;
  sourceForStep?: SourceDescription;
  isDark: boolean;
  onStepClick?: (stepId: string, workflowId?: string) => void;
  onWorkflowClick?: (workflowId: string) => void;
  onRefClick?: (reference: string) => void;
}

/**
 * Displays a single step in the documentation view (card style)
 */
function StepCard({ 
  step, 
  index, 
  workflowId,
  sourceForStep, 
  isDark, 
  onStepClick,
  onWorkflowClick,
  onRefClick 
}: StepCardProps) {
  const theme = getThemeClasses(isDark);
  
  // Use passed workflowId or fallback to step.workflowId (which might be undefined)
  const effectiveWorkflowId = workflowId || step.workflowId;

  return (
    <div 
      id={`step-${effectiveWorkflowId}-${step.stepId}`}
      className={`rounded-xl border ${theme.border} ${theme.cardBg} overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md`}
    >
      {/* Header */}
      <div className={`border-b ${theme.border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50/80'}`}>
        <StepHeader 
          step={step} 
          variant="card" 
          index={index} 
          sourceName={sourceForStep?.name}
          isDark={isDark}
        />
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        <StepBody 
          step={step} 
          workflowId={effectiveWorkflowId}
          variant="full" 
          sourceForStep={sourceForStep}
          isDark={isDark}
          onStepClick={onStepClick}
          onWorkflowClick={onWorkflowClick}
          onRefClick={onRefClick}
        />
      </div>
    </div>
  );
}

export default memo(StepCard);
