import { useCallback, useEffect, useRef, useState } from 'react';
import { shuffle } from '../lib/random';
import { accuracyOf, percentOf } from '../lib/scoring';
import type { Country } from '../types';
import type { FindSummary } from './types';

export type FindPhase = 'asking' | 'correct' | 'wrong' | 'missed' | 'finished';
export type GuessOutcome = 'correct' | 'wrong' | 'ignored';

export interface UseFindGameOptions {
  pool: Country[];
  timed: boolean;
  secondsPerRound: number;
  retryOnMiss: boolean;
  onFinish?: (summary: FindSummary) => void;
}

/**
 * Map-clicking engine. One round per country in the pool, shuffled once.
 * Feedback phases drive the map highlight and are advanced by timers that are
 * always cleared on unmount so a route change can never leak state.
 */
export function useFindGame({
  pool,
  timed,
  secondsPerRound,
  retryOnMiss,
  onFinish,
}: UseFindGameOptions) {
  const [queue, setQueue] = useState<Country[]>(() => shuffle(pool));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<FindPhase>('asking');
  const [solved, setSolved] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [wrongIso3, setWrongIso3] = useState<string | null>(null);
  const [revealedIso3, setRevealedIso3] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(secondsPerRound);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const indexRef = useRef(0);
  const phaseRef = useRef<FindPhase>('asking');
  const solvedRef = useRef<string[]>([]);
  const wrongRef = useRef(0);
  const attemptsRef = useRef<Record<string, number>>({});
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const timersRef = useRef<number[]>([]);

  const poolRef = useRef(pool);
  poolRef.current = pool;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const current = queue[index] ?? null;

  const schedule = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((timer) => timer !== id);
      callback();
    }, delay);
    timersRef.current.push(id);
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();

    const duration = Date.now() - startedAtRef.current;
    const identified = [...solvedRef.current];
    const identifiedSet = new Set(identified);
    const difficult = Object.entries(attemptsRef.current)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([iso3, count]) => ({ iso3, attempts: count }));

    phaseRef.current = 'finished';
    setPhase('finished');
    setDurationMs(duration);

    onFinishRef.current?.({
      correct: identified.length,
      incorrect: wrongRef.current,
      total: poolRef.current.length,
      percent: percentOf(identified.length, poolRef.current.length),
      accuracy: accuracyOf(identified.length, wrongRef.current),
      durationMs: duration,
      identified,
      missed: poolRef.current
        .filter((country) => !identifiedSet.has(country.iso3))
        .map((country) => country.iso3),
      difficult,
    });
  }, [clearTimers]);

  const advance = useCallback(() => {
    clearTimers();
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= queue.length) {
      finish();
      return;
    }
    indexRef.current = nextIndex;
    phaseRef.current = 'asking';
    setIndex(nextIndex);
    setPhase('asking');
    setWrongIso3(null);
    setRevealedIso3(null);
    setTimeLeft(secondsPerRound);
  }, [clearTimers, finish, queue.length, secondsPerRound]);

  const countMiss = useCallback((country: Country, delay: number) => {
    wrongRef.current += 1;
    setWrongAttempts(wrongRef.current);
    attemptsRef.current = {
      ...attemptsRef.current,
      [country.iso3]: (attemptsRef.current[country.iso3] ?? 0) + 1,
    };
    setAttempts(attemptsRef.current);
    setWrongIso3(null);
    setRevealedIso3(country.iso3);
    phaseRef.current = 'missed';
    setPhase('missed');
    schedule(advance, delay);
  }, [advance, schedule]);

  const guess = useCallback(
    (iso3: string): GuessOutcome => {
      const country = queue[indexRef.current];
      if (!country || finishedRef.current || phaseRef.current !== 'asking') return 'ignored';

      if (iso3 === country.iso3) {
        solvedRef.current = [...solvedRef.current, iso3];
        setSolved(solvedRef.current);
        setRevealedIso3(iso3);
        phaseRef.current = 'correct';
        setPhase('correct');
        schedule(advance, 900);
        return 'correct';
      }

      wrongRef.current += 1;
      setWrongAttempts(wrongRef.current);
      attemptsRef.current = {
        ...attemptsRef.current,
        [country.iso3]: (attemptsRef.current[country.iso3] ?? 0) + 1,
      };
      setAttempts(attemptsRef.current);
      setWrongIso3(iso3);

      if (retryOnMiss) {
        setRevealedIso3(null);
        phaseRef.current = 'wrong';
        setPhase('wrong');
        schedule(() => {
          setWrongIso3(null);
          phaseRef.current = 'asking';
          setPhase('asking');
        }, 800);
      } else {
        setRevealedIso3(country.iso3);
        phaseRef.current = 'missed';
        setPhase('missed');
        schedule(advance, 1600);
      }
      return 'wrong';
    },
    [advance, queue, retryOnMiss, schedule],
  );

  const skip = useCallback(() => {
    const country = queue[indexRef.current];
    if (!country || finishedRef.current || phaseRef.current !== 'asking') return;
    countMiss(country, 1600);
  }, [countMiss, queue]);

  const registerHint = useCallback(() => setHintsUsed((value) => value + 1), []);

  const reset = useCallback(() => {
    clearTimers();
    finishedRef.current = false;
    indexRef.current = 0;
    phaseRef.current = 'asking';
    solvedRef.current = [];
    wrongRef.current = 0;
    attemptsRef.current = {};
    startedAtRef.current = Date.now();
    setQueue(shuffle(poolRef.current));
    setIndex(0);
    setPhase('asking');
    setSolved([]);
    setWrongAttempts(0);
    setAttempts({});
    setWrongIso3(null);
    setRevealedIso3(null);
    setTimeLeft(secondsPerRound);
    setElapsedMs(0);
    setDurationMs(0);
    setHintsUsed(0);
  }, [clearTimers, secondsPerRound]);

  /* Countdown per round. */
  useEffect(() => {
    if (!timed || phase !== 'asking' || finishedRef.current) return;
    if (timeLeft <= 0) {
      const country = queue[indexRef.current];
      if (country) countMiss(country, 1600);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [timed, phase, timeLeft, queue, countMiss]);

  /* Elapsed clock for the round display + stats. */
  useEffect(() => {
    if (phase === 'finished') return;
    const update = () => setElapsedMs(Date.now() - startedAtRef.current);
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  return {
    current,
    queue,
    index,
    total: queue.length,
    phase,
    solved,
    wrongAttempts,
    attempts,
    wrongIso3,
    revealedIso3,
    timeLeft,
    elapsedMs,
    durationMs,
    hintsUsed,
    guess,
    skip,
    finish,
    reset,
    registerHint,
  };
}
