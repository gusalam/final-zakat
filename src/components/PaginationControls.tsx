import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (p: number) => void;
}

export default function PaginationControls({ page, totalPages, totalCount, onNext, onPrev, onGoTo }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(0, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
      <p className="text-sm text-muted-foreground">
        Total: <strong>{totalCount}</strong> data · Halaman {page + 1} dari {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-9" onClick={() => onGoTo(p + 1)}>
            {p + 1}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
