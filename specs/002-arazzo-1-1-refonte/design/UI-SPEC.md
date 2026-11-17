# D1 — Spécification UI du graphe de workflow Arazzo 1.1

> Lot **D1** de la refonte Arazzo 1.1.0 (voir `../plan.md`). Entrées : R5 (`../research/05-graph-ui-benchmark.md`, §4), B1 (`../brand/`), R1 (`../research/01-spec-delta-1.1.md`, §b).
> Sortie : base de développement du composant partagé **`@connethics/arazzo-flow`** (lot G1), qui remplacera le Mermaid de l'extension VS Code et le viewer de la démo.
> Rédigé le 16/11/2026. **Statut : à valider par l'utilisateur** (liste des décisions au §13).

## 0. Livrables

| Fichier | Contenu |
|---|---|
| `graph-mockups.html` | Maquette interactive **autonome** (2,1 Mo, 625 Ko gzip), ouvrable hors ligne en `file://`. JS et CSS inline, ELK dans un Web Worker créé depuis une URL `blob:`. |
| `screenshots/*.png` | 14 captures Playwright, 1440×900, deviceScaleFactor 2 (liste au §12). |
| `mockup-src/` | Source réutilisable par G1 (React 19, `@xyflow/react` 12.12, elkjs 0.11, esbuild). `npm ci && node build.mjs` régénère le HTML ; `node screenshots.mjs <html> <dossier>` refait les captures. |
| `UI-SPEC.md` | Ce document. |

**Paramètres d'URL de la maquette** : `scenario` (`order-to-cash`, `pet-adoption`, `session-renewal`, `large-60`, `catalogue`), `theme` (`light`, `dark`, `vscode-dark`, `hc`), `lanes` (`off`, `clusters`, `lanes`), `dir` (`TB`, `LR`), `density` (`auto`, `compact`, `standard`, `detailed`), `select=<stepId>`, `focus=<stepId>&zoom=<n>`, `overview=1`, `legend=1`, `lang=en`.

**Organisation du code** (`mockup-src/src/`) :

| Chemin | Rôle | Devenir en G1 |
|---|---|---|
| `graph/model.ts` | Types du modèle `{ nodes, edges, groups }` | Remplacé par les types de `@connethics/arazzo-core` (C1) |
| `graph/ArazzoGraph.tsx` | Composant, clavier, recherche, barre d'outils, cadrage | Base de `<ArazzoGraph>` |
| `graph/layout/*` | Graphe ELK (ports, libellés), worker inline, couloirs | Repris tel quel, avec tests Vitest |
| `graph/nodes/nodes.tsx`, `graph/edges/AfEdge.tsx`, `graph/Legend.tsx` | Rendu | Repris |
| `graph/arazzo-flow.css` | Feuille de style du composant, variables `--af-*` | Repris, publié comme `style.css` |
| `graph/format.ts`, `graph/messages.ts` | Libellés, tailles déterministes, aria, i18n FR/EN | Repris |
| `graph/store.ts`, `graph/visible.ts` | Store d'UI hors `nodes`, filtrage et repli | Repris |
| `scenarios/*`, `app/*` | Données figées et coquille de démonstration | Deviennent le `/showcase` de G1 |

Aucune dépendance à Tailwind ni à `lucide-react` : CSS pur à variables et une vingtaine d'icônes SVG inline originales.

---

## 1. Principes appliqués

Ce sont ceux de R5 §4.1, sans changement :
1. **Fidélité sémantique** : une arête = une règle de la spec ; rien n'est deviné en silence (méthode HTTP non résolue = badge `OP`).
2. **Lecture seule**, layout déterministe : même modèle, même image.
3. **Double codage** : couleur + motif de trait + glyphe + libellé. La couleur ne porte jamais seule l'information.
4. **Divulgation progressive** : 3 densités, détail complet au survol (`title`) et dans le panneau de sélection.
5. **Thème = variables CSS** : aucune couleur en dur dans le composant (`--af-*` → `--ce-*` → `--vscode-*`).
6. **Rien ne bouge en permanence** : pas d'arête animée ; transitions ≤ 200 ms coupées par `prefers-reduced-motion`.

---

## 2. Modèle de graphe consommé (proposition pour C1)

Le composant ne lit **jamais** le YAML : il consomme la sortie de `workflowToGraph(spec, workflowId)`. Les maquettes utilisent des modèles calculés à la main (`scenarios/`) ; C1 doit produire la même forme, ou G1 écrira un adaptateur.

```ts
interface WorkflowGraph {
  workflowId: string; title: string; summary?: string; arazzo: string;
  sources: { name: string; type: 'openapi' | 'asyncapi' | 'arazzo'; url: string }[];
  nodes: GraphNode[];   // ordre = ordre du document (steps, puis actions) — exigé par MODEL_ORDER
  edges: GraphEdge[];   // ordre = ordre des actions dans le document
  groups: GraphGroup[]; // sous-workflows dépliés (kind 'workflow'), les couloirs se déduisent de sources
  defaults?: { successActions?: ActionSummary[]; failureActions?: ActionSummary[] };
}
type NodeKind = 'input' | 'step' | 'output' | 'end' | 'junction' | 'workflow-ref';
type StepKind = 'http' | 'async-send' | 'async-receive' | 'workflow';
type EdgeKind = 'sequence' | 'success' | 'failure' | 'retry' | 'end-success' | 'end-failure'
              | 'implicit-failure' | 'depends-on' | 'workflow-call' | 'transfer';
type PortId = 'in' | 'in-deps' | 'out-next' | 'out-success' | 'out-failure' | 'out-retry' | 'out-call';
```

Champs notables de `GraphNode` : `stepKind`, `order` (rang 1-based), `method` + **`methodSource`** (`operationPath` | `openapi` | `unresolved` | `inferred`), `path`, `channel`, `action`, `source`, `criteria[]` (`condition`, `type`, `version`, `context`), `timeoutMs`, `correlationId`, `parameters[]` (avec `in: querystring`), `dependsOn[]`, `targetWorkflowId`, `external`, `collapsed`, `innerStepCount`, `inputs[]`, `workflowOutputs[]` (`expression` **ou** `selector {context, selector, type, version}`), `groupId`, `diagnostics[]` (de core), `usesWorkflowDefaults`.

Champs notables de `GraphEdge` : `sourcePort`, `targetPort`, `name` (nom de l'action), `criteria[]`, `retryLimit`, `retryAfter`, `retryDefaults` (valeurs par défaut appliquées), `via` (workflow exécuté avant le rejeu, ou cible d'appel/transfert), `reference` (`$components.failureActions.x` résolu), `origin` (`onSuccess` | `onFailure` | `workflowDefault` | `implicit` | `dependsOn`), `backward` (goto vers une étape antérieure).

