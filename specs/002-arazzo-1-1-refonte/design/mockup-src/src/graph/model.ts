/**
 * Modèle de graphe Arazzo indépendant du moteur de rendu.
 * Proposition D1 du format `{ nodes, edges, groups }` produit par `workflowToGraph` (lot C1).
 * Les maquettes consomment des modèles déjà calculés ; G1 alignera ces types sur ceux de
 * `@connethics/arazzo-core` (voir UI-SPEC.md, §2).
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';

/** D'où vient la méthode HTTP affichée : jamais devinée silencieusement. */
export type MethodSource = 'operationPath' | 'openapi' | 'unresolved' | 'inferred';

export type NodeKind = 'input' | 'step' | 'output' | 'end' | 'junction' | 'workflow-ref';
export type StepKind = 'http' | 'async-send' | 'async-receive' | 'workflow';

export type PortId = 'in' | 'in-deps' | 'out-next' | 'out-success' | 'out-failure' | 'out-retry' | 'out-call';

export interface Criterion {
  condition: string;
  context?: string;
  type?: 'simple' | 'regex' | 'jsonpath' | 'xpath' | 'jsonpointer';
  version?: string;
}

export interface SelectorRef {
  context: string;
  selector: string;
  type: 'jsonpath' | 'xpath' | 'jsonpointer';
  version?: string;
}

export interface GraphDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface InputProp {
  name: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface OutputEntry {
  name: string;
  expression?: string;
  selector?: SelectorRef;
}

export interface StepParam {
  name: string;
  in?: 'path' | 'query' | 'querystring' | 'header' | 'cookie' | 'channel';
  value?: string;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  workflowId: string;
  /** stepId pour une étape, titre pour les autres nœuds. */
  label: string;
  stepKind?: StepKind;
  /** Rang 1-based dans `steps` (ordre du document). */
  order?: number;
  summary?: string;
  operationId?: string;
  method?: HttpMethod;
  methodSource?: MethodSource;
  path?: string;
  channel?: string;
  action?: 'send' | 'receive';
  /** Nom de la sourceDescription : sert aux couloirs. */
  source?: string;
  criteria?: Criterion[];
  timeoutMs?: number;
  correlationId?: string;
  stepOutputs?: string[];
  parameters?: StepParam[];
  hasRequestBody?: boolean;
  targetWorkflowId?: string;
  external?: boolean;
  collapsed?: boolean;
  innerStepCount?: number;
  dependsOn?: string[];
  inputs?: InputProp[];
  workflowOutputs?: OutputEntry[];
  endType?: 'success' | 'failure';
  /** Groupe (sous-workflow déplié) auquel le nœud appartient. */
  groupId?: string;
  diagnostics?: GraphDiagnostic[];
  /** Les actions par défaut du workflow s'appliquent à cette étape (indicateur ⓦ). */
  usesWorkflowDefaults?: boolean;
  recursive?: boolean;
}

export type EdgeKind =
  | 'sequence'
  | 'success'
  | 'failure'
  | 'retry'
  | 'end-success'
  | 'end-failure'
  | 'implicit-failure'
  | 'depends-on'
  | 'workflow-call'
  | 'transfer';

export interface GraphEdge {
  id: string;
  kind: EdgeKind;
  source: string;
  target: string;
  sourcePort: PortId;
  targetPort: PortId;
  /** `name` de l'action Arazzo. */
  name?: string;
  criteria?: Criterion[];
  retryLimit?: number;
  retryAfter?: number;
  /** true si retryLimit/retryAfter sont des valeurs par défaut (affichées en italique). */
  retryDefaults?: boolean;
  /** Retry avec workflowId/stepId : cible exécutée avant de rejouer l'étape. */
  via?: string;
  /** Action réutilisable résolue (`$components.failureActions.x`). */
  reference?: string;
  origin?: 'onSuccess' | 'onFailure' | 'workflowDefault' | 'implicit' | 'dependsOn';
  /** Arête qui remonte dans l'ordre des steps (goto arrière). */
  backward?: boolean;
}

export interface GraphGroup {
  id: string;
  kind: 'source' | 'workflow';
  label: string;
  sourceType?: 'openapi' | 'asyncapi' | 'arazzo' | 'unknown';
  workflowId?: string;
  collapsed?: boolean;
  order: number;
}

export interface ActionSummary {
  name: string;
  type: 'goto' | 'end' | 'retry';
  criteria?: Criterion[];
  retryLimit?: number;
  retryAfter?: number;
  target?: string;
}

export interface SourceInfo {
  name: string;
  type: 'openapi' | 'asyncapi' | 'arazzo';
  url: string;
}

export interface WorkflowGraph {
  workflowId: string;
  title: string;
  summary?: string;
  arazzo: string;
  sources: SourceInfo[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Groupes : sous-workflows dépliés (kind workflow). Les couloirs se déduisent de `sources`. */
  groups: GraphGroup[];
  defaults?: { successActions?: ActionSummary[]; failureActions?: ActionSummary[] };
}

export const STEP_PORTS: PortId[] = ['in', 'in-deps', 'out-next', 'out-success', 'out-retry', 'out-failure', 'out-call'];
