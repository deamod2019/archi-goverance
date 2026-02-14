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
const API_VERSION = process.env.API_VERSION || '1.5.0';
const APP_REVISION =
  process.env.RENDER_GIT_COMMIT ||
  process.env.RENDER_GIT_BRANCH_COMMIT ||
  process.env.SOURCE_VERSION ||
  process.env.GIT_COMMIT ||
  'dev';

const REQUIRED_SECTIONS = ['MOCK', 'PERSONS', 'TEAMS', 'ARCH_STANDARDS', 'RULE_STD_MAP'];
const ENTITY_TABLES = [
  'domains',
  'capabilities',
  'processes',
  'systems',
  'subsystems',
  'applications',
  'microservices',
  'api_groups',
  'api_endpoints',
  'teams',
  'registries',
  'dependencies',
  'data_objects',
  'subject_areas',
  'logical_entities',
  'tech_standards',
  'tech_components',
  'compliance_rules',
  'reviews',
  'artifacts',
  'otel_services',
  'otel_instances',
  'data_centers',
  'machine_rooms',
  'racks',
  'physical_servers',
  'virtual_machines',
  'k8s_clusters',
  'k8s_namespaces',
  'containers',
  'network_zones',
  'network_devices',
  'physical_networks',
  'vips',
  'firewall_rules',
  'database_clusters',
  'database_instances',
  'database_dr',
  'middleware_clusters',
  'middleware_instances',
  'lb_clusters',
  'lb_service_pools',
  'lb_domains'
];

const BOOTSTRAP_PROJECTIONS = {
  full: REQUIRED_SECTIONS,
  panorama: ['MOCK'],
  directory: ['PERSONS', 'TEAMS'],
  standards: ['ARCH_STANDARDS', 'RULE_STD_MAP'],
  review: ['MOCK', 'ARCH_STANDARDS', 'RULE_STD_MAP']
};

const DOMAIN_PROJECTIONS = {
  full: null,
  summary: ['id', 'name', 'apps', 'systems', 'compliance', 'health', 'color'],
  governance: ['id', 'name', 'owner', 'architect', 'status', 'bizGoal', 'priority']
};

const SYSTEM_PROJECTIONS = {
  full: null,
  summary: ['id', 'name', 'level', 'status', 'apps', 'subsystems', 'dataCenters', 'techStack'],
  governance: ['id', 'name', 'code', 'level', 'status', 'owner', 'architect', 'lastDeployDate']
};

const DB_CLUSTER_PROJECTIONS = {
  full: null,
  summary: ['id', 'name', 'type', 'mode', 'instances', 'apps', 'dr', 'dc']
};

const MW_CLUSTER_PROJECTIONS = {
  full: null,
  summary: ['id', 'name', 'type', 'product', 'instances', 'producers', 'consumers', 'health']
};

