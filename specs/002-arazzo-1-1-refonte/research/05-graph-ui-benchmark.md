# R5 — Benchmark UX/UI des visualisations de workflows et principes du graphe Arazzo 1.1

> Lot **R5** de la refonte Arazzo 1.1.0 (voir `../plan.md`). Entrée du lot **D1** (maquettes + spec UI) puis **G1** (`@connethics/arazzo-flow`).
> Rédigé le 16/11/2026. Langue : français. Aucun code modifié.

## 0. En bref

- Les outils de référence convergent vers les mêmes invariants : **nœud carte** (icône de type + titre + sous-titre + 1 à 3 « chips »), **arêtes typées doublement codées** (couleur **et** motif/glyphe/libellé), **conteneurs repliables** pour les sous-flux, **vue alternative non graphique** synchronisée (table, timeline), **minimap + fit + zoom clavier**, **export PNG/SVG**.
- Les défauts majeurs de l'existant : le graphe vscode est un SVG Mermaid figé (pas de zoom/pan, clic par correspondance de texte, `retry`/`dependsOn`/gotos de workflow ignorés, méthode HTTP devinée) ; l'`ArazzoFlow` de la démo calcule un layout ELK… puis jette le routage ELK, n'est utilisé que dans `/showcase`, et code en dur ses couleurs (pas de dark réel dans les nœuds, pas de high contrast).
- Recommandations clés : ELK `layered` **dans un Web Worker**, `cycleBreaking = MODEL_ORDER` + `considerModelOrder = NODES_AND_EDGES` pour respecter l'ordre des `steps`, **ports fixes** par sémantique (entrée, succès, échec), **retry en boucle sur soi** annotée `↻ ×N · Ns`, `dependsOn` en pointillés vers un **nœud de jonction** losange, **appel de workflow** distinct du **transfert** (`goto workflowId`), couloirs par `sourceDescription` en **post-traitement** (le `partitioning` d'ELK ne fait pas de couloirs), thèmes entièrement en variables CSS mappées sur `--vscode-*`.

Niveau de preuve utilisé dans ce document :
- **[doc]** : vérifié dans la documentation officielle ou un changelog (voir Sources) ;
- **[obs]** : observation du produit ou connaissance de l'interface, non retrouvée textuellement dans la documentation. À revérifier visuellement lors de D1 si le détail est structurant.

---

## 1. Benchmark par outil

Grille d'analyse pour chaque outil : nœuds · arêtes · branches/boucles/parallélisme · groupes/sous-flux · états d'exécution · navigation · exports · accessibilité · thèmes. Puis « À retenir pour Arazzo ».

### 1.1 n8n (éditeur « nouveau canvas », Vue Flow)

| Dimension | Constat |
|---|---|
| Nœuds | Tuile carrée centrée sur l'icône du service, nom **sous** la tuile, sous-titre (opération) en dessous. Les déclencheurs ont un bord gauche arrondi et une icône éclair [doc : nodes]. Les sous-nœuds IA (modèle, mémoire, outil) sont **circulaires** et attachés au bas de l'agent [obs]. Au survol : barre d'actions (exécuter l'étape, désactiver, supprimer, menu contextuel) [doc]. « Display note in flow » affiche une note comme sous-titre [doc]. |
| Arêtes | Bézier neutres de gauche à droite, avec une **flèche au milieu** indiquant le sens [doc : forum canvas beta]. Les sorties multiples sont étiquetées sur le nœud (`true`/`false` pour IF, index pour Switch) [obs]. « On Error → Continue (using error output) » ajoute une **seconde sortie rouge « Error »** [doc : nodes + forum]. |
| Branches / boucles / parallélisme | Les branches partent de ports de sortie nommés. Les boucles (`Loop Over Items`, sorties `loop`/`done`) sont des connexions qui **rebouclent vers l'arrière** en contournant les nœuds, « comme en v1 » [doc : forum]. Les branches parallèles sont un simple éventail (fan-out). |
| Groupes / sous-flux | Groupes : `Ctrl+G`, avec repli et dépli [doc : raccourcis]. Notes adhésives (sticky notes). « Convert to sub-workflow » depuis le menu contextuel [doc]. Le sous-workflow est un nœud *Execute Workflow*, non déplié inline [obs]. |
| États d'exécution | Pendant l'exécution, animation sur le nœud en cours [doc : forum]. Après l'exécution : pastille verte et **nombre d'items sur l'arête** ; en cas d'erreur, bordure rouge et icône d'alerte ; les données épinglées ont une icône dédiée [obs]. `Retry On Fail` est un **réglage** du nœud, invisible sur le graphe [doc]. |
| Navigation | Minimap (ajoutée avec le nouveau canvas) ; `+`/`-` pour zoomer, `0` pour réinitialiser, `1` pour ajuster ; **flèches = déplacement de la sélection vers le nœud voisin** ; `Entrée` ouvre le nœud ; `Ctrl+K` ouvre la barre de commandes, avec « Tidy up » [doc : raccourcis]. |
| Exports | JSON du workflow (fichier, ou copier-coller des nœuds). Pas d'export image natif [obs]. |
| Accessibilité | Navigation clavier spatiale entre nœuds [doc]. Pas d'engagement WCAG publié. |
| Thèmes | Clair et sombre [obs]. Design « flat » en 2.0, sans ombres 3D, pour réduire le bruit sur les grands canevas [doc secondaire]. |

**À retenir** : la navigation clavier spatiale aux flèches, les raccourcis `0`/`1`/`+`/`-`, la flèche au milieu des arêtes longues, la sortie d'erreur comme port distinct, le flat design pour les grands graphes. **À éviter** : le retry invisible sur le graphe.

### 1.2 Temporal UI (Event History, Timeline, Compact)

| Dimension | Constat |
|---|---|
| Nœuds | Pas de DAG. L'unité est l'**Event Group** (par exemple Activity Scheduled, Started et Completed fusionnés en une ligne) [doc : blog]. |
| Arêtes | Aucune. Le temps est l'axe principal. Dans *Compact*, la longueur des traits entre groupes est proportionnelle à la durée [doc]. |
| Branches / boucles / parallélisme | Le parallélisme se lit par **superposition horizontale** des barres sur la Timeline [doc]. Les retries apparaissent comme une **icône retry avec le numéro de tentative** sur l'activité [doc]. |
| Groupes / sous-flux | Les Child Workflows s'ouvrent dans le panneau de détail sans quitter la page. L'onglet *Relationships* montre l'arbre parent/enfant [doc]. |
| États d'exécution | Barre verte pour Completed, rouge pour Failed. Les marqueurs et signaux sont des **points**, pas des barres. Le survol donne le début, la fin et la durée à la milliseconde. Mise à jour en direct [doc]. Onglet *Pending Activities* [doc]. |
| Navigation | Défilement vertical (événements) et horizontal (temps), zoom par pincement ou `+`/`-`, bouton **Fit**, filtre par type d'événement partagé avec la table [doc]. Timeline repliable en accordéon, préférence persistée [doc]. |
| Exports | Téléchargement de l'Event History en JSON [doc]. |
| Accessibilité | Vues textuelles équivalentes (*All*, *JSON*) [doc]. |
| Thèmes | Non documenté dans les sources consultées. |

**À retenir** : toujours proposer une **vue textuelle équivalente** au graphe (accessibilité, grands volumes) ; **badge de tentative** pour les retries ; la survol riche en durées. Pour Arazzo (pas de moteur), cela prépare une future superposition de traces de runner (Respect, Specmatic).

### 1.3 AWS Step Functions — Workflow Studio et vue d'exécution

