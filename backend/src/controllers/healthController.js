import { success } from '../utils/response.js';

export function health() {
  return success({ ok: true, service: 'campus-flow-api' });
}
