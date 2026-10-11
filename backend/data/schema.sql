-- Campus In-Out Management System — SQLite schema
-- Database file: backend/data/campus.db (created at runtime)

PRAGMA foreign_keys = ON;

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
