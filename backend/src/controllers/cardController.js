import * as cardService from '../services/cardService.js';
import { parsePagination } from '../utils/pagination.js';
import { success } from '../utils/response.js';

export function list(searchParams) {
  const pg = parsePagination(searchParams);
  const { items, meta } = cardService.listCardsPaginated(pg);
  return success(items, meta);
}

export function create(body) {
  const card = cardService.registerCard(body);
  return success(card);
}

export function patchActive(id, body) {
  const card = cardService.updateCardActive(id, body);
  return success(card);
}
