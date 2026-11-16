# Marque ConnEthics × Arazzo — audit et tokens (lot B1)

> Lot B1 de la refonte Arazzo 1.1.0 ([plan.md](../plan.md)). Ce document est en lecture seule pour les autres lots, à l'exception de la section « Décisions », que l'utilisateur doit valider avant le lancement de D1, G1, V3, A1 et W2.

## Livrables

| Fichier | Contenu |
|---|---|
| `tokens.json` | Tokens au format W3C Design Tokens (DTCG 2025.10) : primitives, sémantique UI, graphe, méthodes HTTP, typographie, espacements, rayons, ombres, durées. |
| `tokens.css` | Variables `--ce-*`. Light par défaut, dark via `[data-theme="dark"]`, `prefers-color-scheme` et `body.vscode-dark`. Contient une section **VS Code bridge**. |
| `icon-256.png` | Icône actuelle de l'extension ramenée à 256 × 256 px, 73 Ko au lieu de 4,3 Mo. `images/icon.png` n'est pas remplacée. |
| `arazzo-mark.svg` | Proposition de symbole « tapisserie » : chaîne bleue × trame orange. |
| `tools/gen_tokens.py` | Source unique des tokens. Génère `tokens.json` et `tokens.css` et vérifie les contrastes WCAG ; le code de sortie est 1 en cas d'échec. |
| `tools/vscode_bg_check.py` | Contrôle des couleurs du graphe sur les fonds par défaut de VS Code (Light Modern, Dark Modern, Dark+, HC). |
| `tools/make_mark.py` | Génère `arazzo-mark.svg`. |

Régénération : `python3 brand/tools/gen_tokens.py brand/` (Python 3 sans dépendance). **Ne pas éditer `tokens.json` ni `tokens.css` à la main.**

---

## 1. Audit

### 1.1 Noms de produit

Le même outil porte **cinq noms** différents, et l'extension en porte trois.

| Repo | Emplacement | Nom affiché |
|---|---|---|
| arazzo-demo | `app/src/app/layout.tsx` (title, OG `siteName`, Twitter), `app/public/manifest.json` | **Arazzo Builder** (« Interactive OpenAPI Workflow Visualizer ») |
| arazzo-demo | `app/src/app/page.tsx` : title, nav, footer, CTA « Open Playground » | **Arazzo Playground** |
| arazzo-demo | `README.md` (H1 « 🎭 Arazzo Visualizer ») | **Arazzo Visualizer** |
| arazzo-demo | `BuilderHeader.tsx`, `showcase/page.tsx`, pied des docs générées (« Generated with Arazzo Builder ») | Arazzo Builder |
| arazzo-demo | `app/package.json` | `app` v0.1.0, sans nom de produit |
| arazzo-demo | URL affichées dans les maquettes de la landing | `arazzo.connethics.com/playground`, alors que la route réelle est `/builder` |
| arazzo-vscode | `package.json` `displayName`, H1 du README | **Arazzo VSCode** |
| arazzo-vscode | Texte de `images/icon.png` | **ARAZZO SPEC EDITOR** |
| arazzo-vscode | Commandes | « Open Arazzo Preview », « Open Arazzo Flowchart » |
| website | `src/content/arazzo-presentation.md` et article | « Arazzo Playground », « Arazzo Visualizer », « Arazzo VS Code » |

Occurrences dans les trois repos (hors `node_modules`) : Arazzo Builder ×22, Arazzo VSCode ×8, Arazzo Playground ×7, Arazzo Visualizer ×6, Arazzo VS Code Extension ×3.

### 1.2 Couleurs

| Source | Primaire | Accent | Neutres | Remarques |
|---|---|---|---|---|
| website `globals.css:76-102` | **bleu `#2563eb`** (échelle Tailwind blue 50→950) | **orange `#f97316`** (échelle orange) | — | Référence retenue. Site forcé en light uniquement (`!important`). |
| website `design-system/tokens.ts` | `#2563eb` | `#f97316` | **gray** (`#6b7280`…), pas slate | success `#10b981` (emerald), info = primaire. Surfaces dark prévues mais inutilisées. |
| website `tailwind.config.js` | `var(--color-primary-*)` | `var(--color-accent-*)` | gray | **Probablement ignoré** : Tailwind 4 ne charge un `tailwind.config.js` que via `@config`, absent de `globals.css`. Les classes `text-primary-600` (×12), `bg-primary-900`, etc. ne seraient donc pas générées. À vérifier au lot W0. |
| website `MuiThemeProvider.tsx` | **sky `#0284c7`** (main), échelle sky `#0ea5e9`… | orange, mais `main` = `#ea580c` | neutral (`#525252`) | **Troisième bleu**, incohérent avec `#2563eb`. Le hero `deep-ocean` mélange fond slate-900 `#0f172a` et lueur sky. |
| website, usage réel | classes `blue-600` (×54), `blue-800` (×26) | `orange-*` quasi absent (×4) | — | Sous Tailwind 4, `blue-600` vaut `oklch(54.6% 0.245 262.9)` ≈ `#155dfc`, et non `#2563eb`. **L'écart est visible.** |
| Logo `logo-connethics.webp` | **cyan `#009cdf`** + noir | — | — | Couleur échantillonnée. Le logo n'a ni bleu `#2563eb` ni orange. |
| demo `page.tsx` | **indigo-500 / purple-500/600** (dégradés ×22 / ×18), `pink-400` | aucun | slate-950/900/800 et gray-600 | Pas de bleu ni d'orange ConnEthics. |
| demo `favicon.svg`, `manifest.json` | dégradé `#6366f1` → `#9333ea`, `theme_color #6366f1` | — | `#0f172a` | Pictogramme « éclair », sans lien avec la tapisserie ni ConnEthics. |
| demo `ArazzoFlow.tsx` / nodes | `#6366f1` | `#f59e0b` | `#64748b`, `#334155` | |
| vscode `Badge.tsx` | step **indigo**, source/arazzo **purple** | — | gray/slate | input emerald, output **violet**, GET emerald, POST blue, PUT amber, **PATCH orange**, DELETE red, success emerald, failure red. |
| vscode `mermaid-converter.ts:29-32` | stepNode **indigo `#6366f1`** | outputNode **amber `#f59e0b`** | — | inputNode emerald `#10b981`, errorNode red. **La couleur de sortie diffère du badge** (violet ≠ amber). |
| vscode `images/icon.png` | dégradé bleu `#0090d8` → violet `#7830d8` | — | fond blanc cassé opaque `#fcfdfb` | Bouclier ConnEthics, document de code et texte « ARAZZO SPEC EDITOR ». |

En résumé, il y a **quatre bleus** concurrents (`#2563eb` dans le CSS, `#155dfc` rendu par Tailwind 4, `#0284c7` dans MUI, `#009cdf` dans le logo) et un **univers indigo/violet** côté produits Arazzo. L'orange de marque est quasiment absent des produits.

### 1.3 Logos et icônes

