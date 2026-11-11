import rowsFile from './countries.rows.json';
import type { ContinentId, Country, RegionId } from '../types';

/**
 * The country dataset is a single editable file: src/data/countries.rows.json.
 * Row shape: [name, iso2, iso3, continent, region, aliases, anchor?].
 */
type RawRow = [string, string, string, string, string, string?, [number, number]?];

const rows = (rowsFile.rows as unknown as RawRow[]).filter(Boolean);

function toCountry([name, iso2, iso3, continent, region, aliases, anchor]: RawRow): Country {
  return {
    name,
    iso2,
    iso3,
    continent: continent as ContinentId,
    region: region as RegionId,
    aliases: aliases ? aliases.split(';').map((a) => a.trim()).filter(Boolean) : [],
    anchor: anchor ? ([anchor[0], anchor[1]] as const) : undefined,
  };
}

export const COUNTRIES: Country[] = rows
  .map(toCountry)
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

export const TOTAL_COUNTRIES = COUNTRIES.length;

export const COUNTRY_BY_ISO3: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((country) => [country.iso3, country]),
);

export const COUNTRY_BY_ISO2: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((country) => [country.iso2, country]),
);

export function getCountry(iso3: string): Country | undefined {
  return COUNTRY_BY_ISO3.get(iso3);
}

export function getCountriesByContinent(continent: ContinentId): Country[] {
  return COUNTRIES.filter((country) => country.continent === continent);
}

export function getCountriesByIso3(iso3Codes: readonly string[]): Country[] {
  return iso3Codes
    .map((code) => COUNTRY_BY_ISO3.get(code))
    .filter((country): country is Country => Boolean(country));
}

/** Fails fast in development if the editable dataset is malformed. */
function assertDatasetIntegrity(): void {
  const seenIso3 = new Set<string>();
  const seenIso2 = new Set<string>();
  const seenNames = new Set<string>();

  for (const country of COUNTRIES) {
    if (!/^[A-Z]{2}$/.test(country.iso2)) {
      throw new Error(`Invalid ISO alpha-2 code "${country.iso2}" for ${country.name}`);
    }
    if (!/^[A-Z]{3}$/.test(country.iso3)) {
      throw new Error(`Invalid ISO alpha-3 code "${country.iso3}" for ${country.name}`);
    }
    if (seenIso3.has(country.iso3)) throw new Error(`Duplicate ISO3 code: ${country.iso3}`);
    if (seenIso2.has(country.iso2)) throw new Error(`Duplicate ISO2 code: ${country.iso2}`);
    if (seenNames.has(country.name.toLowerCase())) {
      throw new Error(`Duplicate country name: ${country.name}`);
    }
    seenIso3.add(country.iso3);
    seenIso2.add(country.iso2);
    seenNames.add(country.name.toLowerCase());
  }
}

assertDatasetIntegrity();
