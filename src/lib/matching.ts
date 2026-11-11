import { COUNTRIES, COUNTRY_BY_ISO3 } from '../data/countries';
import type { Country } from '../types';

/**
 * Answer matching for typed country names.
 *
 * Normalisation makes matching forgiving about case, accents, punctuation,
 * ampersands, leading "the" and Saint/St. variations. Fuzzy matching is opt-in
 * through the "lenient" setting and only accepts a single unambiguous candidate.
 */

export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bst\.?(?=\s|$)/g, 'saint')
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildAnswerIndex(): Map<string, string> {
  const index = new Map<string, string>();
  const add = (value: string, iso3: string) => {
    const key = normalizeAnswer(value);
    if (key && !index.has(key)) index.set(key, iso3);
  };
  for (const country of COUNTRIES) {
    add(country.name, country.iso3);
    for (const alias of country.aliases) add(alias, country.iso3);
    add(country.iso2, country.iso3);
    add(country.iso3, country.iso3);
  }
  return index;
}

const ANSWER_INDEX = buildAnswerIndex();

/** Exact (normalised) lookup, used for automatic submit while typing. */
export function findExactCountryMatch(input: string): Country | null {
  const key = normalizeAnswer(input);
  if (!key) return null;
  const iso3 = ANSWER_INDEX.get(key);
  return iso3 ? (COUNTRY_BY_ISO3.get(iso3) ?? null) : null;
}

/**
 * True when the typed text is the start of a longer country name (Niger -> Nigeria).
 * The name game uses this to avoid auto-submitting a prefix while the player types.
 */
export function hasLongerNameStartingWith(input: string, iso3: string): boolean {
  const key = normalizeAnswer(input);
  if (!key) return false;
  return COUNTRIES.some(
    (country) =>
      country.iso3 !== iso3 &&
      [country.name, ...country.aliases].some((name) => normalizeAnswer(name).startsWith(key)),
  );
}

function levenshtein(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) previous[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > limit) return limit + 1;
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function distanceThreshold(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 12) return 2;
  return 3;
}

/**
 * Full lookup used on submit: exact first, then (optionally) a near-miss match.
 */
export function findCountryByAnswer(
  input: string,
  options: { lenient?: boolean } = {},
): Country | null {
  const key = normalizeAnswer(input);
  if (!key) return null;

  const exact = ANSWER_INDEX.get(key);
  if (exact) return COUNTRY_BY_ISO3.get(exact) ?? null;
  if (!options.lenient) return null;

  const limit = distanceThreshold(key.length);
  if (limit === 0) return null;

  let bestDistance = limit + 1;
  let bestIso3: string | null = null;
  let ambiguous = false;

  for (const country of COUNTRIES) {
    const candidates = [country.name, ...country.aliases];
    for (const candidate of candidates) {
      const normalized = normalizeAnswer(candidate);
      if (!normalized) continue;
      const distance = levenshtein(key, normalized, limit);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIso3 = country.iso3;
        ambiguous = false;
      } else if (distance === bestDistance && bestIso3 && bestIso3 !== country.iso3) {
        ambiguous = true;
      }
    }
  }

  if (!bestIso3 || ambiguous || bestDistance > limit) return null;
  return COUNTRY_BY_ISO3.get(bestIso3) ?? null;
}
