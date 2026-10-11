import { getConfig } from '../config/loadEnv.js';
import * as adminRepo from '../repositories/adminRepository.js';
import { verifyPassword } from '../utils/password.js';
import { AppError } from '../utils/response.js';

export function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'INVALID_CREDENTIALS', 'username and password required');
  }
  const admin = adminRepo.findAdminByUsername(username.trim());
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    throw new AppError(401, 'AUTH_FAILED', 'Invalid username or password');
  }
  const cfg = getConfig();
  const expiresAt = new Date(Date.now() + cfg.sessionTtlHours * 60 * 60 * 1000).toISOString();
  const token = adminRepo.createSession(admin.id, expiresAt);
  return {
    token,
    expiresAt,
    admin: { id: admin.id, username: admin.username, name: admin.name },
  };
}

export function logout(token) {
  if (token) adminRepo.deleteSession(token);
}

export function requireAdmin(authHeader) {
  const token = parseBearer(authHeader);
  const session = adminRepo.findSession(token);
  if (!session) {
    throw new AppError(401, 'UNAUTHORIZED', 'Admin login required');
  }
  return { id: session.adminId, username: session.username, name: session.name };
}

function parseBearer(header) {
  if (typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
