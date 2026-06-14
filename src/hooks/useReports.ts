// useReports — data-fetching hook for the reports list.
// Owns loading state, error state, refetch, and pagination.

import { useState, useEffect, useCallback } from 'react';
import { getReports, type ReportWithProfile } from '../services/reportsService';
import type { Report } from '../types/database';

interface UseReportsOptions {
  status?: Report['status'];
}

export function useReports({ status }: UseReportsOptions = {}) {
  const [data, setData] = useState<ReportWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pageNum: number, reset: boolean) => {
    if (reset) setLoading(true);
    const result = await getReports(pageNum, status);
    if (result.ok) {
      setData((prev) => (reset ? result.data : [...prev, ...result.data]));
      setHasMore(result.data.length === 20);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
    setRefreshing(false);
  }, [status]);

  useEffect(() => {
    setPage(0);
    load(0, true);
  }, [load]);

  function refresh() {
    setRefreshing(true);
    setPage(0);
    load(0, true);
  }

  function loadMore() {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    load(next, false);
  }

  return { data, loading, refreshing, error, hasMore, refresh, loadMore };
}
