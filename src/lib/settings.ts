import type { LabelMode, Settings, ThemeMode } from '../types';
import { STORAGE_KEYS, localStore, readJson, writeJson, type KeyValueStore } from './storage';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  sound: true,
  timer: true,
  labels: 'hover',
  markers: true,
  lenientMatching: true,
  revealMissed: true,
};

const THEMES: ThemeMode[] = ['dark', 'light'];
const LABEL_MODES: LabelMode[] = ['hover', 'always', 'never'];

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeSettings(input: unknown): Settings {
  if (!input || typeof input !== 'object') return { ...DEFAULT_SETTINGS };
  const raw = input as Partial<Record<keyof Settings, unknown>>;
  return {
    theme: THEMES.includes(raw.theme as ThemeMode) ? (raw.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
    sound: asBoolean(raw.sound, DEFAULT_SETTINGS.sound),
    timer: asBoolean(raw.timer, DEFAULT_SETTINGS.timer),
    labels: LABEL_MODES.includes(raw.labels as LabelMode)
      ? (raw.labels as LabelMode)
      : DEFAULT_SETTINGS.labels,
    markers: asBoolean(raw.markers, DEFAULT_SETTINGS.markers),
    lenientMatching: asBoolean(raw.lenientMatching, DEFAULT_SETTINGS.lenientMatching),
    revealMissed: asBoolean(raw.revealMissed, DEFAULT_SETTINGS.revealMissed),
  };
}

export function loadSettings(store: KeyValueStore = localStore): Settings {
  return sanitizeSettings(readJson(store, STORAGE_KEYS.settings));
}

export function saveSettings(settings: Settings, store: KeyValueStore = localStore): void {
  writeJson(store, STORAGE_KEYS.settings, settings);
}
