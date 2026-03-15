const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const BASE_URL = `${WORKER_URL}/api/v1`;

function getAuthToken(): string {
  // Prefer CF Access JWT from cookie
  const match = document.cookie.match(/CF_Authorization=([^;]+)/);
  if (match) return match[1];
  // Fall back to demo JWT from localStorage
  return localStorage.getItem('demo_jwt') || '';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cf-Access-Jwt-Assertion': getAuthToken(),
      ...options.headers,
    },
  });

  if (response.status === 204) return null as T;

  const data = await response.json().catch(() => ({ error: 'Request failed' }));

  if (!response.ok) {
    throw new ApiError(
      data.error || `HTTP ${response.status}`,
      response.status,
      data.code
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
