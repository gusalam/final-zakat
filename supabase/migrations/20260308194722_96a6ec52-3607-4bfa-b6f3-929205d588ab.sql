
-- Enable pg_trgm extension for text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes to speed up pagination and search queries
CREATE INDEX IF NOT EXISTS idx_transaksi_zakat_tanggal_desc ON public.transaksi_zakat (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_zakat_nama_muzakki ON public.transaksi_zakat USING gin (nama_muzakki gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_detail_zakat_transaksi_id ON public.detail_zakat (transaksi_id);
CREATE INDEX IF NOT EXISTS idx_distribusi_tanggal_desc ON public.distribusi (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_distribusi_mustahik_id ON public.distribusi (mustahik_id);
CREATE INDEX IF NOT EXISTS idx_mustahik_nama ON public.mustahik USING gin (nama gin_trgm_ops);
