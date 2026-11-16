/**
 * Petit constructeur de modèles de graphe « déjà calculés » pour les maquettes.
 * Il ne parse pas d'Arazzo : il reproduit à la main ce que `workflowToGraph` (C1) doit produire.
 */
import type {
  Criterion,
  EdgeKind,
  GraphEdge,
  GraphGroup,
  GraphNode,
  PortId,
  SourceInfo,
  WorkflowGraph,
} from '../graph/model';

export const c = (condition: string, extra: Partial<Criterion> = {}): Criterion => ({ condition, ...extra });

const DEFAULT_PORTS: Record<EdgeKind, [PortId, PortId]> = {
  sequence: ['out-next', 'in'],
  success: ['out-success', 'in'],
  failure: ['out-failure', 'in'],
  retry: ['out-retry', 'in'],
  'end-success': ['out-success', 'in'],
  'end-failure': ['out-failure', 'in'],
  'implicit-failure': ['out-failure', 'in'],
  'depends-on': ['out-next', 'in'],
  'workflow-call': ['out-call', 'in'],
  transfer: ['out-failure', 'in'],
};

export class GraphBuilder {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  groups: GraphGroup[] = [];
  private order = 0;
  private n = 0;

  constructor(
    public workflowId: string,
    public title: string,
    public sources: SourceInfo[],
    public arazzo = '1.1.0',
  ) {}

  id(local: string) {
    return `${this.workflowId}/${local}`;
  }

  input(inputs: GraphNode['inputs']) {
    this.nodes.push({ id: this.id('$inputs'), kind: 'input', workflowId: this.workflowId, label: 'Entrées', inputs });
    return this.id('$inputs');
  }

  output(workflowOutputs: GraphNode['workflowOutputs']) {
    this.nodes.push({ id: this.id('$outputs'), kind: 'output', workflowId: this.workflowId, label: 'Sorties', workflowOutputs });
    return this.id('$outputs');
  }

  end(type: 'success' | 'failure') {
    const id = this.id(type === 'failure' ? '$end-failure' : '$end-success');
    if (!this.nodes.some((n) => n.id === id))
      this.nodes.push({ id, kind: 'end', workflowId: this.workflowId, label: type === 'failure' ? 'Échec' : 'Fin', endType: type });
    return id;
  }

  /**
   * Jonction dependsOn, insérée juste AVANT l'étape cible dans l'ordre du modèle :
   * avec cycleBreaking MODEL_ORDER, une jonction placée après sa cible produirait une arête inversée.
   */
  junction(targetNodeId: string) {
    const id = `${targetNodeId}#join`;
    const node: GraphNode = { id, kind: 'junction', workflowId: this.workflowId, label: 'Jonction' };
    const idx = this.nodes.findIndex((n) => n.id === targetNodeId);
    if (idx >= 0) this.nodes.splice(idx, 0, node);
    else this.nodes.push(node);
    return id;
  }

  ref(targetWorkflowId: string, extra: Partial<GraphNode> = {}) {
    const id = this.id(`$ref:${targetWorkflowId}`);
    if (!this.nodes.some((n) => n.id === id))
      this.nodes.push({ id, kind: 'workflow-ref', workflowId: this.workflowId, label: targetWorkflowId, targetWorkflowId, ...extra });
    return id;
  }

  step(stepId: string, s: Partial<GraphNode> & Pick<GraphNode, 'stepKind'>, opts: { groupId?: string; workflowId?: string } = {}) {
    const wf = opts.workflowId ?? this.workflowId;
    const id = `${wf}/${stepId}`;
    const order = wf === this.workflowId ? ++this.order : undefined;
    this.nodes.push({ id, kind: 'step', workflowId: wf, label: stepId, order, groupId: opts.groupId, ...s });
    return id;
  }

  group(g: Omit<GraphGroup, 'order'>) {
    this.groups.push({ ...g, order: this.groups.length });
  }

  edge(kind: EdgeKind, source: string, target: string, e: Partial<GraphEdge> = {}) {
    let [sp, tp] = DEFAULT_PORTS[kind];
    // Retry « via » un workflow : part du port d'échec (la boucle garde son port dédié out-retry).
    if (kind === 'retry' && source !== target) sp = 'out-failure';
    this.edges.push({
      id: `e${++this.n}:${kind}`,
      kind,
      source,
      target,
      sourcePort: sp,
      targetPort: tp,
      origin:
        kind === 'failure' || kind === 'end-failure' || kind === 'retry'
          ? 'onFailure'
          : kind === 'success' || kind === 'end-success'
            ? 'onSuccess'
            : kind === 'depends-on'
              ? 'dependsOn'
              : kind === 'implicit-failure'
                ? 'implicit'
                : undefined,
      ...e,
    });
  }

  build(extra: Partial<WorkflowGraph> = {}): WorkflowGraph {
    return {
      workflowId: this.workflowId,
      title: this.title,
      arazzo: this.arazzo,
      sources: this.sources,
      nodes: this.nodes,
      edges: this.edges,
      groups: this.groups,
      ...extra,
    };
  }
}
