# R1 — Delta normatif Arazzo 1.0.1 → 1.1.0

> Lot R1 de la refonte Arazzo 1.1.0 (ConnEthics). Entrée du lot C1 (`@connethics/arazzo-core`).
> Rédigé le 16/11/2026. Toutes les sources ont été relues à cette date (voir § e).

**Conventions de citation**
- `§5.x` renvoie au texte **1.1.0** (https://spec.openapis.org/arazzo/v1.1.0.html). `§4.x` renvoie au texte **1.0.1** (https://spec.openapis.org/arazzo/v1.0.1.html). La numérotation a été décalée d'un niveau en 1.1.0 : par exemple, l'objet Step est au §4.6.5 en 1.0.1 et au §5.8.5 en 1.1.0.
- `S10:` désigne un chemin dans le schéma 1.0 `https://spec.openapis.org/arazzo/1.0/schema/2025-10-15`. `S11:` désigne un chemin dans le schéma 1.1 `https://spec.openapis.org/arazzo/1.1/schema/2026-04-15`.
- `DEV:` désigne la branche `v1.1-dev` du dépôt `OAI/Arazzo-Specification`, à l'état du 11/11/2026 (commit `22be335`). Elle contient des corrections postérieures à la publication de la 1.1.0, qui préfigurent probablement une 1.1.1.

**Schémas récupérés** : oui, tous les deux, en JSON natif, sans conversion. Ils sont enregistrés dans `research/schemas/` :

| Fichier | `$id` | SHA-256 |
|---|---|---|
| `arazzo-1.0.schema.json` | `https://spec.openapis.org/arazzo/1.0/schema/2025-10-15` | `b8715bd824fffcb2accf5077977d37c9e7a15be60d785e7a3a51cf600fd46ad4` |
| `arazzo-1.1.schema.json` | `https://spec.openapis.org/arazzo/1.1/schema/2026-04-15` | `37be908409bdb2f7bffe61fa23685c7e84cbeebfafac475a1d01dbc50ff7ab9e` |

Méthode :
- Diff structuré des `$defs` par un script Python : aplatissement en chemins JSON Pointer, puis comparaison mot-clé par mot-clé.
- Comparaison des textes 1.0.1 et 1.1.0 : HTML publié converti avec pandoc, et sources Markdown `versions/*.md` du dépôt OAI.
- Exécution de la suite officielle de fixtures `tests/schema/{pass,fail}` de `v1.1-dev` (75 fichiers) contre S11 et contre le schéma DEV, avec `jsonschema` 4.26 (draft 2020-12).
- Environ 70 sondes ciblées sur les cas limites. Leurs résultats sont cités dans le texte sous la forme « *sonde* ».

---

## (a) Résumé

La 1.1.0 (publiée le 17/05/2026, §8) est une version **mineure, rétrocompatible au niveau du texte** : un document 1.0.x reste un document 1.0.x valide. Le schéma 1.1, lui, n'accepte que `arazzo: 1.1.x` (`S11:#/properties/arazzo/pattern` = `^1\.1\.\d+(-.+)?$`). Il faut donc **sélectionner le schéma selon la valeur de `arazzo`**.

Nouveautés normatives :
1. **AsyncAPI** :
   - `sourceDescriptions[].type: asyncapi` ;
   - nouvelle cible d'étape `channelPath` ;
   - nouveaux champs `action` (`send`|`receive`), `correlationId` (réservé à `receive`) et `timeout` (entier, en millisecondes, applicable à **toute** étape) ;
   - nouvelle expression `$message.{header|payload}` ;
   - sémantique de succès des étapes asynchrones (§5.8.5.3).
2. **`dependsOn` au niveau de l'étape** (§5.8.5.1, §5.8.5.2), sous trois formes :
   - `stepId` local ;
   - `$workflows.<wf>.steps.<step>` ;
   - `$sourceDescriptions.<src>.<wf>.steps.<step>`.

   Il établit un point de jonction **sans déclencher** l'étape référencée. Les références `$steps.x.outputs` créent des dépendances implicites.
3. **Réutilisation de workflows depuis les actions** : un champ `parameters` sur les Success et Failure Actions. Il n'est autorisé qu'avec `workflowId`, et `in` y est interdit (§5.8.7, §5.8.8).
4. **Selector Object** (§5.8.13) : `{context, selector, type}`, en jsonpath, xpath ou jsonpointer. Il est utilisable dans les `outputs` de workflow et d'étape, dans `Parameter.value`, dans `RequestBody.payload` et dans `PayloadReplacement.value`.
5. **Expression Type Object** (§5.8.12) : il remplace le *Criterion Expression Type Object* de la 1.0. Il ajoute le type `jsonpointer` (`rfc6901`) et les versions `rfc9535` et `xpath-31`, avec une table des valeurs par défaut. On le trouve désormais dans Criterion, Selector et `PayloadReplacement.targetSelectorType`.
6. **`in: querystring`** (alignement sur OAS 3.2). Il ne peut pas coexister avec des paramètres `query` dans la même opération (§5.8.6), et sa valeur est une chaîne complète.
7. **`$self`** à la racine (§5.8.1.1) : une URI-reference sans fragment, qui sert d'URI de base (§5.6.1) et d'identité de référence (§5.5.2). Le texte ajoute des règles de parsing complet (§5.5), une distinction URI/URL (§5.6, §5.7) et l'annexe B.
8. **Clarifications d'implémentation** :
   - ABNF des runtime expressions réécrite (§5.9) : `identifier-strict` pour les IDs, `$components.{parameters|successActions|failureActions}` et règles d'interpolation ;
   - ordre de résolution de `$sourceDescriptions.<name>.<ref>` (§5.9.2) ;
   - sémantique **truthy/falsy** des critères par type (§5.8.11.4) ;
   - `successCriteria`, s'il est présent, doit contenir au moins un critère.

**Corrections apportées au plan directeur** :
- Les préfixes `x-oai-`, `x-oas-` et `x-arazzo` sont réservés **depuis la 1.0.0**. Ce n'est pas une nouveauté de la 1.1.
- Aucune phrase de la spec ne dit explicitement que « le Selector exige `arazzo: 1.1.0` ». La règle se déduit du §5.1 (`major.minor` = jeu de fonctionnalités) et du schéma.
- `timeout` n'est pas limité aux étapes `receive`, contrairement à ce que laisse entendre Zuplo.

**Défauts relevés dans les artefacts officiels**, à connaître pour C1 :
- L'exemple racine du §5.8.1.2 est **invalide** contre S11 : il utilise `operationPath` avec `action`.
- `PayloadReplacement.value` littéral non-chaîne est rejeté par S11, alors que le texte l'autorise. C'est corrigé dans DEV (PR #614).
- `in: channel` est présent dans S11 mais absent du texte 1.1.0. Il est ajouté dans DEV (PR #615).
- `$message.payload.orderId`, dans les exemples, viole l'ABNF. C'est corrigé dans DEV (PR #627).
- Le schéma 1.0 rejette un Criterion dont le `type` est un Expression Type Object, alors que le texte 1.0.1 l'autorise.

Voir § d.

---

## (b) Diff objet par objet

Légende de la colonne 1.1.0 : 🆕 nouveau, ✏️ modifié, = identique (hors renumérotation).

### b.1 Arazzo Specification Object (racine)

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `arazzo` | `string` REQUIRED. Le schéma impose `^1\.0\.\d+(-.+)?$` | = (texte). Le schéma impose `^1\.1\.\d+(-.+)?$` | §5.8.1.1, §5.1 | `S11:#/properties/arazzo/pattern` |
| `$self` | absent. Rejeté par S10 (`unevaluatedProperties: false`) | 🆕 `string` URI-reference (RFC 3986 §4.1), **MUST NOT** contenir de fragment. Sert d'URI de base (RFC 3986 §5.1.1) et d'identité | §5.8.1.1, §5.5.2, §5.6.1, annexe B | `S11:#/properties/$self` (`format: uri-reference`, `pattern: ^[^#]*$`) |
| `info`, `sourceDescriptions` (≥ 1), `workflows` (≥ 1), `components` | = | = | §5.8.1.1 | `S11:#/properties/*`, `#/required` |
| Extensions `^x-` | oui | = | §5.10 | `S11:#/$ref → #/$defs/specification-extensions` |

Nouvelles sections de texte, sans champ associé :
- §5.5 : parsing complet obligatoire avant toute résolution. Le parsing fragmentaire est « strongly discouraged » et son comportement est indéfini.
- §5.5.2 : référencement par identité (`$self`).
- §5.6 : les références internes à Arazzo sont des URI (identifiants). Elles sont résolues contre une URI de base déterminée selon RFC 3986 §5.1.1 à 5.1.4.
- §5.6.2 : fragments en JSON Pointer ; `$anchor` est supporté dans les `inputs`.
- §5.7 : les endpoints d'API sont des URL, déterminées par le Server Object de l'OpenAPI et non par la base Arazzo.

En 1.0.1, le §4.5 se limitait à « relative references are resolved using the URL of the referring document ».

### b.2 Info Object

Aucun changement (§5.8.2, `S11:#/$defs/info`).

### b.3 Source Description Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `name` | REQUIRED, unique, SHOULD `[A-Za-z0-9_\-]+` | = | §5.8.3.1 | `S11:#/$defs/source-description-object/properties/name/pattern` (le schéma rend la regex obligatoire, aussi en 1.0) |
| `url` | REQUIRED, URI-reference | = (texte). Désormais résolue comme **URI/identifiant**. Si elle est absolue et pointe vers un document Arazzo, elle **MUST** être résolue par identité (`$self`) | §5.8.3.1, §5.5.2, §5.6 | `.../properties/url` (`format: uri-reference`) |
| `type` | `openapi` \| `arazzo` | ✏️ `openapi` \| `asyncapi` \| `arazzo` | §5.8.3.1 | `S11:#/$defs/source-description-object/properties/type/enum` |

### b.4 Workflow Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `dependsOn` | `[string]` de `workflowId` local ou `$sourceDescriptions.<name>.<workflowId>` | = (aucun motif dans le schéma) | §5.8.4.1 | `S11:#/$defs/workflow-object/properties/dependsOn` |
| `steps` | REQUIRED | = (DEV ajoute « The list MUST contain at least one step », PR #632, déjà `minItems: 1` dans les deux schémas) | §5.8.4.1 | `.../properties/steps/minItems` |
| `outputs` | `Map[string, {expression}]` | ✏️ `Map[string, {expression} \| Selector Object]` | §5.8.4.1 | `S11:#/$defs/workflow-object/properties/outputs/patternProperties/^[a-zA-Z0-9\.\-_]+$/oneOf` |
| `parameters`, `successActions`, `failureActions`, `inputs` | — | = | §5.8.4.1 | — |

### b.5 Step Object, restructuré en trois variantes dans le schéma

Dans S10, le Step est un objet unique : `oneOf required [operationId | operationPath | workflowId]`.

Dans S11, `step-object` devient `oneOf` de trois branches, qui partagent `step-object-base` :
- `openapi-step-object` (`S11:#/$defs/openapi-step-object`) : `operationId` XOR `operationPath`.
- `asyncapi-step-object` (`S11:#/$defs/asyncapi-step-object`) : `operationId` XOR `channelPath`, **`action` requis**.
- `workflow-step-object` (`S11:#/$defs/workflow-step-object`) : `workflowId` requis.

Chaque branche porte `unevaluatedProperties: false`.

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `stepId` | REQUIRED, unique dans le workflow, SHOULD `[A-Za-z0-9_\-]+` | = (l'ABNF exige `identifier-strict` pour référencer l'étape) | §5.8.5.1, §5.9 | `S11:#/$defs/step-object-base/properties/stepId` |
| `operationId` | exclusif de `operationPath` et `workflowId` | = (OpenAPI **ou** AsyncAPI) | §5.8.5.1 | `.../openapi-step-object/allOf/1/properties/operationId`, `.../asyncapi-step-object/allOf/1/properties/operationId` |
| `operationPath` | `{$sourceDescriptions.<n>.url}#<json-pointer>` | = (OpenAPI uniquement dans le schéma) | §5.8.5.1 | `.../openapi-step-object/allOf/1/properties/operationPath` |
| `channelPath` | absent | 🆕 référence à une Source Description combinée à un JSON Pointer vers un **channel**. Runtime expression obligatoire pour désigner la source | §5.8.5.1 | `.../asyncapi-step-object/allOf/1/properties/channelPath` (simple `string`) |
| `workflowId` | exclusif | = | §5.8.5.1 | `.../workflow-step-object/allOf/1/properties/workflowId` |
| `action` | absent | 🆕 `send` \| `receive`. « Only applicable for `asyncapi` steps » | §5.8.5.1 | `.../asyncapi-step-object/allOf/1/properties/action/enum`, `.../allOf/1/required` |
| `correlationId` | absent | 🆕 `string`. « Only applicable to `asyncapi` steps with action `receive` », synchronisé avec le correlationId du document AsyncAPI | §5.8.5.1, §5.8.5.3 | `.../asyncapi-step-object/allOf/1/properties/correlationId` (type `string\|number\|boolean\|object\|array`) et `.../allOf/2` (`if correlationId then action const receive`) |
| `timeout` | absent | 🆕 `integer`, en **millisecondes**. Délai maximal avant d'abandonner et de faire échouer l'étape. L'échec déclenche `onFailure`, sinon le workflow échoue | §5.8.5.1, §5.8.5.3 | `S11:#/$defs/step-object-base/properties/timeout` (aucun `minimum`) |
| `dependsOn` | absent au niveau de l'étape | 🆕 `List[string]` de prérequis (voir b.16) | §5.8.5.1, §5.8.5.2 | `S11:#/$defs/step-object-base/properties/dependsOn` (`minItems: 1`, `uniqueItems`, `items.oneOf` à 3 motifs) |
| `parameters` | `in` requis si opération, libre si workflow | = (pour AsyncAPI aussi, `in` est requis) | §5.8.5.1 | `S11:#/$defs/operation-step-parameters` (items : reusable \| parameter avec `required: [in]`), `.../workflow-step-object/allOf/1/properties/parameters` |
| `requestBody` | opérations | = (le texte dit encore « operationId or operationPath » ; la description du schéma ajoute `channelPath`). Pour `send`, c'est le payload du message | §5.8.5.1 | `S11:#/$defs/step-object-base/properties/requestBody` (aussi accepté sur une étape workflow, cf. fixture `characterization-workflow-step-with-requestBody`) |
| `successCriteria` | `[Criterion]` | ✏️ « If provided, MUST contain at least one Criterion » (S10 avait déjà `minItems: 1`). Recommandé pour les `receive` | §5.8.5.1, §5.8.5.3 | `.../step-object-base/properties/successCriteria` |
| `outputs` | `Map[string, {expression}]` | ✏️ `Map[string, {expression} \| Selector]` | §5.8.5.1 | `.../step-object-base/properties/outputs/patternProperties/.../oneOf` |
| `onSuccess`, `onFailure` | — | = | §5.8.5.1 | `.../step-object-base/properties/on*` |

### b.6 Parameter Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `in` | `path` \| `query` \| `header` \| `cookie` | ✏️ ajout de `querystring`. Le schéma S11 ajoute aussi **`channel`**, absent du texte 1.1.0 et ajouté au texte DEV par la PR #615 : nom = paramètre du channel AsyncAPI, valeur substituée dans `{name}` de l'adresse | §5.8.6, §5.8.6.1 | `S11:#/$defs/parameter-object/properties/in/enum` |
| `in` (contexte) | « When the **step** specifies a workflowId → workflow inputs » | ✏️ « When the step, **success action, or failure action** specifies a workflowId → workflow inputs » | §5.8.6.1 | — |
| `value` | `Any \| {expression}`. S10 : `string\|boolean\|object\|array\|number\|null` | ✏️ `Any \| {expression} \| Selector`. Pour `querystring`, la valeur **MUST** se résoudre en chaîne complète (`k1=v1&k2=v2`), avec interpolation `{}` permise. **S11 : `oneOf [string\|boolean\|array\|number\|null, selector-object]`**, ce qui fait qu'un objet littéral non-Selector est **rejeté** | §5.8.6.1 | `S11:#/$defs/parameter-object/properties/value/oneOf` |

### b.7 Success Action Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `parameters` | absent | 🆕 `[Parameter \| Reusable]`. Paramètres **MUST** passés au workflow `workflowId`. Pas de doublons. **`in` MUST NOT be used** | §5.8.7.1 | `S11:#/$defs/success-action-object/properties/parameters` (`items: true`, donc non validés) et `.../allOf/1` (`if parameters then required workflowId`) |
| identité | — | (DEV, PR #620) « A unique success action is defined by its `name` » | §5.8.7 (DEV) | — |
| autres champs | — | = | §5.8.7.1 | — |

### b.8 Failure Action Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `parameters` | absent | 🆕 identique à la Success Action. Pour `retry` + `workflowId`, le workflow est exécuté avec ces entrées, puis l'étape courante est rejouée | §5.8.8, §5.8.8.1 | `S11:#/$defs/failure-action-object/properties/parameters`, `.../allOf/1` |
| identité | — | (DEV, PR #620) unicité par `name` | §5.8.8 (DEV) | — |
| autres champs | — | = (`retryAfter` ≥ 0 en secondes, `retryLimit` ≥ 0, 1 retry par défaut) | §5.8.8.1 | `.../properties/retryAfter/minimum`, `.../retryLimit/minimum` |

### b.9 Components Object

Pas de nouveau champ (§5.8.9). Les clés suivent toujours `^[a-zA-Z0-9\.\-_]+$`, et la portée des composants reste le document (déjà le cas en 1.0.1). Effet indirect : `components.parameters.*.value` hérite du nouveau type de `Parameter.value`, Selector compris. Chemin : `S11:#/$defs/components-object` (seul le `$comment` change).

### b.10 Reusable Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `reference` | `{expression}` REQUIRED | = | §5.8.10.1 | `S11:#/$defs/reusable-object/properties/reference` |
| `value` | texte : `string`. Schéma : tout type JSON | = dans le texte 1.1.0. DEV (PR #616) passe le texte à `Any`. Le schéma n'a pas changé (tout type) | §5.8.10.1 | `.../properties/value/type` |

### b.11 Criterion Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `type` | `simple\|regex\|jsonpath\|xpath` \| Criterion Expression Type Object | ✏️ `... \| Expression Type Object`. Le schéma est corrigé : S10 appliquait l'ETO à l'objet Criterion lui-même (`anyOf`), S11 l'applique à `type` (`oneOf`) | §5.8.11.5 | `S11:#/$defs/criterion-object/properties/type/oneOf` |
| `context` | requis si `type` est présent | = | §5.8.11.5 | `.../dependentRequired/type` |
| Sémantique | non définie | 🆕 §5.8.11.3 (expressions dans les conditions), §5.8.11.4 (évaluation truthy/falsy par type, erreurs = *fail*, critères multiples = ET logique). Voir b.16 | §5.8.11.3 à §5.8.11.4.6 | non couvert |

### b.12 Expression Type Object (anciennement « Criterion Expression Type Object »)

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| nom / portée | Criterion uniquement | ✏️ Criterion **et** Selector, ainsi que `targetSelectorType` | §5.8.12 | `S11:#/$defs/expression-type-object` (renommé depuis `criterion-expression-type-object`) |
| `type` | `jsonpath` \| `xpath` | ✏️ + `jsonpointer` | §5.8.12.1 | `.../properties/type/enum` |
| `version` | jsonpath : `draft-goessner-dispatch-jsonpath-00` ; xpath : `xpath-30\|20\|10` | ✏️ jsonpath : `rfc9535` \| `draft-goessner-dispatch-jsonpath-00` ; xpath : `xpath-31\|30\|20\|10` ; jsonpointer : `rfc6901`. REQUIRED | §5.8.12.1 | `.../allOf/0..2/then/properties/version` |
| défauts | jsonpath RFC 9535, xpath 3.1 | = et formalisés dans un tableau : jsonpath → `rfc9535`, xpath → `xpath-31`, jsonpointer → `rfc6901`. « If this object is not defined, the default version **MUST** be used » | §5.8.12.1 | non couvert |
| EBV | — | 🆕 pour xpath, la valeur booléenne effective (EBV) de la version choisie **MUST** être appliquée | §5.8.12.1 | non couvert |

### b.13 Selector Object (🆕)

| Champ | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|
| `context` | `{expression}` REQUIRED. **MUST** évaluer vers des données structurées (`$response.body`, `$message.payload`, `$steps.x.outputs.y`…) | §5.8.13.1 | `S11:#/$defs/selector-object/properties/context` |
| `selector` | `string` REQUIRED. Expression JSONPath, XPath ou JSON Pointer | §5.8.13.1 | `.../properties/selector` |
| `type` | `string` (`jsonpath` \| `xpath` \| `jsonpointer`) \| Expression Type Object. **REQUIRED** | §5.8.13.1 | `.../properties/type → #/$defs/selector-type` |
| extensions | le texte ne dit rien. Le schéma accepte `^x-` | — | `.../$ref → specification-extensions` |

Emplacements autorisés :
- `Workflow.outputs.*` (`S11:#/$defs/workflow-object/properties/outputs`) ;
- `Step.outputs.*` (`#/$defs/step-object-base/properties/outputs`) ;
- `Parameter.value` (`#/$defs/parameter-object/properties/value`) ;
- `PayloadReplacement.value` (`#/$defs/payload-replacement-object/properties/value`) ;
- dans `RequestBody.payload` : texte §5.8.14.1, mais non validé car le schéma déclare `payload: true`.

Emplacements **non** autorisés : `Criterion.context`, `Reusable.value` (DEV « Any » le rend littéral), `SourceDescription`.

### b.14 Request Body Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `payload` | littéral ou runtime expressions | ✏️ + Selector Objects, à évaluer avant l'appel | §5.8.14.1 | `S11:#/$defs/request-body-object/properties/payload` (`true`) |

### b.15 Payload Replacement Object

| Champ | 1.0.1 | 1.1.0 | Section | Chemin JSON Schema |
|---|---|---|---|---|
| `target` | JSON Pointer ou XPath | ✏️ + JSONPath | §5.8.15.1 | `S11:#/$defs/payload-replacement-object/properties/target` |
| `targetSelectorType` | absent | 🆕 `string` \| ETO. S'il est omis : JSON Pointer pour `application/json`, XPath pour XML (MUST) | §5.8.15.1 | `.../properties/targetSelectorType → #/$defs/selector-type` |
| `value` | texte : `Any \| {expression}`. S10 : `string` seulement | ✏️ texte : `Any \| {expression} \| Selector`. **S11 : `oneOf [string, selector]`**, ce qui fait que l'exemple `value: 10` du §5.8.15.2 est **rejeté**. DEV (commit `444cf4e`, PR #614) : `anyOf [tout type JSON, selector]` | §5.8.15.1 | `S11:#/$defs/payload-replacement-object/properties/value` |

### b.16 Runtime expressions (§5.9 vs §4.7)

| Élément | 1.0.1 | 1.1.0 | Section |
|---|---|---|---|
| `$message.` | absent | 🆕 `"$message." source`, avec `$message.header.<token>` et `$message.payload[#<json-pointer>]` | §5.9, §5.9.1 |
| `payload-reference` | absent | 🆕 dans `source`. Effet de bord de la grammaire : `$response.payload` et `$message.body` sont syntaxiquement valides | §5.9 |
| `$self` | absent | 🆕 expression autonome : URI canonique du document (`$self`) | §5.9, §5.9.1 |
| `$steps.` | `"$steps." name` (libre) | ✏️ `step-id ".outputs." output-name ["#" json-pointer]`, avec `step-id = identifier-strict` (`[A-Za-z0-9_-]+`, sans point) | §5.9 |
| `$workflows.` | libre | ✏️ `workflow-id "." ("inputs"\|"outputs") "." name ["#" ptr]` | §5.9 |
| `$inputs.` / `$outputs.` | `name` | ✏️ `identifier` (points autorisés) + `#json-pointer` optionnel | §5.9 |
| `$sourceDescriptions.` | `name` | ✏️ `source-name "." source-reference-id`, avec `source-name = identifier-strict`. **Ordre de résolution** (§5.9.2) : (1) operationId pour une source OpenAPI, ou workflowId pour une source Arazzo ; (2) sinon, champ de la Source Description (`url`, `type`). En cas de conflit, l'operationId l'emporte | §5.9, §5.9.2 |
| `$components.` | `"$components." name` et `"$components.parameters." name` | ✏️ `("parameters"\|"successActions"\|"failureActions") "." identifier`. **`$components.inputs` n'existe pas** : les inputs passent par `$ref` JSON Schema | §5.9, §5.8.10 |
| JSON Pointer | `unescaped` exclut `/` et `~` | ✏️ exclut aussi `{` et `}` | §5.9 |
| Interpolation `{…}` | « Expressions can be embedded… » | ✏️ `expression-string` / `embedded-expression` formalisés. Les scalaires sont convertis en chaîne. Les structures parsées **MUST** être sérialisées en JSON (RFC 8259). Les chaînes brutes (XML, texte) sont insérées telles quelles | §5.9 |
| Conditions `regex`/`jsonpath`/`xpath` | — | 🆕 les expressions **MUST** être interpolées entre `{}`. Ordre : interpolation, puis évaluation selon `type`, puis pass/fail. La condition doit être quotée en YAML | §5.8.11.3 |

### b.17 Specification Extensions

Aucun changement : `^x-` partout où le texte l'indique. **`x-oai-`, `x-oas-` et `x-arazzo` sont réservés à l'OAI depuis la 1.0.0** (§4.8 en 1.0.1, §5.10 en 1.1.0). Remarque : `x-arazzo` est réservé sans tiret final, donc `x-arazzoFoo` l'est aussi. Le schéma ne fait aucun contrôle (`patternProperties: {"^x-": true}`).

### b.18 Points précisés (étape 4 de la mission)

**1. Formes de `dependsOn`**

Au niveau du workflow (inchangé, §5.8.4.1) : `[string]`, avec deux formes.
- **Local** : `workflowId` d'un workflow du même document.
- **Inter-document** : `$sourceDescriptions.<name>.<workflowId>`, où `<name>` est une source de `type: arazzo`.

Le schéma ne fixe aucun motif.

Au niveau de l'étape (nouveau, §5.8.5.1) : `List[string]` non vide et sans doublon, avec trois formes. Le schéma les valide avec trois motifs (`S11:#/$defs/step-object-base/properties/dependsOn/items/oneOf`).

| Forme | Syntaxe exacte | Motif du schéma |
|---|---|---|
| Étape du workflow courant | `authStep` (le `stepId` nu, sensible à la casse) | `^(?!\$).+$` |
| Étape d'un autre workflow du même document | `$workflows.<workflowId>.steps.<stepId>` | `^\$workflows\.[^.]+\.steps\.[^.]+$` |
| Étape d'un autre document | `$sourceDescriptions.<name>.<workflowId>.steps.<stepId>`. Le workflow **MUST** être listé dans `sourceDescriptions` | `^\$sourceDescriptions\.[^.]+\.[^.]+\.steps\.[^.]+$` |

`$steps.<id>` est **invalide** (fixture officielle `fail/async-depends-on-invalid-reference`). Les formes `$workflows…steps…` n'appartiennent pas à la grammaire ABNF du §5.9 : ce sont des références dédiées à `dependsOn`.

Sémantique (§5.8.5.2) :
- `dependsOn` crée un prérequis et un point de jonction ; il **ne déclenche pas** l'étape référencée.
- Il est surtout destiné à l'asynchrone. Pour un workflow purement synchrone, il est RECOMMANDÉ de ne pas l'utiliser et de se fier à l'ordre du tableau.
- Les outils **MUST** respecter `dependsOn` **et** traiter `$steps.X.outputs.*` comme une dépendance implicite.
- Si aucun `dependsOn` n'apparaît dans le workflow, une référence à la sortie d'une étape placée **plus loin** dans le tableau **SHOULD** produire une erreur (§5.8.5.2.5).
- La description du schéma ajoute que les étapes référencées « SHOULD be non-blocking/async steps ».

**2. Exclusivité des cibles d'étape**

Le texte est incomplet : pour `operationId`, `operationPath` et `workflowId`, il ne cite que les deux autres. Pour `channelPath`, il cite « operationId and workflowId » et omet `operationPath`.

Le **schéma** impose qu'**exactement une** des quatre cibles soit présente : `oneOf` de trois branches, chacune avec `unevaluatedProperties: false` et un `oneOf required` interne. Toutes les combinaisons de deux cibles sont rejetées, de même que l'absence de cible (*sondes*).

Couplages imposés par le schéma :
- `channelPath` exige `action`.
- `operationPath` est incompatible avec `action` et `correlationId`, puisqu'il n'existe que dans la branche OpenAPI. L'exemple du §5.8.1.2 viole cette règle.
- `workflowId` est incompatible avec `action` et `channelPath`.

**3. `channelPath`**

Format normatif (§5.8.5.1) : « A reference to a Source Description Object combined with a JSON Pointer to reference an event channel… A Runtime Expression syntax MUST be used to identify the source description document ». Par analogie avec `operationPath` (§5.6.2), la forme attendue est `'{$sourceDescriptions.<name>.url}#/channels/<channelKey>'`, où le pointeur vise l'objet `channels` d'AsyncAPI 3.

Le texte indique que si l'opération référencée a un `operationId`, celui-ci SHOULD être préféré, ce qui est un copier-coller d'`operationPath`. Le schéma ne valide qu'une `string` (fixture `characterization-async-invalid-channelPath-string`), et les fixtures officielles utilisent même `channelPath: orders`. Aucun exemple normatif de `channelPath` n'existe dans la spec : voir § d.

**4. `action`, `correlationId`, `timeout`**

- `action` : `send` (publish) ou `receive` (subscribe), réservé aux étapes `asyncapi` (texte, §5.8.5.1). Le schéma le **requiert** dans la branche AsyncAPI, mais ne peut pas lier la branche au `type` de la source.
  - Une étape `operationId` AsyncAPI sans `action` passe le schéma en tant qu'étape OpenAPI (fixture `characterization-asyncapi-operationId-without-action`).
  - Une étape OpenAPI avec `action` passe en tant qu'AsyncAPI (`characterization-openapi-operationId-with-action`).
  - Sémantique : un `send` se termine dès l'envoi, sans modéliser d'accusé du broker. Un `receive` se termine à la réception d'un message, filtré par `correlationId` s'il est présent, avant `timeout` (§5.8.5.3).
- `correlationId` : texte `string`, « Only applicable to `asyncapi` steps with action `receive` ». Il doit être cohérent avec le `correlationId` AsyncAPI. Il est optionnel même en `receive` (fixture `async-receive-without-correlation-id`).
  - Le schéma impose `if correlationId then action: receive`, mais accepte `number`, `boolean`, `object` et `array` (*sonde* `correlationId number` valide).
  - Valeur typique : une runtime expression (`$inputs.correlationId`, `$steps.send.outputs.requestId`).
- `timeout` : `integer`, en **millisecondes**, défini dans `step-object-base` et donc applicable aux étapes OpenAPI, AsyncAPI **et** workflow (*sondes*).
  - Le schéma n'impose aucun minimum : `0` et `-1` sont acceptés, `1.5` et `"6s"` sont rejetés.
  - À l'expiration, l'étape échoue et `onFailure` s'exécute ; à défaut, le workflow échoue.
  - Pour un `receive` sans message reçu à temps, l'étape échoue (§5.8.5.3).
  - Aucune valeur par défaut n'est définie.

**5. Selector Object**

Voir b.13 pour les emplacements. La spec ne contient pas d'exigence explicite sur la version. Elle découle :
- du §5.1 : `major.minor` désigne le jeu de fonctionnalités ;
- du §5.8.1.1 : le champ `arazzo` **MUST** être utilisé par l'outillage pour interpréter le document ;
- de S10, où le Selector n'existe pas.

Conséquences dans un document `arazzo: 1.0.x` :
- un Selector dans `outputs` ou dans `PayloadReplacement.value` est **rejeté** par S10 ;
- dans `Parameter.value` ou `RequestBody.payload`, il est **accepté silencieusement comme objet littéral** (*sonde* `param value selector`, valide en 1.0), et un moteur 1.0 enverrait l'objet tel quel.

Le linter doit donc signaler ce cas (règle `arazzo-version-feature-mismatch`).

**6. Expression Type Object**

Voir b.12. Récapitulatif :

| type | versions autorisées | défaut |
|---|---|---|
| `jsonpath` | `rfc9535`, `draft-goessner-dispatch-jsonpath-00` | `rfc9535` |
| `xpath` | `xpath-31`, `xpath-30`, `xpath-20`, `xpath-10` | `xpath-31` |
| `jsonpointer` | `rfc6901` | `rfc6901` |

`version` est REQUIRED dans l'objet. Les défauts s'appliquent quand l'objet est absent et que `type` est une simple chaîne. Le texte de la ligne `version` du §5.8.12.1 oublie `xpath-31` (corrigé dans DEV, PR #613), mais le tableau et S11 l'incluent. La description du schéma (« If the `version` is omitted, a default… ») contredit son propre `required: [type, version]` : c'est le `required` qui fait foi.

**7. `in: querystring`**

Défini au §5.8.6. Ce paramètre « treats the entire URL query string as a single value » et vient d'OAS 3.2.
- La valeur **MUST** respecter le média du `content` du paramètre OpenAPI (par exemple `application/x-www-form-urlencoded` ou `application/json`).
- Elle **MUST** se résoudre en chaîne.
- **Exclusivité** : « The `querystring` location cannot coexist with `query` parameters in the same operation per OpenAPI constraints ». C'est **confirmé dans le texte**, et **non couvert** par le schéma (*sonde* `param query+querystring` valide).

Le linter doit évaluer l'ensemble effectif des paramètres (workflow + étape, après fusion des surcharges). Il doit aussi signaler plus d'un `querystring`, puisqu'OAS 3.2 n'en autorise qu'un par opération (voir § d).

**8. `$self`**

Format (§5.8.1.1) : URI-reference RFC 3986 §4.1, absolue ou relative, **sans fragment**. Le schéma impose `pattern ^[^#]*$` et `format: uri-reference`. En 2020-12, le format n'est qu'une annotation : avec ajv, il faut `ajv-formats` pour le contrôler.

Résolution de l'URI de base (§5.6.1, annexe B) :
1. `$self` est absolu : il est la base.
2. `$self` est relatif : il est d'abord résolu contre la base suivante (RFC 3986 §5.1.2 à 5.1.4), puis sert de base (annexe B §9.5).
3. `$self` est absent : la base vient de l'entité englobante (par exemple `Content-Location`), puis de l'URI de récupération, puis d'un défaut applicatif.

Identité (§5.5.2) : une référence à un document Arazzo **MUST** utiliser son `$self` s'il en a un. Quand le `url` d'une Source Description est absolu, la résolution **MUST** se faire par identité (correspondance avec `$self`) et non par emplacement. Le référencement par URL de récupération est « NOT RECOMMENDED ». L'expression `$self` (§5.9) renvoie cette URI.

**9. Nouvelles runtime expressions**

Voir b.16 :
- `$message.header.<name>` et `$message.payload[#/ptr]` ;
- `$self` ;
- formalisation de `$components.successActions.*` et `$components.failureActions.*` (déjà utilisés dans les exemples de la 1.0.1) ;
- ordre de résolution `$sourceDescriptions` (§5.9.2).

**10. Sémantique truthy/falsy (§5.8.11.4)**

| type | passe (truthy) | échoue (falsy) |
|---|---|---|
| `simple` (ou omis) | expression `true`, comparaison ou opérateur logique vrai | `false`, comparaison fausse, **`null`** |
| `regex` | le motif correspond à `context` | pas de correspondance, ou `context` `null`/indéfini |
| `jsonpath` (RFC 9535) | nodelist **non vide** | nodelist vide, `context` null, syntaxe invalide |
| `xpath` | `true`, nombre ≠ 0, chaîne non vide, node-set non vide (EBV de la version) | `false`, 0, `""`, node-set vide, `context` null, syntaxe invalide |

Règles complémentaires :
- Toute erreur d'évaluation (syntaxe, contexte non JSON, division par zéro, regex invalide) donne **fail** (MUST), et l'erreur SHOULD être journalisée.
- Les comparaisons de chaînes sont **insensibles à la casse**.
- Les chaînes numériques SHOULD être converties en nombres.
- `null == null` est vrai ; `null` comparé à toute autre valeur est faux.
- Plusieurs critères se combinent en ET logique.
- Un `context` est requis pour `regex`, `jsonpath` et `xpath`.

**11. Préfixes d'extension réservés** : voir b.17. Rien ne change par rapport à la 1.0.x.

**12. Réutilisation de workflows dans les actions** : voir b.7 et b.8.

Règles :
- Les `parameters` des Success et Failure Actions n'ont de sens qu'avec `workflowId`, ce que le schéma impose.
- Ils correspondent aux `inputs` du workflow cible.
- `in` **MUST NOT** être utilisé.
- Ils sont sans doublons, et les Reusable Objects pointent vers `components/parameters`.

Le schéma ne valide pas les éléments (`items: true`) : `[42]` passe (*sonde*). Exemple canonique, une Failure Action :

```yaml
name: renewSessionAfterUnauthorized
type: retry
workflowId: renewCustomerSession
parameters:
  - name: sessionRenewalToken
    value: $inputs.sessionRenewalToken
```

Avec ce motif, le workflow est exécuté puis l'étape courante est rejouée, dans la limite de `retryLimit`.

**13. Autres points**

- **Components** et **ReusableObject** : voir b.9 et b.10. Il n'y a pas de changement structurel.
- **PayloadReplacement** : voir b.15. Ajout de `targetSelectorType`, du Selector et de JSONPath dans `target`.
- **Sources `type: asyncapi`** : voir b.3. AsyncAPI 3 est visé : le schéma parle d'« AsyncAPI Operation Object » et la PR #367 s'intitule « added support for AsyncAPI v3 ». La règle « operationId **MUST** être qualifié par `$sourceDescriptions.<name>.` s'il existe plusieurs sources non-arazzo » (inchangée) devient beaucoup plus fréquente dans les documents mixtes OpenAPI et AsyncAPI.
- **Ordre de résolution des sources** : il y a deux niveaux.
  - (i) Pour `$sourceDescriptions.<name>.<ref>` : d'abord operationId ou workflowId, puis champ de l'objet (§5.9.2).
  - (ii) Pour les documents : parsing complet de tous les documents fournis avant de déclarer une référence irrésoluble (§5.5), puis correspondance par `$self` (§5.5.2).

---

## (c) Table des règles de validation (entrée du lot C1)

**Sévérités** :
- `error` : violation d'un MUST ou du schéma.
- `warning` : violation d'un SHOULD ou erreur probable.
- `info` : recommandation.

**Colonne « Schéma »** :
- **oui** : la règle est couverte par S11 (ou par S10 pour un document 1.0.x) via ajv.
- **partiel** : le schéma ne couvre qu'une partie de la règle.
- **non** : la règle est sémantique et doit être codée dans C1.

Quand le schéma couvre la règle, C1 doit **remplacer l'erreur ajv brute par le code ci-dessous** (mapping par chemin et mot-clé). C'est ce qui évite les doublons. « 1.1 » signifie que la règle ne s'applique qu'à `arazzo: 1.1.x`.

### c.1 Version, structure et schéma

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-schema` | Repli : toute erreur ajv non mappée à une règle plus précise | error | oui | §5.8 | — |
| `arazzo-version-format` | `arazzo` est requis et de la forme `major.minor.patch` | error | oui | §5.1, §5.8.1.1 | `arazzo: "1.1"` |
| `arazzo-version-unknown` | Version `major.minor` non supportée (≠ 1.0, 1.1) : pas de schéma applicable | error | non | §5.1 | `arazzo: 1.2.0` |
| `arazzo-version-feature-mismatch` | Fonctionnalité 1.1 dans un document `1.0.x`. Liste : `$self`, `type: asyncapi`, `channelPath`, `action`, `correlationId`, `timeout`, `dependsOn` d'étape, `in: querystring`/`channel`, `parameters` d'action, Selector Object, `targetSelectorType`, ETO `jsonpointer`/`rfc9535`/`xpath-31`, `$message.`, `$self`. Le message unique doit remplacer les erreurs S10 correspondantes et proposer un quick-fix « Migrer vers 1.1.0 ». La sévérité est `warning` quand S10 accepte silencieusement (Selector dans `Parameter.value` ou `payload`, `$message`/`$self` dans des chaînes) | error / warning | partiel | §5.1 | `arazzo: 1.0.1` + `timeout: 5000` |
| `arazzo-migration-param-object-value` | 1.1 : un `Parameter.value` objet littéral non-Selector, valide en 1.0, est rejeté par S11. À signaler pendant la migration | error | oui (S11) | §5.8.6.1 | `value: {a: 1}` |
| `arazzo-self-recommended` | 1.1 : l'absence de `$self` empêche le référencement par identité | info | non | §5.5.2, §5.6.1 | document 1.1 sans `$self` |
| `arazzo-self-fragment` | `$self` **MUST NOT** contenir de fragment | error | oui | §5.8.1.1 | `$self: https://x/a.yaml#top` |
| `arazzo-self-uri-reference` | `$self` doit être une URI-reference RFC 3986 valide (le format n'est vérifié qu'avec `ajv-formats`) | error | partiel | §5.8.1.1 | `$self: "a b"` |
| `arazzo-self-relative` | `$self` relatif : il est résolu contre l'URI de récupération, ce qui le rend moins portable | info | non | §5.6.1, annexe B §9.5 | `$self: workflows/a.yaml` |
| `arazzo-unknown-field` | Champ non défini et ne commençant pas par `x-` | error | oui | §5.8, §5.10 | `stepId: a` + `foo: 1` |
| `arazzo-extension-reserved-prefix` | Extension `x-oai-*`, `x-oas-*` ou `x-arazzo*` réservée à l'OAI (valable aussi en 1.0) | warning | non | §5.10 | `x-arazzo-foo: 1` |
| `arazzo-reusable-no-extension` | Propriétés supplémentaires sur un Reusable Object : « MUST be ignored », rejetées par le schéma | error | oui | §5.8.10.1 | `reference: …` + `x-a: 1` |

### c.2 Identifiants et unicité

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-workflow-id-unique` | `workflowId` **MUST** être unique dans le document | error | non | §5.8.4.1 | deux workflows `w1` |
| `arazzo-step-id-unique` | `stepId` **MUST** être unique dans son workflow | error | non | §5.8.5.1 | deux étapes `s1` dans `w1` |
| `arazzo-source-name-unique` | `sourceDescriptions[].name` unique | error | non | §5.8.3.1 | deux sources `api` |
| `arazzo-source-name-pattern` | `name` ~ `[A-Za-z0-9_\-]+` (SHOULD dans le texte, imposé par le schéma) | error | oui | §5.8.3.1 | `name: my.api` |
| `arazzo-id-pattern` | `workflowId` et `stepId` SHOULD suivre `[A-Za-z0-9_\-]+`. Sinon ils ne sont pas référençables via l'ABNF (`identifier-strict`) | warning | non | §5.8.4.1, §5.8.5.1, §5.9 | `stepId: step.1` |
| `arazzo-key-pattern` | Clés de `outputs` et de `components.*` ~ `^[a-zA-Z0-9\.\-_]+$` | error | oui | §5.8.4.1, §5.8.9 | `outputs: {"a b": $x}` |
| `arazzo-parameter-unique` | Pas de doublon de paramètre (clé = `name` + `in`, ou `name` seul pour une cible workflow) dans une liste. Le schéma n'attrape que les doublons strictement identiques (`uniqueItems`) | error | partiel | §5.8.4.1, §5.8.5.1, §5.8.6 | `[{name: a, in: query, value: 1}, {name: a, in: query, value: 2}]` |
| `arazzo-action-name-unique` | Pas de doublon d'action (identité = `name`, DEV PR #620) dans `onSuccess`, `onFailure`, `successActions` ou `failureActions`. `uniqueItems` ne couvre que les doublons strictement identiques | error | partiel | §5.8.5.1, §5.8.7 (DEV) | deux actions `name: retry` |

### c.3 Cibles d'étape (OpenAPI, AsyncAPI, workflow)

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-step-target-exclusive` | Exactement une cible parmi `operationId`, `operationPath`, `workflowId`, `channelPath`. Remplace les doublons de `required-fields.ts` et `mutual-exclusivity.ts` | error | oui | §5.8.5.1 | `operationId: a` + `workflowId: b` |
| `arazzo-step-target-missing` | Aucune cible | error | oui | §5.8.5.1 | `- stepId: s` |
| `arazzo-step-operation-id-qualified` | Avec plusieurs sources non-`arazzo`, `operationId` **MUST** être `$sourceDescriptions.<name>.<opId>` | error | non | §5.8.5.1 | sources `api` + `ev`, `operationId: placeOrder` |
| `arazzo-step-operation-resolved` | `operationId` ou `operationPath` résolu dans une source (nécessite le chargement des sources ; sinon `info` « non vérifié ») | error | non | §5.8.5.1 | `operationId: $sourceDescriptions.api.nope` |
| `arazzo-step-operation-path-format` | `operationPath` = `{$sourceDescriptions.<name>.url}#<json-pointer>` | error | non | §5.8.5.1, §5.6.2 | `operationPath: /paths/~1a/get` |
| `arazzo-step-operation-path-source-type` | `operationPath` doit viser une source `openapi` (la branche AsyncAPI n'a pas `operationPath`) | error | non | §5.8.5.1 | `operationPath: '{$sourceDescriptions.ev.url}#/operations/x'` + `action: send` |
| `arazzo-step-prefer-operation-id` | `operationPath` ou `channelPath` alors que l'opération a un `operationId` | info | non | §5.8.5.1 | — |
| `arazzo-channel-path-format` | 1.1 : `channelPath` = `{$sourceDescriptions.<name>.url}#/channels/<key>` (runtime expression + JSON Pointer) | error | non | §5.8.5.1 | `channelPath: orders` |
| `arazzo-channel-path-source-type` | 1.1 : `channelPath` doit viser une source `type: asyncapi` | error | non | §5.8.5.1 | `channelPath: '{$sourceDescriptions.api.url}#/channels/a'` (api = openapi) |
| `arazzo-step-workflow-resolved` | `workflowId` d'étape : workflow local existant, ou `$sourceDescriptions.<arazzo>.<wf>` | error | non | §5.8.5.1 | `workflowId: inconnu` |
| `arazzo-step-workflow-qualified` | Un workflow d'une source `arazzo` **MUST** être référencé par `$sourceDescriptions.<name>.<wf>` | error | non | §5.8.5.1 | `workflowId: remoteWf` (défini dans un autre document) |
| `arazzo-step-workflow-requestbody` | `requestBody` sur une étape `workflowId` (accepté par le schéma, sans effet) | warning | non | §5.8.5.1 | `workflowId: w2` + `requestBody: …` |
| `arazzo-source-type-recommended` | `type` absent sur une source utilisée par une étape asynchrone ou `operationPath`. Le type est nécessaire pour choisir la sémantique | warning | non | §5.8.3.1 | source sans `type` |

### c.4 AsyncAPI : `action`, `correlationId`, `timeout`

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-async-action-enum` | `action` ∈ {`send`, `receive`} | error | oui | §5.8.5.1 | `action: publish` |
| `arazzo-async-action-only-asyncapi` | `action` réservé aux étapes dont la cible est une source `asyncapi`. Le schéma l'accepte sur un `operationId` OpenAPI | error | partiel | §5.8.5.1 | `operationId: $sourceDescriptions.api.listUsers` + `action: send` |
| `arazzo-async-action-required` | Une étape AsyncAPI **doit** déclarer `action`. Le schéma ne l'exige que pour `channelPath`, pas pour un `operationId` résolu vers AsyncAPI | error | partiel | §5.8.5.1, schéma `asyncapi-step-object` | `operationId: $sourceDescriptions.ev.orderCreated` sans `action` |
| `arazzo-async-action-mismatch` | `action` incohérente avec l'`action` de l'opération AsyncAPI 3 référencée (nécessite la source) | warning | non | §5.8.5.1, §5.8.5.3 | op AsyncAPI `action: send`, étape `action: receive` |
| `arazzo-async-correlation-receive-only` | `correlationId` uniquement avec `action: receive` | error | oui | §5.8.5.1 | `action: send` + `correlationId: $inputs.c` |
| `arazzo-async-correlation-only-asyncapi` | `correlationId` sur une étape non-AsyncAPI (le schéma l'accepte avec `action: receive`) | error | partiel | §5.8.5.1 | étape OpenAPI + `action: receive` + `correlationId` |
| `arazzo-async-correlation-type` | `correlationId` devrait être une chaîne, typiquement une runtime expression. Le schéma accepte tout type non nul | warning | non | §5.8.5.1 | `correlationId: 42` |
| `arazzo-step-timeout-positive` | `timeout` entier > 0 (ms). Le schéma accepte 0 et les négatifs | warning | partiel (type) | §5.8.5.1 | `timeout: -1` |
| `arazzo-async-receive-timeout-recommended` | `receive` sans `timeout` : attente potentiellement illimitée | info | non | §5.8.5.3 | `action: receive` sans `timeout` |
| `arazzo-async-receive-success-criteria` | Un `receive` SHOULD définir `successCriteria` sur `$message.payload`, sauf message unique et sans champ d'erreur | info | non | §5.8.5.3 | `action: receive` sans `successCriteria` |
| `arazzo-async-http-expression` | `$statusCode`, `$response.*` ou `$request.*` dans une étape AsyncAPI, ou `$message.*` dans une étape OpenAPI | warning | non | §5.9, §5.8.5.3 | étape `receive` avec `condition: $statusCode == 200` |
| `arazzo-async-param-in` | Étape AsyncAPI : `in` requis (schéma). Sur un message, seuls `header` et `channel` ont un sens | warning | partiel | §5.8.6 | `action: send` + `in: query` |
| `arazzo-param-in-channel` | `in: channel` hors étape AsyncAPI. En 1.1.0, `channel` est accepté par S11 mais absent du texte (ajouté dans DEV) | error / info | non | §5.8.6 (DEV PR #615) | étape OpenAPI + `in: channel` |

### c.5 `dependsOn` et ordre d'exécution

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-step-depends-on-shape` | Forme valide (stepId nu, `$workflows.<w>.steps.<s>`, `$sourceDescriptions.<n>.<w>.steps.<s>`), liste non vide et sans doublon | error | oui | §5.8.5.1 | `dependsOn: [$steps.a]`, `dependsOn: []` |
| `arazzo-step-depends-on-resolved` | La cible existe : étape du workflow courant, workflow et étape du document, ou source `type: arazzo` (+ workflow et étape si la source est chargée) | error | non | §5.8.5.1 | `dependsOn: [inconnue]` |
| `arazzo-step-depends-on-self` | Une étape ne peut pas dépendre d'elle-même | error | non | §5.8.5.1 | `stepId: a`, `dependsOn: [a]` |
| `arazzo-step-depends-on-cycle` | Pas de cycle dans le graphe des dépendances explicites (`dependsOn`, y compris inter-workflows) et implicites (`$steps.X.outputs`) : il serait insatisfiable (« MUST be completed before ») | error | non | §5.8.5.2.4 | `a.dependsOn: [b]`, `b.dependsOn: [a]` |
| `arazzo-step-forward-output-reference` | Workflow sans aucun `dependsOn` : référence `$steps.X.outputs` vers une étape **plus loin** dans le tableau | error (SHOULD) | non | §5.8.5.2.5 | l'étape 1 utilise `$steps.step3.outputs.id` |
| `arazzo-step-depends-on-sync` | `dependsOn` dans un workflow sans étape asynchrone, ou visant une étape synchrone : l'ordre du tableau est recommandé | info | non | §5.8.5.2.1, schéma (description) | — |
| `arazzo-workflow-depends-on-resolved` | `Workflow.dependsOn` : `workflowId` local existant, ou `$sourceDescriptions.<arazzo>.<wf>` | error | non | §5.8.4.1 | `dependsOn: [nope]` |
| `arazzo-workflow-depends-on-qualified` | Un workflow d'un autre document **MUST** passer par `$sourceDescriptions` | error | non | §5.8.4.1 | `dependsOn: [remoteWf]` |
| `arazzo-workflow-depends-on-cycle` | Pas de cycle entre workflows (ni d'auto-dépendance) | error | non | §5.8.4.1 | `w1 → w2 → w1` |

### c.6 Actions (goto, retry, end, parameters)

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-action-goto-target` | `type: goto` exige exactement un de `stepId` ou `workflowId` | error | oui | §5.8.7.1, §5.8.8.1 | `type: goto` sans cible |
| `arazzo-action-target-exclusive` | `stepId` et `workflowId` mutuellement exclusifs, **aussi pour `retry`** (le schéma ne le vérifie que pour `goto`) | error | partiel | §5.8.8.1 | `type: retry`, `stepId: a`, `workflowId: b` |
| `arazzo-action-goto-step-exists` | `stepId` cible **MUST** exister dans le workflow courant | error | non | §5.8.7.1, §5.8.8.1 | `stepId: inexistante` |
| `arazzo-action-goto-workflow-exists` | `workflowId` cible existe, local ou via `$sourceDescriptions.<arazzo>.<wf>` | error | non | §5.8.7.1, §5.8.8.1 | `workflowId: inconnu` |
| `arazzo-action-field-irrelevant` | Champ sans effet : `stepId`/`workflowId` sur `end`, `retryAfter`/`retryLimit` hors `retry` | warning | non | §5.8.7.1, §5.8.8.1 | `type: end`, `stepId: a` |
| `arazzo-action-retry-values` | `retryAfter` ≥ 0 (secondes), `retryLimit` entier ≥ 0 | error | oui | §5.8.8.1 | `retryLimit: -1` |
| `arazzo-action-parameters-require-workflow` | 1.1 : `parameters` d'action uniquement avec `workflowId` | error | oui | §5.8.7.1, §5.8.8.1 | `type: goto`, `stepId: a`, `parameters: […]` |
| `arazzo-action-parameters-shape` | 1.1 : chaque élément est un Parameter Object (sans `in`) ou un Reusable Object `$components.parameters.*` (le schéma a `items: true`) | error | non | §5.8.7.1, §5.8.8.1 | `parameters: [42]` |
| `arazzo-action-parameters-no-in` | 1.1 : `in` **MUST NOT** être utilisé dans les `parameters` d'action | error | non | §5.8.7.1, §5.8.8.1 | `parameters: [{name: t, in: header, value: x}]` |
| `arazzo-workflow-parameters-match-inputs` | Paramètres passés à un workflow (étape ou action) : chaque `name` devrait exister dans `inputs.properties` du workflow cible. Les `required` des inputs devraient être fournis | warning | non | §5.8.5.1, §5.8.6.1, §5.8.7.1 | `name: tokn` alors que l'input est `token` |
| `arazzo-workflow-step-param-in` | `in` sur un paramètre d'étape `workflowId` : ignoré, les paramètres sont mappés aux inputs | info | non | §5.8.6.1 | `workflowId: w2`, `in: query` |

### c.7 Paramètres, querystring, Reusable Objects et Components

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-param-in-required` | `in` requis pour une cible opération (OpenAPI ou AsyncAPI) | error | oui | §5.8.6.1 | `operationId: a`, `parameters: [{name: q, value: 1}]` |
| `arazzo-param-in-enum` | `in` ∈ {path, query, querystring, header, cookie} (+ `channel` selon S11/DEV) | error | oui | §5.8.6.1 | `in: body` |
| `arazzo-param-querystring-exclusive` | 1.1 : `querystring` ne peut pas coexister avec `query` pour la même opération. Le contrôle porte sur l'ensemble effectif workflow + étape | error | non | §5.8.6 | `[{in: querystring…}, {in: query…}]` |
| `arazzo-param-querystring-single` | 1.1 : au plus un paramètre `querystring` par opération (contrainte OAS 3.2) | warning | non | §5.8.6 | deux `in: querystring` |
| `arazzo-param-querystring-string` | 1.1 : la valeur d'un `querystring` **MUST** se résoudre en chaîne. Littéral non-chaîne interdit, alors que le schéma accepte nombres et tableaux | error | non | §5.8.6.1 | `in: querystring`, `value: [1, 2]` |
| `arazzo-param-resolved` | Le paramètre existe dans l'opération cible (nom + emplacement), si la source est chargée | warning | non | §5.8.6, §5.9.1 | `name: stauts` |
| `arazzo-reusable-reference-resolved` | `reference` = `$components.{parameters\|successActions\|failureActions}.<clé>` existant | error | non | §5.8.10.1, §5.9 | `$components.parameters.inconnu` |
| `arazzo-reusable-reference-kind` | Le type de composant correspond au contexte (liste `parameters` → `parameters`, `onSuccess` → `successActions`…) | error | non | §5.8.4.1, §5.8.5.1 | `onSuccess: [{reference: $components.parameters.p}]` |
| `arazzo-reusable-value-parameter-only` | `value` d'un Reusable Object uniquement pour une référence de paramètre | warning | non | §5.8.10.1 | `reference: $components.successActions.a`, `value: 1` |
| `arazzo-components-inputs-ref` | `$components.inputs.*` n'est pas une runtime expression : utiliser `$ref: '#/components/inputs/x'` dans `inputs` | error | non | §5.8.10, §5.9 | `reference: $components.inputs.pagination` |
| `arazzo-components-ref-resolved` | `$ref` JSON Schema dans `inputs` résolu (JSON Pointer ou `$anchor`) | error | non | §5.6.2 | `$ref: '#/components/inputs/nope'` |
| `arazzo-components-unused` | Composant jamais référencé | info | non | §5.8.9 | — |

### c.8 Criterion, Selector, Expression Type, PayloadReplacement

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-criterion-context-required` | `context` requis dès que `type` est présent | error | oui | §5.8.11.5 | `{condition: '^2', type: regex}` |
| `arazzo-criterion-type-enum` | `type` ∈ {simple, regex, jsonpath, xpath} ou ETO | error | oui | §5.8.11.5 | `type: jsonpointer` |
| `arazzo-criterion-eto-jsonpointer` | ETO `jsonpointer` dans un Criterion : accepté par S11, mais ce type de condition n'existe pas | warning | non | §5.8.11.5, §5.8.12 | `type: {type: jsonpointer, version: rfc6901}` |
| `arazzo-criterion-syntax` | Condition syntaxiquement valide pour son type : regex, JSONPath RFC 9535 (ou version ETO), XPath, ou expression simple (littéraux, opérateurs, chaînes entre `'`). À l'exécution, une erreur de syntaxe donne *fail* | error | non | §5.8.11.1, §5.8.11.2, §5.8.11.4 | `condition: '$[?(@.a=='` (jsonpath) |
| `arazzo-criterion-embedded-expression` | regex/jsonpath/xpath : les runtime expressions **MUST** être entre `{}` | error | non | §5.8.11.3 | `condition: $[?(@.id == $inputs.id)]` |
| `arazzo-success-criteria-non-empty` | `successCriteria` présent mais vide | error | oui | §5.8.5.1 | `successCriteria: []` |
| `arazzo-eto-version` | ETO : `type` et `version` requis, `version` compatible avec `type` | error | oui | §5.8.12.1 | `{type: xpath, version: rfc9535}` |
| `arazzo-selector-required-fields` | Selector : `context`, `selector` et `type` requis | error | oui | §5.8.13.1 | `{context: $response.body, selector: $.a}` |
| `arazzo-selector-context-structured` | `context` doit être une runtime expression qui pointe vers des données structurées | warning | non | §5.8.13.1 | `context: $statusCode` |
| `arazzo-selector-syntax` | `selector` valide pour son type (JSONPath, XPath, JSON Pointer `/…`) | error | non | §5.8.13.1 | `type: jsonpointer`, `selector: $.a` |
| `arazzo-selector-misplaced` | Objet de forme Selector à un emplacement où il serait pris comme littéral (`Reusable.value`, 1.0.x, `payload` en 1.0.x) | warning | non | §5.8.13 | `arazzo: 1.0.1`, `value: {context: …, selector: …, type: jsonpath}` |
| `arazzo-replacement-target-syntax` | `target` cohérent avec `targetSelectorType` ou, à défaut, avec le média (JSON → JSON Pointer, XML → XPath) | error | non | §5.8.15.1 | `contentType: application/json`, `target: $.a` sans `targetSelectorType` |
| `arazzo-replacement-literal-value` | Valeur littérale non-chaîne : valide selon le texte et DEV, mais rejetée par S11 (2026-04-15). C1 doit **neutraliser** cette erreur ajv | info | (faux positif S11) | §5.8.15.1, DEV PR #614 | `value: 10` |

### c.9 Runtime expressions et références

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-expression-syntax` | Toute expression (valeur commençant par `$` dans un champ `{expression}`, ou `{…}` interpolé) respecte l'ABNF de la version : racine connue, `identifier-strict` pour step, workflow et source | error | non | §5.9 | `$step.a.outputs.b`, `$message.payload.orderId` |
| `arazzo-expression-steps-resolved` | `$steps.<id>.outputs.<name>` : l'étape existe **dans le workflow courant** et déclare `outputs.<name>` | error | non | §5.9, §5.8.5.1 | `$steps.login.outputs.tokn` |
| `arazzo-expression-workflows-resolved` | `$workflows.<id>.{inputs\|outputs}.<name>` : le workflow existe et le champ est déclaré | error | non | §5.9 | `$workflows.nope.outputs.x` |
| `arazzo-expression-inputs-declared` | `$inputs.<name>` déclaré dans `inputs.properties` du workflow, après résolution des `$ref` | warning | non | §5.9 | `$inputs.usernme` |
| `arazzo-expression-source-resolved` | `$sourceDescriptions.<name>.<ref>` : la source existe. `<ref>` est résolu selon §5.9.2, d'abord operationId/workflowId, puis `url`/`type`/`name` | error | non | §5.9.2 | `$sourceDescriptions.petsore.url` |
| `arazzo-expression-components-resolved` | `$components.<type>.<clé>` existe, avec type ∈ {parameters, successActions, failureActions} | error | non | §5.9 | `$components.parameters.inconnu` |
| `arazzo-expression-self-defined` | 1.1 : `$self` utilisé alors que le champ `$self` est absent (valeur dépendante de l'URI de base) | warning | non | §5.9.1 | `value: '{$self}'` sans `$self` racine |
| `arazzo-expression-message-context` | 1.1 : `$message.*` hors étape AsyncAPI `receive` (ou `send` pour son propre message) | warning | non | §5.9.1 | `$message.payload` dans une étape OpenAPI |
| `arazzo-expression-components-scope` | Les composants sont portés par le document : une étape d'un workflow distant n'utilise pas les composants locaux | info | non | §5.8.9 | — |

### c.10 Sources et résolution multi-documents

| id | description | sév. | Schéma | section | exemple invalide |
|---|---|---|---|---|---|
| `arazzo-source-url-uri-reference` | `url` est une URI-reference valide | error | partiel (format) | §5.8.3.1 | `url: "ht tp://x"` |
| `arazzo-source-unresolvable` | Source introuvable ou non parsable. À signaler seulement après parsing complet de tous les documents fournis (MUST NOT avant) | warning | non | §5.5 | `url: ./absent.yaml` |
| `arazzo-source-identity` | Source `arazzo` à `url` absolue dont le document cible a un `$self` différent : la résolution doit se faire par identité | warning | non | §5.5.2 | `url: https://cdn/x.yaml` alors que le document porte `$self: https://canon/x.yaml` |
| `arazzo-source-type-mismatch` | Le `type` déclaré ne correspond pas au document chargé (clé `openapi:`, `asyncapi:` ou `arazzo:`) | error | non | §5.8.3.1 | `type: openapi` vers un document `asyncapi: 3.0.0` |
| `arazzo-source-unused` | Source jamais référencée | info | non | §5.8.3 | — |

**Notes d'implémentation pour C1**

1. Sélectionner le schéma selon `arazzo` : `1.0.x` → S10, `1.1.x` → S11, sinon `arazzo-version-unknown`. Le validateur doit être ajv 2020-12 avec `ajv-formats` (`uri-reference`) et `unevaluatedProperties`.
2. Les erreurs `oneOf` de `step-object` sont bruyantes, avec une erreur par branche. Il faut d'abord déterminer la branche visée (`channelPath` ou `action` → asyncapi, `workflowId` → workflow, sinon openapi) et ne remonter que les erreurs de cette branche, ou les remplacer par `arazzo-step-target-*`.
3. Il faut prévoir une liste de **neutralisations** des faux positifs des schémas officiels :
   - `PayloadReplacement.value` littéral (S11) ;
   - `Criterion.type` en ETO (S10).

   On peut aussi embarquer le schéma DEV pour le premier cas. Voir § d.

---

## (d) Questions ouvertes

1. **`in: channel`** : il est présent dans S11 (2026-04-15), absent du texte 1.1.0, et ajouté au texte DEV par la PR #615 (11/11/2026). À traiter comme valide en 1.1 ? *Proposition* : l'accepter sur les étapes AsyncAPI, avec une info « clarification postérieure à 1.1.0 ».
2. **`PayloadReplacement.value` littéral** : S11 rejette `value: 10`, `true` et les objets. L'exemple du §5.8.15.2 et le texte (« constant ») l'autorisent, et DEV l'a corrigé (`444cf4e`, PR #614). Aucun schéma corrigé n'est publié au 16/11/2026 : l'`$id` DEV vaut `…/1.1/schema/WORK-IN-PROGRESS`. *Proposition* : neutraliser cette erreur dans C1 et surveiller la publication d'un nouveau `$id` 1.1.
3. **`Parameter.value` objet littéral** : le texte dit « Any », mais S11 n'accepte un objet que s'il a la forme d'un Selector. Un document 1.0 avec `value: {…}` devient invalide une fois migré. Ni DEV ni aucune PR ne traite ce point. Est-ce voulu, pour lever l'ambiguïté avec le Selector ? *Proposition* : erreur (schéma), mais message clair et quick-fix (sérialiser en chaîne JSON).
4. **Exemple racine du §5.8.1.2** : il est invalide contre S11 (`operationPath` + `action`/`correlationId`). Il contient aussi une incohérence de casse (`petstoreDescription` vs `petStoreDescription`) et `$message.payload.orderId` hors ABNF. Ne pas l'utiliser comme fixture. Faut-il signaler le problème à l'OAI (issue) ?
5. **Format exact de `channelPath`** : la spec ne donne aucun exemple et les fixtures officielles utilisent `channelPath: orders` (chaîne nue, « characterization »). La forme `{$sourceDescriptions.<n>.url}#/channels/<key>` est déduite. *Proposition* : `error` si ce n'est pas une runtime expression avec pointeur, ou `warning` tant que l'OAI n'a pas tranché.
6. **`timeout`** : la spec n'impose ni minimum, ni valeur par défaut, ni interaction avec `retryAfter`. Le timeout s'applique-t-il à chaque tentative ou au cumul des retries ? Zuplo le présente comme spécifique au `receive`, ce que le texte ne dit pas.
7. **`action` vs AsyncAPI 3** : une opération AsyncAPI 3 porte déjà `action: send|receive`. Doivent-elles concorder ? Le texte est muet. La règle `arazzo-async-action-mismatch` est proposée en `warning`.
8. **Cycles `dependsOn`** : la spec ne parle pas de cycles. L'erreur se déduit de « MUST be completed before ». Faut-il inclure les dépendances implicites (`$steps…outputs`) dans la détection ? *Proposition* : oui (§5.8.5.2.4).
9. **`querystring` unique** : l'unicité vient d'OAS 3.2. Arazzo ne cite que l'exclusivité avec `query`. Avec un paramètre `querystring` au niveau du workflow et un autre au niveau de l'étape, il y a surcharge si le `name` est identique, sinon conflit.
10. **ETO dans Criterion avec `jsonpointer`** : accepté par S11, sans sémantique de condition définie (la table truthy/falsy ne couvre que simple, regex, jsonpath et xpath).
11. **Schéma 1.0 et Criterion en ETO** : S10 (2025-10-15) rejette `type: {type: jsonpath, version: draft-goessner-…}` (*sonde*), alors que le texte 1.0.1 l'autorise. Faut-il neutraliser l'erreur ou embarquer un S10 corrigé ? Aucun correctif n'a été trouvé sur la branche `v1.0-dev`.
12. **Ambiguïtés de grammaire** : `$response.payload` et `$message.body` sont valides selon l'ABNF (le non-terminal `source` est partagé). Les formes `$workflows.<w>.steps.<s>` de `dependsOn` sont hors ABNF. Faut-il les signaler ?
13. **Version de la 1.1 à cibler** : 1.1.0 publiée, ou 1.1.1 à venir, avec les corrections DEV #613 à #632 sur `xpath-31`, `channel`, `Reusable.value` Any, littéraux de PayloadReplacement, `$message.payload#/…`, unicité des actions par `name` et `steps` non vide. *Proposition* : cibler 1.1.0 et appliquer les clarifications DEV quand elles relâchent une contrainte.
14. **Vérification GitHub limitée** : l'API GitHub (issues, PR, releases) n'était pas accessible depuis cette session, seul le `git clone` anonyme fonctionnait. Les numéros et titres de PR viennent des commits de merge. Les discussions de PR et les notes de release GitHub n'ont pas été lues.

---

## (e) Sources

Spécification et schémas, récupérés le 16/11/2026 :
- Spec 1.1.0 : https://spec.openapis.org/arazzo/v1.1.0.html (identique octet pour octet à https://spec.openapis.org/arazzo/latest.html à cette date)
- Spec 1.0.1 : https://spec.openapis.org/arazzo/v1.0.1.html
- Spec 1.0.0 : https://spec.openapis.org/arazzo/v1.0.0.html (vérification des préfixes réservés)
- Index : https://spec.openapis.org/arazzo/
- Schéma 1.0 : https://spec.openapis.org/arazzo/1.0/schema/2025-10-15 → `research/schemas/arazzo-1.0.schema.json`
- Schéma 1.1 : https://spec.openapis.org/arazzo/1.1/schema/2026-04-15 → `research/schemas/arazzo-1.1.schema.json`

Dépôt `OAI/Arazzo-Specification`, cloné en lecture : https://github.com/OAI/Arazzo-Specification
- `versions/1.0.1.md` et `versions/1.1.0.md` (branche `main`, commit `12f619e`).
- Branche `v1.1-dev` (commit `22be335`) :
  - `src/arazzo.md` ;
  - `src/schemas/validation/schema.yaml` (`$id …/1.1/schema/WORK-IN-PROGRESS`) ;
  - `tests/schema/{pass,fail}/*.yaml` (44 pass et 31 fail ; les 75 sont conformes avec le schéma DEV, et S11 n'échoue que sur `pass/payload-replacement-literal-values`).
- PR de la 1.1 (titres issus des merges) :
  - #367 « feat: added support for AsyncAPI v3 » ;
  - #409 « Add support for JSONPath and XPath where JSONPointer is supported » (Selector, ETO) ;
  - #416 « Allow workflow inputs to be passed in success and failure actions » ;
  - #443 querystring ;
  - #451 `$self` ;
  - #454 « improve ABNF grammar clarity » ;
  - #475 « Clarify Criterion Object condition evaluation semantics » ;
  - #476 fixtures de validation async, OpenAPI et workflow ;
  - #482 release v1.1.0.
- PR postérieures à la release (branche `v1.1-dev`) :
  - #613 `xpath-31` dans le texte ;
  - #614 littéraux de PayloadReplacement (commit `444cf4e`, 23/10/2026) ;
  - #615 `in: channel` ;
  - #616 `Reusable.value` Any ;
  - #620 identité des actions par `name` ;
  - #627 `$message.payload#/…` dans les exemples ;
  - #632 `steps` non vide.
- URL des PR : `https://github.com/OAI/Arazzo-Specification/pull/<n>`.

Articles, utilisés pour recouper et non comme source normative :
- Redocly, « Arazzo specification 1.1 release » : https://redocly.com/blog/arazzo-specification-1-1-release
- Zuplo, « Arazzo goes cross protocol » : https://zuplo.com/blog/arazzo-goes-cross-protocol

Normes citées par la spec : RFC 3986 (URI), RFC 6901 (JSON Pointer), RFC 9535 (JSONPath), XPath 3.1 (https://www.w3.org/TR/xpath-31/), RFC 8259 (JSON), RFC 9110 (HTTP), OpenAPI 3.2.0 (https://spec.openapis.org/oas/v3.2.0.html), AsyncAPI 3 (https://www.asyncapi.com/docs/reference/specification/latest).

Outillage de cette analyse, dans le scratchpad de session (non versionné) :
- `schema_diff.py` : diff structuré des `$defs` ;
- `probe.py` : exécution des fixtures officielles et des sondes avec `jsonschema` 4.26 (Draft 2020-12).
