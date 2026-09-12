type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type ApiError = Error & { status?: number; details?: unknown };

const TOKEN_KEY = 'moodsic-access-token';
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || (import.meta.env.DEV ? '/backend' : '');

function createApiError(status: number, details: unknown): ApiError {
  const message = typeof details === 'string'
    ? details
    : typeof details === 'object' && details !== null && 'detail' in details
      ? String((details as { detail: unknown }).detail)
      : `Request failed with status ${status}`;
  const error = new Error(message) as ApiError;
  error.status = status;
  error.details = details;
  return error;
}

const api = {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    window.localStorage.removeItem(TOKEN_KEY);
  },

  async apiFetch<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');

    const token = api.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new Error('Unable to reach the MOOSIC server. Start the backend on port 8000 and try again.');
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) throw createApiError(response.status, payload);
    return payload as T;
  },
};

export default api;
