# Tâches — Refonte Arazzo 1.1.0

Ce fichier liste les tâches cochables. Chaque lot correspond à un sous-agent.
Le contexte complet est dans [`plan.md`](./plan.md).

Branche : `claude/arazzo-1-1-0-refonte-iv866m`, dans `arazzo-vscode`, `arazzo-demo` et `website`.

Règles communes à tous les lots :
- Ne pas ouvrir de PR sans demande explicite.
- Respecter le `CLAUDE.md` de chaque repo.
- Tout livrable de recherche cite ses sources (URL + date de consultation).

---

## Vague 0 — Recherche & cadrage

### R1 — Delta spec 1.0.1 → 1.1.0
- [ ] Récupérer les JSON Schemas `1.0/schema/2025-10-15` et `1.1/schema/2026-04-15` et les stocker dans `research/schemas/`.
- [ ] Produire le diff structuré des deux schémas.
- [ ] Compléter avec le texte normatif de https://spec.openapis.org/arazzo/v1.1.0.html et l'historique Git `OAI/Arazzo-Specification`.
- [ ] Préciser les points suivants :
  - les formes exactes de `dependsOn` (étape, workflow, inter-document) ;
  - l'exclusivité `operationId` / `operationPath` / `workflowId` / `channelPath` ;
  - les contraintes sur `action`, `correlationId` et `timeout` ;
  - la relation entre `querystring` et `query` ;
  - la résolution de `$self` ;
  - la sémantique truthy/falsy ;
  - les préfixes réservés.
- [ ] Rédiger une table « règle → sévérité → code diagnostic → section spec », qui sert d'entrée à C1.
- **Sortie** : `research/01-spec-delta-1.1.md`

### R2 — Pains & positionnement
- [ ] Recenser les pains et leurs preuves, avec sources.
- [ ] Formuler 3 messages clés en FR et en EN.
- [ ] Identifier les personas visés : architecte API, QA/SDET, équipe plateforme IA, partenaire intégrateur.
- **Sortie** : `research/02-pains-positioning.md`

### R3 — Arazzo × MCP
- [ ] Définir le mapping workflow → outil MCP :
  - nom ;
  - description ;
  - `inputSchema` ;
  - sortie structurée ;
  - erreurs ;
  - auth.
- [ ] Dresser l'état de l'écosystème : Bump.sh, arazzo-cli, Jentic, autres.
- [ ] Faire un schéma d'architecture.
- [ ] Analyser les risques et la gouvernance, en lien avec l'offre AI Governance ConnEthics.
- [ ] Mentionner la roadmap OAI : MCP et A2A sont prévus comme types d'étape, mais ne font pas partie de la 1.1.
- **Sortie** : `research/03-mcp-arazzo.md`

### R4 — Runners E2E
- [ ] Construire la matrice Respect / Specmatic / Jentic arazzo-runner / Speakeasy / arazzo-cli. Colonnes : 1.0, 1.1, AsyncAPI, CI, mocks, licence.
- [ ] Documenter les commandes exactes, et les tester si le réseau le permet.
- [ ] Recommander un runner par défaut pour les recettes de E1.
- **Sortie** : `research/04-e2e-runners.md`

### R5 — Benchmark UI de graphe
- [ ] Étudier n8n, Temporal UI, Step Functions Workflow Studio, Postman Flows, Jentic Arazzo Editor et LangGraph Studio.
- [ ] Recenser les patterns utiles : nœuds-cartes, arêtes typées, groupes, couloirs, minimap, recherche, exports.
- **Sortie** : `research/05-graph-ui-benchmark.md`

### B1 — Marque
- [ ] Auditer les 3 repos : noms, couleurs, logos, licences.
- [ ] Créer `brand/tokens.json` et `brand/tokens.css`. Partir de la palette ConnEthics (bleu `#2563eb`, orange `#f97316`, slate) et ajouter des tokens sémantiques pour le graphe.
- [ ] Faire des propositions sur le nom produit unifié, le lockup et l'icône d'extension (256 px, moins de 100 Ko).
- [ ] **Faire valider par l'utilisateur** : nom, palette, licence de arazzo-demo.

## Vague 1 — Fondations

### C1 — `@connethics/arazzo-core` (arazzo-demo/packages/arazzo-core)
- [ ] Mettre en place un workspace npm à la racine de arazzo-demo (`packages/*`, `app`).
- [ ] Écrire les types 1.1, en fusionnant et corrigeant `types/arazzo.ts`, aujourd'hui dupliqué dans demo et vscode.
- [ ] Faire le parse YAML et produire une table de correspondance chemin JSON → position.
- [ ] Valider contre le JSON Schema officiel avec ajv 2020-12, en choisissant le schéma selon la valeur de `arazzo`.
- [ ] Implémenter les règles sémantiques de la table R1, sans aucun diagnostic en double.
- [ ] Écrire `workflowToGraph` (nœuds, arêtes et groupes typés) et `graphToMermaid`.
- [ ] Écrire les tests Vitest : un test par règle, plus le corpus E1 et les fixtures vscode.
- [ ] Créer le script `scripts/sync-shared.mjs`, qui copie `dist/` vers `vendor/` des consommateurs et écrit un hash.

### D1 — Design du graphe
- [ ] Réaliser des maquettes HTML (React Flow) en light, dark et HC, sur order-to-cash et pet-adoption.
- [ ] Rédiger la spec UI : nœuds, arêtes, groupes, couloirs, interactions, exports, accessibilité clavier.
- [ ] **Faire valider par l'utilisateur.**

