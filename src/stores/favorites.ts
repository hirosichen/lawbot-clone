import { useCallback, useSyncExternalStore } from 'react';
import type { Favorite } from '../types';

const STORAGE_KEY = 'lawbot-favorites';

let listeners: Array<() => void> = [];

function emitChange() {
  listeners.forEach((l) => l());
}

function getSnapshot(): Favorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(favorites: Favorite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  emitChange();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addFavorite = useCallback(
    (fav: Omit<Favorite, 'addedAt'>) => {
      const current = getSnapshot();
      if (current.some((f) => f.jid === fav.jid)) return;
      save([...current, { ...fav, addedAt: new Date().toISOString() }]);
    },
    [],
  );

  const removeFavorite = useCallback((jid: string) => {
    save(getSnapshot().filter((f) => f.jid !== jid));
  }, []);

  const isFavorite = useCallback(
    (jid: string) => favorites.some((f) => f.jid === jid),
    [favorites],
  );

  const moveTo = useCallback((jid: string, folder: string) => {
    save(
      getSnapshot().map((f) => (f.jid === jid ? { ...f, folder } : f)),
    );
  }, []);

  const getFolders = useCallback(() => {
    const folders = new Set(favorites.map((f) => f.folder));
    return Array.from(folders).sort();
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite, moveTo, getFolders };
}
