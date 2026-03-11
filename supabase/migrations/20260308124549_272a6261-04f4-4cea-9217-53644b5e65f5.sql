
-- Add nomor_kwitansi column to zakat table with auto-increment
ALTER TABLE public.zakat ADD COLUMN IF NOT EXISTS nomor_kwitansi serial;

-- Add jumlah_jiwa column to zakat table
ALTER TABLE public.zakat ADD COLUMN IF NOT EXISTS jumlah_jiwa integer NOT NULL DEFAULT 1;

-- Update existing Shodaqoh records to Infaq
UPDATE public.zakat SET jenis_zakat = 'Infaq' WHERE jenis_zakat = 'Shodaqoh';