### E1 — Exemples 1.1 (arazzo-demo/app/public/workflows/)
- [ ] `mcp-travel-booking.arazzo.yaml`, avec `mcp-tools.json`.
- [ ] `mcp-support-refund.arazzo.yaml` : hybride HTTP + AsyncAPI `send`.
- [ ] `e2e-order-to-cash.arazzo.yaml` : `receive`, `correlationId`, `timeout`, `dependsOn`, Selector.
- [ ] `e2e-session-renewal.arazzo.yaml` : 401 → retry via workflow `renewSession`, `querystring`.
- [ ] `e2e-onboarding-entreprise-fr.arazzo.yaml` : INPI/SIRENE en stub.
- [ ] Fournir pour chaque exemple des sources stub (OpenAPI 3.1 / AsyncAPI 3.0) et un README : scénario, mock, exécution, recette GitHub Actions.
- [ ] Migrer `pet-adoption` et `ecommerce-onboarding` en 1.1.

## Vague 2 — Produits

### G1 — `@connethics/arazzo-flow`
- [ ] Créer `<ArazzoGraph>` sur React Flow 12 + ELK, avec ELK exécuté dans un Web Worker. Le style passe par des variables CSS, sans Tailwind.
- [ ] Implémenter les types de nœuds (HTTP, send, receive, sous-workflow, input, output, jonction) et les arêtes sémantiques.
- [ ] Ajouter minimap, zoom/fit, recherche, navigation clavier, export SVG/PNG/Mermaid.
- [ ] Écrire les tests et ajouter une démo dans `/showcase`.

### V1 — vscode : conformité 1.1
- [ ] `src/arazzo-detection.ts` : ajouter `1.1.0`.
- [ ] `src/validation/*` : déléguer à core et mapper les diagnostics vers des ranges YAML.
- [ ] Mettre à jour la complétion : clés et énumérations 1.1, `$message.`, `$self`, cibles `dependsOn` / `goto`.
- [ ] Faire utiliser `ParseCache` au symbol provider.
- [ ] Ajouter un quick-fix « Migrer vers 1.1.0 ».
- [ ] Ajouter les fixtures 1.1 et mettre à jour les tests de version.

### V2 — vscode : nouveau graphe et vue doc
- [ ] Remplacer Mermaid par `<ArazzoGraph>` dans `FlowchartView`, et mapper les thèmes sur `--vscode-*`.
- [ ] Ajuster le CSP pour le worker ELK, en gardant le nonce.
- [ ] Vue doc : afficher async, Selectors, `dependsOn` et `$self`. Décider du sort de la vue séquence, aujourd'hui morte.
- [ ] Passer le webview en React 19.

### V3 — vscode : packaging et marque
- [ ] Passer en version 2.0.0, ajouter `galleryBanner` et une icône 256 px.
- [ ] Mettre à jour README, CHANGELOG, snippets MCP/E2E et `CLAUDE.md`.
- [ ] Vérifier que `npx @vscode/vsce package` passe.

### A1 — arazzo-demo : migration
- [ ] Brancher le parser et les diagnostics de core, et remplacer `ArazzoFlow` par G1.
- [ ] Faire l'auto-layout ELK dans `BuilderCanvas.tsx`.
- [ ] Ajouter les champs 1.1 dans l'Inspector.
- [ ] Ajouter la galerie d'exemples E1.
- [ ] Mettre à jour la matrice de conformité 1.1 et ajouter les tests `spec-compliance/1.1.0-*`.
- [ ] Corriger les liens `/playground`.
- [ ] Rebrander la landing avec les tokens B1.

### A2 — Skill file
- [ ] Mettre à jour `arazzo.skill.md` (racine et `app/public/`) en 1.1.
- [ ] Ajouter les sections MCP et E2E.
- [ ] Mettre à jour `docs/ARAZZO_REFERENCE.md`.

## Vague 3 — Website

### W0 — Socle i18n et SEO
- [ ] Mettre en place les routes EN à la racine et FR sous `/fr/`, avec des dictionnaires de contenu et `alternates.languages`.
- [ ] Ajouter `sitemap.ts`, `robots.ts` et un helper JSON-LD.

### W1 — Article (EN + FR)
- [ ] Créer `/insights/arazzo-1-1-mcp-e2e` et `/fr/insights/arazzo-1-1-mcp-e2e` : contenu Markdown, `ArticleHeader` et `AdvancedMarkdownRenderer`.
- [ ] Produire les visuels (captures Playwright, image OG).
- [ ] Mettre à jour `src/lib/articles.ts` et `src/app/insights/page.tsx`, et rendre les deux listes cohérentes.
- [ ] Corriger l'article existant `arazzo-api-workflows` (date, `ArticleHeader`, lien vers le nouvel article).
- [ ] **Faire relire par l'utilisateur.**

### W2 — Landing `/arazzo` et `/fr/arazzo`
- [ ] Construire les sections hero, pains, nouveautés 1.1, cas d'usage, graphe embarqué, outils, accompagnement, FAQ (JSON-LD) et CTA.
- [ ] Ajouter les liens dans le Footer et la navigation.
- [ ] **Faire relire par l'utilisateur.**

### W3 — Marketing
- [ ] Rédiger les posts LinkedIn FR et EN et le carrousel, dans `marketing/linkedin-post-arazzo.md`.

## Vague 4 — QA

### Q1 — Cohérence inter-repos
- [ ] Vérifier noms, liens, versions, captures et hash du code vendored.

### Q2 — Revue et livraison
- [ ] Lancer `/code-review` sur chaque repo.
- [ ] Faire passer les vérifications de `plan.md` § Vérification.
- [ ] Commit et push.
