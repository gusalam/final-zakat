import { useState } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date?: string) => void;
  onEndDateChange: (date?: string) => void;
}

export default function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangeFilterProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const startDateObj = startDate ? new Date(startDate + 'T00:00:00') : undefined;
  const endDateObj = endDate ? new Date(endDate + 'T00:00:00') : undefined;

  const handleQuickFilter = (preset: string) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (preset) {
      case 'today':
        const today = format(now, 'yyyy-MM-dd');
        onStartDateChange(today);
        onEndDateChange(today);
        break;
      case 'this_week': {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        onStartDateChange(format(monday, 'yyyy-MM-dd'));
        onEndDateChange(format(now, 'yyyy-MM-dd'));
        break;
      }
      case 'this_month':
        onStartDateChange(`${y}-${String(m + 1).padStart(2, '0')}-01`);
        onEndDateChange(format(now, 'yyyy-MM-dd'));
        break;
      case 'this_year':
        onStartDateChange(`${y}-01-01`);
        onEndDateChange(format(now, 'yyyy-MM-dd'));
        break;
      case 'all':
        onStartDateChange(undefined);
        onEndDateChange(undefined);
        break;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap items-center">
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('w-[150px] sm:w-[170px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0" />
              {startDateObj ? format(startDateObj, 'd MMM yyyy', { locale: localeId }) : 'Dari tanggal'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDateObj}
              onSelect={d => { onStartDateChange(d ? format(d, 'yyyy-MM-dd') : undefined); setStartOpen(false); }}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">—</span>

        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('w-[150px] sm:w-[170px] justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0" />
              {endDateObj ? format(endDateObj, 'd MMM yyyy', { locale: localeId }) : 'Sampai tanggal'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDateObj}
              onSelect={d => { onEndDateChange(d ? format(d, 'yyyy-MM-dd') : undefined); setEndOpen(false); }}
              disabled={date => startDateObj ? date < startDateObj : false}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('all')} className="h-8 px-2">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'today', label: 'Hari ini' },
          { key: 'this_week', label: 'Minggu ini' },
          { key: 'this_month', label: 'Bulan ini' },
          { key: 'this_year', label: 'Tahun ini' },
          { key: 'all', label: 'Semua' },
        ].map(p => (
          <Button key={p.key} variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => handleQuickFilter(p.key)}>
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
