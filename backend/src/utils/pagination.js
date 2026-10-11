import { AppError } from './response.js';

export function parsePagination(searchParams, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Number(searchParams.get('page') ?? defaults.page);
  const limit = Number(searchParams.get('limit') ?? defaults.limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'INVALID_PAGE', 'page must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new AppError(400, 'INVALID_LIMIT', 'limit must be a positive integer');
  }

  const safeLimit = Math.min(limit, defaults.maxLimit);
  const offset = (page - 1) * safeLimit;

  return { page, limit: safeLimit, offset };
}

export function buildMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}
