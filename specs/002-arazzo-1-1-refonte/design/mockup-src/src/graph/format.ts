import type { GraphEdge, GraphNode, WorkflowGraph } from './model';
import type { Messages } from './messages';

export type Density = 'compact' | 'standard' | 'detailed';
export type Direction = 'TB' | 'LR';

/** 6000 → « 6 s », 1500 → « 1,5 s », 250 → « 250 ms ». */
export function formatTimeout(ms: number, lang: 'fr' | 'en' = 'fr'): string {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round((ms / 1000) * 10) / 10;
  return `${lang === 'fr' ? String(s).replace('.', ',') : s} s`;
}

export function formatSeconds(s: number, lang: 'fr' | 'en' = 'fr'): string {
  return `${lang === 'fr' ? String(s).replace('.', ',') : s} s`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Libellé d'arête (chip). Les expressions runtime sont gardées verbatim ($, :). */
export function edgeLabelText(e: GraphEdge, density: Density, lang: 'fr' | 'en' = 'fr'): string {
  const crit = e.criteria?.[0]?.condition;
  const withCrit = (base: string) =>
    density === 'detailed' && crit ? `${base} · ${truncate(crit, 24)}` : base;
  switch (e.kind) {
    case 'sequence':
    case 'depends-on':
      return '';
    case 'success':
      return withCrit(`✓ ${e.name ?? truncate(crit ?? '', 24)}${e.backward ? ' ↺' : ''}`);
    case 'failure':
      return withCrit(`✗ ${e.name ?? truncate(crit ?? '', 24)}${e.backward ? ' ↺' : ''}`);
    case 'retry':
      if (e.via) return `↻ via ${e.via}`;
      return withCrit(`↻ ×${e.retryLimit ?? 1} · ${formatSeconds(e.retryAfter ?? 0, lang)}`);
    case 'end-success':
      return e.criteria?.length ? withCrit(`✓ ${e.name ?? 'fin'}`) : '';
    case 'end-failure':
      return withCrit(`✗ ${e.name ?? 'fin'}`);
    case 'implicit-failure':
      return lang === 'fr' ? 'échec non géré' : 'unhandled failure';
    case 'workflow-call':
      return `⇢ ${shortWorkflow(e.via ?? '')}`;
    case 'transfer':
      return `${e.origin === 'onFailure' ? '✗' : '✓'} ↗ ${shortWorkflow(e.via ?? '')}`;
  }
}

export function shortWorkflow(id: string): string {
  const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(id);
  return m ? m[2] : id;
}

/* ---------- Tailles déterministes (aucune mesure DOM avant layout) ---------- */

export const NODE_WIDTH = { TB: 240, LR: 220 } as const;
export const HEIGHTS = { compact: 44, standard: 96, line: 18, maxLines: 5 } as const;

export function detailLines(n: GraphNode): number {
  if (n.kind === 'step') return Math.min(n.criteria?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === 'input') return Math.min(n.inputs?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === 'output') return Math.min(n.workflowOutputs?.length ?? 0, HEIGHTS.maxLines);
  return 0;
}

export function nodeSize(n: GraphNode, density: Density, dir: Direction): { width: number; height: number } {
  switch (n.kind) {
    case 'end':
      return { width: 72, height: 50 };
    case 'junction':
      return { width: 28, height: 28 };
    case 'workflow-ref':
      return { width: 200, height: 36 };
    default: {
      const width = NODE_WIDTH[dir];
      if (density === 'compact') return { width, height: HEIGHTS.compact };
      if (density === 'standard') return { width, height: HEIGHTS.standard };
      const lines = detailLines(n);
      return { width, height: HEIGHTS.standard + (lines ? 8 + lines * HEIGHTS.line : 0) };
    }
  }
}

/* ---------- Mesure de texte (libellés d'arêtes) ---------- */

let ctx: CanvasRenderingContext2D | null = null;
export const LABEL_FONT = '500 11px Inter, ui-sans-serif, system-ui, sans-serif';
export function measureLabel(text: string): { width: number; height: number } {
  if (!text) return { width: 0, height: 0 };
  try {
    ctx ??= document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = LABEL_FONT;
      return { width: Math.ceil(ctx.measureText(text).width) + 16, height: 20 };
    }
  } catch {
    /* estimation ci-dessous */
  }
  return { width: Math.ceil(text.length * 6.4) + 16, height: 20 };
}

