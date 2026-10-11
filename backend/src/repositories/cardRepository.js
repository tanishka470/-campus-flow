import { getDb } from './database.js';

function mapCard(row) {
  if (!row) return null;
  return { ...row, active: row.active === 1 };
}

export function findCardByCardId(cardId) {
  const row = getDb()
    .prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE cardId = ?')
    .get(cardId);
  return mapCard(row);
}

export function findCardById(id) {
  return mapCard(
    getDb().prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE id = ?').get(id)
  );
}

export function cardIdExists(cardId) {
  return getDb().prepare('SELECT 1 FROM cards WHERE cardId = ?').get(cardId) !== undefined;
}

export function countCards() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM cards').get().total;
}

export function listCardsPage(offset, limit) {
  return getDb()
    .prepare(
      `SELECT c.id, c.cardId, c.userId, c.active, c.createdAt,
              u.name AS userName, u.department
       FROM cards c
       JOIN users u ON u.id = c.userId
       ORDER BY c.id
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset)
    .map(mapCard);
}

export function insertCard({ cardId, userId, active }) {
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare('INSERT INTO cards (cardId, userId, active, createdAt) VALUES (?, ?, ?, ?)')
    .run(cardId, userId, active ? 1 : 0, createdAt);
  return findCardById(result.lastInsertRowid);
}

export function setCardActive(id, active) {
  getDb().prepare('UPDATE cards SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return findCardById(id);
}
