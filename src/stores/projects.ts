import { useCallback, useSyncExternalStore } from 'react';
import type {
  Project,
  Attachment,
  Entity,
  Issue,
  Gap,
  ProjectDocument,
  ProjectReference,
} from '../types';

export type { Project };

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

  // ===== Sub-item CRUD helpers =====

  function mutateProject(projectId: string, mutator: (p: Project) => Project) {
    save(
      getSnapshot().map((p) =>
        p.id === projectId
          ? { ...mutator(p), updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }

  // ----- Attachments -----
  const addAttachment = useCallback(
    (projectId: string, attachment: Omit<Attachment, 'id' | 'uploadedAt'>) => {
      const item: Attachment = {
        ...attachment,
        id: crypto.randomUUID(),
        uploadedAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        attachments: [...(p.attachments ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateAttachment = useCallback(
    (projectId: string, attachmentId: string, updates: Partial<Omit<Attachment, 'id'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        attachments: (p.attachments ?? []).map((a) =>
          a.id === attachmentId ? { ...a, ...updates } : a,
        ),
      }));
    },
    [],
  );

  const removeAttachment = useCallback((projectId: string, attachmentId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      attachments: (p.attachments ?? []).filter((a) => a.id !== attachmentId),
    }));
  }, []);

  // ----- Entities -----
  const addEntity = useCallback(
    (projectId: string, entity: Omit<Entity, 'id' | 'createdAt'>) => {
      const item: Entity = {
        ...entity,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        entities: [...(p.entities ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateEntity = useCallback(
    (projectId: string, entityId: string, updates: Partial<Omit<Entity, 'id' | 'createdAt'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        entities: (p.entities ?? []).map((e) =>
          e.id === entityId ? { ...e, ...updates } : e,
        ),
      }));
    },
    [],
  );

  const removeEntity = useCallback((projectId: string, entityId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      entities: (p.entities ?? []).filter((e) => e.id !== entityId),
    }));
  }, []);

  // ----- Issues -----
  const addIssue = useCallback(
    (projectId: string, issue: Omit<Issue, 'id' | 'createdAt' | 'priority'> & { priority?: Issue['priority'] }) => {
      const item: Issue = {
        ...issue,
        priority: issue.priority ?? 'medium',
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        issues: [...(p.issues ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateIssue = useCallback(
    (projectId: string, issueId: string, updates: Partial<Omit<Issue, 'id' | 'createdAt'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        issues: (p.issues ?? []).map((i) =>
          i.id === issueId ? { ...i, ...updates } : i,
        ),
      }));
    },
    [],
  );

  const removeIssue = useCallback((projectId: string, issueId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      issues: (p.issues ?? []).filter((i) => i.id !== issueId),
    }));
  }, []);

  // ----- Gaps -----
  const addGap = useCallback(
    (projectId: string, gap: Omit<Gap, 'id' | 'createdAt' | 'priority'> & { priority?: Gap['priority'] }) => {
      const item: Gap = {
        ...gap,
        priority: gap.priority ?? 'medium',
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        gaps: [...(p.gaps ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateGap = useCallback(
    (projectId: string, gapId: string, updates: Partial<Omit<Gap, 'id' | 'createdAt'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        gaps: (p.gaps ?? []).map((g) =>
          g.id === gapId ? { ...g, ...updates } : g,
        ),
      }));
    },
    [],
  );

  const removeGap = useCallback((projectId: string, gapId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      gaps: (p.gaps ?? []).filter((g) => g.id !== gapId),
    }));
  }, []);

  // ----- Documents -----
  const addDocument = useCallback(
    (projectId: string, doc: Omit<ProjectDocument, 'id' | 'createdAt'>) => {
      const item: ProjectDocument = {
        ...doc,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        documents: [...(p.documents ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateDocument = useCallback(
    (projectId: string, docId: string, updates: Partial<Omit<ProjectDocument, 'id' | 'createdAt'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        documents: (p.documents ?? []).map((d) =>
          d.id === docId ? { ...d, ...updates } : d,
        ),
      }));
    },
    [],
  );

  const removeDocument = useCallback((projectId: string, docId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      documents: (p.documents ?? []).filter((d) => d.id !== docId),
    }));
  }, []);

  // ----- References -----
  const addReference = useCallback(
    (projectId: string, ref: Omit<ProjectReference, 'id' | 'addedAt'>) => {
      const item: ProjectReference = {
        ...ref,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({
        ...p,
        references: [...(p.references ?? []), item],
      }));
      return item.id;
    },
    [],
  );

  const updateReference = useCallback(
    (projectId: string, refId: string, updates: Partial<Omit<ProjectReference, 'id' | 'addedAt'>>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        references: (p.references ?? []).map((r) =>
          r.id === refId ? { ...r, ...updates } : r,
        ),
      }));
    },
    [],
  );

  const removeReference = useCallback((projectId: string, refId: string) => {
    mutateProject(projectId, (p) => ({
      ...p,
      references: (p.references ?? []).filter((r) => r.id !== refId),
    }));
  }, []);

  return {
    projects,
    addProject,
    updateProject,
    removeProject,
    getProject,
    // attachments
    addAttachment,
    updateAttachment,
    removeAttachment,
    // entities
    addEntity,
    updateEntity,
    removeEntity,
    // issues
    addIssue,
    updateIssue,
    removeIssue,
    // gaps
    addGap,
    updateGap,
    removeGap,
    // documents
    addDocument,
    updateDocument,
    removeDocument,
    // references
    addReference,
    updateReference,
    removeReference,
  };
}