const REVIEW_PROJECTIONS = {
  full: null,
  summary: ['id', 'title', 'type', 'system', 'level', 'applicant', 'date', 'status']
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

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

    CREATE TABLE IF NOT EXISTS microservices (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS api_groups (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS api_endpoints (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES api_groups(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS registries (
      id TEXT PRIMARY KEY,
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

    CREATE TABLE IF NOT EXISTS review_events (
      id BIGSERIAL PRIMARY KEY,
      review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS data_centers (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS database_clusters (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS database_instances (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES database_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS database_cluster_apps (
      id BIGSERIAL PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES database_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS database_dr (
      id TEXT PRIMARY KEY,
      primary_cluster_id TEXT NOT NULL REFERENCES database_clusters(id) ON DELETE CASCADE,
      standby_cluster_id TEXT NOT NULL REFERENCES database_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS middleware_clusters (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS middleware_instances (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES middleware_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS middleware_cluster_apps (
      id BIGSERIAL PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES middleware_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tech_standards (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS drift_events (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS traffic_chains (
      domain_name TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS capabilities (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS processes (
      id TEXT PRIMARY KEY,
      capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS subject_areas (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS logical_entities (
      id TEXT PRIMARY KEY,
      subject_area_id TEXT NOT NULL REFERENCES subject_areas(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS data_objects (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      logical_entity_id TEXT REFERENCES logical_entities(id) ON DELETE SET NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tech_components (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_tech_rel (
      id BIGSERIAL PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      component_id TEXT NOT NULL REFERENCES tech_components(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS otel_services (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS otel_instances (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES otel_services(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lb_clusters (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lb_devices (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES lb_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lb_service_pools (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lb_pool_members (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES lb_service_pools(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lb_domains (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES lb_service_pools(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS machine_rooms (
      id TEXT PRIMARY KEY,
      dc_id TEXT NOT NULL REFERENCES data_centers(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS racks (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES machine_rooms(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS physical_servers (
      id TEXT PRIMARY KEY,
      rack_id TEXT NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS virtual_machines (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL REFERENCES physical_servers(id) ON DELETE CASCADE,
      dc_id TEXT NOT NULL REFERENCES data_centers(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS k8s_clusters (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS k8s_namespaces (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL REFERENCES k8s_clusters(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS containers (
      id TEXT PRIMARY KEY,
      namespace_id TEXT NOT NULL REFERENCES k8s_namespaces(id) ON DELETE CASCADE,
      vm_id TEXT REFERENCES virtual_machines(id) ON DELETE SET NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS network_zones (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS network_devices (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS physical_networks (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vips (
      id TEXT PRIMARY KEY,
      app_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS firewall_rules (
      id TEXT PRIMARY KEY,
      source_zone_id TEXT NOT NULL REFERENCES network_zones(id) ON DELETE CASCADE,
      target_zone_id TEXT NOT NULL REFERENCES network_zones(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_systems_domain_id ON systems(domain_id);
    CREATE INDEX IF NOT EXISTS idx_subsystems_system_id ON subsystems(system_id);
    CREATE INDEX IF NOT EXISTS idx_applications_subsystem_id ON applications(subsystem_id);
    CREATE INDEX IF NOT EXISTS idx_microservices_app_id ON microservices(app_id);
    CREATE INDEX IF NOT EXISTS idx_api_groups_app_id ON api_groups(app_id);
    CREATE INDEX IF NOT EXISTS idx_api_endpoints_group_id ON api_endpoints(group_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source);
    CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_review_checks_review_id ON review_checks(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_events_review_id ON review_events(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_events_created_at ON review_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_database_instances_cluster_id ON database_instances(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_database_cluster_apps_cluster_id ON database_cluster_apps(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_database_dr_primary_cluster_id ON database_dr(primary_cluster_id);
    CREATE INDEX IF NOT EXISTS idx_database_dr_standby_cluster_id ON database_dr(standby_cluster_id);
    CREATE INDEX IF NOT EXISTS idx_middleware_instances_cluster_id ON middleware_instances(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_middleware_cluster_apps_cluster_id ON middleware_cluster_apps(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_drift_events_event_type ON drift_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_capabilities_domain_id ON capabilities(domain_id);
    CREATE INDEX IF NOT EXISTS idx_processes_capability_id ON processes(capability_id);
    CREATE INDEX IF NOT EXISTS idx_logical_entities_subject_area_id ON logical_entities(subject_area_id);
    CREATE INDEX IF NOT EXISTS idx_data_objects_app_id ON data_objects(app_id);
    CREATE INDEX IF NOT EXISTS idx_data_objects_logical_entity_id ON data_objects(logical_entity_id);
    CREATE INDEX IF NOT EXISTS idx_app_tech_rel_app_id ON app_tech_rel(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_tech_rel_component_id ON app_tech_rel(component_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_app_id ON artifacts(app_id);
    CREATE INDEX IF NOT EXISTS idx_otel_services_app_id ON otel_services(app_id);
    CREATE INDEX IF NOT EXISTS idx_otel_instances_service_id ON otel_instances(service_id);
    CREATE INDEX IF NOT EXISTS idx_lb_devices_cluster_id ON lb_devices(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_lb_domains_pool_id ON lb_domains(pool_id);
    CREATE INDEX IF NOT EXISTS idx_lb_pool_members_pool_id ON lb_pool_members(pool_id);
    CREATE INDEX IF NOT EXISTS idx_machine_rooms_dc_id ON machine_rooms(dc_id);
    CREATE INDEX IF NOT EXISTS idx_racks_room_id ON racks(room_id);
    CREATE INDEX IF NOT EXISTS idx_physical_servers_rack_id ON physical_servers(rack_id);
    CREATE INDEX IF NOT EXISTS idx_virtual_machines_server_id ON virtual_machines(server_id);
    CREATE INDEX IF NOT EXISTS idx_virtual_machines_dc_id ON virtual_machines(dc_id);
    CREATE INDEX IF NOT EXISTS idx_k8s_namespaces_cluster_id ON k8s_namespaces(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_containers_namespace_id ON containers(namespace_id);
    CREATE INDEX IF NOT EXISTS idx_containers_vm_id ON containers(vm_id);
    CREATE INDEX IF NOT EXISTS idx_vips_app_id ON vips(app_id);
    CREATE INDEX IF NOT EXISTS idx_firewall_rules_source_zone_id ON firewall_rules(source_zone_id);
    CREATE INDEX IF NOT EXISTS idx_firewall_rules_target_zone_id ON firewall_rules(target_zone_id);
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
  await client.query('TRUNCATE TABLE review_events, review_checks, reviews, api_endpoints, api_groups, microservices, dependencies, dependency_nodes, data_objects, app_tech_rel, artifacts, otel_instances, otel_services, containers, k8s_namespaces, k8s_clusters, virtual_machines, physical_servers, racks, machine_rooms, lb_domains, lb_pool_members, lb_service_pools, lb_devices, lb_clusters, firewall_rules, vips, network_devices, physical_networks, network_zones, applications, subsystems, processes, capabilities, logical_entities, subject_areas, systems, domains, compliance_rules, teams, registries, data_centers, database_instances, database_cluster_apps, database_dr, database_clusters, middleware_instances, middleware_cluster_apps, middleware_clusters, tech_components, tech_standards, drift_events, traffic_chains RESTART IDENTITY CASCADE');

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

  for (const [subsystemId, apps] of Object.entries(seedData.MOCK.apps || {})) {
    for (const app of apps) {
      if (app.type === 'MICROSERVICE') {
        await client.query('INSERT INTO microservices (id, app_id, payload) VALUES ($1, $2, $3::jsonb)', [
          `ms-${app.id}`,
          app.id,
          JSON.stringify({
            microserviceId: `ms-${app.id}`,
            appId: app.id,
            serviceName: app.id,
            registerType: 'NACOS',
            status: app.status || 'RUNNING'
          })
        ]);
      }

      const publicGroupId = `ag-${app.id}-public`;
      const internalGroupId = `ag-${app.id}-internal`;
      await client.query('INSERT INTO api_groups (id, app_id, payload) VALUES ($1, $2, $3::jsonb)', [
        publicGroupId,
        app.id,
        JSON.stringify({
          groupId: publicGroupId,
          appId: app.id,
          groupName: 'Public API',
          protocol: 'REST'
        })
      ]);
      await client.query('INSERT INTO api_groups (id, app_id, payload) VALUES ($1, $2, $3::jsonb)', [
        internalGroupId,
        app.id,
        JSON.stringify({
          groupId: internalGroupId,
          appId: app.id,
          groupName: 'Internal API',
          protocol: 'REST'
        })
      ]);

      const endpoints = [
        { id: `ep-${app.id}-health`, groupId: internalGroupId, path: '/health', method: 'GET', protocol: 'HTTP', security: 'INTERNAL' },
        { id: `ep-${app.id}-query`, groupId: publicGroupId, path: '/api/query', method: 'GET', protocol: 'HTTP', security: 'JWT' },
        { id: `ep-${app.id}-create`, groupId: publicGroupId, path: '/api/create', method: 'POST', protocol: 'HTTP', security: 'JWT' },
        { id: `ep-${app.id}-update`, groupId: publicGroupId, path: '/api/update', method: 'PUT', protocol: 'HTTP', security: 'JWT' }
      ];
      for (const ep of endpoints) {
        await client.query('INSERT INTO api_endpoints (id, group_id, payload) VALUES ($1, $2, $3::jsonb)', [ep.id, ep.groupId, JSON.stringify(ep)]);
      }
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

  for (const [teamName, teamPayload] of Object.entries(seedData.TEAMS || {})) {
    const id = `team-${Buffer.from(teamName, 'utf8').toString('hex').slice(0, 24)}`;
    await client.query('INSERT INTO teams (id, payload) VALUES ($1, $2::jsonb)', [id, JSON.stringify({ id, ...teamPayload })]);
  }

  const registries = [
    {
      id: 'registry-nacos-prod',
      registryName: 'Nacos生产注册中心',
      registryType: 'NACOS',
      endpoint: 'nacos.prod.bank.com:8848',
      status: 'RUNNING'
    },
    {
      id: 'registry-k8s-dns',
      registryName: 'K8S DNS服务发现',
      registryType: 'K8S_DNS',
      endpoint: 'kube-dns.kube-system.svc',
      status: 'RUNNING'
    }
  ];
  for (const registry of registries) {
    await client.query('INSERT INTO registries (id, payload) VALUES ($1, $2::jsonb)', [registry.id, JSON.stringify(registry)]);
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
    await client.query(
      'INSERT INTO review_events (review_id, action, actor, payload, created_at) VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)',
      [
        review.id,
        'CREATED',
        'seed',
        JSON.stringify({ status: review.status, source: 'seed' }),
        `${review.date}T09:00:00Z`
      ]
    );
  }

  const depNodes = seedData.MOCK.depNodes || [];
  const pickNodeName = (idx) => (depNodes.length ? depNodes[idx % depNodes.length].name : `app-${idx + 1}`);

  for (const dc of seedData.MOCK.dataCenters || []) {
    await client.query('INSERT INTO data_centers (id, payload) VALUES ($1, $2::jsonb)', [dc.id, JSON.stringify(dc)]);
  }

  const dbClusters = seedData.MOCK.dbClusters || [];
  for (let cIdx = 0; cIdx < dbClusters.length; cIdx += 1) {
    const cluster = dbClusters[cIdx];
    await client.query('INSERT INTO database_clusters (id, payload) VALUES ($1, $2::jsonb)', [cluster.id, JSON.stringify(cluster)]);

    for (let i = 0; i < Number(cluster.instances || 0); i += 1) {
      const instancePayload = {
        instanceName: `${cluster.name}-node-${String(i + 1).padStart(2, '0')}`,
        endpoint: `10.2.${Math.floor(i / 10) + 1}.${10 + i}:33${String(i).padStart(2, '0')}`,
        role: i === 0 ? 'PRIMARY' : 'REPLICA',
        status: 'RUNNING'
      };
      const instanceId = `${cluster.id}-inst-${String(i + 1).padStart(2, '0')}`;
      await client.query('INSERT INTO database_instances (id, cluster_id, payload) VALUES ($1, $2, $3::jsonb)', [instanceId, cluster.id, JSON.stringify(instancePayload)]);
    }

    for (let i = 0; i < Number(cluster.apps || 0); i += 1) {
      const relationPayload = {
        appName: pickNodeName(cIdx * 11 + i),
        accessType: 'READ_WRITE',
        schema: 'default'
      };
      await client.query('INSERT INTO database_cluster_apps (cluster_id, payload) VALUES ($1, $2::jsonb)', [cluster.id, JSON.stringify(relationPayload)]);
    }
  }

  const dbByType = dbClusters.reduce((acc, cluster) => {
    if (!acc.has(cluster.type)) acc.set(cluster.type, []);
    acc.get(cluster.type).push(cluster.id);
    return acc;
  }, new Map());
  for (const [dbType, ids] of dbByType.entries()) {
    if (ids.length < 2) continue;
    const primaryClusterId = ids[0];
    const standbyClusterId = ids[1];
    const drPayload = {
      dbType,
      replMode: 'ASYNC',
      rpoSeconds: 60,
      rtoSeconds: 300,
      status: 'NORMAL'
    };
    await client.query(
      'INSERT INTO database_dr (id, primary_cluster_id, standby_cluster_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
      [`dr-${dbType.toLowerCase()}`, primaryClusterId, standbyClusterId, JSON.stringify(drPayload)]
    );
  }

  for (const [mwType, clusters] of Object.entries(seedData.MOCK.mwClusters || {})) {
    for (let cIdx = 0; cIdx < clusters.length; cIdx += 1) {
      const cluster = { ...clusters[cIdx], type: mwType };
      await client.query('INSERT INTO middleware_clusters (id, payload) VALUES ($1, $2::jsonb)', [cluster.id, JSON.stringify(cluster)]);

      for (let i = 0; i < Number(cluster.instances || 0); i += 1) {
        const instancePayload = {
          instanceName: `${cluster.name}-node-${String(i + 1).padStart(2, '0')}`,
          endpoint: `10.8.${Math.floor(i / 10) + 1}.${10 + i}:${mwType === 'MQ' ? 9876 : mwType === 'CACHE' ? 6379 : 9200}`,
          role: i === 0 ? 'PRIMARY' : 'REPLICA',
          status: 'RUNNING'
        };
        const instanceId = `${cluster.id}-inst-${String(i + 1).padStart(2, '0')}`;
        await client.query('INSERT INTO middleware_instances (id, cluster_id, payload) VALUES ($1, $2, $3::jsonb)', [instanceId, cluster.id, JSON.stringify(instancePayload)]);
      }

      for (let i = 0; i < Number(cluster.producers || 0); i += 1) {
        await client.query(
          'INSERT INTO middleware_cluster_apps (cluster_id, payload) VALUES ($1, $2::jsonb)',
          [cluster.id, JSON.stringify({ appName: pickNodeName(cIdx * 13 + i + 1), role: 'PRODUCER' })]
        );
      }
      for (let i = 0; i < Number(cluster.consumers || 0); i += 1) {
        await client.query(
          'INSERT INTO middleware_cluster_apps (cluster_id, payload) VALUES ($1, $2::jsonb)',
          [cluster.id, JSON.stringify({ appName: pickNodeName(cIdx * 17 + i + 11), role: 'CONSUMER' })]
        );
      }
    }
  }

  for (const standard of seedData.MOCK.techStandards || []) {
    const id = toStableId('ts', `${standard.category}-${standard.name}`);
    await client.query('INSERT INTO tech_standards (id, payload) VALUES ($1, $2::jsonb)', [id, JSON.stringify(standard)]);
  }

  const driftData = seedData.MOCK.driftData || {};
  for (const event of driftData.shadow || []) {
    await client.query('INSERT INTO drift_events (event_type, payload) VALUES ($1, $2::jsonb)', ['SHADOW_SERVICE', JSON.stringify(event)]);
  }
  for (const event of driftData.zombie || []) {
    await client.query('INSERT INTO drift_events (event_type, payload) VALUES ($1, $2::jsonb)', ['ZOMBIE_SERVICE', JSON.stringify(event)]);
  }
  for (const event of driftData.shadowDep || []) {
    await client.query('INSERT INTO drift_events (event_type, payload) VALUES ($1, $2::jsonb)', ['SHADOW_DEPENDENCY', JSON.stringify(event)]);
  }
  for (const event of driftData.zombieDep || []) {
    await client.query('INSERT INTO drift_events (event_type, payload) VALUES ($1, $2::jsonb)', ['ZOMBIE_DEPENDENCY', JSON.stringify(event)]);
  }

  for (const domain of seedData.MOCK.domains || []) {
    const capabilityId = `cap-${domain.id}-core`;
    const capabilityPayload = {
      capabilityId,
      capabilityName: `${domain.name}核心能力`,
      domainId: domain.id,
      maturityLevel: domain.health === 'good' ? 'OPTIMIZED' : 'MANAGED'
    };
    await client.query(
      'INSERT INTO capabilities (id, domain_id, payload) VALUES ($1, $2, $3::jsonb)',
      [capabilityId, domain.id, JSON.stringify(capabilityPayload)]
    );

    const processId = `proc-${domain.id}-e2e`;
    const processPayload = {
      processId,
      processName: `${domain.name}端到端流程`,
      capabilityId,
      processType: domain.priority === 'P0' ? 'CORE' : 'SUPPORT'
    };
    await client.query(
      'INSERT INTO processes (id, capability_id, payload) VALUES ($1, $2, $3::jsonb)',
      [processId, capabilityId, JSON.stringify(processPayload)]
    );
  }

  const subjectAreas = [
    { id: 'sa-customer', name: '客户', description: '客户主数据与客户关系信息' },
    { id: 'sa-product', name: '产品', description: '银行产品与服务目录信息' },
    { id: 'sa-trade', name: '交易', description: '交易、账务与流水信息' }
  ];
  for (const area of subjectAreas) {
    await client.query('INSERT INTO subject_areas (id, payload) VALUES ($1, $2::jsonb)', [area.id, JSON.stringify(area)]);
  }

  const logicalEntities = [
    { id: 'le-customer-profile', subjectAreaId: 'sa-customer', name: '客户画像', entityType: 'MASTER' },
    { id: 'le-customer-account', subjectAreaId: 'sa-customer', name: '客户账户', entityType: 'MASTER' },
    { id: 'le-product-catalog', subjectAreaId: 'sa-product', name: '产品目录', entityType: 'REFERENCE' },
    { id: 'le-pricing-rule', subjectAreaId: 'sa-product', name: '定价规则', entityType: 'REFERENCE' },
    { id: 'le-transaction-ledger', subjectAreaId: 'sa-trade', name: '交易总账', entityType: 'TRANSACTIONAL' },
    { id: 'le-payment-order', subjectAreaId: 'sa-trade', name: '支付指令', entityType: 'TRANSACTIONAL' }
  ];
  for (const entity of logicalEntities) {
    await client.query(
      'INSERT INTO logical_entities (id, subject_area_id, payload) VALUES ($1, $2, $3::jsonb)',
      [entity.id, entity.subjectAreaId, JSON.stringify(entity)]
    );
  }

  const components = new Map();
  for (const standard of seedData.MOCK.techStandards || []) {
    const componentId = `comp-${toStableId('k', standard.name).replace(/^k-/, '')}`;
    const componentType = standard.category === '数据库'
      ? 'DATABASE'
      : standard.category === '缓存'
        ? 'CACHE'
      : standard.category === '消息'
        ? 'MQ'
        : standard.category === '前端'
          ? 'OTHER'
          : 'OTHER';
    components.set(componentId, {
      id: componentId,
      componentType,
      productName: standard.name,
      lifecycle: standard.lifecycle
    });
  }
  for (const cluster of seedData.MOCK.dbClusters || []) {
    const componentId = `comp-db-${toStableId('t', cluster.type).replace(/^t-/, '')}`;
    components.set(componentId, {
      id: componentId,
      componentType: 'DATABASE',
      productName: cluster.type,
      lifecycle: cluster.dr === 'none' ? 'DEPRECATED' : 'RECOMMENDED'
    });
  }
  for (const clusters of Object.values(seedData.MOCK.mwClusters || {})) {
    for (const cluster of clusters) {
      const componentId = `comp-mw-${toStableId('p', cluster.product).replace(/^p-/, '')}`;
      components.set(componentId, {
        id: componentId,
        componentType: ['Redis'].includes(cluster.product) ? 'CACHE' : cluster.product.includes('MQ') ? 'MQ' : 'OTHER',
        productName: cluster.product,
        lifecycle: cluster.health === 'healthy' ? 'RECOMMENDED' : 'ALLOWED'
      });
    }
  }
  for (const component of components.values()) {
    await client.query('INSERT INTO tech_components (id, payload) VALUES ($1, $2::jsonb)', [component.id, JSON.stringify(component)]);
  }

  const subsystemToSystem = {};
  for (const [systemId, subsystems] of Object.entries(seedData.MOCK.subsystems || {})) {
    for (const subsystem of subsystems) subsystemToSystem[subsystem.id] = systemId;
  }
  const systemById = {};
  for (const systems of Object.values(seedData.MOCK.systems || {})) {
    for (const system of systems) systemById[system.id] = system;
  }
  const allApps = [];
  for (const [subsystemId, apps] of Object.entries(seedData.MOCK.apps || {})) {
    for (const app of apps) allApps.push({ ...app, subsystemId, systemId: subsystemToSystem[subsystemId] });
  }

  for (let idx = 0; idx < allApps.length; idx += 1) {
    const app = allApps[idx];
    const artifactType = app.type === 'SPA' ? 'NPM_PACKAGE' : app.type === 'BATCH' ? 'JAR' : 'DOCKER_IMAGE';
    const artifactPayload = {
      artifactId: `art-${app.id}`,
      appId: app.id,
      artifactType,
      version: `2026.02.${String((idx % 28) + 1).padStart(2, '0')}`,
      registryUrl: `harbor.bank.com/${app.id}`,
      buildPipelineId: `pipe-${app.id}`
    };
    await client.query('INSERT INTO artifacts (id, app_id, payload) VALUES ($1, $2, $3::jsonb)', [
      artifactPayload.artifactId,
      app.id,
      JSON.stringify(artifactPayload)
    ]);

    const servicePayload = {
      serviceName: app.id,
      appId: app.id,
      serviceNamespace: app.systemId || 'unknown',
      serviceVersion: artifactPayload.version,
      discoveredAt: '2026-02-10'
    };
    await client.query('INSERT INTO otel_services (id, app_id, payload) VALUES ($1, $2, $3::jsonb)', [app.id, app.id, JSON.stringify(servicePayload)]);
    for (let i = 0; i < 2; i += 1) {
      const instancePayload = {
        instanceId: `${app.id}-inst-${i + 1}`,
        serviceName: app.id,
        hostName: `node-${(idx % 8) + 1}`,
        k8sPodName: `${app.id}-${String(i + 1).padStart(2, '0')}`,
        status: app.status || 'RUNNING',
        lastSeenAt: '2026-02-14T07:00:00Z'
      };
      await client.query('INSERT INTO otel_instances (id, service_id, payload) VALUES ($1, $2, $3::jsonb)', [
        instancePayload.instanceId,
        app.id,
        JSON.stringify(instancePayload)
      ]);
    }

    const systemTechStack = systemById[app.systemId]?.techStack || '';
    const candidateComponents = Array.from(components.values()).filter((comp) => systemTechStack.includes(comp.productName));
    const selected = candidateComponents.length ? candidateComponents.slice(0, 3) : Array.from(components.values()).slice(idx % 5, (idx % 5) + 2);
    for (const component of selected) {
      await client.query(
        'INSERT INTO app_tech_rel (app_id, component_id, payload) VALUES ($1, $2, $3::jsonb)',
        [app.id, component.id, JSON.stringify({ appId: app.id, componentId: component.id, usageType: 'RUNTIME_DEP' })]
      );
    }

    const logicalEntity = logicalEntities[idx % logicalEntities.length];
    const dataObjPayload = {
      dataObjectId: `do-${app.id}`,
      appId: app.id,
      logicalEntityId: logicalEntity.id,
      objectName: `${app.name}-主数据`,
      storageType: app.type === 'BATCH' ? 'FILE' : 'TABLE',
      criticality: ['A', 'B'].includes(app.classification) ? 'HIGH' : 'MEDIUM'
    };
    await client.query(
      'INSERT INTO data_objects (id, app_id, logical_entity_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
      [dataObjPayload.dataObjectId, app.id, logicalEntity.id, JSON.stringify(dataObjPayload)]
    );
  }

  const lbCluster = {
    id: 'lb-cluster-prod',
    clusterName: '生产LB集群',
    clusterType: 'LOCAL',
    dc: '新数据中心'
  };
  await client.query('INSERT INTO lb_clusters (id, payload) VALUES ($1, $2::jsonb)', [lbCluster.id, JSON.stringify(lbCluster)]);
  await client.query('INSERT INTO lb_devices (id, cluster_id, payload) VALUES ($1, $2, $3::jsonb)', [
    'lb-device-f5-prod-01',
    lbCluster.id,
    JSON.stringify({
      deviceId: 'lb-device-f5-prod-01',
      deviceName: 'F5-PROD-01',
      deviceType: 'HARDWARE',
      productName: 'F5 BIG-IP'
    })
  ]);

  const chainDomains = ['card-api.bank.com', 'loan-api.bank.com', 'openapi.bank.com'];
  for (let i = 0; i < chainDomains.length; i += 1) {
    const domainName = chainDomains[i];
    const poolId = `lb-pool-${i + 1}`;
    const baseChain = buildTrafficChain(domainName);
    await client.query('INSERT INTO lb_service_pools (id, payload) VALUES ($1, $2::jsonb)', [
      poolId,
      JSON.stringify({
        poolId,
        poolName: baseChain.pool,
        vip: baseChain.vip,
        lbAlgorithm: 'ROUND_ROBIN',
        healthCheckType: 'HTTP',
        healthCheckPath: '/health'
      })
    ]);
    for (let j = 0; j < baseChain.backends.length; j += 1) {
      const backend = baseChain.backends[j];
      await client.query('INSERT INTO lb_pool_members (id, pool_id, payload) VALUES ($1, $2, $3::jsonb)', [
        `${poolId}-member-${j + 1}`,
        poolId,
        JSON.stringify({
          endpoint: backend.endpoint,
          app: backend.app,
          status: backend.status,
          weight: 100
        })
      ]);
    }
    await client.query('INSERT INTO lb_domains (id, pool_id, payload) VALUES ($1, $2, $3::jsonb)', [
      `lb-domain-${i + 1}`,
      poolId,
      JSON.stringify({
        domainId: `lb-domain-${i + 1}`,
        domainName,
        domainType: 'INTERNAL',
        vip: baseChain.vip,
        sslCertExpire: baseChain.ssl.expireDate,
        lbDevice: baseChain.lbDevice
      })
    ]);
    await client.query(
      'INSERT INTO traffic_chains (domain_name, payload) VALUES ($1, $2::jsonb)',
      [domainName, JSON.stringify(buildTrafficChain(domainName))]
    );
  }

  const zoneDefs = [
    { id: 'zone-dmz', zoneName: 'DMZ区', zoneLevel: 'DMZ' },
    { id: 'zone-intra', zoneName: '内网业务区', zoneLevel: 'INTRANET' },
    { id: 'zone-core', zoneName: '核心数据区', zoneLevel: 'CORE' },
    { id: 'zone-mgt', zoneName: '管理区', zoneLevel: 'MGT' }
  ];
  for (const zone of zoneDefs) {
    await client.query('INSERT INTO network_zones (id, payload) VALUES ($1, $2::jsonb)', [zone.id, JSON.stringify(zone)]);
  }

  const networkDefs = [
    { id: 'pnet-core', networkName: '核心业务VLAN', networkType: 'VLAN', cidr: '10.2.0.0/16' },
    { id: 'pnet-platform', networkName: '平台服务VLAN', networkType: 'VLAN', cidr: '10.8.0.0/16' },
    { id: 'pnet-mgt', networkName: '管理网络', networkType: 'VPC', cidr: '10.10.0.0/16' }
  ];
  for (const pnet of networkDefs) {
    await client.query('INSERT INTO physical_networks (id, payload) VALUES ($1, $2::jsonb)', [pnet.id, JSON.stringify(pnet)]);
  }

  const networkDevices = [
    { id: 'nd-fw-01', deviceType: 'FW', deviceName: 'FW-PROD-01' },
    { id: 'nd-sw-01', deviceType: 'SWITCH', deviceName: 'SW-CORE-01' },
    { id: 'nd-lb-01', deviceType: 'LB', deviceName: 'F5-PROD-01' }
  ];
  for (const nd of networkDevices) {
    await client.query('INSERT INTO network_devices (id, payload) VALUES ($1, $2::jsonb)', [nd.id, JSON.stringify(nd)]);
  }

  await client.query(
    'INSERT INTO firewall_rules (id, source_zone_id, target_zone_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
    ['fw-rule-001', 'zone-dmz', 'zone-intra', JSON.stringify({
      ruleId: 'fw-rule-001',
      sourceZoneId: 'zone-dmz',
      targetZoneId: 'zone-intra',
      protocol: 'HTTPS',
      port: 443,
      action: 'ALLOW'
    })]
  );
  await client.query(
    'INSERT INTO firewall_rules (id, source_zone_id, target_zone_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
    ['fw-rule-002', 'zone-intra', 'zone-core', JSON.stringify({
      ruleId: 'fw-rule-002',
      sourceZoneId: 'zone-intra',
      targetZoneId: 'zone-core',
      protocol: 'TCP',
      port: 3306,
      action: 'ALLOW'
    })]
  );

  const dcRows = seedData.MOCK.dataCenters || [];
  const vmIds = [];
  for (let i = 0; i < dcRows.length; i += 1) {
    const dc = dcRows[i];
    const roomId = `room-${dc.id}`;
    await client.query(
      'INSERT INTO machine_rooms (id, dc_id, payload) VALUES ($1, $2, $3::jsonb)',
      [roomId, dc.id, JSON.stringify({ roomId, dcId: dc.id, roomName: `${dc.name}-机房A` })]
    );

    for (let r = 0; r < 2; r += 1) {
      const rackId = `rack-${dc.id}-${r + 1}`;
      await client.query(
        'INSERT INTO racks (id, room_id, payload) VALUES ($1, $2, $3::jsonb)',
        [rackId, roomId, JSON.stringify({ rackId, roomId, rackName: `${dc.name}-R${r + 1}` })]
      );

      for (let s = 0; s < 2; s += 1) {
        const serverId = `srv-${dc.id}-${r + 1}-${s + 1}`;
        await client.query(
          'INSERT INTO physical_servers (id, rack_id, payload) VALUES ($1, $2, $3::jsonb)',
          [serverId, rackId, JSON.stringify({
            serverId,
            rackId,
            serialNumber: `SN-${dc.id}-${r + 1}${s + 1}`,
            osType: 'LINUX'
          })]
        );

        for (let v = 0; v < 2; v += 1) {
          const vmId = `vm-${dc.id}-${r + 1}-${s + 1}-${v + 1}`;
          vmIds.push(vmId);
          await client.query(
            'INSERT INTO virtual_machines (id, server_id, dc_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
            [vmId, serverId, dc.id, JSON.stringify({
              vmId,
              serverId,
              dcId: dc.id,
              ipAddress: `10.${i + 2}.${r + 1}.${(s * 10) + v + 11}`,
              osType: 'LINUX',
              osDistribution: 'RHEL 8.6'
            })]
          );
        }
      }
    }
  }

  const k8sClusterDefs = [
    { id: 'k8s-prod-core', clusterName: '生产核心K8S集群' },
    { id: 'k8s-prod-platform', clusterName: '生产平台K8S集群' }
  ];
  for (const kc of k8sClusterDefs) {
    await client.query('INSERT INTO k8s_clusters (id, payload) VALUES ($1, $2::jsonb)', [kc.id, JSON.stringify(kc)]);
  }

  const namespaces = [
    { id: 'ns-retail', clusterId: 'k8s-prod-core', namespaceName: 'retail-prod' },
    { id: 'ns-corp', clusterId: 'k8s-prod-core', namespaceName: 'corp-prod' },
    { id: 'ns-platform', clusterId: 'k8s-prod-platform', namespaceName: 'platform-prod' }
  ];
  for (const ns of namespaces) {
    await client.query(
      'INSERT INTO k8s_namespaces (id, cluster_id, payload) VALUES ($1, $2, $3::jsonb)',
      [ns.id, ns.clusterId, JSON.stringify(ns)]
    );
  }

  let containerSeq = 1;
  for (const app of allApps.slice(0, 18)) {
    const ns = app.systemId === 'gateway-sys' || app.systemId === 'devops' || app.systemId === 'monitor' ? 'ns-platform' : (app.systemId === 'core-bank' ? 'ns-corp' : 'ns-retail');
    const vmId = vmIds[containerSeq % vmIds.length] || null;
    const containerId = `ctr-${app.id}-${String(containerSeq).padStart(3, '0')}`;
    containerSeq += 1;
    await client.query(
      'INSERT INTO containers (id, namespace_id, vm_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
      [containerId, ns, vmId, JSON.stringify({
        containerId,
        namespaceId: ns,
        vmId,
        podName: `${app.id}-pod-01`,
        status: app.status || 'RUNNING'
      })]
    );
  }

  for (let i = 0; i < allApps.slice(0, 8).length; i += 1) {
    const app = allApps[i];
    await client.query(
      'INSERT INTO vips (id, app_id, payload) VALUES ($1, $2, $3::jsonb)',
      [`vip-${app.id}`, app.id, JSON.stringify({
        vipId: `vip-${app.id}`,
        appId: app.id,
        vipAddress: `10.1.${Math.floor(i / 250) + 1}.${100 + i}`
      })]
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

async function loadSectionsPayload(queryable = pool) {
  const { rows } = await queryable.query('SELECT section, payload FROM mock_sections');
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

async function loadSectionPayload(section, queryable = pool) {
  const { rows } = await queryable.query('SELECT payload FROM mock_sections WHERE section = $1', [section]);
  if (!rows.length) {
    throw new Error(`Section '${section}' not found in database`);
  }
  return rows[0].payload;
}

async function upsertMockSection(client, section, payload) {
  await client.query(
    `
    INSERT INTO mock_sections (section, payload, updated_at)
    VALUES ($1, $2::jsonb, now())
    ON CONFLICT (section)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    `,
    [section, JSON.stringify(payload)]
  );
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const output = await work(client);
    await client.query('COMMIT');
    return output;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function normalizeRuleInput(raw, fallbackId) {
  const ruleId = String(raw?.id || fallbackId || '').trim();
  const name = String(raw?.name || '').trim();
  const level = String(raw?.level || '').trim().toUpperCase();
  const checkMethod = String(raw?.checkMethod || '').trim();
  const description = String(raw?.description || '').trim();
  const checkScript = raw?.checkScript == null ? '' : String(raw.checkScript);

  if (!ruleId) throw new HttpError(400, 'rule.id is required');
  if (!name) throw new HttpError(400, 'rule.name is required');
  if (!['CRITICAL', 'MAJOR', 'MINOR'].includes(level)) {
    throw new HttpError(400, "rule.level must be one of: CRITICAL, MAJOR, MINOR");
  }
  if (!['评审', '测试', '巡检'].includes(checkMethod)) {
    throw new HttpError(400, "rule.checkMethod must be one of: 评审, 测试, 巡检");
  }
  if (!description) throw new HttpError(400, 'rule.description is required');
  return {
    id: ruleId,
    name,
    level,
    checkMethod,
    description,
    checkScript
  };
}

function normalizeComplianceRuleInput(raw, fallbackId) {
  const normalized = normalizeRuleInput(
    {
      id: raw?.ruleId || raw?.id || fallbackId,
      name: raw?.name,
      level: raw?.level || raw?.severity,
      checkMethod: raw?.checkMethod,
      description: raw?.description || raw?.message,
      checkScript: raw?.checkScript
    },
    fallbackId
  );
  return {
    ruleId: normalized.id,
    payload: normalized
  };
}

function normalizeStandardInput(raw, fallbackId) {
  const standardId = String(raw?.id || fallbackId || '').trim();
  const name = String(raw?.name || '').trim();
  const code = String(raw?.code || '').trim();
  const category = String(raw?.category || '').trim();
  const version = String(raw?.version || '').trim();
  const status = String(raw?.status || '').trim().toUpperCase();
  const owner = String(raw?.owner || '').trim();
  const approver = String(raw?.approver || '').trim();
  const description = String(raw?.description || '').trim();
  const icon = String(raw?.icon || '').trim();
  const publishDate = String(raw?.publishDate || '').trim();
  const effectiveDate = String(raw?.effectiveDate || '').trim();
  const chapters = Array.isArray(raw?.chapters) ? raw.chapters : [];
  const rules = Array.isArray(raw?.rules) ? raw.rules : [];

  if (!standardId) throw new HttpError(400, 'standard.id is required');
  if (!name) throw new HttpError(400, 'standard.name is required');
  if (!code) throw new HttpError(400, 'standard.code is required');
  if (!category) throw new HttpError(400, 'standard.category is required');
  if (!version) throw new HttpError(400, 'standard.version is required');
  if (!['EFFECTIVE', 'DRAFT'].includes(status)) {
    throw new HttpError(400, "standard.status must be one of: EFFECTIVE, DRAFT");
  }
  if (!owner) throw new HttpError(400, 'standard.owner is required');
  if (!approver) throw new HttpError(400, 'standard.approver is required');
  if (!description) throw new HttpError(400, 'standard.description is required');
  if (!icon) throw new HttpError(400, 'standard.icon is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) throw new HttpError(400, 'standard.publishDate must be YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new HttpError(400, 'standard.effectiveDate must be YYYY-MM-DD');

  const normalizedChapters = chapters.map((chapter, idx) => {
    const title = String(chapter?.title || '').trim();
    const content = String(chapter?.content || '').trim();
    if (!title) throw new HttpError(400, `standard.chapters[${idx}].title is required`);
    if (!content) throw new HttpError(400, `standard.chapters[${idx}].content is required`);
    return { title, content };
  });

  const normalizedRules = rules.map((rule, idx) => normalizeRuleInput(rule, `R-${idx + 1}`));
  return {
    id: standardId,
    name,
    code,
    category,
    version,
    status,
    owner,
    approver,
    description,
    icon,
    publishDate,
    effectiveDate,
    chapters: normalizedChapters,
    rules: normalizedRules
  };
}

function buildRuleStdMap(standards) {
  const out = {};
  for (const standard of standards) {
    for (const rule of standard.rules || []) {
      out[rule.id] = {
        stdId: standard.id,
        stdName: standard.name,
        rule
      };
    }
  }
  return out;
}

function listUniqueRulesByFirstSeen(standards) {
  const out = [];
  const seen = new Set();
  for (const standard of standards) {
    for (const rule of standard.rules || []) {
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      out.push({
        ruleId: rule.id,
        payload: {
          ...rule,
          stdId: standard.id,
          stdName: standard.name
        }
      });
    }
  }
  return out;
}

async function persistStandardsState(client, standards) {
  const ruleMap = buildRuleStdMap(standards);
  await upsertMockSection(client, 'ARCH_STANDARDS', standards);
  await upsertMockSection(client, 'RULE_STD_MAP', ruleMap);

  const uniqueRules = listUniqueRulesByFirstSeen(standards);
  await client.query('DELETE FROM compliance_rules');
  for (const item of uniqueRules) {
    await client.query(
      'INSERT INTO compliance_rules (rule_id, payload, updated_at) VALUES ($1, $2::jsonb, now())',
      [item.ruleId, JSON.stringify(item.payload)]
    );
  }
}

function normalizeTechComponentInput(raw, fallbackId) {
  const id = String(raw?.id || raw?.componentId || fallbackId || '').trim();
  const productName = String(raw?.productName || raw?.name || '').trim();
  const category = String(raw?.category || '').trim();
  const lifecycle = String(raw?.lifecycle || '').trim().toUpperCase();
  const version = String(raw?.version || '').trim();
  const vendor = String(raw?.vendor || '').trim();
  const status = raw?.status == null ? 'ACTIVE' : String(raw.status).trim().toUpperCase();
  const owners = Array.isArray(raw?.owners)
    ? raw.owners.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (!id) throw new HttpError(400, 'tech component id is required');
  if (!productName) throw new HttpError(400, 'tech component productName is required');
  if (!category) throw new HttpError(400, 'tech component category is required');
  if (!['RECOMMENDED', 'ALLOWED', 'DEPRECATED', 'FORBIDDEN'].includes(lifecycle)) {
    throw new HttpError(400, 'tech component lifecycle must be one of: RECOMMENDED, ALLOWED, DEPRECATED, FORBIDDEN');
  }
  if (!version) throw new HttpError(400, 'tech component version is required');
  if (!vendor) throw new HttpError(400, 'tech component vendor is required');
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new HttpError(400, 'tech component status must be one of: ACTIVE, INACTIVE');
  }

  return {
    id,
    productName,
    category,
    lifecycle,
    version,
    vendor,
    status,
    owners,
    tags
  };
}

function normalizeAppProfilePatch(raw) {
  const allowed = new Set(['name', 'type', 'status', 'owner', 'gitRepo', 'tags', 'classification', 'securityLevel', 'dataLevel']);
  const updates = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (!allowed.has(key)) {
      throw new HttpError(400, `unsupported profile field '${key}'`);
    }
    updates[key] = value;
  }

  if (!Object.keys(updates).length) {
    throw new HttpError(400, 'no profile fields to update');
  }

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim();
    if (!updates.name) throw new HttpError(400, 'name cannot be empty');
  }
  if (updates.type !== undefined) {
    updates.type = String(updates.type).trim().toUpperCase();
    if (!['MICROSERVICE', 'MONOLITH', 'SPA', 'BATCH'].includes(updates.type)) {
      throw new HttpError(400, 'type must be one of: MICROSERVICE, MONOLITH, SPA, BATCH');
    }
  }
  if (updates.status !== undefined) {
    updates.status = String(updates.status).trim().toUpperCase();
    if (!['RUNNING', 'BUILDING', 'PLANNING', 'OFFLINE', 'RETIRED'].includes(updates.status)) {
      throw new HttpError(400, 'status must be one of: RUNNING, BUILDING, PLANNING, OFFLINE, RETIRED');
    }
  }
  if (updates.owner !== undefined) {
    updates.owner = String(updates.owner).trim();
    if (!updates.owner) throw new HttpError(400, 'owner cannot be empty');
  }
  if (updates.gitRepo !== undefined) {
    updates.gitRepo = String(updates.gitRepo).trim();
  }
  if (updates.tags !== undefined) {
    if (!Array.isArray(updates.tags)) throw new HttpError(400, 'tags must be an array');
    updates.tags = updates.tags.map((x) => String(x).trim()).filter(Boolean);
  }
  if (updates.classification !== undefined) {
    updates.classification = String(updates.classification).trim().toUpperCase();
    if (!['A', 'B', 'C'].includes(updates.classification)) throw new HttpError(400, 'classification must be one of: A, B, C');
  }
  if (updates.securityLevel !== undefined) {
    updates.securityLevel = String(updates.securityLevel).trim().toUpperCase();
    if (!['S1', 'S2', 'S3'].includes(updates.securityLevel)) throw new HttpError(400, 'securityLevel must be one of: S1, S2, S3');
  }
  if (updates.dataLevel !== undefined) {
    updates.dataLevel = String(updates.dataLevel).trim().toUpperCase();
    if (!['L1', 'L2', 'L3'].includes(updates.dataLevel)) throw new HttpError(400, 'dataLevel must be one of: L1, L2, L3');
  }

  return updates;
}

function parseCsv(rawValue) {
  if (!rawValue) return [];
  return rawValue
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function getByPath(source, pathExpr) {
  return pathExpr.split('.').reduce((acc, key) => {
    if (acc == null || typeof acc !== 'object' || !Object.prototype.hasOwnProperty.call(acc, key)) return undefined;
    return acc[key];
  }, source);
}

function setByPath(target, pathExpr, value) {
  const keys = pathExpr.split('.');
  let ptr = target;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (i === keys.length - 1) {
      ptr[key] = value;
      return;
    }
    if (!ptr[key] || typeof ptr[key] !== 'object') ptr[key] = {};
    ptr = ptr[key];
  }
}

function projectObject(obj, fields) {
  if (!fields || !fields.length || obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const field of fields) {
    const value = getByPath(obj, field);
    if (value !== undefined) {
      setByPath(out, field, value);
    }
  }
  return out;
}

function projectData(data, fields) {
  if (!fields || !fields.length) return data;
  if (Array.isArray(data)) return data.map((item) => projectObject(item, fields));
  return projectObject(data, fields);
}

function resolveProjectionFields(url, presetMap) {
  const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
  if (!Object.prototype.hasOwnProperty.call(presetMap, projection)) {
    throw new HttpError(400, `unsupported projection '${projection}'`);
  }
  const fields = parseCsv(url.searchParams.get('fields'));
  if (fields.length) return fields;
  return presetMap[projection];
}

function parseDateFilter(dateText, fieldName) {
  if (!dateText) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new HttpError(400, `invalid ${fieldName}, expected YYYY-MM-DD`);
  }
  return dateText;
}

function headerValue(req, name) {
  const raw = req.headers?.[name];
  if (Array.isArray(raw)) return raw[0] || '';
  return raw || '';
}

function normalizeActor(rawActor) {
  const rawText = String(rawActor || '').trim();
  let actor = rawText;
  if (rawText.includes('%')) {
    try {
      actor = decodeURIComponent(rawText);
    } catch {
      actor = rawText;
    }
  }
  if (!actor) return 'system';
  return actor.slice(0, 64);
}

function normalizeRole(rawRole) {
  const role = String(rawRole || '').trim().toUpperCase();
  if (!role) return 'ARCHITECT';
  const allowed = new Set(['APPLICANT', 'REVIEWER', 'ARCHITECT', 'ADMIN', 'SYSTEM']);
  if (!allowed.has(role)) return 'ARCHITECT';
  return role;
}

function resolveActor(req, url, body = null) {
  return normalizeActor(
    body?.actor
    || url.searchParams.get('actor')
    || headerValue(req, 'x-user')
    || headerValue(req, 'x-actor')
  );
}

function resolveRole(req, url, body = null) {
  return normalizeRole(
    body?.role
    || url.searchParams.get('role')
    || headerValue(req, 'x-role')
  );
}

function resolveActorContext(req, url, body = null) {
  return {
    actor: resolveActor(req, url, body),
    role: resolveRole(req, url, body)
  };
}

function assertReviewStatusAllowed(currentStatus, allowedStatuses, actionName) {
  if (!Array.isArray(allowedStatuses) || !allowedStatuses.length) return;
  if (!allowedStatuses.includes(currentStatus)) {
    throw new HttpError(409, `review status '${currentStatus}' cannot ${actionName}`);
  }
}

function isReviewApplicant(review, actor) {
  const applicant = String(review?.applicant || '').trim();
  if (!applicant) return false;
  return applicant === String(actor || '').trim();
}

function assertReviewPermission(action, review, context) {
  const role = normalizeRole(context?.role);
  const actor = normalizeActor(context?.actor);
  const elevated = role === 'ARCHITECT' || role === 'ADMIN';
  const reviewer = role === 'REVIEWER';
  const applicant = isReviewApplicant(review, actor);

  if (action === 'SUBMITTED' || action === 'RESUBMITTED') {
    if (applicant || elevated) return;
    throw new HttpError(403, `actor '${actor}' (role=${role}) cannot ${action.toLowerCase()} review '${review.id}'`);
  }

  if (action === 'CHECKS_RERUN') {
    if (applicant || elevated || reviewer) return;
    throw new HttpError(403, `actor '${actor}' (role=${role}) cannot rerun checks for review '${review.id}'`);
  }

  if (action === 'APPROVED' || action === 'REJECTED') {
    if (elevated || reviewer) return;
    throw new HttpError(403, `actor '${actor}' (role=${role}) cannot ${action === 'APPROVED' ? 'approve' : 'reject'} review '${review.id}'`);
  }
}

function toStableId(prefix, text) {
  return `${prefix}-${String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item'}`;
}

function splitDataCenters(text) {
  return String(text || '')
    .split(/[+,，、]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeDrValidationFromSystems(allSystems) {
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

async function listReviews(filters = {}) {
  const params = [];
  let sql = `
    SELECT id, title, type, system, level, applicant,
      to_char(review_date, 'YYYY-MM-DD') AS review_date,
      status
    FROM reviews
  `;
  const conditions = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.applicant) {
    params.push(filters.applicant);
    conditions.push(`applicant = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`type = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`review_date >= $${params.length}::date`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`review_date <= $${params.length}::date`);
  }

  if (conditions.length) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
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

async function getEntityCoverage() {
  const details = [];
  for (const tableName of ENTITY_TABLES) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${tableName}`);
    details.push({ table: tableName, rows: rows[0].n });
  }
  const nonEmptyCount = details.filter((d) => d.rows > 0).length;
  const mappedEntityCount = nonEmptyCount;
  const coverage = Number(((mappedEntityCount / ENTITY_TABLES.length) * 100).toFixed(1));
  return {
    targetEntities: ENTITY_TABLES.length,
    mappedEntities: mappedEntityCount,
    coveragePct: coverage,
    nonEmptyTables: nonEmptyCount,
    tableCount: ENTITY_TABLES.length,
    details
  };
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

function summarizeReviewChecks(checks) {
  return {
    total: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: checks.filter((c) => !c.passed).length
  };
}

async function loadReviewRowOrThrow(reviewId, queryable = pool) {
  const result = await queryable.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
  if (!result.rows.length) throw new HttpError(404, 'review not found');
  return result.rows[0];
}

async function replaceReviewChecks(client, reviewId, checks) {
  await client.query('DELETE FROM review_checks WHERE review_id = $1', [reviewId]);
  for (const check of checks) {
    await client.query(
      'INSERT INTO review_checks (review_id, rule_id, passed, severity, message) VALUES ($1, $2, $3, $4, $5)',
      [reviewId, check.ruleId, check.passed, check.severity, check.message]
    );
  }
}

async function appendReviewEvent(queryable, reviewId, action, payload = {}, actor = 'system') {
  await queryable.query(
    'INSERT INTO review_events (review_id, action, actor, payload) VALUES ($1, $2, $3, $4::jsonb)',
    [reviewId, action, actor, JSON.stringify(payload || {})]
  );
}

async function runReviewCompliance(reviewId, options = {}) {
  const {
    updateStatus = true,
    allowedStatuses = null,
    action = null,
    actor = 'system',
    role = 'SYSTEM'
  } = options;
  const review = await loadReviewRowOrThrow(reviewId);

  assertReviewStatusAllowed(review.status, allowedStatuses, 'run this action');
  if (action) {
    assertReviewPermission(action, review, { actor, role });
  }

  const checks = await evaluateCompliance(review);
  const hasCriticalFail = checks.some((c) => !c.passed && c.severity === 'CRITICAL');
  const nextStatus = updateStatus ? (hasCriticalFail ? 'DRAFT' : 'REVIEWING') : review.status;
  const summary = summarizeReviewChecks(checks);

  await withTransaction(async (client) => {
    await replaceReviewChecks(client, reviewId, checks);
    if (updateStatus) {
      await client.query('UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1', [reviewId, nextStatus]);
    } else {
      await client.query('UPDATE reviews SET updated_at = now() WHERE id = $1', [reviewId]);
    }
    if (action) {
      await appendReviewEvent(client, reviewId, action, {
        previousStatus: review.status,
        status: nextStatus,
        blocked: hasCriticalFail,
        summary,
        actorRole: normalizeRole(role)
      }, actor);
    }
  });

  return {
    reviewId,
    previousStatus: review.status,
    status: nextStatus,
    blocked: hasCriticalFail,
    summary,
    checks
  };
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
        const isNoStoreAsset = pathname === '/data.js' || pathname === '/app.js';
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': isNoStoreAsset ? 'no-store' : 'public, max-age=300'
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
  if (req.method === 'GET' && url.pathname === '/api/v1/meta/version') {
    sendJson(res, 200, {
      version: API_VERSION,
      revision: APP_REVISION,
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/meta/entity-coverage') {
    const coverage = await getEntityCoverage();
    sendJson(res, 200, coverage);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/bootstrap') {
    const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
    if (!Object.prototype.hasOwnProperty.call(BOOTSTRAP_PROJECTIONS, projection)) {
      throw new HttpError(400, `unsupported projection '${projection}'`);
    }

    const sectionsFromQuery = parseCsv(url.searchParams.get('sections'));
    const requestedSections = sectionsFromQuery.length ? sectionsFromQuery : BOOTSTRAP_PROJECTIONS[projection];
    const invalidSection = requestedSections.find((section) => !REQUIRED_SECTIONS.includes(section));
    if (invalidSection) {
      throw new HttpError(400, `unsupported section '${invalidSection}'`);
    }

    const allPayload = await loadSectionsPayload();
    const payload = {};
    for (const section of requestedSections) {
      if (section === 'MOCK') payload.MOCK = { ...(allPayload.MOCK || {}) };
      else payload[section] = allPayload[section];
    }

    if (payload.MOCK) {
      const reviewStatus = url.searchParams.get('review_status');
      const liveReviews = await listReviews({ status: reviewStatus || undefined });
      payload.MOCK.reviews = liveReviews;
    }

    sendJson(res, 200, payload);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/domains') {
    const health = url.searchParams.get('health');
    const priority = url.searchParams.get('priority');
    const fields = resolveProjectionFields(url, DOMAIN_PROJECTIONS);
    const { rows } = await pool.query('SELECT payload FROM domains ORDER BY payload->>\'name\'');
    let data = rows.map((row) => row.payload);
    if (health) data = data.filter((d) => d.health === health);
    if (priority) data = data.filter((d) => d.priority === priority);
    sendJson(res, 200, projectData(data, fields));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/dependency-graph') {
    const domainId = url.searchParams.get('domain_id');
    const focusApp = url.searchParams.get('app_id');
    const depth = Number.parseInt(url.searchParams.get('depth') || '0', 10);

    const [nodeRes, edgeRes] = await Promise.all([
      pool.query('SELECT payload FROM dependency_nodes ORDER BY id'),
      pool.query('SELECT payload FROM dependencies ORDER BY id')
    ]);
    let nodes = nodeRes.rows.map((row) => row.payload);
    let edges = edgeRes.rows.map((row) => row.payload);
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
    const depsRes = await pool.query('SELECT payload FROM dependencies ORDER BY id');
    const deps = depsRes.rows.map((row) => row.payload);
    const upstream = bfsNeighbors(appId, deps, depth, 'upstream');
    const downstream = bfsNeighbors(appId, deps, depth, 'downstream');
    sendJson(res, 200, { appId, changeType, depth, upstream, downstream });
    return true;
  }

  const domainSystemsMatch = url.pathname.match(/^\/api\/v1\/panorama\/domains\/([^/]+)\/systems$/);
  if (req.method === 'GET' && domainSystemsMatch) {
    const domainId = decodeURIComponent(domainSystemsMatch[1]);
    const level = url.searchParams.get('level');
    const status = url.searchParams.get('status');
    const fields = resolveProjectionFields(url, SYSTEM_PROJECTIONS);
    const { rows } = await pool.query('SELECT payload FROM systems WHERE domain_id = $1 ORDER BY payload->>\'name\'', [domainId]);
    let data = rows.map((row) => row.payload);
    if (level) data = data.filter((s) => String(s.level).toUpperCase() === String(level).toUpperCase());
    if (status) data = data.filter((s) => String(s.status).toUpperCase() === String(status).toUpperCase());
    sendJson(res, 200, projectData(data, fields));
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
    const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
    if (projection === 'summary') {
      const appCount = architecture.subsystems.reduce((sum, s) => sum + (s.applications?.length || 0), 0);
      sendJson(res, 200, {
        system: projectObject(architecture.system, SYSTEM_PROJECTIONS.summary),
        subsystems: architecture.subsystems.map((s) => projectObject(s, ['id', 'name', 'owner', 'team', 'status', 'apps'])),
        stats: {
          subsystemCount: architecture.subsystems.length,
          appCount
        }
      });
      return true;
    }
    if (projection === 'flat') {
      sendJson(res, 200, {
        system: architecture.system,
        applications: architecture.subsystems.flatMap((s) => (s.applications || []).map((a) => ({ ...a, subsystemId: s.id, subsystemName: s.name })))
      });
      return true;
    }
    if (projection !== 'full') {
      throw new HttpError(400, `unsupported projection '${projection}'`);
    }
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
    const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
    const profile = appRes.rows[0].payload;
    const dependencies = depsRes.rows.map((row) => row.payload);
    if (projection === 'basic') {
      const summary = dependencies.reduce((acc, dep) => {
        const key = dep.type || 'UNKNOWN';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      sendJson(res, 200, {
        profile: projectObject(profile, ['id', 'name', 'type', 'status', 'owner', 'gitRepo']),
        dependencySummary: summary
      });
      return true;
    }
    if (projection !== 'full') {
      throw new HttpError(400, `unsupported projection '${projection}'`);
    }
    sendJson(res, 200, { profile, dependencies });
    return true;
  }

  if (req.method === 'PATCH' && appProfileMatch) {
    const appId = decodeURIComponent(appProfileMatch[1]);
    const body = await readJsonBody(req);
    const patch = normalizeAppProfilePatch(body);
    const updateResult = await pool.query(
      `
      UPDATE applications
      SET payload = payload || $2::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING payload
      `,
      [appId, JSON.stringify(patch)]
    );
    if (!updateResult.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'application not found' });
      return true;
    }
    sendJson(res, 200, { id: appId, profile: updateResult.rows[0].payload });
    return true;
  }

  const appArtifactsMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/artifacts$/);
  if (req.method === 'GET' && appArtifactsMatch) {
    const appId = decodeURIComponent(appArtifactsMatch[1]);
    const { rows } = await pool.query('SELECT payload FROM artifacts WHERE app_id = $1 ORDER BY id', [appId]);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  const appTechMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/tech-components$/);
  if (req.method === 'GET' && appTechMatch) {
    const appId = decodeURIComponent(appTechMatch[1]);
    const { rows } = await pool.query(
      `
      SELECT tc.payload AS component_payload, rel.payload AS rel_payload
      FROM app_tech_rel rel
      JOIN tech_components tc ON tc.id = rel.component_id
      WHERE rel.app_id = $1
      ORDER BY rel.id
      `,
      [appId]
    );
    sendJson(res, 200, rows.map((row) => ({ ...row.component_payload, relation: row.rel_payload })));
    return true;
  }

  const appDataObjMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/data-objects$/);
  if (req.method === 'GET' && appDataObjMatch) {
    const appId = decodeURIComponent(appDataObjMatch[1]);
    const { rows } = await pool.query('SELECT payload FROM data_objects WHERE app_id = $1 ORDER BY id', [appId]);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  const appInterfacesMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/interfaces$/);
  if (req.method === 'GET' && appInterfacesMatch) {
    const appId = decodeURIComponent(appInterfacesMatch[1]);
    const groupRes = await pool.query('SELECT id, payload FROM api_groups WHERE app_id = $1 ORDER BY id', [appId]);
    const groupIds = groupRes.rows.map((row) => row.id);
    let endpointRows = [];
    if (groupIds.length) {
      const endpointRes = await pool.query('SELECT payload, group_id FROM api_endpoints WHERE group_id = ANY($1::text[]) ORDER BY id', [groupIds]);
      endpointRows = endpointRes.rows;
    }
    const groups = groupRes.rows.map((row) => row.payload);
    const endpoints = endpointRows.map((row) => row.payload);
    const byProtocol = endpoints.reduce((acc, ep) => {
      const key = ep.protocol || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    sendJson(res, 200, {
      appId,
      groupCount: groups.length,
      endpointCount: endpoints.length,
      protocols: byProtocol,
      groups,
      endpoints
    });
    return true;
  }

  const appRuntimeMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/runtime$/);
  if (req.method === 'GET' && appRuntimeMatch) {
    const appId = decodeURIComponent(appRuntimeMatch[1]);
    const [svcRes, artifactRes, deployRes] = await Promise.all([
      pool.query('SELECT id, payload FROM otel_services WHERE app_id = $1 ORDER BY id', [appId]),
      pool.query('SELECT payload FROM artifacts WHERE app_id = $1 ORDER BY id', [appId]),
      pool.query(
        `
        SELECT sy.payload AS system_payload
        FROM applications a
        JOIN subsystems ss ON ss.id = a.subsystem_id
        JOIN systems sy ON sy.id = ss.system_id
        WHERE a.id = $1
        `,
        [appId]
      )
    ]);

    const services = [];
    for (const row of svcRes.rows) {
      const instRes = await pool.query('SELECT payload FROM otel_instances WHERE service_id = $1 ORDER BY id', [row.id]);
      services.push({ service: row.payload, instances: instRes.rows.map((r) => r.payload) });
    }

    const system = deployRes.rows[0]?.system_payload || null;
    const dataCenters = system ? splitDataCenters(system.dataCenters) : [];

    sendJson(res, 200, {
      appId,
      services,
      artifacts: artifactRes.rows.map((row) => row.payload),
      deployment: {
        systemId: system?.id || null,
        dataCenters,
        multiDc: dataCenters.length >= 2
      }
    });
    return true;
  }

  const appComplianceMatch = url.pathname.match(/^\/api\/v1\/panorama\/applications\/([^/]+)\/compliance$/);
  if (req.method === 'GET' && appComplianceMatch) {
    const appId = decodeURIComponent(appComplianceMatch[1]);
    const [appRes, svcRes, dataObjRes, techRes, deployRes] = await Promise.all([
      pool.query('SELECT payload FROM applications WHERE id = $1', [appId]),
      pool.query('SELECT COUNT(*)::int AS n FROM otel_services WHERE app_id = $1', [appId]),
      pool.query('SELECT COUNT(*)::int AS n FROM data_objects WHERE app_id = $1', [appId]),
      pool.query(
        `
        SELECT tc.payload
        FROM app_tech_rel rel
        JOIN tech_components tc ON tc.id = rel.component_id
        WHERE rel.app_id = $1
        `,
        [appId]
      ),
      pool.query(
        `
        SELECT sy.payload AS system_payload
        FROM applications a
        JOIN subsystems ss ON ss.id = a.subsystem_id
        JOIN systems sy ON sy.id = ss.system_id
        WHERE a.id = $1
        `,
        [appId]
      )
    ]);
    if (!appRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'application not found' });
      return true;
    }

    const app = appRes.rows[0].payload;
    const system = deployRes.rows[0]?.system_payload || {};
    const dcs = splitDataCenters(system.dataCenters);
    const badTech = techRes.rows
      .map((row) => row.payload)
      .filter((x) => ['DEPRECATED', 'FORBIDDEN'].includes(String(x.lifecycle || '').toUpperCase()));

    const checks = [
      { ruleId: 'R007', severity: 'MINOR', passed: !!String(app.owner || '').trim(), message: '应用必须有负责人' },
      { ruleId: 'R008', severity: 'MAJOR', passed: svcRes.rows[0].n > 0, message: '应用应接入OTel' },
      { ruleId: 'R004', severity: 'MAJOR', passed: badTech.length === 0, message: '技术选型应位于标准栈可用范围' },
      { ruleId: 'R101', severity: 'MINOR', passed: dataObjRes.rows[0].n > 0, message: '应用应登记至少一个数据对象' },
      {
        ruleId: 'R001',
        severity: system.level === 'CORE' ? 'CRITICAL' : 'MAJOR',
        passed: system.level === 'CORE' ? dcs.length >= 2 : true,
        message: '核心系统应用需双DC部署'
      }
    ];
    sendJson(res, 200, {
      appId,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter((x) => x.passed).length,
        failed: checks.filter((x) => !x.passed).length
      },
      details: {
        deprecatedTech: badTech.map((x) => x.productName),
        dataCenters: dcs
      }
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/data-centers/summary') {
    const { rows } = await pool.query('SELECT payload FROM data_centers ORDER BY payload->>\'name\'');
    sendJson(res, 200, rows.map((row) => row.payload));
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
    const { rows } = await pool.query('SELECT payload FROM systems');
    sendJson(res, 200, computeDrValidationFromSystems(rows.map((r) => r.payload)));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/database-clusters') {
    const { rows } = await pool.query('SELECT payload FROM database_clusters ORDER BY payload->>\'name\'');
    let clusters = rows.map((row) => row.payload);
    const type = url.searchParams.get('type');
    const dcId = url.searchParams.get('dc_id');
    const dr = url.searchParams.get('dr');
    const fields = resolveProjectionFields(url, DB_CLUSTER_PROJECTIONS);
    if (type) clusters = clusters.filter((c) => String(c.type).toUpperCase() === String(type).toUpperCase());
    if (dcId) clusters = clusters.filter((c) => String(c.dc).includes(dcId));
    if (dr) clusters = clusters.filter((c) => String(c.dr).toUpperCase() === String(dr).toUpperCase());
    sendJson(res, 200, projectData(clusters, fields));
    return true;
  }

  const dbDetailMatch = url.pathname.match(/^\/api\/v1\/panorama\/database-clusters\/([^/]+)\/detail$/);
  if (req.method === 'GET' && dbDetailMatch) {
    const clusterId = decodeURIComponent(dbDetailMatch[1]);
    const [clusterRes, instRes, appRelRes, drRes] = await Promise.all([
      pool.query('SELECT payload FROM database_clusters WHERE id = $1', [clusterId]),
      pool.query('SELECT payload FROM database_instances WHERE cluster_id = $1 ORDER BY id', [clusterId]),
      pool.query('SELECT payload FROM database_cluster_apps WHERE cluster_id = $1 ORDER BY id', [clusterId]),
      pool.query(
        'SELECT payload FROM database_dr WHERE primary_cluster_id = $1 OR standby_cluster_id = $1 ORDER BY id LIMIT 1',
        [clusterId]
      )
    ]);
    if (!clusterRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'database cluster not found' });
      return true;
    }
    const cluster = clusterRes.rows[0].payload;
    const instances = instRes.rows.map((row) => row.payload);
    const appRelations = appRelRes.rows.map((row) => row.payload);
    const drPayload = drRes.rows[0]?.payload;
    const drConfig = drPayload
      ? {
          status: drPayload.status || 'NORMAL',
          mode: drPayload.replMode || 'ASYNC',
          rpoSeconds: drPayload.rpoSeconds ?? 60,
          rtoSeconds: drPayload.rtoSeconds ?? 300
        }
      : cluster.dr === 'ok'
        ? { status: 'NORMAL', mode: 'SYNC', rpoSeconds: 0, rtoSeconds: 60 }
        : cluster.dr === 'warn'
          ? { status: 'LAG', mode: 'ASYNC', rpoSeconds: 60, rtoSeconds: 300 }
          : { status: 'MISSING', mode: null, rpoSeconds: null, rtoSeconds: null };
    sendJson(res, 200, { cluster, instances, appRelations, drConfig });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/middleware-clusters') {
    const { rows } = await pool.query('SELECT payload FROM middleware_clusters ORDER BY payload->>\'name\'');
    const type = url.searchParams.get('type');
    const health = url.searchParams.get('health');
    const fields = resolveProjectionFields(url, MW_CLUSTER_PROJECTIONS);
    let clusters = rows.map((row) => row.payload);
    if (type) clusters = clusters.filter((c) => String(c.type).toUpperCase() === String(type).toUpperCase());
    if (health) clusters = clusters.filter((c) => String(c.health).toUpperCase() === String(health).toUpperCase());
    sendJson(res, 200, projectData(clusters, fields));
    return true;
  }

  const mwImpactMatch = url.pathname.match(/^\/api\/v1\/panorama\/middleware-clusters\/([^/]+)\/impact$/);
  if (req.method === 'GET' && mwImpactMatch) {
    const clusterId = decodeURIComponent(mwImpactMatch[1]);
    const [clusterRes, appRes] = await Promise.all([
      pool.query('SELECT payload FROM middleware_clusters WHERE id = $1', [clusterId]),
      pool.query('SELECT payload FROM middleware_cluster_apps WHERE cluster_id = $1 ORDER BY id', [clusterId])
    ]);
    if (!clusterRes.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'middleware cluster not found' });
      return true;
    }
    const cluster = clusterRes.rows[0].payload;
    const appRelations = appRes.rows.map((row) => row.payload);
    const producers = appRelations.filter((item) => item.role === 'PRODUCER').map((item) => item.appName);
    const consumers = appRelations.filter((item) => item.role === 'CONSUMER').map((item) => item.appName);
    sendJson(res, 200, { cluster, producers, consumers });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/traffic-chain') {
    const domain = url.searchParams.get('domain') || 'card-api.bank.com';
    const domainRes = await pool.query('SELECT pool_id, payload FROM lb_domains WHERE payload->>\'domainName\' = $1 LIMIT 1', [domain]);
    if (domainRes.rows.length) {
      const poolId = domainRes.rows[0].pool_id;
      const domainPayload = domainRes.rows[0].payload;
      const [poolRes, membersRes] = await Promise.all([
        pool.query('SELECT payload FROM lb_service_pools WHERE id = $1', [poolId]),
        pool.query('SELECT payload FROM lb_pool_members WHERE pool_id = $1 ORDER BY id', [poolId])
      ]);
      if (poolRes.rows.length) {
        const poolPayload = poolRes.rows[0].payload;
        sendJson(res, 200, {
          domain,
          vip: domainPayload.vip,
          lbDevice: domainPayload.lbDevice || 'F5-PROD-01',
          pool: poolPayload.poolName,
          backends: membersRes.rows.map((row) => row.payload),
          ssl: {
            valid: true,
            expireDate: domainPayload.sslCertExpire || '2027-03-15'
          }
        });
        return true;
      }
    }

    const chainRes = await pool.query('SELECT payload FROM traffic_chains WHERE domain_name = $1', [domain]);
    if (chainRes.rows.length) {
      sendJson(res, 200, chainRes.rows[0].payload);
      return true;
    }
    sendJson(res, 200, buildTrafficChain(domain));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/lb-domains') {
    const { rows } = await pool.query('SELECT payload FROM lb_domains ORDER BY payload->>\'domainName\'');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/otel-services') {
    const appId = url.searchParams.get('app_id');
    const params = [];
    let sql = 'SELECT payload FROM otel_services';
    if (appId) {
      params.push(appId);
      sql += ` WHERE app_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  const otelSvcInstancesMatch = url.pathname.match(/^\/api\/v1\/panorama\/otel-services\/([^/]+)\/instances$/);
  if (req.method === 'GET' && otelSvcInstancesMatch) {
    const serviceId = decodeURIComponent(otelSvcInstancesMatch[1]);
    const { rows } = await pool.query('SELECT payload FROM otel_instances WHERE service_id = $1 ORDER BY id', [serviceId]);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/tech-components') {
    const category = url.searchParams.get('category');
    const lifecycle = url.searchParams.get('lifecycle');
    const status = url.searchParams.get('status');
    const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
    const fields = parseCsv(url.searchParams.get('fields'));
    const { rows } = await pool.query('SELECT payload FROM tech_components ORDER BY payload->>\'productName\'');
    let components = rows.map((row) => row.payload);
    if (category) {
      components = components.filter((x) => String(x.category).toUpperCase() === String(category).toUpperCase());
    }
    if (lifecycle) {
      components = components.filter((x) => String(x.lifecycle).toUpperCase() === String(lifecycle).toUpperCase());
    }
    if (status) {
      components = components.filter((x) => String(x.status || 'ACTIVE').toUpperCase() === String(status).toUpperCase());
    }
    if (projection === 'summary') {
      components = components.map((x) =>
        projectObject(x, ['id', 'productName', 'category', 'lifecycle', 'version', 'status', 'vendor'])
      );
    } else if (projection !== 'full') {
      throw new HttpError(400, `unsupported projection '${projection}'`);
    }
    sendJson(res, 200, projectData(components, fields));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/tech-components') {
    const body = await readJsonBody(req);
    const component = normalizeTechComponentInput(body);
    try {
      await pool.query('INSERT INTO tech_components (id, payload) VALUES ($1, $2::jsonb)', [component.id, JSON.stringify(component)]);
    } catch (error) {
      if (String(error.code) === '23505') {
        throw new HttpError(409, `tech component '${component.id}' already exists`);
      }
      throw error;
    }
    sendJson(res, 201, component);
    return true;
  }

  const techComponentMatch = url.pathname.match(/^\/api\/v1\/tech-components\/([^/]+)$/);
  if (req.method === 'PUT' && techComponentMatch) {
    const componentId = decodeURIComponent(techComponentMatch[1]);
    const body = await readJsonBody(req);
    const current = await pool.query('SELECT payload FROM tech_components WHERE id = $1', [componentId]);
    if (!current.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'tech component not found' });
      return true;
    }
    const merged = { ...current.rows[0].payload, ...body, id: componentId };
    const component = normalizeTechComponentInput(merged, componentId);
    await pool.query('UPDATE tech_components SET payload = $2::jsonb, updated_at = now() WHERE id = $1', [componentId, JSON.stringify(component)]);
    sendJson(res, 200, component);
    return true;
  }

  if (req.method === 'DELETE' && techComponentMatch) {
    const componentId = decodeURIComponent(techComponentMatch[1]);
    const deleted = await pool.query('DELETE FROM tech_components WHERE id = $1 RETURNING id', [componentId]);
    if (!deleted.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'tech component not found' });
      return true;
    }
    sendJson(res, 200, { id: componentId, deleted: true });
    return true;
  }

  const appTechAdminMatch = url.pathname.match(/^\/api\/v1\/applications\/([^/]+)\/tech-components$/);
  if (req.method === 'GET' && appTechAdminMatch) {
    const appId = decodeURIComponent(appTechAdminMatch[1]);
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1', [appId]);
    if (!appCheck.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'application not found' });
      return true;
    }
    const { rows } = await pool.query(
      `
      SELECT tc.payload AS component_payload, rel.payload AS rel_payload
      FROM app_tech_rel rel
      JOIN tech_components tc ON tc.id = rel.component_id
      WHERE rel.app_id = $1
      ORDER BY rel.id
      `,
      [appId]
    );
    sendJson(res, 200, rows.map((row) => ({ ...row.component_payload, relation: row.rel_payload })));
    return true;
  }

  if (req.method === 'POST' && appTechAdminMatch) {
    const appId = decodeURIComponent(appTechAdminMatch[1]);
    const body = await readJsonBody(req);
    const componentId = String(body.componentId || '').trim();
    if (!componentId) {
      throw new HttpError(400, 'componentId is required');
    }
    const relationPatch = body.relation && typeof body.relation === 'object' ? body.relation : {};

    const result = await withTransaction(async (client) => {
      const [appRes, compRes] = await Promise.all([
        client.query('SELECT id FROM applications WHERE id = $1', [appId]),
        client.query('SELECT payload FROM tech_components WHERE id = $1', [componentId])
      ]);
      if (!appRes.rows.length) throw new HttpError(404, 'application not found');
      if (!compRes.rows.length) throw new HttpError(404, 'tech component not found');

      const relRes = await client.query(
        'SELECT id, payload FROM app_tech_rel WHERE app_id = $1 AND component_id = $2 ORDER BY id LIMIT 1',
        [appId, componentId]
      );
      const nextRelation = {
        appId,
        componentId,
        ...((relRes.rows[0] && relRes.rows[0].payload) || {}),
        ...relationPatch,
        updatedAt: new Date().toISOString()
      };
      if (relRes.rows.length) {
        await client.query('UPDATE app_tech_rel SET payload = $2::jsonb WHERE id = $1', [relRes.rows[0].id, JSON.stringify(nextRelation)]);
      } else {
        await client.query('INSERT INTO app_tech_rel (app_id, component_id, payload) VALUES ($1, $2, $3::jsonb)', [appId, componentId, JSON.stringify(nextRelation)]);
      }
      return { component: compRes.rows[0].payload, relation: nextRelation };
    });
    sendJson(res, 200, result);
    return true;
  }

  const appTechItemMatch = url.pathname.match(/^\/api\/v1\/applications\/([^/]+)\/tech-components\/([^/]+)$/);
  if (req.method === 'PUT' && appTechItemMatch) {
    const appId = decodeURIComponent(appTechItemMatch[1]);
    const componentId = decodeURIComponent(appTechItemMatch[2]);
    const body = await readJsonBody(req);
    const relationPatch = body.relation && typeof body.relation === 'object' ? body.relation : body;
    if (!relationPatch || typeof relationPatch !== 'object') {
      throw new HttpError(400, 'relation payload must be an object');
    }

    const result = await withTransaction(async (client) => {
      const relRes = await client.query(
        'SELECT id, payload FROM app_tech_rel WHERE app_id = $1 AND component_id = $2 ORDER BY id LIMIT 1',
        [appId, componentId]
      );
      if (!relRes.rows.length) throw new HttpError(404, 'app-tech relation not found');
      const nextRelation = {
        ...relRes.rows[0].payload,
        ...relationPatch,
        appId,
        componentId,
        updatedAt: new Date().toISOString()
      };
      await client.query('UPDATE app_tech_rel SET payload = $2::jsonb WHERE id = $1', [relRes.rows[0].id, JSON.stringify(nextRelation)]);
      return nextRelation;
    });
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'DELETE' && appTechItemMatch) {
    const appId = decodeURIComponent(appTechItemMatch[1]);
    const componentId = decodeURIComponent(appTechItemMatch[2]);
    const deleted = await pool.query('DELETE FROM app_tech_rel WHERE app_id = $1 AND component_id = $2 RETURNING id', [appId, componentId]);
    if (!deleted.rows.length) {
      sendJson(res, 404, { error: 'not_found', message: 'app-tech relation not found' });
      return true;
    }
    sendJson(res, 200, { appId, componentId, deleted: true });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/capabilities') {
    const domainId = url.searchParams.get('domain_id');
    const params = [];
    let sql = 'SELECT payload FROM capabilities';
    if (domainId) {
      params.push(domainId);
      sql += ` WHERE domain_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/teams') {
    const { rows } = await pool.query('SELECT payload FROM teams ORDER BY payload->>\'name\'');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/registries') {
    const { rows } = await pool.query('SELECT payload FROM registries ORDER BY payload->>\'registryName\'');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/processes') {
    const capabilityId = url.searchParams.get('capability_id');
    const params = [];
    let sql = 'SELECT payload FROM processes';
    if (capabilityId) {
      params.push(capabilityId);
      sql += ` WHERE capability_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/data/subject-areas') {
    const { rows } = await pool.query('SELECT payload FROM subject_areas ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/data/logical-entities') {
    const subjectAreaId = url.searchParams.get('subject_area_id');
    const params = [];
    let sql = 'SELECT payload FROM logical_entities';
    if (subjectAreaId) {
      params.push(subjectAreaId);
      sql += ` WHERE subject_area_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/data/data-objects') {
    const appId = url.searchParams.get('app_id');
    const logicalEntityId = url.searchParams.get('logical_entity_id');
    const params = [];
    let sql = 'SELECT payload FROM data_objects';
    const conditions = [];
    if (appId) {
      params.push(appId);
      conditions.push(`app_id = $${params.length}`);
    }
    if (logicalEntityId) {
      params.push(logicalEntityId);
      conditions.push(`logical_entity_id = $${params.length}`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/data-centers') {
    const { rows } = await pool.query('SELECT payload FROM data_centers ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/machine-rooms') {
    const dcId = url.searchParams.get('dc_id');
    const params = [];
    let sql = 'SELECT payload FROM machine_rooms';
    if (dcId) {
      params.push(dcId);
      sql += ` WHERE dc_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/racks') {
    const roomId = url.searchParams.get('room_id');
    const params = [];
    let sql = 'SELECT payload FROM racks';
    if (roomId) {
      params.push(roomId);
      sql += ` WHERE room_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/physical-servers') {
    const rackId = url.searchParams.get('rack_id');
    const params = [];
    let sql = 'SELECT payload FROM physical_servers';
    if (rackId) {
      params.push(rackId);
      sql += ` WHERE rack_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/virtual-machines') {
    const dcId = url.searchParams.get('dc_id');
    const params = [];
    let sql = 'SELECT payload FROM virtual_machines';
    if (dcId) {
      params.push(dcId);
      sql += ` WHERE dc_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/k8s-clusters') {
    const { rows } = await pool.query('SELECT payload FROM k8s_clusters ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/k8s-namespaces') {
    const clusterId = url.searchParams.get('cluster_id');
    const params = [];
    let sql = 'SELECT payload FROM k8s_namespaces';
    if (clusterId) {
      params.push(clusterId);
      sql += ` WHERE cluster_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/containers') {
    const namespaceId = url.searchParams.get('namespace_id');
    const params = [];
    let sql = 'SELECT payload FROM containers';
    if (namespaceId) {
      params.push(namespaceId);
      sql += ` WHERE namespace_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/network-zones') {
    const { rows } = await pool.query('SELECT payload FROM network_zones ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/network-devices') {
    const { rows } = await pool.query('SELECT payload FROM network_devices ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/physical-networks') {
    const { rows } = await pool.query('SELECT payload FROM physical_networks ORDER BY id');
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/vips') {
    const appId = url.searchParams.get('app_id');
    const params = [];
    let sql = 'SELECT payload FROM vips';
    if (appId) {
      params.push(appId);
      sql += ` WHERE app_id = $${params.length}`;
    }
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/infra/firewall-rules') {
    const sourceZoneId = url.searchParams.get('source_zone_id');
    const targetZoneId = url.searchParams.get('target_zone_id');
    const params = [];
    let sql = 'SELECT payload FROM firewall_rules';
    const conditions = [];
    if (sourceZoneId) {
      params.push(sourceZoneId);
      conditions.push(`source_zone_id = $${params.length}`);
    }
    if (targetZoneId) {
      params.push(targetZoneId);
      conditions.push(`target_zone_id = $${params.length}`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY id';
    const { rows } = await pool.query(sql, params);
    sendJson(res, 200, rows.map((row) => row.payload));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/tech-radar') {
    const { rows } = await pool.query('SELECT payload FROM tech_standards ORDER BY payload->>\'name\'');
    const standards = rows.map((row) => row.payload);
    sendJson(res, 200, {
      adopt: standards.filter((t) => t.lifecycle === 'RECOMMENDED'),
      trial: standards.filter((t) => t.lifecycle === 'ALLOWED'),
      hold: standards.filter((t) => t.lifecycle === 'DEPRECATED'),
      forbid: standards.filter((t) => t.lifecycle === 'FORBIDDEN')
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/tech-debt') {
    const { rows } = await pool.query('SELECT payload FROM tech_standards ORDER BY payload->>\'name\'');
    const debt = rows.map((row) => row.payload).filter((t) => ['DEPRECATED', 'FORBIDDEN'].includes(t.lifecycle));
    sendJson(res, 200, debt);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/panorama/drift-detection') {
    const { rows } = await pool.query('SELECT event_type, payload FROM drift_events ORDER BY id');
    const drift = {
      shadow: [],
      zombie: [],
      shadowDep: [],
      zombieDep: []
    };
    for (const row of rows) {
      if (row.event_type === 'SHADOW_SERVICE') drift.shadow.push(row.payload);
      if (row.event_type === 'ZOMBIE_SERVICE') drift.zombie.push(row.payload);
      if (row.event_type === 'SHADOW_DEPENDENCY') drift.shadowDep.push(row.payload);
      if (row.event_type === 'ZOMBIE_DEPENDENCY') drift.zombieDep.push(row.payload);
    }
    sendJson(res, 200, drift);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/standards/rule-map') {
    const ruleMap = (await loadSectionPayload('RULE_STD_MAP')) || {};
    sendJson(res, 200, ruleMap);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/standards') {
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const projection = (url.searchParams.get('projection') || 'full').trim() || 'full';
    const fields = parseCsv(url.searchParams.get('fields'));
    let standards = (await loadSectionPayload('ARCH_STANDARDS')) || [];
    if (category) {
      standards = standards.filter((x) => String(x.category).toUpperCase() === String(category).toUpperCase());
    }
    if (status) {
      standards = standards.filter((x) => String(x.status).toUpperCase() === String(status).toUpperCase());
    }
    let data = standards;
    if (projection === 'summary') {
      data = standards.map((x) =>
        projectObject(x, [
          'id',
          'name',
          'code',
          'category',
          'version',
          'status',
          'owner',
          'icon',
          'description'
        ])
      );
    } else if (projection !== 'full') {
      throw new HttpError(400, `unsupported projection '${projection}'`);
    }
    sendJson(res, 200, projectData(data, fields));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/standards') {
    const body = await readJsonBody(req);
    const standard = normalizeStandardInput(body);
    const saved = await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      if (standards.some((x) => x.id === standard.id)) {
        throw new HttpError(409, `standard '${standard.id}' already exists`);
      }
      const next = [...standards, standard];
      await persistStandardsState(client, next);
      return standard;
    });
    sendJson(res, 201, saved);
    return true;
  }

  const stdDetailMatch = url.pathname.match(/^\/api\/v1\/standards\/([^/]+)$/);
  if (req.method === 'GET' && stdDetailMatch) {
    const standardId = decodeURIComponent(stdDetailMatch[1]);
    const standards = (await loadSectionPayload('ARCH_STANDARDS')) || [];
    const standard = standards.find((x) => x.id === standardId);
    if (!standard) {
      sendJson(res, 404, { error: 'not_found', message: 'standard not found' });
      return true;
    }
    sendJson(res, 200, standard);
    return true;
  }

  if (req.method === 'PUT' && stdDetailMatch) {
    const standardId = decodeURIComponent(stdDetailMatch[1]);
    const body = await readJsonBody(req);
    const saved = await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      const idx = standards.findIndex((x) => x.id === standardId);
      if (idx < 0) throw new HttpError(404, 'standard not found');

      const current = standards[idx];
      const merged = {
        ...current,
        ...body,
        id: standardId,
        chapters: body.chapters === undefined ? current.chapters : body.chapters,
        rules: body.rules === undefined ? current.rules : body.rules
      };
      const normalized = normalizeStandardInput(merged, standardId);
      const next = [...standards];
      next[idx] = normalized;
      await persistStandardsState(client, next);
      return normalized;
    });
    sendJson(res, 200, saved);
    return true;
  }

  if (req.method === 'DELETE' && stdDetailMatch) {
    const standardId = decodeURIComponent(stdDetailMatch[1]);
    await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      const next = standards.filter((x) => x.id !== standardId);
      if (next.length === standards.length) throw new HttpError(404, 'standard not found');
      await persistStandardsState(client, next);
    });
    sendJson(res, 200, { id: standardId, deleted: true });
    return true;
  }

  const stdRulesMatch = url.pathname.match(/^\/api\/v1\/standards\/([^/]+)\/rules$/);
  if (req.method === 'POST' && stdRulesMatch) {
    const standardId = decodeURIComponent(stdRulesMatch[1]);
    const body = await readJsonBody(req);
    const saved = await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      const idx = standards.findIndex((x) => x.id === standardId);
      if (idx < 0) throw new HttpError(404, 'standard not found');

      const rule = normalizeRuleInput(body);
      const current = standards[idx];
      if ((current.rules || []).some((x) => x.id === rule.id)) {
        throw new HttpError(409, `rule '${rule.id}' already exists in '${standardId}'`);
      }
      const nextStd = { ...current, rules: [...(current.rules || []), rule] };
      const next = [...standards];
      next[idx] = nextStd;
      await persistStandardsState(client, next);
      return rule;
    });
    sendJson(res, 201, saved);
    return true;
  }

  const stdRuleItemMatch = url.pathname.match(/^\/api\/v1\/standards\/([^/]+)\/rules\/([^/]+)$/);
  if (req.method === 'PUT' && stdRuleItemMatch) {
    const standardId = decodeURIComponent(stdRuleItemMatch[1]);
    const ruleId = decodeURIComponent(stdRuleItemMatch[2]);
    const body = await readJsonBody(req);
    const saved = await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      const stdIdx = standards.findIndex((x) => x.id === standardId);
      if (stdIdx < 0) throw new HttpError(404, 'standard not found');
      const currentStd = standards[stdIdx];
      const ruleIdx = (currentStd.rules || []).findIndex((x) => x.id === ruleId);
      if (ruleIdx < 0) throw new HttpError(404, 'rule not found');

      const mergedRule = { ...currentStd.rules[ruleIdx], ...body, id: ruleId };
      const normalizedRule = normalizeRuleInput(mergedRule, ruleId);
      const nextRules = [...currentStd.rules];
      nextRules[ruleIdx] = normalizedRule;
      const nextStd = { ...currentStd, rules: nextRules };
      const next = [...standards];
      next[stdIdx] = nextStd;
      await persistStandardsState(client, next);
      return normalizedRule;
    });
    sendJson(res, 200, saved);
    return true;
  }

  if (req.method === 'DELETE' && stdRuleItemMatch) {
    const standardId = decodeURIComponent(stdRuleItemMatch[1]);
    const ruleId = decodeURIComponent(stdRuleItemMatch[2]);
    await withTransaction(async (client) => {
      const standards = (await loadSectionPayload('ARCH_STANDARDS', client)) || [];
      const stdIdx = standards.findIndex((x) => x.id === standardId);
      if (stdIdx < 0) throw new HttpError(404, 'standard not found');
      const currentStd = standards[stdIdx];
      const nextRules = (currentStd.rules || []).filter((x) => x.id !== ruleId);
      if (nextRules.length === (currentStd.rules || []).length) {
        throw new HttpError(404, 'rule not found');
      }
      const nextStd = { ...currentStd, rules: nextRules };
      const next = [...standards];
      next[stdIdx] = nextStd;
      await persistStandardsState(client, next);
    });
    sendJson(res, 200, { stdId: standardId, ruleId, deleted: true });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/compliance-rules') {
    const fields = parseCsv(url.searchParams.get('fields'));
    const { rows } = await pool.query('SELECT rule_id, payload FROM compliance_rules ORDER BY rule_id');
    const data = rows.map((r) => ({ ruleId: r.rule_id, ...r.payload }));
    sendJson(res, 200, projectData(data, fields));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/compliance-rules') {
    const body = await readJsonBody(req);
    const normalized = normalizeComplianceRuleInput(body);
    const exists = await pool.query('SELECT 1 FROM compliance_rules WHERE rule_id = $1', [normalized.ruleId]);
    if (exists.rows.length) {
      throw new HttpError(409, `compliance rule '${normalized.ruleId}' already exists`);
    }
    await pool.query(
      'INSERT INTO compliance_rules (rule_id, payload, updated_at) VALUES ($1, $2::jsonb, now())',
      [normalized.ruleId, JSON.stringify(normalized.payload)]
    );
    sendJson(res, 201, { ruleId: normalized.ruleId, ...normalized.payload });
    return true;
  }

  const complianceRuleItemMatch = url.pathname.match(/^\/api\/v1\/compliance-rules\/([^/]+)$/);
  if (req.method === 'PUT' && complianceRuleItemMatch) {
    const ruleId = decodeURIComponent(complianceRuleItemMatch[1]);
    const current = await pool.query('SELECT payload FROM compliance_rules WHERE rule_id = $1', [ruleId]);
    if (!current.rows.length) {
      throw new HttpError(404, 'compliance rule not found');
    }
    const body = await readJsonBody(req);
    const merged = { ...(current.rows[0].payload || {}), ...(body || {}), id: ruleId, ruleId };
    const normalized = normalizeComplianceRuleInput(merged, ruleId);
    await pool.query(
      'UPDATE compliance_rules SET payload = $2::jsonb, updated_at = now() WHERE rule_id = $1',
      [ruleId, JSON.stringify(normalized.payload)]
    );
    sendJson(res, 200, { ruleId, ...normalized.payload });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/reviews') {
    const fields = resolveProjectionFields(url, REVIEW_PROJECTIONS);
    const dateFrom = parseDateFilter(url.searchParams.get('from'), 'from');
    const dateTo = parseDateFilter(url.searchParams.get('to'), 'to');
    const reviews = await listReviews({
      status: url.searchParams.get('status') || undefined,
      applicant: url.searchParams.get('applicant') || undefined,
      type: url.searchParams.get('type') || undefined,
      dateFrom,
      dateTo
    });
    sendJson(res, 200, projectData(reviews, fields));
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
    const actorCtx = resolveActorContext(req, url, body);
    await withTransaction(async (client) => {
      await client.query(
        `
        INSERT INTO reviews (id, title, type, system, level, applicant, review_date, status, payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::jsonb)
        `,
        [id, body.title, body.type, body.system || null, body.level || null, body.applicant || null, date, status, JSON.stringify(payload)]
      );
      await appendReviewEvent(client, id, 'CREATED', {
        status,
        title: body.title,
        actorRole: actorCtx.role
      }, actorCtx.actor);
    });

    sendJson(res, 201, { id, title: body.title, type: body.type, system: body.system || null, level: body.level || null, applicant: body.applicant || null, date, status });
    return true;
  }

  const reviewDetailMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)$/);
  if (req.method === 'GET' && reviewDetailMatch) {
    const reviewId = decodeURIComponent(reviewDetailMatch[1]);
    const fields = resolveProjectionFields(url, REVIEW_PROJECTIONS);
    const includeChecksRaw = String(url.searchParams.get('include_checks') || 'true').trim().toLowerCase();
    const includeChecks = !['0', 'false', 'no'].includes(includeChecksRaw);
    const review = await loadReviewRowOrThrow(reviewId);
    const dto = toReviewDto(review);

    if (includeChecks) {
      const { rows } = await pool.query(
        'SELECT rule_id, passed, severity, message FROM review_checks WHERE review_id = $1 ORDER BY id ASC',
        [reviewId]
      );
      dto.checks = rows.map((row) => ({ ruleId: row.rule_id, passed: row.passed, severity: row.severity, message: row.message }));
    }

    sendJson(res, 200, projectData(dto, fields));
    return true;
  }

  const reviewSubmitMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/submit$/);
  if (req.method === 'PUT' && reviewSubmitMatch) {
    const reviewId = decodeURIComponent(reviewSubmitMatch[1]);
    const actorCtx = resolveActorContext(req, url);
    const result = await runReviewCompliance(reviewId, {
      updateStatus: true,
      allowedStatuses: ['DRAFT'],
      action: 'SUBMITTED',
      actor: actorCtx.actor,
      role: actorCtx.role
    });
    sendJson(res, 200, result);
    return true;
  }

  const reviewResubmitMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/resubmit$/);
  if (req.method === 'PUT' && reviewResubmitMatch) {
    const reviewId = decodeURIComponent(reviewResubmitMatch[1]);
    const actorCtx = resolveActorContext(req, url);
    const result = await runReviewCompliance(reviewId, {
      updateStatus: true,
      allowedStatuses: ['DRAFT', 'REJECTED'],
      action: 'RESUBMITTED',
      actor: actorCtx.actor,
      role: actorCtx.role
    });
    sendJson(res, 200, result);
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

  const reviewChecksRunMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/compliance-check\/run$/);
  if (req.method === 'POST' && reviewChecksRunMatch) {
    const reviewId = decodeURIComponent(reviewChecksRunMatch[1]);
    const actorCtx = resolveActorContext(req, url);
    const result = await runReviewCompliance(reviewId, {
      updateStatus: false,
      allowedStatuses: ['DRAFT', 'REVIEWING', 'REJECTED'],
      action: 'CHECKS_RERUN',
      actor: actorCtx.actor,
      role: actorCtx.role
    });
    sendJson(res, 200, { ...result, rerun: true });
    return true;
  }

  const reviewEventsMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/events$/);
  if (req.method === 'GET' && reviewEventsMatch) {
    const reviewId = decodeURIComponent(reviewEventsMatch[1]);
    await loadReviewRowOrThrow(reviewId);
    const rawLimit = Number.parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 500)) : 100;
    const { rows } = await pool.query(
      'SELECT id, action, actor, payload, created_at FROM review_events WHERE review_id = $1 ORDER BY id DESC LIMIT $2',
      [reviewId, limit]
    );
    const events = rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: row.actor,
      payload: row.payload || {},
      at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
    sendJson(res, 200, events);
    return true;
  }

  const reviewApproveMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/approve$/);
  if (req.method === 'PUT' && reviewApproveMatch) {
    const reviewId = decodeURIComponent(reviewApproveMatch[1]);
    const actorCtx = resolveActorContext(req, url);
    await withTransaction(async (client) => {
      const review = await loadReviewRowOrThrow(reviewId, client);
      assertReviewStatusAllowed(review.status, ['REVIEWING'], 'be approved');
      assertReviewPermission('APPROVED', review, actorCtx);
      const result = await client.query(
        'UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
        [reviewId, 'APPROVED']
      );
      if (!result.rows.length) throw new HttpError(404, 'review not found');
      await appendReviewEvent(client, reviewId, 'APPROVED', {
        previousStatus: review.status,
        status: 'APPROVED',
        actorRole: actorCtx.role
      }, actorCtx.actor);
    });
    sendJson(res, 200, { id: reviewId, status: 'APPROVED' });
    return true;
  }

  const reviewRejectMatch = url.pathname.match(/^\/api\/v1\/reviews\/([^/]+)\/reject$/);
  if (req.method === 'PUT' && reviewRejectMatch) {
    const reviewId = decodeURIComponent(reviewRejectMatch[1]);
    const actorCtx = resolveActorContext(req, url);
    await withTransaction(async (client) => {
      const review = await loadReviewRowOrThrow(reviewId, client);
      assertReviewStatusAllowed(review.status, ['REVIEWING'], 'be rejected');
      assertReviewPermission('REJECTED', review, actorCtx);
      const result = await client.query(
        'UPDATE reviews SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
        [reviewId, 'REJECTED']
      );
      if (!result.rows.length) throw new HttpError(404, 'review not found');
      await appendReviewEvent(client, reviewId, 'REJECTED', {
        previousStatus: review.status,
        status: 'REJECTED',
        actorRole: actorCtx.role
      }, actorCtx.actor);
    });
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
    if (error instanceof HttpError) {
      sendJson(res, error.statusCode, { error: 'bad_request', message: error.message });
      return;
    }
    sendJson(res, 500, { error: 'internal_error', message: error.message });
  }
});

let shuttingDown = false;
function setupSignalHandlers() {
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] received ${signal}, closing server...`);

    const forceExitTimer = setTimeout(() => {
      console.warn('[shutdown] force exit after timeout');
      process.exit(0);
    }, 10000);
    forceExitTimer.unref();

    server.close(async () => {
      try {
        await pool.end();
        console.log('[shutdown] complete');
        process.exit(0);
      } catch (error) {
        console.error('[shutdown] error while closing resources', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

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

setupSignalHandlers();
