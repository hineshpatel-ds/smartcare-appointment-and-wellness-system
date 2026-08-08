import { useCallback, useState } from 'react';

const runtimeConfig = window.__SAWS_CONFIG__ || {};
const defaultApiBase = runtimeConfig.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function useApi() {
  const [apiBase] = useState(localStorage.getItem('sawsApiBase') || defaultApiBase);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || payload.message || 'Request failed');
    return payload;
  }, [apiBase]);

  return { request, apiBase };
}
