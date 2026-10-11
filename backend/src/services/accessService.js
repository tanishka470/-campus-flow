import {
  appendAccessLog,
  closeActivePassForUser,
  createPass,
  findActivePassForUser,
  findCardByCardId,
  findUserById,
  getStore,
} from '../db.js';

const CARD_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const GATES = new Set(['HOSTEL', 'MAIN']);
const DIRECTIONS = new Set(['IN', 'OUT']);
const PASS_VALID_HOURS = 24;

export function validateCardId(cardId) {
  if (typeof cardId !== 'string') {
    return { ok: false, error: 'cardId must be a string' };
  }
  const trimmed = cardId.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'cardId is required' };
  }
  if (!CARD_ID_PATTERN.test(trimmed)) {
    return { ok: false, error: 'cardId has invalid format' };
  }
  return { ok: true, value: trimmed };
}

export function validateScanContext(body) {
  const gate = typeof body?.gate === 'string' ? body.gate.trim().toUpperCase() : 'HOSTEL';
  const direction =
    typeof body?.direction === 'string' ? body.direction.trim().toUpperCase() : 'OUT';

  if (!GATES.has(gate)) {
    return { ok: false, error: 'gate must be HOSTEL or MAIN' };
  }
  if (!DIRECTIONS.has(direction)) {
    return { ok: false, error: 'direction must be IN or OUT' };
  }
  return { ok: true, gate, direction };
}

function userPayload(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    department: user.department,
    email: user.email,
  };
}

function deny(cardId, userId, gate, direction, reason, user) {
  appendAccessLog({
    cardId,
    userId,
    status: 'DENIED',
    reason,
    gate,
    direction,
    passCode: null,
  });
  return {
    status: 'DENIED',
    reason,
    user: userPayload(user),
    gate,
    direction,
    pass: null,
  };
}

function grant(cardId, userId, gate, direction, user, pass = null) {
  appendAccessLog({
    cardId,
    userId,
    status: 'GRANTED',
    reason: null,
    gate,
    direction,
    passCode: pass?.passCode ?? null,
  });
  return {
    status: 'GRANTED',
    reason: null,
    user: userPayload(user),
    gate,
    direction,
    pass,
  };
}

/**
 * Card reader → software. Hardware sends cardId (+ gate/direction configured per device).
 * Replaces manual register + paper pass at hostel and pass check at main gate.
 */
export function processScan(cardId, context) {
  const { gate, direction } = context;
  const card = findCardByCardId(cardId);

  if (!card) {
    return deny(cardId, null, gate, direction, 'Card not registered', null);
  }

  const user = findUserById(card.userId);

  if (!card.active) {
    return deny(cardId, card.userId, gate, direction, 'Card is inactive', user);
  }

  const activePass = findActivePassForUser(card.userId);

  // --- Hostel gate: issue digital pass (replaces manual pass page) ---
  if (gate === 'HOSTEL' && direction === 'OUT') {
    if (activePass) {
      return deny(
        cardId,
        card.userId,
        gate,
        direction,
        'Exit pass already active — return first or close at hostel IN',
        user
      );
    }
    const pass = createPass({
      userId: card.userId,
      cardId,
      issuedAtGate: 'HOSTEL',
      validHours: PASS_VALID_HOURS,
    });
    return grant(cardId, card.userId, gate, direction, user, pass);
  }

  if (gate === 'HOSTEL' && direction === 'IN') {
    if (activePass) {
      closeActivePassForUser(card.userId, 'RETURNED_HOSTEL');
    }
    return grant(cardId, card.userId, gate, direction, user, null);
  }

  // --- Main gate: second level — must have pass issued at hostel ---
  if (gate === 'MAIN' && direction === 'OUT') {
    if (!activePass) {
      return deny(
        cardId,
        card.userId,
        gate,
        direction,
        'No active exit pass — scan OUT at hostel gate first',
        user
      );
    }
    return grant(cardId, card.userId, gate, direction, user, activePass);
  }

  if (gate === 'MAIN' && direction === 'IN') {
    return grant(cardId, card.userId, gate, direction, user, activePass);
  }

  return deny(cardId, card.userId, gate, direction, 'Unhandled scan', user);
}

export function listRecentAccessLogs(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const s = getStore();
  return [...s.access_logs]
    .sort((a, b) => b.id - a.id)
    .slice(0, safeLimit)
    .map((log) => {
      const user = log.userId ? findUserById(log.userId) : null;
      return {
        ...log,
        userName: user?.name ?? null,
        department: user?.department ?? null,
      };
    });
}

export function listActivePasses() {
  const s = getStore();
  const now = Date.now();
  return s.passes
    .filter((p) => p.status === 'ACTIVE' && new Date(p.validUntil).getTime() > now)
    .map((p) => {
      const user = findUserById(p.userId);
      return {
        ...p,
        userName: user?.name ?? null,
      };
    })
    .sort((a, b) => b.id - a.id);
}
