import * as accessLogRepo from '../repositories/accessLogRepository.js';
import { buildMeta } from '../utils/pagination.js';

export function listLogsPaginated({ page, limit, offset }) {
  const total = accessLogRepo.countAccessLogs();
  const items = accessLogRepo.listAccessLogsPage(offset, limit);
  return { items, meta: buildMeta({ page, limit, total }) };
}
