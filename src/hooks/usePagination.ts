import { useState, useCallback } from 'react';

const PAGE_SIZE = 50;

export function usePagination(initialPageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = initialPageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const goNext = useCallback(() => setPage(p => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);
  // goTo accepts 1-indexed page number for easier use
  const goTo = useCallback((p: number) => setPage(Math.max(0, p - 1)), []);
  const reset = useCallback(() => setPage(0), []);

  // Safe setTotalCount that also validates current page
  const safeSetTotalCount = useCallback((count: number) => {
    setTotalCount(count);
    // Auto-reset to first page if current page is out of bounds
    const maxPage = Math.max(0, Math.ceil(count / pageSize) - 1);
    setPage(p => p > maxPage ? 0 : p);
  }, [pageSize]);

  return { 
    page, 
    totalCount, 
    setTotalCount: safeSetTotalCount, 
    totalPages, 
    from, 
    to, 
    pageSize, 
    goNext, 
    goPrev, 
    goTo, 
    reset 
  };
}
