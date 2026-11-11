import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getWorldGeo, type WorldGeoData } from '../lib/geo';

type Status = 'loading' | 'ready' | 'error';

interface WorldGeoContextValue {
  status: Status;
  data: WorldGeoData | null;
  error: string | null;
  retry: () => void;
}

const WorldGeoContext = createContext<WorldGeoContextValue | null>(null);

export function WorldGeoProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<WorldGeoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    getWorldGeo().then(
      (geo) => {
        if (!active) return;
        setData(geo);
        setStatus('ready');
      },
      (cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'The world map failed to load.');
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <WorldGeoContext.Provider value={{ status, data, error, retry }}>
      {children}
    </WorldGeoContext.Provider>
  );
}

export function useWorldGeo(): WorldGeoContextValue {
  const context = useContext(WorldGeoContext);
  if (!context) throw new Error('useWorldGeo must be used inside WorldGeoProvider');
  return context;
}
