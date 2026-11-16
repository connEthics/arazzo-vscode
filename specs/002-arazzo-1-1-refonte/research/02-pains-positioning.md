# R2 — Pains & positionnement d'Arazzo 1.1

> **Lot** : R2 (Vague 0, recherche et cadrage). **Date** : 16/11/2026. **Consommateurs** : W1 (article), W2 (landing), W3 (marketing), et dans une moindre mesure E1 et A2.
> **Méthode** : recherche web (WebSearch et WebFetch) sur les sources de `00-sources.md`, complétée par des sources indépendantes : rapports Postman et APIContext, Google Testing Blog, arXiv, OWASP, Gartner, règlement européen sur l'IA, Microsoft Learn. Chaque preuve renvoie à une source numérotée `[Sx]` (section 9).
> **Règle de prudence** : un chiffre n'est repris tel quel que s'il a été lu sur la page source. Les chiffres connus seulement par des relais secondaires portent la mention *(à vérifier)* et **ne doivent pas être publiés** sans contrôle de la source primaire. Beaucoup de sources sur Arazzo sont écrites par des éditeurs qui y ont un intérêt (SmartBear, Jentic, Redocly, Speakeasy, Bump.sh, Tyk) : elles sont signalées comme telles.

---

## 1. Synthèse exécutive

Vous avez documenté vos API. Vous n'avez pas documenté ce que vos clients cherchent à accomplir avec elles. Les **points** (les endpoints, décrits par OpenAPI) sont bien décrits. Les **lignes** qui les relient vivent dans des wikis, des collections Postman, des scripts de test et la mémoire de quelques personnes. Cet écart avait toujours un coût, en onboarding, en tests et en support. Il devient critique avec les agents IA : un agent qui doit *deviner* l'ordre des appels se trompe, consomme des tokens et ne se comporte pas deux fois de la même manière [S6][S7][S26].

Arazzo 1.1 (17/05/2026) donne à ces lignes un format standard, neutre et lisible par machine [S1]. On y décrit les séquences, les dépendances (`dependsOn`), les critères de succès, les retries et les branches d'échec, les étapes événementielles (AsyncAPI `send`/`receive`) et la réutilisation de sous-workflows [S4][S5]. Le même document sert de **documentation**, de **test E2E** (via un runner) et de **définition d'outil d'agent** (1 workflow = 1 outil MCP) [S2][S11].

**Ce qu'il faut dire honnêtement** :
- Arazzo est une **description**, pas un moteur. La spécification impose des sémantiques (par exemple « Tools MUST respect all declared `dependsOn` relationships »), mais pas d'implémentation de référence [S1].
- Il n'a pas de boucles, de transformations de données, d'étape humaine ni de transactions : ces éléments sont sur la roadmap [S3][S5][S10].
- Les runners sont peu nombreux et en retard sur la 1.1 [S15][S16].
- L'adoption est encore faible : 3 % des praticiens interrogés donnent Arazzo à leurs agents, contre 79 % pour MCP, selon un échantillon de 114 personnes d'une source éditeur [S10].

Le positionnement juste : **Arazzo est la couche contrat des enchaînements**, complémentaire des moteurs (Temporal, Step Functions) et des frameworks d'agents (LangGraph). Il ne les concurrence pas.

---

## 2. Les pains, un par un

Format de chaque pain : **Description** · **Preuves** · **Ce qu'apporte Arazzo 1.1** · **Limites honnêtes** · **En une phrase**.

### P1. Des endpoints sans intention métier

**Description.** OpenAPI décrit *ce que* l'on peut appeler, pas *pourquoi* ni *dans quel ordre*. « Réserver un voyage », « Onboarder une entreprise » ou « Rembourser un client » sont des intentions qui mobilisent 3 à 10 opérations, parfois sur plusieurs API. Le consommateur, humain ou agent, doit reconstituer l'intention à partir du catalogue d'opérations.

**Preuves.**
- Pour SmartBear, exposer chaque opération comme un outil MCP revient à exposer « du bruit » : « we're not exposing value, we're exposing noise ». La doctrine proposée est « expose value, not verbs » [S6] *(éditeur, co-auteur de la spec)*.
- Anthropic, sur la conception d'outils pour agents : « A common error we've observed is tools that merely wrap existing software functionality or API endpoints ». L'article recommande un outil `schedule_event` plutôt que `list_users` + `list_events` + `create_event` [S27].
- L'exemple de réservation de vol de Nordic APIs enchaîne 6 appels. Côté agent, il suffit d'un seul outil de haut niveau « book a flight » [S8].
- L'API moyenne compte 42 endpoints, avec des descriptions de « thousands of lines » [S18] *(chiffre cité par Speakeasy, source primaire non identifiée)*.

**Ce qu'apporte Arazzo 1.1.**
- Un `workflow` a un `workflowId`, un `summary`/`description`, des `inputs` typés en JSON Schema et des `outputs` nommés. C'est une intention métier formalisée [S1].
- Les étapes référencent des opérations existantes (`operationId`/`operationPath`), des canaux AsyncAPI (`channelPath`) ou d'autres workflows (`workflowId`). Il n'y a ni duplication ni réécriture de l'API.
- 1.1 : la réutilisation de workflows via les actions (`workflowId` + `parameters`) permet de composer des intentions, par exemple « renouveler la session » réutilisé partout [S4][S5].

**Limites honnêtes.**
- Arazzo ne *découvre* pas les intentions : quelqu'un doit les écrire et arbitrer lesquelles comptent. Mark Boyd (Platformable) : « Workflow use cases for AI need to be prioritized by business value » [S8].
- Le vocabulaire métier reste libre : Arazzo n'impose aucune taxonomie d'intentions.

**En une phrase.** *Vos API exposent des verbes, vos clients achètent des résultats : Arazzo décrit le chemin entre les deux.*

---

### P2. Des séquences d'intégration documentées de manière « tribale »

**Description.** L'ordre réel des appels, les pièges (« appeler `/token` avant `/accounts`, sinon 403 »), les valeurs à propager d'une réponse à l'autre : tout cela vit dans des pages Confluence, des collections Postman privées, des fils Slack et la tête de deux ou trois personnes. Cette connaissance est non versionnée, non testée et part avec les gens.

**Preuves.**
- Postman, *State of the API 2025* : **93 %** des équipes API rencontrent des blocages de collaboration. Les problèmes de documentation arrivent en tête, et la doc est « scattered across too many places » (chat, docs internes, e-mail, wikis). **55 %** peinent avec une documentation incohérente, et **34 %** ne trouvent pas les API qui existent déjà dans leur organisation [S20].
- Redocly : sans description des enchaînements, les équipes sont « stuck with tribal knowledge, brittle scripts, or endless back-and-forth », et les docs « maybe […] mention it, maybe they don't » [S13] *(éditeur)*.
- Le manque de documentation est historiquement le premier obstacle à la consommation d'API dans les éditions précédentes du rapport Postman, avec 54,3 % en 2020 [S20] *(chiffre 2020 lu via relais secondaires, à vérifier)*.

