import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'store.json');

let store = null;

function defaultStore() {
  return {
    users: [],
    cards: [],
    access_logs: [],
    passes: [],
    nextId: { users: 1, cards: 1, access_logs: 1, passes: 1 },
  };
}

function ensureStoreShape() {
  if (!store.passes) {
    store.passes = [];
  }
  if (!store.nextId.passes) {
    store.nextId.passes = 1;
  }
  for (const log of store.access_logs) {
    if (log.gate === undefined) {
      log.gate = 'HOSTEL';
    }
    if (log.direction === undefined) {
      log.direction = 'OUT';
    }
  }
}

function loadStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    store = defaultStore();
    persist();
    return;
  }
  const raw = fs.readFileSync(storePath, 'utf8');
  store = JSON.parse(raw);
  ensureStoreShape();
}

export function persist() {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export function initSchema() {
  loadStore();
}

export function getStore() {
  if (!store) {
    initSchema();
  }
  return store;
}

export function seedDemoData() {
  const s = getStore();
  if (s.users.length > 0) {
    return;
  }

  const u1 = {
    id: s.nextId.users++,
    name: 'Aarav Sharma',
    department: 'Computer Science',
    email: 'aarav@college.edu',
  };
  const u2 = {
    id: s.nextId.users++,
    name: 'Priya Patel',
    department: 'Electronics',
    email: 'priya@college.edu',
  };
  const u3 = {
    id: s.nextId.users++,
    name: 'Rohan Mehta',
    department: 'Mechanical',
    email: 'rohan@college.edu',
  };
  s.users.push(u1, u2, u3);

  const now = new Date().toISOString();
  s.cards.push(
    { id: s.nextId.cards++, cardId: 'CARD-1001', userId: u1.id, active: true, createdAt: now },
    { id: s.nextId.cards++, cardId: 'CARD-1002', userId: u2.id, active: false, createdAt: now },
    { id: s.nextId.cards++, cardId: 'CARD-1003', userId: u3.id, active: true, createdAt: now }
  );

  persist();
}

export function findUserById(id) {
  return getStore().users.find((u) => u.id === id) ?? null;
}

export function findCardByCardId(cardId) {
  return getStore().cards.find((c) => c.cardId === cardId) ?? null;
}

export function appendAccessLog(entry) {
  const s = getStore();
  const row = {
    id: s.nextId.access_logs++,
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  s.access_logs.push(row);
  persist();
  return row;
}

export function findActivePassForUser(userId) {
  const s = getStore();
  const now = Date.now();
  return (
    s.passes.find(
      (p) =>
        p.userId === userId &&
        p.status === 'ACTIVE' &&
        new Date(p.validUntil).getTime() > now
    ) ?? null
  );
}

export function createPass({ userId, cardId, issuedAtGate, validHours }) {
  const s = getStore();
  const issuedAt = new Date();
  const validUntil = new Date(issuedAt.getTime() + validHours * 60 * 60 * 1000);
  const passCode = `PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const pass = {
    id: s.nextId.passes++,
    passCode,
    userId,
    cardId,
    issuedAtGate,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    status: 'ACTIVE',
  };
  s.passes.push(pass);
  persist();
  return pass;
}

export function closeActivePassForUser(userId, status = 'CLOSED') {
  const pass = findActivePassForUser(userId);
  if (!pass) {
    return null;
  }
  pass.status = status;
  persist();
  return pass;
}
