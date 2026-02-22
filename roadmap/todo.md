# Roadmap - Arazzo VS Code Extension

## Problemes critiques

### P1 - Fichier monolithique `extension.ts` (749 lignes)
- [ ] Extraire `ArazzoPreviewPanel` dans `src/panels/PreviewPanel.ts`
- [ ] Extraire `ArazzoFlowchartPanel` dans `src/panels/FlowchartPanel.ts`
- [ ] Factoriser `_getHtmlForWebview()` et `getNonce()` dans `src/panels/shared.ts`
- [ ] Extraire `YamlDocumentSymbolProvider` dans `src/providers/SymbolProvider.ts`
- [ ] Extraire `YamlCompletionItemProvider` dans `src/providers/CompletionProvider.ts`
- [ ] Extraire `validateArazzo()`, `validateStep()`, `checkRequired()`, `addDiagnostic()` dans `src/validation/arazzoValidator.ts`
- [ ] Extraire `detectAndSelectWorkflow()` dans `src/utils/workflowDetection.ts`
- [ ] Ne garder dans `extension.ts` que `activate()` et le wiring

### P2 - Duplication du code HTML webview
- [ ] `ArazzoPreviewPanel._getHtmlForWebview()` (l.249-313) et `ArazzoFlowchartPanel._getHtmlForWebview()` (l.436-464) sont quasi identiques
- [ ] Factoriser dans une fonction utilitaire partagee

### P3 - Activation trop large `onLanguage:yaml`
- [ ] L'extension s'active sur **tout fichier YAML** (docker-compose, CI, prettierrc...)
- [ ] Ajouter une detection du champ `arazzo:` en tete de fichier avant de produire des diagnostics
- [ ] Ne pas afficher "Missing required field: info/workflows/sourceDescriptions" sur les YAML non-Arazzo
- [ ] Envisager un `activationEvents` plus cible ou un language ID dedie (`arazzo-yaml`)

### P4 - Parsing YAML quadruple a chaque frappe
- [ ] Chaque frappe declanche 4x `parseDocument()` : validate, PreviewPanel.update, FlowchartPanel.update, detectAndSelectWorkflow
- [ ] Implementer un cache du document parse avec invalidation sur changement
- [ ] Ajouter un debounce sur `onDidChangeTextDocument` (200-300ms)

### P5 - Validation Arazzo incomplete
- [ ] Pas de validation des Runtime Expressions (`$statusCode`, `$response.body#/...`, `$steps.xxx.outputs.yyy`)
- [ ] Pas de resolution des `ReusableObject` references (`$components.parameters.xxx`)
- [ ] Pas de validation croisee : `step.operationId` vs operations existantes dans les `sourceDescriptions`
- [ ] Pas de validation des `dependsOn` : les workflowIds references existent-ils ?
- [ ] Pas de validation de l'exclusivite mutuelle `operationId | operationPath | workflowId` (seul "au moins un" est verifie)
- [ ] Pas de validation du format d'URL des `sourceDescriptions`

### P6 - Completion provider trivial
- [ ] Ne propose que `true`, `false`, `null` apres `: `
- [ ] Ajouter la completion des cles Arazzo selon le contexte (`workflowId`, `stepId`, `operationId`...)
- [ ] Ajouter la completion des valeurs de `type` (`openapi`/`arazzo`)
- [ ] Ajouter la completion des references (`$steps.xxx`, `$sourceDescriptions.yyy`)
- [ ] Ajouter des snippets pour les structures courantes (nouveau workflow, nouveau step)

## Problemes moderes

### M1 - Securite Mermaid
- [ ] `securityLevel: 'loose'` dans `MermaidDiagram.tsx:43` — passer a `'strict'` ou `'sandbox'`
- [ ] `dangerouslySetInnerHTML` pour le SVG (l.562) — sanitiser le SVG ou durcir Mermaid

### M2 - `@ts-ignore` et castings `any`
- [ ] `App.tsx:14` : `// @ts-ignore` pour `acquireVsCodeApi` — typer correctement l'API VS Code webview
- [ ] `extension.ts:105` : `(item as any).range` — typer les ranges internes de la lib `yaml`
- [ ] `extension.ts:498` : `parseNode(node: any)` — typer avec `YAMLMap | YAMLSeq | Scalar | Pair`
- [ ] `extension.ts:517-519` : `(pair as any).range` — eliminer les castings `any` recurrents

### M3 - Detection HTTP par heuristique fragile
- [ ] `extractHttpMethod()` dans `mermaid-converter.ts:276-287` devine la methode depuis le nom (`"verify"` → GET, `"log"` → POST)
- [ ] Idealement, resoudre l'`operationId` contre la spec OpenAPI source pour obtenir la vraie methode

### M4 - Tests minimalistes
- [ ] 3 tests seulement, tous avec `setTimeout(1000)` comme synchronisation
- [ ] Ajouter des tests pour le mermaid-converter
- [ ] Ajouter des tests pour les cas limites de validation
- [ ] Ajouter des tests pour la detection de workflow par curseur
- [ ] Ajouter des tests React pour le webview
- [ ] Remplacer les `setTimeout` par une attente conditionnelle

### M5 - Commande `helloWorld` residuelle
- [ ] `package.json:38-40` : commande `arazzo-vscode.helloWorld` encore dans le manifest
- [ ] Jamais implementee dans `extension.ts` — artefact de scaffolding a supprimer

## Evolutions fonctionnelles

### Court terme (v0.1.x)
- [ ] Restreindre les diagnostics aux fichiers Arazzo uniquement (P3)
- [ ] Modulariser `extension.ts` (P1 + P2)
- [ ] Debounce + cache du parsing YAML (P4)
- [ ] Supprimer la commande `helloWorld` (M5)
- [ ] Durcir la securite Mermaid (M1)

### Moyen terme (v0.2.x)
- [ ] Resolution des sourceDescriptions : charger les specs OpenAPI referencees pour valider les `operationId`
- [ ] Completion contextuelle : cles Arazzo, references, expressions runtime (P6)
- [ ] Go-to-definition : cliquer sur `$steps.myStep` pour naviguer vers la definition
- [ ] Validation des Runtime Expressions avec un parser dedie (P5)
- [ ] Hover documentation : afficher la doc de la spec Arazzo au survol des cles

### Long terme (v1.0)
- [ ] Migrer vers un Language Server Protocol (LSP) pour reutilisation multi-IDE (JetBrains, Neovim)
- [ ] Runner Arazzo integre : executer les steps contre les APIs reelles
- [ ] Editeur visuel : drag-and-drop pour construire des workflows (le webview actuel est lecture seule)
- [ ] Support multi-fichiers : references entre fichiers Arazzo et resolution des `$ref` externes
