import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'campus.db');
const legacyJsonPath = path.join(dataDir, 'store.json');

let db = null;

function getDb() {
  if (!db) {
    throw new Error('Database not initialized — call initSchema() first');
  }
  return db;
}

function mapCardRow(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    active: row.active === 1,
  };
}

export function initSchema() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId TEXT NOT NULL,
      userId INTEGER,
      status TEXT NOT NULL CHECK (status IN ('GRANTED', 'DENIED')),
      reason TEXT,
      gate TEXT NOT NULL DEFAULT 'HOSTEL',
      direction TEXT NOT NULL DEFAULT 'OUT',
      passCode TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passCode TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL,
      cardId TEXT NOT NULL,
      issuedAtGate TEXT NOT NULL,
      issuedAt TEXT NOT NULL,
      validUntil TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(id DESC);
    CREATE INDEX IF NOT EXISTS idx_cards_cardId ON cards(cardId);
    CREATE INDEX IF NOT EXISTS idx_passes_user_active ON passes(userId, status);
  `);

  migrateLegacyJsonIfEmpty();
}

function migrateLegacyJsonIfEmpty() {
  const count = getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0 || !fs.existsSync(legacyJsonPath)) {
    return;
  }

  try {
    const legacy = JSON.parse(fs.readFileSync(legacyJsonPath, 'utf8'));
    const insertUser = getDb().prepare(
      'INSERT INTO users (id, name, department, email) VALUES (?, ?, ?, ?)'
    );
    const insertCard = getDb().prepare(
      'INSERT INTO cards (id, cardId, userId, active, createdAt) VALUES (?, ?, ?, ?, ?)'
    );
    for (const u of legacy.users ?? []) {
      insertUser.run(u.id, u.name, u.department, u.email);
    }
    for (const c of legacy.cards ?? []) {
      insertCard.run(c.id, c.cardId, c.userId, c.active ? 1 : 0, c.createdAt);
    }
    console.log('Migrated legacy store.json into SQLite (campus.db)');
  } catch (err) {
    console.warn('Legacy JSON migration skipped:', err.message);
  }
}

export function seedDemoData() {
  const count = getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) {
    return;
  }

  const insertUser = getDb().prepare(
    'INSERT INTO users (name, department, email) VALUES (?, ?, ?)'
  );
  const insertCard = getDb().prepare(
    'INSERT INTO cards (cardId, userId, active, createdAt) VALUES (?, ?, ?, ?)'
  );

  const u1 = insertUser.run('Aarav Sharma', 'Computer Science', 'aarav@college.edu');
  const u2 = insertUser.run('Priya Patel', 'Electronics', 'priya@college.edu');
  const u3 = insertUser.run('Rohan Mehta', 'Mechanical', 'rohan@college.edu');
  const now = new Date().toISOString();
  insertCard.run('CARD-1001', u1.lastInsertRowid, 1, now);
  insertCard.run('CARD-1002', u2.lastInsertRowid, 0, now);
  insertCard.run('CARD-1003', u3.lastInsertRowid, 1, now);
}

export function getDatabasePath() {
  return dbPath;
}

export function findUserById(id) {
  return getDb().prepare('SELECT id, name, department, email FROM users WHERE id = ?').get(id) ?? null;
}

export function findCardByCardId(cardId) {
  const row = getDb()
    .prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE cardId = ?')
    .get(cardId);
  return mapCardRow(row);
}

export function listUsers() {
  return getDb().prepare('SELECT id, name, department, email FROM users ORDER BY id').all();
}

export function listCardsWithHolder() {
  return getDb()
    .prepare(
      `SELECT c.id, c.cardId, c.userId, c.active, c.createdAt,
              u.name AS userName, u.department
       FROM cards c
       JOIN users u ON u.id = c.userId
       ORDER BY c.id`
    )
    .all()
    .map(mapCardRow);
}

export function insertCardRecord({ cardId, userId, active }) {
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare(
      'INSERT INTO cards (cardId, userId, active, createdAt) VALUES (?, ?, ?, ?)'
    )
    .run(cardId, userId, active ? 1 : 0, createdAt);
  return mapCardRow(
    getDb()
      .prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE id = ?')
      .get(result.lastInsertRowid)
  );
}

export function cardIdExists(cardId) {
  return getDb().prepare('SELECT 1 FROM cards WHERE cardId = ?').get(cardId) !== undefined;
}

export function updateCardActiveFlag(id, active) {
  getDb().prepare('UPDATE cards SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return mapCardRow(
    getDb().prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE id = ?').get(id)
  );
}

export function findCardByInternalId(id) {
  return mapCardRow(
    getDb().prepare('SELECT id, cardId, userId, active, createdAt FROM cards WHERE id = ?').get(id)
  );
}

export function appendAccessLog(entry) {
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

export function listAccessLogs(limit) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return getDb()
    .prepare(
      `SELECT l.id, l.cardId, l.userId, l.status, l.reason, l.gate, l.direction,
              l.passCode, l.timestamp, u.name AS userName, u.department
       FROM access_logs l
       LEFT JOIN users u ON u.id = l.userId
       ORDER BY l.id DESC
       LIMIT ?`
    )
    .all(safeLimit);
}

export function findActivePassForUser(userId) {
  const now = new Date().toISOString();
  return (
    getDb()
      .prepare(
        `SELECT id, passCode, userId, cardId, issuedAtGate, issuedAt, validUntil, status
         FROM passes
         WHERE userId = ? AND status = 'ACTIVE' AND validUntil > ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(userId, now) ?? null
  );
}

export function createPass({ userId, cardId, issuedAtGate, validHours }) {
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

export function closeActivePassForUser(userId, status = 'CLOSED') {
  const pass = findActivePassForUser(userId);
  if (!pass) {
    return null;
  }
  getDb().prepare('UPDATE passes SET status = ? WHERE id = ?').run(status, pass.id);
  return { ...pass, status };
}

export function listActivePasses() {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `SELECT p.id, p.passCode, p.userId, p.cardId, p.issuedAtGate, p.issuedAt, p.validUntil, p.status,
              u.name AS userName
       FROM passes p
       JOIN users u ON u.id = p.userId
       WHERE p.status = 'ACTIVE' AND p.validUntil > ?
       ORDER BY p.id DESC`
    )
    .all(now);
}
