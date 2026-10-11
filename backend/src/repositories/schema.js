import { getDb } from './database.js';

export function applySchema() {
  getDb().exec(`
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

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      adminId INTEGER NOT NULL,
      expiresAt TEXT NOT NULL,
      FOREIGN KEY (adminId) REFERENCES admins(id)
    );

    CREATE INDEX IF NOT EXISTS idx_access_logs_id ON access_logs(id DESC);
    CREATE INDEX IF NOT EXISTS idx_cards_cardId ON cards(cardId);
    CREATE INDEX IF NOT EXISTS idx_passes_user_active ON passes(userId, status);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expiresAt);
  `);
}
