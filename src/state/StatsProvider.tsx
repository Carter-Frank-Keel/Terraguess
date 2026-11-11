import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GameResult, Stats } from '../types';
import { clearStats, createEmptyStats, loadStats, recordResult, saveStats } from '../lib/stats';

interface StatsContextValue {
  stats: Stats;
  recordGame: (result: GameResult) => void;
  resetStats: () => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(() => loadStats());

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  const recordGame = useCallback((result: GameResult) => {
    setStats((previous) => recordResult(previous, result));
  }, []);

  const resetStats = useCallback(() => {
    clearStats();
    setStats(createEmptyStats());
  }, []);

  const value = useMemo<StatsContextValue>(
    () => ({ stats, recordGame, resetStats }),
    [stats, recordGame, resetStats],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats(): StatsContextValue {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used inside StatsProvider');
  return context;
}
