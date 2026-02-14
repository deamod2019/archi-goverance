// Runtime data loader: fetches all mockup data from backend database.
var MOCK = null;
var PERSONS = null;
var TEAMS = null;
var ARCH_STANDARDS = null;
var RULE_STD_MAP = null;

window.__APP_DATA_READY__ = (async function loadAppData() {
  const response = await fetch('/api/v1/bootstrap', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to load bootstrap data: HTTP ${response.status}`);
  }

  const payload = await response.json();

  MOCK = payload.MOCK;
  PERSONS = payload.PERSONS;
  TEAMS = payload.TEAMS;
  ARCH_STANDARDS = payload.ARCH_STANDARDS;
  RULE_STD_MAP = payload.RULE_STD_MAP;
})();
