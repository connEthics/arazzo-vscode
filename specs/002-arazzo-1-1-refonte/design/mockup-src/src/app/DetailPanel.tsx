import type { GraphEdge, GraphNode, WorkflowGraph } from '../graph/model';
import type { Messages } from '../graph/messages';
import { ariaLabelFor, edgeLabelText, formatTimeout, methodText, shortWorkflow } from '../graph/format';

const KIND_LABEL: Record<GraphEdge['kind'], string> = {
  sequence: 'séquence',
  success: 'succès',
  failure: 'échec',
  retry: 'retry',
  'end-success': 'fin (succès)',
  'end-failure': 'fin (échec)',
  'implicit-failure': 'échec implicite',
  'depends-on': 'dependsOn',
  'workflow-call': 'appel',
  transfer: 'transfert',
};

const METHOD_SOURCE: Record<string, string> = {
  operationPath: 'exacte (operationPath)',
  openapi: 'OpenAPI résolu',
  unresolved: 'non résolue (badge OP)',
  inferred: 'déduite du nom (option)',
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{children}</dd>
    </>
  );
}

function nameOf(g: WorkflowGraph, id: string) {
  const n = g.nodes.find((x) => x.id === id);
  if (!n) return id;
  if (n.kind === 'end') return n.endType === 'failure' ? 'Fin en échec' : 'Fin';
  if (n.kind === 'junction') return 'Jonction';
  return n.label;
}

