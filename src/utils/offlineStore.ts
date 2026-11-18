const CACHE_KEY = 'shinobi_chronicles_offline_cache_v1';
const QUEUE_KEY = 'shinobi_chronicles_offline_queue_v1';

export interface OfflineSnapshot {
  updatedAt: string;
  character: unknown | null;
  threads: unknown[];
  posts: unknown[];
  rankings: unknown[];
}

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT';
  body: Record<string, unknown>;
  createdAt: string;
}

export function saveOfflineSnapshot(partial: Partial<OfflineSnapshot>) {
  try {
    const existing = loadOfflineSnapshot();
    const next: OfflineSnapshot = {
      updatedAt: new Date().toISOString(),
      character: partial.character ?? existing.character,
      threads: partial.threads ?? existing.threads,
      posts: partial.posts ?? existing.posts,
      rankings: partial.rankings ?? existing.rankings,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadOfflineSnapshot(): OfflineSnapshot {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as OfflineSnapshot;
  } catch {
    // Ignore parse errors
  }
  return {
    updatedAt: '',
    character: null,
    threads: [],
    posts: [],
    rankings: [],
  };
}

export function enqueueOfflineAction(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
  try {
    const current = getQueuedActions();
    current.push({
      ...action,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

export function getQueuedActions(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

export function clearQueuedActions() {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Ignore
  }
}
