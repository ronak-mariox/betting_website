/** The deployed backend (Render). Switched off while testing against the local backend. */
// const DEPLOYED_API_URL = 'https://betting-back-6l5y.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

/** Base URL of the auth/authorization backend — see backend/README.md. */
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || LOCAL_API_URL;

/** Thrown for any non-2xx response; `message` is the server's error message, ready to show the user. */
export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  /** Set on the one retry after a token refresh, so a second 401 isn't retried again. */
  retried?: boolean;
};

export type TokenPair = { accessToken: string; refreshToken: string };

/**
 * Access tokens last 15 minutes. Pages pass the token they have in state;
 * when the server answers 401 the client swaps the pair via the refresh
 * token (once, however many requests failed together), tells AuthProvider,
 * and replays the request — so a panel left open keeps working.
 */
let activeTokens: TokenPair | null = null;
let sessionListener: { onRotate: (tokens: TokenPair) => void; onExpire: () => void } | null = null;
let rotation: Promise<string | null> | null = null;

export const bindSession = (tokens: TokenPair | null) => {
  activeTokens = tokens;
};

export const setSessionListener = (listener: typeof sessionListener) => {
  sessionListener = listener;
};

/** Returns a usable access token after `stale` was rejected, or null if the session is over. */
export async function rotateTokens(stale: string): Promise<string | null> {
  if (!activeTokens) return null;
  // Another request already refreshed while this one was in flight.
  if (activeTokens.accessToken !== stale) return activeTokens.accessToken;
  if (!rotation) {
    const { refreshToken } = activeTokens;
    rotation = (async () => {
      try {
        const next = await request<TokenPair>('/auth/refresh', { method: 'POST', body: { refreshToken } });
        activeTokens = next;
        sessionListener?.onRotate(next);
        return next.accessToken;
      } catch (err) {
        // Only a rejected refresh token ends the session — not a network blip.
        if (err instanceof ApiRequestError && err.status !== 0) {
          activeTokens = null;
          sessionListener?.onExpire();
        }
        return null;
      } finally {
        rotation = null;
      }
    })();
  }
  return rotation;
}

/** Bounds every request so a slow/unreachable API can't hang the UI (e.g. session restore on load). */
const REQUEST_TIMEOUT_MS = 10000;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, retried = false } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError(0, 'Unable to reach the server. Please check your connection.');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (response.status === 401 && accessToken && !retried) {
    const fresh = await rotateTokens(accessToken);
    if (fresh) return request<T>(path, { ...options, accessToken: fresh, retried: true });
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status})`;
    // Suspended while the panel was open: the session is over.
    if (response.status === 403 && accessToken && /suspended/i.test(message)) {
      activeTokens = null;
      sessionListener?.onExpire();
    }
    throw new ApiRequestError(response.status, message, payload?.error?.details);
  }

  return payload as T;
}

export type ApiRole = 'super-admin' | 'franchise' | 'super-agent' | 'agent' | 'player';

export type ApiUser = {
  _id: string;
  username: string;
  role: ApiRole;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  /** ISO date string, or null when not set. */
  dob: string | null;
  /** Data URI ("data:image/jpeg;base64,...") or '' when not set. */
  avatar: string;
  status: 'active' | 'suspended';
  /** Profile → Preferences (switches, `theme`, `language`). */
  preferences?: Record<string, boolean | string>;
};

export type ProfileUpdate = Partial<{
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  /** ISO date string ("YYYY-MM-DD"). */
  dob: string;
  /** Data URI ("data:image/jpeg;base64,..."), PNG/JPEG/WebP only, ~1.5MB decoded max. */
  avatar: string;
  /** Profile → Preferences toggles, keyed by setting label. */
  /** Switches (true / false) plus `theme` ('dark' | 'light') and `language` ('en' | 'hi'). */
  preferences: Record<string, boolean | string>;
}>;

export type PermissionGroup = {
  key: string;
  name: string;
  permissions: { key: string; name: string; description: string; grant: string }[];
};

export type AuthSession = {
  user: ApiUser;
  permissions: PermissionGroup[] | null;
  accessToken: string;
  refreshToken: string;
};

export const authApi = {
  login: (payload: { username: string; password: string; roleId?: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: payload }),

  me: (accessToken: string) =>
    request<{ user: ApiUser; permissions: PermissionGroup[] | null }>('/auth/me', { accessToken }),

  /** Signs out every other device of this account; this browser's session (its refresh token) stays. */
  revokeOtherSessions: (accessToken: string) =>
    request<{ revoked: number }>('/auth/sessions/revoke-others', {
      method: 'POST',
      body: { refreshToken: activeTokens?.refreshToken ?? '' },
      accessToken,
    }),

  updateProfile: (accessToken: string, payload: ProfileUpdate) =>
    request<{ user: ApiUser; permissions: PermissionGroup[] | null }>('/auth/me', {
      method: 'PATCH',
      body: payload,
      accessToken,
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),

  logout: (refreshToken: string, accessToken?: string | null) =>
    request<void>('/auth/logout', { method: 'POST', body: { refreshToken }, accessToken }),

  changePassword: (accessToken: string, payload: { currentPassword: string; newPassword: string }) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/change-password', {
      method: 'POST',
      body: payload,
      accessToken,
    }),

  /** Emails a 6-digit reset code; the reply is the same whether or not the account exists. */
  forgotPassword: (username: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { username } }),

  resetPassword: (payload: { username: string; code: string; newPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: payload }),
};

export { request as apiRequest, API_BASE_URL };
