import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findCountryByAnswer } from '../lib/matching';
import { accuracyOf, percentOf } from '../lib/scoring';
import type { Country } from '../types';
import type { GameSummary } from './types';

export type NameGuessOutcome =
  | { kind: 'correct'; country: Country }
  | { kind: 'duplicate'; country: Country }
  | { kind: 'outside'; country: Country }
  | { kind: 'invalid' }
  | { kind: 'empty' }
  | { kind: 'finished' };

export interface UseNameGameOptions {
  pool: Country[];
  lenient: boolean;
  onFinish?: (summary: GameSummary) => void;
}

/**
 * Typed-answer engine. Pure game logic, independent of the screen that renders
 * it, so Name All Countries and the region challenges share behaviour exactly.
 */
export function useNameGame({ pool, lenient, onFinish }: UseNameGameOptions) {
  const [found, setFound] = useState<Country[]>([]);
  const [status, setStatus] = useState<'playing' | 'finished'>('playing');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const foundRef = useRef<Country[]>([]);
  const wrongRef = useRef(0);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Date.now() - startedAtRef.current;
    const identified = foundRef.current.map((country) => country.iso3);
    const identifiedSet = new Set(identified);

    setStatus('finished');
    setDurationMs(duration);
    setElapsedMs(duration);

    onFinishRef.current?.({
      correct: identified.length,
      incorrect: wrongRef.current,
      total: pool.length,
      percent: percentOf(identified.length, pool.length),
      accuracy: accuracyOf(identified.length, wrongRef.current),
      durationMs: duration,
      identified,
      missed: pool.filter((country) => !identifiedSet.has(country.iso3)).map((country) => country.iso3),
    });
  }, [pool]);

  const submit = useCallback(
    (raw: string, options: { exactOnly?: boolean } = {}): NameGuessOutcome => {
      if (finishedRef.current) return { kind: 'finished' };
      const trimmed = raw.trim();
      if (!trimmed) return { kind: 'empty' };

      const country = findCountryByAnswer(trimmed, {
        lenient: lenient && !options.exactOnly,
      });
      if (!country) {
        wrongRef.current += 1;
        setWrongAttempts(wrongRef.current);
        return { kind: 'invalid' };
      }

      if (foundRef.current.some((entry) => entry.iso3 === country.iso3)) {
        return { kind: 'duplicate', country };
      }

      if (!pool.some((entry) => entry.iso3 === country.iso3)) {
        wrongRef.current += 1;
        setWrongAttempts(wrongRef.current);
        return { kind: 'outside', country };
      }

      const next = [...foundRef.current, country];
      foundRef.current = next;
      setFound(next);

      if (next.length === pool.length) finish();

      return { kind: 'correct', country };
    },
    [finish, lenient, pool],
  );

  const reset = useCallback(() => {
    foundRef.current = [];
    wrongRef.current = 0;
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setFound([]);
    setWrongAttempts(0);
    setStatus('playing');
    setElapsedMs(0);
    setDurationMs(0);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    const update = () => setElapsedMs(Date.now() - startedAtRef.current);
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [status]);

  const missed = useMemo(() => {
    const identified = new Set(found.map((country) => country.iso3));
    return pool.filter((country) => !identified.has(country.iso3));
  }, [pool, found]);

  return {
    found,
    missed,
    status,
    elapsedMs,
    durationMs,
    wrongAttempts,
    percent: percentOf(found.length, pool.length),
    accuracy: accuracyOf(found.length, wrongAttempts),
    submit,
    finish,
    reset,
  };
}
