import * as passService from '../services/passService.js';
import { parsePagination } from '../utils/pagination.js';
import { success } from '../utils/response.js';

export function listActive(searchParams) {
  const pg = parsePagination(searchParams);
  const { items, meta } = passService.listActivePassesPaginated(pg);
  return success(items, meta);
}