/* ---------- Texte accessible ---------- */

export function methodText(n: GraphNode): string {
  if (n.stepKind === 'async-send') return 'SEND';
  if (n.stepKind === 'async-receive') return 'RECEIVE';
  if (n.stepKind === 'workflow') return 'WORKFLOW';
  if (n.methodSource === 'unresolved' || !n.method) return 'OP';
  return n.method;
}

export function kindText(n: GraphNode, m: Messages): string {
  switch (n.stepKind) {
    case 'async-send':
      return m.kindSend(n.channel ?? '?');
    case 'async-receive':
      return m.kindReceive(
        n.channel ?? '?',
        n.timeoutMs != null ? formatTimeout(n.timeoutMs, m.lang) : undefined,
        n.correlationId,
      );
    case 'workflow':
      return m.kindWorkflow(shortWorkflow(n.targetWorkflowId ?? '?'), n.collapsed, n.innerStepCount);
    default:
      return m.kindHttp(methodText(n), n.path);
  }
}

export function nodeTitle(n: GraphNode, g: WorkflowGraph): string {
  return n.kind === 'step' ? n.label : n.kind === 'end' ? (n.endType === 'failure' ? 'Échec' : 'Fin') : n.label || g.title;
}

export function exitText(e: GraphEdge, target: GraphNode | undefined, m: Messages): string {
  const endName = m.lang === 'fr' ? (target?.endType === 'failure' ? 'la fin en échec' : 'la fin') : target?.endType === 'failure' ? 'the failure end' : 'the end';
  const t = target
    ? target.kind === 'end'
      ? endName
      : target.kind === 'output'
        ? m.outputs.toLowerCase()
        : target.kind === 'junction'
          ? m.junction.toLowerCase()
          : target.label
    : e.target;
  switch (e.kind) {
    case 'success':
    case 'end-success':
      return m.exitSuccess(t);
    case 'failure':
    case 'end-failure':
    case 'implicit-failure':
    case 'transfer':
      return e.origin === 'onSuccess' ? m.exitSuccess(t) : m.exitFailure(t);
    case 'retry':
      return m.exitRetry(e.retryLimit ?? 1, e.retryAfter ?? 0, e.via);
    case 'workflow-call':
      return m.exitCall(t);
    case 'depends-on':
      return m.exitDepends(t);
    default:
      return m.exitNext(t);
  }
}

export function ariaLabelFor(n: GraphNode, g: WorkflowGraph, m: Messages): string {
  const byId = new Map(g.nodes.map((x) => [x.id, x]));
  const out = g.edges.filter((e) => e.source === n.id);
  const total = g.nodes.filter((x) => x.kind === 'step' && x.workflowId === n.workflowId).length;
  switch (n.kind) {
    case 'step':
      return m.ariaStep({
        order: n.order,
        total,
        id: n.label,
        kindText: kindText(n, m),
        source: n.source,
        exits: out.map((e) => exitText(e, byId.get(e.target), m)),
        diagnostics: n.diagnostics?.length ?? 0,
      });
    case 'input': {
      const ins = n.inputs ?? [];
      return m.ariaInputs(ins.length, ins.filter((i) => i.required).length, ins.map((i) => i.name));
    }
    case 'output':
      return m.ariaOutputs((n.workflowOutputs ?? []).map((o) => o.name));
    case 'end':
      return m.ariaEnd(n.endType === 'failure', new Set(g.edges.filter((e) => e.target === n.id).map((e) => e.source)).size);
    case 'junction': {
      const target = out[0] ? byId.get(out[0].target)?.label ?? '?' : '?';
      const deps = g.edges.filter((e) => e.target === n.id).map((e) => byId.get(e.source)?.label ?? e.source);
      return m.ariaJunction(target, deps);
    }
    case 'workflow-ref':
      return m.ariaRef(shortWorkflow(n.targetWorkflowId ?? n.label), n.source);
  }
}
