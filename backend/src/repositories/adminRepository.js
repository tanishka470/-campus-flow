import crypto from 'crypto';
import { getDb } from './database.js';

export function countAdmins() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM admins').get().c;
}

export function insertAdmin({ username, passwordHash, name }) {
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(
      'INSERT INTO admins (username, passwordHash, name, createdAt) VALUES (?, ?, ?, ?)'
    )
    .run(username, passwordHash, name, createdAt);
  return findAdminById(result.lastInsertRowid);
}

export function findAdminByUsername(username) {
  return (
    getDb()
      .prepare('SELECT id, username, passwordHash, name, createdAt FROM admins WHERE username = ?')
      .get(username) ?? null
  );
}

export function findAdminById(id) {
  const row =
    getDb()
      .prepare('SELECT id, username, name, createdAt FROM admins WHERE id = ?')
      .get(id) ?? null;
  return row;
}

export function createSession(adminId, expiresAt) {
  const token = crypto.randomBytes(32).toString('hex');
  getDb()
    .prepare('INSERT INTO admin_sessions (token, adminId, expiresAt) VALUES (?, ?, ?)')
    .run(token, adminId, expiresAt);
  return token;
}

export function findSession(token) {
  if (!token) return null;
  purgeExpiredSessions();
  const row = getDb()
    .prepare(
      `SELECT s.token, s.adminId, s.expiresAt, a.username, a.name
       FROM admin_sessions s
       JOIN admins a ON a.id = s.adminId
       WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    deleteSession(token);
    return null;
  }
  return row;
}

export function deleteSession(token) {
  getDb().prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

function purgeExpiredSessions() {
  getDb()
    .prepare('DELETE FROM admin_sessions WHERE expiresAt <= ?')
    .run(new Date().toISOString());
}
