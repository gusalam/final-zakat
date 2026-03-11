import { ReactNode, useMemo, useRef, useEffect, useState } from 'react';

interface RunningListWrapperProps {
  data: any[];
  offset: number;
  visibleCount: number;
  onPause: () => void;
  onResume: () => void;
  renderRow: (item: any, index: number) => ReactNode;
}

/**
 * True running list: renders visibleCount+1 rows and uses CSS translateY
 * to smoothly slide up by one row height, then snaps and advances.
 */
export default function AutoScrollTableWrapper({
  data,
  offset,
  visibleCount,
  onPause,
  onResume,
  renderRow,
}: RunningListWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(48);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevOffset = useRef(offset);

  // Measure row height from first rendered row
  useEffect(() => {
    if (containerRef.current) {
      const firstRow = containerRef.current.querySelector('[data-row]') as HTMLElement;
      if (firstRow) {
        setRowHeight(firstRow.offsetHeight);
      }
    }
  });

  // Detect offset change → trigger animation
  useEffect(() => {
    if (offset !== prevOffset.current && data.length > visibleCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        prevOffset.current = offset;
      }, 800); // match CSS transition duration
      return () => clearTimeout(timer);
    }
    prevOffset.current = offset;
  }, [offset, data.length, visibleCount]);

  // Build rows: visibleCount + 1 for the sliding effect
  const displayRows = useMemo(() => {
    if (data.length === 0) return [];
    const count = Math.min(visibleCount + 1, data.length);
    // Start from one before current offset when animating, to show the slide
    const startIdx = isAnimating
      ? (offset - 1 + data.length) % data.length
      : offset;
    const rows: { item: any; idx: number }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (startIdx + i) % data.length;
      rows.push({ item: data[idx], idx });
    }
    return rows;
  }, [data, offset, visibleCount, isAnimating]);

  const translateY = isAnimating ? -rowHeight : 0;

  return (
    <div
      onMouseDown={onPause}
      onMouseUp={onResume}
      onMouseLeave={onResume}
      onTouchStart={onPause}
      onTouchEnd={onResume}
      className="select-none overflow-hidden"
      style={{ maxHeight: rowHeight * visibleCount }}
      ref={containerRef}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isAnimating ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {displayRows.map(({ item, idx }) => (
          <div key={`row-${idx}`} data-row>
            {renderRow(item, idx)}
          </div>
        ))}
      </div>
    </div>
  );
}
