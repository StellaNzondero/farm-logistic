const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:5000";

const TOKEN_KEY = "farm_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init: RequestInit & { auth?: boolean } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: unknown }> {
  const { auth = false, headers, ...rest } = init;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined)
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl(path), {
    ...rest,
    method: rest.method || "POST",
    headers: finalHeaders,
    body: formData
  });
  const status = res.status;

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) return { ok: false, status, error: json };
  return { ok: true, data: json as T };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: unknown }> {
  const { auth = false, headers, ...rest } = init;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined)
  };

  const body = (rest as RequestInit).body;
  const hasBody = body !== undefined && body !== null;
  if (hasBody && typeof body === "string" && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl(path), { ...rest, headers: finalHeaders });
  const status = res.status;

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) return { ok: false, status, error: json };
  return { ok: true, data: json as T };
}
