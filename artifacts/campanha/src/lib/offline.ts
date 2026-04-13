const CACHE_PREFIX = "campanha_api_cache_v2:";
const QUEUE_KEY_PREFIX = "campanha_api_queue_v2:";
const ACTIVE_SCOPE_KEY = "campanha_offline_scope_v1";
const MAX_CACHE_ENTRIES = 80;

export const OFFLINE_SYNC_COMPLETE_EVENT = "campanha:offline-sync-complete";
export const OFFLINE_QUEUE_CHANGED_EVENT = "campanha:offline-queue-changed";
export const OFFLINE_MUTATION_QUEUED_EVENT = "campanha:offline-mutation-queued";

type CachedApiEntry = {
  body: string;
  contentType: string;
  status: number;
  updatedAt: number;
};

type OfflineMutation = {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body: string | null;
  headers: Record<string, string>;
  createdAt: number;
};

type SyncFetch = (path: string, init: RequestInit) => Promise<Response>;

let syncInitialized = false;
let syncInFlight: Promise<number> | null = null;

function hasWindow() {
  return typeof window !== "undefined";
}

function normalizeScope(scope?: string | null) {
  return scope?.trim() || "anon";
}

function getActiveScope() {
  if (!hasWindow()) return normalizeScope(null);
  return normalizeScope(window.localStorage.getItem(ACTIVE_SCOPE_KEY));
}

function emitWindowEvent(name: string, detail?: unknown) {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function cacheKey(path: string, scope = getActiveScope()) {
  return `${CACHE_PREFIX}${scope}:${path}`;
}

function listCacheKeys() {
  if (!hasWindow()) return [];
  return Object.keys(window.localStorage).filter((key) => key.startsWith(CACHE_PREFIX));
}

function queueKey(scope = getActiveScope()) {
  return `${QUEUE_KEY_PREFIX}${scope}`;
}

function readQueue(scope = getActiveScope()): OfflineMutation[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.localStorage.getItem(queueKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[], scope = getActiveScope()) {
  if (!hasWindow()) return;
  window.localStorage.setItem(queueKey(scope), JSON.stringify(queue));
  emitWindowEvent(OFFLINE_QUEUE_CHANGED_EVENT, { size: queue.length, scope });
}

function listQueueKeys() {
  if (!hasWindow()) return [];
  return Object.keys(window.localStorage).filter((key) => key.startsWith(QUEUE_KEY_PREFIX));
}

function trimCacheEntries() {
  if (!hasWindow()) return;
  const scope = getActiveScope();

  const entries = listCacheKeys()
    .filter((key) => key.startsWith(`${CACHE_PREFIX}${scope}:`))
    .map((key) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw) as CachedApiEntry;
        return { key, updatedAt: value.updatedAt };
      } catch {
        return null;
      }
    })
    .filter((item): item is { key: string; updatedAt: number } => item !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  entries.slice(MAX_CACHE_ENTRIES).forEach((entry) => {
    window.localStorage.removeItem(entry.key);
  });
}

