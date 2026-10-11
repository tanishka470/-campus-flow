import * as cardRepo from '../repositories/cardRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { AppError } from '../utils/response.js';
import { buildMeta } from '../utils/pagination.js';
import { validateCardId } from './accessService.js';

export function listCardsPaginated({ page, limit, offset }) {
  const total = cardRepo.countCards();
  const items = cardRepo.listCardsPage(offset, limit);
  return { items, meta: buildMeta({ page, limit, total }) };
}

export function registerCard(body) {
  const cardId = validateCardId(body?.cardId);
  const userId = Number(body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(400, 'INVALID_USER_ID', 'userId must be a positive integer');
  }
  if (!userRepo.findUserById(userId)) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  if (cardRepo.cardIdExists(cardId)) {
    throw new AppError(409, 'CARD_EXISTS', 'Card ID already registered');
  }
  const active =
    body?.active === undefined ? true : body.active === true || body.active === 1;
  return cardRepo.insertCard({ cardId, userId, active });
}

export function updateCardActive(idStr, body) {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_CARD_ID', 'Invalid card id');
  }
  if (typeof body?.active !== 'boolean') {
    throw new AppError(400, 'INVALID_ACTIVE', 'active must be a boolean');
  }
  const card = cardRepo.findCardById(id);
  if (!card) {
    throw new AppError(404, 'CARD_NOT_FOUND', 'Card not found');
  }
  return cardRepo.setCardActive(id, body.active);
}
