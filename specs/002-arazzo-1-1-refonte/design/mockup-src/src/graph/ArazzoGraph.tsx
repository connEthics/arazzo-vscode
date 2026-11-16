/**
 * <ArazzoGraph> — prototype D1 du composant partagé `@connethics/arazzo-flow` (G1).
 * Lecture seule, layout ELK layered en Web Worker, CSS pur à variables `--af-*`.
 */
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Node,
} from '@xyflow/react';
import type { GraphEdge, GraphNode, WorkflowGraph } from './model';
import { fr, type Messages } from './messages';
import { ariaLabelFor, edgeLabelText, exitText, kindText, type Density, type Direction } from './format';
import { computeLayout, structureKey, type LanesMode, type LayoutResult } from './layout/layout';
import { visibleGraph } from './visible';
import { createUiStore, UiStoreContext, useUi, type UiStore } from './store';
import { nodeTypes, type AfNode, type FrameNode } from './nodes/nodes';
import { edgeTypes, type AfRFEdge } from './edges/AfEdge';
import { Legend } from './Legend';
import {
  IconArrowDown,
  IconArrowRight,
  IconDensity,
  IconFailureEdges,
  IconFit,
  IconKeyboard,
  IconLanes,
  IconLegend,
  IconMap,
  IconMinus,
  IconOneToOne,
  IconPlus,
  IconSearch,
  IconX,
} from './icons';

export type DensityProp = 'auto' | Density;

export interface ArazzoGraphApi {
  fitView: () => void;
  focusStep: (nodeId: string) => void;
  search: (q: string) => void;
  select: (nodeId: string | null) => void;
  /** Centre la vue sur un nœud au zoom donné (défaut : zoom courant). */
  centerOn: (nodeId: string, zoom?: number) => void;
}

export interface LayoutStats {
  ms: number;
  mode: string;
  nodes: number;
  edges: number;
  density: Density;
}

export interface ArazzoGraphProps {
  graph: WorkflowGraph;
  /** Thème : `auto` suit `data-theme` / classes `body.vscode-*` ; les couleurs viennent des variables CSS. */
  theme?: 'auto' | 'connethics-light' | 'connethics-dark' | 'vscode';
  /** Contraste élevé (VS Code HC ou forced-colors) : renforce traits, supprime teintes et ombres. */
  highContrast?: boolean;
  layout?: Direction;
  lanes?: LanesMode;
  density?: DensityProp;
  selectedStepId?: string | null;
  onSelectStep?: (nodeId: string | null, node: GraphNode | null) => void;
  onRevealStep?: (node: GraphNode) => void;
  onOpenWorkflow?: (workflowId: string) => void;
  onLayout?: (stats: LayoutStats) => void;
  /** Appelé après le cadrage initial (fitView) d'un nouveau layout. */
  onViewportReady?: () => void;
  onOptionsChange?: (o: { layout: Direction; lanes: LanesMode; density: DensityProp }) => void;
  showFailureEdges?: boolean;
  showImplicitFailures?: boolean;
  showMinimap?: boolean;
  showLegend?: boolean;
  /** Légende dépliée au montage (repliée par défaut pour ne pas masquer le graphe). */
  legendExpanded?: boolean;
  collapsed?: Record<string, boolean>;
  messages?: Messages;
  ref?: Ref<ArazzoGraphApi>;
}

/** En dessous de ce zoom d'ajustement, la vue initiale cadre le début du workflow. */
const MIN_READABLE_FIT_ZOOM = 0.3;
const START_ZOOM_LARGE = 0.75;

const PRIMARY_NEXT = ['sequence', 'success', 'end-success', 'depends-on', 'workflow-call', 'retry', 'transfer', 'failure', 'end-failure', 'implicit-failure'];
const FAILURE_NEXT = ['failure', 'end-failure', 'retry', 'transfer', 'implicit-failure'];

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('vscode-reduce-motion');
  } catch {
    return false;
  }
}

function nodeTypeOf(n: GraphNode): string {
  return n.kind;
}

