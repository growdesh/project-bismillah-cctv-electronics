import type { PosAuthUser, PosEmployee, PosUserRole } from "../demos/shared/demoTypes";
import { BUSINESS } from "./config";
import { toEnDigits } from "./global";
import { callPosApi, getSupabaseConfig, type PosApiBaseResponse } from "./supabase";

export const AUTH_PHONE = "01609099713";
export const AUTH_PASSWORD = "01609099713";
export const SERVICING_DEPT_PHONE = "01700998877";
export const SERVICING_DEPT_PASSWORD = "01700998877";

const AUTH_SESSION_STORAGE_KEY = "bce-pos-auth-session-v1";
const INVALID_CREDENTIALS_ERROR = "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।";
const NETWORK_OFFLINE_ERROR = "ইন্টারনেট বা সার্ভার সংযোগ নেই। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।";

export interface AuthSession {
  token: string;
  user: PosAuthUser;
  loggedInAt: string;
}

// Held in memory and mirrored to sessionStorage (tab-scoped, never localStorage)
let currentMemorySession: AuthSession | null = null;

export type LoginValidationResult =
  | { ok: true; normalizedPhone: string; user: PosAuthUser; token: string }
  | { ok: false; field: "phone" | "password" | "form"; error: string };

export type SessionCheckResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: "unauthenticated" | "invalid" | "network" };

interface PosLoginApiResponse extends PosApiBaseResponse {
  token?: string;
  user?: PosAuthUser;
}

interface PosMeApiResponse extends PosApiBaseResponse {
  user?: PosAuthUser;
}

function readSessionFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      !parsed.token.trim() ||
      !parsed.user ||
      typeof parsed.user.id !== "string" ||
      typeof parsed.user.role !== "string"
    ) {
      return null;
    }
    return {
      token: parsed.token.trim(),
      user: parsed.user,
      loggedInAt: typeof parsed.loggedInAt === "string" ? parsed.loggedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeSessionToStorage(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

/**
 * Normalizes a Bangladeshi phone number (converts Bengali digits, strips spaces/dashes,
 * and removes optional +88 / 88 / 0088 country code prefix).
 */
export function normalizePhoneInput(raw: string): string {
  const digits = toEnDigits(raw).replace(/[\s\-()]+/g, "").trim();
  if (digits.startsWith("+880")) return `0${digits.slice(4)}`;
  if (digits.startsWith("+88") && digits.length === 13 && digits[3] === "1") {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("00880") && digits.length === 15) return `0${digits.slice(5)}`;
  if (digits.startsWith("880") && digits.length === 13) return `0${digits.slice(3)}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}

/**
 * Normalizes password input (trims surrounding whitespace and converts Bengali digits).
 */
export function normalizePasswordInput(raw: string): string {
  return toEnDigits(raw).trim();
}

export function validateLoginCredentials(
  phoneInput: string,
  passwordInput: string,
  employees: readonly PosEmployee[] = [],
): LoginValidationResult {
  const phone = normalizePhoneInput(phoneInput);
  const password = normalizePasswordInput(passwordInput);

  if (!phone) {
    return { ok: false, field: "phone", error: "মোবাইল নম্বর লিখুন" };
  }
  if (!password) {
    return { ok: false, field: "password", error: "পাসওয়ার্ড লিখুন" };
  }

  if (phone === AUTH_PHONE && password === AUTH_PASSWORD) {
    return {
      ok: true,
      normalizedPhone: phone,
      token: "local-admin-token",
      user: {
        id: "usr-admin",
        name: BUSINESS.ownerBn,
        phone,
        role: "admin",
      },
    };
  }

  if (phone === SERVICING_DEPT_PHONE && password === SERVICING_DEPT_PASSWORD) {
    return {
      ok: true,
      normalizedPhone: phone,
      token: "local-servicing-token",
      user: {
        id: "emp-servicing",
        name: "সার্ভিসিং বিভাগ",
        phone,
        role: "servicing",
        staffId: "emp-servicing",
      },
    };
  }

  const matchedEmp = employees.find((e) => normalizePhoneInput(e.phone) === phone);
  if (matchedEmp && password === phone) {
    const role: PosUserRole = matchedEmp.roleType === "servicing" ? "servicing" : "staff";
    return {
      ok: true,
      normalizedPhone: phone,
      token: `local-staff-token-${matchedEmp.id}`,
      user: {
        id: matchedEmp.id,
        name: matchedEmp.name,
        phone,
        role,
        staffId: matchedEmp.id,
      },
    };
  }

  return {
    ok: false,
    field: "form",
    error: INVALID_CREDENTIALS_ERROR,
  };
}

async function loginViaExpressFallback(
  phone: string,
  password: string,
  fetchFn: typeof fetch,
): Promise<LoginValidationResult> {
  try {
    const response = await fetchFn("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const rawText = await response.text();
    let data: PosLoginApiResponse | null = null;
    try {
      data = rawText ? (JSON.parse(rawText) as PosLoginApiResponse) : null;
    } catch {
      return { ok: false, field: "form", error: NETWORK_OFFLINE_ERROR };
    }

    if (!data || typeof data !== "object") {
      return { ok: false, field: "form", error: NETWORK_OFFLINE_ERROR };
    }

    if (!response.ok || !data.ok || !data.user || !data.token) {
      return {
        ok: false,
        field: data.field || "form",
        error: data.error || INVALID_CREDENTIALS_ERROR,
      };
    }

    return {
      ok: true,
      normalizedPhone: normalizePhoneInput(data.user.phone || phone),
      user: data.user,
      token: String(data.token),
    };
  } catch {
    return {
      ok: false,
      field: "form",
      error: NETWORK_OFFLINE_ERROR,
    };
  }
}

export async function loginWithServer(
  phoneInput: string,
  passwordInput: string,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<LoginValidationResult> {
  const phone = normalizePhoneInput(phoneInput);
  const password = normalizePasswordInput(passwordInput);

  if (!phone) {
    return { ok: false, field: "phone", error: "মোবাইল নম্বর লিখুন" };
  }
  if (!password) {
    return { ok: false, field: "password", error: "পাসওয়ার্ড লিখুন" };
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const supabaseConfig = getSupabaseConfig();

  if (supabaseConfig.isConfigured) {
    const supaRes = await callPosApi<PosLoginApiResponse>(
      "login",
      { phone, password },
      { fetchImpl: fetchFn },
    );

    if (supaRes.transportOk) {
      if (supaRes.httpOk && supaRes.data.ok && supaRes.data.user && supaRes.data.token) {
        return {
          ok: true,
          normalizedPhone: normalizePhoneInput(supaRes.data.user.phone || phone),
          user: supaRes.data.user,
          token: String(supaRes.data.token),
        };
      }
      // Supabase rejected the login attempt — never fall back to local credentials
      return {
        ok: false,
        field: supaRes.data.field || "form",
        error: supaRes.data.error || INVALID_CREDENTIALS_ERROR,
      };
    }
  }

  // Only reached when Supabase is unreachable or unconfigured
  if (typeof fetchFn === "function") {
    return loginViaExpressFallback(phone, password, fetchFn);
  }

  return {
    ok: false,
    field: "form",
    error: NETWORK_OFFLINE_ERROR,
  };
}

export function loadAuthSession(): AuthSession | null {
  if (currentMemorySession) return currentMemorySession;
  const stored = readSessionFromStorage();
  if (stored) {
    currentMemorySession = stored;
  }
  return currentMemorySession;
}

export function saveAuthSession(user: PosAuthUser, token: string): AuthSession {
  const cleanUser: PosAuthUser = {
    ...user,
    phone: normalizePhoneInput(user.phone),
  };
  const session: AuthSession = {
    token: token.trim(),
    user: cleanUser,
    loggedInAt: new Date().toISOString(),
  };
  currentMemorySession = session;
  writeSessionToStorage(session);
  return session;
}

export function clearLocalAuthSession(): void {
  currentMemorySession = null;
  writeSessionToStorage(null);
}

export function clearAuthSession(options: { fetchImpl?: typeof fetch } = {}): void {
  const token = loadAuthSession()?.token;
  clearLocalAuthSession();

  if (!token || token.startsWith("local-")) return;

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== "function") return;

  const supabaseConfig = getSupabaseConfig();
  if (supabaseConfig.isConfigured) {
    callPosApi("logout", {}, { token, fetchImpl: fetchFn }).catch(() => {});
  }
}

export async function checkAuthSession(
  options: { fetchImpl?: typeof fetch } = {},
): Promise<SessionCheckResult> {
  const session = loadAuthSession();
  if (!session?.token) {
    return { ok: false, reason: "unauthenticated" };
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const supabaseConfig = getSupabaseConfig();

  if (supabaseConfig.isConfigured) {
    const res = await callPosApi<PosMeApiResponse>(
      "me",
      {},
      { token: session.token, fetchImpl: fetchFn },
    );

    if (res.transportOk) {
      if (res.httpOk && res.data.ok && res.data.user) {
        const refreshed = saveAuthSession(res.data.user, session.token);
        return { ok: true, session: refreshed };
      }
      clearLocalAuthSession();
      return { ok: false, reason: "invalid" };
    }
  }

  if (typeof fetchFn === "function") {
    try {
      const response = await fetchFn("/api/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (response.status === 401 || response.status === 403) {
        clearLocalAuthSession();
        return { ok: false, reason: "invalid" };
      }
      if (response.ok) {
        const data = (await response.json()) as PosMeApiResponse;
        if (data.ok && data.user) {
          const refreshed = saveAuthSession(data.user, session.token);
          return { ok: true, session: refreshed };
        }
        clearLocalAuthSession();
        return { ok: false, reason: "invalid" };
      }
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  return { ok: false, reason: "network" };
}

export function getAuthToken(): string | null {
  return loadAuthSession()?.token ?? null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function isRouteAllowedForRole(subPath: string, role: PosUserRole): boolean {
  const clean = resolveRetailPosSubPath(subPath);
  if (role === "admin") return true;

  // Routes allowed for Servicing Department & Staff
  const allowedPrefixes = [
    "/",
    "/servicing",
    "/notifications",
    "/sales",
    "/sales/new",
    "/customers",
    "/stock",
    "/more",
  ];

  if (clean === "/") return true;
  return allowedPrefixes.some(
    (prefix) => prefix !== "/" && (clean === prefix || clean.startsWith(`${prefix}/`)),
  );
}

/**
 * Resolves both root paths ("/sales") and legacy "/demo/retail-pos/*" paths
 * into clean Retail POS subroutes.
 */
export function resolveRetailPosSubPath(pathname: string): string {
  const clean = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  const legacyPrefix = "/demo/retail-pos";
  if (clean === legacyPrefix) return "/";
  if (clean.startsWith(`${legacyPrefix}/`)) {
    return clean.slice(legacyPrefix.length) || "/";
  }
  return clean;
}
