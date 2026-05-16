'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reusable hook for data fetching with manual refresh and error handling.
 * Only triggers a re-render when data actually changes (deep comparison via JSON hash).
 * @param {string} url - API endpoint
 * @param {object} options - { transform: (data) => data, enabled: true }
 */
export function useDataFetcher(url, options = {}) {
  const { transform, enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);
  const dataHashRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      if (mountedRef.current) {
        const transformed = transform ? transform(json) : json;
        const newHash = JSON.stringify(transformed);

        setLastUpdated(new Date());

        // Only update data state if data actually changed
        if (newHash !== dataHashRef.current) {
          dataHashRef.current = newHash;
          setData(transformed);
        }

        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
  }, [url, transform, enabled]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refresh, lastUpdated };
}
