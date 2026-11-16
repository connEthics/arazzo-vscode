/** Dictionnaires i18n (FR par défaut, EN) : libellés d'UI, aria-label et annonces aria-live. */

export interface Messages {
  lang: 'fr' | 'en';
  inputs: string;
  outputs: string;
  endSuccess: string;
  endFailure: string;
  junction: string;
  step: string;
  steps: (n: number) => string;
  criteria: (n: number) => string;
  outputsCount: (n: number) => string;
  params: (n: number) => string;
  props: (n: number, req: number) => string;
  external: string;
  inferred: string;
  unresolved: string;
  workflowDefaults: string;
  workflowDefaultsHint: string;
  then: string;
  unhandledFailure: string;
  replayVia: (wf: string) => string;
  // aria
  graphLabel: (wf: string) => string;
  graphDescription: (steps: number, groups: number, failures: number) => string;
  ariaStep: (a: {
    order?: number;
    total: number;
    id: string;
    kindText: string;
    source?: string;
    exits: string[];
    diagnostics: number;
  }) => string;
  ariaInputs: (n: number, req: number, names: string[]) => string;
  ariaOutputs: (names: string[]) => string;
  ariaEnd: (failure: boolean, from: number) => string;
  ariaJunction: (target: string, deps: string[]) => string;
  ariaRef: (wf: string, source?: string) => string;
  exitSuccess: (t: string) => string;
  exitFailure: (t: string) => string;
  exitRetry: (limit: number, after: number, via?: string) => string;
  exitNext: (t: string) => string;
  exitCall: (t: string) => string;
  exitDepends: (t: string) => string;
  kindHttp: (method: string, path?: string) => string;
  kindSend: (channel: string) => string;
  kindReceive: (channel: string, timeout?: string, corr?: string) => string;
  kindWorkflow: (wf: string, collapsed?: boolean, n?: number) => string;
  roleStep: string;
  announceSelected: (label: string, detail: string, exits: number) => string;
  announceLayout: (ms: number, nodes: number) => string;
  announceLayoutPending: string;
  announceSearch: (i: number, n: number, q: string) => string;
  announceNoResult: (q: string) => string;
  announceFocusMode: (label: string) => string;
  announceReveal: (label: string) => string;
}

const nfFr = (n: number) => String(n).replace('.', ',');

