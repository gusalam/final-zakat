import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Cari...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`pl-10 md:pl-11 text-base h-11 md:h-12 ${value ? 'pr-10' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Hapus pencarian"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      )}
    </div>
  );
}
