import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { URL } from 'node:url';
import { Pool } from 'pg';

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(process.cwd(), 'mockup');
const SEED_FILE = process.env.SEED_FILE || path.resolve(STATIC_DIR, 'data.seed.js');
const SEED_FORCE = process.env.SEED_FORCE === 'true';

const DATABASE_URL = process.env.DATABASE_URL;
const IS_RENDER = !!process.env.RENDER;
const pool = new Pool(
  DATABASE_URL
    ? { connectionString: DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: Number.parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'aichi_governance'
      }
);

const STARTUP_DB_RETRIES = Number.parseInt(process.env.STARTUP_DB_RETRIES || '30', 10);
const STARTUP_DB_RETRY_MS = Number.parseInt(process.env.STARTUP_DB_RETRY_MS || '2000', 10);

const REQUIRED_SECTIONS = ['MOCK', 'PERSONS', 'TEAMS', 'ARCH_STANDARDS', 'RULE_STD_MAP'];

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

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mock_sections (
      section TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS systems (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS subsystems (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      subsystem_id TEXT NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dependency_nodes (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      dep_type TEXT,
      criticality TEXT,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS compliance_rules (
      rule_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      system TEXT,
      level TEXT,
      applicant TEXT,
      review_date DATE NOT NULL,
      status TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS review_checks (
      id BIGSERIAL PRIMARY KEY,
      review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      rule_id TEXT NOT NULL,
      passed BOOLEAN NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_systems_domain_id ON systems(domain_id);
    CREATE INDEX IF NOT EXISTS idx_subsystems_system_id ON subsystems(system_id);
    CREATE INDEX IF NOT EXISTS idx_applications_subsystem_id ON applications(subsystem_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source);
    CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_review_checks_review_id ON review_checks(review_id);
  `);
}

async function upsertMockSections(client, seedData) {
  for (const section of REQUIRED_SECTIONS) {
    if (!(section in seedData)) {
      throw new Error(`Missing section '${section}' in seed data`);
    }
    await client.query(
      `
      INSERT INTO mock_sections (section, payload, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (section)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
      `,
      [section, JSON.stringify(seedData[section])]
    );
  }
}

async function reseedStructuredData(client, seedData) {
  await client.query('TRUNCATE TABLE review_checks, reviews, dependencies, dependency_nodes, applications, subsystems, systems, domains, compliance_rules RESTART IDENTITY CASCADE');

  for (const domain of seedData.MOCK.domains || []) {
    await client.query('INSERT INTO domains (id, payload) VALUES ($1, $2::jsonb)', [domain.id, JSON.stringify(domain)]);
  }

  for (const [domainId, systems] of Object.entries(seedData.MOCK.systems || {})) {
    for (const system of systems) {
      await client.query('INSERT INTO systems (id, domain_id, payload) VALUES ($1, $2, $3::jsonb)', [system.id, domainId, JSON.stringify(system)]);
    }
  }

  for (const [systemId, subsystems] of Object.entries(seedData.MOCK.subsystems || {})) {
    for (const subsystem of subsystems) {
      await client.query('INSERT INTO subsystems (id, system_id, payload) VALUES ($1, $2, $3::jsonb)', [subsystem.id, systemId, JSON.stringify(subsystem)]);
    }
  }

  for (const [subsystemId, apps] of Object.entries(seedData.MOCK.apps || {})) {
    for (const app of apps) {
      await client.query('INSERT INTO applications (id, subsystem_id, payload) VALUES ($1, $2, $3::jsonb)', [app.id, subsystemId, JSON.stringify(app)]);
    }
  }

  for (const node of seedData.MOCK.depNodes || []) {
    await client.query('INSERT INTO dependency_nodes (id, payload) VALUES ($1, $2::jsonb)', [node.id, JSON.stringify(node)]);
  }

  for (const dep of seedData.MOCK.dependencies || []) {
    await client.query(
      'INSERT INTO dependencies (source, target, dep_type, criticality, payload) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [dep.source, dep.target, dep.type || null, dep.crit || null, JSON.stringify(dep)]
    );
  }

  const rulesById = new Map();
  for (const standard of seedData.ARCH_STANDARDS || []) {
    for (const rule of standard.rules || []) {
      if (!rulesById.has(rule.id)) {
        rulesById.set(rule.id, { ...rule, stdId: standard.id, stdName: standard.name });
      }
    }
  }
  for (const [ruleId, payload] of rulesById.entries()) {
    await client.query('INSERT INTO compliance_rules (rule_id, payload) VALUES ($1, $2::jsonb)', [ruleId, JSON.stringify(payload)]);
  }

  for (const review of seedData.MOCK.reviews || []) {
    await client.query(
      `
      INSERT INTO reviews (id, title, type, system, level, applicant, review_date, status, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::jsonb)
      `,
      [
        review.id,
        review.title,
        review.type,
        review.system || null,
        review.level || null,
        review.applicant || null,
        review.date,
        review.status,
        JSON.stringify(review)
      ]
    );
  }
}

async function ensureSeedData() {
  const seedData = loadSeedData(SEED_FILE);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await upsertMockSections(client, seedData);

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM domains');
    const hasStructuredData = rows[0].n > 0;

    if (SEED_FORCE || !hasStructuredData) {
      await reseedStructuredData(client, seedData);
    }

    await client.query('COMMIT');
    console.log(`[seed] completed (force=${SEED_FORCE})`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadSectionsPayload() {
  const { rows } = await pool.query('SELECT section, payload FROM mock_sections');
  const payload = {};
  for (const row of rows) {
    payload[row.section] = row.payload;
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!(section in payload)) {
      throw new Error(`Section '${section}' not found in database`);
    }
  }
  return payload;
}

async function loadSectionPayload(section) {
  const { rows } = await pool.query('SELECT payload FROM mock_sections WHERE section = $1', [section]);
  if (!rows.length) {
    throw new Error(`Section '${section}' not found in database`);
  }
  return rows[0].payload;
}

function splitDataCenters(text) {
  return String(text || '')
    .split(/[+,，、]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeDrValidation(mock) {
  const allSystems = Object.values(mock.systems || {}).flat();
  const core = allSystems.filter((s) => s.level === 'CORE');
  const important = allSystems.filter((s) => s.level === 'IMPORTANT');
  const compliant = core.filter((s) => splitDataCenters(s.dataCenters).length >= 2);
  const violations = core.filter((s) => splitDataCenters(s.dataCenters).length < 2);
  const warnings = important.filter((s) => splitDataCenters(s.dataCenters).length < 2);

  return {
    summary: {
      coreTotal: core.length,
      coreCompliant: compliant.length,
      coreRate: core.length ? Number(((compliant.length / core.length) * 100).toFixed(1)) : 100
    },
    compliant: compliant.map((s) => ({ systemId: s.id, systemName: s.name, dataCenters: splitDataCenters(s.dataCenters) })),
    violations: violations.map((s) => ({ systemId: s.id, systemName: s.name, dataCenters: splitDataCenters(s.dataCenters) })),
    warnings: warnings.map((s) => ({ systemId: s.id, systemName: s.name, dataCenters: splitDataCenters(s.dataCenters) }))
  };
}

function pickNames(mock, count, offset = 0) {
  const nodes = mock.depNodes || [];
  if (!nodes.length) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const n = nodes[(offset + i) % nodes.length];
    out.push(n.name);
  }
  return out;
}

function buildTrafficChain(domain) {
  const d = domain || 'card-api.bank.com';
  return {
    domain: d,
    vip: '10.1.1.100',
    lbDevice: 'F5-PROD-01',
    pool: 'card-api-pool',
    backends: [
      { endpoint: '10.2.1.11:8080', app: 'card-apply-svc', status: 'RUNNING' },
      { endpoint: '10.2.1.12:8080', app: 'card-apply-svc', status: 'RUNNING' },
      { endpoint: '10.2.1.13:8080', app: 'card-apply-svc', status: 'OFFLINE' }
    ],
    ssl: { valid: true, expireDate: '2027-03-15' }
  };
}

function bfsNeighbors(startId, deps, depth, direction) {
  const visited = new Set([startId]);
  let frontier = [startId];
  const output = [];
  for (let level = 1; level <= depth; level += 1) {
    const next = [];
    for (const id of frontier) {
      for (const dep of deps) {
        const matched = direction === 'downstream' ? dep.source === id : dep.target === id;
        if (!matched) continue;
        const nid = direction === 'downstream' ? dep.target : dep.source;
        if (visited.has(nid)) continue;
        visited.add(nid);
        next.push(nid);
        output.push({ ...dep, level, nodeId: nid });
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return output;
}

function toReviewDto(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    system: row.system,
    level: row.level,
    applicant: row.applicant,
    date: row.review_date,
    status: row.status
  };
}

async function listReviews(status) {
  const params = [];
  let sql = `
    SELECT id, title, type, system, level, applicant,
      to_char(review_date, 'YYYY-MM-DD') AS review_date,
      status
    FROM reviews
  `;
  if (status) {
    params.push(status);
    sql += ` WHERE status = $${params.length}`;
  }
  sql += ' ORDER BY review_date DESC, id DESC';
  const { rows } = await pool.query(sql, params);
  return rows.map(toReviewDto);
}

async function nextReviewId() {
  const year = new Date().getFullYear();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM reviews WHERE id LIKE $1', [`REV-${year}-%`]);
  const seq = String(rows[0].n + 1).padStart(3, '0');
  return `REV-${year}-${seq}`;
}

async function evaluateCompliance(reviewRow) {
  const payload = reviewRow.payload || {};
  const deploy = String(payload.dc || payload.deploy || '').toLowerCase();
  const techStack = String(payload.techStack || '').toLowerCase();
  const db = String(payload.db || '').toLowerCase();
  const applicant = String(reviewRow.applicant || '').trim();

  const checks = [
    {
      ruleId: 'R001',
      severity: 'CRITICAL',
      passed: deploy.includes('双dc') || deploy.includes('灾备') || deploy.includes('dr'),
      message: '核心系统需双DC部署'
    },
    {
      ruleId: 'R002',
      severity: 'CRITICAL',
      passed: !db.includes('共享'),
      message: '禁止数据库共享'
    },
    {
      ruleId: 'R005',
      severity: 'MAJOR',
      passed: !(techStack.includes('java 8') || techStack.includes('spring mvc 4')),
      message: '禁止使用废弃技术栈'
    },
    {
      ruleId: 'R007',
      severity: 'MINOR',
      passed: applicant.length > 0,
      message: '应用必须有负责人'
    },
    {
      ruleId: 'R008',
      severity: 'MAJOR',
      passed: !String(payload.otelRequired || '').toLowerCase().includes('no'),
      message: '应用应接入OTel'
    }
  ];

  return checks;
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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRequestBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
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
  if (pathname === '/') pathname = '/index.html';

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

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/v1/bootstrap') {
    const payload = await loadSectionsPayload();
    const liveReviews = await listReviews();
    payload.MOCK.reviews = liveReviews;
    sendJson(res, 200, payload);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/domains') {
    const { rows } = await pool.query('SELECT payload FROM domains ORDER BY payload->>\'name\'');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/dependency-graph') {
    const mock = await loadSectionPayload('MOCK');
    const domainId = url.searchParams.get('domain_id');
    const focusApp = url.searchParams.get('app_id');
    const depth = Number.parseInt(url.searchParams.get('depth') || '0', 10);

    let nodes = mock.depNodes || [];
    let edges = mock.dependencies || [];
    if (domainId) {
      nodes = nodes.filter((n) => n.domain === domainId);
      const allowed = new Set(nodes.map((n) => n.id));
      edges = edges.filter((d) => allowed.has(d.source) && allowed.has(d.target));
    }

    if (focusApp && depth > 0) {
      const down = bfsNeighbors(focusApp, edges, depth, 'downstream');
      const up = bfsNeighbors(focusApp, edges, depth, 'upstream');
      const keep = new Set([focusApp, ...down.map((x) => x.nodeId), ...up.map((x) => x.nodeId)]);
      nodes = nodes.filter((n) => keep.has(n.id));
      edges = edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    }

    sendJson(res, 200, { nodes, edges });
    return true;
  }

  const appImpactMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/impact$/);
  if (req.method === 'GET' && appImpactMatch) {
    const appId = decodeURIComponent(appImpactMatch[1]);
    const depth = Number.parseInt(url.searchParams.get('depth') || '3', 10);
    const changeType = url.searchParams.get('change_type') || 'UNKNOWN';
    const mock = await loadSectionPayload('MOCK');
    const deps = mock.dependencies || [];
    const upstream = bfsNeighbors(appId, deps, depth, 'upstream');
    const downstream = bfsNeighbors(appId, deps, depth, 'downstream');
    sendJson(res, 200, { appId, changeType, depth, upstream, downstream });
    return true;
  }

  const domainSystemsMatch = url.pathname.match(/^\/api\/v1\/panorama\/domains\/([^/]+)\/systems$/);
  if (req.method === 'GET' && domainSystemsMatch) {
    const domainId = decodeURIComponent(domainSystemsMatch[1]);
    const { rows } = await pool.query('SELECT payload FROM systems WHERE domain_id = $1 ORDER BY payload->>\'name\'', [domainId]);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  const sysArchMatch = url.pathname.match(/^\/api\/v1\/panorama\/systems\/([^/]+)\/architecture$/);
  if (req.method === 'GET' && sysArchMatch) {
    const systemId = decodeURIComponent(sysArchMatch[1]);
    const systemRes = await pool.query('SELECT payload FROM systems WHERE id = $1', [systemId]);
    if (!systemRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'system not found' });
      return true;
    }

    const subsRes = await pool.query('SELECT id, payload FROM subsystems WHERE system_id = $1 ORDER BY payload->>\'name\'', [systemId]);
    const subsystemIds = subsRes.rows.map((r) => r.id);
    let appsBySubsystem = new Map();
    if (subsystemIds.length) {
      const appsRes = await pool.query('SELECT subsystem_id, payload FROM applications WHERE subsystem_id = ANY($1::text[])', [subsystemIds]);
      appsBySubsystem = appsRes.rows.reduce((acc, row) => {
        if (!acc.has(row.subsystem_id)) acc.set(row.subsystem_id, []);
        acc.get(row.subsystem_id).push(row.payload);
        return acc;
      }, new Map());
    }

    const architecture = {
      system: systemRes.rows[0].payload,
      subsystems: subsRes.rows.map((row) => ({ ...row.payload, applications: appsBySubsystem.get(row.id) || [] }))
    };
    sendJson(res, 200, architecture);
    return true;
  }

  const appProfileMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/profile$/);
  if (req.method === 'GET' && appProfileMatch) {
    const appId = decodeURIComponent(appProfileMatch[1]);
    const appRes = await pool.query('SELECT payload FROM applications WHERE id = $1', [appId]);
    if (!appRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'application not found' });
      return true;
    }

    const depsRes = await pool.query('SELECT payload FROM dependencies WHERE source = $1 OR target = $1', [appId]);
    sendJson(res, 200, { profile: appRes.rows[0].payload, dependencies: depsRes.rows.map((row) => row.payload) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/data-centers/summary') {
    const mock = await loadSectionPayload('MOCK');
    sendJson(res, 200, mock.dataCenters || []);
    return true;
  }

  const appDeployMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/deployment-topology$/);
  if (req.method === 'GET' && appDeployMatch) {
    const appId = decodeURIComponent(appDeployMatch[1]);
    const appRes = await pool.query(
      `
      SELECT a.payload AS app_payload, sy.payload AS system_payload
      FROM applications a
      JOIN subsystems ss ON ss.id = a.subsystem_id
      JOIN systems sy ON sy.id = ss.system_id
      WHERE a.id = $1
      `,
      [appId]
    );
    if (!appRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'application not found' });
      return true;
    }
    const row = appRes.rows[0];
    const dcs = splitDataCenters(row.system_payload.dataCenters);
    const instances = dcs.map((dc, i) => ({ dc, count: i === 0 ? 2 : 1, status: 'RUNNING' }));
    sendJson(res, 200, { app: row.app_payload, system: row.system_payload, dataCenters: dcs, instances });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/dr-validation') {
    const mock = await loadSectionPayload('MOCK');
    sendJson(res, 200, computeDrValidation(mock));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/database-clusters') {
    const mock = await loadSectionPayload('MOCK');
    let clusters = mock.dbClusters || [];
    const type = url.searchParams.get('type');
    const dcId = url.searchParams.get('dc_id');
    if (type) clusters = clusters.filter((c) => String(c.type).toUpperCase() === String(type).toUpperCase());
    if (dcId) clusters = clusters.filter((c) => String(c.dc).includes(dcId));
    sendJson(res, 200, clusters);
    return true;
  }

  const dbDetailMatch = url.pathname.match(/^\/api\/v1\/panorama\/database-clusters\/([^/]+)\/detail$/);
  if (req.method === 'GET' && dbDetailMatch) {
    const clusterId = decodeURIComponent(dbDetailMatch[1]);
    const mock = await loadSectionPayload('MOCK');
    const cluster = (mock.dbClusters || []).find((c) => c.id === clusterId);
    if (!cluster) {
      sendJson(res, 404, { error: 'not_found', message: 'database cluster not found' });
      return true;
    }
    const instances = Array.from({ length: cluster.instances }).map((_, i) => ({
      instanceName: `${cluster.name}-node-${String(i + 1).padStart(2, '0')}`,
      endpoint: `10.2.${Math.floor(i / 10) + 1}.${10 + i}:33${String(i).padStart(2, '0')}`,
      role: i === 0 ? 'PRIMARY' : 'REPLICA',
      status: 'RUNNING'
    }));
    const appRelations = pickNames(mock, cluster.apps).map((name) => ({ appName: name, accessType: 'READ_WRITE', schema: 'default' }));
    const drConfig = cluster.dr === 'ok'
      ? { status: 'NORMAL', mode: 'SYNC', rpoSeconds: 0, rtoSeconds: 60 }
      : cluster.dr === 'warn'
        ? { status: 'LAG', mode: 'ASYNC', rpoSeconds: 60, rtoSeconds: 300 }
        : { status: 'MISSING', mode: null, rpoSeconds: null, rtoSeconds: null };
    sendJson(res, 200, { cluster, instances, appRelations, drConfig });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/middleware-clusters') {
    const mock = await loadSectionPayload('MOCK');
    const type = url.searchParams.get('type');
    let clusters = [];
    if (type) {
      clusters = (mock.mwClusters?.[type] || []).map((c) => ({ ...c, type }));
    } else {
      for (const [k, arr] of Object.entries(mock.mwClusters || {})) {
        clusters.push(...arr.map((c) => ({ ...c, type: k })));
      }
    }
    sendJson(res, 200, clusters);
    return true;
  }

  const mwImpactMatch = url.pathname.match(/^\/api\/v1\/panorama\/middleware-clusters\/([^/]+)\/impact$/);
  if (req.method === 'GET' && mwImpactMatch) {
    const clusterId = decodeURIComponent(mwImpactMatch[1]);
    const mock = await loadSectionPayload('MOCK');
    let cluster = null;
    for (const [type, arr] of Object.entries(mock.mwClusters || {})) {
      const hit = arr.find((c) => c.id === clusterId);
      if (hit) {
        cluster = { ...hit, type };
        break;
      }
    }
    if (!cluster) {
      sendJson(res, 404, { error: 'not_found', message: 'middleware cluster not found' });
      return true;
    }
    const producers = pickNames(mock, cluster.producers, 1);
    const consumers = pickNames(mock, cluster.consumers, 11);
    sendJson(res, 200, { cluster, producers, consumers });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/traffic-chain') {
    const domain = url.searchParams.get('domain') || 'card-api.bank.com';
    sendJson(res, 200, buildTrafficChain(domain));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/tech-radar') {
    const mock = await loadSectionPayload('MOCK');
    const standards = mock.techStandards || [];
    sendJson(res, 200, {
      adopt: standards.filter((t) => t.lifecycle === 'RECOMMENDED'),
      trial: standards.filter((t) => t.lifecycle === 'ALLOWED'),
      hold: standards.filter((t) => t.lifecycle === 'DEPRECATED'),
      forbid: standards.filter((t) => t.lifecycle === 'FORBIDDEN')
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/tech-debt') {
    const mock = await loadSectionPayload('MOCK');
    const debt = (mock.techStandards || []).filter((t) => ['DEPRECATED', 'FORBIDDEN'].includes(t.lifecycle));
    sendJson(res, 200, debt);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/drift-detection') {
    const mock = await loadSectionPayload('MOCK');
    sendJson(res, 200, mock.driftData || {});
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/compliance-rules') {
    const { rows } = await pool.query('SELECT rule_id, payload FROM compliance_rules ORDER BY rule_id');
    sendJson(res, 200, rows.map((r) => ({ ruleId: r.rule_id, ...r.payload })));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/reviews') {
    const status = url.searchParams.get('status');
    const reviews = await listReviews(status);
    sendJson(res, 200, reviews);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/reviews') {
    const body = await readJsonBody(req);
    if (!body.title || !body.type) {
      sendJson(res, 400, { error: 'bad_request', message: 'title and type are required' });
      return true;
    }

    const id = await nextReviewId();
    const date = body.date || new Date().toISOString().slice(0, 10);
    const status = body.status || 'DRAFT';
    const payload = { ...body };

    await pool.query(
      `
      INSERT INTO reviews (id, title, type, system, level, applicant, review_date, status, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::jsonb)
      `,
      [id, body.title, body.type, body.system || null, body.level || null, body.applicant || null, date, status, JSON.stringify(payload)]
    );

    sendJson(res, 201, { id, title: body.title, type: body.type, system: body.system || null, level: body.level || null, applicant: body.applicant || null, date, status });
    return true;
  }

  const reviewSubmitMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/submit$/);
  if (req.method === 'PUT' && reviewSubmitMatch) {
    const reviewId = decodeURIComponent(reviewSubmitMatch[1]);
    const reviewRes = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (!reviewRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'review not found' });
      return true;
    }

    const review = reviewRes.rows[0];
    const checks = await evaluateCompliance(review);
    const hasCriticalFail = checks.some((c) => !c.passed && c.severity === 'CRITICAL');
    const nextStatus = hasCriticalFail ? 'DRAFT' : 'REVIEWING';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM review_checks WHERE review_id = $1', [reviewId]);
      for (const check of checks) {
        await client.query(
          'INSERT INTO review_checks (review_id, rule_id, passed, severity, message) VALUES ($1, $2, $3, $4, $5)',
          [reviewId, check.ruleId, check.passed, check.severity, check.message]
        );
      }
      await client.query('UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1', [reviewId, nextStatus]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    sendJson(res, 200, {
      reviewId,
      status: nextStatus,
      blocked: hasCriticalFail,
      summary: {
        total: checks.length,
        passed: checks.filter((c) => c.passed).length,
        failed: checks.filter((c) => !c.passed).length
      },
      checks
    });
    return true;
  }

  const reviewChecksMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/compliance-check$/);
  if (req.method === 'GET' && reviewChecksMatch) {
    const reviewId = decodeURIComponent(reviewChecksMatch[1]);
    const { rows } = await pool.query(
      'SELECT rule_id, passed, severity, message FROM review_checks WHERE review_id = $1 ORDER BY id ASC',
      [reviewId]
    );
    sendJson(res, 200, rows.map((row) => ({ ruleId: row.rule_id, passed: row.passed, severity: row.severity, message: row.message })));
    return true;
  }

  const reviewApproveMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/approve$/);
  if (req.method === 'PUT' && reviewApproveMatch) {
    const reviewId = decodeURIComponent(reviewApproveMatch[1]);
    const result = await pool.query(
      'UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
      [reviewId, 'APPROVED']
    );
    if (!result.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'review not found' });
      return true;
    }
    sendJson(res, 200, { id: reviewId, status: 'APPROVED' });
    return true;
  }

  const reviewRejectMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/reject$/);
  if (req.method === 'PUT' && reviewRejectMatch) {
    const reviewId = decodeURIComponent(reviewRejectMatch[1]);
    const result = await pool.query(
      'UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
      [reviewId, 'REJECTED']
    );
    if (!result.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'review not found' });
      return true;
    }
    sendJson(res, 200, { id: reviewId, status: 'REJECTED' });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/reviews/dashboard/metrics') {
    const [allReviews, reviewing, approved, rejected] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM reviews'),
      pool.query("SELECT COUNT(*)::int AS n FROM reviews WHERE status = 'REVIEWING'"),
      pool.query("SELECT COUNT(*)::int AS n FROM reviews WHERE status = 'APPROVED'"),
      pool.query("SELECT COUNT(*)::int AS n FROM reviews WHERE status = 'REJECTED'")
    ]);

    const total = allReviews.rows[0].n;
    const passBase = approved.rows[0].n + rejected.rows[0].n;
    const passRate = passBase > 0 ? Math.round((approved.rows[0].n / passBase) * 100) : 0;

    sendJson(res, 200, {
      total,
      reviewing: reviewing.rows[0].n,
      approved: approved.rows[0].n,
      rejected: rejected.rows[0].n,
      passRate
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/reviews/dashboard/my-workbench') {
    const user = url.searchParams.get('user') || '';
    const [mine, pending] = await Promise.all([
      user
        ? pool.query('SELECT COUNT(*)::int AS n FROM reviews WHERE applicant = $1', [user])
        : pool.query('SELECT COUNT(*)::int AS n FROM reviews'),
      user
        ? pool.query("SELECT COUNT(*)::int AS n FROM reviews WHERE applicant = $1 AND status IN ('REVIEWING','DRAFT')", [user])
        : pool.query("SELECT COUNT(*)::int AS n FROM reviews WHERE status IN ('REVIEWING','DRAFT')")
    ]);
    sendJson(res, 200, {
      user: user || null,
      submitted: mine.rows[0].n,
      pending: pending.rows[0].n
    });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      await pool.query('SELECT 1');
      sendText(res, 200, 'OK');
      return;
    }

    const isApi = url.pathname.startsWith('/api/');
    if (isApi) {
      const handled = await handleApi(req, res, url);
      if (!handled) {
        sendJson(res, 404, { error: 'not_found', message: 'api endpoint not found' });
      }
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error('[request-error]', error);
    sendJson(res, 500, { error: 'internal_error', message: error.message });
  }
});

async function start() {
  const hasPgParts = !!(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);
  if (IS_RENDER && !DATABASE_URL && !hasPgParts) {
    throw new Error('Database config is missing. Set DATABASE_URL, or set PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE on Render.');
  }

  let lastError = null;
  for (let attempt = 1; attempt <= STARTUP_DB_RETRIES; attempt += 1) {
    try {
      await initSchema();
      await ensureSeedData();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.error(`[startup] database init failed (attempt ${attempt}/${STARTUP_DB_RETRIES}): ${error.message}`);
      if (attempt < STARTUP_DB_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, STARTUP_DB_RETRY_MS));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  server.listen(PORT, HOST, () => {
    console.log(`aichi-governance server listening on ${HOST}:${PORT}`);
    console.log(`static: ${STATIC_DIR}`);
    console.log(`seed file: ${SEED_FILE}`);
    console.log(`db: ${DATABASE_URL ? 'DATABASE_URL' : `${process.env.PGHOST || '127.0.0.1'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'aichi_governance'}`}`);
  });
}

start().catch((error) => {
  console.error('[startup-error]', error);
  process.exit(1);
});