**Ce qu'apporte Arazzo 1.1.**
- Un fichier YAML versionné à côté de l'OpenAPI, revu en pull request comme le code. Bump.sh : « This can be done along with the code changes in a single pull request » [S12].
- Les dépendances de données entre étapes sont explicites : expressions `$steps.x.outputs.y`, et en 1.1 le **Selector Object** (JSONPath RFC 9535, XPath 3.1, JSON Pointer) avec version d'expression déclarée. Deux outils n'interprètent donc plus différemment la même extraction [S4][S5].
- Le rendu (doc, graphe) est généré à partir de la même source. C'est le cœur de l'extension VS Code et du Studio ConnEthics.
- 1.1 : `$self` donne une identité stable au document pour les références inter-fichiers [S4].

**Limites honnêtes.**
- Écrire le premier workflow demande de *faire parler* les détenteurs de la connaissance. C'est un travail d'ingénierie de la connaissance, pas un export automatique.
- Les collections Postman restent plus simples à produire pour un usage ponctuel.

**En une phrase.** *La connaissance d'intégration la plus précieuse de votre organisation n'est écrite nulle part : Arazzo lui donne un format versionné, relisible et testable.*

---

### P3. Des tests E2E fragiles, non portables et couplés aux outils

**Description.** Les parcours E2E d'API sont souvent codés à la main dans un framework (Jest, pytest, Karate) ou dans les scripts JavaScript d'une collection Postman. Ils sont couplés à l'outil, peu lisibles par les non-développeurs et dupliquent la connaissance de la doc. Ils cassent pour des raisons d'environnement autant que de régression.

