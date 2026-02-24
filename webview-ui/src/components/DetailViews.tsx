import { memo } from 'react';
import type { Step, SourceDescription, WorkflowInputs } from '../types/arazzo';
import { StepBody, StepHeader, SchemaViewer } from './arazzo';
import { Badge, MarkdownText, PropertyList } from './primitives';

// --- Step Content ---
interface StepContentProps {
  step: Step;
  sourceForStep?: SourceDescription;
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  codeBgClass: string;
  onStepClick?: (stepId: string) => void;
  onRefClick?: (reference: string) => void;
}

export const StepContent = memo(function StepContent({
  step,
  sourceForStep,
  isDark,
  onStepClick,
  onRefClick,
}: StepContentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <StepHeader
        step={step}
        variant="inspector"
        sourceName={sourceForStep?.name}
        isDark={isDark}
      />

      {/* Body */}
      <div className="px-4 pb-4">
        <StepBody
          step={step}
          variant="full"
          sourceForStep={sourceForStep}
          isDark={isDark}
          onStepClick={onStepClick}
          onRefClick={onRefClick}
          forceExpanded
        />
      </div>
    </div>
  );
});

// --- Source Content ---
interface SourceContentProps {
  source: SourceDescription;
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  codeBgClass: string;
}

export const SourceContent = memo(function SourceContent({ source, isDark, textClass, mutedClass, codeBgClass }: SourceContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedClass}`}>Source Details</h4>
        <div className="space-y-3">
          <div>
            <span className={`text-xs ${mutedClass}`}>Name</span>
            <div className={`font-medium ${textClass}`}>{source.name}</div>
          </div>
          <div>
            <span className={`text-xs ${mutedClass}`}>URL</span>
            <div className={`font-mono text-sm break-all ${textClass} p-2 rounded ${codeBgClass} border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              {source.url}
            </div>
          </div>
          {source.description && (
            <div>
              <span className={`text-xs ${mutedClass}`}>Description</span>
              <div className={`text-sm ${textClass} mt-1`}>
                <MarkdownText content={source.description} isDark={isDark} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// --- Input Content ---
interface InputContentProps {
  input: { name: string; schema: Record<string, unknown> };
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  codeBgClass: string;
  workflowInputs?: WorkflowInputs;
}

export const InputContent = memo(function InputContent({
  input,
  isDark,
  mutedClass,
}: InputContentProps) {
  const hasProperties = input.schema && Object.keys(input.schema).length > 0;

  return (
    <div className="space-y-4">
      {hasProperties ? (
        <div className="space-y-3">
          {Object.entries(input.schema).map(([key, schema]: [string, any]) => (
            <SchemaViewer
              key={key}
              name={key}
              schema={schema}
              isDark={isDark}
              defaultCollapsed={false}
            />
          ))}
        </div>
      ) : (
        <div className={`p-8 text-center rounded-lg border border-dashed ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'}`}>
          <p className={mutedClass}>No inputs defined for this workflow.</p>
        </div>
      )}
    </div>
  );
});

// --- Output Content ---
interface OutputContentProps {
  output: { name: string; value: string; stepId?: string; allOutputs?: Record<string, string> };
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  codeBgClass: string;
  workflowOutputs?: Record<string, string>;
}

export const OutputContent = memo(function OutputContent({
  output,
  isDark,
  textClass,
  mutedClass,
}: OutputContentProps) {
  // If we have allOutputs, show them all
  if (output.allOutputs) {
    const items = Object.entries(output.allOutputs).map(([key, value]) => ({
      name: key,
      value: value
    }));

    if (items.length === 0) {
      return (
        <div className={`p-8 text-center rounded-lg border border-dashed ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'}`}>
          <p className={mutedClass}>No outputs defined for this workflow.</p>
        </div>
      );
    }

    return <PropertyList items={items} isDark={isDark} />;
  }

  // Single output view
  return (
    <div className="space-y-4">
      <div>
        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedClass}`}>Output Details</h4>
        <div className={`p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-mono font-medium ${textClass}`}>{output.name}</span>
            {output.stepId && (
              <Badge variant="step" isDark={isDark} size="xs">
                Step: {output.stepId}
              </Badge>
            )}
          </div>
          <div className="mt-2">
            <span className={`text-xs ${mutedClass} block mb-1`}>Value Expression</span>
            <code className={`block text-sm font-mono p-2 rounded ${isDark ? 'bg-black/30 text-amber-400' : 'bg-gray-50 text-amber-600'}`}>
              {output.value}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
});
