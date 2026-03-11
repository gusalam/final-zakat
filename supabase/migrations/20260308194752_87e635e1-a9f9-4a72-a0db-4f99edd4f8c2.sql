
-- Drop indexes first, then move extension
DROP INDEX IF EXISTS public.idx_transaksi_zakat_nama_muzakki;
DROP INDEX IF EXISTS public.idx_mustahik_nama;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate indexes using extensions schema
CREATE INDEX idx_transaksi_zakat_nama_muzakki ON public.transaksi_zakat USING gin (nama_muzakki extensions.gin_trgm_ops);
CREATE INDEX idx_mustahik_nama ON public.mustahik USING gin (nama extensions.gin_trgm_ops);
