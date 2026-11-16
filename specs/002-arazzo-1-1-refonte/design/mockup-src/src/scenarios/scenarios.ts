/**
 * Scénarios des maquettes : modèles de graphe déjà calculés, au format `{ nodes, edges, groups }`.
 * (a) pet-adoption : copie figée de arazzo-demo/app/public/workflows/pet-adoption.arazzo.yaml (16/11/2026, 1.0.1)
 * (b) order-to-cash async (E1 n°3) — (c) session-renewal (E1 n°4) — (d) 60 étapes générées — (e) catalogue.
 */
import type { WorkflowGraph } from '../graph/model';
import { c, GraphBuilder } from './builder';

/* ------------------------------------------------------------------ (a) */
export function petAdoption(): WorkflowGraph {
  const b = new GraphBuilder('adopt-pet-with-error-handling', 'Adoption d’un animal (gestion d’erreurs)', [
    { name: 'petStoreApi', type: 'openapi', url: './openapi/petstore.yaml' },
  ], '1.0.1');
  const src = { source: 'petStoreApi' };
  const unresolved = (op: string) => ({
    methodSource: 'unresolved' as const,
    diagnostics: [{ severity: 'warning' as const, code: 'operation-not-found', message: `operationId ${op} introuvable dans petStoreApi : méthode et chemin inconnus` }],
  });
  const input = b.input([
    { name: 'username', type: 'string', required: true },
    { name: 'password', type: 'string', required: true },
    { name: 'preferredStatus', type: 'string', default: 'available' },
    { name: 'preferredCategory', type: 'string' },
    { name: 'quantity', type: 'integer', default: 1 },
    { name: 'applyCoupon', type: 'boolean', default: true },
  ]);
  const login = b.step('login', { stepKind: 'http', ...src, summary: 'Authentifier l’utilisateur', operationId: 'petStoreApi.loginUser', method: 'GET', methodSource: 'openapi', path: '/user/login', criteria: [c('$statusCode == 200'), c('$response.body.token != null'), c('$.expiresIn > 0', { type: 'jsonpath', context: '$response.body' }), c('^[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*$', { type: 'regex', context: '$response.body.token' }), c('//token[text()]', { type: 'xpath', context: '$response.body' })], stepOutputs: ['authToken', 'userId', 'tokenExpiry'] });
  const find = b.step('findAvailablePets', { stepKind: 'http', ...src, summary: 'Chercher les animaux disponibles', operationId: 'petStoreApi.findPetsByStatus', method: 'GET', methodSource: 'openapi', path: '/pet/findByStatus', criteria: [c('$statusCode == 200')], stepOutputs: ['selectedPetId', 'selectedPetName', 'selectedPetPrice', 'petsFound'] });
  const noPets = b.step('handleNoPets', { stepKind: 'http', ...src, summary: 'Proposer des alternatives', operationId: 'petStoreApi.getRecommendations', ...unresolved('getRecommendations'), criteria: [c('$statusCode == 200')], stepOutputs: ['recommendation', 'alternativeCategories'] });
  const details = b.step('getPetDetails', { stepKind: 'http', ...src, summary: 'Détails de l’animal choisi', operationId: 'petStoreApi.getPetById', method: 'GET', methodSource: 'openapi', path: '/pet/{petId}', criteria: [c('$statusCode == 200')], stepOutputs: ['petPrice', 'petCategory', 'petDescription', 'petPhotos'] });
  const coupon = b.step('checkCouponEligibility', { stepKind: 'http', ...src, summary: 'Coupons applicables', operationId: 'petStoreApi.getPetCoupons', ...unresolved('getPetCoupons'), criteria: [c('$statusCode == 200')], stepOutputs: ['hasCoupons', 'bestCouponCode', 'discountPercent'] });
  const withC = b.step('placeOrderWithCoupon', { stepKind: 'http', ...src, summary: 'Commander avec coupon', operationId: 'petStoreApi.placeOrder', method: 'POST', methodSource: 'openapi', path: '/store/order', hasRequestBody: true, criteria: [c('$statusCode == 200'), c('$response.body.id != null'), c('^(placed|approved)$', { type: 'regex', context: '$response.body.status' }), c('$.totalPrice > 0', { type: 'jsonpath', context: '$response.body' })], stepOutputs: ['orderId', 'finalPrice', 'discountApplied', 'orderStatus', 'estimatedDelivery'] });
  const withoutC = b.step('placeOrderWithoutCoupon', { stepKind: 'http', ...src, summary: 'Commander sans coupon', operationId: 'petStoreApi.placeOrder', method: 'POST', methodSource: 'openapi', path: '/store/order', hasRequestBody: true, criteria: [c('$statusCode == 200')], stepOutputs: ['orderId', 'finalPrice', 'discountApplied', 'orderStatus'] });
  const confirm = b.step('sendConfirmation', {
    stepKind: 'http', ...src, summary: 'Envoyer la confirmation', operationId: 'petStoreApi.sendNotification', methodSource: 'unresolved', hasRequestBody: true, criteria: [c('$statusCode == 200')], stepOutputs: ['notificationSent', 'confirmationId'],
    diagnostics: [
      { severity: 'warning', code: 'operation-not-found', message: 'operationId sendNotification introuvable dans petStoreApi' },
      { severity: 'warning', code: 'implicit-sequence-into-handler', message: 'Sans onSuccess: end, la séquence implicite continue vers endWithError (étape de gestion d’erreur)' },
    ],
  });
  const endErr = b.step('endWithError', { stepKind: 'http', ...src, summary: 'Journaliser l’erreur', operationId: 'petStoreApi.logError', ...unresolved('logError'), hasRequestBody: true, criteria: [c('$statusCode == 200')], stepOutputs: ['logged'] });
  const out = b.output([
    { name: 'orderId', expression: '$steps.placeOrderWithCoupon.outputs.orderId' },
    { name: 'petName', expression: '$steps.findAvailablePets.outputs.selectedPetName' },
    { name: 'originalPrice', expression: '$steps.getPetDetails.outputs.petPrice' },
    { name: 'finalPrice', expression: '$steps.placeOrderWithCoupon.outputs.finalPrice' },
    { name: 'discountApplied', expression: '$steps.placeOrderWithCoupon.outputs.discountApplied' },
    { name: 'orderStatus', expression: '$steps.placeOrderWithCoupon.outputs.orderStatus' },
    { name: 'couponUsed', expression: '$steps.checkCouponEligibility.outputs.bestCouponCode' },
  ]);
  const fail = b.end('failure');

  b.edge('sequence', input, login);
  b.edge('end-failure', login, fail, { name: 'handleAuthError', criteria: [c('$statusCode == 401')] });
  b.edge('failure', login, endErr, { name: 'handleValidationError', criteria: [c('$statusCode == 400')] });
  b.edge('sequence', login, find);
  b.edge('success', find, details, { name: 'petsFound', criteria: [c('$response.body.length > 0')] });
  b.edge('success', find, noPets, { name: 'noPetsFound', criteria: [c('$response.body.length == 0')] });
  b.edge('end-success', noPets, out, { name: 'endNoStock', criteria: [c('$statusCode == 200')] });
  b.edge('sequence', noPets, details);
  b.edge('failure', details, find, { name: 'petNotFound', criteria: [c('$statusCode == 404')], backward: true });
  b.edge('sequence', details, coupon);
  b.edge('success', coupon, withC, { name: 'couponFound', criteria: [c('$response.body.coupons.length > 0')] });
  b.edge('success', coupon, withoutC, { name: 'noCouponAvailable', criteria: [c('$response.body.coupons.length == 0')] });
  b.edge('success', withC, confirm, { name: 'orderComplete', criteria: [c('$statusCode == 200')] });
  b.edge('retry', withC, withC, { name: 'retryOnTimeout', retryLimit: 3, retryAfter: 5, criteria: [c('$statusCode == 408'), c('$statusCode == 504')] });
  b.edge('failure', withC, find, { name: 'handlePetSold', criteria: [c('$statusCode == 409')], backward: true });
  b.edge('failure', withC, endErr, { name: 'handleValidation', criteria: [c('$statusCode == 400')] });
  b.edge('sequence', withC, withoutC);
  b.edge('success', withoutC, confirm, { name: 'orderComplete', criteria: [c('$statusCode == 200')] });
  b.edge('failure', withoutC, find, { name: 'handlePetSold', criteria: [c('$statusCode == 409')], backward: true });
  b.edge('sequence', confirm, endErr);
  b.edge('sequence', endErr, out);
  // Échecs implicites (aucun onFailure) — masqués par défaut
  for (const s of [find, noPets, coupon, confirm, endErr]) b.edge('implicit-failure', s, fail);
  return b.build({ summary: 'Copie figée (arazzo 1.0.1) — méthodes résolues pour les opérations Petstore standard, OP sinon.' });
}

