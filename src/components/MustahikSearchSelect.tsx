import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Check, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface MustahikOption {
  id: string;
  nama: string;
  alamat: string | null;
  kategori: string | null;
  rt: { nama_rt: string } | null;
}

interface MustahikSearchSelectProps {
  value: string;
  onSelect: (id: string) => void;
  selectedLabel?: string;
}

export default function MustahikSearchSelect({ value, onSelect, selectedLabel }: MustahikSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MustahikOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(selectedLabel || '');
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch selected mustahik name on mount if value exists
  useEffect(() => {
    if (value && !displayName) {
      supabase.from('mustahik').select('nama, alamat, kategori, rt(nama_rt)').eq('id', value).single()
        .then(({ data }) => {
          if (data) {
            const m = data as unknown as MustahikOption;
            setDisplayName(formatLabel(m));
          }
        });
    }
  }, [value]);

  // Search mustahik when query changes
  useEffect(() => {
    if (!isOpen) return;
    const search = async () => {
      setLoading(true);
      let q = supabase.from('mustahik').select('id, nama, alamat, kategori, rt(nama_rt)').order('nama').limit(15);
      if (debouncedQuery.trim()) {
        q = q.ilike('nama', `%${debouncedQuery.trim()}%`);
      }
      const { data } = await q;
      setResults((data as unknown as MustahikOption[]) || []);
      setLoading(false);
    };
    search();
  }, [debouncedQuery, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatLabel = (m: MustahikOption) => {
    const parts = [m.nama];
    if (m.rt?.nama_rt) parts.push(m.rt.nama_rt);
    if (m.kategori) parts.push(m.kategori);
    return parts.join(' — ');
  };

  const handleSelect = (m: MustahikOption) => {
    onSelect(m.id);
    setDisplayName(formatLabel(m));
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setDisplayName('');
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Display selected or search input */}
      {value && !isOpen ? (
        <div
          className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => { setIsOpen(true); setQuery(''); }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{displayName}</span>
          </div>
          <X className="w-4 h-4 text-muted-foreground shrink-0 hover:text-foreground" onClick={handleClear} />
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="🔍 Cari nama mustahik..."
            value={query}
            onChange={e => { setQuery(e.target.value); if (!isOpen) setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            className="pl-9"
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-[280px] overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Memuat...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {debouncedQuery ? 'Tidak ditemukan' : 'Ketik untuk mencari...'}
            </div>
          )}
          {!loading && results.map(m => (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors",
                m.id === value && "bg-accent"
              )}
              onClick={() => handleSelect(m)}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.nama}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[m.rt?.nama_rt, m.kategori, m.alamat].filter(Boolean).join(' — ')}
                </div>
              </div>
              {m.id === value && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
