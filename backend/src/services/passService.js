import * as passRepo from '../repositories/passRepository.js';
import { buildMeta } from '../utils/pagination.js';

export function listActivePassesPaginated({ page, limit, offset }) {
  const total = passRepo.countActivePasses();
  const items = passRepo.listActivePassesPage(offset, limit);
  return { items, meta: buildMeta({ page, limit, total }) };
}
