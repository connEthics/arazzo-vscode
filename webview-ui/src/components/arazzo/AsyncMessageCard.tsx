import { memo } from 'react';
import type { Step } from '../../types/arazzo';
import { Badge, Card } from '@/components/primitives';
import { formatTimeout } from '../../lib/arazzo-11';

interface AsyncMessageCardProps {
  step: Step;
  isDark: boolean;
  /** Name of the AsyncAPI source, when known. */
  sourceName?: string;
}

/**
 * AsyncAPI step details (Arazzo 1.1): action, channel or operation,
 * correlation id and timeout.
 */
function AsyncMessageCard({ step, isDark, sourceName }: AsyncMessageCardProps) {
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const codeClass = `text-[11px] font-mono break-all px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-800'}`;
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (step.channelPath) rows.push({ label: 'Channel', value: <code className={codeClass}>{step.channelPath}</code> });
  if (step.operationId) rows.push({ label: 'Operation', value: <code className={codeClass}>{step.operationId}</code> });
  if (step.correlationId !== undefined) {
    rows.push({ label: 'Correlation ID', value: <code className={codeClass}>{String(step.correlationId)}</code> });
  }
  if (step.timeout !== undefined) {
    rows.push({
      label: 'Timeout',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="timeout" isDark={isDark} size="xs" className="normal-case">{'⏱'} {formatTimeout(step.timeout)}</Badge>
          <span className={`text-[10px] ${mutedClass}`}>{step.timeout} ms</span>
        </span>
      ),
    });
  }

  const action = step.action;
  return (
    <Card
      title="AsyncAPI Message"
      isDark={isDark}
      badge={
        <span className="inline-flex items-center gap-1">
          {action && (
            <Badge variant={action === 'send' ? 'action-send' : 'action-receive'} isDark={isDark} size="xs">
              {action === 'send' ? '↑ send' : '↓ receive'}
            </Badge>
          )}
          {sourceName && <Badge variant="asyncapi" isDark={isDark} size="xs">{sourceName}</Badge>}
        </span>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className={`text-[10px] uppercase font-semibold ${mutedClass}`}>{r.label}</dt>
            <dd className="min-w-0">{r.value}</dd>
          </div>
        ))}
      </dl>
      {action === 'receive' && (
        <p className={`text-[10px] mt-2 ${mutedClass}`}>
          Waits for a message on the channel{step.correlationId !== undefined ? ' whose correlation id matches' : ''}
          {step.timeout !== undefined ? `; fails after ${formatTimeout(step.timeout)}` : ''}.
        </p>
      )}
    </Card>
  );
}

export default memo(AsyncMessageCard);
