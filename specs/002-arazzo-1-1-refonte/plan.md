# Refonte Arazzo 1.1.0 — plan directeur multi-repos (ConnEthics)

## Contexte

La spécification Arazzo est passée en **1.1.0** (publiée le 17/05/2026, schéma JSON `https://spec.openapis.org/arazzo/1.1/schema/2026-04-15`). Les trois repos ConnEthics sont encore en **1.0.1** :

- **arazzo-vscode** : `src/arazzo-detection.ts:5` (`KNOWN_ARAZZO_VERSIONS = ['1.0.0','1.0.1']`), `src/validation/version-check.ts:33`, `webview-ui/src/types/arazzo.ts:3`, fixtures et tests. Le flowchart est un Mermaid v10 statique (`webview-ui/src/lib/mermaid-converter.ts`), sans zoom ni pan. Il ignore les `retry`, les gotos vers des workflows, les actions au niveau du workflow et `dependsOn`. La validation est partielle, avec des doublons de diagnostics. `CLAUDE.md` est obsolète : `extension.ts` fait désormais 89 lignes et le code est découpé en modules.
- **arazzo-demo** (Next 16, React 19, Tailwind 4) : il contient déjà `@xyflow/react` 12 et `elkjs` (`components/ArazzoFlow.tsx`). L'auto-layout du builder est une grille naïve (`BuilderCanvas.tsx:700`). Il n'y a ni validateur ni contenu MCP. La licence est incohérente (LICENSE propriétaire, badge MIT, accroche « Open Source »).
- **website** (Next 15, Tailwind 4 + MUI) : il n'y a pas de landing Arazzo, seulement un article EN `insights/arazzo-api-workflows`, qui affiche la date de build comme date de publication. Le site n'a pas d'i18n ni de sitemap/JSON-LD. La marque ConnEthics est en bleu `#2563eb` et orange `#f97316`, alors que la démo est en indigo/violet.

**Nouveautés 1.1.0** :
- Sources `type: asyncapi`.
- Pas d'étape `channelPath`, avec `action: send|receive`, `correlationId` et `timeout` (ms).
- `dependsOn` au niveau de l'étape, comme point de jonction.
- Réutilisation de workflows via les actions (`workflowId` + `parameters`).
- **Selector Object** (`context`, `selector`, `type`), qui exige `arazzo: 1.1.0`.
- **Expression Type Object** versionné (jsonpath `rfc9535`, xpath `xpath-31`, jsonpointer `rfc6901`).
- `in: querystring` (alignement sur OAS 3.2).
- `$self` à la racine, avec des règles de résolution d'URI de base.
- Sémantique truthy/falsy des critères.
- Préfixes `x-oai-`, `x-oas-` et `x-arazzo` réservés.

Les documents 1.0.x restent valides. MCP, A2A, gRPC, boucles et fonctions sont sur la **roadmap** de la spec, pas dans la 1.1.

**Objectif** : une refonte coordonnée des 3 repos, en 4 volets :
- la conformité 1.1.0 ;
- une UI de graphe moderne et partagée ;
- des exemples concrets MCP et tests E2E exécutables ;
- un article et une landing FR+EN sur le site, avec un branding ConnEthics renforcé.

Ce plan est découpé en **lots autonomes** confiables à des sous-agents.

**Décisions utilisateur** :
1. Périmètre « exécutable » : exemples et documentation uniquement, avec des recettes pour les runners existants. On ne développe pas de moteur.
2. Site en **FR + EN**.
3. Les **3 repos sont alignés** : spec 1.1, composant de graphe commun, branding.

**Branche de travail** : `claude/arazzo-1-1-0-refonte-iv866m`, dans chacun des 3 repos.

---

## Architecture cible (décision clé : code partagé)

Deux paquets TypeScript purs, dont la source de vérité est dans **arazzo-demo** (`packages/`, npm workspaces) :