- **Logo ConnEthics** (`website/public/images/logo-connethics.webp`, 256 px, 15 Ko) : bouclier-cadenas et poignée de main, mot-symbole « CONNETHICS » en capitales (« CONN » noir, « ETHICS » cyan) et signature « **Build for Ethical Connexions** ». `Logo.tsx` le pose sur une pastille blanche et ajoute « ConnEthics » en `text-blue-900`. Le mot-symbole apparaît donc deux fois.
- **Icône de l'extension** (`images/icon.png`) : 2048 px, 4,3 Mo, PNG truecolor sans transparence. Il s'agit du logo ConnEthics recadré sur un carré bleu-violet, avec un document de code et le texte « ARAZZO SPEC EDITOR ». À 128 px (taille Marketplace), le document et la ligne « SPEC EDITOR » deviennent illisibles. Le fond blanc opaque crée un carré clair sur les thèmes sombres.
- **Favicon de la démo** : éclair blanc sur dégradé indigo-violet. Ce pictogramme générique ne rappelle ni ConnEthics ni Arazzo.
- **Aucun symbole propre à Arazzo** n'existe dans les trois repos.

### 1.4 Orthographe de « ConnEthics »

| Variante | Où | Statut |
|---|---|---|
| **ConnEthics** | website (×159), `Logo.tsx`, `constants.ts` `BRAND.name`, LICENSE vscode et website | **Canonique** |
| connEthics | Org GitHub (`github.com/connEthics/...`, ×20 demo, ×6 vscode) | Identifiant technique, acceptable dans les URL. **Fautif dans la prose** : demo `LICENSE.md` (« Copyright © 2024 connEthics », « authorization from **connEthics** »), `README.md:183`, `app/src/components/arazzo/LICENSE`, `docs/ARAZZO_REFERENCE.md:703`, et le texte de lien dans `website/src/content/arazzo-presentation.md:56-57` |
| Connethics | demo `layout.tsx:35-37` (`authors`, `creator`, `publisher` des métadonnées SEO) | **Fautif**, et exposé dans les métadonnées |
| connethics | Domaines, e-mails, éditeur Marketplace `connethics`, handle `@connethics` | Identifiants en minuscules : OK |
| CONNETHICS | Mot-symbole du logo, raison sociale « CONNETHICS CONSULTING » (mock INPI, `DEPLOYMENT_GUIDE.md`) | OK pour le graphisme et le juridique |

### 1.5 Licences

| Repo | Fichier | Licence | Incohérences |
|---|---|---|---|
| arazzo-vscode | `LICENSE`, `package.json` | MIT © 2025 ConnEthics | Cohérent. |
| website | `LICENSE` | MIT © 2025 ConnEthics | Le MIT couvre a priori aussi les **contenus** (articles) et le **logo**, ce qui n'est probablement pas voulu. |
| arazzo-demo | `LICENSE.md` | **Propriétaire** © 2024 connEthics, « *open source but not free to use* » | (1) Un logiciel dont l'usage est interdit sans autorisation n'est pas *open source* au sens OSI : il est *source-available*. (2) Le badge `License-MIT-green` du README est **faux**. (3) La landing affiche « **Open Source • Free Forever** ». (4) `app/package.json` n'a pas de champ `license` (`private: true`). (5) L'année est 2024 alors qu'ailleurs elle est 2025. |
| arazzo-demo | `app/src/components/arazzo/LICENSE` | « MIT » + clause supplémentaire (lien obligatoire vers le repo) | Ce n'est plus un MIT standard. `LICENSE.md` liste 6 fichiers sous MIT, alors que le dossier en contient 14 (`StepBody`, `WorkflowHeader`, `SchemaViewer`…) : le périmètre est ambigu. |
| **Plan cible** | `@connethics/arazzo-core` / `arazzo-flow` dans `arazzo-demo/packages/`, *vendored* dans vscode (MIT) et website | — | **Conflit bloquant** : du code sous licence propriétaire ne peut pas être embarqué dans une extension publiée sous MIT. Les paquets partagés doivent être sous licence permissive, quelle que soit la décision pour l'app. |

### 1.6 Typographie et autres écarts

- **Polices** : le website utilise Inter (sans) et JetBrains Mono (mono). La démo utilise **Geist / Geist Mono**, mais son `globals.css` force `font-family: Arial, Helvetica` sur `body`. Le webview vscode suit la police de VS Code.
- **Signatures** : le logo dit « Build for Ethical Connexions » (il faudrait *Built*, et *Connexions* est la graphie française ou britannique archaïque), alors que `constants.ts` dit « Ethical Connections in a Competitive World ».
- **Contacts** : le website utilise `contact@connethics.com`, le README vscode `hello@connethics.com`. `constants.ts` contient le téléphone fictif `+1 (555) 123-4567`.
- **Versions de Mermaid** : le README de la démo annonce 11, l'extension embarque 10.
- **Mode sombre** : le website est forcé en light (`FEATURES.darkMode: true` est ignoré). La démo et l'extension ont un mode dark.

---

## 2. Tokens

### 2.1 Principes

