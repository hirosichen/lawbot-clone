import { useCallback, useSyncExternalStore } from 'react';

export interface Project {
  id: string;
  title: string;
  facts: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'lawbot-projects';

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cachedSnapshot: Project[] = [];

function emitChange() {
  cachedRaw = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): Project[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  try {
    cachedSnapshot = raw ? JSON.parse(raw) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function save(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  emitChange();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useProjects() {
  const projects = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addProject = useCallback((title: string, facts: string) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      facts,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    save([newProject, ...getSnapshot()]);
    return newProject.id;
  }, []);

  const updateProject = useCallback(
    (id: string, updates: Partial<Pick<Project, 'title' | 'facts' | 'notes'>>) => {
      save(
        getSnapshot().map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
        ),
      );
    },
    [],
  );

  const removeProject = useCallback((id: string) => {
    save(getSnapshot().filter((p) => p.id !== id));
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id) ?? null,
    [projects],
  );

  return { projects, addProject, updateProject, removeProject, getProject };
}