/* ------------------------------------------------------------------ (b) */
export function orderToCash(): WorkflowGraph {
  const b = new GraphBuilder('orderToCash', 'Order-to-cash (HTTP + AsyncAPI)', [
    { name: 'shop', type: 'openapi', url: './openapi/shop.yaml' },
    { name: 'orderEvents', type: 'asyncapi', url: './asyncapi/order-events.yaml' },
    { name: 'payments', type: 'openapi', url: './openapi/payments.yaml' },
    { name: 'billing', type: 'openapi', url: './openapi/billing.yaml' },
    { name: 'logistics', type: 'openapi', url: './openapi/logistics.yaml' },
  ]);
  const input = b.input([
    { name: 'customerId', type: 'string', required: true },
    { name: 'items', type: 'array', required: true },
    { name: 'paymentMethod', type: 'string', default: 'card' },
    { name: 'currency', type: 'string', default: 'EUR' },
  ]);
  const create = b.step('createOrder', { stepKind: 'http', source: 'shop', summary: 'Créer la commande', operationId: 'createOrder', method: 'POST', methodSource: 'operationPath', path: '/orders', hasRequestBody: true, criteria: [c('$statusCode == 201')], stepOutputs: ['orderId', 'total'] });
  const confirm = b.step('awaitConfirmation', { stepKind: 'async-receive', action: 'receive', source: 'orderEvents', summary: 'Attendre la confirmation', channel: 'order.confirmed', timeoutMs: 6000, correlationId: '$steps.createOrder.outputs.orderId', criteria: [c("$[?@.status == 'CONFIRMED']", { type: 'jsonpath', version: 'rfc9535', context: '$message.payload' })], stepOutputs: ['confirmedAt'] });
  const pay = b.step('payOrder', { stepKind: 'http', source: 'payments', summary: 'Encaisser le paiement', operationId: 'capturePayment', method: 'POST', methodSource: 'openapi', path: '/payments', hasRequestBody: true, criteria: [c('$statusCode == 200')], stepOutputs: ['paymentId'] });
  const invoice = b.step('createInvoice', { stepKind: 'http', source: 'billing', summary: 'Émettre la facture', operationId: 'createInvoice', method: 'POST', methodSource: 'openapi', path: '/invoices', dependsOn: ['payOrder'], criteria: [c('$statusCode == 201')], stepOutputs: ['invoice'] });
  const ship = b.step('createShipment', { stepKind: 'http', source: 'logistics', summary: 'Créer l’expédition', operationId: 'createShipment', method: 'POST', methodSource: 'openapi', path: '/shipments', dependsOn: ['payOrder'], criteria: [c('$statusCode == 201')], stepOutputs: ['shipment'] });
  const notify = b.step('notifyCustomer', { stepKind: 'async-send', action: 'send', source: 'orderEvents', summary: 'Notifier le client', channel: 'customer.notifications', hasRequestBody: true, dependsOn: ['createInvoice', 'createShipment'] });
  const cancel = b.step('cancelOrder', { stepKind: 'http', source: 'shop', summary: 'Annuler la commande', operationId: 'cancelOrder', method: 'DELETE', methodSource: 'operationPath', path: '/orders/{orderId}', criteria: [c('$statusCode == 204')] });
  const out = b.output([
    { name: 'orderId', expression: '$steps.createOrder.outputs.orderId' },
    { name: 'paymentId', expression: '$steps.payOrder.outputs.paymentId' },
    { name: 'invoiceUrl', selector: { context: '$steps.createInvoice.outputs.invoice', selector: "$.links[?@.rel == 'pdf'].href", type: 'jsonpath', version: 'rfc9535' } },
    { name: 'trackingNumber', selector: { context: '$steps.createShipment.outputs.shipment', selector: '/tracking/number', type: 'jsonpointer' } },
    { name: 'confirmedAt', expression: '$steps.awaitConfirmation.outputs.confirmedAt' },
  ]);
  const fail = b.end('failure');
  const join = b.junction(notify);

  b.edge('sequence', input, create);
  b.edge('end-failure', create, fail, { name: 'orderRejected', criteria: [c('$statusCode >= 400')] });
  b.edge('sequence', create, confirm);
  b.edge('end-failure', confirm, fail, { name: 'confirmationTimeout' });
  b.edge('sequence', confirm, pay);
  b.edge('retry', pay, pay, { name: 'gatewayBusy', retryLimit: 3, retryAfter: 2, criteria: [c('$statusCode == 503')] });
  b.edge('failure', pay, cancel, { name: 'paymentDeclined', criteria: [c('$statusCode == 402')] });
  b.edge('depends-on', pay, invoice, { targetPort: 'in-deps' });
  b.edge('depends-on', pay, ship, { targetPort: 'in-deps' });
  b.edge('depends-on', invoice, join);
  b.edge('depends-on', ship, join);
  b.edge('depends-on', join, notify, { targetPort: 'in-deps' });
  b.edge('end-success', notify, out, { name: 'done' });
  b.edge('sequence', cancel, out);
  b.edge('implicit-failure', invoice, fail);
  b.edge('implicit-failure', ship, fail);
  b.edge('implicit-failure', notify, fail);
  b.edge('implicit-failure', cancel, fail);
  return b.build({ summary: 'POST commande → receive order.confirmed (corrélation, 6 s) → paiement → facture ∥ expédition → notification (dependsOn).' });
}

