import { useState, useEffect, useRef } from 'react';

/**
 * Returns a key that increments on an interval, forcing re-mount of chart components
 * to trigger their built-in entry animations in a loop.
 */
export function useAnimationLoop(intervalMs: number) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setKey((k) => k + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return key;
}

/**
 * Animates a number from 0 to `target` over `duration` ms using requestAnimationFrame.
 * Restarts every `loopInterval` ms.
 */
export function useCountUp(target: number, duration = 1500, loopInterval = 8000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const animate = () => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        // Preserve decimal precision from original target
        const decimals = (target.toString().split('.')[1] || '').length;
        const raw = eased * target;
        setValue(decimals > 0 ? parseFloat(raw.toFixed(decimals)) : Math.round(raw));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    animate();

    timerRef.current = setInterval(() => {
      cancelAnimationFrame(rafRef.current);
      setValue(0);
      // Small delay before restarting so the "0" is visible briefly
      setTimeout(animate, 100);
    }, loopInterval);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(timerRef.current);
    };
  }, [target, duration, loopInterval]);

  return value;
}

/**
 * Format an animated number as currency
 */
export function useCountUpCurrency(target: number, loopInterval = 8000) {
  const value = useCountUp(target, 1500, loopInterval);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}
