export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
  posApiUrl: string;
  isConfigured: boolean;
}

export interface PosApiBaseResponse {
  ok: boolean;
  error?: string;
  field?: "phone" | "password" | "form";
}

export type PosApiCallResult<T extends PosApiBaseResponse> =
  | {
      transportOk: true;
      status: number;
      httpOk: boolean;
      data: T;
    }
  | {
      transportOk: false;
      status?: number;
      error: Error;
    };

const DEFAULT_SUPABASE_URL = "https://ltpkaonghjlijissazkz.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uZE9zBUNkeZazJxsBPOzog_peWypFH_";

function readPublicEnvVar(name: string): string {
  const metaEnv =
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string | undefined> }).env
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const fromImportMeta = metaEnv?.[name];
  if (typeof fromImportMeta === "string" && fromImportMeta.trim()) {
    return fromImportMeta.trim();
  }

  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }

  return "";
}

/**
 * Returns the public Supabase configuration safe for browser client usage.
 * Never reads or exposes any service_role key.
 */
export function getSupabaseConfig(): SupabasePublicConfig {
  const url = (readPublicEnvVar("VITE_SUPABASE_URL") || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const publishableKey =
    readPublicEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readPublicEnvVar("VITE_SUPABASE_ANON_KEY") ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return {
    url,
    publishableKey,
    posApiUrl: url ? `${url}/functions/v1/pos-api` : "",
    isConfigured: Boolean(url && publishableKey),
  };
}

/**
 * Calls the Supabase `pos-api` Edge Function using the public publishable/anon key.
 * Session tokens are passed in JSON body (`token`) and `x-pos-token` header (never `Authorization`).
 */
export async function callPosApi<T extends PosApiBaseResponse>(
  action: string,
  payload: Record<string, unknown> = {},
  options: {
    token?: string | null;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<PosApiCallResult<T>> {
  const config = getSupabaseConfig();
  if (!config.isConfigured || !config.posApiUrl) {
    return {
      transportOk: false,
      error: new Error("Supabase configuration is missing."),
    };
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== "function") {
    return {
      transportOk: false,
      error: new Error("Fetch API is unavailable."),
    };
  }

  const cleanToken = options.token?.trim() || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: config.publishableKey,
  };
  if (cleanToken) {
    headers["x-pos-token"] = cleanToken;
  }

  const body: Record<string, unknown> = {
    action,
    ...payload,
  };
  if (cleanToken && body.token === undefined) {
    body.token = cleanToken;
  }

  try {
    const response = await fetchFn(config.posApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      return {
        transportOk: false,
        status: response.status,
        error: new Error(`Invalid JSON response from pos-api (HTTP ${response.status})`),
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        transportOk: false,
        status: response.status,
        error: new Error(`Unexpected pos-api payload (HTTP ${response.status})`),
      };
    }

    return {
      transportOk: true,
      status: response.status,
      httpOk: response.ok,
      data: parsed as T,
    };
  } catch (err) {
    return {
      transportOk: false,
      error: err instanceof Error ? err : new Error("Network request failed"),
    };
  }
}
