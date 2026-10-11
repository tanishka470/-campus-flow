import * as accessLogRepo from '../repositories/accessLogRepository.js';
import * as cardRepo from '../repositories/cardRepository.js';
import * as passRepo from '../repositories/passRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { AppError } from '../utils/response.js';

const CARD_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const GATES = new Set(['HOSTEL', 'MAIN']);
const DIRECTIONS = new Set(['IN', 'OUT']);
const PASS_VALID_HOURS = 24;

export function validateCardId(cardId) {
  if (typeof cardId !== 'string') {
    throw new AppError(400, 'INVALID_CARD_ID', 'cardId must be a string');
  }
  const trimmed = cardId.trim();
  if (trimmed.length === 0) {
    throw new AppError(400, 'MISSING_CARD_ID', 'cardId is required');
  }
  if (!CARD_ID_PATTERN.test(trimmed)) {
    throw new AppError(400, 'INVALID_CARD_FORMAT', 'cardId has invalid format');
  }
  return trimmed;
}

export function validateScanContext(body) {
  const gate = typeof body?.gate === 'string' ? body.gate.trim().toUpperCase() : 'HOSTEL';
  const direction =
    typeof body?.direction === 'string' ? body.direction.trim().toUpperCase() : 'OUT';
  if (!GATES.has(gate)) {
    throw new AppError(400, 'INVALID_GATE', 'gate must be HOSTEL or MAIN');
  }
  if (!DIRECTIONS.has(direction)) {
    throw new AppError(400, 'INVALID_DIRECTION', 'direction must be IN or OUT');
  }
  return { gate, direction };
}

function userPayload(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, department: user.department, email: user.email };
}

function deny(cardId, userId, gate, direction, reason, user) {
  accessLogRepo.insertAccessLog({
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
  accessLogRepo.insertAccessLog({
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

export function processScan(cardId, context) {
  const { gate, direction } = context;
  const card = cardRepo.findCardByCardId(cardId);
  if (!card) {
    return deny(cardId, null, gate, direction, 'Card not registered', null);
  }
  const user = userRepo.findUserById(card.userId);
  if (!card.active) {
    return deny(cardId, card.userId, gate, direction, 'Card is inactive', user);
  }
  const activePass = passRepo.findActivePassForUser(card.userId);

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
    const pass = passRepo.createPassRecord({
      userId: card.userId,
      cardId,
      issuedAtGate: 'HOSTEL',
      validHours: PASS_VALID_HOURS,
    });
    return grant(cardId, card.userId, gate, direction, user, pass);
  }

  if (gate === 'HOSTEL' && direction === 'IN') {
    if (activePass) passRepo.closeActivePass(card.userId, 'RETURNED_HOSTEL');
    return grant(cardId, card.userId, gate, direction, user, null);
  }

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
