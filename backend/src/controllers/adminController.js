import * as adminAuthService from '../services/adminAuthService.js';
import { success } from '../utils/response.js';

export function login(body) {
  const data = adminAuthService.login(body?.username, body?.password);
  return success(data);
}

export function logout(authHeader) {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  adminAuthService.logout(token);
  return success({ loggedOut: true });
}

export function me(authHeader) {
  const admin = adminAuthService.requireAdmin(authHeader);
  return success({ admin });
}