export function storeCachedGet(path: string, response: Response, body: string) {
  if (!hasWindow()) return;

  const contentType = response.headers.get("content-type") || "application/json";
  if (!contentType.includes("application/json")) return;

  const entry: CachedApiEntry = {
    body,
    contentType,
    status: response.status,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(cacheKey(path), JSON.stringify(entry));
  trimCacheEntries();
}

export function getCachedGetResponse(path: string): Response | null {
  if (!hasWindow()) return null;

  try {
    const raw = window.localStorage.getItem(cacheKey(path));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedApiEntry;

    return new Response(entry.body, {
      status: entry.status,
      headers: {
        "Content-Type": entry.contentType,
        "X-Campanha-Offline-Cache": "hit",
      },
    });
  } catch {
    return null;
  }
}

export function clearApiCache(scope?: string | null) {
  if (!hasWindow()) return;
  const normalized = scope ? normalizeScope(scope) : null;
  listCacheKeys()
    .filter((key) => !normalized || key.startsWith(`${CACHE_PREFIX}${normalized}:`))
    .forEach((key) => window.localStorage.removeItem(key));
}

export function setOfflineSessionScope(scope?: string | null) {
  if (!hasWindow()) return;
  window.localStorage.setItem(ACTIVE_SCOPE_KEY, normalizeScope(scope));
  emitWindowEvent(OFFLINE_QUEUE_CHANGED_EVENT, { size: getOfflineQueueSize() });
}

export function clearOfflineSessionData(options?: { allScopes?: boolean }) {
  if (!hasWindow()) return;

  const activeScope = getActiveScope();

  if (options?.allScopes) {
    listCacheKeys().forEach((key) => window.localStorage.removeItem(key));
    listQueueKeys().forEach((key) => window.localStorage.removeItem(key));
  } else {
    clearApiCache(activeScope);
    window.localStorage.removeItem(queueKey(activeScope));
  }

  window.localStorage.setItem(ACTIVE_SCOPE_KEY, normalizeScope(null));
  emitWindowEvent(OFFLINE_QUEUE_CHANGED_EVENT, { size: 0, scope: normalizeScope(null) });
}

function isQueueablePath(path: string) {
  return (
    path.startsWith("/api/contatos") ||
    path.startsWith("/api/eventos") ||
    path.startsWith("/api/regioes") ||
    path.startsWith("/api/usuarios")
  );
}

export function isQueueableMutation(method: string, path: string, body: string | null) {
  if (!["POST", "PATCH", "DELETE"].includes(method.toUpperCase())) return false;
  if (!isQueueablePath(path)) return false;
  if (path.startsWith("/api/auth")) return false;
  if (path.startsWith("/api/configuracao")) return false;
  if (path.includes("/upload")) return false;
  if (body && body.length > 250_000) return false;
  return true;
}

export function queueOfflineMutation(input: {
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body: string | null;
  headers: Record<string, string>;
}) {
  const queue = readQueue();
  const sanitizedHeaders = { ...input.headers };
  delete sanitizedHeaders.Authorization;

  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: input.method,
    path: input.path,
    body: input.body,
    headers: sanitizedHeaders,
    createdAt: Date.now(),
  });
  writeQueue(queue);
  emitWindowEvent(OFFLINE_MUTATION_QUEUED_EVENT, { method: input.method, path: input.path, size: queue.length });
}

export function createQueuedResponse() {
  return new Response(JSON.stringify({ queued: true, offline: true }), {
    status: 202,
    headers: {
      "Content-Type": "application/json",
      "X-Campanha-Offline-Queued": "true",
    },
  });
}

export function getOfflineQueueSize() {
  return readQueue().length;
}

export async function flushOfflineQueue(fetcher: SyncFetch) {
  if (!hasWindow()) return 0;
  if (!navigator.onLine) return 0;

  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const queue = [...readQueue()];
    if (!queue.length) return 0;

    const remaining: OfflineMutation[] = [];
    let processed = 0;

    for (const item of queue) {
      try {
        const response = await fetcher(item.path, {
          method: item.method,
          body: item.body,
          headers: item.headers,
        });

        if (response.ok) {
          processed += 1;
          continue;
        }

        if (response.status >= 400 && response.status < 500) {
          processed += 1;
          continue;
        }

        remaining.push(item);
        remaining.push(...queue.slice(queue.indexOf(item) + 1));
        break;
      } catch {
        remaining.push(item);
        remaining.push(...queue.slice(queue.indexOf(item) + 1));
        break;
      }
    }

    writeQueue(remaining);

    if (processed > 0) {
      clearApiCache();
      emitWindowEvent(OFFLINE_SYNC_COMPLETE_EVENT, { processed, remaining: remaining.length });
    }

    return processed;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export function initOfflineSync(fetcher: SyncFetch) {
  if (!hasWindow() || syncInitialized) return;
  syncInitialized = true;

  const trigger = () => {
    void flushOfflineQueue(fetcher);
  };

  window.addEventListener("online", trigger);
  window.addEventListener("focus", trigger);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      trigger();
    }
  });

  if (navigator.onLine) {
    trigger();
  }
}