1. **Une seule source** : `tools/gen_tokens.py` génère `tokens.json` (DTCG) et `tokens.css`, et bloque si un contraste échoue.
2. **Primitives** : échelles Tailwind v3 en hex, alignées sur `globals.css` et `tokens.ts` du site. Couleurs `blue` (primaire), `orange` (accent) et **`slate`** (neutres, plutôt que gray : plus froid et cohérent avec le hero `deep-ocean`), plus `green`, `red`, `amber`, `teal`, `cyan`, `indigo`, `violet` et `fuchsia` pour la sémantique. `--ce-color-logo-cyan: #009cdf` est conservé comme référence.
3. **Sémantique** : `--ce-bg-*`, `--ce-text-*`, `--ce-border-*`, `--ce-primary*`, `--ce-accent*`, `--ce-focus-ring`, `--ce-status-{success,warning,danger,info}-{fg,bg,text}`.
4. **Graphe** : chaque type expose `--ce-graph-<kind>-fg` (trait, icône, bordure, ≥ 3:1), `-bg` (remplissage) et `-text` (≥ 4,5:1 sur son fond **et** sur le canevas, pour les libellés d'arêtes), plus `-border` (= fg).
5. **Modes** : en DTCG, la valeur light est dans `$value` et la valeur dark dans `$extensions["com.connethics.modes"].dark`. Les fonds dark teintés sont des mélanges (`$extensions["com.connethics.derivation"]`, par exemple `mix(blue.500 @ 16% over slate.900)`).
6. **Orange de marque `#f97316`** : son contraste est de 2,80:1 sur blanc. En light, il sert **uniquement aux aplats décoratifs** (`--ce-accent-brand`). Les usages fonctionnels passent par `--ce-accent` (`#ea580c`, 3,56:1, pour les traits et icônes), `--ce-accent-text` (`#c2410c`, 5,18:1) et `--ce-accent-solid` (`#c2410c` avec texte blanc). En dark, `#f97316` reste utilisable tel quel (6,37:1 sur `#0f172a`).

### 2.2 Palette du graphe

| Kind | Usage | Light fg / bg / text | Dark fg / bg / text |
|---|---|---|---|
| `input` | Nœud Inputs (cyan, rappel du logo ConnEthics) | `#0891b2` / `#ecfeff` / `#155e75` | `#22d3ee` / `#0e3045` / `#a5f3fc` |
| `output` | Nœud Outputs | `#7c3aed` / `#f5f3ff` / `#5b21b6` | `#a78bfa` / `#23224b` / `#ddd6fe` |
| `step-http` | Étape HTTP (`operationId` / `operationPath`) | `#2563eb` / `#eff6ff` / `#1e40af` | `#60a5fa` / `#16284b` / `#bfdbfe` |
| `async-send` | Étape AsyncAPI `action: send` | `#ea580c` / `#fff7ed` / `#9a3412` | `#fb923c` / `#342627` / `#fed7aa` |
| `async-receive` | Étape AsyncAPI `action: receive` | `#0d9488` / `#f0fdfa` / `#115e59` | `#2dd4bf` / `#10313e` / `#99f6e4` |
| `workflow-call` | Étape `workflowId`, action vers un workflow (nœud et arête) | `#c026d3` / `#fdf4ff` / `#86198f` | `#e879f9` / `#2f1f4a` / `#f5d0fe` |
| `success` | Arête `onSuccess`, critère satisfait | `#15803d` / `#f0fdf4` / `#166534` | `#4ade80` / `#123332` / `#bbf7d0` |
| `failure` | Arête `onFailure`, critère en échec | `#dc2626` / `#fef2f2` / `#991b1b` | `#f87171` / `#331e2e` / `#fecaca` |
| `retry` | Boucle retry `×N / Ns` (tiret-point `2 3 6 3`) | `#b45309` / `#fffbeb` / `#92400e` | `#fbbf24` / `#342d25` / `#fde68a` |
| `end` | `type: end`, nœud terminal | `#334155` / `#f1f5f9` / `#1e293b` | `#cbd5e1` / `#1d263a` / `#e2e8f0` |
| `depends-on` | Arête `dependsOn` (points ronds `0.5 4.5`) et nœud de jonction | `#4f46e5` / `#eef2ff` / `#3730a3` | `#818cf8` / `#1c244a` / `#c7d2fe` |
| `sequence` | Enchaînement implicite | `#64748b` / `#f8fafc` / `#475569` | `#94a3b8` / `#1d263a` / `#cbd5e1` |

Le chrome du graphe dispose aussi de `--ce-graph-canvas`, `-grid`, `-node-bg`, `-node-border`, `-node-selected` et `-minimap-mask`, ainsi que de dimensions : `--ce-graph-node-width: 240px`, `-node-radius: 8px`, `-edge-width: 1.5px`, `-edge-width-selected: 2.5px`, `-junction-size`, `-handle-size`, `-focus-ring-width/offset` et `--ce-graph-dash-{failure,end-failure,implicit-failure,retry,depends-on,transfer,workflow-call}`.

> **La couleur ne porte jamais seule l'information** (WCAG 1.4.1). Chaque type a aussi une icône (send ↗, receive ↙, sous-workflow ⧉), un motif de trait (points ronds pour `dependsOn`, tirets pour l'échec, tiret-point pour retry) ou un libellé (`×3 / 2s`). C'est une contrainte pour D1/G1.

**Motifs de trait — révision G1 (16/11/2026).** La version B1 donnait à `dependsOn` le motif `6 4`, déjà utilisé par les arêtes d'échec des maquettes D1 : les deux types étaient indiscernables sans la couleur. Décision utilisateur : un motif distinct par type d'arête. Les tokens `--ce-graph-dash-*` (et `graph.dash.*` de `tokens.json`, générés par `tools/gen_tokens.py`) deviennent :

| Arête | Token | Motif (`stroke-dasharray`) |
|---|---|---|
| échec (`goto`) | `--ce-graph-dash-failure` | `6 4` |
| fin en échec | `--ce-graph-dash-end-failure` | `6 4 1 4` (tiret-point) |
| échec implicite (option) | `--ce-graph-dash-implicit-failure` | `1 3` |
| retry | `--ce-graph-dash-retry` | `2 3 6 3` (était `2 3`) |
| `dependsOn` | `--ce-graph-dash-depends-on` | `0.5 4.5`, extrémités rondes (était `6 4`) |
| transfert (`goto workflowId`) | `--ce-graph-dash-transfer` | `10 4` |
| appel de workflow | `--ce-graph-dash-workflow-call` | `none` : double trait (était `8 3 2 3`) |

Les arêtes pleines (séquence 1,5 px neutre, succès 2 px vert, fin en succès 1,5 px vert) se distinguent par l'épaisseur, la couleur et le glyphe `✓` du libellé. Implémentation : `@connethics/arazzo-flow` (`--af-dash-*`).

### 2.3 Méthodes HTTP

