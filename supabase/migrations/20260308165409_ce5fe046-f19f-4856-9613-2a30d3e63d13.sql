
ALTER TABLE public.distribusi
  ADD COLUMN IF NOT EXISTS sumber_zakat text DEFAULT 'Zakat Fitrah',
  ADD COLUMN IF NOT EXISTS jenis_bantuan text DEFAULT 'Uang',
  ADD COLUMN IF NOT EXISTS jumlah_beras numeric DEFAULT 0;
