'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reusable hook for data fetching with auto-refresh, manual refresh, and error handling.
 * Only triggers a re-render when data actually changes (deep comparison via JSON hash).
 * @param {string} url - API endpoint
 * @param {object} options - { autoRefresh: true, interval: 10000, transform: (data) => data }
 */
export function useDataFetcher(url, options = {}) {
  const { autoRefresh = true, interval = 10000, transform, enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);
  const dataHashRef = useRef(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!enabled || !url) return;
    if (!isBackground) setLoading(true);
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

        // Always update the refresh timestamp
        setLastUpdated(new Date());

        // Only update data state (and trigger re-render) if data actually changed
        if (newHash !== dataHashRef.current) {
          dataHashRef.current = newHash;
          setData(transformed);
        }

        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load data');
        if (!isBackground) setLoading(false);
      }
    }
  }, [url, transform, enabled]);

  const refresh = useCallback(() => fetchData(false), [fetchData]);
  const backgroundRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData(false);
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(backgroundRefresh, interval);
      return () => clearInterval(intervalRef.current);
    }
  }, [autoRefresh, interval, backgroundRefresh, enabled]);

  return { data, loading, error, refresh, lastUpdated };
}