**Règles de construction que C1 doit appliquer** (testées visuellement ici) :

| # | Règle | Exemple dans les maquettes |
|---|---|---|
| M1 | L'arête de séquence implicite n'est supprimée que si une action de succès **inconditionnelle** existe (R5, corrige V-5). | pet-adoption : `handleNoPets` → `getPetDetails` |
| M2 | **Nouveau** : si une action de succès conditionnelle vise déjà l'étape suivante, la séquence implicite est absorbée (pas de doublon de trait). *À valider (§13, D-M2).* | pet-adoption : `findAvailablePets` → `handleNoPets` |
| M3 | Une étape qui porte `dependsOn` ne reçoit pas d'arête de séquence implicite de l'étape précédente du tableau : ses dépendances la remplacent, que l'étape précédente en fasse partie ou non (côté sortant, pas de séquence vers une étape suivante qui déclare `dependsOn` sans référencer l'étape courante). Si aucune entrée n'est résolue, la séquence est conservée. *Appliqué dans arazzo-core (G2).* | order-to-cash : `createInvoice`, `createShipment` en parallèle |
| M4 | Jonction losange seulement pour 2 dépendances ou plus ; elle est insérée **juste avant** son étape cible dans `nodes` (sinon `MODEL_ORDER` inverse l'arête). | order-to-cash, catalogue, large-60 |
| M5 | Retry avec `workflowId` : boucle `↻ ×N · Ns` sur l'étape **plus** arête `↻ via <wf>` vers la première étape du sous-workflow déplié (ou vers le nœud replié). Pas d'arête de retour. *À valider (D-RETRY).* | session-renewal |
| M6 | Échecs implicites (aucun `onFailure`) : arêtes `implicit-failure` produites mais masquées par défaut. | tous |
| M7 | Un seul nœud « Fin en échec » par workflow ; « Fin » (succès) seulement si le workflow n'a pas d'`outputs`, sinon le nœud Sorties sert de terminal. | catalogue (Fin), autres (Sorties) |
| M8 | Actions réutilisables résolues avant le dessin ; `reference` conservée pour le libellé et l'aria. | session-renewal : `listOrders` |

---

## 3. Grille commune des nœuds

- Largeur fixe : **240 px en TB, 220 px en LR**. Hauteurs **déterministes** (aucune mesure DOM avant layout) :
  - `compact` : 44 px (en-tête seul) ;
  - `standard` : **96 px** = en-tête 26 + 2 lignes de 17 + ligne de chips 20 + marges. *R5 proposait 72 px, sans place pour les chips : écart à valider (D-H).*
  - `detailed` : 96 + 8 + 18 px par ligne de liste (critères, propriétés ou sorties), plafonné à 5 lignes.
- Coins `--ce-graph-node-radius` (8 px), bordure 1 px (`--af-border-w`, 2 px en HC), **bande d'accent de 4 px** à gauche, couleur du type.
- Texte : titre 13 px semi-gras, lignes 12 / 11,5 px, chips 10,5 px, badges 10 px gras capitales. Ellipse partout ; texte complet dans `title` et `aria-label`.
- Expressions runtime **verbatim** en `--af-font-mono`, ligatures désactivées (`==`, `!=` lisibles).
- Les ports sont des `Handle` React Flow invisibles (1 px), positionnés aux coordonnées de port calculées par ELK.

### 3.1 États visuels communs

| État | Rendu | Tokens |
|---|---|---|
| repos | fond `--af-node-bg`, bordure `--af-node-border`, ombre `--af-shadow` | `--ce-graph-node-bg`, `--ce-graph-node-border`, `--ce-shadow-node` |
| *hover* | bordure mêlée 55 % `--af-focus`, ombre `--af-shadow-hover` ; arêtes entrantes et sortantes épaissies de 1 px (surlignage du chemin) | `--ce-focus-ring`, `--ce-shadow-node-hover` |
| *focus* clavier | anneau 2 px `--af-focus`, décalage 2 px (`:focus-visible`) | `--ce-focus-ring` → `--vscode-focusBorder` |
| *selected* | fond `--af-selection`, bordure 2 px `--af-selection-border` | `--ce-bg-selected`, `--ce-graph-node-selected` |
| *dimmed* (recherche, mode focus) | opacité 0,35 ; en HC opacité 0,6 + contour pointillé | `--af-dim-opacity` |
| résultat de recherche | contour 2 px pointillé `--af-focus` ; résultat courant : contour 3 px plein | — |
| diagnostic | pastille en haut à droite (icône + nombre), couleur de sévérité, codes au survol | `--ce-status-danger/warning/info-fg` |

### 3.2 Niveaux de détail au zoom (*contextual zoom*)

| Zoom | Rendu |
|---|---|
| ≥ 0,45 | complet (selon densité) |
| 0,25 – 0,45 | **pastille** : seulement badge + `stepId`, agrandis (19 px) et centrés ; libellés d'arêtes agrandis (15 px) ; pastille de diagnostic masquée |
| < 0,25 | rectangle teinté (`--accent-bg`), sans texte ; la mini-carte sert de repère |

---

## 4. Types de nœuds

Modèle d'`aria-label` en FR (EN dans `messages.ts`). Rôle : `group` + `aria-roledescription="étape"`. Le panneau de détail de la maquette affiche l'`aria-label` réellement généré.

### 4.1 Entrées (`input`)
- **Anatomie** : accent `--af-input` (cyan), icône « entrée » dans un carré teinté, titre « Entrées », compteur. Ligne : « 6 propriétés · 2 requises ». Chips : 4 noms au plus en monospace (`*` pour `required`), puis `+N`. Détaillé : `nom : type = défaut` (défaut sérialisé en JSON, corrige D-18).
- **Tokens** : `--ce-graph-input-fg/bg/text`.
- **aria-label** : « Entrées du workflow : 6 propriétés, dont 2 requises : username, password, … ».
- Ports : `out-next`.

### 4.2 Étape HTTP (`step`, `stepKind: http`)
- **Anatomie** : accent `--af-http` (bleu marque). En-tête : **badge méthode** (texte `GET`/`POST`/`PUT`/`PATCH`/`DELETE`) + `stepId` + `#ordre` + pastille diagnostic. Ligne 1 : `summary` (sinon `operationId`). Ligne 2 : chemin résolu en monospace, sinon `operationId` grisé. Chips : `✓ n critères`, `↻ ×N` (si retry), `n outputs`, `ⓦ` (défauts du workflow).
- **Source de la méthode** (`methodSource`) : `operationPath` (exacte, sans réseau) > `openapi` (résolue) > `unresolved` → badge neutre **`OP`** + diagnostic `operation-not-found`. `inferred` (option désactivée par défaut) → badge à **contour pointillé** et tooltip « méthode déduite du nom ». L'heuristique actuelle (V-3, D-23) est supprimée.
- **Tokens** : `--ce-graph-step-http-*`, badges `--ce-method-<m>-bg/text` (PATCH en teal, décision B1 D3), `OP` : `--ce-bg-sunken` + `--ce-text-muted`.
- **aria-label** : « Étape 6 sur 9, placeOrderWithCoupon, POST /store/order, source petStoreApi, 5 issues : succès vers sendConfirmation, réessai 3 fois après 5 s, échec vers findAvailablePets, … ».
- Ports : `in`, `in-deps`, `out-next`, `out-success`, `out-failure`, `out-retry`, `out-call` (seuls les ports utilisés sont créés).

### 4.3 Étape AsyncAPI `send`
- **Anatomie** : accent `--af-async-send` (orange, réservé à `send` et à la marque), badge `SEND` avec **enveloppe pleine** (BPMN « message émis »). Ligne 2 : adresse du canal. Chip `{ } payload` si `requestBody`.
- **aria-label** : « Étape 6 sur 7, notifyCustomer, envoi de message sur le canal customer.notifications, … ».

### 4.4 Étape AsyncAPI `receive`
- **Anatomie** : accent `--af-async-receive` (teal), badge `RECEIVE` avec **enveloppe contour** (« message attendu »). Ligne 2 : canal. Chips : horloge + `6 s` (`timeout` formaté : 6000 → « 6 s », 1500 → « 1,5 s », 250 → « 250 ms ») et maillon + `correlationId` tronqué à 20 caractères. **Marqueur de timeout** : cercle de 22 px avec horloge, à cheval sur la bordure basse (événement de bordure BPMN).
- Le dépassement du `timeout` déclenche `onFailure` (R1 §b.18-4) : il n'y a **pas** d'arête « timeout » dédiée ; l'arête d'échec porte le nom de l'action (`✗ confirmationTimeout`).
- **aria-label** : « Étape 2 sur 7, awaitConfirmation, attente de message sur order.confirmed, délai 6 s, corrélation par $steps.createOrder.outputs.orderId, source orderEvents, 2 issues : échec vers la fin en échec, puis payOrder ».

### 4.5 Étape sous-workflow (`workflowId`)
- **Anatomie** : **double bordure** (BPMN *call activity*, `box-shadow` 2 anneaux `--af-workflow`), badge `WORKFLOW`, ligne 2 `→ <workflowId>` (+ nom de la source si `$sourceDescriptions.x.y`). Chips `externe`, `n paramètres`, `▸ n étapes` si replié.
- **Tokens** : `--ce-graph-workflow-call-*` (fuchsia).
- **aria-label** : « Étape 4 sur 4, auditAccess, appelle le workflow logAccess, replié, 3 étapes, source auditFlows, 2 issues : appelle logAccess, puis sorties ».

### 4.6 Sous-workflow déplié (groupe)
- Cadre à **bordure double 3 px** `--af-workflow`, fond 6 % `--af-workflow` sur le canevas (transparent en HC). En-tête : chevron (bouton 24×24, `aria-expanded`, « Replier le sous-workflow renewSession »), icône, nom en monospace, « n étapes ». Contenu dans la même densité que le parent.
- Replié : le groupe devient un nœud Référence à bordure double « ▸ n étapes » ; les arêtes sont redirigées et dédoublonnées (`visible.ts`). Touches `[` / `]`.

### 4.7 Jonction `dependsOn`
- Losange de 19 px (carré tourné), bordure 2 px `--af-depends` (indigo), fond canevas, « + » central (BPMN *parallel gateway*). Nœud de 28×28 dans le layout.
- **aria-label** : « Jonction : l'étape notifyCustomer attend createInvoice et createShipment ».

### 4.8 Sorties (`output`)
- Accent `--af-output` (violet). Ligne : « 5 outputs · 2 Selectors ». Chips des clés ; une clé **Selector** a une bordure pointillée et l'icône `{ }`, son tooltip donne `type`, `version`, `selector` et `context`. Détaillé : `clé ← expression` avec étiquette du type de Selector.
- **aria-label** : « Sorties du workflow : orderId, paymentId, invoiceUrl, trackingNumber, confirmedAt ».

### 4.9 Fins (`end`)
- Cercle de 28 px, bordure 3 px : **Fin** (coche, `--af-success`) ou **Échec** (croix, `--af-failure`), libellé sous le cercle en couleur `-text`.
- **aria-label** : « Fin du workflow en échec, atteinte depuis 2 étapes ».

### 4.10 Référence de workflow (`workflow-ref`)
- Pilule 200×36 à bordure pointillée 1,5 px `--af-workflow`, icône lien externe, `workflowId` en monospace, source à droite. Cible d'un `goto workflowId` (transfert) ou d'une étape externe non dépliée.
- **aria-label** : « Référence au workflow logAccess de la source auditFlows ».

---

## 5. Types d'arêtes

Chemin : polyligne orthogonale **issue des sections ELK**, coins arrondis de 6 px (`roundedPath`). Repli `getSmoothStepPath` (mode couloirs). Les marqueurs sont dessinés dans le composant (pas de `<marker>` SVG), donc thémés par variables et exportables.

| Arête | Trait (`stroke-dasharray`) | Épaisseur | Couleur | Marqueur | Libellé par défaut | Ports |
|---|---|---|---|---|---|---|
| `sequence` | plein | 1,5 | `--af-edge-seq` | flèche pleine | aucun | `out-next` → `in` |
| `success` | plein | 2 | `--af-success` | flèche pleine | `✓ <name>` (+ ` ↺` si arrière) | `out-success` → `in` |
| `failure` | `6 4` | 2 | `--af-failure` | flèche pleine | `✗ <name>` (+ ` ↺`), chip pointillée | `out-failure` → `in` |
| `retry` (boucle) | `2 3 6 3` | 2 | `--af-retry` | flèche **ouverte** | `↻ ×3 · 2 s` (italique si valeurs par défaut) | `out-retry` → `in` (même nœud) |
| `retry` (via) | `2 3 6 3` | 2 | `--af-retry` | flèche ouverte | `↻ via renewSession` | `out-failure` → `in` de la 1re étape du sous-workflow |
| `end-success` | plein | 1,5 | `--af-success` | flèche pleine | `✓ <name>` si conditionnel, sinon aucun | `out-success` → Sorties / Fin |
| `end-failure` | `6 4` | 1,5 | `--af-failure` | flèche pleine | `✗ <name>` | `out-failure` → Échec |
| `implicit-failure` (option) | `1 3` | 1 | `--af-failure` à 55 % (100 % en HC) | aucun | « échec non géré » | `out-failure` → Échec |
| `depends-on` | `0.5 4.5`, extrémités rondes (points) | 2 | `--af-depends` | **cercle** de 3,5 px | aucun | `out-next` → jonction `in` ; jonction → `in-deps` |
| `workflow-call` | **double trait** (5 px couleur + 1,6 px canevas) | — | `--af-workflow` | **losange ouvert** à la source, flèche à la cible | `⇢ <workflowId>` | `out-call` → Référence |
| `transfer` | `10 4` | 2 | `--af-workflow`, `--af-failure` si `onFailure` | flèche pleine | `✗ ↗ <workflowId>` / `✓ ↗ …` | `out-success`/`out-failure` → Référence |

En HC, toutes les épaisseurs reçoivent `+0,5 px` (`--af-edge-boost`).

**Libellés** : chips HTML (`EdgeLabelRenderer`), 20 px de haut, police 11 px 500, fond `--af-canvas-bg`, bordure 1 px de la couleur de l'arête (pointillée pour les échecs), texte en `-text` (≥ 4,5:1). Position : point calculé par ELK (`edgeLabels.placement = CENTER`, `inline = true`), place réservée par la largeur mesurée au canevas 2D. Densité `detailed` : ajout du premier critère tronqué à 24 caractères (`✓ exists · $response.body.id != nu…`). Survol : `title` complet (« ✗ handlePetSold — échec vers findAvailablePets — si $statusCode == 409 »).

**États** : arête liée au nœud survolé ou sélectionné → +1 px et chip à bordure 2 px ; estompée si une extrémité est estompée.

**Ports par direction** (`FIXED_SIDE`) :

| Port | TB | LR |
|---|---|---|
| `in`, `in-deps` | NORTH | WEST |
| `out-next`, `out-success` | SOUTH | EAST |
| `out-failure`, `out-retry` | EAST | SOUTH |
| `out-call` | WEST | NORTH |

`out-retry` est un **ajout** à R5 : sur le même port que `out-failure`, la boucle et l'arête d'échec partaient du même point et le libellé `↻` chevauchait le trait d'échec.

---

## 6. Layout ELK

ELK `layered` dans un **Web Worker** : le texte de `elkjs/lib/elk-worker.min.js` est embarqué (plugin esbuild `?raw`, équivalent Vite `?raw`), puis lancé via `new Worker(URL.createObjectURL(new Blob([src])))` et `elk-api.js`. Compatible `file://` (vérifié, Chromium) et CSP VS Code avec `worker-src blob:`. **Repli** automatique (erreur du worker ou délai de 8 s) : le même code est évalué sur le thread principal (`FakeWorker` exporté par elk-worker), sans dupliquer ELK dans le bundle.

Options exactes (`layout/elk-options.ts`) :

```ts
export const ELK_ROOT_OPTIONS = {
  'org.eclipse.elk.algorithm': 'layered',
  'org.eclipse.elk.direction': 'DOWN',                      // 'RIGHT' en LR
  'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
  'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'org.eclipse.elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
  'org.eclipse.elk.layered.feedbackEdges': 'true',
  'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'org.eclipse.elk.layered.mergeEdges': 'false',
  'org.eclipse.elk.layered.thoroughness': thoroughnessFor(n), // '7' si n ≤ 30, '4' au-delà
  'org.eclipse.elk.spacing.nodeNode': '32',
  'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'org.eclipse.elk.spacing.edgeNode': '20',                 // ajout D1
  'org.eclipse.elk.spacing.edgeEdge': '12',                 // ajout D1
  'org.eclipse.elk.spacing.edgeLabel': '6',
  'org.eclipse.elk.spacing.componentComponent': '48',
  'org.eclipse.elk.separateConnectedComponents': 'true',
  'org.eclipse.elk.padding': '[top=24,left=24,bottom=24,right=24]',
  'org.eclipse.elk.edgeLabels.placement': 'CENTER',
  'org.eclipse.elk.edgeLabels.inline': 'true',
  'org.eclipse.elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
  'org.eclipse.elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
  'org.eclipse.elk.json.shapeCoords': 'ROOT',               // ajout D1 : coordonnées absolues
  'org.eclipse.elk.json.edgeCoords': 'ROOT',                // ajout D1
};
export const ELK_NODE_OPTIONS  = { 'org.eclipse.elk.portConstraints': 'FIXED_SIDE' };
export const ELK_GROUP_OPTIONS = {
  'org.eclipse.elk.padding': '[top=44,left=16,bottom=16,right=16]',
  'org.eclipse.elk.nodeSize.constraints': 'MINIMUM_SIZE',
  'org.eclipse.elk.portConstraints': 'FREE',
};
// ports : id `${nodeId}::${portId}`, 1×1, 'org.eclipse.elk.port.side' selon §5
```

Notes :
- **Rendu à plat** : grâce à `json.*Coords = ROOT`, tous les nœuds React Flow sont au premier niveau (pas de `parentId`) ; les groupes et couloirs sont des nœuds `frame` non focusables, en `zIndex` négatif. Plus simple, et suffisant en lecture seule.
- Toutes les arêtes sont déclarées à la racine ; ELK gère les arêtes inter-hiérarchie (`INCLUDE_CHILDREN`).
- **thoroughness** : écart à R5 (10 / 7 / 4), justifié par les mesures du §10. *À valider (D-PERF).*
- **Déterminisme** : ordre du modèle respecté, aucun aléa (le grand scénario utilise un PRNG à graine fixe).
- **Cache** : clé = structure seule (`structureKey`) ; un changement de texte ne relance pas ELK. **Génération** : un layout obsolète est ignoré, et l'ancien reste affiché avec l'indicateur « Mise en page… » et une annonce `aria-live`.
- **Cadrage** : `fitView` après chaque changement de structure, de direction, de couloirs ou de densité, avec des marges en pixels qui laissent la place aux panneaux (haut 64 px, ou 104 px avec le bandeau des défauts). Si le zoom d'ajustement est < 0,3, la vue initiale **cadre le début du workflow à 0,75** et annonce « touche 1 pour tout voir ». *À valider (D-LARGE).*

---

## 7. Couloirs (swimlanes)

Trois modes, bouton « Couloirs » et touche `L` : `off` → `clusters` → `lanes`.

- **`clusters`** : un nœud composé ELK par `sourceDescription` (en-tête, teinte `--af-lane-n`). Fidèle, mais les groupes peuvent s'entrelacer.
- **`lanes`** : **post-traitement** (`applyLanes`) du layout ELK à plat :
  1. ELK calcule les couches ; la coordonnée de flux (y en TB, x en LR) est **conservée**.
  2. Couloirs dans l'ordre : `Workflow` (Entrées, Sorties, Fins, Références locales), puis `sourceDescriptions` dans l'ordre du document, puis « Source inconnue ».
  3. Dans un couloir, les nœuds sont triés par flux puis par position transverse ELK, et placés dans des **colonnes** : un nœud prend la première colonne libre sur son intervalle de flux (± 14 px). La largeur du couloir s'adapte au nombre de colonnes.
  4. Une jonction est placée dans le couloir de son **étape cible** (écart à R5, qui la mettait dans le couloir neutre : on évite des arêtes inutilement longues).
  5. Les sections ELK sont invalidées ; le rendu route en **orthogonal de repli** (`getSmoothStepPath`, rayon 6, décalage 18), avec libellés au milieu du tracé. Les boucles sont dessinées par le composant.
- **En-têtes** : 34 px, icône du type de source (globe OpenAPI, enveloppe AsyncAPI, workflow Arazzo), nom, type en capitales, nombre d'étapes. Teinte 7 % (5 % pour `Workflow`), transparente en HC. Le nom de la source figure aussi dans l'`aria-label` de chaque étape : la teinte n'est jamais seule porteuse d'information.
- **Limites observées** (capture `order-to-cash-lanes-light.png`) : routage de repli lisible sur 11 nœuds, mais les libellés peuvent se coller (`orderRejected` / `confirmationTimeout`) et un trait peut longer un nœud. *Le second passage ELK semi-interactif reste à prototyper en G1 (D-LANES).* En-têtes collants pendant le pan : non faits dans la maquette (G1).

---

## 8. Interactions

### 8.1 Souris
- Clic : sélection ou désélection, panneau de détail via `onSelectStep`. Double-clic : `onRevealStep`, ce qui envoie le message `step-selected` à l'éditeur dans VS Code (toast simulé dans la maquette). Clic sur le fond : désélection.
- Survol d'un nœud : arêtes adjacentes surlignées. Survol d'une arête ou d'un libellé : `title` complet.
- Nœuds non déplaçables ; zoom à la molette ; pan au glisser ; zoom au double-clic désactivé (réservé à « révéler »).

### 8.2 Clavier
Le canevas est une région `role="application"`, avec `aria-label` « Graphe du workflow X » et `aria-describedby` « 7 étapes, 0 sous-workflow, 6 chemins d'échec. Flèches : naviguer ; … ». Les raccourcis à une touche ne sont actifs que si le focus est dans le graphe, hors champ de saisie. Aucun raccourci Ctrl/Cmd, sauf Ctrl/Cmd+F sur le web.

| Touche | Action | Testé |
|---|---|---|
| `Tab` / `Maj+Tab` | Nœud suivant / précédent, dans l'**ordre du document** (ordre de `nodes`) | oui |
| `↓` / `↑` | Successeur / prédécesseur principal (séquence > succès > fin > dependsOn > …), avec auto-pan | oui |
| `←` / `→` | Voisin dans la même couche (en LR : prédécesseur / successeur) | oui |
| `Alt+↓` | Suivre l'arête d'échec (failure > end-failure > retry > transfert) | oui |
| `Entrée` | Révéler dans l'éditeur (`onRevealStep`) | oui |
| `Espace` | Sélectionner / désélectionner | oui |
| `Échap` | Sortir de la recherche, puis du mode focus, puis désélectionner | oui |
| `+` `=` / `-` / `0` | Zoom avant / arrière / 100 % | oui |
| `1`, `Maj+F` | Ajuster à la vue | oui |
| `F` | Mode focus : voisinage à 1 saut, 2 si on répète | oui |
| `/` (Ctrl/Cmd+F web) | Recherche (`stepId`, `operationId`, canal, `summary`, chemin, workflow cible) ; `Entrée` / `Maj+Entrée` : suivant / précédent ; compteur « 2/5 » | oui |
| `[` / `]`, `Maj` : tous | Replier / déplier le sous-workflow courant | oui |
| `E` | Afficher / masquer les arêtes d'échec (y compris retry et transferts sur échec) | oui |
| `L` | Couloirs : off → groupes → couloirs | oui |
| `D` | Direction TB / LR | oui |
| `M` | Mini-carte | oui |
| `?` | Dialogue modal des raccourcis (`<dialog>` natif) | oui |

Le déplacement de nœuds au clavier de React Flow est désactivé (`disableKeyboardA11y`, `nodesDraggable=false`) : les flèches naviguent.

### 8.3 Barre d'outils et panneaux
- **Barre** (en haut à droite, `role="toolbar"`) : zoom −, pourcentage, zoom +, 1:1, ajuster | TB/LR, couloirs, densité (auto, compact, standard, détaillé) | arêtes d'échec, échecs implicites (`∅`), mini-carte, légende, aide. Boutons de 30×30 px, `aria-label` et `title` explicites, `aria-pressed` sur les bascules.
- **Recherche** en haut à gauche (`role="search"`).
- **Bandeau « Règles par défaut du workflow »** sous la recherche, s'il existe des `successActions` / `failureActions` de workflow : chips des règles (`↻ ×2 · 1 s si $statusCode == 429`), aide en `title` et en texte pour lecteur d'écran ; indicateur `ⓦ` sur les étapes concernées.
- **Légende** en bas à gauche, **repliée par défaut** : elle réutilise les classes réelles des arêtes et des nœuds, donc les mêmes tokens.
- **Mini-carte** en bas à droite : déplaçable et zoomable, couleur des nœuds par type via `nodeClassName`.
- **Attribution React Flow** conservée (en bas au centre).

---

## 9. Thèmes

### 9.1 Chaîne de variables

```
--af-*  (composant, arazzo-flow.css)
  └─ défini à partir de --ce-*  (marque, brand/tokens.css : light, dark, prefers-color-scheme)
        └─ dans VS Code, le « bridge » de tokens.css redéfinit le chrome --ce-* depuis --vscode-*
```

Le composant **ne référence jamais** `--vscode-*` directement : le pont est celui de B1, ce qui donne une seule source de vérité. La maquette le prouve : le thème « VS Code Dark+ » pose `body.vscode-dark` et des variables `--vscode-*` factices (valeurs Dark+), le thème « High Contrast » pose `body.vscode-high-contrast` et les valeurs HC (`#000`, `contrastBorder #6fc3df`, `contrastActiveBorder #f38518`). Le graphe suit sans aucun code spécifique, à part l'attribut `data-contrast="high"`.

| `--af-*` | `--ce-*` (B1) | `--vscode-*` (via bridge B1) |
|---|---|---|
| `--af-canvas-bg` | `--ce-graph-canvas` | `--vscode-editor-background` |
| `--af-canvas-dot` | `--ce-graph-grid` | `--vscode-editorIndentGuide-background1` |
| `--af-node-bg` | `--ce-graph-node-bg` | `--vscode-editorWidget-background` (HC : canevas) |
| `--af-node-border` | `--ce-graph-node-border` | `--vscode-editorWidget-border` ; HC : `--vscode-contrastBorder` |
| `--af-node-fg` / `--af-node-muted` | `--ce-text-default` / `--ce-text-muted` | `--vscode-foreground` / `--vscode-descriptionForeground` |
| `--af-focus` | `--ce-focus-ring` | `--vscode-focusBorder` ; HC : `--vscode-contrastActiveBorder` |
| `--af-selection` / `--af-selection-border` | `--ce-bg-selected` / `--ce-graph-node-selected` | `--vscode-list-activeSelectionBackground` / `--vscode-focusBorder` |
| `--af-panel-bg` / `--af-panel-border` / `--af-control-hover` | `--ce-bg-raised` / `--ce-border-default` / `--ce-bg-hover` | `--vscode-editorWidget-background` / `--vscode-panel-border` / `--vscode-list-hoverBackground` |
| `--af-font` / `--af-font-mono` | `--ce-font-sans` / `--ce-font-mono` | `--vscode-font-family` / `--vscode-editor-font-family` |
| `--af-shadow(-hover)` | `--ce-shadow-node(-hover)` | `none` en HC |
| `--af-minimap-mask` | `--ce-graph-minimap-mask` | — |
| `--af-edge-seq(-text)` | `--ce-graph-sequence-fg/text` | **marque** (décision B1 D8) |
| `--af-success(-text,-bg)` | `--ce-graph-success-*` | marque |
| `--af-failure(-text,-bg)` | `--ce-graph-failure-*` | marque |
| `--af-retry(-text,-bg)` | `--ce-graph-retry-*` | marque |
| `--af-http(-text,-bg)` | `--ce-graph-step-http-*` | marque |
| `--af-async-send(-…)` / `--af-async-receive(-…)` | `--ce-graph-async-send-*` / `--ce-graph-async-receive-*` | marque |
| `--af-workflow(-…)` | `--ce-graph-workflow-call-*` | marque |
| `--af-input(-…)` / `--af-output(-…)` | `--ce-graph-input-*` / `--ce-graph-output-*` | marque |
| `--af-depends(-…)` / `--af-end(-…)` | `--ce-graph-depends-on-*` / `--ce-graph-end-*` | marque |
| `--af-method-<m>-bg/fg` | `--ce-method-<m>-bg/text` | marque |
| `--af-diag-error/warning/info` | `--ce-status-danger/warning/info-fg` | `--vscode-editorError/Warning/Info-foreground` |
| `--af-lane-0…6` | `color-mix(--ce-graph-<kind>-fg 5-7 %, canevas)` | transparent en HC |

La correspondance `--xy-*` de React Flow est faite dans `.af-canvas` : fond, motif de points, mini-carte, attribution. Le CSS de base est `@xyflow/react/dist/base.css` (fonctionnel), sans `style.css`.

### 9.2 Haut contraste (`data-contrast="high"`)
- Bordures 2 px `contrastBorder`, focus et sélection `contrastActiveBorder` (orange HC), **sélection sans fond**.
- **Aucun fond teinté** : nœuds sur le fond de l'éditeur ; chips, badges, clés et étiquettes en texte coloré sur fond transparent, bordure `currentColor` ; couloirs et sous-workflows sans teinte.
- Traits +0,5 px, motifs obligatoires ; échecs implicites à 100 % d'opacité ; estompage à 0,6 + contour pointillé.
- Pas d'ombre. `@media (forced-colors: active)` : `CanvasText` / `Highlight`.
- Détection en G1 : `body.vscode-high-contrast` ou `data-vscode-theme-kind`, observés par `MutationObserver` sur `class` **et** `data-vscode-theme-kind` (corrige V-22).

### 9.3 Contrastes
Les paires de la palette B1 sont vérifiées par `brand/tools/gen_tokens.py` (220 paires, 0 échec) et `vscode_bg_check.py` (minimum 3,21:1 pour les traits sur Light+, 5,13:1 sur Dark+, 7,04:1 en HC). D1 n'introduit pas de nouvelle couleur : seulement des mélanges décoratifs (couloirs, fond des groupes) qui ne portent pas de texte en dessous du seuil. Les libellés d'arêtes utilisent toujours `-text` sur `--af-canvas-bg` (≥ 4,5:1). Vérifications visuelles sur les captures : aucun texte illisible repéré ; les teintes de couloir en sombre (orange et violet à 7 %) sont un peu marquées, à réduire à 5 % si l'utilisateur le souhaite.

---

## 10. Performances

### 10.1 Mesures D1 (Chromium headless, worker inline)

Le temps couvre la construction du graphe ELK, l'aller-retour vers le worker et le post-traitement.

| Scénario | Nœuds / arêtes | 1er layout (froid, démarrage worker + init GWT inclus) | Layouts suivants (chaud) |
|---|---|---|---|
| order-to-cash | 11 / 14 | 210 – 350 ms | 16 – 34 ms |
| pet-adoption | 12 / 21 (9 libellés, 4 arêtes arrière) | 320 – 650 ms | 64 – 91 ms |
| large-60 (thoroughness 4) | 66 / 87 | 390 – 660 ms | 106 – 201 ms |
| large-60 (thoroughness 7, valeur R5) | 66 / 87 | — | 221 – 251 ms |

Taille : HTML complet de 2,1 Mo (625 Ko gzip), dont elkjs 1,56 Mo (453 Ko gzip). Composant seul (`ArazzoGraph` + xyflow + d3, sans React ni ELK) : **246 Ko min, 81 Ko gzip** ; CSS 6,6 Ko gzip.

### 10.2 Budgets proposés pour G1

| Mesure | Budget | Statut D1 |
|---|---|---|
| Layout chaud, 50 nœuds | < 80 ms | tenu jusqu'à ~15 nœuds denses ; à revérifier sur le corpus E1 |
| Layout chaud, 100 nœuds | < 200 ms | 66 nœuds : ~120 ms → probable |
| Premier layout (froid) | < 700 ms, worker **pré-chauffé** à l'ouverture du panneau | 650 ms au pire mesuré |
| Premier rendu interactif (50 nœuds) | < 400 ms après `update-flowchart`, hors démarrage à froid | à mesurer en G1 |
| Pan / zoom, 100 nœuds | 60 fps | non mesuré en D1 |
| Bundle composant | ≤ 120 Ko gzip hors ELK | 81 Ko |

### 10.3 Règles d'implémentation (appliquées dans la maquette)
- `nodeTypes`/`edgeTypes` au niveau module, composants `memo`.
- Sélection, survol, recherche et focus dans un **store externe** (`useSyncExternalStore`) : chaque nœud s'abonne à son propre booléen.
- Aucune animation permanente ; pas de `filter` ; ombres désactivées en HC.
- `onlyRenderVisibleElements` au-delà de 150 nœuds.
- Paliers : ≤ 50 nœuds en densité `standard`, au-delà `compact` automatiquement (mode `auto`) ; échecs implicites masqués par défaut ; cadrage initial lisible (§6).
- À faire en G1 : libellés d'arêtes masqués sous zoom 0,6 au-delà de 150 nœuds, message « graphe volumineux » au-delà de 300.

---

## 11. Accessibilité (WCAG 2.2 AA)

| Critère | Mise en œuvre |
|---|---|
| 1.1.1 | `aria-label` composé par nœud (§4) ; canevas décrit (nombre d'étapes, de sous-workflows et de chemins d'échec) ; icônes `aria-hidden`. |
| 1.3.1 / 1.3.2 | Ordre de tabulation = ordre du document. **Vue liste synchronisée : pas dans la maquette, à livrer en G1**, c'est l'alternative textuelle complète. |
| 1.4.1 | Double codage partout : motif, glyphe (✓ ✗ ↻ ↺ ↗ ⇢), libellé, forme de nœud (losange, cercle, double bordure, pilule) ; badges textuels. |
| 1.4.3 / 1.4.11 | Tokens B1 vérifiés (§9.3) ; focus et traits ≥ 3:1. |
| 1.4.12 / 1.4.4 | Hauteurs fixes : un grossissement du texte de plus de 120 % provoque des ellipses, mais le contenu reste accessible par `title`, panneau et `aria-label`. À tester en G1. |
| 2.1.1 / 2.1.2 | Tout est faisable au clavier (§8.2) ; `Échap` remonte toujours d'un niveau ; le dialogue d'aide se ferme par `Échap`. |
| 2.2.2 / 2.3.3 | Aucune animation permanente ; `prefers-reduced-motion` et `body.vscode-reduce-motion` coupent les transitions (durées `--ce-duration-*` à 0). |
| 2.4.7 / 2.4.11 | Anneau de focus de 2 px décalé ; auto-pan pour ramener le nœud focalisé dans la vue. |
| 2.5.8 | Cibles ≥ 24×24 (boutons de 30 px, chevrons de 24 px). |
| 4.1.2 | `role="application"`, `toolbar`, `search`, `group` + `aria-roledescription`, `aria-pressed`, `aria-expanded`. |
| 4.1.3 | Région `aria-live="polite"` : layout en cours ou terminé, sélection (« createOrder sélectionné. POST /orders. 2 issues. »), recherche (« Résultat 2 sur 5 »), mode focus. |
| i18n | Dictionnaires FR et EN (`messages.ts`, bascule dans l'en-tête) ; `ariaLabelConfig` de React Flow localisé. |

---

## 12. Scénarios et captures

| Capture | Ce qu'elle montre |
|---|---|
| `order-to-cash-light.png` | POST commande → **receive** `order.confirmed` (horloge de bordure, chips `6 s` et corrélation) → paiement avec boucle `↻ ×3 · 2 s` → facture ∥ expédition (dependsOn pointillé) → **jonction** → **send** → Sorties (2 Selectors) ; échecs vers « Échec » |
| `order-to-cash-dark.png` | Thème sombre ConnEthics, `awaitConfirmation` sélectionné, panneau de détail (Selector JSONPath `rfc9535`, timeout, `aria-label`) |
| `order-to-cash-hc.png` | VS Code High Contrast simulé (variables `--vscode-*` factices) |
| `order-to-cash-vscode-dark.png` | VS Code Dark+ simulé, mode **couloirs** |
| `order-to-cash-lanes-light.png` | Couloirs par source (Workflow, shop, orderEvents, payments, billing, logistics) |
| `pet-adoption-light.png` | Vue d'ensemble à 36 % : niveau de détail « pastille » ; gotos arrière, branches, retry, badges `OP` + ⚠ pour les opérations non résolues |
| `pet-adoption-zoom-light.png` | Même graphe à 95 %, `placeOrderWithCoupon` sélectionné |
| `session-renewal-dark.png` | Retry via le sous-workflow **renewSession** (groupe déplié à double bordure), bandeau des règles par défaut + `ⓦ`, `in: querystring`, goto arrière `staleProfile ↺`, **transfert** vers `supportEscalation`, **appel** (double trait) d'un workflow externe replié |
| `session-renewal-hc.png` | Même scénario en HC |
| `large-60-light.png` | 60 étapes : densité compacte automatique, cadrage initial lisible, mini-carte |
| `large-60-overview-light.png` | Même graphe ajusté à la vue (touche `1`) : vue d'ensemble à 11 % |
| `catalogue-light.png` | Les 9 types de nœuds et 10 types d'arêtes, légende dépliée |
| `catalogue-detailed-light.png` | Densité « détaillé » : critères verbatim, type d'expression |
| `catalogue-lr-dark.png` | Direction LR, thème sombre |

**Observation sur pet-adoption** (copie figée en 1.0.1 de `arazzo-demo/app/public/workflows/pet-adoption.arazzo.yaml`) : le graphe fidèle révèle que `sendConfirmation`, faute de `onSuccess: end`, **continue en séquence vers `endWithError`**, puis vers les Sorties. Il s'agit d'un défaut de l'exemple, à corriger en E1. La maquette le signale par un diagnostic illustratif `implicit-sequence-into-handler`, qu'on peut proposer comme règle d'avertissement à C1. Les 4 opérations hors Petstore standard (`getRecommendations`, `getPetCoupons`, `sendNotification`, `logError`) sont affichées `OP` + ⚠, puisque la source OpenAPI n'est pas fournie.

---

## 13. API proposée pour `<ArazzoGraph>`

```ts
import type { WorkflowGraph, GraphNode } from '@connethics/arazzo-core';

interface ArazzoGraphProps {
  graph: WorkflowGraph;                                   // sortie de workflowToGraph (C1)
  theme?: 'auto' | 'connethics-light' | 'connethics-dark' | 'vscode'; // couleurs = variables CSS
  highContrast?: boolean;                                 // auto en G1 (body.vscode-high-contrast / forced-colors)
  layout?: 'TB' | 'LR';                                   // défaut TB
  lanes?: 'off' | 'clusters' | 'lanes';                   // défaut off
  density?: 'auto' | 'compact' | 'standard' | 'detailed'; // auto : compact au-delà de 50 nœuds
  selectedStepId?: string | null;                         // contrôlé (curseur éditeur → graphe)
  onSelectStep?: (nodeId: string | null, node: GraphNode | null) => void;
  onRevealStep?: (node: GraphNode) => void;               // Entrée / double-clic → éditeur (message step-selected)
  onOpenWorkflow?: (workflowId: string) => void;          // nœud Référence / sous-workflow
  onLayout?: (stats: { ms: number; mode: 'worker' | 'main-thread'; nodes: number; edges: number; density: string }) => void;
  onViewportReady?: () => void;                           // après le cadrage initial
  onOptionsChange?: (o: { layout; lanes; density }) => void; // à persister (vscode.setState)
  showFailureEdges?: boolean;                             // défaut true
  showImplicitFailures?: boolean;                         // défaut false
  showMinimap?: boolean;                                  // défaut true
  showLegend?: boolean;  legendExpanded?: boolean;        // défaut true / false
  collapsed?: Record<string /* groupId */, boolean>;
  diagnostics?: CoreDiagnostic[];                         // G1 : fusion avec node.diagnostics par chemin JSON
  status?: RunTrace;                                      // réservé (états d'exécution, R5 §4.3)
  messages?: Messages;                                    // fr | en (+ ariaLabelConfig)
  ref?: Ref<ArazzoGraphApi>;
}

interface ArazzoGraphApi {
  fitView(): void;
  focusStep(nodeId: string): void;          // focus DOM + auto-pan
  centerOn(nodeId: string, zoom?: number): void;
  search(query: string): void;
  select(nodeId: string | null): void;
  exportImage?(format: 'svg' | 'png'): Promise<Blob>;     // G1 (html-to-image), non maquetté
  toMermaid?(): string;                                   // G1, délégué à core
}
```

Identifiants : `nodeId = "<workflowId>/<stepId>"` pour les étapes. Dans VS Code, `onSelectStep` et `onRevealStep` envoient `{ type: 'step-selected', stepId, workflowId }` ; `selectedStepId` est alimenté par `select-workflow` / `scroll-to-step`.

---

## 14. Décisions à faire valider par l'utilisateur

| # | Décision | Proposition D1 | Alternative |
|---|---|---|---|
| **D-THEME** | Couleurs sémantiques dans VS Code | **Couleurs de marque** (B1 D8) ; seul le chrome suit `--vscode-*` | R5 §4.11 : `testing.iconPassed`, `charts.*`, etc. (plus « natif », moins de marque) |
| **D-DASH** | Motifs de trait | échec `6 4` ; retry `2 3 6 3` ; dependsOn points `0.5 4.5` ronds ; appel = double trait ; transfert `10 4`. **Mettre à jour `--ce-graph-dash-*` de B1**, qui dit dependsOn `6 4` (collision avec l'échec), retry `2 3`, appel `8 3 2 3` | Garder les tokens B1 et choisir un autre motif pour l'échec |
| **D-DEFAULTS** | Actions de niveau workflow | Bandeau + indicateur `ⓦ` sur les étapes | Arêtes dessinées sur chaque étape |
| **D-M2** | Séquence absorbée si un succès conditionnel vise déjà l'étape suivante | Oui (moins de doublons) | Strictement R5 (deux traits) |
| **D-M3** | Étape avec `dependsOn` : pas de séquence implicite entrante | Oui | Garder la séquence en plus des pointillés |
| **D-RETRY** | Retry via workflow | Boucle sur l'étape + arête `↻ via wf` vers le sous-workflow, sans arête de retour | Ajouter une arête de retour « rejouer » |
| **D-PORT** | Port dédié `out-retry` pour la boucle | Oui (évite le chevauchement avec l'échec) | Port commun `out-failure` (R5) |
| **D-H** | Hauteur `standard` | 96 px (avec ligne de chips) | 72 px (R5), chips seulement en détaillé |
| **D-LABEL** | Contenu des libellés d'arêtes | Nom de l'action en standard ; premier critère tronqué en détaillé ; tout au survol | Critère toujours visible (graphe plus large) |
| **D-LANES** | Couloirs | Post-traitement + routage orthogonal de repli (acceptable jusqu'à ~20 nœuds) ; second passage ELK à prototyper en G1 ; jonction dans le couloir de sa cible | Ne livrer que `clusters` en v1 |
| **D-LARGE** | Cadrage initial des grands graphes | Si ajuster < 30 %, cadrer le début à 75 % (touche `1` = tout voir) | Toujours ajuster (vue à 11 % illisible) |
| **D-PERF** | `thoroughness` | 7 jusqu'à 30 nœuds, 4 au-delà (mesures §10) | 10 / 7 / 4 (R5) |
| **D-LOD** | Seuils de niveau de détail | Pastille sous 0,45, rectangle sous 0,25 (R5) | Seuils plus bas (0,35 / 0,2) pour garder le texte plus longtemps |
| **D-IMPL** | Échecs implicites | Masqués par défaut (bouton `∅`) | Visibles par défaut |
| **D-LEGEND** | Légende | Repliée par défaut | Dépliée (cache le bas du graphe) |
| **D-ATTR** | Attribution React Flow | Conservée (pas d'abonnement Pro) | Abonnement Pro et `hideAttribution` |
| **D-INFER** | Méthode déduite du nom | Option désactivée par défaut ; style pointillé si activée | Supprimer complètement l'heuristique |
| **D-PET** | Exemple pet-adoption | Corriger en E1 (ajouter `onSuccess: end` à `sendConfirmation`) et proposer la règle C1 `implicit-sequence-into-handler` | Laisser l'exemple tel quel |
| **D-TINT** | Teintes de couloir en sombre | 7 % | 5 % |

---

## 15. Hors maquette, à faire en G1

- Export SVG/PNG (`html-to-image`) et Mermaid (core), message `export` vers l'extension host.
- **Vue liste synchronisée** (accessibilité, grands graphes).
- En-têtes de couloir collants, second passage ELK pour les couloirs.
- Animation de repli et de dépli (150 ms, coupée en mouvement réduit), fil d'Ariane « parent › sous-workflow ».
- Tooltip riche partagé : un seul portail, à la place des `title` natifs.
- Vue d'ensemble multi-workflows, superposition d'états d'exécution (`status`).
- Tests : Vitest (snapshots des coordonnées, arrondis au pixel, sur les fixtures E1), Playwright (captures, clavier, 60 fps sur 100 nœuds).
- CSP du webview : `worker-src blob:` (V-24).
