/**
 * Persistence layer.
 *
 * Everything goes through KeyValueStore so a future cloud-backed account
 * implementation can replace localStorage without touching game code.
 */

export interface KeyValueStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export const localStore: KeyValueStore = {
  read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage may be unavailable (private mode / quota); the app still works in memory */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEYS = {
  stats: 'terraguess:stats:v1',
  settings: 'terraguess:settings:v1',
} as const;

export function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.write(key, JSON.stringify(value));
  } catch {
    /* ignore serialisation problems */
  }
}

export function removeKey(store: KeyValueStore, key: string): void {
  store.remove(key);
}
