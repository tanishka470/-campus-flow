import { findUserById, getStore, persist } from './db.js';
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
  const { users } = getStore();
  return { status: 200, body: [...users].sort((a, b) => a.id - b.id) };
}

export function handleListCards() {
  const s = getStore();
  const cards = [...s.cards]
    .sort((a, b) => a.id - b.id)
    .map((c) => {
      const user = findUserById(c.userId);
      return { ...c, userName: user?.name, department: user?.department };
    });
  return { status: 200, body: cards };
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
  const s = getStore();
  if (s.cards.some((c) => c.cardId === validation.value)) {
    return { status: 409, body: { error: 'Card ID already registered' } };
  }
  const active =
    body?.active === undefined ? true : body.active === true || body.active === 1;
  const card = {
    id: s.nextId.cards++,
    cardId: validation.value,
    userId,
    active,
    createdAt: new Date().toISOString(),
  };
  s.cards.push(card);
  persist();
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
  const s = getStore();
  const card = s.cards.find((c) => c.id === id);
  if (!card) {
    return { status: 404, body: { error: 'Card not found' } };
  }
  card.active = body.active;
  persist();
  return { status: 200, body: { ...card } };
}

export function handleAccessLogs(query) {
  const limit = query.get('limit');
  return { status: 200, body: listRecentAccessLogs(limit) };
}

export function handleActivePasses() {
  return { status: 200, body: listActivePasses() };
}
