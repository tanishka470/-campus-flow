import { getDb } from './database.js';

export function findUserById(id) {
  return getDb().prepare('SELECT id, name, department, email FROM users WHERE id = ?').get(id) ?? null;
}

export function countUsers() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM users').get().total;
}

export function listUsersPage(offset, limit) {
  return getDb()
    .prepare('SELECT id, name, department, email FROM users ORDER BY id LIMIT ? OFFSET ?')
    .all(limit, offset);
}
