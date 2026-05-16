'use client';

/**
 * Frontend fetch wrapper with:
 * - Automatic JSON parsing
 * - Network timeout (default 15s)
 * - 401 session-expiry redirect to login
 * - Structured { data, error, status } return — never throws
 *
 * Usage:
 *   const { data, error } = await safeFetch('/api/goals', { method: 'POST', body: JSON.stringify(payload) });
 *   if (error) { toast(error, 'error'); return; }
 */
export async function safeFetch(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);

    // Session expired — redirect to login
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=session_expired';
      }
      return { data: null, error: 'Session expired. Redirecting to login…', status: 401 };
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => ({}));
    } else {
      // Non-JSON response (e.g. HTML error page)
      const text = await res.text().catch(() => '');
      return {
        data: null,
        error: `Server returned unexpected response (${res.status}): ${text.substring(0, 120)}`,
        status: res.status,
      };
    }

    if (!res.ok) {
      return {
        data: null,
        error: data?.error || data?.message || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    return { data, error: null, status: res.status };
  } catch (err) {
    clearTimeout(timer);

    if (err?.name === 'AbortError') {
      return { data: null, error: 'Request timed out. Check your connection and try again.', status: 0 };
    }

    // Network failure (offline, DNS error, etc.)
    return { data: null, error: 'Network error. Check your internet connection.', status: 0 };
  }
}
