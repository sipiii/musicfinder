const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function api(path, options = {}) {
  const { headers = {}, ...rest } = options;
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest
  });
}
