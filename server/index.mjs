import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { URL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'governance.db');
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(process.cwd(), 'mockup');
const SEED_FILE = process.env.SEED_FILE || path.resolve(STATIC_DIR, 'data.seed.js');
const SEED_FORCE = process.env.SEED_FORCE === 'true';

const REQUIRED_SECTIONS = ['MOCK', 'PERSONS', 'TEAMS', 'ARCH_STANDARDS', 'RULE_STD_MAP'];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS mock_sections (
  section TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`);

function loadSeedData(seedPath) {
  const source = fs.readFileSync(seedPath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${source}\n;globalThis.__EXPORTED__ = { MOCK, PERSONS, TEAMS, ARCH_STANDARDS, RULE_STD_MAP };`,
    sandbox,
    { filename: seedPath }
  );
  if (!sandbox.__EXPORTED__) {
    throw new Error(`No seed data exported from ${seedPath}`);
  }

  return JSON.parse(JSON.stringify(sandbox.__EXPORTED__));
}

function ensureSeedData() {
  if (!SEED_FORCE) {
    const rows = db.prepare('SELECT section FROM mock_sections').all();
    const existing = new Set(rows.map((row) => row.section));
    const missing = REQUIRED_SECTIONS.filter((section) => !existing.has(section));
    if (!missing.length) {
      return;
    }
  } else {
    console.log('[seed] force mode enabled, reseeding all sections');
  }

  const seedData = loadSeedData(SEED_FILE);
  const upsert = db.prepare(`
    INSERT INTO mock_sections (section, payload, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(section) DO UPDATE SET
      payload = excluded.payload,
      updated_at = datetime('now')
  `);

  for (const section of REQUIRED_SECTIONS) {
    if (!(section in seedData)) {
      throw new Error(`Missing section '${section}' in seed data`);
    }
    upsert.run(section, JSON.stringify(seedData[section]));
  }

  console.log(`[seed] initialized sections: ${REQUIRED_SECTIONS.join(', ')}`);
}

function readBootstrapPayload() {
  const select = db.prepare('SELECT payload FROM mock_sections WHERE section = ?');
  const payload = {};

  for (const section of REQUIRED_SECTIONS) {
    const row = select.get(section);
    if (!row) {
      throw new Error(`Section '${section}' not found in database`);
    }
    payload[section] = JSON.parse(row.payload);
  }

  return payload;
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const candidate = path.resolve(STATIC_DIR, `.${pathname}`);
  if (!candidate.startsWith(STATIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(candidate, (statErr, stat) => {
    if (!statErr && stat.isFile()) {
      fs.readFile(candidate, (readErr, data) => {
        if (readErr) {
          sendText(res, 500, 'Internal Server Error');
          return;
        }

        const ext = path.extname(candidate).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': pathname === '/data.js' ? 'no-store' : 'public, max-age=300'
        });
        res.end(data);
      });
      return;
    }

    fs.readFile(path.resolve(STATIC_DIR, 'index.html'), (indexErr, data) => {
      if (indexErr) {
        sendText(res, 404, 'Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendText(res, 200, 'OK');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/bootstrap') {
      const payload = readBootstrapPayload();
      sendJson(res, 200, payload);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error('[request-error]', error);
    sendJson(res, 500, { error: 'internal_error', message: error.message });
  }
});

try {
  ensureSeedData();
} catch (error) {
  console.error('[startup-error]', error);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`aichi-governance server listening on ${HOST}:${PORT}`);
  console.log(`db: ${DB_PATH}`);
  console.log(`static: ${STATIC_DIR}`);
});
