
ALTER TABLE public.mustahik
  ADD COLUMN IF NOT EXISTS alamat text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'RT';
