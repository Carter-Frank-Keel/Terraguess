import type { GameResult, ModeStats, RegionStats, Stats, StatsModeKey } from '../types';
import { STORAGE_KEYS, localStore, readJson, removeKey, writeJson, type KeyValueStore } from './storage';

export function emptyModeStats(): ModeStats {
  return { gamesPlayed: 0, correct: 0, incorrect: 0, bestPercent: 0, fastestMs: null };
}

export function createEmptyStats(): Stats {
  return {
    version: 1,
    gamesPlayed: 0,
    correctAnswers: 0,
    incorrectAttempts: 0,
    bestPercent: 0,
    fastestMs: null,
    countriesIdentified: [],
    modes: {
      nameAll: emptyModeStats(),
      findCountry: emptyModeStats(),
      regions: emptyModeStats(),
    },
    regions: {},
    recent: [],
  };
}

export function modeKeyFor(mode: GameResult['mode']): StatsModeKey {
  if (mode === 'name-all') return 'nameAll';
  if (mode === 'find-country') return 'findCountry';
  return 'regions';
}

function faster(current: number | null, candidate: number): number {
  return current === null ? candidate : Math.min(current, candidate);
}

/** Pure reducer: apply a finished game to the stored statistics. */
export function recordResult(stats: Stats, result: GameResult): Stats {
  const modeKey = modeKeyFor(result.mode);
  const previousMode = stats.modes[modeKey];
  const nextMode: ModeStats = {
    gamesPlayed: previousMode.gamesPlayed + 1,
    correct: previousMode.correct + result.correct,
    incorrect: previousMode.incorrect + result.incorrect,
    bestPercent: Math.max(previousMode.bestPercent, result.percent),
    fastestMs: result.timed ? faster(previousMode.fastestMs, result.durationMs) : previousMode.fastestMs,
  };

  const identified = new Set(stats.countriesIdentified);
  for (const iso3 of result.identified) identified.add(iso3);

  let regions = stats.regions;
  if (result.mode === 'regions' && result.regionId) {
    const regionId = result.regionId;
    const previous: RegionStats =
      stats.regions[regionId] ?? {
        gamesPlayed: 0,
        nameGames: 0,
        findGames: 0,
        bestPercent: 0,
        fastestMs: null,
        completed: false,
      };
    regions = {
      ...stats.regions,
      [regionId]: {
        gamesPlayed: previous.gamesPlayed + 1,
        nameGames: previous.nameGames + (result.challenge === 'name' ? 1 : 0),
        findGames: previous.findGames + (result.challenge === 'find' ? 1 : 0),
        bestPercent: Math.max(previous.bestPercent, result.percent),
        fastestMs: result.timed ? faster(previous.fastestMs, result.durationMs) : previous.fastestMs,
        completed: previous.completed || result.percent === 100,
      },
    };
  }

  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    correctAnswers: stats.correctAnswers + result.correct,
    incorrectAttempts: stats.incorrectAttempts + result.incorrect,
    bestPercent: Math.max(stats.bestPercent, result.percent),
    fastestMs: result.timed ? faster(stats.fastestMs, result.durationMs) : stats.fastestMs,
    countriesIdentified: [...identified],
    modes: { ...stats.modes, [modeKey]: nextMode },
    regions,
    recent: [
      {
        id: `${result.at}-${Math.random().toString(36).slice(2, 8)}`,
        mode: result.mode,
        challenge: result.challenge,
        regionId: result.regionId,
        percent: result.percent,
        correct: result.correct,
        incorrect: result.incorrect,
        durationMs: result.durationMs,
        timed: result.timed,
        at: result.at,
      },
      ...stats.recent,
    ].slice(0, 12),
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sanitizeMode(input: unknown): ModeStats {
  const raw = (input ?? {}) as Partial<ModeStats>;
  return {
    gamesPlayed: numberOr(raw.gamesPlayed, 0),
    correct: numberOr(raw.correct, 0),
    incorrect: numberOr(raw.incorrect, 0),
    bestPercent: numberOr(raw.bestPercent, 0),
    fastestMs: typeof raw.fastestMs === 'number' ? raw.fastestMs : null,
  };
}

/** Tolerant loader: unknown or older shapes fall back to safe defaults. */
export function sanitizeStats(input: unknown): Stats {
  const base = createEmptyStats();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<Stats> & { modes?: Partial<Record<StatsModeKey, unknown>> };

  const regions: Stats['regions'] = {};
  if (raw.regions && typeof raw.regions === 'object') {
    for (const [regionId, value] of Object.entries(raw.regions)) {
      const entry = (value ?? {}) as Partial<RegionStats>;
      regions[regionId as keyof Stats['regions']] = {
        gamesPlayed: numberOr(entry.gamesPlayed, 0),
        nameGames: numberOr(entry.nameGames, 0),
        findGames: numberOr(entry.findGames, 0),
        bestPercent: numberOr(entry.bestPercent, 0),
        fastestMs: typeof entry.fastestMs === 'number' ? entry.fastestMs : null,
        completed: Boolean(entry.completed),
      };
    }
  }

  return {
    version: 1,
    gamesPlayed: numberOr(raw.gamesPlayed, 0),
    correctAnswers: numberOr(raw.correctAnswers, 0),
    incorrectAttempts: numberOr(raw.incorrectAttempts, 0),
    bestPercent: numberOr(raw.bestPercent, 0),
    fastestMs: typeof raw.fastestMs === 'number' ? raw.fastestMs : null,
    countriesIdentified: Array.isArray(raw.countriesIdentified)
      ? raw.countriesIdentified.filter((value): value is string => typeof value === 'string')
      : [],
    modes: {
      nameAll: sanitizeMode(raw.modes?.nameAll),
      findCountry: sanitizeMode(raw.modes?.findCountry),
      regions: sanitizeMode(raw.modes?.regions),
    },
    regions,
    recent: Array.isArray(raw.recent)
      ? raw.recent.filter((entry): entry is Stats['recent'][number] => Boolean(entry) && typeof entry === 'object')
      : [],
  };
}

export function loadStats(store: KeyValueStore = localStore): Stats {
  return sanitizeStats(readJson(store, STORAGE_KEYS.stats));
}

export function saveStats(stats: Stats, store: KeyValueStore = localStore): void {
  writeJson(store, STORAGE_KEYS.stats, stats);
}

export function clearStats(store: KeyValueStore = localStore): void {
  removeKey(store, STORAGE_KEYS.stats);
}
