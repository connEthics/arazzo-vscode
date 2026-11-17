import { memo } from 'react';
import type { Selector } from '../../types/arazzo';
import Badge, { type BadgeVariant } from '@/components/primitives/Badge';
import { expressionTypeLabel, expressionTypeName } from '../../lib/arazzo-11';

interface SelectorValueProps {
  selector: Selector;
  isDark: boolean;
  className?: string;
}

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
  jsonpath: 'type-jsonpath',
  xpath: 'type-xpath',
  jsonpointer: 'type-jsonpointer',
};

/**
 * Arazzo 1.1 Selector Object (`context` / `selector` / `type`), used in
 * outputs, parameter values and request payloads.
 */
function SelectorValue({ selector, isDark, className = '' }: SelectorValueProps) {
  const codeClass = isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-gray-800';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const typeName = expressionTypeName(selector.type);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`} data-testid="selector-value">
      <Badge variant="selector" isDark={isDark} size="xs">Selector</Badge>
      <code className={`text-[10px] font-mono px-1 rounded ${codeClass}`} title="context">{selector.context}</code>
      <span className={`text-[10px] ${mutedClass}`} aria-hidden="true">{'→'}</span>
      <code className={`text-[10px] font-mono px-1 rounded break-all ${codeClass}`} title="selector">{selector.selector}</code>
      <Badge variant={TYPE_VARIANTS[typeName] ?? 'type-simple'} isDark={isDark} size="xs" className="normal-case">
        {expressionTypeLabel(selector.type)}
      </Badge>
    </span>
  );
}

export default memo(SelectorValue);
