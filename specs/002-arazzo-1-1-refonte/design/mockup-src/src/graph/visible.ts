import type { GraphEdge, GraphNode, WorkflowGraph } from './model';

export interface VisibilityOptions {
  showFailureEdges: boolean;
  showImplicitFailures: boolean;
  /** groupId → replié */
  collapsed: Record<string, boolean>;
}

const FAILURE_KINDS = new Set(['failure', 'end-failure', 'implicit-failure']);

/**
 * Graphe effectivement rendu : filtre des arêtes d'échec, échecs implicites,
 * repli des sous-workflows (le groupe devient un nœud Référence « ▸ n étapes »).
 */
export function visibleGraph(g: WorkflowGraph, o: VisibilityOptions): WorkflowGraph {
  let nodes: GraphNode[] = g.nodes;
  let edges: GraphEdge[] = g.edges.filter((e) => {
    if (e.kind === 'implicit-failure' && !o.showImplicitFailures) return false;
    if (!o.showFailureEdges && (FAILURE_KINDS.has(e.kind) || e.origin === 'onFailure')) return false;
    return true;
  });

  const groups = g.groups.map((gr) => ({ ...gr, collapsed: o.collapsed[gr.id] ?? gr.collapsed ?? false }));
  for (const gr of groups) {
    if (gr.kind !== 'workflow' || !gr.collapsed) continue;
    const members = new Set(nodes.filter((n) => n.groupId === gr.id).map((n) => n.id));
    const proxyId = `${gr.id}:collapsed`;
    const first = nodes.find((n) => members.has(n.id));
    nodes = nodes.filter((n) => !members.has(n.id));
    nodes.push({
      id: proxyId,
      kind: 'workflow-ref',
      workflowId: g.workflowId,
      label: gr.workflowId ?? gr.label,
      targetWorkflowId: gr.workflowId ?? gr.label,
      collapsed: true,
      innerStepCount: members.size,
      source: first?.source,
    });
    const seen = new Set<string>();
    edges = edges
      .map((e) => ({
        ...e,
        source: members.has(e.source) ? proxyId : e.source,
        target: members.has(e.target) ? proxyId : e.target,
        sourcePort: members.has(e.source) ? ('out-next' as const) : e.sourcePort,
        targetPort: members.has(e.target) ? ('in' as const) : e.targetPort,
      }))
      .filter((e) => !(e.source === proxyId && e.target === proxyId))
      .filter((e) => {
        const k = `${e.kind}|${e.source}|${e.target}|${e.via ?? ''}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }

  // Nœuds terminaux / jonctions / références devenus orphelins.
  const touched = new Set(edges.flatMap((e) => [e.source, e.target]));
  nodes = nodes.filter((n) => n.kind === 'step' || n.kind === 'input' || n.kind === 'output' || touched.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  return { ...g, nodes, edges, groups };
}
