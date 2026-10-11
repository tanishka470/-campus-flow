import * as userService from '../services/userService.js';
import { parsePagination } from '../utils/pagination.js';
import { success } from '../utils/response.js';

export function list(searchParams) {
  const pg = parsePagination(searchParams);
  const { items, meta } = userService.listUsersPaginated(pg);
  return success(items, meta);
}