export const fr: Messages = {
  lang: 'fr',
  inputs: 'Entrées',
  outputs: 'Sorties',
  endSuccess: 'Fin',
  endFailure: 'Échec',
  junction: 'Jonction',
  step: 'Étape',
  steps: (n) => `${n} étape${n > 1 ? 's' : ''}`,
  criteria: (n) => `${n} critère${n > 1 ? 's' : ''}`,
  outputsCount: (n) => `${n} output${n > 1 ? 's' : ''}`,
  params: (n) => `${n} paramètre${n > 1 ? 's' : ''}`,
  props: (n, req) => `${n} propriété${n > 1 ? 's' : ''} · ${req} requise${req > 1 ? 's' : ''}`,
  external: 'externe',
  inferred: 'méthode déduite du nom (option, désactivée par défaut)',
  unresolved: 'méthode inconnue : opération non résolue dans la source',
  workflowDefaults: 'Règles par défaut du workflow',
  workflowDefaultsHint: 's’appliquent à toutes les étapes marquées ⓦ (surchargées par nom au niveau de l’étape)',
  then: 'Puis',
  unhandledFailure: 'échec non géré',
  replayVia: (wf) => `exécute ${wf} puis rejoue l’étape`,
  graphLabel: (wf) => `Graphe du workflow ${wf}`,
  graphDescription: (s, g, f) =>
    `${s} étapes, ${g} sous-workflow${g > 1 ? 's' : ''}, ${f} chemin${f > 1 ? 's' : ''} d’échec. Flèches : naviguer ; Entrée : révéler dans l’éditeur ; ? : aide.`,
  ariaStep: ({ order, total, id, kindText, source, exits, diagnostics }) =>
    [
      order ? `Étape ${order} sur ${total}` : 'Étape',
      id,
      kindText,
      source ? `source ${source}` : '',
      exits.length ? `${exits.length} issue${exits.length > 1 ? 's' : ''} : ${exits.join(', ')}` : 'aucune issue',
      diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  ariaInputs: (n, req, names) =>
    `Entrées du workflow : ${n} propriété${n > 1 ? 's' : ''}, dont ${req} requise${req > 1 ? 's' : ''} : ${names.join(', ')}`,
  ariaOutputs: (names) => `Sorties du workflow : ${names.join(', ')}`,
  ariaEnd: (failure, from) =>
    `Fin du workflow ${failure ? 'en échec' : 'en succès'}, atteinte depuis ${from} étape${from > 1 ? 's' : ''}`,
  ariaJunction: (t, deps) => `Jonction : l’étape ${t} attend ${deps.join(' et ')}`,
  ariaRef: (wf, src) => `Référence au workflow ${wf}${src ? ` de la source ${src}` : ''}`,
  exitSuccess: (t) => `succès vers ${t}`,
  exitFailure: (t) => `échec vers ${t}`,
  exitRetry: (l, a, via) => `réessai ${l} fois après ${nfFr(a)} s${via ? ` via ${via}` : ''}`,
  exitNext: (t) => `puis ${t}`,
  exitCall: (t) => `appelle ${t}`,
  exitDepends: (t) => `débloque ${t}`,
  kindHttp: (m, p) => `${m === 'OP' ? 'méthode non résolue' : m}${p ? ` ${p}` : ''}`,
  kindSend: (c) => `envoi de message sur le canal ${c}`,
  kindReceive: (c, t, corr) =>
    `attente de message sur ${c}${t ? `, délai ${t}` : ''}${corr ? `, corrélation par ${corr}` : ''}`,
  kindWorkflow: (wf, col, n) => `appelle le workflow ${wf}${col ? `, replié${n ? `, ${n} étapes` : ''}` : ''}`,
  roleStep: 'étape',
  announceSelected: (l, d, e) => `${l} sélectionné. ${d}. ${e} issue${e > 1 ? 's' : ''}.`,
  announceLayout: (ms, n) => `Graphe mis en page : ${n} nœuds en ${ms} ms.`,
  announceLayoutPending: 'Mise en page du graphe…',
  announceSearch: (i, n, q) => `Résultat ${i} sur ${n} pour « ${q} ».`,
  announceNoResult: (q) => `Aucun résultat pour « ${q} ».`,
  announceFocusMode: (l) => `Mode focus autour de ${l}. Échap pour sortir.`,
  announceReveal: (l) => `Révéler ${l} dans l’éditeur.`,
};

export const en: Messages = {
  ...fr,
  lang: 'en',
  inputs: 'Inputs',
  outputs: 'Outputs',
  endSuccess: 'End',
  endFailure: 'Failure',
  junction: 'Join',
  step: 'Step',
  steps: (n) => `${n} step${n > 1 ? 's' : ''}`,
  criteria: (n) => `${n} criteri${n > 1 ? 'a' : 'on'}`,
  outputsCount: (n) => `${n} output${n > 1 ? 's' : ''}`,
  params: (n) => `${n} parameter${n > 1 ? 's' : ''}`,
  props: (n, req) => `${n} propert${n > 1 ? 'ies' : 'y'} · ${req} required`,
  external: 'external',
  inferred: 'method inferred from name (opt-in)',
  unresolved: 'unknown method: operation not resolved in source',
  workflowDefaults: 'Workflow default rules',
  workflowDefaultsHint: 'apply to every step marked ⓦ (overridden by name at step level)',
  then: 'Then',
  unhandledFailure: 'unhandled failure',
  replayVia: (wf) => `runs ${wf} then replays the step`,
  graphLabel: (wf) => `Workflow graph ${wf}`,
  graphDescription: (s, g, f) =>
    `${s} steps, ${g} sub-workflow${g > 1 ? 's' : ''}, ${f} failure path${f > 1 ? 's' : ''}. Arrows: navigate; Enter: reveal in editor; ?: help.`,
  ariaStep: ({ order, total, id, kindText, source, exits, diagnostics }) =>
    [
      order ? `Step ${order} of ${total}` : 'Step',
      id,
      kindText,
      source ? `source ${source}` : '',
      exits.length ? `${exits.length} exit${exits.length > 1 ? 's' : ''}: ${exits.join(', ')}` : 'no exit',
      diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  ariaInputs: (n, req, names) => `Workflow inputs: ${n} properties, ${req} required: ${names.join(', ')}`,
  ariaOutputs: (names) => `Workflow outputs: ${names.join(', ')}`,
  ariaEnd: (failure, from) => `Workflow ${failure ? 'failure' : 'success'} end, reached from ${from} step${from > 1 ? 's' : ''}`,
  ariaJunction: (t, deps) => `Join: step ${t} waits for ${deps.join(' and ')}`,
  ariaRef: (wf, src) => `Reference to workflow ${wf}${src ? ` from source ${src}` : ''}`,
  exitSuccess: (t) => `success to ${t}`,
  exitFailure: (t) => `failure to ${t}`,
  exitRetry: (l, a, via) => `retry ${l} times after ${a} s${via ? ` via ${via}` : ''}`,
  exitNext: (t) => `then ${t}`,
  exitCall: (t) => `calls ${t}`,
  exitDepends: (t) => `unblocks ${t}`,
  kindHttp: (m, p) => `${m === 'OP' ? 'unresolved method' : m}${p ? ` ${p}` : ''}`,
  kindSend: (c) => `sends a message on channel ${c}`,
  kindReceive: (c, t, corr) => `waits for a message on ${c}${t ? `, timeout ${t}` : ''}${corr ? `, correlated by ${corr}` : ''}`,
  kindWorkflow: (wf, col, n) => `calls workflow ${wf}${col ? `, collapsed${n ? `, ${n} steps` : ''}` : ''}`,
  roleStep: 'step',
  announceSelected: (l, d, e) => `${l} selected. ${d}. ${e} exit${e > 1 ? 's' : ''}.`,
  announceLayout: (ms, n) => `Graph laid out: ${n} nodes in ${ms} ms.`,
  announceLayoutPending: 'Laying out graph…',
  announceSearch: (i, n, q) => `Result ${i} of ${n} for “${q}”.`,
  announceNoResult: (q) => `No result for “${q}”.`,
  announceFocusMode: (l) => `Focus mode around ${l}. Escape to exit.`,
  announceReveal: (l) => `Reveal ${l} in editor.`,
};
