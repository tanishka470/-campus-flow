import crypto from 'crypto';
import { getDb } from './database.js';

export function findActivePassForUser(userId) {
  const now = new Date().toISOString();
  return (
    getDb()
      .prepare(
        `SELECT id, passCode, userId, cardId, issuedAtGate, issuedAt, validUntil, status
         FROM passes
         WHERE userId = ? AND status = 'ACTIVE' AND validUntil > ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(userId, now) ?? null
  );
}

export function createPassRecord({ userId, cardId, issuedAtGate, validHours }) {
  const issuedAt = new Date();
  const validUntil = new Date(issuedAt.getTime() + validHours * 60 * 60 * 1000);
  const passCode = `PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const result = getDb()
    .prepare(
      `INSERT INTO passes (passCode, userId, cardId, issuedAtGate, issuedAt, validUntil, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`
    )
    .run(
      passCode,
      userId,
      cardId,
      issuedAtGate,
      issuedAt.toISOString(),
      validUntil.toISOString()
    );
  return getDb()
    .prepare(
      'SELECT id, passCode, userId, cardId, issuedAtGate, issuedAt, validUntil, status FROM passes WHERE id = ?'
    )
    .get(result.lastInsertRowid);
}

export function closeActivePass(userId, status = 'CLOSED') {
  const pass = findActivePassForUser(userId);
  if (!pass) return null;
  getDb().prepare('UPDATE passes SET status = ? WHERE id = ?').run(status, pass.id);
  return { ...pass, status };
}

export function countActivePasses() {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS total FROM passes WHERE status = 'ACTIVE' AND validUntil > ?`
    )
    .get(now).total;
}

export function listActivePassesPage(offset, limit) {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `SELECT p.id, p.passCode, p.userId, p.cardId, p.issuedAtGate, p.issuedAt, p.validUntil, p.status,
              u.name AS userName
       FROM passes p
       JOIN users u ON u.id = p.userId
       WHERE p.status = 'ACTIVE' AND p.validUntil > ?
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(now, limit, offset);
}