| Méthode | Teinte | Light badge bg / text (aplat + texte) | Dark badge bg / text (aplat + texte) |
|---|---|---|---|
| GET | green | `#dcfce7` / `#166534` (`#15803d` + blanc) | `#1f4b43` / `#86efac` (`#4ade80` + `#020617`) |
| POST | blue | `#dbeafe` / `#1e40af` (`#1d4ed8` + blanc) | `#243d64` / `#93c5fd` (`#60a5fa` + `#020617`) |
| PUT | amber | `#fef3c7` / `#92400e` (`#b45309` + blanc) | `#4d4330` / `#fcd34d` (`#fbbf24` + `#020617`) |
| PATCH | **teal** (au lieu d'orange) | `#ccfbf1` / `#115e59` (`#0f766e` + blanc) | `#1c4853` / `#5eead4` (`#2dd4bf` + `#020617`) |
| DELETE | red | `#fee2e2` / `#991b1b` (`#b91c1c` + blanc) | `#4c2f3d` / `#fca5a5` (`#f87171` + `#020617`) |

Les tokens sont `--ce-method-<get|post|put|patch|delete>-{bg,text,solid,on-solid}`. PATCH passe en teal pour réserver l'orange à la marque et aux messages `send` (décision D3).

### 2.4 Typographie, espacement, rayons, ombres, mouvement

- **Polices** : `--ce-font-sans` (Inter, puis ui-sans-serif, system-ui…) et `--ce-font-mono` (JetBrains Mono, puis ui-monospace…). Dans VS Code, le bridge les remplace par `--vscode-font-family` et `--vscode-editor-font-family`.
- **Tailles** : de `2xs` (10 px) à `6xl` (60 px) en rem, plus des tailles fixes pour le graphe : `graph-title` 13 px, `graph-meta` 11 px, `graph-badge` 10 px. Les styles composites DTCG `typography.{body,heading,code,graph-title,graph-badge}` sont disponibles.
- **Graisses** : 400, 500, 600, 700 et 800. **Interlignes** : de 1 à 1,625. **Interlettrage** : `tight` -0,025em, `caps` 0,05em.
- **Espacement** : grille de 4 px, `--ce-space-{0,px,0-5,1,1-5,2,2-5,3,4,5,6,8,10,12,16,20,24}`.
- **Rayons** : `xs` 2, `sm` 4 (badges), `md` 6, `lg` 8 (nœuds), `xl` 12 (cartes), `2xl` 16, `3xl` 24, `full`.
- **Ombres** : `xs` à `xl`, avec les alias `node`, `node-hover`, `overlay` et `dialog`. Elles sont teintées slate-900 en light et noires plus denses en dark. Elles sont désactivées en high contrast.
- **Mouvement** : `--ce-duration-{fast,normal,slow}` (150/200/300 ms) et `--ce-easing-{standard,emphasized,exit}`. Les durées passent à 0 avec `prefers-reduced-motion` et `body.vscode-reduce-motion`.

### 2.5 Sélecteurs de thème et VS Code bridge

```text
light : :root, [data-theme="light"], body.vscode-light, body.vscode-high-contrast-light
dark  : [data-theme="dark"], body.vscode-dark, body.vscode-high-contrast:not(.vscode-high-contrast-light)
        @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }
```

Le **bridge** (fin de `tokens.css`) s'applique aux `body.vscode-*`. Il remappe **le chrome uniquement** sur les variables du thème de l'utilisateur, avec la valeur ConnEthics en fallback.

| Token `--ce-*` | Variable VS Code |
|---|---|
| `bg-canvas`, `graph-canvas` | `--vscode-editor-background` |
| `bg-surface` | `--vscode-sideBar-background` |
| `bg-raised`, `graph-node-bg` | `--vscode-editorWidget-background` |
| `bg-sunken` | `--vscode-textCodeBlock-background` |
| `bg-hover` / `bg-selected` | `--vscode-list-hoverBackground` / `--vscode-list-activeSelectionBackground` |
| `border-default` / `border-strong` / `graph-node-border` | `--vscode-panel-border` / `--vscode-input-border` / `--vscode-editorWidget-border` |
| `text-default` / `text-muted` / `text-subtle` / `text-link` | `--vscode-foreground` / `--vscode-descriptionForeground` / `--vscode-disabledForeground` / `--vscode-textLink-foreground` |
| `primary-solid` / `primary-solid-hover` / `on-primary` | `--vscode-button-background` / `--vscode-button-hoverBackground` / `--vscode-button-foreground` |
| `focus-ring`, `graph-node-selected` | `--vscode-focusBorder` |
| `status-danger/warning/info/success-fg` | `--vscode-editorError/Warning/Info-foreground`, `--vscode-testing-iconPassed` |
| `graph-grid` | `--vscode-editorIndentGuide-background1` |
| `font-sans` / `font-mono` / `font-size-base` | `--vscode-font-family` / `--vscode-editor-font-family` / `--vscode-font-size` |

En high contrast, les bordures et le focus passent sur `--vscode-contrastBorder` / `--vscode-contrastActiveBorder`, les traits s'épaississent à 2 px et les ombres sont supprimées. En `forced-colors`, les mots-clés système (`CanvasText`, `Highlight`) prennent le relais.

Les couleurs sémantiques du graphe et des méthodes **restent celles de la marque** dans VS Code. Elles ont été vérifiées sur les fonds par défaut (`tools/vscode_bg_check.py`) : contraste minimal de 3,21:1 sur Light+ widget `#f3f3f3` (trait `async-send`), de 5,13:1 sur Dark+ widget `#252526` et de 7,04:1 sur HC noir. Un thème tiers exotique peut descendre plus bas : c'est accepté.

Notes pour G1 : mapper les variables de React Flow sur les tokens, par exemple `--xy-background-color: var(--ce-graph-canvas)`, `--xy-edge-stroke-default: var(--ce-graph-sequence-fg)`, `--xy-node-border-radius-default: var(--ce-graph-node-radius)` et `--xy-minimap-mask-background-color-default: var(--ce-graph-minimap-mask)`. Pour l'export Mermaid (C1), générer les `classDef` à partir des valeurs light de `tokens.json`.

---

## 3. Contrastes WCAG AA

Méthode : luminance relative WCAG 2.x. Seuils : **4,5:1** pour le texte, **3:1** pour les composants d'interface et les traits (1.4.11). La bordure décorative `border-default` et la grille ne sont pas soumises au seuil. **220 paires vérifiées, 0 échec** après les ajustements ci-dessous.

Ajustements apportés à la palette de départ :

| Problème initial | Ratio | Correction |
|---|---:|---|
| Texte blanc sur orange de marque `#f97316` (CTA) | 2,80 | `accent-solid` = `#c2410c` en light (5,18) ; en dark, `#f97316` avec texte `#020617` |
| Orange `#f97316` utilisé comme trait ou icône sur blanc | 2,80 | `accent` = `#ea580c` (3,56) ; `#f97316` réservé au décoratif (`accent-brand`) |
| Texte blanc sur le survol dark `#3b82f6` | 3,68 | `primary-solid-hover` dark = `#1d4ed8` (6,70) |
| Trait succès `#16a34a` sur le fond widget Light+ `#f3f3f3` (et 3,15 sur son propre fond) | 2,97 | `graph-success-fg` / `status-success-fg` = `#15803d` |
| Trait retry `#d97706` sur `#fffbeb` (marge trop faible : 3,07) | 3,07 | `graph-retry-fg` = `#b45309` |
| Bordure de champ slate-400 `#94a3b8` sur blanc | 2,56 | `border-strong` = `#64748b` (4,76) |
| Trait de séquence slate-400 sur blanc | 2,56 | `graph-sequence-fg` = `#64748b` |

Valeurs de référence de la marque :

| Paire | Ratio | Verdict |
|---|---:|---|
| `#2563eb` sur `#ffffff` | 5,17 | Texte AA |
| `#f97316` sur `#ffffff` | 2,80 | Décoratif uniquement |
| `#ffffff` sur `#ea580c` | 3,56 | Grand texte ou UI seulement |
| `#009cdf` (cyan logo) sur `#ffffff` | 3,08 | UI ou grand texte seulement |
| `#f97316` sur `#0f172a` | 6,37 | Texte AA en dark |
| `#2563eb` sur `#0f172a` | 3,45 | UI seulement en dark : on utilise `#60a5fa` pour le texte |

Les paires les plus justes (marge < 0,6) sont `text-subtle` sur `bg-surface` en light (4,55), `border-strong` sur `bg-surface` en dark (3,07), `accent` sur `bg-surface` en light (3,40) et le trait `async-send` sur son fond en light (3,35). Il ne faut pas éclaircir ces teintes.

<details>
<summary>Table complète (110 paires × light/dark), générée par <code>tools/gen_tokens.py</code></summary>

| Paire | Seuil | Light (fg / bg) | Ratio | Dark (fg / bg) | Ratio |
|---|---:|---|---:|---|---:|
| `text-default / bg-canvas` | 4.5 | `#0f172a` / `#ffffff` | 17.85 | `#f1f5f9` / `#0f172a` | 16.30 |
| `text-default / bg-surface` | 4.5 | `#0f172a` / `#f8fafc` | 17.06 | `#f1f5f9` / `#1e293b` | 13.35 |
| `text-default / bg-raised` | 4.5 | `#0f172a` / `#ffffff` | 17.85 | `#f1f5f9` / `#1e293b` | 13.35 |
| `text-muted / bg-canvas` | 4.5 | `#475569` / `#ffffff` | 7.58 | `#cbd5e1` / `#0f172a` | 12.02 |
| `text-muted / bg-surface` | 4.5 | `#475569` / `#f8fafc` | 7.24 | `#cbd5e1` / `#1e293b` | 9.85 |
| `text-muted / bg-raised` | 4.5 | `#475569` / `#ffffff` | 7.58 | `#cbd5e1` / `#1e293b` | 9.85 |
| `text-subtle / bg-canvas` | 4.5 | `#64748b` / `#ffffff` | 4.76 | `#94a3b8` / `#0f172a` | 6.96 |
| `text-subtle / bg-surface` | 4.5 | `#64748b` / `#f8fafc` | 4.55 | `#94a3b8` / `#1e293b` | 5.71 |
| `text-subtle / bg-raised` | 4.5 | `#64748b` / `#ffffff` | 4.76 | `#94a3b8` / `#1e293b` | 5.71 |
| `text-link / bg-canvas` | 4.5 | `#1d4ed8` / `#ffffff` | 6.70 | `#60a5fa` / `#0f172a` | 7.02 |
| `text-link / bg-surface` | 4.5 | `#1d4ed8` / `#f8fafc` | 6.41 | `#60a5fa` / `#1e293b` | 5.75 |
| `text-link / bg-raised` | 4.5 | `#1d4ed8` / `#ffffff` | 6.70 | `#60a5fa` / `#1e293b` | 5.75 |
| `accent-text / bg-canvas` | 4.5 | `#c2410c` / `#ffffff` | 5.18 | `#fdba74` / `#0f172a` | 10.59 |
| `accent-text / bg-surface` | 4.5 | `#c2410c` / `#f8fafc` | 4.95 | `#fdba74` / `#1e293b` | 8.67 |
| `accent-text / bg-raised` | 4.5 | `#c2410c` / `#ffffff` | 5.18 | `#fdba74` / `#1e293b` | 8.67 |
| `text-default / bg-sunken` | 4.5 | `#0f172a` / `#f1f5f9` | 16.30 | `#f1f5f9` / `#020617` | 18.41 |
| `text-default / bg-selected` | 4.5 | `#0f172a` / `#eff6ff` | 16.40 | `#f1f5f9` / `#192f57` | 12.09 |
| `text-default / bg-hover` | 4.5 | `#0f172a` / `#f1f5f9` | 16.30 | `#f1f5f9` / `#334155` | 9.45 |
| `on-primary / primary-solid` | 4.5 | `#ffffff` / `#2563eb` | 5.17 | `#ffffff` / `#2563eb` | 5.17 |
| `on-primary / primary-solid-hover` | 4.5 | `#ffffff` / `#1d4ed8` | 6.70 | `#ffffff` / `#1d4ed8` | 6.70 |
| `on-accent / accent-solid` | 4.5 | `#ffffff` / `#c2410c` | 5.18 | `#020617` / `#f97316` | 7.20 |
| `primary-subtle-text / primary-subtle` | 4.5 | `#1e40af` / `#eff6ff` | 8.01 | `#bfdbfe` / `#172a4f` | 9.98 |
| `accent-subtle-text / accent-subtle` | 4.5 | `#9a3412` / `#fff7ed` | 6.88 | `#fed7aa` / `#342627` | 10.68 |
| `primary / bg-canvas (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#0f172a` | 7.02 |
| `primary / bg-surface (UI)` | 3 | `#2563eb` / `#f8fafc` | 4.94 | `#60a5fa` / `#1e293b` | 5.75 |
| `accent / bg-canvas (UI)` | 3 | `#ea580c` / `#ffffff` | 3.56 | `#fb923c` / `#0f172a` | 7.89 |
| `accent / bg-surface (UI)` | 3 | `#ea580c` / `#f8fafc` | 3.40 | `#fb923c` / `#1e293b` | 6.46 |
| `focus-ring / bg-canvas (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#0f172a` | 7.02 |
| `focus-ring / bg-surface (UI)` | 3 | `#2563eb` / `#f8fafc` | 4.94 | `#60a5fa` / `#1e293b` | 5.75 |
| `border-strong / bg-canvas (UI)` | 3 | `#64748b` / `#ffffff` | 4.76 | `#64748b` / `#0f172a` | 3.75 |
| `border-strong / bg-surface (UI)` | 3 | `#64748b` / `#f8fafc` | 4.55 | `#64748b` / `#1e293b` | 3.07 |
| `status-success-text / status-success-bg` | 4.5 | `#166534` / `#f0fdf4` | 6.81 | `#bbf7d0` / `#123332` | 11.21 |
| `status-success-fg / bg-canvas (UI)` | 3 | `#15803d` / `#ffffff` | 5.02 | `#4ade80` / `#0f172a` | 10.25 |
| `status-warning-text / status-warning-bg` | 4.5 | `#92400e` / `#fffbeb` | 6.84 | `#fde68a` / `#342d25` | 10.89 |
| `status-warning-fg / bg-canvas (UI)` | 3 | `#b45309` / `#ffffff` | 5.02 | `#fbbf24` / `#0f172a` | 10.69 |
| `status-danger-text / status-danger-bg` | 4.5 | `#991b1b` / `#fef2f2` | 7.60 | `#fecaca` / `#331e2e` | 10.63 |
| `status-danger-fg / bg-canvas (UI)` | 3 | `#dc2626` / `#ffffff` | 4.83 | `#f87171` / `#0f172a` | 6.45 |
| `status-info-text / status-info-bg` | 4.5 | `#1e40af` / `#eff6ff` | 8.01 | `#bfdbfe` / `#16284b` | 10.27 |
| `status-info-fg / bg-canvas (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#0f172a` | 7.02 |
| `graph-input-text / graph-input-bg` | 4.5 | `#155e75` / `#ecfeff` | 6.99 | `#a5f3fc` / `#0e3045` | 11.02 |
| `graph-input-text / graph-canvas` | 4.5 | `#155e75` / `#ffffff` | 7.27 | `#a5f3fc` / `#0f172a` | 14.30 |
| `graph-input-fg / graph-canvas (UI)` | 3 | `#0891b2` / `#ffffff` | 3.68 | `#22d3ee` / `#0f172a` | 9.88 |
| `graph-input-fg / graph-node-bg (UI)` | 3 | `#0891b2` / `#ffffff` | 3.68 | `#22d3ee` / `#1e293b` | 8.09 |
| `graph-input-fg / graph-input-bg (UI)` | 3 | `#0891b2` / `#ecfeff` | 3.54 | `#22d3ee` / `#0e3045` | 7.61 |
| `graph-output-text / graph-output-bg` | 4.5 | `#5b21b6` / `#f5f3ff` | 8.19 | `#ddd6fe` / `#23224b` | 10.79 |
| `graph-output-text / graph-canvas` | 4.5 | `#5b21b6` / `#ffffff` | 8.98 | `#ddd6fe` / `#0f172a` | 12.86 |
| `graph-output-fg / graph-canvas (UI)` | 3 | `#7c3aed` / `#ffffff` | 5.70 | `#a78bfa` / `#0f172a` | 6.56 |
| `graph-output-fg / graph-node-bg (UI)` | 3 | `#7c3aed` / `#ffffff` | 5.70 | `#a78bfa` / `#1e293b` | 5.38 |
| `graph-output-fg / graph-output-bg (UI)` | 3 | `#7c3aed` / `#f5f3ff` | 5.20 | `#a78bfa` / `#23224b` | 5.50 |
| `graph-step-http-text / graph-step-http-bg` | 4.5 | `#1e40af` / `#eff6ff` | 8.01 | `#bfdbfe` / `#16284b` | 10.27 |
| `graph-step-http-text / graph-canvas` | 4.5 | `#1e40af` / `#ffffff` | 8.72 | `#bfdbfe` / `#0f172a` | 12.56 |
| `graph-step-http-fg / graph-canvas (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#0f172a` | 7.02 |
| `graph-step-http-fg / graph-node-bg (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#1e293b` | 5.75 |
| `graph-step-http-fg / graph-step-http-bg (UI)` | 3 | `#2563eb` / `#eff6ff` | 4.75 | `#60a5fa` / `#16284b` | 5.74 |
| `graph-async-send-text / graph-async-send-bg` | 4.5 | `#9a3412` / `#fff7ed` | 6.88 | `#fed7aa` / `#342627` | 10.68 |
| `graph-async-send-text / graph-canvas` | 4.5 | `#9a3412` / `#ffffff` | 7.31 | `#fed7aa` / `#0f172a` | 13.19 |
| `graph-async-send-fg / graph-canvas (UI)` | 3 | `#ea580c` / `#ffffff` | 3.56 | `#fb923c` / `#0f172a` | 7.89 |
| `graph-async-send-fg / graph-node-bg (UI)` | 3 | `#ea580c` / `#ffffff` | 3.56 | `#fb923c` / `#1e293b` | 6.46 |
| `graph-async-send-fg / graph-async-send-bg (UI)` | 3 | `#ea580c` / `#fff7ed` | 3.35 | `#fb923c` / `#342627` | 6.39 |
| `graph-async-receive-text / graph-async-receive-bg` | 4.5 | `#115e59` / `#f0fdfa` | 7.27 | `#99f6e4` / `#10313e` | 10.88 |
| `graph-async-receive-text / graph-canvas` | 4.5 | `#115e59` / `#ffffff` | 7.58 | `#99f6e4` / `#0f172a` | 14.16 |
| `graph-async-receive-fg / graph-canvas (UI)` | 3 | `#0d9488` / `#ffffff` | 3.74 | `#2dd4bf` / `#0f172a` | 9.59 |
| `graph-async-receive-fg / graph-node-bg (UI)` | 3 | `#0d9488` / `#ffffff` | 3.74 | `#2dd4bf` / `#1e293b` | 7.86 |
| `graph-async-receive-fg / graph-async-receive-bg (UI)` | 3 | `#0d9488` / `#f0fdfa` | 3.59 | `#2dd4bf` / `#10313e` | 7.37 |
| `graph-workflow-call-text / graph-workflow-call-bg` | 4.5 | `#86198f` / `#fdf4ff` | 7.67 | `#f5d0fe` / `#2f1f4a` | 10.83 |
| `graph-workflow-call-text / graph-canvas` | 4.5 | `#86198f` / `#ffffff` | 8.24 | `#f5d0fe` / `#0f172a` | 13.04 |
| `graph-workflow-call-fg / graph-canvas (UI)` | 3 | `#c026d3` / `#ffffff` | 4.71 | `#e879f9` / `#0f172a` | 7.25 |
| `graph-workflow-call-fg / graph-node-bg (UI)` | 3 | `#c026d3` / `#ffffff` | 4.71 | `#e879f9` / `#1e293b` | 5.94 |
| `graph-workflow-call-fg / graph-workflow-call-bg (UI)` | 3 | `#c026d3` / `#fdf4ff` | 4.39 | `#e879f9` / `#2f1f4a` | 6.03 |
| `graph-success-text / graph-success-bg` | 4.5 | `#166534` / `#f0fdf4` | 6.81 | `#bbf7d0` / `#123332` | 11.21 |
| `graph-success-text / graph-canvas` | 4.5 | `#166534` / `#ffffff` | 7.13 | `#bbf7d0` / `#0f172a` | 14.73 |
| `graph-success-fg / graph-canvas (UI)` | 3 | `#15803d` / `#ffffff` | 5.02 | `#4ade80` / `#0f172a` | 10.25 |
| `graph-success-fg / graph-node-bg (UI)` | 3 | `#15803d` / `#ffffff` | 5.02 | `#4ade80` / `#1e293b` | 8.40 |
| `graph-success-fg / graph-success-bg (UI)` | 3 | `#15803d` / `#f0fdf4` | 4.79 | `#4ade80` / `#123332` | 7.80 |
| `graph-failure-text / graph-failure-bg` | 4.5 | `#991b1b` / `#fef2f2` | 7.60 | `#fecaca` / `#331e2e` | 10.63 |
| `graph-failure-text / graph-canvas` | 4.5 | `#991b1b` / `#ffffff` | 8.31 | `#fecaca` / `#0f172a` | 12.34 |
| `graph-failure-fg / graph-canvas (UI)` | 3 | `#dc2626` / `#ffffff` | 4.83 | `#f87171` / `#0f172a` | 6.45 |
| `graph-failure-fg / graph-node-bg (UI)` | 3 | `#dc2626` / `#ffffff` | 4.83 | `#f87171` / `#1e293b` | 5.29 |
| `graph-failure-fg / graph-failure-bg (UI)` | 3 | `#dc2626` / `#fef2f2` | 4.41 | `#f87171` / `#331e2e` | 5.56 |
| `graph-retry-text / graph-retry-bg` | 4.5 | `#92400e` / `#fffbeb` | 6.84 | `#fde68a` / `#342d25` | 10.89 |
| `graph-retry-text / graph-canvas` | 4.5 | `#92400e` / `#ffffff` | 7.09 | `#fde68a` / `#0f172a` | 14.33 |
| `graph-retry-fg / graph-canvas (UI)` | 3 | `#b45309` / `#ffffff` | 5.02 | `#fbbf24` / `#0f172a` | 10.69 |
| `graph-retry-fg / graph-node-bg (UI)` | 3 | `#b45309` / `#ffffff` | 5.02 | `#fbbf24` / `#1e293b` | 8.76 |
| `graph-retry-fg / graph-retry-bg (UI)` | 3 | `#b45309` / `#fffbeb` | 4.84 | `#fbbf24` / `#342d25` | 8.13 |
| `graph-end-text / graph-end-bg` | 4.5 | `#1e293b` / `#f1f5f9` | 13.35 | `#e2e8f0` / `#1d263a` | 12.25 |
| `graph-end-text / graph-canvas` | 4.5 | `#1e293b` / `#ffffff` | 14.63 | `#e2e8f0` / `#0f172a` | 14.48 |
| `graph-end-fg / graph-canvas (UI)` | 3 | `#334155` / `#ffffff` | 10.35 | `#cbd5e1` / `#0f172a` | 12.02 |
| `graph-end-fg / graph-node-bg (UI)` | 3 | `#334155` / `#ffffff` | 10.35 | `#cbd5e1` / `#1e293b` | 9.85 |
| `graph-end-fg / graph-end-bg (UI)` | 3 | `#334155` / `#f1f5f9` | 9.45 | `#cbd5e1` / `#1d263a` | 10.17 |
| `graph-depends-on-text / graph-depends-on-bg` | 4.5 | `#3730a3` / `#eef2ff` | 8.88 | `#c7d2fe` / `#1c244a` | 10.05 |
| `graph-depends-on-text / graph-canvas` | 4.5 | `#3730a3` / `#ffffff` | 9.93 | `#c7d2fe` / `#0f172a` | 11.97 |
| `graph-depends-on-fg / graph-canvas (UI)` | 3 | `#4f46e5` / `#ffffff` | 6.29 | `#818cf8` / `#0f172a` | 5.98 |
| `graph-depends-on-fg / graph-node-bg (UI)` | 3 | `#4f46e5` / `#ffffff` | 6.29 | `#818cf8` / `#1e293b` | 4.90 |
| `graph-depends-on-fg / graph-depends-on-bg (UI)` | 3 | `#4f46e5` / `#eef2ff` | 5.62 | `#818cf8` / `#1c244a` | 5.03 |
| `graph-sequence-text / graph-sequence-bg` | 4.5 | `#475569` / `#f8fafc` | 7.24 | `#cbd5e1` / `#1d263a` | 10.17 |
| `graph-sequence-text / graph-canvas` | 4.5 | `#475569` / `#ffffff` | 7.58 | `#cbd5e1` / `#0f172a` | 12.02 |
| `graph-sequence-fg / graph-canvas (UI)` | 3 | `#64748b` / `#ffffff` | 4.76 | `#94a3b8` / `#0f172a` | 6.96 |
| `graph-sequence-fg / graph-node-bg (UI)` | 3 | `#64748b` / `#ffffff` | 4.76 | `#94a3b8` / `#1e293b` | 5.71 |
| `graph-sequence-fg / graph-sequence-bg (UI)` | 3 | `#64748b` / `#f8fafc` | 4.55 | `#94a3b8` / `#1d263a` | 5.89 |
| `graph-node-selected / graph-canvas (UI)` | 3 | `#2563eb` / `#ffffff` | 5.17 | `#60a5fa` / `#0f172a` | 7.02 |
| `method-get-text / method-get-bg` | 4.5 | `#166534` / `#dcfce7` | 6.49 | `#86efac` / `#1f4b43` | 6.97 |
| `method-get-on-solid / method-get-solid` | 4.5 | `#ffffff` / `#15803d` | 5.02 | `#020617` / `#4ade80` | 11.58 |
| `method-post-text / method-post-bg` | 4.5 | `#1e40af` / `#dbeafe` | 7.15 | `#93c5fd` / `#243d64` | 6.04 |
| `method-post-on-solid / method-post-solid` | 4.5 | `#ffffff` / `#1d4ed8` | 6.70 | `#020617` / `#60a5fa` | 7.93 |
| `method-put-text / method-put-bg` | 4.5 | `#92400e` / `#fef3c7` | 6.37 | `#fcd34d` / `#4d4330` | 6.74 |
| `method-put-on-solid / method-put-solid` | 4.5 | `#ffffff` / `#b45309` | 5.02 | `#020617` / `#fbbf24` | 12.08 |
| `method-patch-text / method-patch-bg` | 4.5 | `#115e59` / `#ccfbf1` | 6.73 | `#5eead4` / `#1c4853` | 6.76 |
| `method-patch-on-solid / method-patch-solid` | 4.5 | `#ffffff` / `#0f766e` | 5.47 | `#020617` / `#2dd4bf` | 10.84 |
| `method-delete-text / method-delete-bg` | 4.5 | `#991b1b` / `#fee2e2` | 6.80 | `#fca5a5` / `#4c2f3d` | 6.21 |
| `method-delete-on-solid / method-delete-solid` | 4.5 | `#ffffff` / `#b91c1c` | 6.47 | `#020617` / `#f87171` | 7.29 |

</details>

---

## 4. Nom, lockup, symbole

### 4.1 Proposition de nom unifié

**Recommandé : « Arazzo Studio » et « Arazzo for VS Code », signés « by ConnEthics ».**

| Surface | Nom | Remplace |
|---|---|---|
| App web (`arazzo.connethics.com`) | **Arazzo Studio by ConnEthics**. Les vues gardent des noms fonctionnels : *Editor*, *Graph*, *Docs*, *Showcase*. | Arazzo Builder, Playground, Visualizer |
| Extension (`displayName`) | **Arazzo for VS Code — by ConnEthics** (id inchangé : `connethics.arazzo-vscode`) | Arazzo VSCode, Arazzo Spec Editor |
| Paquets npm | `@connethics/arazzo-core`, `@connethics/arazzo-flow` | — |
| Landing website | `/arazzo` : « Arazzo by ConnEthics » (famille de produits) | — |
| Fichier skill | « Arazzo Skill by ConnEthics » | — |

Pourquoi ce choix :
- « Arazzo » en tête garantit la découvrabilité (recherche Marketplace, npm, SEO).
- « Studio » couvre l'édition, la visualisation et la doc sans réduire l'outil à un *playground*.
- La forme « *X* for VS Code » est l'usage courant sur la Marketplace et respecte la consigne de Microsoft de ne pas faire de « VS Code » le nom du produit.
- « by ConnEthics » signale que l'outil n'est pas officiel OAI et porte la marque.

Alternatives :

1. **Marque en tête** : « ConnEthics Arazzo Studio » et « ConnEthics Arazzo for VS Code ». Avantage : la visibilité ConnEthics est maximale. Inconvénient : le nom est long et tronqué dans la Marketplace, et la recherche « arazzo » est moins bien servie.
2. **Nom propre** : « **Telaio** — Arazzo workflows by ConnEthics » (*telaio* = « métier à tisser » en italien, qui prolonge la métaphore de la tapisserie). Cela donne « Telaio Studio » et « Telaio for VS Code ». Avantage : nom distinctif et déposable, qui ne dépend pas du nom de la spec. Inconvénient : il faut créer la notoriété, et le sous-titre « Arazzo » reste indispensable pour le SEO.

À vérifier avant l'adoption : disponibilité du nom (Marketplace, npm, domaines, INPI/EUIPO) et politique de marque de la Linux Foundation / OAI sur l'usage d'« Arazzo » dans un nom de produit.

### 4.2 Orthographe canonique

- Dans la prose, les métadonnées, les licences, les mentions de copyright et l'attribut `alt` : **ConnEthics** uniquement (C et E majuscules, sans espace).
- `connethics` en minuscules est réservé aux identifiants (domaines, e-mails, éditeur Marketplace, scope npm `@connethics`, handles).
- `connEthics` n'est toléré que dans l'URL de l'org GitHub existante. Renommer l'org casserait des liens ; GitHub redirige, mais c'est à décider en D7. Dans le texte d'un lien, écrire « ConnEthics/arazzo-vscode ».
- `CONNETHICS` est réservé au mot-symbole du logo et à la raison sociale.
- Corrections à faire (lots A1, V3, W1) : `layout.tsx:35-37` de la démo, `LICENSE.md`, `README.md`, `components/arazzo/LICENSE`, `docs/ARAZZO_REFERENCE.md`, `website/src/content/arazzo-presentation.md:56-57`.

### 4.3 Lockup texte

```text
 ┌──────┐  Arazzo Studio            ← Inter Bold, --ce-text-default ; « Studio » en Inter Regular
 │ ▦▦▦  │  by ConnEthics            ← Inter Medium à 50 % de la taille ; « Conn » --ce-text-default,
 └──────┘                              « Ethics » --ce-primary (rappel du logo : CONN noir / ETHICS bleu)
```

- Variante horizontale : symbole, puis le nom, puis « by ConnEthics » en ligne, séparé par un filet `--ce-border-default`.
- Variante extension : « Arazzo for VS Code » et « by ConnEthics ».
- Zone de protection autour du symbole : ¼ de la hauteur du symbole. Taille minimale du symbole : 16 px ; lockup complet : 24 px de haut.
- L'orange n'est **jamais** utilisé pour le texte du lockup en light : il ne passe pas le contraste. Il n'apparaît que dans le symbole.
- Le logo ConnEthics complet (bouclier) reste la signature de l'entreprise : footer, page « À propos » et mentions. On ne le fusionne pas avec le symbole produit.

### 4.4 Symbole `arazzo-mark.svg`

Tuile slate-900 (`#0f172a`, rayon 14/64) qui porte un tissage 1/1. Trois fils de chaîne verticaux en bleu ConnEthics `#2563eb` croisent trois fils de trame horizontaux en orange `#f97316`, en alternant dessus et dessous. Lecture : *arazzo* = tapisserie, des fils (API) entrelacés en un motif (workflow). Les croisements évoquent aussi les nœuds d'un graphe. La tuile sombre le rend lisible sur fond clair comme sur fond sombre, et l'orange y atteint 6,4:1. Il reste lisible à 16 px (vérifié par rendu Chrome headless).

Usages possibles : favicon du Studio (à la place de l'éclair indigo), icône de l'extension (version 256 px à dériver, voir D5), avatar npm et GitHub, OG image.

---

## 5. Licences : recommandations (décision à prendre)

Contrainte technique : le plan prévoit d'embarquer `arazzo-core` et `arazzo-flow`, qui vivent dans arazzo-demo, dans l'extension MIT et dans le website. **Ces paquets doivent donc être sous licence permissive**, quelle que soit l'option retenue pour l'app.

| Option | App Studio (`app/`) | Paquets `packages/*` | Message public | Pour | Contre |
|---|---|---|---|---|---|
| **A — Tout MIT** (recommandée si le code n'est pas l'actif commercial) | MIT | MIT | « Open Source (MIT) » | Cohérent avec l'extension et l'accroche actuelle. Adoption et visibilité maximales, contributions possibles. Le levier commercial est l'accompagnement ConnEthics (audit, design, gouvernance). | Un concurrent peut héberger un clone. |
| **B — Cœur ouvert, app source-available** | FSL-1.1-MIT (bascule en MIT après 2 ans) ou PolyForm Noncommercial | MIT (ou Apache-2.0, qui ajoute une clause brevets) | « Source available, free to use online ; core libraries open source (MIT) » | Protège l'app hébergée tout en ouvrant le cœur réutilisable. | Deux licences à expliquer. Il faut retirer « Open Source • Free Forever ». |
| **C — Statu quo propriétaire** | Propriétaire | MIT (obligatoire pour le vendoring) | « Free to use online », sans mention open source | Contrôle maximal. | Contredit l'image *open* de la refonte et freine l'adoption. Le texte actuel « open source but not free » reste contradictoire. |

Corrections nécessaires quelle que soit l'option :
- Supprimer le badge MIT erroné, ou le rendre vrai.
- Aligner l'accroche de la landing sur la licence réelle.
- Ajouter un champ `license` dans `package.json`.
- Utiliser l'orthographe « ConnEthics » et une année cohérente.
- Remplacer le « MIT + clause de lien » par un MIT standard (l'attribution se demande dans le README) ou par Apache-2.0 (fichier NOTICE).
- Définir le périmètre exact des fichiers sous licence ouverte.
- Pour le website, préciser « code MIT, contenus et marques © ConnEthics, tous droits réservés ».

---

## 6. Décisions à faire valider par l'utilisateur

| # | Décision | Recommandation B1 | Impact |
|---|---|---|---|
| **D1** | Nom produit | « Arazzo Studio by ConnEthics » (web) et « Arazzo for VS Code — by ConnEthics » (extension). Alternatives : marque en tête ou « Telaio ». | A1, V3, W1, W2, W3, Q1 |
| **D2** | Bleu de référence | `#2563eb` canonique partout. Le cyan logo `#009cdf` est réservé au logo historique. Aligner le MUI (`#0284c7`) et le `blue-*` OKLCH de Tailwind 4 sur la marque (lot W0). Abandonner l'indigo/violet de la démo. | W0, A1, V2 |
| **D3** | Palette du graphe | Celle des § 2.2 et 2.3. Changements par rapport à l'existant : input emerald → **cyan**, output amber/violet → **violet**, étape indigo → **bleu primaire**, PATCH orange → **teal**. L'orange est réservé à `async-send` et à la marque. | D1 (maquettes), G1, V2 |
| **D4** | Licence arazzo-demo | **Option A (tout MIT)**. À défaut, option B. Dans tous les cas, `packages/*` sous MIT. | A1, C1, G1, V3 |
| **D5** | Icône de l'extension | Court terme : `icon-256.png` (fournie). Pour la v2.0.0 : nouvelle icône dérivée de `arazzo-mark.svg`, sur fond transparent, sans texte ni document. L'actuelle est illisible à 128 px et son fond opaque est clair. | V3 |
| **D6** | Symbole produit | Adopter `arazzo-mark.svg`, à faire retravailler par un designer si besoin. Il remplacerait le favicon éclair de la démo. | A1, V3, W2 |
| **D7** | Orthographe et org GitHub | « ConnEthics » partout dans la prose. Garder le slug `connEthics` de l'org, ou le renommer en `connethics` : GitHub redirige, mais les URL publiées changent. | Q1 |
| **D8** | Intégration VS Code | Le chrome suit le thème VS Code (bridge), le graphe garde les couleurs de marque. | V2 |
| **D9** | Police | Inter / JetBrains Mono pour le web, la démo comprise (abandon de Geist et du fallback Arial). Polices de l'éditeur dans VS Code. | A1 |
| **D10** | Signature et contact | Choisir une signature unique : corriger « Build for Ethical Connexions » en « Built for ethical connections », ou garder « Ethical Connections in a Competitive World ». Choisir un e-mail unique (`contact@` ou `hello@`). Supprimer le téléphone fictif `+1 (555)`. | W0, V3 |
| **D11** | Mode sombre du website | Garder le site en light, conformément à l'existant. Le graphe embarqué de la landing (W2) suit le thème light. Les tokens dark servent la démo et l'extension. | W2 |
