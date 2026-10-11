import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from '../config/loadEnv.js';
import { hashPassword } from '../utils/password.js';
import { countAdmins, insertAdmin } from './adminRepository.js';
import { getDb, getDatabasePath } from './database.js';
import { insertCard } from './cardRepository.js';

const legacyJsonPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'store.json'
);

export function seedDemoData() {
  migrateLegacyJsonIfEmpty();

  const userCount = getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = getDb().prepare(
      'INSERT INTO users (name, department, email) VALUES (?, ?, ?)'
    );
    const u1 = insertUser.run('Aarav Sharma', 'Computer Science', 'aarav@college.edu');
    const u2 = insertUser.run('Priya Patel', 'Electronics', 'priya@college.edu');
    const u3 = insertUser.run('Rohan Mehta', 'Mechanical', 'rohan@college.edu');
    insertCard({ cardId: 'CARD-1001', userId: u1.lastInsertRowid, active: true });
    insertCard({ cardId: 'CARD-1002', userId: u2.lastInsertRowid, active: false });
    insertCard({ cardId: 'CARD-1003', userId: u3.lastInsertRowid, active: true });
  }

  if (countAdmins() === 0) {
    const cfg = getConfig();
    insertAdmin({
      username: cfg.adminDefaultUsername,
      passwordHash: hashPassword(cfg.adminDefaultPassword),
      name: 'Campus Admin',
    });
    console.log(`Default admin: ${cfg.adminDefaultUsername} (change password in production)`);
  }
}

function migrateLegacyJsonIfEmpty() {
  const count = getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0 || !fs.existsSync(legacyJsonPath)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyJsonPath, 'utf8'));
    const insertUser = getDb().prepare(
      'INSERT INTO users (id, name, department, email) VALUES (?, ?, ?, ?)'
    );
    const insertCardLegacy = getDb().prepare(
      'INSERT INTO cards (id, cardId, userId, active, createdAt) VALUES (?, ?, ?, ?, ?)'
    );
    for (const u of legacy.users ?? []) {
      insertUser.run(u.id, u.name, u.department, u.email);
    }
    for (const c of legacy.cards ?? []) {
      insertCardLegacy.run(c.id, c.cardId, c.userId, c.active ? 1 : 0, c.createdAt);
    }
    console.log('Migrated legacy store.json into', getDatabasePath());
  } catch (err) {
    console.warn('Legacy JSON migration skipped:', err.message);
  }
}