- **`@connethics/arazzo-core`** (sans dépendance UI) :
  - Types 1.1 : fusion et correction de `types/arazzo.ts`, aujourd'hui dupliqué à l'identique dans demo et vscode.
  - Parse YAML (`yaml` v2).
  - Validation en 2 couches :
    - (a) **JSON Schema officiel** 1.0 (`2025-10-15`) et 1.1 (`2026-04-15`), embarqués, validés avec ajv 2020-12 ;
    - (b) **règles sémantiques** (liste au lot C1).
  - Les diagnostics portent un code, un chemin JSON et une sévérité. Le mapping vers les positions YAML se fait côté consommateur.
  - **Modèle de graphe** `workflowToGraph(spec, workflowId) → {nodes, edges, groups}`, indépendant du moteur de rendu.
  - Export Mermaid conservé, basé sur ce modèle, pour la doc et le copier-coller.
- **`@connethics/arazzo-flow`** (React 18/19 + `@xyflow/react` 12 + `elkjs` dans un **Web Worker**) :
  - Composant `<ArazzoGraph>` en lecture seule, avec sélection et callbacks.
  - CSS propre basé sur des **variables CSS**, sans dépendance à Tailwind. Il est thémable avec les variables VS Code (`--vscode-*`) et les tokens ConnEthics.

**Distribution** : workspace interne dans demo. Pour vscode et website, un script `scripts/sync-shared.mjs` copie le `dist/` versionné dans `vendor/` avec un hash vérifié en CI. Publication npm sous le scope `@connethics` dès qu'un token npm est disponible : c'est aussi un levier de visibilité de marque. Le webview vscode passe en React 19 pour s'aligner (xyflow 12 supporte les deux).

---

## Livrables de recherche (dossier commun)

Dossier : `arazzo-vscode/specs/002-arazzo-1-1-refonte/`. Il suit la convention de l'ancien `specs/001-extension-quality-roadmap`, récupérable via `git show 37d17c7^:specs/...`.

