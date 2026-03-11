import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';

interface InfiniteTickerListProps {
  data: any[];
  visibleCount: number;
  renderRow: (item: any, index: number) => ReactNode;
  durationPerItem?: number;
  isPaused?: boolean;
  rowHeightEstimate?: number;
}

export default function InfiniteTickerList({
  data,
  visibleCount,
  renderRow,
  durationPerItem = 3,
  isPaused = false,
  rowHeightEstimate = 80,
}: InfiniteTickerListProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);

  const containerHeight = visibleCount * rowHeightEstimate;
  const paused = isPaused || isHovered;
  const duration = data.length * durationPerItem;

  // Measure first copy height after render
  useEffect(() => {
    if (!innerRef.current || data.length <= visibleCount) return;
    const measure = () => {
      const el = innerRef.current;
      if (!el) return;
      // First child div is the first copy
      const firstCopy = el.firstElementChild as HTMLElement;
      if (firstCopy) {
        const h = firstCopy.scrollHeight;
        if (h > 0) setScrollDist(h);
      }
    };
    // Delay to ensure DOM is painted
    const id = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(id);
  }, [data, visibleCount]);

  const handlePause = useCallback(() => setIsHovered(true), []);
  const handleResume = useCallback(() => setIsHovered(false), []);

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground text-base py-8 px-4">Belum ada data</p>;
  }

  if (data.length <= visibleCount) {
    return (
      <div>
        {data.map((item, i) => (
          <div key={i}>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  const dist = scrollDist || data.length * rowHeightEstimate;

  return (
    <div
      className="overflow-hidden relative"
      style={{ height: containerHeight }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 z-10 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-card to-transparent" />

      <div
        ref={innerRef}
        key={`ticker-${data.length}`}
        className="ticker-scroll"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          '--ticker-distance': `-${dist}px`,
        } as React.CSSProperties}
      >
        <div>
          {data.map((item, i) => (
            <div key={`a-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
        <div aria-hidden="true">
          {data.map((item, i) => (
            <div key={`b-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
