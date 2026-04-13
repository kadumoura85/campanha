import {
  OFFLINE_MUTATION_QUEUED_EVENT,
  clearOfflineSessionData,
  createQueuedResponse,
  getCachedGetResponse,
  initOfflineSync,
  isQueueableMutation,
  queueOfflineMutation,
  storeCachedGet,
  flushOfflineQueue,
} from "@/lib/offline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
const API_BASE_STORAGE_KEY = "campanha_api_base_v1";

export type QueuedMutationResponse = {
  queued?: boolean;
  offline?: boolean;
};

type ErrorPayload = {
  error?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function syncOfflineStateWithCurrentApiBase() {
  if (typeof window === "undefined") return;

  const currentBase = API_BASE_URL || window.location.origin;
  const previousBase = window.localStorage.getItem(API_BASE_STORAGE_KEY);

  if (previousBase && previousBase !== currentBase) {
    clearOfflineSessionData({ allScopes: true });
  }

  window.localStorage.setItem(API_BASE_STORAGE_KEY, currentBase);
}

async function rawApiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_BASE_URL}${path}`, options);
}

function buildAuthHeaders(options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function authenticatedApiFetch(path: string, options: RequestInit = {}) {
  return rawApiFetch(path, { ...options, headers: buildAuthHeaders(options) });
}

function getToken() {
  return localStorage.getItem("campanha_token");
}

async function readResponseBody<T>(resp: Response): Promise<T | ErrorPayload | null> {
  if (resp.status === 204) return null;

  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await resp.text();
    return text ? ({ message: text } as ErrorPayload) : null;
  }

  return resp.json() as Promise<T | ErrorPayload>;
}

function getErrorMessage(status: number, payload: ErrorPayload | null) {
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;
  if (status === 401) return "Sua sessao expirou. Entre novamente.";
  if (status === 403) return "Voce nao tem permissao para esta acao.";
  if (status >= 500) return "O servidor encontrou um erro. Tente novamente.";
  return "Erro na requisicao";
}

function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

async function handleResponse<T>(resp: Response): Promise<T> {
  const data = await readResponseBody<T>(resp);
  if (!resp.ok) {
    throw new ApiError(getErrorMessage(resp.status, data as ErrorPayload | null), resp.status);
  }

  return data as T;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = buildAuthHeaders(options);
  const shouldUseOfflineCache = method === "GET" && !path.startsWith("/api/auth");

  if (method === "GET") {
    try {
      const response = await rawApiFetch(path, { ...options, headers });
      const contentType = response.headers.get("content-type") || "";

      if (shouldUseOfflineCache && response.ok && contentType.includes("application/json")) {
        const cloned = response.clone();
        const body = await cloned.text();
        storeCachedGet(path, response, body);
      }

      return response;
    } catch (error) {
      if (shouldUseOfflineCache && isNetworkFailure(error)) {
        const cached = getCachedGetResponse(path);
        if (cached) return cached;
      }

      throw error;
    }
  }

  const body =
    typeof options.body === "string"
      ? options.body
      : options.body instanceof FormData
        ? null
        : options.body != null
          ? JSON.stringify(options.body)
          : null;

  try {
    const response = await rawApiFetch(path, {
      ...options,
      body,
      headers,
    });

    if (response.ok) {
      void flushOfflineQueue(authenticatedApiFetch);
    }

    return response;
  } catch (error) {
    if (isNetworkFailure(error) && isQueueableMutation(method, path, body)) {
      queueOfflineMutation({
        method: method as "POST" | "PATCH" | "DELETE",
        path,
        body,
        headers,
      });
      return createQueuedResponse();
    }

    throw error;
  }
}

export async function apiGet<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await apiFetch(path, options);
  return handleResponse<T>(resp);
}

export async function apiPost<T>(path: string, body: unknown, options: RequestInit = {}): Promise<T> {
  const resp = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
  });
  return handleResponse<T>(resp);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const resp = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return handleResponse<T>(resp);
}

export async function apiDelete(path: string): Promise<void> {
  const resp = await apiFetch(path, { method: "DELETE" });
  await handleResponse<null>(resp);
}

export function resetOfflineState() {
  clearOfflineSessionData({ allScopes: true });
}

export function isQueuedMutationResponse(value: unknown): value is QueuedMutationResponse {
  if (!value || typeof value !== "object") return false;

  const queuedValue = (value as QueuedMutationResponse).queued;
  return queuedValue === true;
}

syncOfflineStateWithCurrentApiBase();
initOfflineSync(authenticatedApiFetch);
