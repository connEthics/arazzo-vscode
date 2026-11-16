# R4 — Runners E2E Arazzo : matrice, essais réels et recette CI

> Lot R4 de la refonte Arazzo 1.1.0 (ConnEthics). État au **16/11/2026**.
> Tous les essais ont été faits le 16/11/2026 dans un bac à sable Linux (Node 22.23, Python 3.13, Docker 29.9, rustc 1.97). Les fichiers et les sorties brutes sont dans le scratchpad du lot : `/tmp/claude-0/-home-user/77a66958-9b7d-5a4c-a557-79c16617136f/scratchpad/r4/`. Ce dossier est éphémère, mais les fichiers clés sont reproduits plus bas.

## 1. En bref

- **Runner HTTP par défaut : Redocly Respect** (`@redocly/cli@2.79.0 respect`). Il est open source (MIT), lancé par `npx` sans installation, et c'est l'outil le plus mûr. Il accepte les documents `arazzo: 1.1.0` (`lint` valide contre le schéma 1.1) et exécute `in: querystring` et l'Expression Type Object. Ses limites sont **mesurées** :
  - il **n'évalue pas les Selector Objects** 1.1 dans les `outputs` : la valeur passe telle quelle et finit en `/orders/[object Object]` ;
  - il n'applique pas la sémantique truthy 1.1 d'un JSONPath (`$.id` échoue) ;
  - il **refuse explicitement AsyncAPI** ;
  - il ne produit pas de JUnit natif. Le JSON qu'il produit se convertit avec un script de 30 lignes, fourni et testé.
- **Étapes asynchrones : deux outils les exécutent réellement**, testés de bout en bout avec un broker Kafka :
  - **Specmatic Arazzo** (image `specmatic/enterprise`, **commercial**) gère `send` et `receive`, avec corrélation, timeout et `dependsOn`. Il est testé HTTP → Kafka `send` → Kafka `receive`, avec un cas négatif par timeout.
  - **arazzo-cli** de strefethen (Rust, MIT, v0.9.0) gère **`receive` Kafka uniquement**, avec un **JUnit natif**. Il est testé HTTP → Kafka `receive`, avec un cas négatif par timeout.
- **Pour simuler le broker** : Kafka en conteneur (`apache/kafka:3.9.1`), avec **Microcks 1.16.0** (uber + async-minion) pour produire les événements AsyncAPI.
  - Testé : Microcks publie sur Kafka et Specmatic comme arazzo-cli consomment ces messages.
  - Piège : Microcks nomme le topic `<Service>-<version>-<opération>` et non d'après l'`address` AsyncAPI.
- **Image `specmatic/specmatic-arazzo`** : elle **n'existe plus** sur Docker Hub (404, `pull access denied`). Les fonctions Arazzo sont dans **`specmatic/enterprise`**, qui embarque une licence d'essai valable jusqu'au 01/01/2028.
- **Jentic arazzo-runner 0.9.6** : il s'installe en 5 s, mais il est peu fiable en CI.
  - Le code retour vaut 0 alors que le workflow est en erreur.
  - La forme `operationId: $sourceDescriptions.x.y` n'est pas comprise.
  - L'Expression Type Object est ignoré, ce qui donne des faux positifs.
  - Pas de Selector Object ni d'AsyncAPI.
- **Piège d'interopérabilité majeur** : un critère JSONPath à filtre sur la racine (`$[?@.status == 'x']`) **passe dans Respect, mais échoue dans tous les runners stricts RFC 9535** (Jentic, @usearazzo/runner, arazzo-cli). Specmatic ne l'implémente pas. **Seuls les critères `simple` avec JSON Pointer sont portables** (`$response.body#/status == 'pending'`) : testés OK sur les 5 runners exécutables.

## 2. Matrice des outils

Légende :
- ✅ : vérifié par essai ;
- ☑️ : documenté par l'éditeur, non testé ici ;
- ⚠️ : partiel ;
- ❌ : absent ou refusé ;
- — : sans objet.