/* ------------------------------------------------------------------ (c) */
export function sessionRenewal(): WorkflowGraph {
  const b = new GraphBuilder('getCustomerProfile', 'Session renewal (401 → renewSession)', [
    { name: 'crm', type: 'openapi', url: './openapi/crm.yaml' },
    { name: 'auth', type: 'openapi', url: './openapi/auth.yaml' },
    { name: 'auditFlows', type: 'arazzo', url: 'https://example.com/arazzo/audit.arazzo.yaml' },
  ]);
  const input = b.input([
    { name: 'customerId', type: 'string', required: true },
    { name: 'sessionRenewalToken', type: 'string', required: true },
    { name: 'locale', type: 'string', default: 'fr-FR' },
  ]);
  const defaults = { usesWorkflowDefaults: true };
  const load = b.step('loadProfile', { stepKind: 'http', source: 'crm', summary: 'Lire le profil client', operationId: 'getProfile', method: 'GET', methodSource: 'openapi', path: '/customers/{customerId}/profile', parameters: [{ name: 'customerId', in: 'path', value: '$inputs.customerId' }, { name: 'q', in: 'querystring', value: 'fields=name,email&locale={$inputs.locale}' }], criteria: [c('$statusCode == 200')], stepOutputs: ['profile'], ...defaults });
  const orders = b.step('listOrders', { stepKind: 'http', source: 'crm', summary: 'Lister les commandes', operationId: 'listOrders', method: 'GET', methodSource: 'openapi', path: '/customers/{customerId}/orders', criteria: [c('$statusCode == 200')], stepOutputs: ['orders'], ...defaults });
  const prefs = b.step('updatePreferences', { stepKind: 'http', source: 'crm', summary: 'Mettre à jour les préférences', operationId: 'updatePreferences', method: 'PATCH', methodSource: 'openapi', path: '/customers/{customerId}/preferences', hasRequestBody: true, criteria: [c('$statusCode == 200')], ...defaults });
  const audit = b.step('auditAccess', { stepKind: 'workflow', source: 'auditFlows', summary: 'Tracer l’accès (workflow externe)', targetWorkflowId: '$sourceDescriptions.auditFlows.logAccess', external: true, collapsed: true, innerStepCount: 3, parameters: [{ name: 'actor', value: '$inputs.customerId' }, { name: 'resource', value: 'profile' }], ...defaults });
  b.group({ id: 'wf:renewSession', kind: 'workflow', label: 'renewSession', workflowId: 'renewSession', sourceType: 'arazzo' });
  const refresh = b.step('refreshToken', { stepKind: 'http', source: 'auth', summary: 'Rafraîchir le jeton', operationId: 'refreshToken', method: 'POST', methodSource: 'openapi', path: '/oauth/token', hasRequestBody: true, criteria: [c('$statusCode == 200')], stepOutputs: ['accessToken'] }, { groupId: 'wf:renewSession', workflowId: 'renewSession' });
  const store = b.step('storeSession', { stepKind: 'http', source: 'auth', summary: 'Enregistrer la session', operationId: 'putSession', method: 'PUT', methodSource: 'openapi', path: '/sessions/{sessionId}', criteria: [c('$statusCode == 204')] }, { groupId: 'wf:renewSession', workflowId: 'renewSession' });
  const out = b.output([
    { name: 'profile', expression: '$steps.loadProfile.outputs.profile' },
    { name: 'orders', selector: { context: '$steps.listOrders.outputs.orders', selector: '$[?@.status != "cancelled"]', type: 'jsonpath', version: 'rfc9535' } },
  ]);
  const fail = b.end('failure');
  const escal = b.ref('supportEscalation', { source: undefined });
  const auditRef = b.ref('$sourceDescriptions.auditFlows.logAccess', { source: 'auditFlows', external: true });

  b.edge('sequence', input, load);
  b.edge('retry', load, load, { name: 'renewSessionAfterUnauthorized', retryLimit: 1, retryAfter: 0, criteria: [c('$statusCode == 401')] });
  b.edge('retry', load, refresh, { name: 'renewSessionAfterUnauthorized', via: 'renewSession', criteria: [c('$statusCode == 401')] });
  b.edge('end-failure', load, fail, { name: 'forbidden', criteria: [c('$statusCode == 403')] });
  b.edge('sequence', load, orders);
  b.edge('retry', orders, orders, { name: 'renewOnUnauthorized', reference: '$components.failureActions.renewOnUnauthorized', retryLimit: 1, retryAfter: 0, retryDefaults: false, criteria: [c('$statusCode == 401')] });
  b.edge('retry', orders, refresh, { name: 'renewOnUnauthorized', via: 'renewSession', reference: '$components.failureActions.renewOnUnauthorized', criteria: [c('$statusCode == 401')] });
  b.edge('sequence', orders, prefs);
  b.edge('failure', prefs, load, { name: 'staleProfile', criteria: [c('$statusCode == 409')], backward: true });
  b.edge('transfer', prefs, escal, { name: 'escalate', via: 'supportEscalation', origin: 'onFailure', criteria: [c('$statusCode >= 500')] });
  b.edge('sequence', prefs, audit);
  b.edge('workflow-call', audit, auditRef, { via: '$sourceDescriptions.auditFlows.logAccess' });
  b.edge('sequence', audit, out);
  b.edge('sequence', refresh, store);
  return b.build({
    summary: '401 → retry via le sous-workflow renewSession puis rejeu ; querystring ; goto arrière ; transfert ; workflow externe.',
    defaults: { failureActions: [{ name: 'throttled', type: 'retry', retryAfter: 1, retryLimit: 2, criteria: [c('$statusCode == 429')] }] },
  });
}

