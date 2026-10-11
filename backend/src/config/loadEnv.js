import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getConfig() {
  return {
    port: Number(process.env.PORT) || 4000,
    adminDefaultUsername: process.env.ADMIN_USERNAME || 'admin@college.edu',
    adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'CampusAdmin@2026',
    sessionTtlHours: Number(process.env.ADMIN_SESSION_HOURS) || 8,
  };
}
