import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema, seedDemoData } from './db.js';
import {
  handleAccessLogs,
  handleAccessScan,
  handleActivePasses,
  handleCreateCard,
  handleHealth,
  handleListCards,
  handleListUsers,
  handlePatchCardActive,
} from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
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

loadEnvFile();

const publicDir = path.join(__dirname, '..', 'public');
const port = Number(process.env.PORT) || 4000;

initSchema();
seedDemoData();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') {
    urlPath = '/index.html';
  }
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      const { status, body } = handleHealth();
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/access/scan') {
      const body = await readJsonBody(req);
      if (body === null) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const { status, body: out } = handleAccessScan(body);
      sendJson(res, status, out);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/users') {
      const { status, body } = handleListUsers();
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/cards') {
      const { status, body } = handleListCards();
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/cards') {
      const body = await readJsonBody(req);
      if (body === null) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const { status, body: out } = handleCreateCard(body);
      sendJson(res, status, out);
      return;
    }

    const cardActiveMatch = pathname.match(/^\/api\/cards\/(\d+)\/active$/);
    if (req.method === 'PATCH' && cardActiveMatch) {
      const body = await readJsonBody(req);
      if (body === null) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const { status, body: out } = handlePatchCardActive(cardActiveMatch[1], body);
      sendJson(res, status, out);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/access-logs') {
      const { status, body } = handleAccessLogs(url.searchParams);
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/passes/active') {
      const { status, body } = handleActivePasses();
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'GET') {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Either:`);
    console.error(`  • Open http://localhost:${port} (server may already be running), or`);
    console.error(`  • Free the port: lsof -ti :${port} | xargs kill`);
    console.error(`  • Use another port: PORT=4001 node src/index.js`);
    process.exit(1);
  }
  throw err;
});

server.listen(port, () => {
  console.log(`Campus Flow running at http://localhost:${port}`);
  console.log('Open that URL in your browser (no npm install required).');
});
