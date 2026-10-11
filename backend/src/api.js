import {
  cardIdExists,
  findCardByInternalId,
  findUserById,
  insertCardRecord,
  listCardsWithHolder,
  listUsers,
  updateCardActiveFlag,
} from './db.js';
import {
  listActivePasses,
  listRecentAccessLogs,
  processScan,
  validateCardId,
  validateScanContext,
} from './services/accessService.js';

export function handleHealth() {
  return { status: 200, body: { ok: true, service: 'campus-flow-api' } };
}

export function handleAccessScan(body) {
  const validation = validateCardId(body?.cardId);
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } };
  }
  const ctx = validateScanContext(body);
  if (!ctx.ok) {
    return { status: 400, body: { error: ctx.error } };
  }
  const result = processScan(validation.value, { gate: ctx.gate, direction: ctx.direction });
  return {
    status: 200,
    body: { cardId: validation.value, ...result },
  };
}

export function handleListUsers() {
  return { status: 200, body: listUsers() };
}

export function handleListCards() {
  return { status: 200, body: listCardsWithHolder() };
}

export function handleCreateCard(body) {
  const validation = validateCardId(body?.cardId);
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } };
  }
  const userId = Number(body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { status: 400, body: { error: 'userId must be a positive integer' } };
  }
  if (!findUserById(userId)) {
    return { status: 404, body: { error: 'User not found' } };
  }
  if (cardIdExists(validation.value)) {
    return { status: 409, body: { error: 'Card ID already registered' } };
  }
  const active =
    body?.active === undefined ? true : body.active === true || body.active === 1;
  const card = insertCardRecord({ cardId: validation.value, userId, active });
  return { status: 201, body: card };
}

export function handlePatchCardActive(idStr, body) {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return { status: 400, body: { error: 'Invalid card id' } };
  }
  if (typeof body?.active !== 'boolean') {
    return { status: 400, body: { error: 'active must be a boolean' } };
  }
  if (!findCardByInternalId(id)) {
    return { status: 404, body: { error: 'Card not found' } };
  }
  const card = updateCardActiveFlag(id, body.active);
  return { status: 200, body: card };
}

export function handleAccessLogs(query) {
  const limit = query.get('limit');
  return { status: 200, body: listRecentAccessLogs(limit) };
}

export function handleActivePasses() {
  return { status: 200, body: listActivePasses() };
}
