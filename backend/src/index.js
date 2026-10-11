import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile, getConfig } from './config/loadEnv.js';
import { initDatabase } from './repositories/database.js';
import { applySchema } from './repositories/schema.js';
import { seedDemoData } from './repositories/seed.js';
import { dispatchApi } from './routes/apiRouter.js';
import { AppError, sendJson } from './utils/response.js';

loadEnvFile();
const cfg = getConfig();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

initDatabase();
applySchema();
seedDemoData();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
};

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
  if (urlPath === '/') urlPath = '/index.html';
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

  const url = new URL(req.url, `http://localhost:${cfg.port}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const body =
      req.method === 'GET' || req.method === 'DELETE' ? {} : await readJsonBody(req);
    if (body === null) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
      });
      return;
    }
    const result = dispatchApi({
      method: req.method,
      pathname,
      searchParams: url.searchParams,
      headers: req.headers,
      body,
    });
    sendJson(res, result.statusCode, result.body);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 404, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Not found' },
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${cfg.port} is already in use.`);
    process.exit(1);
  }
  throw err;
});

server.listen(cfg.port, () => {
  console.log(`Campus Flow running at http://localhost:${cfg.port}`);
});
