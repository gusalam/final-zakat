import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRunningListOptions {
  totalItems: number;
  intervalMs?: number;
  isPaused?: boolean;
}

/**
 * Running list hook: advances offset by 1 row at a time, looping.
 * Returns offset for the wrapper to use with translateY animation.
 */
export function useAutoScroll({
  totalItems,
  intervalMs = 3000,
  isPaused = false,
}: UseRunningListOptions) {
  const [offset, setOffset] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();

  const paused = isPaused || isUserPaused;

  useEffect(() => {
    setOffset(0);
  }, [totalItems]);

  useEffect(() => {
    if (paused || totalItems <= 0) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setOffset((prev) => (prev + 1) % totalItems);
    }, intervalMs);

    return () => clearInterval(intervalRef.current);
  }, [paused, totalItems, intervalMs]);

  const pause = useCallback(() => setIsUserPaused(true), []);
  const resume = useCallback(() => setIsUserPaused(false), []);

  return { offset, pause, resume, isPaused: paused };
}
