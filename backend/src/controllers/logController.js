import * as logService from '../services/logService.js';
import { parsePagination } from '../utils/pagination.js';
import { success } from '../utils/response.js';

export function list(searchParams) {
  const pg = parsePagination(searchParams);
  const { items, meta } = logService.listLogsPaginated(pg);
  return success(items, meta);
}
