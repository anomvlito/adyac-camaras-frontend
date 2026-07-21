import type { AuthState } from "./types";

export const API = process.env.NEXT_PUBLIC_API_URL || "https://2.24.69.49.nip.io";
export const AUTH_STORAGE_KEY = "cp_auth";
export const AUTH_EXPIRED_EVENT = "cp-auth-expired";

export function getAuth(): AuthState {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(auth: AuthState) {
  if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth = getAuth();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  });
  if (response.status === 401) {
    setAuth(null);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
  return response;
}
