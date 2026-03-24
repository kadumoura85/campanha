const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getToken() {
  return localStorage.getItem("campanha_token");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return resp;
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await apiFetch(path);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro na requisição");
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro na requisição");
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const resp = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro na requisição");
  return data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const resp = await apiFetch(path, { method: "DELETE" });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.error || "Erro ao deletar");
  }
}
