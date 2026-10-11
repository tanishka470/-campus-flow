import * as userRepo from '../repositories/userRepository.js';
import { buildMeta } from '../utils/pagination.js';

export function listUsersPaginated({ page, limit, offset }) {
  const total = userRepo.countUsers();
  const items = userRepo.listUsersPage(offset, limit);
  return { items, meta: buildMeta({ page, limit, total }) };
}