/* ------------------------------------------------------------------ (d) */
/** PRNG déterministe (mulberry32) : même graphe à chaque chargement. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function large60(): WorkflowGraph {
  const r = rng(20261116);
  const b = new GraphBuilder('enterpriseOnboarding', 'Grand workflow généré (60 étapes)', [
    { name: 'registry', type: 'openapi', url: './openapi/registry.yaml' },
    { name: 'kyc', type: 'openapi', url: './openapi/kyc.yaml' },
    { name: 'accounts', type: 'openapi', url: './openapi/accounts.yaml' },
    { name: 'events', type: 'asyncapi', url: './asyncapi/events.yaml' },
  ]);
  const verbs = ['fetch', 'validate', 'create', 'update', 'check', 'enrich', 'score', 'publish', 'await', 'sync', 'link', 'archive'];
  const nouns = ['Company', 'Siren', 'Director', 'Kyc', 'Account', 'Contract', 'Mandate', 'Iban', 'Risk', 'Webhook', 'Ledger', 'Profile'];
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
  const input = b.input([
    { name: 'siren', type: 'string', required: true },
    { name: 'contactEmail', type: 'string', required: true },
    { name: 'plan', type: 'string', default: 'pro' },
  ]);
  const ids: string[] = [];
  for (let i = 1; i <= 60; i++) {
    const v = verbs[Math.floor(r() * verbs.length)];
    const nn = nouns[Math.floor(r() * nouns.length)];
    const stepId = `${v}${nn}${String(i).padStart(2, '0')}`;
    const roll = r();
    const src = i < 15 ? 'registry' : i < 30 ? 'kyc' : 'accounts';
    let id: string;
    if (roll < 0.12) {
      id = b.step(stepId, { stepKind: 'async-receive', action: 'receive', source: 'events', channel: `${nn.toLowerCase()}.updated`, timeoutMs: 1000 * (2 + Math.floor(r() * 8)), correlationId: '$inputs.siren', criteria: [c('$message.payload.ok == true')] });
    } else if (roll < 0.2) {
      id = b.step(stepId, { stepKind: 'async-send', action: 'send', source: 'events', channel: `${nn.toLowerCase()}.requested`, hasRequestBody: true });
    } else {
      const m = methods[Math.floor(r() * methods.length)];
      id = b.step(stepId, { stepKind: 'http', source: src, operationId: stepId, method: m, methodSource: 'openapi', path: `/${nn.toLowerCase()}s${m === 'POST' ? '' : '/{id}'}`, criteria: [c('$statusCode < 300')], stepOutputs: ['id'] });
    }
    ids.push(id);
  }
  const out = b.output([
    { name: 'accountId', expression: '$steps.createAccount.outputs.id' },
    { name: 'kycScore', expression: '$steps.scoreKyc.outputs.score' },
  ]);
  const fail = b.end('failure');
  b.edge('sequence', input, ids[0]);
  // trois éventails parallèles rejoints par dependsOn
  const fans = new Map<number, number[]>([
    [12, [13, 14, 15]],
    [31, [32, 33]],
    [47, [48, 49, 50]],
  ]);
  const fanMembers = new Set([...fans.values()].flat());
  const fanJoins = new Map<number, number>([
    [16, 12],
    [34, 31],
    [51, 47],
  ]);
  for (let i = 0; i < ids.length; i++) {
    const n = i + 1;
    const next = ids[i + 1];
    if (fans.has(n)) {
      for (const m of fans.get(n)!) b.edge('depends-on', ids[n - 1], ids[m - 1], { targetPort: 'in-deps' });
    } else if (!fanMembers.has(n) && next) {
      b.edge('sequence', ids[i], next);
    }
    if (fanJoins.has(n)) {
      const deps = fans.get(fanJoins.get(n)!)!;
      const j = b.junction(ids[i]);
      for (const d of deps) b.edge('depends-on', ids[d - 1], j);
      b.edge('depends-on', j, ids[i], { targetPort: 'in-deps' });
    }
    if (n % 9 === 0) b.edge('retry', ids[i], ids[i], { name: 'transient', retryLimit: 2 + (n % 3), retryAfter: 1 + (n % 4), criteria: [c('$statusCode == 503')] });
    if (n % 7 === 0 && n > 7) b.edge('failure', ids[i], ids[n - 6], { name: 'restartBlock', criteria: [c('$statusCode == 409')], backward: true });
    if (n % 11 === 0) b.edge('end-failure', ids[i], fail, { name: 'abort', criteria: [c('$statusCode >= 500')] });
  }
  b.edge('sequence', ids[59], out);
  return b.build({ summary: '60 étapes, 4 sources, 3 éventails dependsOn, retries et gotos arrière : densité compacte automatique.' });
}

/* ------------------------------------------------------------------ (e) */
export function catalogue(): WorkflowGraph {
  const b = new GraphBuilder('catalogue', 'Catalogue des nœuds et arêtes', [
    { name: 'api', type: 'openapi', url: './openapi/api.yaml' },
    { name: 'events', type: 'asyncapi', url: './asyncapi/events.yaml' },
    { name: 'partner', type: 'arazzo', url: 'https://partner.example/flows.arazzo.yaml' },
  ]);
  const input = b.input([
    { name: 'tenantId', type: 'string', required: true },
    { name: 'itemId', type: 'string', required: true },
    { name: 'dryRun', type: 'boolean', default: false },
    { name: 'tags', type: 'array', default: ['a', 'b'] },
    { name: 'note', type: 'string' },
  ]);
  const get = b.step('readItem', { stepKind: 'http', source: 'api', summary: 'Méthode exacte via operationPath', operationId: 'getItem', method: 'GET', methodSource: 'operationPath', path: '/items/{itemId}', criteria: [c('$statusCode == 200')], stepOutputs: ['item'] });
  const put = b.step('replaceItem', { stepKind: 'http', source: 'api', summary: 'Méthode issue de l’OpenAPI résolu', operationId: 'replaceItem', method: 'PUT', methodSource: 'openapi', path: '/items/{itemId}', criteria: [c('$statusCode == 200'), c('$response.body.version > 1')] });
  const op = b.step('legacyCall', { stepKind: 'http', source: 'api', summary: 'Opération non résolue : badge neutre', operationId: 'legacyCall', methodSource: 'unresolved', diagnostics: [{ severity: 'error', code: 'operation-not-found', message: 'operationId legacyCall introuvable dans api' }] });
  const inferred = b.step('deleteTarget', { stepKind: 'http', source: 'api', summary: 'Méthode déduite (option, style pointillé)', operationId: 'deleteTarget', method: 'DELETE', methodSource: 'inferred', path: undefined });
  const send = b.step('publishEvent', { stepKind: 'async-send', action: 'send', source: 'events', summary: 'Publier l’événement', channel: 'item.replaced', hasRequestBody: true });
  const recv = b.step('awaitAck', { stepKind: 'async-receive', action: 'receive', source: 'events', summary: 'Attendre l’accusé', channel: 'item.ack', timeoutMs: 1500, correlationId: '$steps.publishEvent.outputs.messageId', criteria: [c("$[?@.ok == true]", { type: 'jsonpath', version: 'rfc9535', context: '$message.payload' })] });
  const sub = b.step('syncPartner', { stepKind: 'workflow', source: 'partner', summary: 'Sous-workflow externe replié', targetWorkflowId: '$sourceDescriptions.partner.syncItem', external: true, collapsed: true, innerStepCount: 4, parameters: [{ name: 'itemId', value: '$inputs.itemId' }] });
  const fin = b.step('finalize', { stepKind: 'http', source: 'api', summary: 'Jonction dependsOn (2 dépendances)', operationId: 'finalizeItem', method: 'POST', methodSource: 'openapi', path: '/items/{itemId}/finalize', dependsOn: ['awaitAck', 'syncPartner'] });
  const join = b.junction(fin);
  const refNode = b.ref('$sourceDescriptions.partner.syncItem', { source: 'partner', external: true });
  const transferRef = b.ref('manualReview');
  const ok = b.end('success');
  const fail = b.end('failure');

  b.edge('sequence', input, get);
  b.edge('success', get, put, { name: 'exists', criteria: [c('$response.body.id != null')] });
  b.edge('failure', get, op, { name: 'notFound', criteria: [c('$statusCode == 404')] });
  b.edge('sequence', get, put);
  b.edge('retry', put, put, { name: 'conflict', retryLimit: 1, retryAfter: 0, retryDefaults: true, criteria: [c('$statusCode == 409')] });
  b.edge('transfer', put, transferRef, { name: 'review', via: 'manualReview', origin: 'onFailure', criteria: [c('$statusCode == 422')] });
  b.edge('sequence', put, send);
  b.edge('implicit-failure', op, fail);
  b.edge('sequence', op, inferred);
  b.edge('end-failure', inferred, fail, { name: 'gone', criteria: [c('$statusCode == 410')] });
  b.edge('sequence', inferred, send);
  b.edge('sequence', send, recv);
  b.edge('end-failure', recv, fail, { name: 'ackTimeout' });
  b.edge('depends-on', recv, join);
  b.edge('depends-on', send, sub, { targetPort: 'in-deps' });
  b.edge('workflow-call', sub, refNode, { via: '$sourceDescriptions.partner.syncItem' });
  b.edge('depends-on', sub, join);
  b.edge('depends-on', join, fin, { targetPort: 'in-deps' });
  b.edge('end-success', fin, ok, { name: 'finalized', criteria: [c('$statusCode == 200')] });
  b.edge('sequence', fin, ok);
  return b.build({ summary: 'Les 9 types de nœuds et 10 types d’arêtes du §4 de R5 (bascule densité : compact / standard / détaillé).' });
}

export interface Scenario {
  id: string;
  label: string;
  build: () => WorkflowGraph;
  lanes?: 'off' | 'clusters' | 'lanes';
}

export const SCENARIOS: Scenario[] = [
  { id: 'order-to-cash', label: '(b) Order-to-cash async', build: orderToCash },
  { id: 'pet-adoption', label: '(a) Pet adoption', build: petAdoption },
  { id: 'session-renewal', label: '(c) Session renewal', build: sessionRenewal },
  { id: 'large-60', label: '(d) Grand workflow, 60 étapes', build: large60 },
  { id: 'catalogue', label: 'Catalogue (anatomie)', build: catalogue },
];
