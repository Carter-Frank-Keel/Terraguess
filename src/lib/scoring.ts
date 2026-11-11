/** Reusable scoring maths. Kept pure so any future mode can share it. */

export interface ScoreInput {
  correct: number;
  incorrect: number;
  total: number;
}

export interface ScoreBreakdown {
  percent: number;
  accuracy: number;
}

export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

export function accuracyOf(correct: number, incorrect: number): number {
  const attempts = correct + incorrect;
  if (attempts <= 0) return 0;
  return clamp(Math.round((correct / attempts) * 100), 0, 100);
}

export function scoreOf({ correct, incorrect, total }: ScoreInput): ScoreBreakdown {
  return {
    percent: percentOf(correct, total),
    accuracy: accuracyOf(correct, incorrect),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A one-line verdict used on results screens. */
export function verdictFor(percent: number): string {
  if (percent >= 100) return 'Flawless. The whole map, memorised.';
  if (percent >= 90) return 'World-class recall.';
  if (percent >= 75) return 'Strong atlas knowledge.';
  if (percent >= 50) return 'A solid foundation — keep going.';
  if (percent >= 25) return 'Plenty of new places to discover.';
  return 'Every expert starts here.';
}