**Preuves.**
- Google (Testing Blog) : la flakiness croît avec la taille des tests (« larger tests are more flaky », échange avec l'auteur, J. Listfield) [S33]. Les chiffres souvent cités (environ 1,5 % des exécutions flaky, environ 16 % des tests concernés, 14 % des « large tests ») viennent de ces billets mais n'ont pas pu être extraits du texte (graphiques). Statut : *(à vérifier avant publication)* [S32][S33].
- Speakeasy : les tests endpoint par endpoint ratent la réalité, car les utilisateurs « implement complex workflows that chain multiple API calls together » [S17]. « QA engineers often create Postman Collections that save API calls, but wouldn't it be nice to automate API testing? » [S18] *(éditeur)*.
- Microsoft, sur les sagas : « Integration testing is difficult because all services must run to simulate a transaction » [S31].
- Bump.sh : « The workflow itself becomes the test », et les critères de succès et d'échec deviennent « easily visible and knowable to everyone » [S12] *(éditeur)*.

**Ce qu'apporte Arazzo 1.1.**
- Un format de test **déclaratif et neutre**. Le même fichier peut être exécuté par Redocly Respect (« Describe tests in a YAML file in OpenAPI Arazzo format », en local ou en CI) [S14], par Specmatic, par Jentic Arazzo Runner, etc. [S15].
- `successCriteria` (conditions simples, regex, JSONPath, XPath), avec une sémantique truthy/falsy formalisée en 1.1. Deux runners doivent donc rendre le même verdict [S4][S5].
- 1.1 : `dependsOn` au niveau de l'étape pour les jonctions non linéaires (facture **et** expédition avant clôture), `receive` + `correlationId` + `timeout` pour vérifier qu'un événement arrive [S4].
- Constat d'API Evangelist : le marché utilise déjà Arazzo davantage comme **format de test** que comme format de description [S15] *(relais d'un rapport aujourd'hui retiré, à vérifier)*.

**Limites honnêtes.**
- **Pas de moteur normatif** : chaque runner implémente un sous-ensemble. Respect, le runner le plus mûr selon API Evangelist (« the most production-ready runner today »), ne gère pas XPath (« No support for XPath ») et ne mentionne pas AsyncAPI [S14][S15]. La démo Speakeasy n'implémente qu'un sous-ensemble de la spec [S17]. La portabilité est donc *réelle sur le noyau HTTP*, *partielle sur la 1.1*.
- L'écosystème d'exécution est petit : « Four projects. That is the honest inventory of things that run Arazzo », puis « closer to six » une semaine plus tard. Plusieurs sont en bêta ou pré-1.0, et aucun runner recensé ne mentionne la 1.1 [S15][S16].
- La flakiness d'environnement (données, mocks, secrets) ne disparaît pas. Il faut toujours des stubs (Prism, Specmatic) et un mécanisme de credentials. C'est le chantier du lot R4.
- « Well-formed means the YAML is shaped correctly » : les linters ne vérifient pas que les opérations référencées existent ni que les données circulent correctement [S15]. D'où l'intérêt de la validation sémantique du lot C1.

**En une phrase.** *Un parcours E2E décrit en Arazzo se lit comme une spec et s'exécute comme un test, sans être prisonnier d'un framework.*

---

### P4. Des agents IA qui devinent l'enchaînement des appels

**Description.** Donnez à un agent un catalogue d'outils générés depuis OpenAPI (un par endpoint) : il doit choisir les bons outils, les ordonner, propager les identifiants et interpréter les erreurs. Chaque étape coûte des tokens, ajoute de la variance et peut produire un appel halluciné : mauvais outil, paramètre inventé, étape sautée.

**Preuves.**
- **Précision vs nombre d'outils.**
  - RAG-MCP (arXiv, mai 2025) : avec le catalogue complet exposé, la précision de sélection d'outil tombe à **13,62 %**. Elle passe à **43,13 %** en filtrant, avec plus de 50 % de tokens de prompt en moins [S25].
  - Speakeasy, citant D. Breunig : « Thirty tools is the critical threshold » et « Models are virtually guaranteed to fail at tool selection tasks when choosing from over 100 tools » [S19] *(relais, à vérifier)*.
  - Nordic APIs relaie un benchmark Orbital : environ **30 %** de précision avec 300 endpoints exposés [S7] *(relais, à vérifier)*.
- **Non-déterminisme.**
  - τ-bench (2024) : même les meilleurs agents à appel de fonctions réussissent moins de 50 % des tâches. Ils sont « quite inconsistent (pass^8 <25% in retail) », c'est-à-dire que moins d'un quart des tâches sont réussies 8 fois sur 8 [S26].
  - Nordic APIs : les stratégies de raisonnement des LLM sont « inherently indeterministic ». Les risques se cumulent : « As multiple API calls […] are connected together by agents, the risk of emergent behaviors compounds » [S7].
- **Coût en tokens.** « rapid token consumption within limited context windows » [S7]. Les séquences prédéfinies réduisent les tokens consacrés à déduire l'ordre des appels [S8]. Il n'existe pas encore de mesure publique propre à Arazzo, donc **pas de chiffre à publier**.
- **Hallucination.** SmartBear présente les workflows standardisés comme un moyen de « Prevent AI hallucinations or incorrect outputs » [S6]. Nordic APIs rappelle le cas du chatbot d'Air Canada, qui a inventé une règle de remboursement faute d'avoir interrogé le système de référence [S7].
- **Coût business.** Gartner prévoit que plus de 40 % des projets d'IA agentique seront abandonnés d'ici fin 2027, pour cause de « escalating costs and unclear business value » [S29].
- **Marché.** Postman 2025 : seuls **24 %** des développeurs conçoivent leurs API en pensant aux agents, contre 60 % uniquement pour les humains [S20].

**Ce qu'apporte Arazzo 1.1.**
- Le pattern **1 workflow = 1 outil** : `workflowId`→nom, `description`→description, `inputs`→`inputSchema`, `outputs`→résultat structuré. L'agent choisit une *intention* parmi quelques outils, et le serveur déroule la séquence de façon déterministe [S8][S10][S11]. Détails au lot R3.
  - Bump.sh exécute des workflows Arazzo sur ses serveurs MCP depuis le 17/04/2026 [S11].
  - Frank Kilcommins (Jentic) : MCP décrit *ce que* l'agent peut appeler, Arazzo *l'ordre* et le passage des données [S10].
- Retries et branches d'échec déclarés côté serveur (`onFailure` : `retry` avec `retryAfter`/`retryLimit`, `goto`, `end`). L'agent ne « martèle » plus une API jusqu'au rate limit et n'abandonne plus le flux au premier échec [S7].
- 1.1 : les étapes AsyncAPI permettent à un agent d'opérer des systèmes événementiels sans gérer lui-même la corrélation [S10].

**Limites honnêtes.**
- **MCP comme type d'étape n'est pas dans la 1.1**. Il figure sur la roadmap, avec A2A, gRPC, GraphQL et SOAP [S3][S5]. L'exposition MCP passe par un serveur qui lit l'Arazzo : c'est un pattern, pas une fonctionnalité de la spec.
- Arazzo n'a pas été conçu pour les agents : « Arazzo was not designed specifically for API consumption by AI agents or LLMs » [S8].
- Critiques de complexité :
  - Speakeasy juge ses constructions « overkill for the straightforward tool definitions that MCP requires » [S8] ;
  - Bump.sh a trouvé la spec « overkill » pendant la construction de sa plateforme MCP, et propose son format maison Flower, qui gère la transformation de données entre étapes, ce qu'Arazzo ne fait pas [S11].
- Un workflow *subtilement faux* exposé à un agent échoue vite et souvent, avec un coût réel [S15]. Le déterminisme amplifie les erreurs de conception autant qu'il les évite.
- Arazzo ne sait pas encore décrire une pause pour validation humaine (« What it cannot yet describe is the moment when a workflow must stop »). La proposition « Actor-in-the-Loop » (PR #568) est en cours [S10].
- L'agent garde le choix de l'intention : Arazzo réduit l'espace d'erreur, il ne supprime pas le risque de mauvais choix d'outil.

**En une phrase.** *Laissez l'agent choisir l'intention, laissez le workflow garantir la séquence.*

---

### P5. Échecs partiels, retries et compensation

**Description.** Un parcours multi-API échoue rarement en entier : le paiement passe mais la réservation échoue, l'événement de confirmation n'arrive jamais. Sans règle explicite, chaque consommateur réinvente sa stratégie : retry naïf, abandon, ou rien. Les états incohérents s'accumulent.

**Preuves.**
- Microsoft (pattern Saga) :
  - en cas d'échec, une série de « compensating transactions » annule les étapes réalisées ;
  - après la *pivot transaction*, seules des transactions « retryable », donc idempotentes, sont admises ;
  - « Compensating transactions might not always succeed, which can leave the system in an inconsistent state » [S31].
- Nordic APIs : sans cadre, un agent peut réessayer jusqu'au rate limit ou abandonner tout le flux après une première erreur. Les failure actions d'Arazzo sont citées comme réponse [S7].
- Zuplo : en 1.0, les équipes dupliquaient la logique de récupération (réauthentification) dans chaque flux. La 1.1 permet des sous-flux partagés [S5].

**Ce qu'apporte Arazzo 1.1.**
- `onFailure` et `onSuccess` par étape, `failureActions` et `successActions` au niveau du workflow, avec des `criteria` pour choisir l'action :
  - `retry` (`retryAfter`, `retryLimit`) : « If not specified then a single retry SHALL be attempted » ;
  - `goto` vers une étape ou un workflow de compensation ;
  - `end` : « If omitted, the default behavior is to break and return » [S1].
- 1.1 : une action peut appeler un **workflow réutilisable** avec `parameters`, par exemple « renouveler la session puis rejouer », ou « annuler la réservation » comme compensation [S4][S5].
- 1.1 : `timeout` sur les étapes `receive`, qui fait échouer le workflow sauf si des `onFailure` sont définies [S1].
- La compensation devient **lisible dans le graphe et revue en PR**, au lieu d'être enfouie dans le code de chaque client.

**Limites honnêtes.**
- **Pas de sémantique transactionnelle** : Arazzo ne garantit ni atomicité, ni idempotence, ni exactly-once. On peut *décrire* une compensation (un `goto` vers une étape d'annulation) et *transmettre* une clé d'idempotence en paramètre, mais la garantie reste dans les API et dans le runner.
- Pour l'asynchrone, « Arazzo does not model broker acknowledgment or delivery confirmation » [S1].
- Pas de boucles, donc pas d'itération sur une liste de lignes de commande, et pas de backoff exponentiel natif (`retryAfter` est une durée) [S3][S5].
- Pas d'état durable : si le runner tombe au milieu d'un workflow, la reprise dépend de l'outil. Ce n'est pas Temporal.

**En une phrase.** *Arazzo ne rend pas vos transactions atomiques, mais il rend votre stratégie d'échec explicite, partagée et testable.*

---

### P6. L'onboarding des partenaires et des développeurs (time to first call)

**Description.** Le *time to first call* (TTFC), soit le délai entre la découverte d'une API et le premier appel réussi, est l'indicateur DX de référence. Mais un partenaire ne veut pas *un* appel réussi : il veut un **parcours** réussi (créer un compte, KYC, premier paiement). Le TTFC mesure la première marche, pas l'escalier.

**Preuves.**
- Joyce Lin (Postman, TechCrunch) : le TTFC « can be the most important API metric, but it's not the only one » [S22].
- Postman : les développeurs font un premier appel réussi **1,7 à 56 fois plus vite** avec une collection fournie et forkée, sur un petit échantillon d'API mesuré par les éditeurs eux-mêmes. Toutes ces API avaient une documentation : la doc seule n'explique pas l'écart, ce sont les requêtes prêtes à exécuter qui le font [S21] *(éditeur, échantillon limité)*.
- Étude de cas Autodesk (Postman Partner Workspaces) : TTFC 80 % plus rapide [S23] *(étude de cas éditeur)*.
- Pour les partenaires entreprise, le délai inclut le provisioning des credentials, les accès scopés, la sandbox et la procurement : réécrire la doc ne suffit pas [S39] *(éditeur, consulté via résumé de recherche)*.
- OAI : l'onboarding guidé par des chemins d'intégration structurés raccourcit le temps jusqu'au premier appel réussi [S2]. Bump.sh : « onboarding is faster when people can run the workflow and watch it work » [S12].

**Ce qu'apporte Arazzo 1.1.**
- Le **parcours** devient l'unité d'onboarding : un workflow `onboardPartner` exécutable sur sandbox, avec des inputs documentés en JSON Schema et des outputs attendus.
- Un format neutre que le partenaire peut exécuter avec *son* outil : Respect, Bruno, Apidog, un SDK généré (Kiota travaille sur la génération de SDK de workflows à partir d'Arazzo) [S3][S15], là où la collection impose Postman.
- Le graphe (extension VS Code, Studio) donne une vue d'ensemble avant la première ligne de code. Redocly : « New devs see the big picture, not just isolated endpoints » [S13].

**Limites honnêtes.**
- Les collections Postman ont un **avantage mesuré** sur le TTFC [S21]. Arazzo n'a pas encore d'étude équivalente : on ne peut pas affirmer qu'il fait mieux.
- Les frictions non techniques (contrat, credentials, sandbox) restent entières.
- Peu de portails développeurs rendent nativement Arazzo aujourd'hui, et Postman n'a pas de support natif [S15].

**En une phrase.** *Le TTFC mesure le premier appel ; vos partenaires vous jugent sur le premier parcours réussi.*

---

### P7. La dérive entre la doc et le comportement réel

**Description.** La doc dit une chose, la production en fait une autre : champ disparu, type changé, pagination modifiée, ordre d'appel devenu obligatoire. Sur les enchaînements, la dérive est encore plus invisible, car aucun contrat ne les décrit.

**Preuves.**
- APIContext, *OpenAPI Specifications in the Real World* (650 millions d'appels, plus de 10 000 endpoints) [S24] :
  - « 75% of production APIs tested had variances to their published OpenAPI Specifications » ;
  - 43 % des API n'ont pas de spécification publique ;
  - plus de la moitié des spécifications n'ont pas été mises à jour depuis plus de six mois.
- *Point de vigilance* : un communiqué APIContext d'août 2024 titrait « A Quarter of APIs Do Not Conform », ce qui est incohérent avec 75 %. **À vérifier dans le livre blanc avant publication.**
- Tyk : « the Arazzo spec is perfect for ensuring contract adherence », mais aussi « Every time the workflow changes, the Arazzo spec should also be updated » [S9] *(éditeur)*.
- Respect se présente d'abord comme l'outil qui vérifie qu'une API répond conformément à son OpenAPI, en envoyant de vraies requêtes [S14].

**Ce qu'apporte Arazzo 1.1.**
- **La doc qui s'exécute ne peut pas mentir longtemps.** Un workflow joué en CI contre un environnement (ou un mock dérivé de l'OpenAPI) échoue dès que le comportement s'écarte de la description. La dérive devient un signal rouge, plus une découverte en production.
- Chaque étape est liée à une opération OpenAPI ou AsyncAPI précise : un changement d'API qui casse un parcours est détectable par analyse statique (référence disparue) ou par exécution.
- `$self` et l'ordre de résolution des sources (1.1) fiabilisent les références inter-documents [S4].

**Limites honnêtes.**
- Un fichier Arazzo **non exécuté dérive comme n'importe quelle doc**. API Evangelist, sur ses 5 000 workflows : « accurate descriptions. They are not yet executable artifacts » (chemins relatifs, credentials manquants) [S15].
- Le bénéfice n'existe que si l'exécution en CI est mise en place, avec les runners, mocks et secrets que cela suppose.
- Arazzo ne détecte pas seul la dérive d'un schéma OpenAPI : c'est le rôle des outils de contract testing et de diff OpenAPI, avec lesquels il se combine.

**En une phrase.** *Une documentation qui s'exécute en CI cesse d'être une promesse : elle devient un contrat vérifié.*

---

### P8. La gouvernance et l'auditabilité des enchaînements

**Description.** Qui a décidé que l'agent support peut enchaîner « consulter la commande → vérifier l'éligibilité → rembourser » ? Où est-ce écrit, qui l'a validé, et comment prouver après coup que la séquence exécutée était bien celle autorisée ? Sans artefact, la gouvernance des enchaînements repose sur la revue de code et sur la confiance.

**Preuves.**
- Postman 2025 : la première préoccupation de sécurité face aux agents est le risque d'appels non autorisés ou excessifs (**51 %**). Viennent ensuite l'accès à des données sensibles (49 %) et la fuite de credentials (46 %) [S20].
- OWASP LLM06:2025 *Excessive Agency* : les causes sont une fonctionnalité, des permissions ou une autonomie excessives. Les mitigations : limiter les outils et leurs fonctions, préférer des outils étroits, exiger une validation humaine pour les actions à fort impact, appliquer l'autorisation hors du LLM, journaliser [S28].
- Règlement européen sur l'IA, art. 12 : les systèmes à haut risque doivent « technically allow for the automatic recording of events (logs) over the lifetime of the system », à des fins de traçabilité [S30]. Le calendrier d'application est en discussion (Digital Omnibus) : *à vérifier*.
- Jentic/Platformable : 67 % des répondants ont des API utilisées par des agents métier, mais seuls 30 % ont vérifié qu'elles étaient prêtes pour les agents [S10] *(éditeur, n = 114)*.
- Bump.sh : les workflows deviennent « a contract for how the API should be used » [S12].

**Ce qu'apporte Arazzo 1.1.**
- **Une liste blanche d'enchaînements** : exposer 5 workflows revus plutôt que 120 endpoints, c'est appliquer directement la mitigation OWASP « limiter les fonctionnalités » [S28]. Le périmètre d'action de l'agent devient un artefact lisible, versionné et approuvé en PR.
- Des garde-fous déclaratifs : `successCriteria` (par exemple montant ≤ plafond, statut = éligible) et `onFailure: end` avant les étapes irréversibles.
- Une **référence d'audit** : les journaux d'exécution (`workflowId`, `stepId`, version du document via `$self`) peuvent être rapprochés de la séquence déclarée.
- Des règles de lint (Spectral, Redocly, règles sémantiques C1) pour imposer des conventions : pas de workflow d'écriture sans critère de succès, `timeout` obligatoire sur les `receive`, etc.

**Limites honnêtes.**
- Arazzo **n'est pas un système de journalisation ni de contrôle d'accès**. L'autorisation, les scopes OAuth et les logs restent du ressort de la passerelle, du serveur MCP et du runner. Arazzo ne rend pas conforme au règlement IA : il fournit une pièce du dossier.
- Pas d'étape « validation humaine » normée en 1.1 (proposition en cours) [S10]. On la modélise aujourd'hui par un découpage en deux workflows, ou par une extension `x-`, ce qui n'est pas portable.
- Les préfixes `x-oai-`, `x-oas-` et `x-arazzo` sont réservés en 1.1. Les extensions de gouvernance maison doivent utiliser un autre préfixe, par exemple `x-connethics-`.

**En une phrase.** *Ce que vos agents ont le droit d'enchaîner doit être écrit, revu et versionné, pas déduit d'un prompt.*

---

## 3. Limites transverses d'Arazzo 1.1 (à assumer publiquement)

| Limite | Détail | Statut / source |
|---|---|---|
| **Pas de moteur d'exécution normatif** | La spec fixe des sémantiques (`dependsOn`, critères, retry) mais n'a pas d'implémentation de référence. Chaque runner couvre un sous-ensemble. | [S1][S15][S17] |
| **Pas de boucles ni de fonctions ni de transformations** | Pas d'itération sur une collection ni de mapping de données entre étapes, au-delà des expressions et Selectors. | Roadmap [S3][S5] ; Bump.sh [S11] |
| **Pas d'étape humaine** | Pas de pause pour validation humaine. | Proposition Actor-in-the-Loop, PR #568 [S10] |
| **Protocoles** | HTTP (OpenAPI) et événements (AsyncAPI) seulement. MCP, A2A, gRPC, GraphQL et SOAP en tant que *types d'étape* sont sur la roadmap. | [S3][S5] |
| **Pas de transactions ni d'état durable** | Pas d'atomicité, de reprise sur crash ni de garantie de livraison asynchrone. | [S1] |
| **Maturité des outils** | 4 à 6 runners, souvent en bêta ou pré-1.0. Le support 1.1 et AsyncAPI n'est pas confirmé. Respect ne gère pas XPath. | [S14][S15][S16] ; à vérifier en R4 |
| **Adoption encore faible** | 3 % des praticiens interrogés donnent Arazzo à leurs agents, contre 79 % pour MCP (n = 114, source éditeur). | [S10] |
| **Perception de complexité** | « overkill » pour des outils MCP simples, et courbe d'apprentissage. | [S8][S11] |
| **Écosystème concentré** | Une perception d'association à un seul éditeur (SmartBear) a été relevée en 2025. Elle s'atténue (Jentic, Redocly, Bump.sh, Speakeasy, Specmatic, Kiota). | [S8][S3] |

**Posture recommandée** (Radical Candor) : afficher ces limites sur la landing (FAQ) et dans l'article. C'est un marqueur de crédibilité pour un public d'architectes, et cela distingue ConnEthics des contenus éditeurs.

---

## 4. Personas cibles

| Persona | Ce qu'il vit aujourd'hui | Pains prioritaires | Ce qu'il attend d'Arazzo | Objection probable |
|---|---|---|---|---|
| **Architecte API / Enterprise Architect** | Un catalogue OpenAPI riche, mais les parcours transverses ne sont décrits nulle part. Il arbitre entre REST et événementiel. | P1, P2, P7, P8 | Un standard neutre (OAI / Linux Foundation) pour formaliser les intentions et les dépendances inter-API, dont le cross-protocol en 1.1. | « Encore un format à maintenir ? Qui l'exécute ? » |
| **QA / SDET** | Des tests E2E codés ou des collections Postman, flaky, couplés à l'outil et illisibles pour le métier. | P3, P5, P7 | Des scénarios déclaratifs, exécutables en CI, portables entre runners, avec critères de succès explicites. | « Le runner gère-t-il AsyncAPI, XPath, mon auth OAuth ? » |
| **Équipe plateforme IA / agents** | Des outils MCP générés endpoint par endpoint. Agents coûteux et instables, peu de garde-fous. | P4, P5, P8 | 1 workflow = 1 outil MCP, exécution déterministe côté serveur, retries maîtrisés, périmètre d'action revu. | « MCP suffit, Arazzo est overkill » [S8][S11] |
| **Product Owner / Product Manager API** | Il pense en cas d'usage et en adoption, mais le produit est livré comme une liste d'endpoints. | P1, P6 | Des parcours nommés qui *sont* le produit, mesurables (adoption par workflow) et présentables dans un portail. | « Combien de temps pour écrire nos 10 parcours clés ? » |
| **Partenaire intégrateur** (externe) | Il reconstitue l'enchaînement à partir de la doc, de tickets et d'appels. Son TTFC est long. | P2, P6, P7 | Un parcours exécutable sur sandbox avec son propre outil, et une vue graphe d'ensemble. | « Mon outil ne lit pas Arazzo » (Postman sans support natif [S15]) |

**Persona transverse** : le **RSSI ou responsable conformité IA**. Il ne lira pas le YAML, mais il veut la liste de ce que les agents peuvent enchaîner et la preuve de revue (P8). C'est le pont vers l'offre AI Governance de ConnEthics.

---

## 5. Positionnement face aux alternatives

### 5.1 Principe

Arazzo est une **couche de description et de contrat** des enchaînements d'API. Elle est neutre vis-à-vis des outils et adossée à OpenAPI et AsyncAPI. Ce n'est ni un moteur d'orchestration durable, ni un modeleur de processus métier, ni un framework d'agents. La plupart des alternatives sont donc **complémentaires**. La question utile n'est pas « Arazzo *ou* X ? » mais « *où vit le contrat* de l'enchaînement ? ».

### 5.2 Tableau comparatif

| Alternative | Ce que c'est | Force | Faiblesse vis-à-vis du besoin | Relation avec Arazzo |
|---|---|---|---|---|
| **Collections Postman** (+ Flows, Newman) | Format de collection propre à Postman, scripts JS, exécution via Postman ou Newman | TTFC mesuré excellent [S21], adoption massive, outil familier | Couplée à l'écosystème Postman, logique dans des scripts, pas liée normativement à OpenAPI, pas de support natif Arazzo [S15] | Coexistence : la collection pour l'exploration, Arazzo pour le contrat de parcours. Conversion à outiller. |
| **BPMN 2.0** (OMG) | Notation de processus métier, « de-facto standard for business processes diagrams », indépendante de l'implémentation [S37] | Tâches humaines, événements, gouvernance de processus, outillage mûr (Camunda, etc.) | Ne connaît pas OpenAPI, granularité « processus » plutôt que « appel API », lourd pour un parcours d'intégration | Niveaux différents : une tâche de service BPMN peut *référencer* un workflow Arazzo. |
| **AWS Step Functions** (ASL) | Langage JSON de machine à états, exécuté par AWS [S36] | Exécution managée, retry/catch, parallélisme, map (boucles) | Propriétaire AWS, orienté ressources AWS (ARN), non portable, pas une doc de consommation | Arazzo décrit *le contrat* du parcours, Step Functions peut *l'implémenter* côté fournisseur. |
| **Temporal** (et moteurs de durable execution) | « Durable Execution of application code », workflows écrits en code via SDK [S34] | État durable, reprise sur crash, sagas, boucles, longues durées | Le contrat est du code : illisible pour un partenaire ou un agent, non déclaratif | Complémentaire : Temporal comme runtime robuste d'un workflow Arazzo, Arazzo comme interface publique. |
| **Tests codés** (Jest, pytest, Karate, REST Assured) | Scénarios E2E en code | Puissance totale, boucles, fixtures, écosystème | Couplés au langage, lisibles par les développeurs seulement, dupliquent la doc | Arazzo pour les parcours de référence partagés, le code pour les cas limites et la logique complexe. |
| **LangGraph** et frameworks d'agents (CrewAI, AutoGen, etc.) | « low-level orchestration framework and runtime for long-running, stateful agents » [S35] | Raisonnement, état, human-in-the-loop, streaming, mémoire | L'enchaînement d'API est enfoui dans le graphe ou le prompt de l'agent, et propre au framework | Complémentaire : le nœud LangGraph appelle un *outil* MCP adossé à un workflow Arazzo. L'agent décide, Arazzo exécute. |
| **MCP seul** (un outil par endpoint) | Protocole d'exposition d'outils aux agents | Adoption forte (79 % [S10]), simplicité | Ne dit rien de l'ordre des appels : « useful exposure layers » mais insuffisant pour la fiabilité [S7] | Complémentaire : MCP est le *transport* de l'outil, Arazzo sa *recette* [S10]. |
| **Formats maison** (ex. Bump.sh Flower) | Formats légers de workflow | Simplicité, transformation de données entre étapes [S11] | Non standard, verrouillage | Arazzo pour la portabilité et la gouvernance, le format maison pour les besoins non couverts (transformations). |

### 5.3 Quand choisir Arazzo

- Le parcours **traverse plusieurs API ou équipes**, voire des partenaires, et doit être compris par des humains comme par des machines.
- Vous avez **déjà des OpenAPI ou AsyncAPI** à jour, ou vous voulez une raison de les fiabiliser.
- Le même parcours doit servir à **documenter, tester et exposer à des agents**. La valeur d'Arazzo croît avec le nombre d'usages d'un même fichier.
- Vous avez besoin d'une **liste blanche gouvernée** des enchaînements accessibles aux agents (P8).
- Le parcours est **borné** : quelques à quelques dizaines d'étapes, sans boucle sur des collections ni pause humaine.
- Vous voulez éviter le **verrouillage** dans un outil (Postman, AWS, un framework d'agents).

### 5.4 Quand ne pas choisir Arazzo (ou pas seul)

- **Processus métier long avec tâches humaines**, délais de plusieurs jours, escalades : BPMN ou un moteur de workflow.
- **Exécution critique** avec reprise sur crash, exactly-once, sagas complexes : Temporal ou Step Functions, éventuellement *décrits* en Arazzo pour les consommateurs.
- **Itération sur des données** (traiter N lignes) ou **transformations lourdes** entre étapes : la 1.1 n'a ni boucles ni fonctions.
- **Un appel unique** ou un outil MCP trivial : un outil MCP simple suffit, et Arazzo serait « overkill » [S8].
- **Raisonnement ouvert** où l'enchaînement ne peut pas être connu à l'avance : c'est le rôle de l'agent. Arazzo encadre seulement les sous-parcours déterministes.
- **Protocoles hors HTTP ou événements** (gRPC, GraphQL, SOAP) : pas encore en 1.1.
- **Pas d'OpenAPI fiable** : commencer par là. Arazzo sur des descriptions fausses propage l'erreur.

---

## 6. Trois messages clés (FR / EN)

> Usage : titre H2 ou H3 pour la landing W2 (section Pains / Proposition de valeur) et fil rouge de l'article W1. Chaque message est sourçable par les sections 2 et 5, et aucun ne promet ce qu'Arazzo ne fait pas.

### Message 1 — Intention

**FR — Des intentions, pas des endpoints.**
Vos API exposent des verbes, vos clients et vos agents cherchent des résultats. Arazzo décrit, dans un standard ouvert de l'OpenAPI Initiative, le chemin qui mène de l'un à l'autre : les étapes, les dépendances, les critères de succès.

**EN — Intent, not endpoints.**
Your APIs expose verbs; your customers and agents are after outcomes. Arazzo, an open OpenAPI Initiative standard, describes the path between the two: the steps, the dependencies, the success criteria.

### Message 2 — Un artefact, trois usages

**FR — Écrit une fois, utile trois fois.**
Le même workflow Arazzo documente le parcours pour vos partenaires, s'exécute comme test E2E dans votre CI et devient un outil fiable pour vos agents IA. La connaissance d'intégration quitte les wikis et les têtes pour devenir un actif versionné et vérifié.

**EN — Write it once, use it three times.**
The same Arazzo workflow documents the journey for your partners, runs as an end-to-end test in your CI, and becomes a dependable tool for your AI agents. Integration knowledge moves out of wikis and people's heads into a versioned, verified asset.

### Message 3 — Déterminisme gouverné

**FR — L'agent choisit l'intention, le workflow garantit la séquence.**
Au lieu de laisser un modèle deviner l'ordre des appels, vous exposez quelques parcours revus, avec retries et branches d'échec explicites. Vos agents gagnent en fiabilité, et vous gagnez ce que la gouvernance exige : savoir ce qu'ils ont le droit d'enchaîner.

**EN — Agents choose the intent; workflows guarantee the sequence.**
Instead of letting a model guess the order of calls, you expose a few reviewed journeys with explicit retries and failure paths. Your agents become more dependable, and you gain what governance demands: knowing exactly what they are allowed to chain.

**Variante de hero** (W2, alignée sur le plan) : FR « Des workflows API lisibles par les humains, exécutables par les machines ». EN « API workflows humans can read and machines can run ». *Recommandation* : préférer « machines » ou « runners et agents » à « agents » seuls. L'exécution passe par un runner ou un serveur MCP, pas par la spec.

---

## 7. Angles pour l'offre ConnEthics (accompagnement)

> Aucun chiffre client n'est avancé. Les indicateurs ci-dessous sont des **indicateurs proposés à mesurer avec le client**, pas des résultats promis.

L'offre Arazzo s'emboîte dans les services et modèles d'engagement existants du site (`website/src/app/services/page.tsx`) :
- services : *Knowledge Engineering* (« Transform your tacit knowledge into a strategic asset »), *Ecosystem Identity* (« Partner-Ready Architecture ») et *Debt Alignment* (« Friction Audit ») ;
- modèles d'engagement : *Strategic Radar* (2 à 4 semaines), *Tactical Strike Team* et *Ecosystem Governance* ;
- offre AI Governance.

| Angle | Modèle d'engagement | Contenu | Pains | Livrables | Indicateurs à mesurer (proposés) |
|---|---|---|---|---|---|
| **Audit « API readiness agentique »** | Strategic Radar | Cartographie des 10 à 20 intentions métier clés et de l'endroit où vit aujourd'hui leur séquence (wiki, collection, code, personne). Qualité des OpenAPI et AsyncAPI, risque d'exposition directe des endpoints aux agents. | P1, P2, P4, P7 | Rapport « State of the Union » et feuille de route priorisée par valeur métier [S8] | % d'intentions clés formalisées, nb d'outils exposés aux agents vs nb d'endpoints |
| **De la connaissance tribale au contrat** | Knowledge Engineering | Ateliers avec les détenteurs de la connaissance, écriture des workflows Arazzo 1.1, validation sémantique (extension VS Code, `arazzo-core`). | P2, P6 | Bibliothèque de workflows versionnée et rendu graphe et doc | Délai de prise en main d'un parcours par un nouvel arrivant ou un partenaire |
| **Parcours E2E exécutables en CI** | Tactical Strike Team | Choix du runner (lot R4), mocks Prism ou Specmatic, gestion des secrets, pipeline GitHub Actions. Transfert aux équipes QA. | P3, P5, P7 | Pipeline opérationnel sur les parcours critiques et runbook | Taux de parcours critiques couverts en CI, dérives détectées avant production |
| **Outils d'agents déterministes** | Tactical Strike Team | Pattern « 1 workflow = 1 outil MCP » (lot R3), garde-fous `successCriteria` et `onFailure`, tests de non-régression des outils. | P4, P5 | Serveur MCP adossé à Arazzo, catalogue d'outils revu | Taux de succès des tâches agent répétées (pass^k [S26]), tokens par tâche |
| **Gouvernance des enchaînements IA** | Ecosystem Governance + AI Governance | Règles de lint, processus de revue des workflows exposés aux agents, alignement OWASP LLM06 [S28], traçabilité vers les exigences de journalisation (règlement IA, art. 12 [S30]). | P8 | Politique « liste blanche » d'enchaînements, règles CI, dossier de traçabilité | % d'outils agents adossés à un workflow revu, délai de revue |
| **Partner-Ready Architecture** | Ecosystem Identity | Parcours d'onboarding partenaire exécutables sur sandbox, avec un exemple B2B français (SIRENE/INPI → KYC → compte, exemple E1 n° 5). | P6 | Kit d'onboarding partenaire (Arazzo, sandbox, graphe) | Délai jusqu'au premier parcours réussi (et pas seulement TTFC) |

**Différenciateurs ConnEthics à mettre en avant** :
1. **Outillage propre et ouvert** : extension VS Code, Studio, Skill file IA. Nous utilisons ce que nous recommandons. *La licence d'arazzo-demo est à clarifier avant d'écrire « open source » (cf. plan, B1).*
2. **Validation sémantique** au-delà du schéma : API Evangelist note que « well-formed » ne garantit rien [S15], et le lot C1 y répond directement.
3. **Lecture gouvernance IA** native : peu d'acteurs Arazzo relient workflows et conformité IA.
4. **Ancrage français et européen** : contexte réglementaire européen (règlement IA, eIDAS 2.0 déjà présent dans l'offre) et exemples SIRENE/INPI.
5. **Candeur** : nous disons quand *ne pas* utiliser Arazzo (section 5.4).

**Ce que nous ne promettons pas** (à reprendre en FAQ) : une exécution garantie par la spec seule, la suppression des hallucinations, le support de protocoles hors HTTP et AsyncAPI, ou des gains chiffrés avant mesure chez le client.

---

## 8. Recommandations éditoriales pour W1, W2 et W3

- **Chiffres publiables tels quels** (source primaire lue) :
  - Postman 2025 : 93 %, 55 %, 34 %, 24 %, 51 % [S20] ;
  - APIContext 75 % via Nordic APIs, *en signalant le communiqué contradictoire*, ou en préférant « plus de la moitié des spécifications non mises à jour depuis six mois » [S24] ;
  - RAG-MCP 13,62 % → 43,13 % [S25] ;
  - τ-bench pass^8 < 25 % [S26] ;
  - Gartner > 40 % [S29] ;
  - Postman TTFC 1,7× à 56× [S21], en précisant qu'il s'agit d'un argument *pour les collections* ;
  - Jentic 79 % / 3 % [S10], avec mention de l'échantillon et de la source éditeur.
- **À ne pas publier sans vérification** : les chiffres Google sur la flakiness [S32][S33], le seuil de 30 outils et la quasi-certitude d'échec au-delà de 100 [S19], l'Orbital 30 % [S7], le Postman 2020 54,3 %, le nombre de documents Arazzo sur GitHub (rapport API Evangelist retiré, HTTP 410), le calendrier du règlement IA.
- **Post LinkedIn existant** (`website/marketing/linkedin-post-arazzo.md`) pour W3 :
  - adoucir « This ends with Arazzo », qui est une surpromesse contraire au pilier « Pragmatisme radical » ;
  - vérifier l'expression « two open-source tools » au regard de la licence d'arazzo-demo ;
  - passer de « Visualizer » au nom produit décidé en B1 ;
  - ajouter l'angle agents et la 1.1 (AsyncAPI, workflows réutilisables).
- **Structure d'article** suggérée (cohérente avec le plan W1) : partir du pain P1 (le « pourquoi »), illustrer P4 avec l'exemple MCP et P3 avec l'exemple order-to-cash, puis finir par les limites (section 3) *avant* l'offre. La candeur précède l'appel à l'action.
- **Ton** : « nous » et « vous », autorité bienveillante, pas de jargon non expliqué. Définir *workflow*, *runner*, *outil MCP* et *TTFC* à leur première occurrence.

---

## 9. Sources

Consultées le 16/11/2026. *Éd.* signale une source d'éditeur ou d'acteur intéressé, *Sec.* un chiffre lu via un relais secondaire.

**Spécification et OpenAPI Initiative**
- [S1] OpenAPI Initiative, *Arazzo Specification v1.1.0*, 17/05/2026. https://spec.openapis.org/arazzo/latest.html
- [S2] OpenAPI Initiative, *Arazzo Specification* (page de présentation, cas d'usage). https://www.openapis.org/arazzo-specification
- [S3] OpenAPI Initiative, *Newsletter June 2026* (1.1, roadmap, Kiota). https://www.openapis.org/blog/2026/06/09/openapi-initiative-newsletter-june-2026

**Arazzo, agents et MCP**
- [S4] Redocly, *Arazzo Specification 1.1 release* (non daté sur la page). https://redocly.com/blog/arazzo-specification-1-1-release *(Éd.)*
- [S5] Zuplo (martyn), *Arazzo goes cross protocol*, 21/05/2026. https://zuplo.com/blog/arazzo-goes-cross-protocol *(Éd.)*
- [S6] F. Kilcommins, SmartBear, *From Endpoints to Intent: Rethinking Agent API Workflows with Arazzo*, 14/08/2025. https://smartbear.com/blog/from-endpoints-to-intent-rethinking-agent-api-workflows-with-arazzo *(Éd.)*
- [S7] A. Anthony, Nordic APIs, *Why AI Agents Need Deterministic API Workflows*, 09/04/2026. https://nordicapis.com/why-ai-agents-need-deterministic-api-workflows/ (relaie Kong, Orbital et Air Canada : *Sec.*)
- [S8] J. Wagner, Nordic APIs, *How Arazzo Could Help MCP Servers Orchestrate APIs for AI Consumers*, 04/11/2025. https://nordicapis.com/how-arazzo-could-help-mcp-servers-orchestrate-apis-for-ai-consumers/
- [S9] M. Buhr, Tyk, *Arazzo and AI agents – your essential starter guide*, 30/05/2025. https://tyk.io/blog/arazzo-and-ai-agents-your-essential-starter-guide/ *(Éd.)*
- [S10] Jentic, *TechTalk #09*, octobre 2026 (enquête Jentic/Platformable, n = 114). https://jentic.com/newsletter/techtalks/techtalk-09 *(Éd.)*
- [S11] Bump.sh, *MCP server: Arazzo support*, 17/04/2026. https://docs.bump.sh/product-updates/2026/04/17/mcp-server-arazzo-support/ *(Éd.)*
- [S12] Bump.sh, *Benefits of using Arazzo*. https://docs.bump.sh/arazzo/v1.0/introduction/benefits/ *(Éd.)*
- [S13] Redocly, *Why Arazzo matters*. https://redocly.com/learn/arazzo/why-arazzo-matters *(Éd.)*

**Tests et runners**
- [S14] Redocly, *Respect* (documentation). https://redocly.com/docs/respect *(Éd.)*
- [S15] API Evangelist, *The tools that actually execute your Arazzo workflows*, 14/08/2026. https://apievangelist.com/2026/08/14/the-tools-that-actually-execute-your-arazzo-workflows/
- [S16] API Evangelist, *I Counted the Arazzo Runners by Reading READMEs*, 21/08/2026. https://apievangelist.com/2026/08/21/i-counted-the-arazzo-runners-by-reading-readmes/
- [S17] B. Flad, Speakeasy, *End-to-end API testing with Arazzo, TypeScript, and Deno*, 30/10/2024. https://www.speakeasy.com/blog/e2e-testing-arazzo *(Éd.)*
- [S18] B. Doerrfeld, Speakeasy, *5 potential use cases for Arazzo*, 22/01/2025. https://www.speakeasy.com/blog/5-potential-use-cases-for-arazzo *(Éd.)*
- [S19] Speakeasy, *Why less is more for MCP*. https://www.speakeasy.com/mcp/tool-design/less-is-more *(Éd., relaie D. Breunig : Sec.)*
- [S32] J. Micco, Google Testing Blog, *Flaky Tests at Google and How We Mitigate Them*, 27/05/2016. https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html (chiffres non extraits : *à vérifier*)
- [S33] J. Listfield, Google Testing Blog, *Where do our flaky tests come from?*, 17/04/2017. https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html (chiffres en graphiques : *à vérifier*)

**Documentation, onboarding, dérive**
- [S20] Postman, *2025 State of the API Report*. https://www.postman.com/state-of-api/2025/ *(Éd., n > 5 700)*
- [S21] J. Lin, Postman Blog, *Improve your time to first API call by 20x*, 04/04/2023. https://blog.postman.com/improve-your-time-to-first-api-call-by-20x/ *(Éd.)*
- [S22] J. Lin, TechCrunch, *The most important API metric is time to first call*, 12/07/2021. https://techcrunch.com/2021/07/12/the-most-important-api-metric-is-time-to-first-call/
- [S23] Postman, étude de cas Autodesk (Partner Workspaces). https://www.casestudies.com/company/postman/case-study/autodesk-optimizes-partner-onboarding-achieving-an-80-faster-time-to-first-call-with-partner-workspaces *(Éd.)*
- [S24] J. Simpson, Nordic APIs, *Most APIs Suffer From Specification Drift*, 16/09/2024 (rapport APIContext *OpenAPI Specifications in the Real World*). https://nordicapis.com/most-apis-suffer-from-specification-drift/
- [S39] Fern, *Reducing time-to-hello-world for enterprise partners*, juillet 2026. https://buildwithfern.com/post/reduce-time-to-hello-world-enterprise-partners *(Éd., consulté via résumé de recherche)*

**Agents IA : fiabilité, sécurité, marché**
- [S25] T. Gan, Q. Sun, *RAG-MCP: Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation*, arXiv:2505.03275, 06/05/2025. https://arxiv.org/abs/2505.03275
- [S26] S. Yao et al., *τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains*, arXiv:2406.12045, 17/06/2024. https://arxiv.org/abs/2406.12045
- [S27] Anthropic, *Writing effective tools for agents — with agents*, 11/09/2025. https://www.anthropic.com/engineering/writing-tools-for-agents
- [S28] OWASP GenAI, *LLM06:2025 Excessive Agency*. https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- [S29] Gartner, communiqué du 25/06/2025, *Gartner Predicts Over 40% of Agentic AI Projects Will Be Canceled by End of 2027*. https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027 (page non accessible au robot, lue via le relais Reuters/The Star : https://www.thestar.com.my/tech/tech-news/2025/06/25/over-40-of-agentic-ai-projects-will-be-scrapped-by-2027-gartner-says)

**Gouvernance, réglementation, patterns**
- [S30] Commission européenne, AI Act Service Desk, *Article 12 — Record-keeping* (règlement (UE) 2024/1689). https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-12
- [S31] Microsoft Learn, *Saga design pattern*, mis à jour en 2025. https://learn.microsoft.com/en-us/azure/architecture/patterns/saga

**Alternatives**
- [S34] Temporal, *What is Temporal?* https://docs.temporal.io/temporal
- [S35] LangChain, *LangGraph overview*. https://docs.langchain.com/oss/python/langgraph/overview
- [S36] AWS, *Using Amazon States Language to define Step Functions workflows*. https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html
- [S37] OMG, *About the Business Process Model and Notation Specification Version 2.0.2*. https://www.omg.org/spec/BPMN/2.0.2/About-BPMN

**Sources non exploitables au 16/11/2026** (à revoir) : API Evangelist, *The Arazzo Standard* (rapport, HTTP 410) ; documentation Specmatic Arazzo (https://docs.specmatic.io/documentation/arazzo.html, contenu non extrait, à couvrir en R4) ; Postman *2026 State of the API* (enquête en cours, pas de résultats publiés trouvés).