| Dimension | Constat |
|---|---|
| Nœuds | Rectangle arrondi avec l'icône du service ou du type d'état et le nom de l'état. Nœuds *Start*/*End* en pilule [obs]. L'inspecteur à droite surligne l'ASL correspondant à l'état sélectionné (**synchro graphe ↔ code**) [doc]. |
| Arêtes | Transitions `Next`. Les branches de `Choice` portent la règle (« Rule #1 », « Default ») ; les `Catch` mènent à un *fallback state* et sont libellées par catcher [obs ; configuration : doc process-error]. Le `Retry` (Interval, Max attempts, Backoff rate) est configuré dans l'onglet *Error handling*, sans arête dédiée [doc]. |
| Branches / boucles / parallélisme | `Parallel` est un **conteneur** à colonnes de branches ; `Map` est un **conteneur** d'itérations, avec un **sélecteur d'itération** (liste déroulante et flèches haut/bas) dans la vue d'exécution [doc : execution details]. |
| Groupes / sous-flux | `Map`/`Parallel` en conteneurs ; les exécutions imbriquées sont reliées par un lien vers le parent [doc]. |
| États d'exécution | **Légende** en bas du Graph view [doc] : en cours, succès, échec, erreur capturée, annulé [obs pour les libellés exacts]. Table view avec colonne **Timeline** : **segments rouges = tentatives de retry échouées, segments gris clair = backoff** [doc]. Événements colorés par statut [doc]. |
| Navigation | Zoom avant et arrière, **centrer**, **plein écran** [doc]. Sélection synchronisée **Graph ↔ Table** dans les deux sens [doc]. Filtres sur la table [doc]. |
| Exports | **Export SVG ou PNG** du graphe et bascule **horizontal/vertical** (bouton *Layout*) [doc]. Export ASL en JSON ou YAML et export JSON de l'exécution [doc]. |
| Accessibilité | La table équivaut au graphe [doc]. L'éditeur de code s'utilise au clavier (`Ctrl+Space`, `F1`) [doc]. |
| Thèmes | Suit le thème de la console AWS (Cloudscape, clair et sombre) [obs]. |

**À retenir** : la **légende intégrée**, la **bascule TB/LR**, l'**export SVG/PNG** dans la barre du graphe, la **sélection synchronisée graphe ↔ liste**, la représentation du retry en **segments tentative/attente**. Ce dernier point inspire l'annotation `↻ ×N · Ns`. Le surlignage du code correspondant au nœud sélectionné est exactement le « clic nœud → éditeur » de vscode.

### 1.4 Postman Flows

| Dimension | Constat |
|---|---|
| Nœuds | « Blocs » avec **ports d'entrée et de sortie** explicites [doc : blocks-information]. Familles : primitives (requête HTTP, autre flow), connecteurs, déclencheurs, IA, logique, boucles, visualisation, sorties, données [doc]. Couleur personnalisable par bloc [doc]. |
| Arêtes | Fils de **données** typés (une sortie alimente une entrée). Le bloc de requête a des sorties de succès et d'échec et le bloc *If* des sorties TRUE/FALSE [obs]. |
| Branches / boucles / parallélisme | Les blocs logiques (Condition, If, Validate, Evaluate, Delay, Or) routent les données [doc]. Les boucles commencent par `Repeat`/`For` et se terminent obligatoirement par `Collect` [doc]. Depuis 11.47.2, plus de fil entrant dans une boucle : on passe par des variables [doc]. |
| Groupes / sous-flux | Bloc *Flow* (appel d'un autre flow) et bloc *Output* qui renvoie des données vers le flow appelant [doc]. |
| États d'exécution | « Pause on this block » : la barre de titre prend des **rayures diagonales jaunes**, et un bouton *Continue* apparaît au survol [doc]. Les blocs *Display* rendent les données (table, graphe) **dans le canevas** [doc]. |
| Navigation | Canevas libre, zoom et pan [obs]. |
| Exports | Flow partageable et déployable (URL) [doc]. |
| Accessibilité | Non documentée. |
| Thèmes | Thèmes de l'app Postman (clair et sombre) [obs]. |

**À retenir** : la **double sortie succès/échec** sur le bloc d'appel API, qui correspond directement à `onSuccess`/`onFailure`. Un état « pause » signalé par un **motif** (rayures) et non par la seule couleur. **Non pertinent** : le modèle par flux de données, car Arazzo enchaîne des étapes et non des transformations.

### 1.5 Jentic — Arazzo UI (open source) et Arazzo Editor

| Dimension | Constat |
|---|---|
| Nœuds | Nœuds d'étape. Un clic en *split view* déplie le workflow et fait défiler la documentation jusqu'à l'étape [doc : README]. |
| Arêtes | **Boucles de retry libellées** et **chemins d'échec** convergeant vers une étape de log dans l'exemple [doc : blog]. L'éditeur affiche les « retry loops » et permet de suivre le chemin d'échec [doc]. |
| Branches / boucles / parallélisme | Flow diagrams « decision trees and execution paths », plus des **sequence diagrams** [doc]. |
| Groupes / sous-flux | Onglets par workflow ; `setActiveWorkflow`, `onWorkflowSelect` [doc]. |
| États d'exécution | Aucun (viewer et éditeur). |
| Navigation | API par ref : `fitView()`, `setZoom()`, `selectStep()`, `clearSelection()` ; callbacks `onNodeSelect`, `onEdgeSelect` [doc]. |
| Exports | Éditeur : YAML/JSON, documentation **Markdown/HTML** [doc]. Viewer : URL partageable, CLI `npx @jentic/arazzo-ui <url>` [doc]. |
| Accessibilité | Non documentée. |
| Thèmes | Non documentés. |
| Stack | `reactflow@^11` (ancien paquet) + `mermaid@^12` + `react-markdown`, React 18/19, licence Apache-2.0 [doc : package.json]. Conformité **Arazzo 1.0.1** annoncée [doc]. |

**À retenir** : c'est le **concurrent direct**. Ses limites sont autant de différenciateurs pour ConnEthics : pas de 1.1 (AsyncAPI, `dependsOn` d'étape), React Flow 11, thèmes et accessibilité non documentés. Son API impérative (`fitView`, `selectStep`) et sa *split view* graphe + documentation synchronisés sont de bonnes idées à reprendre dans `<ArazzoGraph>`.

### 1.6 LangGraph Studio (LangSmith Studio)

| Dimension | Constat |
|---|---|
| Nœuds | Boîtes nommées, avec des nœuds terminaux `__start__` et `__end__` [doc : graph-api-visualize]. |
| Arêtes | **Arête normale = flèche pleine ; arête conditionnelle = une flèche pointillée par destination possible** [doc + article]. Le routage dynamique via `Command` n'est **pas visualisable statiquement** [doc : forum]. |
| Branches / boucles / parallélisme | Les cycles (boucle agent ↔ outils) sont dessinés tels quels. Le parallélisme est un fan-out. |
| Groupes / sous-flux | Sous-graphes **non dépliés automatiquement** (`xray`) [doc : forum]. |
| États d'exécution | Mode *Graph* : nœuds traversés et états intermédiaires ; **interrupts** avant et après un nœud ; **time travel** et fork de thread [doc]. |
| Navigation | Mode *Graph* complet et mode *Chat* simplifié [doc]. |
| Exports | Mermaid ou PNG via l'API (`draw_mermaid`) [doc]. |
| Accessibilité | Non documentée. |
| Thèmes | Clair et sombre (LangSmith) [obs]. |

**À retenir** : la convention **plein = inconditionnel, pointillé = conditionnel** est désormais familière aux développeurs IA, la cible MCP de ConnEthics. Pour Arazzo, l'avantage est que **toutes les cibles (`goto`) sont statiques**, donc le graphe peut être complet, contrairement à LangGraph.

### 1.7 Windmill

| Dimension | Constat |
|---|---|
| Nœuds | Cartes verticales avec un identifiant court de l'étape, un résumé et une icône du langage [obs]. Poignée de déplacement et boutons : menu, supprimer, tester, sélecteur de sortie, déplier le sous-flux [doc]. |
| Arêtes | Haut vers le bas, orthogonales [obs]. |
| Branches / boucles / parallélisme | Boîte parente « **Run one branch** » (prédicats évalués dans l'ordre, puis branche par défaut) ou « **Run all branches** » (option parallèle, limite de concurrence) [doc]. For et while loops sous forme de **sous-flux dépliables inline** [doc]. Error handler, retries, early stop, suspend/approval et sleep sont des concepts de premier niveau [doc]. |
| Groupes / sous-flux | **Groupes** : bordure colorée et carte d'en-tête, **repliables en un seul nœud** ; sous-flux dépliés inline avec fil d'Ariane [doc]. Groupes et notes sont visibles dans le *status viewer* [doc : changelog]. Layout « **recursive compound** » qui remplace un Sugiyama plat (v1.654) [doc : release]. |
| États d'exécution | Couleur par nœud dans le *flow status viewer*, **sélection d'itération** depuis le graphe [doc : changelog]. |
| Navigation | Zoom et pan [obs]. |
| Exports | Flow en YAML/JSON [obs]. |
| Accessibilité | Non documentée. |
| Thèmes | Clair et sombre (« improved dark mode ») [doc : changelog]. |

**À retenir** : le **layout composé récursif** (les groupes sont mis en page de l'intérieur vers l'extérieur), qui correspond à ELK `hierarchyHandling: INCLUDE_CHILDREN`. Les **groupes repliables en un nœud** et le **fil d'Ariane** pour les sous-flux dépliés.

### 1.8 Kestra

| Dimension | Constat |
|---|---|
| Nœuds | Tâches avec l'icône du plugin, déclencheurs affichés dans la topologie [doc : release 0.21]. Éditeur *No Code* en sections Triggers / Tasks / Errors / Finally / After Execution [doc]. |
| Arêtes | DAG [doc]. |
| Branches / boucles / parallélisme | Les tâches « flowable » (Parallel, Switch, ForEach) sont rendues en conteneurs [obs]. |
| Groupes / sous-flux | Sous-flows ; onglet *Dependencies* (flows liés) [doc]. |
| États d'exécution | Topologie colorée : vert pour SUCCESS, rouge pour FAILED. Clic sur un nœud : logs, **replay depuis cette tâche**, changement de statut [doc]. Vue **Gantt** des durées [doc]. |
| Navigation | Zoom en bas à gauche [doc]. Clavier en No Code : `/` pour rechercher et insérer un bloc, `↑`/`↓` pour naviguer [doc]. |
| Exports | **PNG** depuis la topologie, YAML du flow [doc]. |
| Accessibilité | Navigation clavier partielle [doc]. |
| Thèmes | Clair et sombre [obs]. |

**À retenir** : vues multiples synchronisées sur la même source (code, no-code, topologie, documentation), comme l'extension vscode (éditeur YAML, preview, flowchart). `/` pour la recherche. Export PNG en un clic.

### 1.9 GitHub Actions (graphe d'un run)

| Dimension | Constat |
|---|---|
| Nœuds | Une **carte compacte par job** : icône de statut à gauche du nom [doc], durée à droite [obs]. |
| Arêtes | « Lines between jobs indicate dependencies » (`needs`) [doc]. Gauche vers droite, en colonnes [obs]. |
| Branches / boucles / parallélisme | Les jobs sans dépendance sont dans la même colonne, ce qui rend le parallélisme implicite [obs]. Les **matrices** sont regroupées dans une carte repliable « Matrix: <job> » avec un compteur [obs ; doc secondaire]. |
| Groupes / sous-flux | Les reusable workflows apparaissent comme une carte groupe contenant les jobs appelés [obs]. |
| États d'exécution | Icônes : coche (succès), croix (échec), spinner (en cours), barré ou gris (ignoré) [obs]. Mise à jour en temps réel [doc]. |
| Navigation | Clic sur un job : logs [doc]. Le survol d'un job met en évidence ses dépendances [obs]. |
| Exports | Aucun. |
| Accessibilité | Les statuts sont doublés par une icône (pas seulement la couleur) [obs]. |
| Thèmes | Primer : clair, sombre, **dark dimmed, high contrast, variantes daltoniennes** (protanopie, tritanopie) [obs]. |

**À retenir** : c'est le modèle à suivre pour **`dependsOn`** (jonctions de type `needs`) et les **thèmes daltoniens et high contrast** de Primer. Le **compteur sur un groupe replié** (« ×6 ») sert pour les grands graphes. Le surlignage du chemin au survol.

### 1.10 Prefect (flow run graph)

| Dimension | Constat |
|---|---|
| Nœuds | Une barre par task run ou subflow run (libellé et état) [doc : API graph-v2]. Rendu **WebGL via PixiJS** (`@prefecthq/graphs`, « Large scale graphs ») [doc : npm]. |
| Arêtes | Flèches issues des **dépendances amont** (passage de résultats, `wait_for`) [doc]. |
| Branches / boucles / parallélisme | En layout temporel, les tâches concurrentes se chevauchent sur l'axe du temps. Le layout « **Dependency grid** » aligne par dépendance [doc]. La vue Timeline seule ne dessine pas les flèches [doc secondaire]. |
| Groupes / sous-flux | Les subflow runs s'imbriquent dans le graphe [doc]. |
| États d'exécution | Couleurs d'état Prefect (Completed, Failed, Running, Pending, Crashed, Cancelled) [obs]. |
| Navigation | Zoom et pan, plein écran, choix du layout [obs]. |
| Exports | API REST `/flow_runs/{id}/graph-v2` [doc]. Graphviz statique avec `visualize_task_dependencies` [doc]. |
| Accessibilité | Rendu canvas WebGL **opaque pour les lecteurs d'écran** [obs]. |
| Thèmes | Clair et sombre [obs]. |

**À retenir** : on peut **séparer le modèle de graphe (API) du rendu**, ce qui correspond au `workflowToGraph` de core. Un canvas WebGL ne se justifie qu'au-delà de plusieurs milliers de nœuds, pour un coût d'accessibilité élevé ; un workflow Arazzo n'atteint jamais cette taille, donc le DOM et le SVG (React Flow) restent le bon choix.

### 1.11 React Flow / xyflow (exemples et composants officiels)

| Sujet | Constat |
|---|---|
| Exemples de layout | *Elkjs Tree* et **Elkjs Multiple Handles** : les handles deviennent des **ports ELK** (cibles à l'ouest, sources à l'est, en direction RIGHT), avec `org.eclipse.elk.portConstraints: FIXED_ORDER` pour réduire les croisements. Le layout est lancé après `useNodesInitialized()`, suivi de `fitView()` [doc]. *Expand and Collapse*, *Auto Layout* (Pro) [doc]. |
| Arêtes | *Edge Label Renderer* (libellés HTML), *Edge Markers*, *Custom Edges*, *Edge Toolbar*, *Floating Edges* [doc]. |
| Groupes | *Sub Flow* (`parentId`, `extent: 'parent'`) [doc]. |
| Navigation | `MiniMap` (pannable, zoomable), `Controls`, *Contextual Zoom* (rendu différent selon le niveau de zoom) [doc]. |
| Export | Exemple *Download Image* (`html-to-image` + `getNodesBounds` / `getViewportForBounds`) [doc]. |
| Accessibilité | Nœuds et arêtes focusables (`Tab`), `Entrée`/`Espace` pour sélectionner, `Échap` pour désélectionner, flèches pour déplacer (`disableKeyboardA11y` pour couper le déplacement), `autoPanOnNodeFocus`, `ariaRole`, `domAttributes` (`aria-roledescription`), **`ariaLabelConfig` localisable**, région `aria-live` [doc]. |
| Thèmes | `colorMode="light|dark|system"`, variables `--xy-*`, `base.css` (fonctionnel seul) contre `style.css` [doc]. |
| Performance | `React.memo` sur les nœuds, `nodeTypes`/`edgeTypes` stables, ne pas lire `nodes` entier dans les composants, replier les sous-arbres avec `hidden`, limiter ombres, dégradés et animations [doc]. |
| Composants UI | `NodeStatusIndicator` (`initial`/`loading`/`success`/`error`, bordure tournante ou overlay) ; template **Workflow Editor** (ELK, dark mode, runner séquentiel) [doc]. |

**À retenir** : toutes les briques nécessaires existent en standard (MIT). Le travail porte sur le **modèle sémantique**, les **ports**, le **routage**, les **tokens** et l'**accessibilité**, pas sur le moteur.

---

## 2. Synthèse transversale

### 2.1 Convergences (à adopter)

1. **Carte à trois zones** : en-tête (icône de type + titre) / corps (1 à 3 lignes) / pied (chips). Les détails complets vont dans un tooltip ou un panneau, jamais dans le nœud (n8n, Windmill, Step Functions).
2. **Double codage** des statuts et arêtes : couleur **plus** motif, glyphe ou libellé (GitHub, LangGraph, Postman). La couleur seule échoue au critère WCAG 1.4.1.
3. **Conteneurs repliables** pour les sous-flux, avec compteur à l'état replié (Windmill, GitHub, Step Functions).
4. **Vue textuelle synchronisée** (table, outline, timeline) : Step Functions, Temporal. Elle sert à la fois l'accessibilité et les grands graphes.
5. **Barre d'outils standard** : zoom ±, fit, bascule TB/LR, export, légende (Step Functions, Kestra).
6. **Sélection bidirectionnelle** graphe ↔ code (Step Functions, Kestra, Jentic) : c'est le cœur de la valeur dans VS Code.
7. **Retry visible** comme boucle annotée (Jentic) ou comme segments de tentatives (Step Functions).
8. **Design plat** pour les grands canevas : pas d'ombres lourdes ni d'animations permanentes (n8n 2.0, guide de performance React Flow).

### 2.2 Anti-patterns observés

- Retry caché dans les réglages (n8n, Step Functions Studio) : pour Arazzo, le retry est un comportement **déclaré**, il doit se voir.
- Arêtes animées en permanence sans signification. C'est le cas de l'existant ; c'est coûteux en CPU et cela gêne les personnes sensibles au mouvement.
- Routage dynamique non visualisable (LangGraph `Command`). Ce n'est pas un risque pour Arazzo, mais on ne doit pas en créer en ignorant les actions réutilisables (`$components.*`).
- Rendu canvas/WebGL sans alternative accessible (Prefect).

### 2.3 Matrice récapitulative

| Outil | Retry visible | Arête échec distincte | Sous-flux repliable | Jonction / dépendances | Minimap | Recherche | Export image | Clavier nœud à nœud | HC / daltonien |
|---|---|---|---|---|---|---|---|---|---|
| n8n | non (réglage) | port « Error » | groupes | fan-in libre | oui | `Ctrl+K` | non | flèches | ? |
| Temporal | icône + tentative | rouge | panneau enfant | — | — | filtre | non | — | ? |
| Step Functions | timeline segments | Catch | Map/Parallel | Parallel | non | filtre table | SVG/PNG | ? | Cloudscape |
| Postman Flows | non | sortie Fail | bloc Flow | — | ? | ? | non | ? | ? |
| Jentic Arazzo UI | boucle libellée | oui | onglets | ? | ? | ? | non | ? | ? |
| LangGraph Studio | — | pointillé = conditionnel | non (xray) | — | ? | — | Mermaid/PNG | ? | ? |
| Windmill | réglage | error handler | groupes + inline | branch all | ? | ? | ? | ? | ? |
| Kestra | ? | errors | conteneurs | ? | ? | `/` | PNG | `↑`/`↓` | ? |
| GitHub Actions | — | icône statut | matrice / reusable | `needs` | non | non | non | ? | oui (Primer) |
| Prefect | — | couleur état | subflows | dépendances | ? | ? | non | non | ? |
| **Cible ConnEthics** | **boucle `↻ ×N · Ns`** | **pointillé + ✗ + port dédié** | **groupe + compteur** | **losange `dependsOn`** | **oui** | **`/`** | **SVG/PNG/Mermaid** | **flèches spatiales** | **HC VS Code + palette daltonienne** |

« ? » signifie non vérifié ; « — » signifie sans objet.

---

## 3. Défauts de l'existant

### 3.1 arazzo-vscode — `webview-ui/src/lib/mermaid-converter.ts`

| # | Lignes | Défaut | Impact |
|---|---|---|---|
| V-1 | 28-32 | `classDef` en hex fixes (indigo, vert, ambre, rouge), indépendants du thème VS Code. Aucun cas high contrast. | Contraste insuffisant en HC, rupture visuelle avec l'éditeur. |
| V-2 | 40, 58, 108 | Émojis dans les libellés (`📥`, `📤`, `❌`). Rendu variable selon la police, lus de façon bruyante par les lecteurs d'écran. | Accessibilité, cohérence visuelle. |
| V-3 | 47, 276-287 | **Méthode HTTP devinée** par sous-chaîne de l'`operationId`, et les règles GET sont testées en premier. `deleteTarget` → **GET** (« tar**get** »), `updateAddress` → **POST** (« **add**ress »), `logout` → **POST** (« **log** »). | Information fausse affichée comme un fait. |
| V-4 | 49 | Le libellé se limite à `n. [METHOD] stepId`. Pas de `summary`/`description`, pas d'opération, pas de distinction `workflowId` / `operationPath`. | Nœuds peu informatifs. |
| V-5 | 76-83 | L'arête séquentielle est supprimée dès qu'un `goto` ou un `end` existe, **même conditionnel** (avec `criteria`). Or si aucune action ne correspond, l'exécution passe à l'étape suivante. | Graphe sémantiquement faux pour tout branchement conditionnel. |
| V-6 | 88, 101 | Les actions réutilisables (`reference: $components.successActions.x`) sont **ignorées** (`return`). | Arêtes manquantes. |
| V-7 | 90, 104 | Seul `goto` + `stepId` est géré : un `goto` vers un `workflowId` est ignoré. | Transferts inter-workflows invisibles. |
| V-8 | 93-94 | `end` en succès pointe vers `OUTPUT` même si le workflow n'a pas d'`outputs` : Mermaid crée alors un nœud implicite « OUTPUT » non stylé. | Nœud fantôme. |
| V-9 | 102-110 | `type: retry` ignoré (ni `retryAfter`, ni `retryLimit`). | Fonctionnalité clé d'Arazzo absente. |
| V-10 | 114-124 | La dernière étape est reliée à `OUTPUT` sans condition, même si elle termine par un `goto` arrière. | Arête fausse. |
| V-11 | (absent) | Ni `dependsOn` (workflow ni étape 1.1), ni `channelPath`/`action`/`correlationId`/`timeout`, ni actions de niveau workflow (`successActions`/`failureActions`), ni `sourceDescriptions` (pas de couloirs). | Hors 1.1. |
| V-12 | 256-258 | `sanitizeId` crée des **collisions** : `get-pet` et `get_pet` deviennent `get_pet` et fusionnent. Un `stepId` `INPUT`/`OUTPUT`, ou `end` (mot réservé Mermaid, voir la doc flowchart), casse le rendu. | Nœuds fusionnés ou diagramme en erreur. |
| V-13 | 260-274 | `sanitizeLabel` **supprime `$`** et remplace `:` : `$statusCode == 200` devient `statusCode == 200`, ce qui altère les expressions runtime. | Libellés trompeurs. |
| V-14 | 133-250 | Générateur de diagramme de séquence **mort** dans vscode (non appelé, voir aussi `App.tsx:151` dans le plan). À la ligne 223, un `goto` d'échec est libellé « Retry → », ce qui est sémantiquement faux. | Code mort, confusion. |

### 3.2 arazzo-vscode — `webview-ui/src/components/MermaidDiagram.tsx` et autour

| # | Fichier:lignes | Défaut |
|---|---|---|
| V-15 | `MermaidDiagram.tsx:22-44` | `mermaid.initialize` global, thème `dark`/`default` seulement : pas de HC, pas de variables `--vscode-*`. |
| V-16 | `MermaidDiagram.tsx:46-63` | Rendu asynchrone **sans annulation** : deux frappes rapides peuvent afficher un SVG obsolète (course). Tout le SVG est régénéré à chaque modification. |
| V-17 | `MermaidDiagram.tsx:66-132` | Le clic est résolu **par correspondance de texte** sur le SVG : `includes(step.stepId)` à la ligne 115 fait correspondre l'étape `pay` au nœud `payment`. Le repli de la ligne 124 prend le premier mot venu. Navigation éditeur non fiable. |
| V-18 | `MermaidDiagram.tsx:149-158` | `overflow-auto` + `dangerouslySetInnerHTML` : **pas de zoom, pan, fit ni minimap**. |
| V-19 | `MermaidDiagram.tsx:149-152` | `div onClick` sans `role`, sans `tabIndex`, nœuds SVG non focusables : **inutilisable au clavier**. Tout le conteneur est en `cursor-pointer`. |
| V-20 | `MermaidDiagram.tsx` (absent) | Aucun état sélectionné : la sync curseur → graphe (`select-workflow`) ne met pas en évidence l'étape courante. |
| V-21 | `FlowchartView.tsx:24` | Direction `TB` figée, pas de bascule LR. |
| V-22 | `App.tsx:66` | Détection du thème en booléen : `vscode-high-contrast` est assimilé à dark, `vscode-high-contrast-light` à light. Pas de mode HC distinct. |
| V-23 | `hooks/useThemeClasses.ts` | Couleurs Tailwind `slate`/`gray` au lieu des variables `--vscode-*`. |
| V-24 | `src/panels/webview-html.ts:38` | CSP sans `worker-src` (donc `default-src 'none'` s'applique) : un worker ELK sera bloqué. Il faut `worker-src blob:` (et `connect-src ${webview.cspSource}` si le worker est récupéré par `fetch`). |
| V-25 | `webview-ui/build/assets` | 3,8 Mo d'assets, dont `flowchart-elk-definition` (1,45 Mo), `mindmap` (0,54 Mo) et `katex` (0,27 Mo) tirés par Mermaid sans être utilisés. **Mermaid embarque déjà ELK** : le passage à elkjs direct ne coûtera pas plus et supprimera le reste. |

### 3.3 arazzo-demo — `app/src/components/ArazzoFlow.tsx`

| # | Lignes | Défaut |
|---|---|---|
| D-1 | (usage) | Composant utilisé **uniquement** dans `app/showcase/page.tsx:1386`. Les vues produit (`DocumentationView.tsx:237-300`, `UnifiedDocumentationView.tsx:722-824`, `features/builder/components/CenterPanel.tsx:7-9`) utilisent encore Mermaid. |
| D-2 | 19, 26, 94 | `elk.bundled.js` sur le **thread principal** : l'UI est bloquée pendant le layout. |
| D-3 | 36-40 | `defaultEdgeOptions.animated: true` : animation permanente sans signification. Coût CPU et pas de respect de `prefers-reduced-motion`. |
| D-4 | 58-59, 84-85 | Tailles **fixes estimées** (280×100, 240×80) alors que les nœuds ont une hauteur variable : les listes d'inputs et d'outputs ne sont pas bornées (`InputNode.tsx:42-64`, `OutputNode.tsx:47-57`). Résultat : chevauchements. |
| D-5 | 78, 87-91, 96-109 | `'elk.edgeRouting': 'SPLINES'` est demandé, mais les `sections` d'arêtes retournées par ELK sont **ignorées** : React Flow redessine en `smoothstep`. Les arêtes arrière (goto vers une étape antérieure) traversent les nœuds. |
| D-6 | 87-91 | Pas de **ports** : ELK ignore de quel côté partent succès et échec, d'où des croisements évitables. |
| D-7 | 79 | `mergeEdges: true` fusionne des arêtes de sémantiques différentes entre la même paire de nœuds. |
| D-8 | 157-181 | Pas d'annulation des layouts concurrents (course). Relayout à **chaque changement d'identité** des tableaux `initialNodes`/`initialEdges`. |
| D-9 | 233 | `fitView` appliqué au montage seulement : après une bascule de direction ou un nouveau layout, le viewport n'est pas recadré. |
| D-10 | 192-199 | Le clic sur le nœud Input envoie `schema: {}` : les données d'entrée réelles sont perdues dans le panneau de détail. |
| D-11 | 237 | `nodesDraggable` dans un viewer en lecture seule : les positions déplacées sont perdues au relayout suivant. |
| D-12 | 246-273, 276-326 | Couleurs en dur (`#22c55e`, `#6366f1`…) et classes Tailwind conditionnées par `isDark`. Pas de HC, pas de tokens. |
| D-13 | 276-305 | Boutons de direction sans `aria-pressed`, libellés anglais en dur. Le panneau « Calculating layout… » (318-326) n'est pas annoncé (`aria-live`). |
| D-14 | 244 | `proOptions.hideAttribution` : licence MIT permise, mais xyflow demande un abonnement Pro dans ce cas. Décision à prendre en B1 (garder l'attribution ou souscrire). |
| D-15 | (absent) | Pas de recherche, pas de raccourcis, pas d'export, pas de légende, pas de `onlyRenderVisibleElements` ni de repli. |

### 3.4 arazzo-demo — nœuds et convertisseur

| # | Fichier:lignes | Défaut |
|---|---|---|
| D-16 | `nodes/InputNode.tsx:29-31`, `OutputNode.tsx:27`, `StepNode.tsx:43` | `bg-white`, `text-gray-800` sans variante sombre : **cartes blanches en mode sombre**. `isDark` n'est pas transmis (`StepNode.tsx:52-61`). |
| D-17 | `nodes/InputNode.tsx:53` | « required » en `text-red-500` : le rouge est réservé à l'échec, ce qui crée un conflit sémantique. |
| D-18 | `nodes/InputNode.tsx:59` | `= ${default}` : un défaut objet ou tableau s'affiche `[object Object]`. |
| D-19 | `nodes/StepNode.tsx:45-68` | Une seule poignée source pour succès **et** échec : arêtes superposées. |
| D-20 | `nodes/UnifiedStepNode.tsx:149, 272` | `isDark={selected}` / `isDark={isActive}` : le **style sombre est déclenché par la sélection**. |
| D-21 | `nodes/UnifiedStepNode.tsx:248-254` | `methodStyles` défini mais jamais utilisé (code mort). Casts `as any` aux lignes 147, 270 et 277. |
| D-22 | `nodes/UnifiedStepNode.tsx:138-142, 237-242` | Poignées du mode édition fixées en haut et en bas, quelle que soit la direction du layout. |
| D-23 | `lib/arazzo-utils.ts:19-43`, `lib/arazzo-parser.ts:241-249`, `components/arazzo/StepHeader.tsx:41` | Trois implémentations divergentes de la **méthode devinée** (même défaut que V-3). |
| D-24 | `lib/arazzo-parser.ts:49-120` | Positions manuelles et `branchOffsets` calculés puis écrasés par ELK : code mort. |
| D-25 | `lib/arazzo-parser.ts:155-175` | Règle d'arête séquentielle **différente** de vscode (V-5) : suppression seulement si le goto vise l'étape suivante ou si un `end` existe (même conditionnel). Deux vérités pour le même document. |
| D-26 | `lib/arazzo-parser.ts:182-218` | Succès et échec ont **le même motif** (`4,4` animé) : seule la couleur les distingue (WCAG 1.4.1). Pas d'arête `end`, pas de `retry`, ni `workflowId` ni réutilisables (182, 203). |
| D-27 | `lib/arazzo-parser.ts:222-232` | Dernière étape → output sans condition (même défaut que V-10). |

**Conclusion** : il n'y a rien à conserver tel quel côté convertisseurs. Le `workflowToGraph` de core (C1) doit être **l'unique** source sémantique, testée (Vitest) sur les cas V-5, V-6, V-7, V-9, V-10 et V-12. Côté rendu, on peut récupérer de l'`ArazzoFlow` actuel la structure `ReactFlowProvider` + `Panel` et l'appel ELK, à réécrire selon §4.

---

## 4. Principes retenus pour le graphe Arazzo 1.1

### 4.1 Principes directeurs

1. **Fidélité sémantique avant esthétique** : chaque arête correspond à une règle de la spec. Pas d'heuristique silencieuse ; quand une information est déduite, elle est marquée comme telle (style « déduit »).
2. **Lecture seule d'abord** : nœuds non déplaçables, layout déterministe (même document = même image), ce qui permet des captures stables pour la doc et le site (W1, W2).
3. **Double codage systématique** : couleur + motif de trait + glyphe + libellé.
4. **Progressive disclosure** : 3 densités (`compact` / `standard` / `détaillé`). Le détail complet est au survol (tooltip) et à la sélection (panneau ou éditeur), jamais en dur dans le nœud.
5. **Le graphe n'est qu'une vue** : sélection synchronisée avec l'éditeur (vscode) ou l'inspector (demo), plus une vue liste/outline accessible.
6. **Thème = variables CSS** : aucune couleur en dur dans le paquet. Les tokens `--af-*` sont mappés sur `--vscode-*` ou sur les tokens ConnEthics (B1).
7. **Rien de permanent qui bouge** : pas d'arêtes animées. Les animations courtes (≤ 150 ms) sont désactivées sous `prefers-reduced-motion`.
8. **Échelle** : confortable jusqu'à 50 nœuds, dégradé maîtrisé jusqu'à 300.

### 4.2 Tokens sémantiques du graphe (à aligner sur B1)

Les tokens sont préfixés `--af-` (*arazzo-flow*). Leurs valeurs viennent de B1 (web) ou de §4.11 (VS Code).

| Token | Usage |
|---|---|
| `--af-canvas-bg`, `--af-canvas-dot` | Fond et grille |
| `--af-node-bg`, `--af-node-border`, `--af-node-fg`, `--af-node-muted` | Cartes |
| `--af-focus`, `--af-selection` | Focus clavier, sélection |
| `--af-edge-seq` | Séquence (neutre) |
| `--af-success`, `--af-failure`, `--af-retry` | Arêtes et marqueurs sémantiques |
| `--af-async` | Étapes AsyncAPI (send/receive) |
| `--af-workflow` | Sous-workflow, appel, transfert |
| `--af-input`, `--af-output` | Nœuds d'entrée et de sortie |
| `--af-depends` | `dependsOn` et jonctions |
| `--af-method-get/post/put/patch/delete/other` | Badges de méthode HTTP |
| `--af-lane-1…6` | Teintes de fond des couloirs (alpha 6-10 %) |

### 4.3 Anatomie des nœuds

Grille commune : largeur fixe **240 px** en TB et **220 px** en LR, coins 8 px, bordure 1 px (2 px en HC), **bande d'accent de 3 px** à gauche, de la couleur du type. Les hauteurs sont **déterministes par densité** (ce qui permet de calculer le layout sans mesurer le DOM) : `compact` 44 px, `standard` 72 px (en-tête 28 + corps 2 lignes), `détaillé` 72 + 18 px par ligne de chip, plafonné à 5 lignes. Le texte est tronqué avec une ellipse, et le texte complet est dans le tooltip et l'`aria-label`. Les icônes sont des SVG inline (une dizaine, style Lucide), sans dépendance à `lucide-react` dans le paquet partagé.

| Type | Forme / signe distinctif | Visible par défaut (`standard`) | Au survol (tooltip) | `aria-label` (modèle) |
|---|---|---|---|---|
| **Input** (entrées du workflow) | Carte, accent `--af-input`, icône « entrée » (flèche vers un carré). Toujours en tête. | Titre « Entrées ». Jusqu'à 4 noms de propriétés en `code`, suffixe `*` pour `required`, et « +N » au-delà. | Liste complète : nom, `type`, `required`, `default` sérialisé en JSON (corrige D-18), `description`. | « Entrées du workflow : 3 propriétés, dont 2 requises » |
| **Étape HTTP** (`operationId` / `operationPath`) | Carte, accent par méthode. **Badge méthode** à gauche de l'en-tête (texte `GET`/`POST`…, jamais la couleur seule). | En-tête : badge méthode + `stepId` (gras) + numéro d'ordre discret (`#3`). Ligne 1 : `summary` ou `description` tronquée, sinon `operationId`. Ligne 2 : chemin `/pets/{id}` si résolu. Pied : chips `✓ n critères`, `↻ ×3` si retry, `⇄ n outputs`. | `operationId` complet, `METHOD path`, source (`sourceDescription`), paramètres (`name` + `in`, y compris `querystring`), `successCriteria` complets (`context`/`condition`/`type`, version d'expression), outputs. | « Étape 3 sur 9, createOrder, POST /orders, source shop, 2 issues : succès vers payOrder, échec vers fin en échec » |
| **Étape AsyncAPI send** (`channelPath` + `action: send`) | Carte, accent `--af-async`, icône **enveloppe pleine** (convention BPMN « message lancé »). Badge `SEND`. | En-tête : badge `SEND` + `stepId`. Ligne 1 : summary. Ligne 2 : adresse du canal (`orders.created`). Pied : chip « payload » si `requestBody`. | `channelPath` complet, source AsyncAPI, message ou payload, critères. | « Étape 5, publishRefund, envoi de message sur le canal refund.issued » |
| **Étape AsyncAPI receive** (`action: receive`, `timeout`, `correlationId`) | Carte, accent `--af-async`, icône **enveloppe contour** (« message attendu »). Badge `RECEIVE`. **Marqueur de timeout** en bas à droite de la carte (petit cercle horloge, à la manière d'un événement de bordure BPMN). | En-tête : badge + `stepId`. Ligne 2 : canal. Pied : chip `⏱ 6 s` (le `timeout` en ms est formaté : `6000` → `6 s`, `1500` → `1,5 s`) et chip `⛓ correlationId` tronqué à 20 caractères (`$inputs.orderId`). | Valeurs exactes (`timeout: 6000 ms`, `correlationId` complet), critères, comportement à l'expiration (onFailure applicable, à confirmer R1). | « Étape 2, awaitConfirmation, attente de message sur order.confirmed, délai 6 secondes, corrélation par $inputs.orderId » |
| **Étape sous-workflow** (`workflowId`) | Carte à **double bordure** (convention BPMN *call activity*), accent `--af-workflow`, icône « workflow imbriqué ». Chevron ▸ pour déplier. | En-tête : badge `WORKFLOW` + `stepId`. Ligne 1 : `→ workflowId` cible. Pied : chip « n paramètres ». Badge « externe » si la cible est `$sourceDescriptions.x.<id>`. | Résumé de la cible, mapping des `parameters`, outputs remontés. | « Étape 4, renew, appelle le workflow renewSession, repliée, 3 étapes » |
| **Jonction `dependsOn`** | **Losange** de 24 px avec « + » (convention BPMN *parallel gateway*), contour `--af-depends`, fond canvas. N'est créée que si l'étape a **2 dépendances ou plus** ; avec une seule dépendance, l'arête va directement à l'étape. | Aucun texte. | « Attend : invoice, shipment ». | « Jonction : l'étape ship attend invoice et shipment » |
| **Output** (sorties du workflow) | Carte, accent `--af-output`, icône « sortie ». Sert aussi de terminal de succès quand des `outputs` existent. | Titre « Sorties ». Jusqu'à 4 clés et « +N ». | Pour chaque clé, l'expression complète (`$steps.pay.outputs.receiptId`) ou le Selector (`context`, `selector`, `type`). | « Sorties du workflow : orderId, receiptId » |
| **End** (terminaux) | **Cercle** de 28 px à bordure épaisse (BPMN *end event*). **Fin (succès)** : coche, `--af-success`, utilisée seulement si le workflow n'a pas d'`outputs`. **Fin en échec** : croix, `--af-failure`, un seul nœud par workflow, partagé par tous les `end` d'échec. | Libellé sous le cercle : « Fin » / « Échec ». | Liste des étapes qui y mènent. | « Fin du workflow en échec, atteinte depuis 3 étapes » |
| *Complément* : **Référence de workflow** (cible d'un `goto workflowId` ou d'une étape externe non dépliée) | Pilule pointillée, accent `--af-workflow`, icône lien externe. | `workflowId` + nom de la source si externe. | Résumé et nombre d'étapes s'il est résolu. Clic : ouvrir ce workflow. | « Transfert vers le workflow refund » |

**Badge de méthode HTTP** : la source de vérité, par ordre de priorité, est :
1. `operationPath` : le dernier segment du JSON Pointer (`…/paths/~1pets~1{id}/get`) donne la méthode **exacte**, sans résolution réseau ;
2. l'OpenAPI résolu (`operationId` → `method` + `path`), côté extension host pour vscode (fichiers locaux) ou dans le worker pour le web ;
3. sinon, un badge neutre `OP`, sans deviner.

L'heuristique sur le nom (V-3, D-23) est **supprimée** ou, au mieux, proposée en option désactivée par défaut avec un style « déduit » (badge contour pointillé, tooltip « méthode déduite du nom »).

**États visuels communs** :
- *hover* : bordure `--af-focus` à 50 % ;
- *focus clavier* : anneau 2 px `--af-focus` décalé de 2 px (WCAG 2.4.7, 2.4.11) ;
- *sélection* : fond `--af-selection` et bordure 2 px ;
- *diagnostic* : pastille ⚠ ou ⛔ en haut à droite, avec le nombre d'erreurs ou d'avertissements de core et leur code au survol (intégration C1, qui remplace `hasInvalidLinks` de la démo) ;
- *estompé* (mode focus et recherche) : opacité 0,35.

**États d'exécution (réservés, hors périmètre moteur)** : le modèle de graphe prévoit un champ optionnel `status ∈ {idle, running, success, failure, retrying(n), skipped}` pour superposer plus tard une trace de runner (Respect, Specmatic, lot R4) :
- bande d'accent remplacée par la couleur d'état + icône (✓ ✗ ↻ ⟳ ⊘) ;
- badge « tentative n/N » (pattern Temporal) ;
- sur `running`, bordure en pointillés tournante désactivée sous `reduced-motion` (pattern `NodeStatusIndicator`).

### 4.4 Sémantique et style des arêtes

Rappels de sémantique (à confirmer en détail par R1, `01-spec-delta-1.1.md`) :
- **Séquence implicite** : en l'absence d'action de succès applicable, on passe à l'étape suivante. Après la dernière étape, le workflow se termine et produit ses `outputs`. L'arête séquentielle **n'est supprimée que si une action de succès sans `criteria` (inconditionnelle) existe** (corrige V-5 et D-25).
- **Retry** : `type: retry` + `retryAfter` (secondes, décimal) + `retryLimit` (entier). Un `stepId`/`workflowId` éventuel sur un retry désigne ce qu'il faut exécuter **avant** de rejouer l'étape (cas `renewSession` de E1 n°4).
- **Actions réutilisables** : les `reference: $components.successActions|failureActions.x` sont **résolues** avant le dessin, et le libellé porte le nom du composant.
- **Actions de niveau workflow** (`successActions`/`failureActions`) : elles s'appliquent à toutes les étapes qui n'en définissent pas. On ne les dessine pas sur chaque étape (bruit) : on affiche un **bandeau « Règles par défaut du workflow »** et un indicateur `ⓦ` sur les étapes concernées, avec arêtes visibles au survol de l'étape. Arbitrage à valider en D1.

| Arête | Trait | Couleur | Marqueur | Libellé (par défaut / survol) | Port source → cible |
|---|---|---|---|---|---|
| **Séquence** | plein 1,5 px | `--af-edge-seq` | flèche pleine | aucun / « Puis » | `out-next` → `in` |
| **Success goto** (`stepId`) | plein 2 px | `--af-success` | flèche pleine | `✓ name` si `name` existe, plus une chip `criteria` tronquée à 24 caractères / critères complets | `out-success` → `in` |
| **Failure goto** (`stepId`) | **tirets 6-4**, 2 px | `--af-failure` | flèche pleine | `✗ name` + chip critères / critères complets | `out-failure` → `in` |
| **Retry** | **pointillé-tiret 2-3-6-3**, 2 px, **boucle sur soi** | `--af-retry` | flèche ouverte | **`↻ ×3 · 2 s`** (`retryLimit` · `retryAfter`). Valeurs par défaut affichées en italique (`×1`), règle de défaut à confirmer R1 / nom, critères | `out-failure` → `in` (même nœud). Avec `stepId`/`workflowId` : arête tirets vers la cible, libellée `↻ via renewSession`, **plus** la boucle |
| **End** (succès) | plein 1,5 px | `--af-success` | flèche pleine | `✓ fin` si conditionnel, sinon aucun | `out-success` → Output (ou Fin) |
| **End** (échec) | tirets 6-4, 1,5 px | `--af-failure` | flèche pleine | `✗ fin` + critères | `out-failure` → Fin en échec |
| **Échec implicite** (aucun `onFailure`) | non dessinée par défaut ; option « Montrer les échecs implicites » : pointillé 1-3, 1 px | `--af-failure` à 50 % | aucun | « échec non géré » | `out-failure` → Fin en échec |
| **dependsOn** | **pointillé 1-4, extrémités rondes**, 1,5 px | `--af-depends` | petit cercle à la cible | aucun / « dépend de : x » | `out-next` de la dépendance → jonction (ou `in-deps` de l'étape) |
| **Appel de workflow** (étape `workflowId`) | **double trait** (2 chemins de 1 px espacés de 2 px) | `--af-workflow` | losange ouvert à la source, flèche à la cible | `⇢ workflowId` | `out-call` → entrée du groupe déplié, ou nœud Référence |
| **Transfert** (`goto workflowId`) | tirets longs 10-4, 2 px | `--af-workflow` (`--af-failure` si `onFailure`) | flèche pleine | `↗ workflowId` (+ `✓`/`✗` selon l'origine) | `out-success`/`out-failure` → nœud Référence |

**Règles de libellés** :
- les libellés sont des **chips HTML** (`EdgeLabelRenderer`) au fond `--af-canvas-bg` et bordure de la couleur de l'arête, police 11 px, positionnés au point milieu du tracé ELK ;
- au-delà de 2 arêtes de même sémantique entre la même paire, elles sont fusionnées en une seule, libellée `×n`, avec la liste au survol ;
- chaque libellé est aussi le nom accessible de l'arête (`aria-label` : « Échec, si statusCode égal 401, vers renewSession ») ;
- les expressions runtime sont affichées **verbatim** (`$`, `:` conservés, corrige V-13), en police monospace `--vscode-editor-font-family`.

**Ports (handles) par nœud d'étape**, avec `org.eclipse.elk.portConstraints = FIXED_SIDE` :

| Port | TB | LR |
|---|---|---|
| `in` (+ `in-deps`) | haut | gauche |
| `out-next`, `out-success` | bas | droite |
| `out-failure` | droite | bas |
| `out-call` | gauche | haut |

Les échecs partent donc **latéralement** : le chemin heureux reste une colonne droite, et les chemins d'échec se lisent comme des déviations (pattern Step Functions et n8n).

### 4.5 Branches, boucles et parallélisme dans Arazzo

- **Branches** : un nœud d'étape avec plusieurs `onSuccess` conditionnels produit un éventail d'arêtes `✓` depuis `out-success`, plus l'arête de séquence quand elle reste applicable. Pas de nœud « décision » artificiel : l'étape **est** le point de décision, puisque les critères sont sur les actions.
- **Boucles** : une boucle Arazzo est soit un `goto` vers une étape antérieure, soit un `retry`.
  - Le `goto` arrière est routé par ELK comme une **arête de feedback**, contournant la colonne par la droite et libellée `↺`. ELK `cycleBreaking = MODEL_ORDER` garantit que l'arête inversée est bien celle qui « remonte » dans l'ordre déclaré des `steps`.
  - Le `retry` est une boucle sur soi.
- **Parallélisme** : il n'existe que via `dependsOn` (1.1). Des étapes sans dépendance mutuelle qui convergent vers une jonction sont placées **dans la même couche** par ELK, ce qui donne la lecture « en parallèle » à la GitHub Actions. Une **bande discrète « parallèle possible »** est optionnelle en mode `détaillé`.

### 4.6 Groupes et sous-flux

- **Sous-workflow déplié** : groupe React Flow (`parentId`, `extent: 'parent'`) titré `workflowId`, fond `--af-workflow` à 6 %, bordure double. L'en-tête porte le chevron ▾, le nombre d'étapes et le lien « Ouvrir ce workflow ». Contenu en densité `compact`.
  - **Replié par défaut** si le workflow parent dépasse 30 nœuds.
  - Profondeur d'imbrication maximale de 2, au-delà nœud Référence. Garde anti-cycle (A → B → A) : un nœud Référence est marqué « récursif ».
  - Layout composé via `org.eclipse.elk.hierarchyHandling = INCLUDE_CHILDREN` (équivalent du « recursive compound layout » de Windmill).
- **Replié** : la carte de l'étape affiche « ▸ 5 étapes ». Le dépli déclenche un relayout incrémental, avec animation de 150 ms hors `reduced-motion`.
- **Fil d'Ariane** en haut à gauche quand on « entre » dans un sous-workflow (double-clic ou `Entrée` sur le groupe) : `checkout › renewSession`.
- **Vue d'ensemble multi-workflows** (option, en D1) : un nœud par workflow, avec arêtes d'appel, de transfert et de `dependsOn` de niveau workflow. Elle sert d'entrée pour les documents à nombreux workflows.

### 4.7 Couloirs (swimlanes) par `sourceDescription`

Trois modes : `lanes="off" | "clusters" | "lanes"`.

- **`clusters`** : un groupe ELK par source (enfants = étapes de cette source), `INCLUDE_CHILDREN`. Le résultat est fidèle aux sous-graphes Mermaid, mais les groupes peuvent s'entrelacer verticalement.
- **`lanes`** (recommandé pour les documents hybrides OpenAPI + AsyncAPI) : **post-traitement**, parce que `org.eclipse.elk.partitioning` ordonne les partitions **dans le sens du flux** (« lower partition IDs appear to the left » en direction RIGHT) et ne crée pas de couloirs transverses.
  1. ELK calcule les couches (coordonnée de flux).
  2. On réassigne la coordonnée transverse par couloir : l'ordre des couloirs suit l'ordre de `sourceDescriptions`, et l'ordre intra-couloir reprend celui d'ELK.
  3. Les arêtes sont routées par un second passage ELK avec positions fixées (`org.eclipse.elk.layered.crossingMinimization.semiInteractive = true` et `org.eclipse.elk.position` pour chaque nœud), ou, à défaut, par des arêtes orthogonales `smoothstep` (dégradé acceptable).
- **En-tête de couloir** collant (sticky) pendant le pan : nom de la source + icône du type (OpenAPI, AsyncAPI, Arazzo) + teinte `--af-lane-n` à 6-10 % d'alpha. Les nœuds Input, Output, End et les jonctions sont dans un couloir neutre « Workflow ».
- Les étapes sans source résolue (cas d'erreur) vont dans un couloir « Source inconnue », avec un diagnostic.
- **Pas d'information portée par la seule teinte** : le nom de la source est aussi en tooltip et dans l'`aria-label` du nœud.

### 4.8 Layout ELK recommandé

ELK s'exécute **dans un Web Worker** (`new ELK({ workerFactory })`), avec un bundle worker inline via Vite (`?worker&inline`), ce qui donne une URL `blob:` compatible avec la CSP VS Code (voir §4.12). Le layout est calculé sur des **tailles déterministes** (§4.3), sans attendre la mesure du DOM. Les **sections** retournées par ELK sont utilisées par une arête custom `ElkEdge` (polyligne orthogonale à coins arrondis de 6 px), avec repli `smoothstep` si les sections sont absentes (corrige D-5).

Options racine (clés complètes, valeurs sous forme de chaînes) :

```ts
export const ELK_ROOT_OPTIONS = {
  'org.eclipse.elk.algorithm': 'layered',
  'org.eclipse.elk.direction': 'DOWN',                        // 'RIGHT' en mode LR
  'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',                // lisible, sections exploitables
  'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',    // sous-workflows et clusters
  // Respect de l'ordre déclaré des steps
  'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'org.eclipse.elk.layered.cycleBreaking.strategy': 'MODEL_ORDER', // gotos arrière = arêtes inversées
  'org.eclipse.elk.layered.feedbackEdges': 'true',            // boucles contournantes
  'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED', // chemin heureux droit
  'org.eclipse.elk.layered.mergeEdges': 'false',              // ne pas fusionner succès et échec (corrige D-7)
  'org.eclipse.elk.layered.thoroughness': '10',               // 7 par défaut ; 4 au-delà de 150 nœuds
  // Espacements (px)
  'org.eclipse.elk.spacing.nodeNode': '32',
  'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'org.eclipse.elk.spacing.edgeLabel': '6',
  'org.eclipse.elk.spacing.componentComponent': '48',
  'org.eclipse.elk.separateConnectedComponents': 'true',      // workflows ou îlots disjoints
  'org.eclipse.elk.padding': '[top=24,left=24,bottom=24,right=24]',
  // Libellés d'arêtes : réserver l'espace (taille mesurée par estimation de texte)
  'org.eclipse.elk.edgeLabels.placement': 'CENTER',
  'org.eclipse.elk.edgeLabels.inline': 'true',
  // Boucles retry
  'org.eclipse.elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
  'org.eclipse.elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
} as const;

export const ELK_NODE_OPTIONS = {
  'org.eclipse.elk.portConstraints': 'FIXED_SIDE',            // ports de §4.4
};

export const ELK_GROUP_OPTIONS = {                            // sous-workflow ou cluster
  'org.eclipse.elk.padding': '[top=40,left=16,bottom=16,right=16]', // place pour l'en-tête
  'org.eclipse.elk.nodeSize.constraints': 'MINIMUM_SIZE',
};
```

Notes :
- Les valeurs par défaut ELK de référence sont : `cycleBreaking` GREEDY, `considerModelOrder` NONE, `edgeRouting` ORTHOGONAL, `mergeEdges` false, `thoroughness` 7, `spacing.nodeNodeBetweenLayers` 20 (voir la référence ELK en Sources). On ne s'écarte des défauts que là où c'est justifié ci-dessus.
- Chaque port porte `org.eclipse.elk.port.side` (`NORTH`/`SOUTH`/`EAST`/`WEST`, calculé selon la direction) et un `id` stable : `${nodeId}:${port}`.
- **Déterminisme** : les enfants et les arêtes sont transmis à ELK dans l'ordre du document (ordre des `steps`, puis des actions). Aucun `Math.random`. Test de non-régression Vitest sur les coordonnées des fixtures (snapshot arrondi au pixel).
- **Cache** : clé = hash de la *structure* du graphe (ids, types, arêtes, densité, direction, couloirs), sans les descriptions. Une modification de texte qui ne change pas la structure réutilise les positions : pas de relayout à la frappe.
- **Debounce** de 250 ms sur les changements de document, et **annulation** des requêtes de layout obsolètes par un numéro de génération (corrige V-16 et D-8). L'ancien layout reste affiché pendant le calcul, avec un indicateur discret annoncé en `aria-live="polite"`.
- `fitView({ padding: 0.15, maxZoom: 1 })` après **chaque** layout dont la structure ou la direction a changé (corrige D-9), mais **pas** après un simple rafraîchissement textuel, pour ne pas perdre le viewport de l'utilisateur.
- Direction par défaut **TB**. **LR** est proposé automatiquement si le panneau est plus large que haut d'un facteur 1,6 et que le graphe a moins de 4 couches. Le choix de l'utilisateur est persisté (vscode : `setState` du webview).

### 4.9 Grands graphes (plus de 50 nœuds)

| Seuil (nœuds rendus) | Mesures |
|---|---|
| ≤ 50 | Densité `standard`, tout visible, `thoroughness` 10. |
| 51-150 | Densité `compact` par défaut. Sous-workflows repliés. Échecs implicites masqués. Minimap ouverte. `thoroughness` 7. Ombres supprimées. |
| 151-300 | En plus : `onlyRenderVisibleElements`. Libellés d'arêtes visibles seulement si zoom ≥ 0,6 (*contextual zoom*). `thoroughness` 4. Bouton « Masquer les arêtes d'échec » mis en avant. |
| > 300 | Message « graphe volumineux » avec choix : vue d'ensemble multi-workflows, vue liste ou graphe complet (au risque de lenteur). |

Outils de navigation pour les grands graphes :
- **Recherche** (`/`) par `stepId`, `operationId`, canal ou `summary` : les résultats sont surlignés, les autres nœuds estompés, et `Entrée`/`Maj+Entrée` passent au résultat suivant ou précédent avec auto-pan.
- **Mode focus** (`F` sur un nœud) : on montre le voisinage à 1 saut (2 avec `F` deux fois), on estompe le reste ; `Échap` pour sortir.
- **Surlignage du chemin au survol** (pattern GitHub) : prédécesseurs et successeurs directs.
- **Niveaux de détail** au zoom : au-dessous de 0,45, les nœuds deviennent des pastilles (badge + `stepId`) ; au-dessous de 0,25, des rectangles sans texte. La minimap reste la référence.
- **Vue liste synchronisée** (onglet « Liste » ou panneau latéral) : table des étapes (n°, `stepId`, type, cible, issues), sélection synchronisée avec le graphe (pattern Step Functions Table view). C'est aussi l'alternative accessible.

### 4.10 Interactions clavier

Le canevas est une région `role="application"` étiquetée (« Graphe du workflow checkout ») qui reçoit le focus par `Tab`. Les raccourcis à une lettre ne sont actifs **que lorsque le canevas a le focus**, et aucun raccourci n'utilise `Ctrl`/`Cmd` sauf la recherche, pour ne pas entrer en conflit avec les keybindings VS Code.

| Touche | Action |
|---|---|
| `Tab` / `Maj+Tab` | Nœud suivant ou précédent **dans l'ordre du document** (et non l'ordre DOM) |
| `↓` / `↑` | Successeur ou prédécesseur principal (séquence, puis succès) |
| `←` / `→` | Voisin dans la même couche (branches) |
| `Alt+↓` | Suivre l'arête d'échec |
| `Entrée` | **Révéler dans l'éditeur** (vscode : message `step-selected`) ; sur un groupe, entrer dedans |
| `Espace` | Sélectionner ou désélectionner (sans changer l'éditeur) |
| `Échap` | Sortir de la recherche, du focus ou du groupe, puis effacer la sélection |
| `+` / `=`, `-` | Zoom |
| `0` | Zoom 100 % |
| `1` ou `Maj+F` | Ajuster à la vue (fit) |
| `F` | Mode focus sur le nœud courant |
| `/` (et `Ctrl/Cmd+F` dans le web) | Recherche |
| `[` / `]` | Replier ou déplier le sous-workflow courant ; `Maj+[` / `Maj+]` pour tous |
| `E` | Afficher ou masquer les arêtes d'échec |
| `L` | Cycle des couloirs : off, clusters, lanes |
| `D` | Bascule TB/LR |
| `M` | Afficher ou masquer la minimap |
| `?` | Aide des raccourcis (dialogue modal accessible) |

Les annonces `aria-live="polite"` sont **en français et en anglais** via `ariaLabelConfig` et un dictionnaire `messages` : « createOrder sélectionné. POST /orders. 2 issues. ». Le déplacement de nœud au clavier est désactivé (`nodesDraggable=false`) : en lecture seule, les flèches servent à **naviguer**, pas à déplacer.

### 4.11 Intégration aux thèmes VS Code

**Détection** : on lit `document.body.dataset.vscodeThemeKind`, attribut posé par l'hôte webview (`vscode-light` | `vscode-dark` | `vscode-high-contrast` | `vscode-high-contrast-light`, présence à vérifier dans la version minimale ciblée), avec repli sur les classes `body.vscode-*` documentées. Un `MutationObserver` existe déjà dans `App.tsx:74-75`, mais il ne filtre que `class` : ajouter `data-vscode-theme-kind` à `attributeFilter`. On en dérive `theme ∈ {light, dark, hc-dark, hc-light}`, et non un booléen (corrige V-22). React Flow reçoit `colorMode` = `light` ou `dark`, mais **toutes** les variables `--xy-*` sont surchargées par les tokens `--af-*`.

**Mapping des tokens vers les variables VS Code** (avec repli) :

```css
.af-root[data-host="vscode"] {
  --af-canvas-bg:     var(--vscode-editor-background);
  --af-canvas-dot:    var(--vscode-editorIndentGuide-background1, var(--vscode-panel-border));
  --af-node-bg:       var(--vscode-editorWidget-background);
  --af-node-border:   var(--vscode-editorWidget-border, var(--vscode-panel-border));
  --af-node-fg:       var(--vscode-editor-foreground);
  --af-node-muted:    var(--vscode-descriptionForeground);
  --af-focus:         var(--vscode-focusBorder);
  --af-selection:     var(--vscode-list-activeSelectionBackground);
  --af-selection-fg:  var(--vscode-list-activeSelectionForeground);
  --af-edge-seq:      var(--vscode-editorLineNumber-foreground);
  --af-success:       var(--vscode-testing-iconPassed, var(--vscode-charts-green));
  --af-failure:       var(--vscode-testing-iconFailed, var(--vscode-errorForeground));
  --af-retry:         var(--vscode-editorWarning-foreground, var(--vscode-charts-orange));
  --af-async:         var(--vscode-charts-purple);
  --af-workflow:      var(--vscode-textLink-foreground);
  --af-input:         var(--vscode-charts-blue);
  --af-output:        var(--vscode-charts-yellow);
  --af-depends:       var(--vscode-descriptionForeground);
  --af-method-get:    var(--vscode-charts-blue);
  --af-method-post:   var(--vscode-charts-green);
  --af-method-put:    var(--vscode-charts-orange);
  --af-method-patch:  var(--vscode-charts-yellow);
  --af-method-delete: var(--vscode-charts-red);
  --af-badge-bg:      var(--vscode-badge-background);
  --af-badge-fg:      var(--vscode-badge-foreground);
  --af-tooltip-bg:    var(--vscode-editorHoverWidget-background);
  --af-tooltip-fg:    var(--vscode-editorHoverWidget-foreground);
  --af-tooltip-border:var(--vscode-editorHoverWidget-border);
  --af-toolbar-hover: var(--vscode-toolbar-hoverBackground);
  --af-minimap-mask:  var(--vscode-minimapSlider-background);
  --af-font:          var(--vscode-font-family);
  --af-font-mono:     var(--vscode-editor-font-family);
  --af-font-size:     var(--vscode-font-size, 13px);
}
```

**Light et dark** : les teintes de fond des nœuds (accent à 8 %) sont obtenues par `color-mix(in srgb, var(--af-input) 8%, var(--af-node-bg))`, que Chromium et Electron supportent. On évite ainsi deux palettes codées en dur. Contrôles de contraste en D1 sur les thèmes *Light+ / Dark+ / Default Light Modern / Default Dark Modern*.

**High contrast** (`hc-dark` et `hc-light`) :
- toutes les bordures passent à 2 px `var(--vscode-contrastBorder)` ; le focus et la sélection utilisent `var(--vscode-contrastActiveBorder)` en 2 px plein ;
- **aucun fond teinté** : les nœuds ont le fond `--vscode-editor-background`, l'accent reste uniquement sur la bande de gauche et les badges ;
- pas d'ombres, pas de transparences < 100 % (l'estompage devient un trait en pointillé plus une opacité de 0,6 au minimum) ;
- les motifs de trait (§4.4) sont **obligatoires** et épaissis (+0,5 px) ; les libellés d'arêtes ont une bordure `contrastBorder` ;
- les badges de méthode passent en texte sur fond `--vscode-editor-background` avec bordure de la couleur de méthode.

Les variantes daltoniennes ne demandent pas de palette dédiée : le double codage les couvre. On vérifie toutefois en D1 la séparation succès/échec en simulation deutéranopie avec les couleurs de `testing.icon*` par défaut, qui sont vert et rouge.

**Web (demo, website)** : même jeu `--af-*` alimenté par `brand/tokens.css` (B1), avec `[data-theme="dark"]` et `@media (forced-colors: active)`, qui reprend les règles HC ci-dessus avec les couleurs système `CanvasText`, `Highlight` et `LinkText`.

### 4.12 Performances

**Budgets** (vérifiés en G1 : Vitest pour le layout, Playwright avec trace pour le rendu) :

| Mesure | Budget |
|---|---|
| Layout worker, 50 nœuds | < 80 ms |
| Layout worker, 100 nœuds | < 200 ms |
| Premier rendu interactif du panneau (50 nœuds) | < 400 ms après réception de `update-flowchart` |
| Pan/zoom, 100 nœuds | 60 fps (critère G1) |
| Taille du bundle | ≤ 120 kB gzip hors ELK pour `@xyflow/react` + composants ; ELK (environ 1,5 Mo minifié, en worker, chargé à la première ouverture du graphe) |

Pour mémoire, Mermaid seul pèse aujourd'hui 3,8 Mo d'assets dans le webview (V-25).

**Règles d'implémentation** (guide de performance React Flow) :
- `nodeTypes`/`edgeTypes` définis au niveau module ; nœuds en `memo` ;
- sélection et recherche stockées **hors** du tableau `nodes` (store dédié) ;
- aucun composant ne lit `nodes` en entier ;
- pas d'`animated`, pas de `box-shadow` au-delà de 50 nœuds, pas de `filter`/`backdrop-filter` sur les nœuds ;
- `onlyRenderVisibleElements` au-delà de 150 nœuds ;
- les tooltips sont **un seul** portail partagé, et non un composant par nœud ;
- Mermaid n'est **chargé qu'à la demande** (import dynamique) pour l'export Mermaid ; le texte Mermaid est généré par core sans la bibliothèque, et la lib ne sert qu'à l'aperçu éventuel.

**VS Code** :
- CSP `worker-src blob:;`, ajoutée à `webview-html.ts:38` (V-24). Le worker est inline, donc pas de `fetch` ni de `connect-src` supplémentaires. La doc VS Code précise que les workers ne peuvent être chargés que depuis `data:` ou `blob:`, et que `importScripts`/`import()` n'y fonctionnent pas : bundle mono-fichier.
- Le parse et `workflowToGraph` restent côté extension host (`ParseCache`) ou côté webview selon C1/V2. Recommandation : le **modèle de graphe** est calculé côté webview à partir du `spec` déjà transmis, pour garder un protocole de messages inchangé.
- `retainContextWhenHidden` reste désactivé : on persiste le viewport et les options via `vscode.setState`.

### 4.13 Exports

| Format | Méthode | Notes |
|---|---|---|
| **SVG** | `html-to-image` `toSvg` sur `.react-flow__viewport`, cadré par `getNodesBounds` + `getViewportForBounds` (exemple officiel *Download Image*) | Légende incluse en option. Thème **clair** par défaut pour la documentation, ou thème courant au choix. Polices système embarquées par nom. |
| **PNG** | `toPng`, `pixelRatio` 2 | Même cadrage. Fond opaque. |
| **Mermaid** | `toMermaid(graph)` de core (texte, sans dépendance) | Copie dans le presse-papiers. Identifiants échappés sans collision (corrige V-12), expressions préservées entre guillemets (corrige V-13). |
| **JSON du modèle** | `workflowToGraph` sérialisé | Pour les outils tiers et les tests. |

Dans VS Code, le webview ne peut pas déclencher de téléchargement. Il envoie `{ type: 'export', format, data }` à l'extension host, qui ouvre `showSaveDialog` puis écrit avec `workspace.fs.writeFile`. Le Mermaid passe par `vscode.env.clipboard`. C'est un nouveau message à ajouter au protocole (à documenter en V2). Commandes palette : « Arazzo: Exporter le graphe (SVG/PNG/Mermaid) ».

### 4.14 Accessibilité (cible WCAG 2.2 AA)

- **1.1.1** : `aria-label` composé par nœud et par arête (§4.3, §4.4). La région du canevas a une description (« 9 étapes, 2 sous-workflows, 3 chemins d'échec »).
- **1.3.1 / 1.3.2** : vue liste synchronisée, dont l'ordre de lecture est celui du document.
- **1.4.1** : double codage (motifs, glyphes, libellés) ; aucune information portée par la seule couleur, couloirs compris.
- **1.4.3 / 1.4.11** : texte ≥ 4,5:1 ; traits, bordures et focus ≥ 3:1 sur `--af-canvas-bg`, vérifiés sur les 4 thèmes VS Code de référence et les 2 thèmes ConnEthics.
- **2.1.1 / 2.1.2** : tout au clavier (§4.10), sans piège. `Échap` remonte toujours d'un niveau.
- **2.3.3 / 2.2.2** : aucune animation permanente ; `prefers-reduced-motion` coupe les transitions.
- **2.4.7 / 2.4.11** : focus visible et non masqué (auto-pan au focus via `autoPanOnNodeFocus`).
- **2.5.8** : cibles ≥ 24×24 px pour les boutons de la barre d'outils, de la minimap et des chevrons.
- **4.1.2 / 4.1.3** : rôles (`application` pour le canevas, `group` + `aria-roledescription="étape"` pour les nœuds, `aria-pressed` sur les bascules) et annonces `aria-live="polite"`.
- Localisation FR/EN de **tous** les libellés internes de React Flow via `ariaLabelConfig`.

### 4.15 API proposée pour `<ArazzoGraph>` (complète le plan G1)

```ts
<ArazzoGraph
  graph={graph}                       // sortie de workflowToGraph (core)
  theme="vscode" | "connethics-light" | "connethics-dark" | "auto"
  layout="TB" | "LR"
  lanes="off" | "clusters" | "lanes"
  density="auto" | "compact" | "standard" | "detailed"
  selectedStepId={id}
  onSelectStep={(stepId, workflowId) => …}
  onRevealStep={(stepId, workflowId) => …}   // Entrée / double-clic → éditeur
  onOpenWorkflow={(workflowId) => …}
  showFailureEdges showImplicitFailures showMinimap showLegend
  collapsed={{ [stepId]: boolean }}
  diagnostics={coreDiagnostics}       // pastilles ⚠ ⛔
  status={runTrace}                   // réservé (états d'exécution)
  messages={fr | en}                  // i18n + ariaLabelConfig
  ref={api}                           // fitView(), focusStep(id), search(q), exportImage(fmt)
/>
```

---

## 5. Livrables attendus de D1 (découlant de ce benchmark)

1. Une page de maquettes statique comprenant :
   - les 9 types de nœuds du §4.3, en 3 densités et 4 thèmes ;
   - les 10 types d'arêtes du §4.4 avec leurs libellés ;
   - une légende.
2. Trois graphes témoins issus de E1 :
   - `e2e-order-to-cash` : receive avec timeout et `correlationId`, `dependsOn` à 2 dépendances, Selector ;
   - `e2e-session-renewal` : retry `via renewSession`, `goto` arrière ;
   - `mcp-support-refund` : hybride OpenAPI + AsyncAPI, en mode `lanes`.
3. Un graphe synthétique de 120 nœuds pour valider §4.9 et le budget de 60 fps.
4. La validation utilisateur des arbitrages ouverts (§6).

## 6. Questions ouvertes (à trancher en D1 ou à confirmer par R1/B1)

1. Représentation des actions de niveau workflow : bandeau et indicateur, ou arêtes dessinées sur chaque étape (§4.4) ?
2. Sémantique exacte de `dependsOn` d'étape en 1.1 (inter-workflow, inter-document) et comportement du `timeout` d'un receive (passage en `onFailure` ?). À confirmer par R1.
3. Valeurs par défaut de `retryLimit`/`retryAfter` en l'absence de valeur : affichage en italique « défaut ». À confirmer par R1.
4. Attribution React Flow (D-14) : garder le lien ou souscrire Pro (B1/licence).
5. Palette : succès et `input` sont tous deux « verts » dans l'existant. La proposition (input = bleu, output = jaune, succès = vert) est à valider avec les tokens B1.
6. Couloirs `lanes` : un second passage ELK semi-interactif est-il assez stable, ou faut-il un routeur orthogonal maison ? Prototype en G1.

---

## Sources

Documentation et changelogs consultés le 16/11/2026.

**n8n**
- Connections : https://docs.n8n.io/workflows/components/connections/
- Nodes (contrôles, réglages Retry On Fail / On Error) : https://docs.n8n.io/workflows/components/nodes/
- Raccourcis clavier : https://docs.n8n.io/keyboard-shortcuts/
- Nouveau canvas (beta 1.70, minimap, flèches, performance) : https://community.n8n.io/t/help-us-test-the-new-n8n-canvas-beta/60070
- Améliorations du canvas, focus panel et logs : https://community.n8n.io/t/help-us-test-some-canvas-improvements/201703
- Sortie d'erreur (forum) : https://community.n8n.io/t/how-can-i-make-the-node-to-go-to-error-output-only-when-all-retries-are-failed/104637
- Notes de version : https://docs.n8n.io/release-notes

**Temporal**
- Web UI : https://docs.temporal.io/web-ui
- « Let's visualize a workflow » (Timeline) : https://temporal.io/blog/lets-visualize-a-workflow
- « Improving the Workflow experience » (Compact, Event Groups) : https://temporal.io/blog/the-dark-magic-of-workflow-exploration
- Changelog UI : https://temporal.io/changelog/product-area/ui et https://temporal.io/changelog/updated-event-history-timeline-view-is-now-available

**AWS Step Functions**
- Workflow Studio : https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio.html
- Error handling dans Workflow Studio : https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio-process-error.html
- Détails d'exécution (Graph view, légende, export SVG/PNG, Table view, timeline des retries) : https://docs.aws.amazon.com/step-functions/latest/dg/concepts-view-execution-details.html

**Postman Flows**
- Blocks information : https://learning.postman.com/docs/postman-flows/gs/blocks-information/
- Logic blocks : https://learning.postman.com/flows/reference/blocks/overview-logic-blocks
- Looping blocks : https://learning.postman.com/flows/reference/blocks/overview-looping-blocks
- Loops : https://learning.postman.com/docs/postman-flows/build-flows/loops

**Jentic**
- Annonce Arazzo UI : https://jentic.com/blog/announcing-arazzo-ui
- Annonce Arazzo Editor : https://jentic.com/blog/arazzo-editor
- Produits : https://jentic.com/product/arazzo-ui et https://jentic.com/product/arazzo-editor
- Dépôt : https://github.com/jentic/jentic-arazzo-tools
- README du paquet UI : https://raw.githubusercontent.com/jentic/jentic-arazzo-tools/main/packages/jentic-arazzo-ui/README.md
- `package.json` du paquet UI : https://raw.githubusercontent.com/jentic/jentic-arazzo-tools/main/packages/jentic-arazzo-ui/package.json

**LangGraph / LangSmith Studio**
- Studio : https://docs.langchain.com/langsmith/studio
- Visualisation du graphe : https://docs.langchain.com/oss/javascript/langgraph/graph-api-visualize.md
- Limite `Command` (forum) : https://forum.langchain.com/t/visualizing-graph-when-using-command-object-without-edges/760
- Sous-graphes (forum) : https://forum.langchain.com/t/display-subggraph-agent-in-the-ux-ui/837.md
- Interrupts : https://docs.langchain.com/oss/python/langgraph/interrupts

**Windmill**
- Flow editor : https://www.windmill.dev/docs/flows/flow_editor
- Branches : https://www.windmill.dev/docs/flows/flow_branches
- Changelog flow groups : https://www.windmill.dev/changelog/flow-groups
- Changelog flow status viewer : https://www.windmill.dev/changelog/flow-status-viewer
- Release v1.654.0 (recursive compound layout) : https://newreleases.io/project/github/windmill-labs/windmill/release/v1.654.0

**Kestra**
- UI Flows : https://kestra.io/docs/ui/flows
- UI Executions : https://kestra.io/docs/ui/executions
- Logs, Gantt et topologie : https://kestra.io/docs/ui/logs
- Release 0.21 (triggers dans la topologie) : https://newreleases.io/project/github/kestra-io/kestra/release/v0.21.0-rc0-SNAPSHOT

**GitHub Actions**
- Visualization graph : https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph
- Changelog 2020 : https://github.blog/changelog/2020-12-08-github-actions-workflow-visualization/
- Visualiseur tiers (matrices, reusable) : https://blog-9e0.pages.dev/blog/github-actions-visualizer

**Prefect**
- Dépendances amont et run graph : https://docs.prefect.io/guides/specifying-upstream-dependencies
- API `graph-v2` : https://docs.prefect.io/v3/api-ref/rest-api/server/flow-runs/read-flow-run-graph-v2.md
- `@prefecthq/graphs` (PixiJS) : https://npmjs.org/package/@prefecthq/graphs

**React Flow / xyflow**
- Exemples : https://reactflow.dev/examples
- ELK : https://reactflow.dev/examples/layout/elkjs
- ELK multiple handles : https://reactflow.dev/examples/layout/elkjs-multiple-handles
- Accessibilité : https://reactflow.dev/learn/advanced-use/accessibility
- Performance : https://reactflow.dev/learn/advanced-use/performance
- Theming : https://reactflow.dev/learn/customization/theming
- Template Workflow Editor : https://reactflow.dev/ui/templates/workflow-editor
- NodeStatusIndicator : https://reactflow.dev/ui/components/node-status-indicator

**Eclipse ELK**
- Algorithme layered (options et défauts) : https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html
- Partitioning : https://eclipse.dev/elk/reference/options/org-eclipse-elk-partitioning-partition.html
- Cycle breaking : https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-cycleBreaking-strategy.html

**VS Code**
- Webviews (theming, CSP, workers) : https://code.visualstudio.com/api/extension-guides/webview
- Référence des couleurs de thème : https://code.visualstudio.com/api/references/theme-color

**Mermaid**
- Syntaxe flowchart (mot réservé `end`) : https://mermaid.js.org/syntax/flowchart.html

**Accessibilité**
- WCAG 2.2 : https://www.w3.org/TR/WCAG22/

**Code local analysé**
- `arazzo-vscode/webview-ui/src/lib/mermaid-converter.ts`, `components/MermaidDiagram.tsx`, `components/FlowchartView.tsx`, `App.tsx`, `hooks/useThemeClasses.ts`, `src/panels/webview-html.ts`, `src/panels/flowchart-panel.ts`, `webview-ui/build/assets/`
- `arazzo-demo/app/src/components/ArazzoFlow.tsx`, `components/nodes/*.tsx`, `lib/arazzo-parser.ts`, `lib/arazzo-utils.ts`, `components/arazzo/StepHeader.tsx`, `app/showcase/page.tsx`

---

## Résumé (≤ 200 mots)

Onze outils étudiés (n8n, Temporal, Step Functions, Postman Flows, Jentic, LangGraph Studio, Windmill, Kestra, GitHub Actions, Prefect, React Flow) convergent : nœuds en carte, arêtes doublement codées (couleur plus motif ou libellé), sous-flux repliables, vue textuelle synchronisée, minimap, fit et export SVG/PNG. Jentic, concurrent direct, reste en Arazzo 1.0.1 sur React Flow 11.

L'existant cumule 52 défauts référencés. Le Mermaid de vscode est figé, résout les clics par correspondance de texte, ignore `retry`, `dependsOn`, gotos de workflow et actions réutilisables, et devine la méthode HTTP (`deleteTarget` devient GET). L'ArazzoFlow de la démo, limité à `/showcase`, calcule ELK sur le thread principal, jette son routage et code ses couleurs en dur.

Principes retenus : 9 types de nœuds à signes BPMN (enveloppes send/receive, double bordure, losange `dependsOn`, cercles de fin) ; 10 types d'arêtes à motifs distincts, dont le retry `↻ ×N · Ns` ; ELK layered en worker avec `MODEL_ORDER` et ports `FIXED_SIDE` ; couloirs en post-traitement ; paliers jusqu'à 300 nœuds ; clavier spatial ; tokens `--af-*` mappés sur `--vscode-*` avec mode HC ; budgets de performance ; cible WCAG 2.2 AA.
