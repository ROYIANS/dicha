/**
 * Reads the csrf-token cookie set by csrf-csrf middleware.
 * Returns null if cookie not found (e.g., in dev bypass mode).
 */
export function getCsrfToken(): string | null {
  const cookies = document.cookie.split('; ');
  const csrfCookie = cookies.find((c) => c.startsWith('csrf-token='));
  return csrfCookie ? csrfCookie.split('=')[1] || null : null;
}

/**
 * Returns headers object with CSRF token for mutations.
 * Use with ts-rest client or fetch mutations.
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}