export function DetailPanel({ graph, node, messages }: { graph: WorkflowGraph; node: GraphNode | null; messages: Messages }) {
  if (!node) {
    const steps = graph.nodes.filter((n) => n.kind === 'step');
    return (
      <aside className="detail" aria-label="Détail">
        <h2>{graph.title}</h2>
        {graph.summary ? <p className="detail__summary">{graph.summary}</p> : null}
        <dl className="detail__dl">
          <Row k="Étapes">{steps.length}</Row>
          <Row k="Arêtes">{graph.edges.length}</Row>
          <Row k="Sources">{graph.sources.map((s) => `${s.name} (${s.type})`).join(', ')}</Row>
          <Row k="Sous-workflows">{graph.groups.filter((g) => g.kind === 'workflow').map((g) => g.label).join(', ') || '—'}</Row>
        </dl>
        <h3>À essayer</h3>
        <ul className="detail__tips">
          <li>Cliquer une étape : panneau de détail. Double-clic ou <kbd>Entrée</kbd> : « révéler dans l’éditeur ».</li>
          <li>
            <kbd>Tab</kbd> pour entrer dans le graphe, puis <kbd>↓</kbd> <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd>, <kbd>Alt</kbd>+<kbd>↓</kbd> pour suivre l’échec.
          </li>
          <li>
            <kbd>/</kbd> recherche, <kbd>F</kbd> mode focus, <kbd>D</kbd> TB/LR, <kbd>L</kbd> couloirs, <kbd>E</kbd> arêtes d’échec, <kbd>?</kbd> aide.
          </li>
          <li>Survoler une arête ou un libellé : critères complets.</li>
          <li>Bouton « Densité » : compact, standard, détaillé (critères verbatim).</li>
        </ul>
      </aside>
    );
  }

  const out = graph.edges.filter((e) => e.source === node.id);
  const inc = graph.edges.filter((e) => e.target === node.id);
  return (
    <aside className="detail" aria-label={`Détail de ${node.label}`}>
      <div className="detail__head">
        {node.kind === 'step' ? (
          <span className={`af-badge af-badge--${node.stepKind === 'async-send' ? 'send' : node.stepKind === 'async-receive' ? 'receive' : node.stepKind === 'workflow' ? 'workflow' : methodText(node) === 'OP' ? 'op' : methodText(node).toLowerCase()}`}>
            {methodText(node)}
          </span>
        ) : (
          <span className="af-badge af-badge--op">{node.kind.toUpperCase()}</span>
        )}
        <h2>{node.kind === 'step' ? node.label : nameOf(graph, node.id)}</h2>
        {node.order ? <span className="detail__order">#{node.order}</span> : null}
      </div>
      {node.summary ? <p className="detail__summary">{node.summary}</p> : null}

      <dl className="detail__dl">
        <Row k="Workflow">
          <code>{node.workflowId}</code>
        </Row>
        {node.source ? (
          <Row k="Source">
            {node.source} ({graph.sources.find((s) => s.name === node.source)?.type ?? '?'})
          </Row>
        ) : null}
        {node.operationId ? (
          <Row k="operationId">
            <code>{node.operationId}</code>
          </Row>
        ) : null}
        {node.stepKind === 'http' ? (
          <Row k="Méthode">
            {methodText(node)} · {METHOD_SOURCE[node.methodSource ?? 'unresolved']}
          </Row>
        ) : null}
        {node.path ? (
          <Row k="Chemin">
            <code>{node.path}</code>
          </Row>
        ) : null}
        {node.channel ? (
          <Row k="Canal">
            <code>{node.channel}</code> · action <code>{node.action}</code>
          </Row>
        ) : null}
        {node.correlationId ? (
          <Row k="correlationId">
            <code>{node.correlationId}</code>
          </Row>
        ) : null}
        {node.timeoutMs != null ? (
          <Row k="timeout">
            <code>{node.timeoutMs}</code> ms ({formatTimeout(node.timeoutMs, messages.lang)}) — à l’expiration : onFailure, sinon échec du workflow
          </Row>
        ) : null}
        {node.targetWorkflowId ? (
          <Row k="workflowId">
            <code>{node.targetWorkflowId}</code>
            {node.external ? ' (externe)' : ''}
          </Row>
        ) : null}
        {node.dependsOn?.length ? (
          <Row k="dependsOn">
            {node.dependsOn.map((d) => (
              <code key={d}>{d}</code>
            ))}
          </Row>
        ) : null}
        {node.usesWorkflowDefaults ? <Row k="Défauts">ⓦ actions par défaut du workflow applicables</Row> : null}
      </dl>

      {node.parameters?.length ? (
        <>
          <h3>Paramètres</h3>
          <ul className="detail__list">
            {node.parameters.map((p) => (
              <li key={p.name}>
                <code>{p.name}</code>
                {p.in ? <span className={`detail__tag${p.in === 'querystring' ? ' detail__tag--new' : ''}`}>in: {p.in}</span> : null}
                <code className="detail__expr">{p.value}</code>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {node.criteria?.length ? (
        <>
          <h3>successCriteria</h3>
          <ul className="detail__list">
            {node.criteria.map((c, i) => (
              <li key={i}>
                <code className="detail__expr">{c.condition}</code>
                {c.type ? <span className="detail__tag">{c.type}{c.version ? ` ${c.version}` : ''}</span> : null}
                {c.context ? <span className="detail__ctx">context <code>{c.context}</code></span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {node.inputs?.length ? (
        <>
          <h3>Propriétés</h3>
          <ul className="detail__list">
            {node.inputs.map((i) => (
              <li key={i.name}>
                <code>{i.name}</code> <span className="detail__muted">{i.type}</span>
                {i.required ? <span className="detail__tag">requis</span> : null}
                {i.default !== undefined ? <code className="detail__expr">= {JSON.stringify(i.default)}</code> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {node.workflowOutputs?.length ? (
        <>
          <h3>Sorties</h3>
          <ul className="detail__list">
            {node.workflowOutputs.map((o) => (
              <li key={o.name}>
                <code>{o.name}</code>
                {o.selector ? (
                  <span className="detail__selector">
                    <span className="detail__tag detail__tag--new">Selector {o.selector.type}{o.selector.version ? ` ${o.selector.version}` : ''}</span>
                    <code className="detail__expr">{o.selector.selector}</code>
                    <span className="detail__ctx">context <code>{o.selector.context}</code></span>
                  </span>
                ) : (
                  <code className="detail__expr">{o.expression}</code>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {node.stepOutputs?.length ? (
        <>
          <h3>outputs</h3>
          <p className="detail__inline">
            {node.stepOutputs.map((o) => (
              <code key={o}>{o}</code>
            ))}
          </p>
        </>
      ) : null}

      {out.length ? (
        <>
          <h3>Issues ({out.length})</h3>
          <ul className="detail__list">
            {out.map((e) => (
              <li key={e.id}>
                <span className={`af-edge-label af-edge-label--${e.kind} detail__edge`}>
                  {edgeLabelText(e, 'standard', messages.lang) || KIND_LABEL[e.kind]}
                </span>
                → {e.target === e.source ? 'elle-même' : e.via && e.kind === 'retry' ? `${e.via} puis rejeu` : nameOf(graph, e.target)}
                {e.criteria?.length ? <code className="detail__expr">si {e.criteria.map((c) => c.condition).join(' ET ')}</code> : null}
                {e.reference ? <span className="detail__ctx">réutilisable <code>{e.reference}</code></span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {inc.length ? (
        <p className="detail__muted detail__small">
          Entrées : {[...new Set(inc.map((e) => nameOf(graph, e.source)))].join(', ')}
        </p>
      ) : null}

      {node.diagnostics?.length ? (
        <>
          <h3>Diagnostics (core)</h3>
          <ul className="detail__list">
            {node.diagnostics.map((d) => (
              <li key={d.code + d.message} className={`detail__diag detail__diag--${d.severity}`}>
                <strong>{d.severity === 'error' ? 'Erreur' : d.severity === 'warning' ? 'Avertissement' : 'Info'}</strong> <code>{d.code}</code> — {d.message}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3>Nom accessible (aria-label)</h3>
      <p className="detail__aria">{ariaLabelFor(node, graph, messages)}</p>
      {node.targetWorkflowId ? <p className="detail__muted detail__small">Ouvrir : {shortWorkflow(node.targetWorkflowId)} (callback onOpenWorkflow)</p> : null}
    </aside>
  );
}
