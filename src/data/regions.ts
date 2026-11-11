import regionFile from './regions.json';
import { COUNTRIES, COUNTRY_BY_ISO3 } from './countries';
import type {
  ContinentDefinition,
  ContinentId,
  Country,
  RegionDefinition,
  RegionGroupDefinition,
  RegionGroupId,
  RegionId,
} from '../types';

/**
 * Regions live in src/data/regions.json so classifications stay editable and
 * out of game logic. A country's primary region is set in countries.rows.json;
 * a region may also declare `additionalMembers` for cross-cutting groupings
 * such as the Middle East.
 */
export const REGION_GROUPS: RegionGroupDefinition[] = regionFile.groups as RegionGroupDefinition[];

export const REGIONS: RegionDefinition[] = regionFile.regions as RegionDefinition[];

export const REGION_BY_ID: ReadonlyMap<RegionId, RegionDefinition> = new Map(
  REGIONS.map((region) => [region.id, region]),
);

export const CONTINENTS: ContinentDefinition[] = [
  { id: 'africa', name: 'Africa' },
  { id: 'asia', name: 'Asia' },
  { id: 'europe', name: 'Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
  { id: 'oceania', name: 'Oceania' },
];

export const CONTINENT_BY_ID: ReadonlyMap<ContinentId, ContinentDefinition> = new Map(
  CONTINENTS.map((continent) => [continent.id, continent]),
);

function membersOfRegion(region: RegionDefinition): Country[] {
  const primary = COUNTRIES.filter((country) => country.region === region.id);
  const extras = (region.additionalMembers ?? [])
    .map((iso3) => COUNTRY_BY_ISO3.get(iso3))
    .filter((country): country is Country => Boolean(country));
  const seen = new Set(primary.map((country) => country.iso3));
  const merged = [...primary];
  for (const country of extras) {
    if (!seen.has(country.iso3)) {
      merged.push(country);
      seen.add(country.iso3);
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Region membership, precomputed once. */
export const REGION_COUNTRIES: Record<RegionId, Country[]> = REGIONS.reduce(
  (accumulator, region) => {
    accumulator[region.id] = membersOfRegion(region);
    return accumulator;
  },
  {} as Record<RegionId, Country[]>,
);

export const CONTINENT_COUNTRIES: Record<ContinentId, Country[]> = CONTINENTS.reduce(
  (accumulator, continent) => {
    accumulator[continent.id] = COUNTRIES.filter((country) => country.continent === continent.id);
    return accumulator;
  },
  {} as Record<ContinentId, Country[]>,
);

export function getRegionCountries(regionId: RegionId): Country[] {
  return REGION_COUNTRIES[regionId] ?? [];
}

export function getContinentCountries(continentId: ContinentId): Country[] {
  return CONTINENT_COUNTRIES[continentId] ?? [];
}

export function getRegion(regionId: RegionId): RegionDefinition | undefined {
  return REGION_BY_ID.get(regionId);
}

export function getRegionName(regionId: RegionId): string {
  return REGION_BY_ID.get(regionId)?.name ?? regionId;
}

/** Regions grouped for display, in the order declared in regions.json. */
export function getRegionsForGroup(groupId: RegionGroupId): RegionDefinition[] {
  return REGIONS.filter((region) => region.group === groupId);
}
