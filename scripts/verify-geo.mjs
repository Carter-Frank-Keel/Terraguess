/**
 * Data integrity check for geography data.
 *
 * Run with: npm run verify:geo
 *
 * Verifies that:
 *  - the country dataset has 195 unique records with valid codes and regions
 *  - every region has members and every cross-regional member exists
 *  - every Natural Earth feature maps to a country or is a known territory
 *  - every country can be found on the map (as a polygon or a marker anchor)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const countryFile = readJson('src/data/countries.rows.json');
const regionFile = readJson('src/data/regions.json');
const mapFile = readJson('src/data/worldAtlasMap.json');
const topology = readJson('public/geo/countries-50m.json');

const errors = [];
const warnings = [];
const rows = countryFile.rows;

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bst\.?\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const countries = rows.map(([name, iso2, iso3, continent, region, aliases, anchor]) => ({
  name,
  iso2,
  iso3,
  continent,
  region,
  aliases: aliases ? aliases.split(';').map((a) => a.trim()).filter(Boolean) : [],
  anchor,
}));

if (countries.length !== 195) {
  errors.push(`Expected 195 countries, found ${countries.length}`);
}

const continents = new Set(['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania']);
const regionIds = new Set(regionFile.regions.map((r) => r.id));
const iso3Set = new Set();
const iso2Set = new Set();
const nameSet = new Set();

for (const country of countries) {
  if (!/^[A-Z]{2}$/.test(country.iso2)) errors.push(`Bad ISO2 "${country.iso2}" (${country.name})`);
  if (!/^[A-Z]{3}$/.test(country.iso3)) errors.push(`Bad ISO3 "${country.iso3}" (${country.name})`);
  if (!continents.has(country.continent)) {
    errors.push(`Unknown continent "${country.continent}" (${country.name})`);
  }
  if (!regionIds.has(country.region)) {
    errors.push(`Unknown region "${country.region}" (${country.name})`);
  }
  if (iso3Set.has(country.iso3)) errors.push(`Duplicate ISO3 ${country.iso3}`);
  if (iso2Set.has(country.iso2)) errors.push(`Duplicate ISO2 ${country.iso2}`);
  if (nameSet.has(country.name)) errors.push(`Duplicate name ${country.name}`);
  iso3Set.add(country.iso3);
  iso2Set.add(country.iso2);
  nameSet.add(country.name);
}

// Answer index collisions between different countries would make matching ambiguous.
const answerOwners = new Map();
for (const country of countries) {
  const answers = new Set([country.name, ...country.aliases, country.iso2, country.iso3]);
  for (const answer of answers) {
    const key = normalize(answer);
    if (!key) continue;
    const owner = answerOwners.get(key);
    if (owner && owner !== country.iso3) {
      errors.push(`Answer "${answer}" is ambiguous: ${owner} and ${country.iso3}`);
    }
    answerOwners.set(key, country.iso3);
  }
}

// Region membership
const regionCounts = new Map(regionFile.regions.map((r) => [r.id, 0]));
for (const country of countries) {
  regionCounts.set(country.region, (regionCounts.get(country.region) ?? 0) + 1);
}
for (const region of regionFile.regions) {
  const extras = region.additionalMembers ?? [];
  for (const iso3 of extras) {
    if (!iso3Set.has(iso3)) errors.push(`Region ${region.id} references unknown ISO3 ${iso3}`);
  }
  const total = (regionCounts.get(region.id) ?? 0) + extras.length;
  if (total === 0) errors.push(`Region ${region.id} has no member countries`);
  console.log(
    `  region ${region.id.padEnd(20)} ${String(total).padStart(3)} countries${
      extras.length ? ` (${extras.length} cross-regional)` : ''
    }`,
  );
}

// Map coverage
const features = topology.objects.countries.geometries;
const mapped = new Map();
const seenNames = new Set();
for (const feature of features) {
  const name = feature.properties?.name;
  if (!name) {
    errors.push('Topology feature without a name');
    continue;
  }
  if (seenNames.has(name)) errors.push(`Duplicate topology feature name: ${name}`);
  seenNames.add(name);
  const iso3 = mapFile.countries[name];
  if (!iso3) {
    if (!mapFile.ignored.includes(name)) errors.push(`Unmapped Natural Earth feature: ${name}`);
    continue;
  }
  if (!iso3Set.has(iso3)) {
    errors.push(`Natural Earth "${name}" maps to unknown ISO3 "${iso3}"`);
    continue;
  }
  if (mapped.has(iso3)) {
    errors.push(`ISO3 ${iso3} mapped twice (${mapped.get(iso3)}, ${name})`);
  }
  mapped.set(iso3, name);
}
for (const ignored of mapFile.ignored) {
  if (!seenNames.has(ignored)) warnings.push(`Ignored feature not in topology: ${ignored}`);
}

const markersOnly = [];
for (const country of countries) {
  if (!mapped.has(country.iso3)) {
    markersOnly.push(country);
    if (!country.anchor) {
      errors.push(`${country.name} (${country.iso3}) has no map geometry and no anchor point`);
    }
  }
}

console.log(`\nCountries: ${countries.length} | Geometry: ${mapped.size} | Markers only: ${markersOnly.length}`);
if (markersOnly.length) {
  console.log(`  marker-only: ${markersOnly.map((c) => c.name).join(', ')}`);
}
const withAnchors = countries.filter((c) => c.anchor);
console.log(`Anchor points for microstates: ${withAnchors.length}`);

for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length) {
  console.error(`\n${errors.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('\nGeography data OK.');
}
