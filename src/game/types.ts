export interface GameSummary {
  correct: number;
  incorrect: number;
  total: number;
  percent: number;
  accuracy: number;
  durationMs: number;
  identified: string[];
  missed: string[];
}

export interface FindSummary extends GameSummary {
  /** Countries that took more than one attempt, hardest first. */
  difficult: { iso3: string; attempts: number }[];
}
