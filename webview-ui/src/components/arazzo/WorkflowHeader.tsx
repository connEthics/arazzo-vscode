import { useMemo } from 'react';
import type { Workflow } from '../../types/arazzo';
import { Badge } from '@/components/primitives';

export type WorkflowHeaderVariant = 'card' | 'inspector' | 'header';

interface WorkflowHeaderProps {
    workflow: Workflow;
    variant?: WorkflowHeaderVariant;
    index?: number;
    isDark?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

/**
 * Unified WorkflowHeader component used across Documentation views and Inspection views.
 */
export default function WorkflowHeader({
    workflow,
    variant = 'header',
    index,
    isDark = false,
    className = '',
    style,
    onClick,
}: WorkflowHeaderProps) {
    const containerClasses = useMemo(() => {
        switch (variant) {
            case 'header':
                return `mb-6 ${className}`;
            case 'inspector':
                return `p-4 border-b border-slate-200 dark:border-slate-800 ${className}`;
            default:
                return className;
        }
    }, [variant, className]);

    const title = workflow.summary || workflow.workflowId;

    return (
        <div className={containerClasses} onClick={onClick} style={style}>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
                {index !== undefined && (
                    <Badge variant="step" size="xs" isDark={isDark} className="uppercase font-semibold">
                        Workflow {index + 1}
                    </Badge>
                )}

                <h2 className="text-2xl font-bold print:text-xl truncate">
                    {title}
                </h2>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <code className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} font-mono`}>
                    {workflow.workflowId}
                </code>
            </div>

            {workflow.description && (
                <p className={`mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {workflow.description}
                </p>
            )}
        </div>
    );
}
