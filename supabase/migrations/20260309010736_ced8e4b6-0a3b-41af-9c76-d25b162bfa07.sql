-- Tambah index untuk performa query yang sering digunakan
CREATE INDEX IF NOT EXISTS idx_transaksi_zakat_tanggal ON public.transaksi_zakat(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_zakat_rt_id ON public.transaksi_zakat(rt_id) WHERE rt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaksi_zakat_nama ON public.transaksi_zakat USING gin(nama_muzakki gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_detail_zakat_transaksi ON public.detail_zakat(transaksi_id);
CREATE INDEX IF NOT EXISTS idx_detail_zakat_jenis ON public.detail_zakat(jenis_zakat);

CREATE INDEX IF NOT EXISTS idx_distribusi_tanggal ON public.distribusi(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_distribusi_mustahik ON public.distribusi(mustahik_id);
CREATE INDEX IF NOT EXISTS idx_distribusi_sumber ON public.distribusi(sumber_zakat);
CREATE INDEX IF NOT EXISTS idx_distribusi_jenis_bantuan ON public.distribusi(jenis_bantuan);

CREATE INDEX IF NOT EXISTS idx_mustahik_rt ON public.mustahik(rt_id) WHERE rt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mustahik_nama ON public.mustahik USING gin(nama gin_trgm_ops);

-- Enable pg_trgm extension for trigram-based searches (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add foreign key constraints yang mungkin belum ada
ALTER TABLE public.detail_zakat
DROP CONSTRAINT IF EXISTS detail_zakat_transaksi_id_fkey,
ADD CONSTRAINT detail_zakat_transaksi_id_fkey 
  FOREIGN KEY (transaksi_id) 
  REFERENCES public.transaksi_zakat(id) 
  ON DELETE CASCADE;

ALTER TABLE public.distribusi
DROP CONSTRAINT IF EXISTS distribusi_mustahik_id_fkey,
ADD CONSTRAINT distribusi_mustahik_id_fkey 
  FOREIGN KEY (mustahik_id) 
  REFERENCES public.mustahik(id) 
  ON DELETE RESTRICT;

ALTER TABLE public.transaksi_zakat
DROP CONSTRAINT IF EXISTS transaksi_zakat_rt_id_fkey,
ADD CONSTRAINT transaksi_zakat_rt_id_fkey 
  FOREIGN KEY (rt_id) 
  REFERENCES public.rt(id) 
  ON DELETE SET NULL;

ALTER TABLE public.mustahik
DROP CONSTRAINT IF EXISTS mustahik_rt_id_fkey,
ADD CONSTRAINT mustahik_rt_id_fkey 
  FOREIGN KEY (rt_id) 
  REFERENCES public.rt(id) 
  ON DELETE SET NULL;

-- Add constraints untuk validasi data
ALTER TABLE public.detail_zakat
DROP CONSTRAINT IF EXISTS detail_zakat_jumlah_uang_check,
ADD CONSTRAINT detail_zakat_jumlah_uang_check 
  CHECK (jumlah_uang >= 0);

ALTER TABLE public.detail_zakat
DROP CONSTRAINT IF EXISTS detail_zakat_jumlah_beras_check,
ADD CONSTRAINT detail_zakat_jumlah_beras_check 
  CHECK (jumlah_beras >= 0);

ALTER TABLE public.detail_zakat
DROP CONSTRAINT IF EXISTS detail_zakat_jumlah_jiwa_check,
ADD CONSTRAINT detail_zakat_jumlah_jiwa_check 
  CHECK (jumlah_jiwa >= 0);

ALTER TABLE public.distribusi
DROP CONSTRAINT IF EXISTS distribusi_jumlah_check,
ADD CONSTRAINT distribusi_jumlah_check 
  CHECK (jumlah >= 0);

ALTER TABLE public.distribusi
DROP CONSTRAINT IF EXISTS distribusi_jumlah_beras_check,
ADD CONSTRAINT distribusi_jumlah_beras_check 
  CHECK (jumlah_beras >= 0);

-- Pastikan jenis_zakat hanya nilai yang valid
ALTER TABLE public.detail_zakat
DROP CONSTRAINT IF EXISTS detail_zakat_jenis_zakat_check,
ADD CONSTRAINT detail_zakat_jenis_zakat_check 
  CHECK (jenis_zakat IN ('Zakat Fitrah', 'Zakat Mal', 'Infaq', 'Shodaqoh', 'Fidyah'));

-- Pastikan jenis_bantuan hanya nilai yang valid
ALTER TABLE public.distribusi
DROP CONSTRAINT IF EXISTS distribusi_jenis_bantuan_check,
ADD CONSTRAINT distribusi_jenis_bantuan_check 
  CHECK (jenis_bantuan IN ('Uang', 'Beras'));

-- Pastikan sumber_zakat hanya nilai yang valid
ALTER TABLE public.distribusi
DROP CONSTRAINT IF EXISTS distribusi_sumber_zakat_check,
ADD CONSTRAINT distribusi_sumber_zakat_check 
  CHECK (sumber_zakat IN ('Zakat Fitrah', 'Zakat Mal', 'Infaq', 'Fidyah'));

-- Unique constraint untuk mencegah duplikasi nama RT
ALTER TABLE public.rt
DROP CONSTRAINT IF EXISTS rt_nama_rt_unique,
ADD CONSTRAINT rt_nama_rt_unique UNIQUE (nama_rt);

-- Constraint untuk user_roles: satu user hanya bisa punya satu role
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_unique,
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);