| Fichier | Contenu |
|---|---|
| `research/01-spec-delta-1.1.md` | Diff normatif champ par champ entre 1.0.1 et 1.1.0. Sources : texte de la spec, diff des 2 JSON Schemas et historique Git de `OAI/Arazzo-Specification`. Couvre les formes exactes de `dependsOn` (inter-workflow, inter-document), les contraintes d'exclusivité `operationId`/`operationPath`/`workflowId`/`channelPath`, `action` uniquement pour AsyncAPI et `correlationId` uniquement pour `receive`. |
| `research/02-pains-positioning.md` | Les pains auxquels répond Arazzo : endpoints vs intentions métier, documentation de séquences d'intégration aujourd'hui tribale (wikis, collections Postman), tests E2E fragiles et non portables, coût en tokens et non-déterminisme des agents qui « devinent » l'enchaînement, gestion des échecs partiels et retries, onboarding partenaires. Inclut les sources : OAI, Redocly, Nordic APIs, Tyk, SmartBear, Jentic, Speakeasy. |
| `research/03-mcp-arazzo.md` | Pattern « 1 workflow Arazzo = 1 outil MCP » : `workflowId`→`name`, `summary`/`description`→`description`, `inputs` (JSON Schema)→`inputSchema`, `outputs`→`structuredContent`. Les retries et `onFailure` deviennent déterministes côté serveur. Couvre l'auth, l'état de l'écosystème (Bump.sh MCP + Arazzo, avril 2026 ; arazzo-cli MCP ; Jentic) et la nuance : MCP comme *type d'étape* est sur la roadmap, pas dans la 1.1. Couvre aussi les risques (gouvernance des outils exposés, lien avec l'offre AI Governance ConnEthics). |
| `research/04-e2e-runners.md` | Matrice des runners (Redocly Respect, Specmatic Arazzo, Jentic arazzo-runner, Speakeasy, arazzo-cli) : support 1.0 / 1.1 / AsyncAPI, CLI, CI et mocks (Prism, Specmatic stubs). **À vérifier au moment de l'exécution** : Respect ne semblait pas encore gérer AsyncAPI en mai 2026. |
| `research/05-graph-ui-benchmark.md` | Benchmark UI : n8n, Temporal UI, AWS Step Functions Workflow Studio, Postman Flows, Jentic Arazzo Editor, LangGraph Studio. Débouche sur les principes retenus pour le graphe (lot D1). |
| `plan.md` / `tasks.md` | Ce plan, détaillé en tâches cochables par lot. |

---

## Lots de travail (pour sous-agents)

Format de chaque lot : **repo · dépendances · sortie · critères d'acceptation**.

### Vague 0 — Recherche & cadrage (parallélisable, sans code)

- **R1 Delta spec 1.1**
  - Repo : vscode/specs.
  - Sortie : `01-spec-delta-1.1.md` et une **table des règles de validation 1.1**. Cette table est l'entrée de C1.
  - Acceptation : chaque nouveauté cite la section de la spec et le chemin dans le JSON Schema.
- **R2 Pains & positionnement**
  - Sortie : `02-pains-positioning.md` et 3 messages clés réutilisables par W1 et W2.
- **R3 MCP × Arazzo**
  - Sortie : `03-mcp-arazzo.md` avec le mapping détaillé et un schéma d'architecture (agent → serveur MCP → moteur Arazzo → APIs).
- **R4 Runners E2E**
  - Sortie : `04-e2e-runners.md` avec la matrice de support et les commandes exactes, testées si le réseau le permet.
- **R5 Benchmark UI graphe**
  - Sortie : `05-graph-ui-benchmark.md`.
- **B1 Audit & tokens de marque**
  - Repos : les 3.
  - Sortie : `brand/tokens.json` et `tokens.css`, qui reprennent la palette ConnEthics de `website/src/app/globals.css:76-102` et `src/design-system/tokens.ts`.
    - Bleu primaire `#2563eb`, accent orange `#f97316`, neutres slate.
    - Une déclinaison sémantique pour le graphe : succès, échec, retry, async, input, output.
  - Propositions :
    - Nom produit unifié, par exemple « Arazzo Studio by ConnEthics » pour le web et « Arazzo for VS Code » pour l'extension. Les noms actuels sont Playground, Builder et Visualizer.
    - Logo ou lockup produit.
    - Icône d'extension recompressée : `images/icon.png` fait aujourd'hui 2048 px et 4,3 Mo, à ramener à 256 px.
  - **Décisions à faire valider** par l'utilisateur : le nom, la palette et la licence de arazzo-demo.

### Vague 1 — Fondations

- **C1 `@connethics/arazzo-core`**
  - Repo : arazzo-demo `packages/arazzo-core`. Dépendance : R1.
  - Types 1.1 :
    - Ajouter `channelPath`, `action`, `correlationId`, `timeout`, `Step.dependsOn`, `SelectorObject`, `ExpressionType`, `querystring`, `$self`, `type: 'asyncapi'` et le typage des extensions `x-`.
    - Corriger les écarts : `SourceDescription.description`, `outputs` sur les actions, `outputs` typés `string | Selector`.
  - Validation : schéma officiel selon la valeur de `arazzo`, plus les règles sémantiques :
    - **Exclusivité des cibles d'étape** : exactement une parmi `operationId`, `operationPath`, `workflowId` et `channelPath`. Cela supprime les doublons actuels de `required-fields.ts` et `mutual-exclusivity.ts`.
    - **Règles AsyncAPI** :
      - `action` et `correlationId` réservés aux étapes AsyncAPI ;
      - `correlationId` uniquement en `receive` ;
      - `timeout` entier positif.
    - **Références** :
      - `dependsOn` (étapes et workflows) résolus, avec **détection de cycles** ;
      - cibles `goto` (`stepId`/`workflowId`) existantes ;
      - `retryLimit` et `retryAfter` valides ;
      - références `$steps.x`, `$components.*` et `$sourceDescriptions.*` résolues ;
      - unicité et regex des IDs ;
      - `in: querystring` exclusif de `query`, à confirmer par R1.
    - **Compatibilité de version** : une fonctionnalité 1.1 utilisée avec `arazzo: 1.0.x` produit un avertissement, et l'absence de `$self` pour une `arazzo: 1.1.0` produit une info.
  - `workflowToGraph` : nœuds input, étape (HTTP / async send / async receive / sous-workflow) et output. Arêtes typées : séquence, success-goto, failure-goto, retry (boucle avec compteur), end, dependsOn (jonction), appel de workflow. Groupes par `sourceDescription`.
  - Tests Vitest : un test par règle et le corpus d'exemples E1.
  - Acceptation : les fixtures actuelles de vscode donnent des diagnostics équivalents, sans doublon. Les exemples E1 passent la validation à 100 %.
- **D1 Design du nouveau graphe**
  - Dépendances : R5, B1.
  - Sortie : maquettes (une page HTML statique avec React Flow) et une spec UI. Principes :
    - Nœuds « carte » : badge de méthode HTTP **issu de l'OpenAPI résolu** quand il est disponible, plutôt que deviné depuis l'`operationId` (`lib/arazzo-utils.ts`). Icône send/receive pour AsyncAPI. Chips pour les critères, le timeout et le `correlationId`.
    - Arêtes sémantiques colorées (tokens B1) avec étiquettes. Le retry est une boucle annotée `×N / Ns`. `dependsOn` est en pointillé avec un nœud de jonction. Les sous-workflows sont des groupes repliables.
    - Option couloirs (swimlanes) par source : OpenAPI vs AsyncAPI, par partenaire.
    - Minimap, zoom/fit, focus clavier, recherche d'étape.
    - Export SVG/PNG et Mermaid.
    - Thèmes light, dark et high-contrast.
    - Dégradé gracieux pour les grands workflows (plus de 50 étapes).
  - Acceptation : maquettes validées par l'utilisateur avant G1.
- **E1 Exemples Arazzo 1.1 concrets**
  - Repo : arazzo-demo `app/public/workflows/`. Dépendances : R1, R3, R4.
  - Chaque exemple fournit des stubs de sources minimaux (OpenAPI 3.1 / AsyncAPI 3.0), un README avec le scénario, le graphe, et les commandes de mock et d'exécution.
  - **MCP** :
    1. `mcp-travel-booking.arazzo.yaml` : recherche → prix → disponibilité → réservation → paiement → confirmation. C'est l'outil MCP `book_trip`, accompagné du fichier de mapping `mcp-tools.json` dérivé des inputs et outputs.
    2. `mcp-support-refund.arazzo.yaml` : un agent support enchaîne commande → éligibilité → remboursement, puis publie l'événement `refund.issued` (AsyncAPI `send`). C'est un cas hybride, avec garde-fous via `successCriteria` et `onFailure: end`.
  - **E2E exécutables** :
    3. `e2e-order-to-cash.arazzo.yaml` : POST commande (HTTP) → `receive` `order.confirmed`, avec `correlationId` et `timeout: 6000` → paiement → `dependsOn` pour joindre facture et expédition → assertions via Selector JSONPath `rfc9535`.
    4. `e2e-session-renewal.arazzo.yaml` : cas négatif. Un 401 déclenche une `failure action` qui réutilise le workflow `renewSession`, puis l'étape est rejouée. Couvre `retryLimit` et `in: querystring`.
    5. `e2e-onboarding-entreprise-fr.arazzo.yaml` : touche ConnEthics. Onboarding B2B (recherche entreprise INPI/SIRENE → KYC → création du compte → webhook), en lien avec `website/INPI_INTEGRATION.md`. Doit utiliser des stubs, sans clé réelle.
  - Pour chaque exemple : recette d'exécution E2E en CI (GitHub Actions, mock Prism ou Specmatic, puis runner retenu en R4) documentée, pas développée.
  - Mise à jour de `pet-adoption.arazzo.yaml` et `ecommerce-onboarding.arazzo.yaml` en 1.1.
  - Acceptation : 0 erreur avec C1, et les commandes du README sont reproductibles.

### Vague 2 — Produits

- **G1 `@connethics/arazzo-flow`**
  - Repo : arazzo-demo `packages/arazzo-flow`. Dépendances : C1, D1.
  - Point de départ : `app/src/components/ArazzoFlow.tsx` (ELK layered) et les nœuds de `components/nodes/` et `UnifiedStepNode.tsx`. Ce code est réécrit en CSS variables, avec ELK déplacé dans un worker.
  - API : `<ArazzoGraph graph theme onSelectStep selectedStepId layout="TB|LR" lanes />`.
  - Tests Vitest sur le layout et le rendu, plus un storybook-like dans `/showcase`.
  - Acceptation : 60 fps au pan sur 100 nœuds. Bundle documenté. Aucun import de Tailwind.
- **V1 vscode — conformité 1.1**
  - Dépendance : C1 (vendored).
  - Fichiers concernés :
    - `src/arazzo-detection.ts` : ajout de `1.1.0`.
    - `src/validation/*` : délègue à core et mappe chemin JSON → range YAML via les nœuds `yaml`.
    - `src/providers/completion-provider.ts` : nouvelles clés et énumérations (`asyncapi`, `send`/`receive`, `querystring`, `jsonpointer`), `$message.`, `$self`, complétion des cibles `dependsOn`/`goto`.
    - `symbol-provider.ts` : utilise `ParseCache` au lieu de reparser.
    - Commande « Migrer vers 1.1.0 » : bump de version et `$self` suggéré, via un quick-fix code action.
  - Tests mocha : mise à jour des asserts de version (`detection.test.ts:40`, `validation.test.ts:705-760`) et nouvelles fixtures 1.1, reprises de E1.
  - Acceptation : `npm run lint` et `npm test` sont verts.
- **V2 vscode — nouveau graphe & doc**
  - Dépendance : G1.
  - Remplacer `MermaidDiagram` par `<ArazzoGraph>` dans `FlowchartView`, avec des thèmes mappés sur `--vscode-*`.
  - Conserver le message `step-selected` (`panels/flowchart-panel.ts:24-40`) et le CSP nonce (`webview-html.ts`). L'ELK worker doit être compatible CSP (`worker-src` blob, à vérifier).
  - Documentation view : rendu des étapes async, Selectors, `dependsOn`, `$self`. Correction de la vue séquence morte (`App.tsx:151`) : on l'active ou on la supprime.
  - Mermaid conservé uniquement pour l'export.
  - Acceptation : clic nœud → éditeur, curseur → sélection, light/dark/HC OK.
- **V3 vscode — packaging & marque**
  - Version **2.0.0**, `galleryBanner` aux couleurs ConnEthics, icône 256 px.
  - README refondu : GIF du nouveau graphe, section 1.1, liens vers la landing.
  - CHANGELOG.
  - Snippets d'exemples MCP et E2E (`contributes.snippets`).
  - Mise à jour de `CLAUDE.md` (architecture réelle).
  - `vsce package` OK.
- **A1 arazzo-demo — migration**
  - Dépendances : C1, G1, E1.
  - Remplacer `lib/arazzo-parser.ts` par core, en exposant les diagnostics dans le builder. Remplacer `ArazzoFlow` par G1.
  - Auto-layout ELK dans `BuilderCanvas.tsx`, qui remplace la grille de la ligne 700.
  - Inspector : champs 1.1 (`channelPath`, `action`, `correlationId`, `timeout`, `dependsOn`, Selector).
  - Galerie d'exemples E1.
  - Matrice de conformité 1.1 : `ComplianceMatrix.tsx:13`, nouveaux tests `spec-compliance/1.1.0-*.test.ts`.
  - Correction des liens `/playground`.
  - Rebranding de la landing `app/src/app/page.tsx` avec les tokens B1 et le lockup ConnEthics. Le nom suit la décision B1.
- **A2 Skill file IA**
  - Mise à jour de `arazzo.skill.md` et `app/public/arazzo.skill.md` en 1.1.
  - Nouvelles sections : « Exposer un workflow comme outil MCP » et « Écrire un test E2E Arazzo ».
  - Mise à jour de `docs/ARAZZO_REFERENCE.md`.

### Vague 3 — Website (FR + EN)

- **W0 Socle i18n & SEO minimal**
  - Repo : website.
  - Routes par préfixe pour ce contenu : EN à la racine, FR sous `/fr/...`. Les pages sont des server components avec `metadata`, `alternates.languages` (hreflang) et un dictionnaire de contenu partagé par page. Ce socle amorce la cible bilingue recommandée dans `INSIGHTS_STRATEGY.md`.
  - Évite le modèle client-toggle de `src/app/2026/page.tsx`, défavorable au SEO.
  - Ajout de `src/app/sitemap.ts`, `robots.ts` et d'un helper JSON-LD (`Article`, `SoftwareApplication`, `FAQPage`).
- **W1 Article d'illustration**
  - Dépendances : R2, R3, R4, E1.
  - URLs : `/insights/arazzo-1-1-mcp-e2e` (EN) et `/fr/insights/arazzo-1-1-mcp-e2e` (FR).
  - Pattern existant : `src/content/*.md` + `page.tsx` avec `ArticleHeader` (`targetAudience`, `keyTakeaways`, `difficulty`) + `AdvancedMarkdownRenderer`, comme dans `insights/le-manifeste-fin-tjm/page.tsx`.
  - Plan de l'article :
    1. Le pain : des endpoints sans intention.
    2. Ce qu'apporte la 1.1 : async, Selector, `dependsOn`.
    3. Cas MCP, avec l'exemple 1.
    4. Cas E2E exécutable, avec l'exemple 3 et la recette CI.
    5. L'outillage ConnEthics.
    6. Comment ConnEthics accompagne.
  - Visuels : captures du nouveau graphe (Playwright sur demo, `public/images/insights/arazzo/`), image OG.
  - Le ton suit la charte « Architecte Visionnaire ».
  - Ajout aux deux listes d'articles (`src/lib/articles.ts` et `src/app/insights/page.tsx`), en corrigeant leurs incohérences.
  - Article existant `insights/arazzo-api-workflows` : corriger la date de build, ajouter un lien vers le nouvel article, passer à `ArticleHeader`.
  - Option, en phase ultérieure : 2 articles d'approfondissement, MCP et E2E.
- **W2 Landing dédiée**
  - Dépendances : B1, R2, G1.
  - URLs : `/arazzo` et `/fr/arazzo`.
  - Base : le template de `src/app/ai-governance/page.tsx` (server component + `ConnEthicsHero` `deep-ocean` + sections Tailwind + CTA). Sections :
    1. Hero : « Des workflows API lisibles par les humains, exécutables par les agents ».
    2. Pains.
    3. Nouveautés 1.1.
    4. 3 cas d'usage : agents MCP, tests E2E, documentation d'intégration partenaires.
    5. **Graphe interactif embarqué** (`<ArazzoGraph>` vendored, chargé en client-only sur l'exemple order-to-cash).
    6. Outils ConnEthics : extension, Studio, Skill file.
    7. Offre d'accompagnement : audit d'API readiness agentique, design de workflows, gouvernance des outils IA, avec liens vers `/services` et l'offre AI Governance.
    8. FAQ (JSON-LD).
    9. CTA contact.
  - Liens depuis le Footer (`src/components/Footer.tsx:38`) et la navigation.
- **W3 Marketing**
  - Mise à jour de `marketing/linkedin-post-arazzo.md` : posts FR et EN, plus un carrousel 6 slides aligné sur la landing.

### Vague 4 — Intégration & QA croisée

- **Q1** : passe de cohérence inter-repos. Vérifie les noms, les liens (Marketplace, Studio, landing), les versions, les captures à jour et la même version de core/flow vendored partout.
- **Q2** : revue `/code-review` par repo, puis commit et push sur `claude/arazzo-1-1-0-refonte-iv866m`. Aucune PR sans demande explicite.

### Graphe de dépendances

```
R1 ─┬─> C1 ──┬─> V1 ───────────────┐
R5 ─┼─> D1 ──┴─> G1 ─┬─> V2 ─> V3 ─┤
B1 ─┘                ├─> A1        ├─> Q1 ─> Q2
R2,R3,R4 ─> E1 ──────┼─> A2        │
                     └─> W2   W0 ─> W1, W2 ─> W3
```

Parallélisme maximal : Vague 0 (6 agents), puis C1, D1 et E1 (3 agents), puis V1, G1, W0 et A2.

**Ordre d'exécution validé (16/11)** : vagues 0 et 1 enchaînées, sans pause entre les deux.
- Vague 0 : 6 sous-agents en parallèle (R1 à R5, B1). Chaque agent écrit dans `specs/002-arazzo-1-1-refonte/research/` (vscode) ou dans `brand/`.
- Vague 1 : C1 et E1 en parallèle, puis D1. Pour B1, on applique les recommandations par défaut (palette ConnEthics, nom proposé) en attendant la validation.
- Commit et push par repo à la fin de chaque lot.
- **Arrêt** à la livraison des maquettes D1, pour validation. On ne lance ni G1 ni la vague 2.

**Avancement au 16/11, 16 h UTC** : la vague 0 est terminée.
- Livrables R1 à R5 et B1 présents dans `specs/002-arazzo-1-1-refonte/`, non commités.
- R1 a été coupé par la limite d'usage, mais son livrable `01-spec-delta-1.1.md` est complet (sections a à e) et les schémas officiels sont dans `research/schemas/`.

**Décisions issues de la vague 0, à appliquer en vague 1** :
- `packages/arazzo-core` et `packages/arazzo-flow` sous licence **MIT** (défaut, en attente de confirmation), pour pouvoir les embarquer dans l'extension MIT.
- Règles de C1 : la table §c de `01-spec-delta-1.1.md`.
- Critères des exemples E1 :
  - par défaut, `simple` avec JSON Pointer, seule forme portable sur les 5 runners (R4) ;
  - les Selectors JSONPath servent seulement d'illustration 1.1, avec une note sur la limite des runners.
- `mcp-travel-booking` : deux workflows, `quote_trip` (lecture seule) et `book_trip`, plus `mcp-tools.json` au format R3.
- Recettes E1 : Prism 5.16 + Respect 2.79 épinglés pour le HTTP ; arazzo-cli + Kafka + Microcks pour `receive` ; limite documentée pour `send`. Jentic n'est pas utilisable en CI (code de sortie toujours 0).
- D1 : les variables `--af-*` de R5 sont définies à partir des tokens `--ce-*` de B1. On ajoute `worker-src` au CSP du webview.

**Étapes suivantes** :
1. Commit et push de la vague 0 (arazzo-vscode).
2. C1 et E1 en parallèle (arazzo-demo).
3. D1.
4. Commit et push, puis arrêt pour la validation des maquettes et des décisions de `brand/BRAND.md`.

**Points de validation utilisateur** : fin de B1 (nom, palette, licence), fin de D1 (maquettes du graphe) et relecture des textes W1/W2 avant publication.

---

## Vérification

- **Core** : `npm test` (Vitest) dans `packages/arazzo-core`. Tous les exemples E1 et les fixtures vscode passent dans ajv contre le schéma officiel 1.1. Un test « doublons de diagnostics = 0 ».
- **vscode** :
  - `npm run lint`, `npm run compile-tests`, `npm test` ;
  - `cd webview-ui && npm run build && npx vitest run` ;
  - `npx @vscode/vsce package` ;
  - test manuel dans l'Extension Development Host : ouvrir chaque exemple E1, vérifier diagnostics, complétion `channelPath`/`action`, graphe, clic nœud → éditeur, thèmes.
- **demo** : `npm run build` et `npm test` dans `app/`. Captures Playwright du builder et de `/showcase`, en light et dark.
- **Exemples exécutables** : lancer le mock (Prism ou Specmatic) puis le runner retenu en R4 sur les exemples HTTP, et consigner la sortie dans le README de l'exemple. Pour les exemples AsyncAPI, documenter la limite si aucun runner ne supporte encore la 1.1 async.
- **website** :
  - `npm run build` et `npm run lint` ;
  - vérifier hreflang, sitemap et JSON-LD (validateur Schema.org) ;
  - captures Playwright mobile (390 px) et desktop de `/arazzo`, `/fr/arazzo` et des articles.

---

## Décisions utilisateur du 16/11 (fin de vague 1)

- **Nom** : « Arazzo Studio by ConnEthics » pour l'app web, « Arazzo for VS Code — by ConnEthics » pour l'extension.
- **Licences** :
  - paquets `@connethics/arazzo-core` et `arazzo-flow` en **MIT** ;
  - app arazzo-demo en **source-available**. Proposition à confirmer : FSL-1.1-MIT. L'accroche « Open Source • Free Forever » est à reformuler, par exemple « Free to use · MIT core ».
- **Couleurs dans VS Code** : les couleurs sémantiques du graphe suivent le **thème VS Code** (`--vscode-charts-*`, `--vscode-testing-*`, etc.). La palette ConnEthics reste réservée au web (demo, website).
- **Maquettes D1** : validées. On applique les choix par défaut de `design/UI-SPEC.md` §14 et on corrige le conflit de pointillés entre `dependsOn` et les arêtes d'échec.
- **Suite** : lancement de la vague 2.
