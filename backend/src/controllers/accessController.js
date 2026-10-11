import * as accessService from '../services/accessService.js';
import { success } from '../utils/response.js';

export function scan(body) {
  const cardId = accessService.validateCardId(body?.cardId);
  const ctx = accessService.validateScanContext(body);
  const result = accessService.processScan(cardId, ctx);
  return success({ cardId, ...result });
}
