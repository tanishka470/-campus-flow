import { getDb } from './database.js';

export function insertAccessLog(entry) {
  const timestamp = entry.timestamp ?? new Date().toISOString();
  const result = getDb()
    .prepare(
      `INSERT INTO access_logs (cardId, userId, status, reason, gate, direction, passCode, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entry.cardId,
      entry.userId ?? null,
      entry.status,
      entry.reason ?? null,
      entry.gate ?? 'HOSTEL',
      entry.direction ?? 'OUT',
      entry.passCode ?? null,
      timestamp
    );
  return getDb()
    .prepare(
      'SELECT id, cardId, userId, status, reason, gate, direction, passCode, timestamp FROM access_logs WHERE id = ?'
    )
    .get(result.lastInsertRowid);
}

export function countAccessLogs() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM access_logs').get().total;
}

export function listAccessLogsPage(offset, limit) {
  return getDb()
    .prepare(
      `SELECT l.id, l.cardId, l.userId, l.status, l.reason, l.gate, l.direction,
              l.passCode, l.timestamp, u.name AS userName, u.department
       FROM access_logs l
       LEFT JOIN users u ON u.id = l.userId
       ORDER BY l.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}
