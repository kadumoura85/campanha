const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

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

async function handleResponse<T>(resp: Response): Promise<T> {
  const data = await readResponseBody<T>(resp);
  if (!resp.ok) {
    throw new ApiError(getErrorMessage(resp.status, data as ErrorPayload | null), resp.status);
  }

  return data as T;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await apiFetch(path);
  return handleResponse<T>(resp);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
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
