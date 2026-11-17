/**
 * Small helpers for the Arazzo 1.1 additions rendered by the documentation view:
 * AsyncAPI steps, Selector Objects, qualified operation ids, timeouts.
 */
import type { ExpressionType, Selector, Step } from '../types/arazzo';

const QUALIFIED = /^\$sourceDescriptions\.([A-Za-z0-9_-]+)\.(.+)$/;

/**
 * Source name and operation name of an `operationId`:
 * `$sourceDescriptions.shop.createOrder` (1.0 / 1.1 qualified form) or the
 * legacy `shop.createOrder` form.
 */
export function splitOperationId(operationId?: string): { source?: string; name?: string } {
  if (!operationId) return {};
  const q = QUALIFIED.exec(operationId);
  if (q) return { source: q[1], name: q[2] };
  const dot = operationId.indexOf('.');
  if (dot > 0) return { source: operationId.slice(0, dot), name: operationId.slice(operationId.lastIndexOf('.') + 1) };
  return { name: operationId };
}

/** Source name referenced by `channelPath` / `operationPath` (`{$sourceDescriptions.events.url}#/…`). */
export function sourceOfPath(path?: string): string | undefined {
  const m = path ? /\{\$sourceDescriptions\.([A-Za-z0-9_-]+)\.url\}/.exec(path) : null;
  return m?.[1];
}

/** True for an AsyncAPI step (1.1): `channelPath`, `action`, or an operation of an `asyncapi` source. */
export function isAsyncStep(step: Step, sourceType?: string): boolean {
  return step.channelPath !== undefined || step.action !== undefined || sourceType === 'asyncapi';
}

/** Selector Object (1.1): `{ context, selector, type }`. */
export function isSelector(value: unknown): value is Selector {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.context === 'string' && typeof v.selector === 'string' && (typeof v.type === 'string' || (!!v.type && typeof v.type === 'object'));
}

/** `jsonpath`, `jsonpath rfc9535`, `xpath xpath-31`… */
export function expressionTypeLabel(type: Selector['type'] | ExpressionType | string | undefined): string {
  if (!type) return 'simple';
  if (typeof type === 'string') return type;
  const t = type as { type: string; version?: string };
  return t.version ? `${t.type} ${t.version}` : t.type;
}

/** Badge variant name of an expression type (`type-jsonpath`, `type-jsonpointer`…). */
export function expressionTypeName(type: Selector['type'] | ExpressionType | string | undefined): string {
  if (!type) return 'simple';
  return typeof type === 'string' ? type : (type as { type: string }).type;
}

/** `6000` → `6 s`, `1500` → `1.5 s`, `250` → `250 ms`, `120000` → `2 min`. */
export function formatTimeout(ms: number): string {
  if (!Number.isFinite(ms)) return String(ms);
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Number((ms / 1000).toFixed(2))} s`;
  return `${Number((ms / 60000).toFixed(2))} min`;
}

/** Display form of a step `dependsOn` entry: `stepId`, `$workflows.w.steps.s`, `$sourceDescriptions.n.w.steps.s`. */
export function parseStepDependency(ref: string): { stepId: string; workflowId?: string; source?: string } {
  const ext = /^\$sourceDescriptions\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.steps\.([A-Za-z0-9_-]+)$/.exec(ref);
  if (ext) return { source: ext[1], workflowId: ext[2], stepId: ext[3]! };
  const local = /^\$workflows\.([A-Za-z0-9_-]+)\.steps\.([A-Za-z0-9_-]+)$/.exec(ref);
  if (local) return { workflowId: local[1], stepId: local[2]! };
  return { stepId: ref };
}