function edgeTitle(e: GraphEdge, g: WorkflowGraph, m: Messages, label: string): string {
  const t = g.nodes.find((x) => x.id === e.target);
  const parts = [label || (e.kind === 'sequence' ? m.then : e.kind), exitText(e, t, m)];
  if (e.criteria?.length) parts.push(`si ${e.criteria.map((c) => c.condition).join(' ET ')}`);
  if (e.reference) parts.push(`(réutilisable ${e.reference})`);
  if (e.retryDefaults) parts.push('(valeurs par défaut)');
  return parts.join(' — ');
}

function GraphInner(props: ArazzoGraphProps & { store: UiStore }) {
  const {
    graph,
    store,
    messages: m = fr,
    onSelectStep,
    onRevealStep,
    onLayout,
    onOptionsChange,
    highContrast,
  } = props;
  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);

  const [direction, setDirection] = useState<Direction>(props.layout ?? 'TB');
  const [lanes, setLanes] = useState<LanesMode>(props.lanes ?? 'off');
  const [densityPref, setDensityPref] = useState<DensityProp>(props.density ?? 'auto');
  const [showFailure, setShowFailure] = useState(props.showFailureEdges ?? true);
  const [showImplicit, setShowImplicit] = useState(props.showImplicitFailures ?? false);
  const [showMinimap, setShowMinimap] = useState(props.showMinimap ?? true);
  const [showLegend, setShowLegend] = useState(props.showLegend ?? true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(props.collapsed ?? {});
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [pending, setPending] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [fitDone, setFitDone] = useState(0);
  const focusedId = useRef<string | null>(null);
  const focusDepth = useRef(0);
  const generation = useRef(0);
  const lastFitKey = useRef<string>('');

  useEffect(() => setDirection(props.layout ?? 'TB'), [props.layout]);
  useEffect(() => setLanes(props.lanes ?? 'off'), [props.lanes]);
  useEffect(() => setDensityPref(props.density ?? 'auto'), [props.density]);
  useEffect(() => setCollapsed(props.collapsed ?? {}), [props.collapsed, graph]);
  useEffect(() => {
    store.set({ selectedId: null, matches: null, currentMatch: null, focusSet: null, hoverId: null });
    setQuery('');
  }, [graph, store]);
  useEffect(() => {
    if (props.selectedStepId !== undefined) store.set({ selectedId: props.selectedStepId });
  }, [props.selectedStepId, store]);
  useEffect(() => {
    onOptionsChange?.({ layout: direction, lanes, density: densityPref });
  }, [direction, lanes, densityPref, onOptionsChange]);

  // Marges du fitView : laisser la place à la recherche/barre d'outils (haut) et au bandeau des défauts.
  const fitPadding = useMemo(
    () => ({ top: graph.defaults ? '104px' : '64px', bottom: '36px', left: '28px', right: '28px' }) as const,
    [graph.defaults],
  );

  useEffect(() => {
    if (fitDone) props.onViewportReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitDone]);

  const vg = useMemo(
    () => visibleGraph(graph, { showFailureEdges: showFailure, showImplicitFailures: showImplicit, collapsed }),
    [graph, showFailure, showImplicit, collapsed],
  );
  const stepCount = vg.nodes.filter((n) => n.kind === 'step').length;
  const density: Density = densityPref === 'auto' ? (vg.nodes.length > 50 ? 'compact' : 'standard') : densityPref;
  const byId = useMemo(() => new Map(vg.nodes.map((n) => [n.id, n])), [vg]);

  // ---------- Layout (worker, génération, ancien layout conservé pendant le calcul) ----------
  useEffect(() => {
    const opts = { direction, lanes, density, lang: m.lang };
    const key = structureKey(vg, opts);
    if (layout?.key === key) return;
    const gen = ++generation.current;
    setPending(true);
    setAnnounce(m.announceLayoutPending);
    const timer = setTimeout(() => {
      computeLayout(vg, opts)
        .then((res) => {
          if (gen !== generation.current) return; // layout obsolète : ignoré
          setLayout(res);
          setPending(false);
          setAnnounce(m.announceLayout(res.ms, vg.nodes.length));
          onLayout?.({ ms: res.ms, mode: res.mode, nodes: vg.nodes.length, edges: vg.edges.length, density });
        })
        .catch((err) => {
          console.error(err);
          if (gen === generation.current) setPending(false);
        });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vg, direction, lanes, density, m.lang]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsed((c) => ({ ...c, [groupId]: !c[groupId] }));
  }, []);

  // ---------- Éléments React Flow ----------
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!layout) return { rfNodes: [] as Node[], rfEdges: [] as AfRFEdge[] };
    const frames: FrameNode[] = layout.frames.map((f) => ({
      id: `frame:${f.id}`,
      type: 'frame',
      position: { x: f.x, y: f.y },
      width: f.width,
      height: f.height,
      style: { width: f.width, height: f.height },
      data: { frame: f, messages: m, onToggle: f.kind === 'workflow' ? toggleGroup : undefined },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: f.kind === 'workflow' ? -1 : -2,
      className: 'af-rf-frame',
      ariaRole: 'group',
      ariaLabel: f.kind === 'workflow' ? `Sous-workflow ${f.label}` : `Couloir ${f.label}`,
    }));
    const nodes: AfNode[] = vg.nodes
      .filter((n) => layout.nodes[n.id])
      .map((n) => {
        const p = layout.nodes[n.id];
        return {
          id: n.id,
          type: nodeTypeOf(n),
          position: { x: p.x, y: p.y },
          width: p.width,
          height: p.height,
          style: { width: p.width, height: p.height },
          data: { node: n, placed: p, density, messages: m, outEdges: vg.edges.filter((e) => e.source === n.id) },
          draggable: false,
          connectable: false,
          selectable: false,
          focusable: true,
          ariaRole: 'group',
          ariaLabel: ariaLabelFor(n, vg, m),
          domAttributes: { 'aria-roledescription': n.kind === 'step' ? m.roleStep : n.kind },
        };
      });
    const edges: AfRFEdge[] = vg.edges
      .filter((e) => layout.edges[e.id] && layout.nodes[e.source] && layout.nodes[e.target])
      .map((e) => {
        const label = layout.edges[e.id].labelText || edgeLabelText(e, density, m.lang);
        return {
          id: e.id,
          type: 'af',
          source: e.source,
          target: e.target,
          sourceHandle: e.sourcePort,
          targetHandle: e.targetPort,
          focusable: false,
          selectable: false,
          data: { edge: e, placed: layout.edges[e.id], title: edgeTitle(e, vg, m, label) },
        };
      });
    return { rfNodes: [...frames, ...nodes] as Node[], rfEdges: edges };
  }, [layout, vg, density, m, toggleGroup]);

  // fitView après chaque layout dont la structure ou la direction change (pas après un simple rafraîchissement texte)
  useEffect(() => {
    if (!layout) return;
    const fitKey = `${graph.workflowId}|${layout.options.direction}|${layout.options.lanes}|${layout.options.density}|${vg.nodes.length}`;
    if (fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        await rf.fitView({ padding: fitPadding, maxZoom: 1, duration: 0 });
        // Grands graphes : si « tout voir » rend le texte illisible, cadrer le début du workflow
        // à un zoom lisible ; la mini-carte et la touche 1 donnent la vue d'ensemble.
        if (rf.getZoom() < MIN_READABLE_FIT_ZOOM) {
          const first = vg.nodes.find((n) => n.kind === 'input') ?? vg.nodes[0];
          const p = first && layout.nodes[first.id];
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (p && rect) {
            const z = START_ZOOM_LARGE;
            rf.setViewport({ x: rect.width / 2 - (p.x + p.width / 2) * z, y: 70 - p.y * z, zoom: z });
            setAnnounce(`${m.announceLayout(layout.ms, vg.nodes.length)} Vue cadrée sur le début ; touche 1 pour tout voir.`);
          }
        }
        setFitDone((n) => n + 1);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, rf, graph.workflowId, vg.nodes.length, fitPadding]);

  // ---------- Sélection / navigation ----------
  const select = useCallback(
    (id: string | null, opts: { announce?: boolean } = {}) => {
      store.set({ selectedId: id });
      const n = id ? byId.get(id) ?? null : null;
      onSelectStep?.(id, n);
      if (n && opts.announce !== false) {
        const exits = vg.edges.filter((e) => e.source === n.id).length;
        setAnnounce(m.announceSelected(n.label, n.kind === 'step' ? kindText(n, m) : n.kind, exits));
      }
    },
    [store, byId, onSelectStep, vg, m],
  );

  const focusNode = useCallback(
    (id: string) => {
      const el = wrapperRef.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        focusedId.current = id;
      }
      const p = layout?.nodes[id];
      if (p) {
        const vp = rf.getViewport();
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
          const sx = p.x * vp.zoom + vp.x;
          const sy = p.y * vp.zoom + vp.y;
          const out = sx < 0 || sy < 40 || sx + p.width * vp.zoom > rect.width || sy + p.height * vp.zoom > rect.height - 20;
          if (out)
            rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, {
              zoom: Math.max(vp.zoom, 0.6),
              duration: prefersReducedMotion() ? 0 : 150,
            });
        }
      }
    },
    [layout, rf],
  );

  const neighbor = useCallback(
    (id: string, dir: 'down' | 'up' | 'left' | 'right' | 'failure'): string | null => {
      const outs = vg.edges.filter((e) => e.source === id && e.target !== id);
      const ins = vg.edges.filter((e) => e.target === id && e.source !== id);
      const rank = (list: string[], k: string) => (list.indexOf(k) + 1 || 99);
      if (dir === 'down') return [...outs].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.target ?? null;
      if (dir === 'failure') return [...outs].filter((e) => FAILURE_NEXT.includes(e.kind) || e.origin === 'onFailure').sort((a, b) => rank(FAILURE_NEXT, a.kind) - rank(FAILURE_NEXT, b.kind))[0]?.target ?? null;
      if (dir === 'up') {
        const prim = ins.filter((e) => !e.backward);
        return [...(prim.length ? prim : ins)].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.source ?? null;
      }
      if (!layout) return null;
      const me = layout.nodes[id];
      if (!me) return null;
      const TB = layout.options.direction === 'TB';
      const c = (p: { x: number; y: number; width: number; height: number }) => (TB ? p.y + p.height / 2 : p.x + p.width / 2);
      const t = (p: { x: number; y: number; width: number; height: number }) => (TB ? p.x + p.width / 2 : p.y + p.height / 2);
      const same = Object.entries(layout.nodes)
        .filter(([oid, p]) => oid !== id && Math.abs(c(p) - c(me)) < (TB ? Math.max(p.height, me.height) : Math.max(p.width, me.width)) / 2 + 8)
        .sort((a, b) => t(a[1]) - t(b[1]));
      const mine = t(me);
      if (dir === 'right') return same.find(([, p]) => t(p) > mine)?.[0] ?? null;
      return [...same].reverse().find(([, p]) => t(p) < mine)?.[0] ?? null;
    },
    [vg, layout],
  );

  const runSearch = useCallback(
    (q: string, step = 0) => {
      setQuery(q);
      const s = q.trim().toLowerCase();
      if (!s) {
        store.set({ matches: null, currentMatch: null });
        return;
      }
      const hits = vg.nodes
        .filter((n) => [n.label, n.operationId, n.channel, n.summary, n.path, n.targetWorkflowId].some((v) => v?.toLowerCase().includes(s)))
        .map((n) => n.id);
      const cur = store.get().currentMatch;
      let idx = cur ? hits.indexOf(cur) : -1;
      idx = step === 0 ? (idx >= 0 ? idx : 0) : (idx + step + hits.length) % Math.max(hits.length, 1);
      const current = hits[idx] ?? null;
      store.set({ matches: new Set(hits), currentMatch: current });
      if (current) {
        const p = layout?.nodes[current];
        if (p) rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: Math.max(rf.getZoom(), 0.75), duration: prefersReducedMotion() ? 0 : 150 });
        setAnnounce(m.announceSearch(idx + 1, hits.length, q));
      } else setAnnounce(m.announceNoResult(q));
    },
    [vg, store, layout, rf, m],
  );

  const setFocusMode = useCallback(
    (id: string) => {
      focusDepth.current = store.get().focusSet && focusedId.current === id ? Math.min(focusDepth.current + 1, 2) : 1;
      let set = new Set([id]);
      for (let d = 0; d < focusDepth.current; d++) {
        const next = new Set(set);
        for (const e of vg.edges) {
          if (set.has(e.source)) next.add(e.target);
          if (set.has(e.target)) next.add(e.source);
        }
        set = next;
      }
      store.set({ focusSet: set });
      setAnnounce(m.announceFocusMode(byId.get(id)?.label ?? id));
    },
    [store, vg, byId, m],
  );

  const reveal = useCallback(
    (id: string) => {
      const n = byId.get(id);
      if (!n) return;
      select(id, { announce: false });
      onRevealStep?.(n);
      setAnnounce(m.announceReveal(n.label));
      setToast(`${m.announceReveal(n.label)} (message step-selected → éditeur)`);
    },
    [byId, select, onRevealStep, m],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const fit = useCallback(() => rf.fitView({ padding: fitPadding, maxZoom: 1, duration: prefersReducedMotion() ? 0 : 200 }), [rf, fitPadding]);
  const cycleLanes = useCallback(() => setLanes((l) => (l === 'off' ? 'clusters' : l === 'clusters' ? 'lanes' : 'off')), []);
  const cycleDensity = useCallback(
    () => setDensityPref((d) => (d === 'auto' ? 'compact' : d === 'compact' ? 'standard' : d === 'standard' ? 'detailed' : 'auto')),
    [],
  );

  useImperativeHandle(
    props.ref,
    () => ({
      fitView: fit,
      focusStep: (id) => focusNode(id),
      search: (q) => runSearch(q),
      select: (id) => select(id),
      centerOn: (id, zoom) => {
        const p = layout?.nodes[id];
        if (p) rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: zoom ?? rf.getZoom(), duration: 0 });
      },
    }),
    [fit, focusNode, runSearch, select, layout, rf],
  );

  // ---------- Clavier (actif seulement quand le canevas a le focus) ----------
  const onKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement;
    const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    if (inField) return;
    if (target.tagName === 'BUTTON' && (ev.key === 'Enter' || ev.key === ' ')) return;
    const cur = focusedId.current && byId.has(focusedId.current) ? focusedId.current : null;
    const k = ev.key;
    const go = (id: string | null) => {
      if (id) {
        ev.preventDefault();
        focusNode(id);
      }
    };
    if ((k === '/' && !ev.ctrlKey) || ((ev.ctrlKey || ev.metaKey) && k.toLowerCase() === 'f')) {
      ev.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (ev.ctrlKey || ev.metaKey) return;
    switch (k) {
      case 'ArrowDown':
        if (!cur) return go(vg.nodes[0]?.id ?? null);
        return go(neighbor(cur, ev.altKey ? 'failure' : 'down'));
      case 'ArrowUp':
        return cur ? go(neighbor(cur, 'up')) : undefined;
      case 'ArrowLeft':
        return cur ? go(neighbor(cur, layout?.options.direction === 'LR' ? 'up' : 'left')) : undefined;
      case 'ArrowRight':
        return cur ? go(neighbor(cur, layout?.options.direction === 'LR' ? 'down' : 'right')) : undefined;
      case 'Enter':
        if (cur) {
          ev.preventDefault();
          reveal(cur);
        }
        return;
      case ' ':
        if (cur) {
          ev.preventDefault();
          select(store.get().selectedId === cur ? null : cur);
        }
        return;
      case 'Escape': {
        const s = store.get();
        if (s.matches) runSearch('');
        else if (s.focusSet) store.set({ focusSet: null });
        else select(null);
        return;
      }
      case '+':
      case '=':
        ev.preventDefault();
        rf.zoomIn({ duration: 100 });
        return;
      case '-':
        ev.preventDefault();
        rf.zoomOut({ duration: 100 });
        return;
      case '0':
        rf.zoomTo(1, { duration: 100 });
        return;
      case '1':
      case 'F':
        if (k === 'F' && !ev.shiftKey) break;
        fit();
        return;
    }
    switch (k.toLowerCase()) {
      case 'f':
        if (cur) setFocusMode(cur);
        return;
      case 'e':
        setShowFailure((v) => !v);
        return;
      case 'l':
        cycleLanes();
        return;
      case 'd':
        setDirection((d) => (d === 'TB' ? 'LR' : 'TB'));
        return;
      case 'm':
        setShowMinimap((v) => !v);
        return;
      case '?':
        helpRef.current?.showModal();
        return;
    }
    if (k === '[' || k === ']' || k === '{' || k === '}') {
      const n = cur ? byId.get(cur) : null;
      const gid = n?.groupId ?? (n?.id.endsWith(':collapsed') ? n.id.replace(/:collapsed$/, '') : null);
      const collapse = k === '[' || k === '{';
      if (ev.shiftKey || k === '{' || k === '}') {
        const all: Record<string, boolean> = {};
        graph.groups.filter((g) => g.kind === 'workflow').forEach((g) => (all[g.id] = collapse));
        setCollapsed(all);
      } else if (gid) setCollapsed((c) => ({ ...c, [gid]: collapse }));
    }
  };

  const lod = useStore((s) => (s.transform[2] < 0.25 ? 'min' : s.transform[2] < 0.45 ? 'pill' : 'full'));
  const zoomPct = useStore((s) => Math.round(s.transform[2] * 100));
  const failuresCount = graph.edges.filter((e) => e.origin === 'onFailure' || e.kind === 'end-failure' || e.kind === 'failure').length;
  const subflows = graph.groups.filter((g) => g.kind === 'workflow').length;
  const descId = `af-desc-${graph.workflowId}`;
  const matches = useUi((s) => s.matches);
  const currentMatch = useUi((s) => s.currentMatch);
  const matchesInfo = (() => {
    if (!matches) return '';
    const arr = [...matches];
    return arr.length ? `${arr.indexOf(currentMatch ?? '') + 1}/${arr.length}` : '0';
  })();

  const defaults = graph.defaults;

  return (
    <div
      ref={wrapperRef}
      className="af-root af-canvas"
      role="application"
      aria-label={m.graphLabel(graph.workflowId)}
      aria-describedby={descId}
      aria-busy={pending || undefined}
      data-lod={lod}
      data-contrast={highContrast ? 'high' : undefined}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        const el = (e.target as HTMLElement).closest('.react-flow__node');
        const id = el?.getAttribute('data-id');
        if (id && byId.has(id)) focusedId.current = id;
      }}
    >
      <p id={descId} className="af-sr-only">
        {m.graphDescription(stepCount, subflows, failuresCount)}
      </p>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable
        edgesFocusable={false}
        disableKeyboardA11y
        autoPanOnNodeFocus={false}
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements={vg.nodes.length > 150}
        minZoom={0.08}
        maxZoom={2}
        colorMode={props.theme === 'connethics-dark' ? 'dark' : 'light'}
        ariaLabelConfig={{
          'node.a11yDescription.default': 'Flèches pour naviguer entre les étapes, Entrée pour révéler dans l’éditeur.',
          'node.a11yDescription.keyboardDisabled': 'Flèches pour naviguer entre les étapes, Entrée pour révéler dans l’éditeur, Espace pour sélectionner.',
          'edge.a11yDescription.default': 'Transition entre deux étapes.',
          'minimap.ariaLabel': 'Mini-carte du graphe',
          'controls.ariaLabel': 'Contrôles du graphe',
          'controls.zoomIn.ariaLabel': 'Zoom avant',
          'controls.zoomOut.ariaLabel': 'Zoom arrière',
          'controls.fitView.ariaLabel': 'Ajuster à la vue',
        }}
        onNodeClick={(_, n) => {
          if (n.type === 'frame') return;
          focusedId.current = n.id;
          select(store.get().selectedId === n.id ? null : n.id);
        }}
        onNodeDoubleClick={(_, n) => n.type !== 'frame' && reveal(n.id)}
        onNodeMouseEnter={(_, n) => n.type !== 'frame' && store.set({ hoverId: n.id })}
        onNodeMouseLeave={() => store.set({ hoverId: null })}
        onPaneClick={() => select(null)}
        proOptions={{ hideAttribution: false }}
        attributionPosition="bottom-center"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} className="af-bg" />
        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            ariaLabel="Mini-carte du graphe"
            nodeClassName={(n) => {
              const d = n.data as { node?: GraphNode; frame?: unknown };
              if (n.type === 'frame') return 'af-mm af-mm--frame';
              const gn = d.node;
              return `af-mm af-mm--${gn?.kind === 'step' ? gn.stepKind : gn?.kind}`;
            }}
            nodeBorderRadius={4}
            className="af-minimap"
          />
        )}

        <Panel position="top-left" className="af-panel af-search" role="search">
          <label className="af-search__box">
            <IconSearch size={14} />
            <span className="af-sr-only">Rechercher une étape</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Rechercher une étape  /"
              aria-describedby="af-search-hint"
              onChange={(e) => runSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch(query, e.shiftKey ? -1 : 1);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  const cur = store.get().currentMatch;
                  runSearch('');
                  if (cur) focusNode(cur);
                  else wrapperRef.current?.querySelector<HTMLElement>('.react-flow__node[tabindex]')?.focus();
                }
              }}
            />
            {query ? <span className="af-search__count">{matchesInfo}</span> : null}
            {query ? (
              <button type="button" className="af-iconbtn af-iconbtn--sm" aria-label="Effacer la recherche" onClick={() => runSearch('')}>
                <IconX size={12} />
              </button>
            ) : null}
          </label>
          <span id="af-search-hint" className="af-sr-only">
            Entrée : résultat suivant ; Maj+Entrée : précédent ; Échap : fermer.
          </span>
        </Panel>

        <Panel position="top-right" className="af-panel af-toolbar" aria-label="Barre d’outils du graphe">
          <div role="toolbar" aria-label="Barre d’outils du graphe" className="af-toolbar__row">
            <ToolBtn label="Zoom arrière (-)" onClick={() => rf.zoomOut({ duration: 100 })}>
              <IconMinus />
            </ToolBtn>
            <span className="af-toolbar__zoom" aria-hidden="true">{zoomPct} %</span>
            <ToolBtn label="Zoom avant (+)" onClick={() => rf.zoomIn({ duration: 100 })}>
              <IconPlus />
            </ToolBtn>
            <ToolBtn label="Zoom 100 % (0)" onClick={() => rf.zoomTo(1, { duration: 100 })}>
              <IconOneToOne />
            </ToolBtn>
            <ToolBtn label="Ajuster à la vue (1)" onClick={fit}>
              <IconFit />
            </ToolBtn>
            <span className="af-toolbar__sep" />
            <ToolBtn
              label={`Direction : ${direction === 'TB' ? 'haut → bas' : 'gauche → droite'} (D)`}
              pressed={direction === 'LR'}
              onClick={() => setDirection((d) => (d === 'TB' ? 'LR' : 'TB'))}
              text={direction}
            >
              {direction === 'TB' ? <IconArrowDown /> : <IconArrowRight />}
            </ToolBtn>
            <ToolBtn
              label={`Couloirs par source : ${lanes === 'off' ? 'désactivés' : lanes === 'clusters' ? 'groupes' : 'couloirs'} (L)`}
              pressed={lanes !== 'off'}
              onClick={cycleLanes}
              text={lanes === 'off' ? 'Off' : lanes === 'clusters' ? 'Groupes' : 'Couloirs'}
            >
              <IconLanes />
            </ToolBtn>
            <ToolBtn
              label={`Densité : ${densityPref === 'auto' ? `auto (${density})` : densityPref}`}
              onClick={cycleDensity}
              text={densityPref === 'auto' ? `Auto` : densityPref === 'compact' ? 'Compact' : densityPref === 'standard' ? 'Standard' : 'Détaillé'}
            >
              <IconDensity />
            </ToolBtn>
            <span className="af-toolbar__sep" />
            <ToolBtn label="Arêtes d’échec (E)" pressed={showFailure} onClick={() => setShowFailure((v) => !v)}>
              <IconFailureEdges />
            </ToolBtn>
            <ToolBtn label="Échecs implicites (non gérés)" pressed={showImplicit} onClick={() => setShowImplicit((v) => !v)} text="∅">
              {null}
            </ToolBtn>
            <ToolBtn label="Mini-carte (M)" pressed={showMinimap} onClick={() => setShowMinimap((v) => !v)}>
              <IconMap />
            </ToolBtn>
            <ToolBtn label="Légende" pressed={showLegend} onClick={() => setShowLegend((v) => !v)}>
              <IconLegend />
            </ToolBtn>
            <ToolBtn label="Raccourcis clavier (?)" onClick={() => helpRef.current?.showModal()}>
              <IconKeyboard />
            </ToolBtn>
          </div>
        </Panel>

        {defaults && (defaults.failureActions?.length || defaults.successActions?.length) ? (
          <Panel position="top-left" className="af-panel af-defaults" title={m.workflowDefaultsHint}>
            <span className="af-defaults__mark" aria-hidden="true">ⓦ</span>
            <strong>{m.workflowDefaults}</strong>
            {[...(defaults.successActions ?? []).map((a) => ({ ...a, f: false })), ...(defaults.failureActions ?? []).map((a) => ({ ...a, f: true }))].map((a) => (
              <span key={a.name} className={`af-defaults__rule af-edge-label af-edge-label--${a.type === 'retry' ? 'retry' : a.f ? 'failure' : 'success'}`}>
                {a.type === 'retry' ? `↻ ×${a.retryLimit ?? 1} · ${a.retryAfter ?? 0} s` : a.f ? `✗ ${a.name}` : `✓ ${a.name}`}
                {a.criteria?.length ? <span className="af-mono"> si {a.criteria.map((c) => c.condition).join(' ET ')}</span> : null}
              </span>
            ))}
            <span className="af-sr-only">{m.workflowDefaultsHint}</span>
          </Panel>
        ) : null}

        {showLegend ? (
          <Panel position="bottom-left" className="af-panel af-legend-panel">
            <Legend defaultOpen={props.legendExpanded ?? false} />
          </Panel>
        ) : null}

        {toast ? (
          <Panel position="bottom-center" className="af-panel af-toast" role="status">
            {toast}
          </Panel>
        ) : null}
      </ReactFlow>
      {pending && layout ? <div className="af-pending" aria-hidden="true">Mise en page…</div> : null}
      {!layout ? <div className="af-loading">{m.announceLayoutPending}</div> : null}
      <div className="af-sr-only" aria-live="polite" role="status">
        {announce}
      </div>
      <HelpDialog dialogRef={helpRef} />
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  pressed,
  children,
  text,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
  text?: string;
}) {
  return (
    <button
      type="button"
      className={`af-iconbtn${text ? ' af-iconbtn--text' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      onClick={onClick}
    >
      {children}
      {text ? <span className="af-iconbtn__text">{text}</span> : null}
    </button>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Tab / Maj+Tab', 'Nœud suivant / précédent (ordre du document)'],
  ['↓ / ↑', 'Successeur / prédécesseur principal'],
  ['← / →', 'Voisin dans la même couche'],
  ['Alt+↓', 'Suivre l’arête d’échec'],
  ['Entrée', 'Révéler dans l’éditeur (message step-selected)'],
  ['Espace', 'Sélectionner / désélectionner'],
  ['Échap', 'Sortir de la recherche, du focus, puis désélectionner'],
  ['+ / -', 'Zoom'],
  ['0', 'Zoom 100 %'],
  ['1 ou Maj+F', 'Ajuster à la vue'],
  ['F', 'Mode focus (voisinage 1 saut, 2 si répété)'],
  ['/ (Ctrl+F sur le web)', 'Rechercher une étape'],
  ['[ / ]', 'Replier / déplier le sous-workflow courant (Maj : tous)'],
  ['E', 'Afficher / masquer les arêtes d’échec'],
  ['L', 'Couloirs : off → groupes → couloirs'],
  ['D', 'Direction TB / LR'],
  ['M', 'Mini-carte'],
  ['?', 'Cette aide'],
];

function HelpDialog({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  return (
    <dialog ref={dialogRef} className="af-dialog" aria-labelledby="af-help-title">
      <div className="af-dialog__head">
        <h2 id="af-help-title">Raccourcis clavier du graphe</h2>
        <button type="button" className="af-iconbtn" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
          <IconX />
        </button>
      </div>
      <p className="af-dialog__note">Actifs uniquement quand le graphe a le focus. Aucun raccourci Ctrl/Cmd, sauf la recherche sur le web.</p>
      <table className="af-shortcuts">
        <tbody>
          {SHORTCUTS.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">
                <kbd>{k}</kbd>
              </th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </dialog>
  );
}

export function ArazzoGraph(props: ArazzoGraphProps) {
  const [store] = useState(createUiStore);
  return (
    <UiStoreContext.Provider value={store}>
      <ReactFlowProvider>
        <GraphInner {...props} store={store} />
      </ReactFlowProvider>
    </UiStoreContext.Provider>
  );
}
