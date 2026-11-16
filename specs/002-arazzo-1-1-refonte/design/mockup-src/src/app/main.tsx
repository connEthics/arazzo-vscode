import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/base.css';
import '../brand/tokens.css';
import '../graph/arazzo-flow.css';
import './app.css';
import markUrl from '../brand/arazzo-mark.svg';
import { ArazzoGraph, type ArazzoGraphApi, type DensityProp, type LayoutStats } from '../graph/ArazzoGraph';
import type { GraphNode, WorkflowGraph } from '../graph/model';
import { en, fr } from '../graph/messages';
import { SCENARIOS } from '../scenarios/scenarios';
import type { LanesMode } from '../graph/layout/layout';
import type { Direction } from '../graph/format';
import { DetailPanel } from './DetailPanel';

type ThemeId = 'light' | 'dark' | 'vscode-dark' | 'hc';
const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'ConnEthics clair' },
  { id: 'dark', label: 'ConnEthics sombre' },
  { id: 'vscode-dark', label: 'VS Code Dark+ (simulé)' },
  { id: 'hc', label: 'VS Code High Contrast (simulé)' },
];

function applyTheme(t: ThemeId) {
  const html = document.documentElement;
  const body = document.body;
  body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast', 'af-sim-darkplus', 'af-sim-hc');
  delete body.dataset.vscodeThemeKind;
  if (t === 'light' || t === 'dark') {
    html.dataset.theme = t;
  } else {
    // Webview VS Code simulé : classes body.vscode-* + variables --vscode-* factices (pont de thème réel de tokens.css)
    html.dataset.theme = 'light';
    if (t === 'vscode-dark') {
      body.classList.add('vscode-dark', 'af-sim-darkplus');
      body.dataset.vscodeThemeKind = 'vscode-dark';
    } else {
      body.classList.add('vscode-high-contrast', 'af-sim-hc');
      body.dataset.vscodeThemeKind = 'vscode-high-contrast';
    }
  }
}

function param(name: string): string | null {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

function App() {
  const [scenarioId, setScenarioId] = useState(param('scenario') ?? 'order-to-cash');
  const [theme, setTheme] = useState<ThemeId>((param('theme') as ThemeId) ?? 'light');
  const [lang, setLang] = useState<'fr' | 'en'>((param('lang') as 'fr' | 'en') ?? 'fr');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [stats, setStats] = useState<LayoutStats | null>(null);
  const [opts, setOpts] = useState<{ layout: Direction; lanes: LanesMode; density: DensityProp } | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const graph: WorkflowGraph = useMemo(() => scenario.build(), [scenario]);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    const pre = param('select');
    setSelected(pre ? graph.nodes.find((n) => n.id === `${graph.workflowId}/${pre}`) ?? null : null);
  }, [graph]);
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set('scenario', scenarioId);
    u.searchParams.set('theme', theme);
    try {
      history.replaceState(null, '', u);
    } catch {
      /* file:// sans history : ignoré */
    }
  }, [scenarioId, theme]);

  const initialLanes = (param('lanes') as LanesMode) ?? scenario.lanes ?? 'off';
  const initialDir = (param('dir') as Direction) ?? 'TB';
  const initialDensity = (param('density') as DensityProp) ?? 'auto';
  const initialSelect = param('select');
  const messages = lang === 'fr' ? fr : en;
  const onSelect = useCallback((_: string | null, n: GraphNode | null) => setSelected(n), []);
  const api = useRef<ArazzoGraphApi>(null);
  // Paramètres de capture : ?focus=<stepId>&zoom=1 recadre après le fitView initial.
  const onViewportReady = useCallback(() => {
    const focus = param('focus');
    const zoom = param('zoom');
    if (focus) api.current?.centerOn(`${graph.workflowId}/${focus}`, zoom ? Number(zoom) : undefined);
    if (param('overview') === '1') api.current?.fitView();
    document.body.dataset.ready = String(Date.now());
  }, [graph.workflowId]);
  const onOptions = useCallback((o: { layout: Direction; lanes: LanesMode; density: DensityProp }) => setOpts(o), []);

  return (
    <div className="app af-root" data-contrast={theme === 'hc' ? 'high' : undefined}>
      <header className="app-header">
        <div className="lockup" aria-label="Arazzo Studio by ConnEthics">
          <img src={markUrl} width={30} height={30} alt="" />
          <span className="lockup__name">
            Arazzo <span className="lockup__studio">Studio</span>
          </span>
          <span className="lockup__rule" aria-hidden="true" />
          <span className="lockup__by">
            by <span className="lockup__conn">Conn</span>
            <span className="lockup__ethics">Ethics</span>
          </span>
        </div>
        <span className="app-header__title">Graphe de workflow · maquettes D1</span>
        <div className="app-header__controls">
          <label className="field">
            <span>Scénario</span>
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Thème</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Langue des libellés accessibles">
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="app-main">
        <section className="app-graph" aria-label={`Graphe : ${graph.title}`}>
          <div className="app-graph__caption">
            <h1>{graph.title}</h1>
            <code>{graph.workflowId}</code>
            <span className="pill">arazzo {graph.arazzo}</span>
            {graph.sources.map((s) => (
              <span key={s.name} className={`pill pill--${s.type}`}>
                {s.name} · {s.type}
              </span>
            ))}
          </div>
          <div className="app-graph__canvas">
            <ArazzoGraph
              key={`${scenario.id}`}
              graph={graph}
              theme={theme === 'light' ? 'connethics-light' : theme === 'dark' ? 'connethics-dark' : 'vscode'}
              highContrast={theme === 'hc'}
              layout={initialDir}
              lanes={initialLanes}
              density={initialDensity}
              selectedStepId={initialSelect ? `${graph.workflowId}/${initialSelect}` : undefined}
              messages={messages}
              legendExpanded={param('legend') === '1'}
              onSelectStep={onSelect}
              onLayout={setStats}
              onOptionsChange={onOptions}
              onViewportReady={onViewportReady}
              ref={api}
            />
          </div>
        </section>
        <DetailPanel graph={graph} node={selected} messages={messages} />
      </main>
      <footer className="app-footer" aria-label="Mesures du layout">
        <span>
          ELK layered · {stats ? (stats.mode === 'worker' ? 'Web Worker (blob:)' : 'thread principal (repli)') : '…'}
        </span>
        <span>{stats ? `${stats.ms} ms` : ''}</span>
        <span>{stats ? `${stats.nodes} nœuds · ${stats.edges} arêtes` : ''}</span>
        <span>{stats ? `densité ${stats.density}` : ''}</span>
        <span>{opts ? `${opts.layout} · couloirs ${opts.lanes}` : ''}</span>
        <span className="app-footer__right">React 19 · @xyflow/react 12 · elkjs 0.11 · CSS --af-* → --ce-* → --vscode-*</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
