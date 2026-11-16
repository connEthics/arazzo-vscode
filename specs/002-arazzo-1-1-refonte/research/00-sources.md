# Sources initiales (cadrage du 16/11/2026)

Ce fichier sert de point de départ aux lots R1 à R5. Chaque lot doit revérifier les sources qu'il utilise.

## Spécification
- Spec Arazzo 1.1.0 (17/05/2026) : https://spec.openapis.org/arazzo/latest.html
- Index des versions et des schémas : https://spec.openapis.org/arazzo/
  - Schéma 1.1 : `/arazzo/1.1/schema/2026-04-15`
  - Schéma 1.0 : `/arazzo/1.0/schema/2025-10-15`
- Annonce Redocly de la 1.1 : https://redocly.com/blog/arazzo-specification-1-1-release
- Page OAI : https://www.openapis.org/arazzo-specification
- Zuplo, « Arazzo goes cross protocol » : https://zuplo.com/blog/arazzo-goes-cross-protocol

## Arazzo et agents / MCP
- Nordic APIs, « How Arazzo Could Help MCP Servers Orchestrate APIs for AI Consumers » : https://nordicapis.com/how-arazzo-could-help-mcp-servers-orchestrate-apis-for-ai-consumers/
- Nordic APIs, « Why AI agents need deterministic API workflows » : https://nordicapis.com/why-ai-agents-need-deterministic-api-workflows/
- SmartBear, « From Endpoints to Intent » : https://smartbear.com/blog/from-endpoints-to-intent-rethinking-agent-api-workflows-with-arazzo
- Tyk, « Arazzo and AI agents » : https://tyk.io/blog/arazzo-and-ai-agents-your-essential-starter-guide/
- Bump.sh, support d'Arazzo dans son serveur MCP (17/04/2026) : https://docs.bump.sh/product-updates/2026/04/17/mcp-server-arazzo-support/
- Jentic TechTalk 09 (oct. 2026), avec des chiffres d'adoption MCP vs Arazzo à prendre avec prudence : https://jentic.com/newsletter/techtalks/techtalk-09

## Tests E2E et runners
- API Evangelist, « The tools that actually execute your Arazzo workflows » : https://apievangelist.com/2026/08/14/the-tools-that-actually-execute-your-arazzo-workflows/
- Documentation Specmatic Arazzo : https://docs.specmatic.io/documentation/arazzo.html
- Speakeasy, tests E2E avec Arazzo : https://www.speakeasy.com/blog/e2e-testing-arazzo

## Points d'attention
- MCP, A2A, gRPC, GraphQL, boucles et fonctions figurent sur la roadmap de la spec. Ils ne font pas partie de la 1.1.
- Le support AsyncAPI par les runners, Redocly Respect compris, reste à vérifier (lot R4).
