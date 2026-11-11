/**
 * Shared domain types for the geography challenge.
 *
 * Data flows one way: raw editable data (src/data/*.json) -> typed records
 * (src/data/countries.ts, src/data/regions.ts) -> game logic -> UI.
 */

export type ContinentId =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania';

export type RegionId =
  | 'north-america'
  | 'central-america'
  | 'caribbean'
  | 'south-america'
  | 'western-europe'
  | 'northern-europe'
  | 'southern-europe'
  | 'eastern-europe'
  | 'western-asia'
  | 'central-asia'
  | 'southern-asia'
  | 'eastern-asia'
  | 'south-eastern-asia'
  | 'northern-africa'
  | 'western-africa'
  | 'eastern-africa'
  | 'central-africa'
  | 'southern-africa'
  | 'oceania'
  | 'middle-east';

export type RegionGroupId =
  | 'americas'
  | 'europe'
  | 'asia'
  | 'africa'
  | 'oceania'
  | 'cross-regional';

export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  continent: ContinentId;
  region: RegionId;
  /** Common alternative names, spellings and abbreviations accepted as answers. */
  aliases: string[];
  /** Optional [latitude, longitude] anchor used for map markers on microstates. */
  anchor?: readonly [number, number];
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  group: RegionGroupId;
  continent: ContinentId;
  description: string;
  /** Members outside the region's primary assignment (cross-regional groupings). */
  additionalMembers?: string[];
}

export interface RegionGroupDefinition {
  id: RegionGroupId;
  name: string;
  blurb: string;
}

export interface ContinentDefinition {
  id: ContinentId;
  name: string;
}

/** The three playable game modes. */
export type GameModeId = 'name-all' | 'find-country' | 'regions';

/** Keys used to bucket statistics per game family. */
export type StatsModeKey = 'nameAll' | 'findCountry' | 'regions';

export type ChallengeKind = 'name' | 'find';

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'dark' | 'light';

/** When country names are drawn on the map. Solved countries always label on hover. */
export type LabelMode = 'hover' | 'always' | 'never';

export interface Settings {
  theme: ThemeMode;
  sound: boolean;
  /** Global default for showing the clock. Individual games can override. */
  timer: boolean;
  labels: LabelMode;
  /** Show clickable markers for microstates and island nations. */
  markers: boolean;
  /** Accept near-miss spellings ("Austraila" -> Australia). */
  lenientMatching: boolean;
  /** Default for revealing missed countries on the results screen. */
  revealMissed: boolean;
}

/* ------------------------------------------------------------------ */
/* Results and statistics                                             */
/* ------------------------------------------------------------------ */

export interface GameResult {
  mode: GameModeId;
  challenge: ChallengeKind;
  regionId?: RegionId;
  correct: number;
  incorrect: number;
  total: number;
  percent: number;
  accuracy: number;
  durationMs: number;
  /** ISO3 codes of countries the player identified correctly. */
  identified: string[];
  /** ISO3 codes of countries the player did not identify. */
  missed: string[];
  /** Countries that needed more than one attempt. */
  difficult: { iso3: string; attempts: number }[];
  /** True when the timer was enabled, so the duration is comparable. */
  timed: boolean;
  at: number;
}

export interface ModeStats {
  gamesPlayed: number;
  correct: number;
  incorrect: number;
  bestPercent: number;
  fastestMs: number | null;
}

export interface RegionStats {
  gamesPlayed: number;
  nameGames: number;
  findGames: number;
  bestPercent: number;
  fastestMs: number | null;
  completed: boolean;
}

export interface StoredGameRecord {
  id: string;
  mode: GameModeId;
  challenge: ChallengeKind;
  regionId?: RegionId;
  percent: number;
  correct: number;
  incorrect: number;
  durationMs: number;
  timed: boolean;
  at: number;
}

export interface Stats {
  version: 1;
  gamesPlayed: number;
  correctAnswers: number;
  incorrectAttempts: number;
  bestPercent: number;
  fastestMs: number | null;
  /** Every country ever identified correctly, as ISO3 codes. */
  countriesIdentified: string[];
  modes: Record<StatsModeKey, ModeStats>;
  regions: Partial<Record<RegionId, RegionStats>>;
  recent: StoredGameRecord[];
}
