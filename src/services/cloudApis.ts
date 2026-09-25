import { fetchWithTimeout } from "@/utils/abort";
import { extractAirportUsageSources, type AirportUserinfoSource } from "@/utils/extraAssets";

const REQUEST_TIMEOUT_MS = 8_000;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithTimeout(
    url,
    { cache: "no-store", credentials: "same-origin", signal },
    REQUEST_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`${url} ${response.status}`);
  }
  return (await response.json()) as T;
}

export interface IspOrder {
  id?: number;
  status?: string;
  product?: string | null;
  plan?: string | null;
  location?: string | null;
  expire_date?: string | null;
  days_left?: number | null;
  auto_extend?: boolean;
  renews_at?: string | null;
  renew_price?: number | null;
  renew_plan?: string | null;
  renew_pay?: string | null;
  proxies?: Array<{ ip?: string | null }> | null;
}

export interface IspUsageResponse {
  timestamp?: string;
  remaining_gb?: number | null;
  used_gb?: number | null;
  fup_gb?: number | null;
  balance_usd?: number | null;
  session_expires_at?: string | null;
  active?: IspOrder | null;
  orders?: IspOrder[];
  usage?: {
    ok?: boolean;
    usage_status?: number;
    series_mb?: Record<string, number>;
    remaining?: { gb_balance?: number; gb_limit?: number; gb_used?: number } | null;
  };
  errors?: { balance?: unknown; orders?: unknown };
}

export function fetchIspUsage(days = 7, signal?: AbortSignal) {
  return getJson<IspUsageResponse>(`/isp/api/usage?days=${days}`, signal);
}

export async function fetchAirportUsage(
  path: string,
  signal?: AbortSignal,
): Promise<AirportUserinfoSource[]> {
  const payload = await getJson<unknown>(path, signal);
  return extractAirportUsageSources(payload);
}

export interface IspCredentialsStatus {
  ok?: boolean;
  api_token_set?: boolean;
  api_token_tail?: string | null;
  session_token_set?: boolean;
  session_token_tail?: string | null;
  session_expires_at?: string | null;
  credentials_path?: string;
  error?: string;
}

export async function fetchIspCredentialsStatus(signal?: AbortSignal) {
  return getJson<IspCredentialsStatus>("/isp/api/admin/credentials", signal);
}

/** POST tokens to isp-dash private store. Never write these into theme_settings. */
export async function postIspCredentials(
  body: { iproyal_api_token?: string; iproyal_session_token?: string },
  signal?: AbortSignal,
) {
  const response = await fetchWithTimeout(
    "/isp/api/admin/credentials",
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    REQUEST_TIMEOUT_MS,
  );
  const json = (await response.json().catch(() => ({}))) as IspCredentialsStatus;
  if (!response.ok) {
    throw new Error(json.error || `/isp/api/admin/credentials ${response.status}`);
  }
  return json;
}