| Outil | Licence | Langage, distribution | Arazzo 1.0 | Arazzo 1.1 | AsyncAPI send/receive | Assertions | Sorties | CI | Mocks intégrés | Maturité (16/11/2026) |
|---|---|---|---|---|---|---|---|---|---|---|
| **Redocly Respect** (`@redocly/cli respect`) | MIT | TypeScript, npm (`npx`) | ✅ | ⚠️ (lint ✅ ; querystring ✅ ; Expression Type ✅ ; Selector ❌ ; truthy ❌) | ❌ refus explicite | `successCriteria` simple, regex, jsonpath (pas XPath), plus des contrôles automatiques (statut déclaré, content-type, schéma) | console, `-J` JSON, `-H` HAR (1 fichier max) ; pas de JUnit | ✅ code retour fiable, `npx` | ❌ (serveur réel ou mock tiers) | v2.79.0 publiée le 16/11/2026 ; releases plusieurs fois par semaine |
| **Specmatic Arazzo** (image `specmatic/enterprise`) | **Commercial** (licence d'essai embarquée jusqu'au 01/01/2028, 200 req de rate limit) | Kotlin/JVM, Docker | ✅ | ⚠️ (Selector ✅ en `jsonpointer` uniquement, JSONPath refusé ; critères `jsonpath` « Not yet implemented ») | ✅ **send + receive** (Kafka testé ; gRPC et GraphQL annoncés) | critères simples, validation « closed-loop » contre les schémas, scénarios via `*.arazzo_input.json` | console, HTML + `workflow_outputs.json` ; JUnit ❌ pour Arazzo | ✅ Docker (le code retour peut valoir 0 malgré « Errors: 1 » sur un receive forké) | ✅ `mock` du workflow entier ; stubs OpenAPI/AsyncAPI | Enterprise v1.29.2 / Core v2.56.3, image du 15/11/2026 |
| **Jentic arazzo-runner** (PyPI `arazzo-runner`) | Apache-2.0 | Python, pip | ⚠️ (`operationId` qualifié non résolu) | ⚠️ (truthy ✅ ; querystring ignoré ; Selector ❌ ; Expression Type ignoré, faux positif) | ❌ | simple, regex, jsonpath (jsonpath-ng, sans fonctions RFC 9535) | console (repr Python) ; pas de JSON ni de JUnit | ❌ code retour = statut de la *dernière* étape seulement | ❌ | v0.9.6 du 22/04/2026, « Beta » ; dernier commit le 12/06/2026 |
| **arazzo-cli** (strefethen, Rust) | MIT | Rust, `cargo build`, binaires GitHub Releases | ✅ | ✅ cible 1.1.0, avec des écarts documentés (Selector ✅, truthy ✅, querystring ✅, `$self` ✅ strict) | ⚠️ **receive Kafka uniquement** ; send refusé (OAI/Arazzo-Specification#617) | simple, regex, jsonpath RFC 9535, xpath | `test --format tap\|junit\|json` ✅, traces `trace.v1`, replay | ✅ code retour fiable | ❌ (`--dry-run`) | v0.9.0, dernier commit le 15/11/2026 ; serveur MCP retiré en 0.9.0 |
| **@usearazzo/runner** (ex-`@jentic/arazzo-*`) | Apache-2.0 | TypeScript, **bibliothèque** npm (pas de CLI d'exécution) | ✅ | ⚠️ (truthy ✅ ; Selector ❌, rejeté à la résolution) | ❌ (« No provider can handle » AsyncAPI) | simple, regex, jsonpath, xpath | objet résultat avec trace (à formater soi-même) | ⚠️ script maison | ❌ | 1.0.1-alpha.33 du 16/11/2026 ; CLI `usearazzo validate` seulement |
| **Speakeasy** (`speakeasy test`) | Commercial (CLI propriétaire, compte requis) | Go, CLI | ☑️ (`arazzo: 1.0.0`, sous-ensemble) | ❌ non documenté | ❌ | `simple` avec `==` et `!=` uniquement ; outputs depuis le body uniquement | tests générés dans le langage du SDK (TS, Python, Go…) | ☑️ GitHub Action Speakeasy | ✅ mock server Speakeasy (`localhost:18080`) | « Beta » ; c'est un générateur de tests SDK, pas un runner générique |
| **Itarazzo** (`itarazzo-library` + `itarazzo-client`) | Apache-2.0 | Java, JUnit 5 + Docker | ☑️ 1.0.0 | ❌ | ❌ | celles de la spec 1.0 | rapports JUnit (Surefire) ☑️ | ☑️ Maven ou Docker | ❌ | v0.1.1, **inactif** depuis le 17/11/2024 |
| **alirezaght/arazzo** (crate `arazzo-cli`) | Apache-2.0 | Rust, crates.io | ☑️ 1.0.x | ❌ | ❌ | ☑️ | ☑️ événements stockés en Postgres | ⚠️ (Postgres requis) | ❌ | 0.1.2 du 02/01/2026 |
| **JaredCE/Arazzo-Runner** (npm `arazzo-runner`) | MIT | Node | ☑️ | ❌ | ❌ | ☑️ | ☑️ | ☑️ | ❌ | 0.0.23 du 30/01/2026, très peu adopté |
| Bruno, Apidog | Divers | GUI | ☑️ import et exécution guidée | ? | ❌ | — | — | — | — | Hors périmètre : lecteurs de flux, pas des runners CI |

Notes sur la colonne Maturité :
- Les versions et dates viennent de npm, PyPI, crates.io, Docker Hub, Quay et de `git log` sur des clones superficiels.
- L'API GitHub n'était pas accessible depuis la session.

## 3. Conformité 1.1 mesurée (essais du 16/11/2026)

Même OpenAPI minimal et mêmes workflows pour tous les outils, avec Prism 5.16.0 en mock. Résultat attendu entre parenthèses.

| Cas testé | Respect 2.79.0 | Specmatic 1.29.2 | Jentic 0.9.6 | @usearazzo/runner α33 | arazzo-cli 0.9.0 |
|---|---|---|---|---|---|
| Workflow 1.0.1 HTTP, 2 étapes, critères `simple` (passe) | ✅ | ✅ | ✅* | ✅ | ✅ |
| Même document avec `arazzo: 1.1.0` (passe) | ✅ | ✅ | ✅* | ✅ | ✅ |
| `operationId: $sourceDescriptions.orders.createOrder` (forme qualifiée) | ✅ | ✅ | ❌ « not found in source descriptions » | ✅ | ✅ |
| Critère `simple` `$response.body#/status == 'pending'` (passe) / `== 'NOPE'` (échoue) | ✅ / ✅ | ✅ / ✅ détecté **statiquement** (enum du schéma) | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| JSONPath `$.id` (1.1 : nodelist non vide = vrai) | ❌ échoue | ❌ non implémenté | ✅ | ✅ | ✅ |
| JSONPath filtre racine `$[?@.status == 'pending']` | ✅ (racine enveloppée) | ❌ non implémenté | ❌ | ❌ | ❌ |
| JSONPath fonction `length()` | ✅ | ❌ | ❌ erreur de parse | ❌ (sémantique racine) | ❌ (sémantique racine) |
| Expression Type Object `type: {type: jsonpath, version: rfc9535}` sur un critère faux (échoue) | ✅ échoue | — | ❌ **ignoré → passe** | ✅ échoue | ✅ échoue |
| Selector Object dans `outputs` (`context`/`selector`/`type`) | ❌ objet brut propagé (`/orders/[object Object]`) | ✅ en `jsonpointer` ; ❌ en `jsonpath` (« supports only 'jsonpointer' ») | ❌ objet brut | ❌ rejeté (« not a valid runtime expression ») | ✅ |
| `in: querystring` | ✅ `?expand=items&lang=fr` | non testé | ❌ ignoré en silence | non vérifié | ✅ `?expand=items&lang=fr` |
| `$self` absolu + `url` relative | ignoré | ignoré | ignoré | non testé | ✅ strict : base URI = `$self`, donc la source locale n'est pas trouvée |
| `dependsOn` (étape) | accepté | ✅ (receive « forké ») | ignoré | ☑️ annoncé | ☑️ annoncé (`--parallel`) |
| Source `type: asyncapi` + `action: send` | ❌ « Respect does not support yet » | ✅ Kafka | ❌ | ❌ | ❌ refus explicite |
| `action: receive` + `correlationId` + `timeout` | ❌ | ✅ Kafka, timeout → FAILED | ❌ | ❌ | ✅ Kafka, timeout → `RUNTIME_MESSAGE_RECEIVE_TIMEOUT` |
| JUnit natif | ❌ (script fourni) | ❌ (HTML + JSON) | ❌ | ❌ | ✅ |
| Code retour non nul en cas d'échec | ✅ | ✅ (échec) ; ⚠️ 0 avec « Errors: 1 » sur receive forké réussi | ❌ 0 si l'échec n'est pas sur la dernière étape | — (bibliothèque) | ✅ |

\* Jentic : seulement après avoir remplacé l'`operationId` qualifié par un `operationId` nu.

## 4. Fiches outils, commandes exactes et sorties réelles

### 4.1 Redocly Respect

- **Installation** : aucune, `npx -y @redocly/cli@2.79.0 …`. Épingler la version, car `@latest` publie plusieurs fois par semaine.
- **Exécution** :
  ```bash
  npx -y @redocly/cli@2.79.0 lint order-flow.arazzo.yaml           # schéma 1.0 ou 1.1 selon `arazzo:`
  npx -y @redocly/cli@2.79.0 respect order-flow.arazzo.yaml \
    --server orders=http://127.0.0.1:4010 \                         # surcharge du serveur par sourceDescription
    --input sku=BOOK-42 \                                           # inputs du workflow
    --json-output respect.json --har-output respect.har -v
  ```
- **Aide réelle** (`npx @redocly/cli@latest respect --help`, v2.79.0) : `-i/--input`, `-S/--server`, `-w/--workflow`, `-s/--skip`, `-v/--verbose`, `-H/--har-output`, `-J/--json-output`, `--mtls`, `--severity`, `--max-steps` (2000), `--max-fetch-timeout` (40000 ms), `--execution-timeout` (1 h) et `--no-secrets-masking`. Aucune option JUnit.
- **Sortie réelle, workflow HTTP contre Prism** :
  ```
  ✓ POST /orders - step createOrder
    ✓ success criteria check - $statusCode == 201
    ✓ success criteria check - $[?length(@.id) > 0]
    ✓ status code check - $statusCode in [201]
    ✓ content-type check
    ✓ schema check
  ✓ GET /orders/{orderId} - step getOrder
    ...
  Workflows: 1 passed, 1 total | Steps: 2 passed | Checks: 10 passed, 10 total | Time: 146ms
  ```
- **Document 1.1.0** : `lint` → « Woohoo! Your API description is valid » ; `respect` passe.
  - Contre-épreuve : le même document async en `arazzo: 1.0.1` est rejeté par `lint`. Le message est « `type` can be one of the following only: "arazzo" », puis « Property `action` is not expected here ». Avec `arazzo: 9.9.9`, le message est « Unsupported Arazzo version ».
  - Le lint est donc bien versionné.
- **Selector Object** : le run passe en vert mais `Request URL: http://127.0.0.1:4010/orders/[object Object]`. C'est un **faux positif** silencieux, à éviter dans les exemples tant que Respect ne le gère pas.
- **AsyncAPI** :
  ```
  ✗ publishPlaced
    ✗ unexpected error
    Reason: Source description events is an AsyncAPI description, which Respect does not support yet.
            Upvote or open an issue: https://github.com/Redocly/redocly-cli/issues.
  ```
  Ce message confirme l'hypothèse de mai 2026 : toujours pas d'AsyncAPI en novembre 2026. Le billet Redocly sur la 1.1 se contente de sonder l'intérêt des lecteurs.
- **Particularités** :
  - contrôles automatiques supplémentaires (statut parmi ceux déclarés, content-type, schéma de réponse) ;
  - `--har-output` refuse plusieurs fichiers (« Currently only a single file can be run with --har-output ») ;
  - XPath non supporté.

### 4.2 Specmatic Arazzo

- **Image** :
  - `docker pull specmatic/specmatic-arazzo` → `pull access denied … repository does not exist` (Docker Hub API : 404 sur ce dépôt).
  - La documentation (`docs.specmatic.io/supported_protocols/arazzo`, badge « Commercial ») indique désormais `specmatic/enterprise`.
  - `show-license` : `License type: TRIAL`, expiration le 01/01/2028, `Rate limit: 200`.
- **Commandes** (testées) :
  ```bash
  docker run --rm --network host -v "$PWD:/usr/src/app" specmatic/enterprise:1.29.2 \
    test order-flow.arazzo.yaml --sourceNameToBaseUrl orders=http://127.0.0.1:4010
  # autres options Arazzo : --serverUrlIndex N (OpenAPI), --serverName NAME (AsyncAPI), --host/--port (repli)
  docker run --network host -v "$PWD:/usr/src/app" specmatic/enterprise mock <workflow.arazzo.yaml>   # documenté, non testé
  ```
- **Fichier d'entrées obligatoire** : sans `order-flow.arazzo_input.json`, le run s'arrête sur « Input file not found » (0 test). Le format est `{"<workflowId>": {"DEFAULT": {…inputs…}, "<stepId>.<action>": {…}}}`. Chaque clé hors `DEFAULT` crée un scénario supplémentaire (chemins malheureux).
- **Validation « closed-loop »** : avant d'appeler quoi que ce soit, Specmatic vérifie que les critères sont satisfiables vis-à-vis des schémas.
  - Exemple réel : `$response.body#/status == 'NOPE'` est rejeté avec « Could not generate a value matching this pattern… enum [pending, confirmed, shipped] ».
  - Toute étape **sans `successCriteria`** est rejetée (« No scenario satisfies the condition: AND {} »).
- **Limites mesurées** :
  - critères `type: jsonpath` → `kotlin.NotImplementedError: An operation is not implemented` ;
  - Selector JSONPath → « Arazzo 1.1 allows selector types 'jsonpath', 'xpath', and 'jsonpointer', but we currently supports only 'jsonpointer' » ;
  - `--junitReportDir` sans effet pour Arazzo.
- **Async réel (Kafka)** : HTTP POST → `send` sur `orders.placed` → `receive` sur `orders.confirmed` avec `correlationId`, `timeout` et `dependsOn`.
  ```
  Step 'createOrder' … has SUCCEEDED
  [Specmatic Async::Test] Message published successfully on topic 'orders.placed'
  Step 'publishPlaced' … has SUCCEEDED
  [Specmatic Async::Test] Received a message on topic 'orders.confirmed' (match=true)
  Step 'awaitConfirmed' … was ABORTED   Reason: Forked Step … Please check HTML Report for accurate results
  | 100% | httpThenAsync | createOrder | Success | … publishPlaced | Success | … awaitConfirmed | Success |
  Tests run: 3, Successes: 2, Failures: 0, WIP: 0, Errors: 1          (code retour 0)
  workflow_outputs.json → "result": "passed", outputs {orderId: ord_123, status: confirmed}
  ```
  - Cas négatif (aucun événement) : « Timeout waiting for a message on topic 'orders.confirmed' », `Failures: 1`, **code retour 1**, `"result": "failed"`.
  - En CI, il faut donc juger sur `workflow_outputs.json` ou sur le code retour, pas sur la ligne « Errors ».
- **Convention send/receive** : Specmatic attend une AsyncAPI **qui décrit le système testé**. Le `send` Arazzo correspond à une opération AsyncAPI `action: receive`, et inversement.
  - Avec une AsyncAPI « vue client », l'erreur est « No matching scenario found for operationId: publishOrderPlaced and action: send ».
  - arazzo-cli fait l'inverse (voir 4.4). La spec 1.1 ne tranche pas : `action` y est décrit du point de vue de l'étape.

### 4.3 Jentic arazzo-runner

- **Installation** (5 s) : `python3 -m venv venv && ./venv/bin/pip install arazzo-runner` → `arazzo_runner 0.9.6`, Apache-2.0, dépendances `jsonpath-ng`, `pydantic`, `requests`.
- **Exécution** :
  ```bash
  ./venv/bin/arazzo-runner execute-workflow order-flow.arazzo.yaml --workflow-id createAndFetchOrder \
    --inputs '{"sku":"BOOK-42","quantity":2}' [--server-variables '{"…":"…"}']
  # autres sous-commandes : list-workflows, describe-workflow, execute-operation, show-env-mappings, generate-example
  ```
- **Sorties réelles** :
  - La forme qualifiée donne `ERROR - Error executing step createOrder: Operation $sourceDescriptions.orders.createOrder not found in source descriptions`. La recherche se fait sur l'`operationId` nu (`operation_finder.py`).
  - Avec un `operationId` nu, le workflow passe. Mais pour un échec à la première étape, la sortie affiche `WorkflowExecutionResult(status=error, …)` et le **code retour vaut 0**. `__main__.py` ne regarde que le statut de la dernière étape, restée « pending ».
- **Limites mesurées** : Expression Type Object ignoré, ce qui fait passer un critère faux ; Selector Object recopié tel quel ; `in: querystring` absent de la requête ; pas d'AsyncAPI ; pas de sortie JSON ni de JUnit.
- **Usage pertinent** : c'est un moteur d'exécution pour agents (lien avec le lot R3, MCP), pas un runner de tests CI.

### 4.4 arazzo-cli (strefethen)

- **Installation** : les binaires sont publiés sur GitHub Releases, inaccessible depuis la session (403). L'outil a donc été construit depuis les sources, dans le scratchpad, en 2 min 30 :
  ```bash
  git clone --depth 1 https://github.com/strefethen/arazzo-cli && cd arazzo-cli
  CARGO_HOME=$PWD/../cargo-home CARGO_TARGET_DIR=$PWD/../cargo-target RUSTUP_TOOLCHAIN=stable \
    cargo build --release -p arazzo-cli --locked
  ```
- **Exécution** :
  ```bash
  arazzo-cli validate order-flow.arazzo.yaml        # « Valid Arazzo 1.0.1 spec » / « Valid Arazzo 1.1.0 spec »
  arazzo-cli run spec.arazzo.yaml <workflowId> --input sku=BOOK-42 --input-json quantity=2 --json
  arazzo-cli test examples/ --format junit > junit.xml     # tap | junit | json ; --filter, --fail-fast
  ```
- **Async réel, `receive` Kafka sur le topic alimenté par Microcks** :
  ```
  {"kind": "success", "outputs": {"orderId": "ord_123", "status": "confirmed"}}      (code 0)
  ```
  - Cas négatif (`correlationId: ord_999`, `timeout: 5000`) : `RUNTIME_MESSAGE_RECEIVE_TIMEOUT: no message arrived on topic … within the step timeout of 5000 ms after skipping 1 non-matching record(s)` (code 1).
  - JUnit produit : `<testsuites name="arazzo" tests="1" failures="0" errors="0">`.
- **Exigences strictes, utiles comme garde-fous pour E1** :
  - un `correlationId` exige un Correlation ID Object dans le message AsyncAPI ;
  - `channelPath` doit s'écrire `'{$sourceDescriptions.events.url}#/channels/…'`, avec accolades ;
  - `send` est refusé (« the outgoing message contract is unresolved upstream (OAI/Arazzo-Specification#617) ») ;
  - un `$self` absolu change la base de résolution des `url` relatives, ce qui est conforme à la spec 1.1 ;
  - `generate` refuse l'OpenAPI 3.1.

### 4.5 Autres outils

- **@usearazzo/runner**, ex-`@jentic/arazzo-*` : bibliothèque testée via un script de 10 lignes (`ArazzoRunner.load()` puis `execute()`). Elle est sérieuse sur la sémantique (RFC 9535 strict, Expression Type respecté), mais c'est une alpha sans CLI d'exécution, sans Selector et sans AsyncAPI (« UnmatchedProviderError No provider can handle the document … orders.asyncapi.yaml »). À surveiller.
- **Speakeasy** : non testé, car la CLI est propriétaire et demande un compte. D'après sa documentation :
  - le fichier `.speakeasy/tests.arazzo.yaml` est en `arazzo: 1.0.0` ;
  - les seuls opérateurs sont `==` et `!=` ;
  - la commande est `speakeasy test`, contre le mock Speakeasy (`localhost:18080`), désactivable avec `--disable-mockserver` ;
  - il génère des tests **dans le SDK**.

  Ce n'est pas un runner générique pour nos exemples.
- **Itarazzo** : extension JUnit 5 (`ItarazzoExtension`, propriétés `arazzo.file` / `arazzo.inputs.file`) et client Docker. Le dernier commit date de novembre 2024, la version est 0.1.1 et l'outil ne gère que la 1.0. À citer, mais pas à recommander.
- **alirezaght/arazzo** (crate `arazzo-cli` 0.1.2) : moteur Rust avec persistance Postgres. Il ne connaît que la 1.0.x et est inactif depuis janvier 2026.

## 5. Mocks, stubs et broker

| Outil | Rôle | Commande testée | Comportement observé |
|---|---|---|---|
| **Stoplight Prism 5.16.0** (Apache-2.0, 17/07/2026) | Mock OpenAPI HTTP | `npx -y @stoplight/prism-cli@5.16.0 mock -h 127.0.0.1 -p 4010 orders.openapi.yaml` | Sert les `example` de l'OpenAPI, de façon **déterministe**. Valide la requête (422 si un paramètre est invalide, ce qui a révélé le Selector non évalué chez Jentic). Pas d'AsyncAPI, pas d'état. Option `-d` pour des réponses dynamiques. |
| **Specmatic stub** (`specmatic/specmatic`, MIT, Core 2.56.3) | Mock OpenAPI (et AsyncAPI en Enterprise) | `docker run --network host -v "$PWD:/usr/src/app" specmatic/specmatic mock orders.openapi.yaml --port 9000` | Sans fichiers d'exemples externes, il génère des **valeurs aléatoires** (`"id": "UAMAY"`). Résultat : Respect échoue sur `status == 'confirmed'`. Il faut fournir des exemples (dossier `*_examples`) pour des assertions déterministes. |
| **Microcks 1.16.0** (Apache-2.0, CNCF incubating, 13/11/2026) | Mock OpenAPI + **AsyncAPI** (Kafka, MQTT, AMQP, WS…) | voir ci-dessous | Publie les `examples` AsyncAPI toutes les N secondes (`x-microcks-operation.frequency`) sur le topic `OrderEvents-1.0.0-onOrderConfirmed`. Consommé avec succès par Specmatic et par arazzo-cli. |
| **Kafka** `apache/kafka:3.9.1` (KRaft mono-nœud) | Broker | `docker run -d --network host apache/kafka:3.9.1` | Prêt en environ 10 s ; création de topics via `kafka-topics.sh`. |

**Microcks pour les étapes `receive`** (testé) :

```bash
docker run -d --name microcks --network host quay.io/microcks/microcks-uber:1.16.0-native   # API sur :8080
curl -F "file=@order-events.asyncapi.yaml" "http://127.0.0.1:8080/api/artifact/upload?mainArtifact=true"
docker run -d --name minion --network host \
  -e MICROCKS_HOST_PORT=127.0.0.1:8080 \
  -e ASYNC_PROTOCOLS=,KAFKA \
  -e KAFKA_BOOTSTRAP_SERVER=127.0.0.1:9092 \
  quay.io/microcks/microcks-uber-async-minion:1.16.0
# log réel : Publishing on topic {OrderEvents-1.0.0-onOrderConfirmed}, message: {"orderId":"ord_123","status":"confirmed"}
```

Pièges rencontrés :
1. **`ASYNC_PROTOCOLS=,KAFKA` avec la virgule initiale.**
   - La propriété du minion uber vaut `minion.supported-bindings=WS${ASYNC_PROTOCOLS:}`.
   - Avec `ASYNC_PROTOCOLS=KAFKA`, le minion « dé-planifie » le service sans message d'erreur.
2. **Nommage du topic.** Microcks publie sur `<Service sans espaces>-<version>-<nom d'opération>`, et non sur l'`address`. Le test doit utiliser une AsyncAPI de test dont l'`address` pointe ce topic, ou un vrai système testé.
3. **Corrélation.** Microcks rejoue un exemple figé (`orderId: ord_123`). La corrélation ne fonctionne donc que si le mock HTTP renvoie le même identifiant. C'est le cas avec les exemples Prism alignés.
4. **Ce que Microcks ne fait pas.** Il ne *réagit* pas au `send` d'un workflow. Il émet en continu, et le request-reply n'existe que pour certains protocoles. Pour une vraie chaîne send → traitement → receive, il faut le système réel ou un faux système testé. En essai, c'était un script `kafka-console-producer`.

**Alternative sans Microcks** pour un exemple minimal, testée avec Specmatic : un producteur Kafka scripté fait office de faux système testé.

```bash
for i in $(seq 1 30); do echo '{"orderId":"ord_123","status":"confirmed"}'; sleep 2; done \
 | docker exec -i kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server 127.0.0.1:9092 --topic orders.confirmed
```

**MQTT** : non testé. Microcks le gère (`ASYNC_PROTOCOLS=,MQTT` et broker `eclipse-mosquitto`). Pour Specmatic, le seul essai avec une AsyncAPI `protocol: mqtt` s'est arrêté avant toute connexion, sur une étape HTTP sans `successCriteria`. Le support MQTT n'a donc pas été vérifié. arazzo-cli ne gère que Kafka.

## 6. Pièges d'interopérabilité à intégrer aux exemples E1 et aux règles C1

1. **Critères JSONPath non portables.**
   - Respect enveloppe la racine : `$[?@.x == …]` passe et `$.x` échoue.
   - Jentic, @usearazzo et arazzo-cli appliquent RFC 9535 à la lettre : `$[?…]` itère les valeurs du membre racine, donc échoue, et `$.x` passe.
   - L'exemple de la spec `$[?count(@.pets) > 0]` relève du premier cas.
   - **Règle E1** : assertions de valeur en `simple` + JSON Pointer (`$response.body#/status == 'confirmed'`). Réserver JSONPath aux tests d'existence, en sachant que Respect les rejette. Une règle « info » de C1 pourrait signaler ce point.
2. **`operationId` qualifié** (`$sourceDescriptions.x.op`) : il casse Jentic mais il est exigé par arazzo-cli dès qu'il y a plusieurs sources. On le garde, car c'est la forme recommandée par la spec.
3. **Selector Object** : il n'est fiable qu'avec arazzo-cli et avec Specmatic (`jsonpointer`). Dans Respect, il donne un faux positif silencieux. Pour les exemples exécutés par Respect, on garde des outputs en expression `$response.body#/…` et on montre les Selectors dans un exemple dédié exécuté par arazzo-cli.
4. **`$self` absolu** : avec arazzo-cli, il change la base des `url` relatives. Dans les exemples, on omet `$self` ou on le met cohérent avec l'emplacement publié, et on fournit les sources via `--openapi`.
5. **Criterion `type: jsonpointer`** : ce type est invalide, l'enum ne contient que `simple`, `regex`, `jsonpath` et `xpath`. Specmatic rejette ce cas au schéma. `jsonpointer` n'est valable que pour les Selectors.
6. **Point de vue de `action`** : Specmatic attend une AsyncAPI du système testé (send ↔ receive inversés), arazzo-cli une AsyncAPI côté consommateur. La spec ne tranche pas. **Il faut documenter la convention retenue dans chaque README d'exemple**, et R1/C1 pourraient la noter comme ambiguïté.
7. **`channelPath`** avec accolades : `'{$sourceDescriptions.events.url}#/channels/orderConfirmed'`.

## 7. Recommandation

**Exemples HTTP** (`e2e-session-renewal`, la partie HTTP d'`order-to-cash`, `onboarding-entreprise-fr`, `mcp-travel-booking`) : **Prism 5.16.0 + Redocly Respect 2.79.0** (versions épinglées), plus la conversion JSON → JUnit fournie.
- Raisons : tout est open source et sans installation (`npx`), le code retour est fiable, le lint est versionné 1.0/1.1, et Respect est l'outil cité comme le plus mûr dans l'écosystème.
- Contraintes d'écriture :
  - critères en `simple` + JSON Pointer ;
  - pas de Selector Object dans les workflows exécutés par Respect.
- **Second runner de contrôle** : arazzo-cli (`test --format junit`). Il valide aussi les constructions 1.1 que Respect ignore (Selector, truthy, `$self`) et sert de filet contre les faux positifs. On l'ajoutera au CI quand un binaire publié sera récupérable, sinon on le construit avec `cargo`.

**Exemples asynchrones** (`order-to-cash` avec `receive order.confirmed`, `mcp-support-refund` avec `send refund.issued`) :
- **`receive`** :
  - arazzo-cli (MIT) + Kafka en conteneur + Microcks async-minion (ou producteur scripté) ;
  - JUnit natif ;
  - c'est la **voie open source recommandée**.
- **`send`** : **Specmatic Arazzo** (`specmatic/enterprise`), seul outil testé qui exécute `send` et le couple `send`/`receive` dans un même workflow.
  - Il est commercial : l'essai embarqué suffit pour une démo, mais il faut une licence au-delà.
  - Son job CI est marqué `continue-on-error` tant que la licence n'est pas tranchée.
- **Limite à documenter** dans le README de `mcp-support-refund` : **aucun runner open source n'exécute `action: send` en novembre 2026**.
  - Respect, Jentic et @usearazzo ne gèrent aucune étape AsyncAPI ; arazzo-cli refuse `send` en invoquant OAI/Arazzo-Specification#617.
  - La recette open source se limite donc à valider le document (`redocly lint`, `arazzo-cli validate`) et à vérifier l'événement à part avec un test de conformité Microcks (mode `ASYNC_API_SCHEMA`, documenté, non testé ici), sans exécution Arazzo de bout en bout.

## 8. Modèle GitHub Actions

Pipeline : mock, puis runner, puis rapport JUnit.
- Le job HTTP a été **rejoué localement commande par commande**. Ce rejeu a d'ailleurs fait apparaître la limite `--har-output` sur plusieurs fichiers.
- Le job async reprend les commandes testées à la main, mais n'a pas été exécuté dans GitHub Actions.
- La syntaxe YAML a été vérifiée avec `yaml.safe_load`.

`.github/workflows/arazzo-e2e.yml` :

```yaml
name: arazzo-e2e

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  checks: write          # requis par l'action de publication du rapport JUnit

jobs:
  http-workflows:
    name: Workflows HTTP (Prism + Respect)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      REDOCLY_CLI_VERSION: 2.79.0
      PRISM_VERSION: 5.16.0
      EXAMPLE_DIR: examples/e2e-order-to-cash
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      # 1. Mock : Prism sert les exemples de l'OpenAPI (réponses statiques et déterministes)
      - name: Démarrer le mock Prism
        run: |
          npx -y @stoplight/prism-cli@${PRISM_VERSION} mock \
            -h 127.0.0.1 -p 4010 "${EXAMPLE_DIR}/orders.openapi.yaml" > prism.log 2>&1 &
          for i in $(seq 1 30); do
            curl -s -o /dev/null http://127.0.0.1:4010/orders/healthcheck && exit 0
            sleep 1
          done
          echo "Prism n'a pas démarré"; cat prism.log; exit 1

      # 2. Lint du document Arazzo (schéma 1.0 ou 1.1 selon le champ `arazzo`)
      - name: Lint Arazzo
        run: npx -y @redocly/cli@${REDOCLY_CLI_VERSION} lint "${EXAMPLE_DIR}"/*.arazzo.yaml

      # 3. Runner : Respect, sortie JSON conservée pour le rapport
      #    (--har-output n'accepte qu'un seul fichier Arazzo par exécution)
      - name: Exécuter les workflows (Respect)
        run: |
          mkdir -p reports
          npx -y @redocly/cli@${REDOCLY_CLI_VERSION} respect "${EXAMPLE_DIR}"/*.arazzo.yaml \
            --server orders=http://127.0.0.1:4010 \
            --json-output reports/respect.json

      # 4. Rapport JUnit : Respect n'en produit pas, conversion depuis le JSON
      - name: Convertir en JUnit
        if: always()
        run: |
          test -f reports/respect.json || exit 0
          node scripts/respect-to-junit.mjs reports/respect.json > reports/junit.xml

      - name: Publier le rapport JUnit
        if: always()
        uses: mikepenz/action-junit-report@v5
        with:
          report_paths: reports/junit.xml
          check_name: Arazzo E2E (HTTP)
          require_tests: true

      - name: Archiver les rapports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: arazzo-http-reports
          path: |
            reports/
            prism.log

  async-workflows:
    name: Workflows HTTP + Kafka (Microcks + Specmatic)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    # Specmatic Arazzo est commercial : licence d'essai embarquée dans l'image,
    # licence Enterprise à prévoir au-delà. Job optionnel tant que ce point n'est pas tranché.
    continue-on-error: true
    services:
      kafka:
        image: apache/kafka:3.9.1      # KRaft mono-nœud, écoute sur localhost:9092
        ports: ['9092:9092']
    env:
      EXAMPLE_DIR: examples/e2e-order-to-cash
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Mock HTTP (Prism)
        run: |
          npx -y @stoplight/prism-cli@5.16.0 mock -h 0.0.0.0 -p 4010 \
            "${EXAMPLE_DIR}/orders.openapi.yaml" > prism.log 2>&1 &

      # Microcks rejoue les exemples AsyncAPI sur Kafka (topic nommé <Service>-<version>-<opération>)
      - name: Mock événements (Microcks uber + async-minion)
        run: |
          docker run -d --name microcks --network host quay.io/microcks/microcks-uber:1.16.0-native
          for i in $(seq 1 60); do curl -sf http://127.0.0.1:8080/api/services >/dev/null && break; sleep 2; done
          docker run -d --name minion --network host \
            -e MICROCKS_HOST_PORT=127.0.0.1:8080 \
            -e ASYNC_PROTOCOLS=,KAFKA \
            -e KAFKA_BOOTSTRAP_SERVER=127.0.0.1:9092 \
            quay.io/microcks/microcks-uber-async-minion:1.16.0
          sleep 10
          curl -sf -F "file=@${EXAMPLE_DIR}/order-events.microcks.asyncapi.yaml" \
            "http://127.0.0.1:8080/api/artifact/upload?mainArtifact=true"

      # Runner : Specmatic Arazzo (seul outil testé qui exécute send/receive)
      - name: Exécuter les workflows (Specmatic Arazzo)
        working-directory: ${{ env.EXAMPLE_DIR }}
        run: |
          docker run --rm --network host -v "$PWD:/usr/src/app" specmatic/enterprise:1.29.2 \
            test e2e-order-to-cash.arazzo.yaml \
            --sourceNameToBaseUrl orders=http://127.0.0.1:4010
          # Le verdict fiable est dans workflow_outputs.json (une étape receive « ABORTED » est normale)
          node -e '
            const r = require("./build/reports/specmatic/arazzo/html/workflow_outputs.json");
            const ko = r.filter(s => s.result !== "passed");
            if (ko.length) { console.error(JSON.stringify(ko, null, 2)); process.exit(1); }'

      - name: Archiver les rapports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: arazzo-async-reports
          path: ${{ env.EXAMPLE_DIR }}/build/reports/specmatic/
```

**Variante open source du job async** (receive seulement), à substituer à l'étape Specmatic :

```yaml
      - name: Exécuter les workflows (arazzo-cli, receive Kafka)
        run: |
          # binaire publié sur les releases GitHub de strefethen/arazzo-cli, sinon :
          cargo install --git https://github.com/strefethen/arazzo-cli --tag v0.9.0 arazzo-cli --locked
          arazzo-cli test "${EXAMPLE_DIR}" --format junit > reports/junit.xml
```

Cette variante n'est pas testée en l'état : la commande `cargo install --git … --tag v0.9.0` est déduite du README et le tag n'a pas été vérifié. Le build par `cargo build` dans un clone, lui, est testé.

**Script `scripts/respect-to-junit.mjs`** (testé sur 5 suites et 7 cas, dont 4 échecs, sur un `unexpected error` AsyncAPI et sur un run vert, XML validé par `xml.dom.minidom`) :

```js
#!/usr/bin/env node
// Convertit la sortie JSON de `redocly respect -J` en JUnit XML.
// Usage : node respect-to-junit.mjs respect.json > junit.xml
import { readFileSync } from 'node:fs';

const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const suites = [];
for (const [file, res] of Object.entries(report.files ?? {})) {
  for (const wf of res.executedWorkflows ?? []) {
    const cases = (wf.executedSteps ?? []).map((step) => {
      const failed = (step.checks ?? []).filter((c) => !c.passed && c.severity === 'error');
      const body = failed.length
        ? `<failure message="${esc(failed.map((c) => c.name).join('; '))}">${esc(
            failed.map((c) => `${c.name}: ${c.condition ?? ''}\n${c.message ?? ''}`).join('\n\n'))}</failure>`
        : '';
      return { failed: failed.length > 0,
        xml: `    <testcase classname="${esc(`${file}.${wf.workflowId}`)}" name="${esc(step.stepId)}" time="${((step.totalTimeMs ?? 0) / 1000).toFixed(3)}">${body}</testcase>` };
    });
    const failures = cases.filter((c) => c.failed).length;
    suites.push(`  <testsuite name="${esc(`${file} / ${wf.workflowId}`)}" tests="${cases.length}" failures="${failures}" time="${((wf.totalTimeMs ?? 0) / 1000).toFixed(3)}">\n${cases.map((c) => c.xml).join('\n')}\n  </testsuite>`);
  }
}
process.stdout.write(`<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="arazzo-respect">\n${suites.join('\n')}\n</testsuites>\n`);
```

## 9. Fichiers de test (reproductibles)

`orders.openapi.yaml`, version abrégée : `POST /orders` (`createOrder`, 201 avec `example` `{id: ord_123, status: pending}`) et `GET /orders/{orderId}` (`getOrder`, 200 avec `example` `{id: ord_123, status: confirmed}`), `servers: [{url: http://127.0.0.1:4010}]`.

Workflow HTTP portable, qui passe sur Respect, Specmatic, Jentic (`operationId` nu), @usearazzo et arazzo-cli :

```yaml
arazzo: 1.1.0
info: { title: Simple criteria portability (R4), version: 1.0.0 }
sourceDescriptions:
  - { name: orders, url: ./orders.openapi.yaml, type: openapi }
workflows:
  - workflowId: simplePass
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.orders.createOrder
        requestBody: { contentType: application/json, payload: { sku: X, quantity: 1 } }
        successCriteria:
          - condition: $statusCode == 201
          - condition: $response.body#/status == 'pending'
```

Workflow async exécuté par arazzo-cli, avec Kafka et Microcks. L'AsyncAPI « vue consommateur » déclare `receiveOrderConfirmed: {action: receive}`, avec un `correlationId: {location: $message.payload#/orderId}` dans le message.

```yaml
arazzo: 1.1.0
info: { title: HTTP + Kafka receive (arazzo-cli R4), version: 1.0.0 }
sourceDescriptions:
  - { name: orders, url: ./orders.openapi.yaml, type: openapi }
  - { name: events, url: ./arazzo-cli-events.asyncapi.yaml, type: asyncapi }
workflows:
  - workflowId: httpThenReceive
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.orders.createOrder
        requestBody: { contentType: application/json, payload: { sku: X, quantity: 1 } }
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          orderId: $response.body#/id
      - stepId: awaitConfirmed
        operationId: $sourceDescriptions.events.receiveOrderConfirmed
        action: receive
        correlationId: $steps.createOrder.outputs.orderId
        timeout: 10000
        successCriteria:
          - condition: $message.payload#/status == 'confirmed'
        outputs:
          status: $message.payload#/status
    outputs:
      orderId: $steps.createOrder.outputs.orderId
      status: $steps.awaitConfirmed.outputs.status
```

Dans le scratchpad, les autres fichiers de sondes sont :
- `order-flow*.arazzo.yaml`, `probe-1.1-*.arazzo.yaml`, `jp-portability.arazzo.yaml` ;
- `spm/async-kafka-sut.arazzo.yaml` (Specmatic send/receive) ;
- `microcks/order-events.asyncapi.yaml` (Microcks) ;
- les sorties brutes `*.out` et `*.json`.

## 10. Sources

Toutes consultées le 16/11/2026.

- Spécification Arazzo 1.1.0 (Step Object, Criterion Object, Selector Object, Expression Type Object) : https://spec.openapis.org/arazzo/v1.1.0.html
- Redocly, annonce de la 1.1 (avec sondage sur l'intérêt pour AsyncAPI dans Respect) : https://redocly.com/blog/arazzo-specification-1-1-release
- Redocly Respect : https://redocly.com/docs/respect et https://redocly.com/respect-cli
- Paquet npm `@redocly/cli` (2.79.0) et `@redocly/respect-core` : https://www.npmjs.com/package/@redocly/cli
- Specmatic Arazzo (badge « Commercial », image `specmatic/enterprise`) : https://docs.specmatic.io/supported_protocols/arazzo et https://docs.specmatic.io/supported_protocols/arazzo/configuration
- Docker Hub `specmatic/enterprise` : https://hub.docker.com/r/specmatic/enterprise. L'ancien dépôt `specmatic/specmatic-arazzo` répond 404.
- Exemples Specmatic : https://github.com/specmatic/specmatic-arazzo-openapi-asyncapi-sample, https://github.com/specmatic/specmatic-arazzo-sample
- Jentic arazzo-engine / arazzo-runner : https://github.com/jentic/arazzo-engine et https://pypi.org/project/arazzo-runner/
- arazzo-cli (strefethen) : https://github.com/strefethen/arazzo-cli, notamment `docs/kafka-receive.md`
- Arazzo Toolkit (@usearazzo) : https://github.com/usearazzo/arazzo-toolkit et https://usearazzo.com/
- Speakeasy, tests Arazzo : https://www.speakeasy.com/docs/sdks/sdk-contract-testing/custom-contract-tests et https://www.speakeasy.com/blog/e2e-testing-arazzo
- Itarazzo : https://github.com/leidenheit/itarazzo-library et https://github.com/leidenheit/itarazzo-client
- alirezaght/arazzo : https://github.com/alirezaght/arazzo
- JaredCE/Arazzo-Runner : https://github.com/JaredCE/Arazzo-Runner
- API Evangelist, « The tools that actually execute your Arazzo workflows » (14/08/2026) : https://apievangelist.com/2026/08/14/the-tools-that-actually-execute-your-arazzo-workflows/
- Stoplight Prism : https://github.com/stoplightio/prism et https://www.npmjs.com/package/@stoplight/prism-cli
- Microcks (uber, async-minion, CNCF incubating) : https://microcks.io/documentation/installing/running-uber/, https://quay.io/repository/microcks/microcks-uber et https://www.cncf.io/blog/2026/05/07/microcks-becomes-a-cncf-incubating-project/
- Image Kafka officielle : https://hub.docker.com/r/apache/kafka
- OAI/Arazzo-Specification#617 (contrat du message sortant pour `send`), cité par arazzo-cli : https://github.com/OAI/Arazzo-Specification/issues/617
