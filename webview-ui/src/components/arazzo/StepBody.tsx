import { useCallback, useMemo } from 'react';
import type { Step, SourceDescription, Parameter, Criterion } from '../../types/arazzo';
import { isReusableObject } from '../../types/arazzo';

// Import internal components
import { CriterionBadge, ActionList, PayloadReplacements } from './index';
import { Card, Badge, CodeBlock, PropertyList } from '@/components/primitives';

export type StepBodyVariant = 'full' | 'compact';

interface StepBodyProps {
    step: Step;
    workflowId?: string;
    variant?: StepBodyVariant;
    sourceForStep?: SourceDescription;
    isDark?: boolean;
    onStepClick?: (stepId: string, workflowId?: string) => void;
    onWorkflowClick?: (workflowId: string) => void;
    onRefClick?: (reference: string) => void;
    forceExpanded?: boolean;
}

/**
 * Unified StepBody component.
 * variant='full': Complete details for Inspector and Documentation cards.
 * variant='compact': Summary version for React Flow nodes.
 */
export default function StepBody({
    step,
    workflowId,
    variant = 'full',
    isDark = false,
    onStepClick,
    onWorkflowClick,
    onRefClick,
    forceExpanded = false
}: StepBodyProps) {
    // Helper for step clicks to inject workflow ID
    const handleStepClick = useCallback((stepId: string) => {
        const effectiveWorkflowId = workflowId || step.workflowId;
        onStepClick?.(stepId, effectiveWorkflowId);
    }, [onStepClick, workflowId, step.workflowId]);

    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

    // --- Data Preparation ---
    const parameterItems = useMemo(() => step.parameters
        ?.filter((p): p is Parameter => !isReusableObject(p))
        .map(p => ({
            name: p.name,
            value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
            type: p.in || undefined,
        })) || [], [step.parameters]);

    const outputItems = useMemo(() => step.outputs
        ? Object.entries(step.outputs).map(([key, value]) => ({
            name: key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
        }))
        : [], [step.outputs]);


    // --- COMPACT VARIANT (Nodes) ---
    if (variant === 'compact') {
        return (
            <div className="p-3 space-y-2 overflow-hidden">
                {step.description && (
                    <p className={`${mutedClass} text-xs line-clamp-2`}>{step.description}</p>
                )}

                {step.operationId && (
                    <div className={`text-[10px] ${mutedClass} font-mono ${codeBgClass} px-2 py-1 rounded border border-slate-200 dark:border-slate-800 truncate`}>
                        {step.operationId}
                    </div>
                )}

                {/* Short info for outputs */}
                {outputItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {outputItems.slice(0, 3).map((item) => (
                            <Badge key={item.name} variant="output" size="xs" isDark={isDark}>
                                {item.name}
                            </Badge>
                        ))}
                        {outputItems.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{outputItems.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Connection indicators */}
                <div className="flex gap-1.5 pt-1">
                    {step.onSuccess && (
                        <Badge variant="success" size="xs" isDark={isDark} className="text-[9px]">onSuccess</Badge>
                    )}
                    {step.onFailure && (
                        <Badge variant="error" size="xs" isDark={isDark} className="text-[9px]">onFailure</Badge>
                    )}
                </div>
            </div>
        );
    }

    // --- FULL VARIANT (Inspector/Cards) ---
    return (
        <div className="space-y-4">
            {/* Parameters */}
            {step.parameters && step.parameters.length > 0 && (
                <Card
                    title="Parameters"
                    isDark={isDark}
                    badge={<Badge variant="info" isDark={isDark} size="xs">{step.parameters.length}</Badge>}
                >
                    <div className="space-y-2">
                        {parameterItems.length > 0 && (
                            <PropertyList
                                items={parameterItems}
                                isDark={isDark}
                                variant="compact"
                                maxItems={6}
                                forceExpanded={forceExpanded}
                            />
                        )}
                    </div>
                </Card>
            )}

            {/* Request Body */}
            {step.requestBody && (variant === 'full') && (
                <Card
                    title="Request Body"
                    isDark={isDark}
                    badge={step.requestBody?.contentType && <Badge variant="info" isDark={isDark} size="xs">{step.requestBody.contentType}</Badge>}
                >
                    <div className="space-y-3">
                        <CodeBlock
                            code={typeof step.requestBody?.payload === 'string' ? step.requestBody.payload : JSON.stringify(step.requestBody?.payload, null, 2) || ''}
                            language="json"
                            isDark={isDark}
                            maxHeight={150}
                            forceExpanded={forceExpanded}
                        />

                        {step.requestBody?.replacements && step.requestBody.replacements.length > 0 && (
                            <PayloadReplacements replacements={step.requestBody.replacements} isDark={isDark} />
                        )}
                    </div>
                </Card>
            )}

            {/* Success Criteria */}
            {step.successCriteria && step.successCriteria.length > 0 && (
                <Card
                    title="Success Criteria"
                    isDark={isDark}
                    icon={<span className="text-emerald-500">{'\u2713'}</span>}
                >
                    <div className="flex flex-wrap gap-2">
                        {step.successCriteria.map((criteria, idx) => {
                            const criterion = typeof criteria === 'string' ? { condition: criteria } : criteria;
                            return <CriterionBadge key={idx} criterion={criterion as Criterion} isDark={isDark} showDetails />;
                        })}
                    </div>
                </Card>
            )}

            {/* Success Actions */}
            {step.onSuccess && step.onSuccess.length > 0 && (
                <ActionList actions={step.onSuccess} type="success" isDark={isDark} onStepClick={handleStepClick} onWorkflowClick={onWorkflowClick} onRefClick={onRefClick} />
            )}

            {/* Failure Actions */}
            {step.onFailure && step.onFailure.length > 0 && (
                <ActionList actions={step.onFailure} type="failure" isDark={isDark} onStepClick={handleStepClick} onWorkflowClick={onWorkflowClick} onRefClick={onRefClick} />
            )}

            {/* Outputs Extraction */}
            {outputItems.length > 0 && (
                <Card
                    title="Extracted Outputs"
                    isDark={isDark}
                >
                    <PropertyList items={outputItems} isDark={isDark} variant="compact" />
                </Card>
            )}
        </div>
    );
}
