import { useCallback, useSyncExternalStore } from 'react';
import type { SearchHistoryEntry } from '../types';
import { DEFAULT_COMMON_LAW_IDS } from '../data/commonLaws';

const STORAGE_KEY = 'lawbot-search-store';
const MAX_HISTORY = 50;

interface SearchStoreState {
  customLawIds: string[];
  history: SearchHistoryEntry[];
}

const DEFAULT_STATE: SearchStoreState = {
  customLawIds: DEFAULT_COMMON_LAW_IDS,
  history: [],
};

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cachedSnapshot: SearchStoreState = DEFAULT_STATE;
let cacheInitialized = false;

function emitChange() {
  cachedRaw = null;
  cacheInitialized = false;
  listeners.forEach((l) => l());
}

function getSnapshot(): SearchStoreState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (cacheInitialized && raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cacheInitialized = true;
  if (!raw) {
    cachedSnapshot = DEFAULT_STATE;
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SearchStoreState>;
    cachedSnapshot = {
      customLawIds:
        Array.isArray(parsed.customLawIds) && parsed.customLawIds.length > 0
          ? parsed.customLawIds
          : DEFAULT_COMMON_LAW_IDS,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    cachedSnapshot = DEFAULT_STATE;
  }
  return cachedSnapshot;
}

function save(state: SearchStoreState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitChange();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// Stable empty-server snapshot to satisfy useSyncExternalStore SSR contract.
const SERVER_SNAPSHOT: SearchStoreState = DEFAULT_STATE;
function getServerSnapshot(): SearchStoreState {
  return SERVER_SNAPSHOT;
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function setCustomLaws(ids: string[]): void {
  const current = getSnapshot();
  save({ ...current, customLawIds: ids });
}

export function addHistory(
  entry: Omit<SearchHistoryEntry, 'id' | 'createdAt'>,
): void {
  const current = getSnapshot();
  const newEntry: SearchHistoryEntry = {
    ...entry,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  // De-dup: drop any prior entries with same query+mode, then prepend new one.
  const deduped = current.history.filter(
    (h) => !(h.query === entry.query && h.mode === entry.mode),
  );
  const next = [newEntry, ...deduped].slice(0, MAX_HISTORY);
  save({ ...current, history: next });
}

export function removeHistoryEntry(id: string): void {
  const current = getSnapshot();
  save({ ...current, history: current.history.filter((h) => h.id !== id) });
}

export function clearHistory(): void {
  const current = getSnapshot();
  save({ ...current, history: [] });
}

export function useCustomLaws(): string[] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return state.customLawIds;
}

export function useSearchHistoryStore(): SearchHistoryEntry[] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return state.history;
}

// Convenience hook that bundles state + actions for callers that want one import.
export function useSearchStore() {
  const customLawIds = useCustomLaws();
  const history = useSearchHistoryStore();

  const setCustomLawsCb = useCallback((ids: string[]) => setCustomLaws(ids), []);
  const addHistoryCb = useCallback(
    (entry: Omit<SearchHistoryEntry, 'id' | 'createdAt'>) => addHistory(entry),
    [],
  );
  const removeHistoryEntryCb = useCallback(
    (id: string) => removeHistoryEntry(id),
    [],
  );
  const clearHistoryCb = useCallback(() => clearHistory(), []);

  return {
    customLawIds,
    history,
    setCustomLaws: setCustomLawsCb,
    addHistory: addHistoryCb,
    removeHistoryEntry: removeHistoryEntryCb,
    clearHistory: clearHistoryCb,
  };
}
