
-- 1. Create transaksi_zakat table
CREATE TABLE public.transaksi_zakat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_muzakki text NOT NULL,
  status_muzakki text DEFAULT 'RT',
  rt_id uuid REFERENCES public.rt(id),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  nomor_kwitansi serial NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2. Create detail_zakat table
CREATE TABLE public.detail_zakat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaksi_id uuid NOT NULL REFERENCES public.transaksi_zakat(id) ON DELETE CASCADE,
  jenis_zakat text NOT NULL,
  jumlah_uang numeric DEFAULT 0,
  jumlah_beras numeric DEFAULT 0,
  jumlah_jiwa integer DEFAULT 0
);

-- 3. Enable RLS
ALTER TABLE public.transaksi_zakat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_zakat ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for transaksi_zakat
CREATE POLICY "Anyone can view transaksi_zakat" ON public.transaksi_zakat FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert transaksi_zakat" ON public.transaksi_zakat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update transaksi_zakat" ON public.transaksi_zakat FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete transaksi_zakat" ON public.transaksi_zakat FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. RLS policies for detail_zakat
CREATE POLICY "Anyone can view detail_zakat" ON public.detail_zakat FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert detail_zakat" ON public.detail_zakat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update detail_zakat" ON public.detail_zakat FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete detail_zakat" ON public.detail_zakat FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Migrate existing data from zakat to new tables
INSERT INTO public.transaksi_zakat (id, nama_muzakki, status_muzakki, rt_id, tanggal, nomor_kwitansi, created_by, created_at)
SELECT id, nama_muzakki, status_muzakki, rt_id, tanggal, nomor_kwitansi, created_by, created_at
FROM public.zakat;

INSERT INTO public.detail_zakat (transaksi_id, jenis_zakat, jumlah_uang, jumlah_beras, jumlah_jiwa)
SELECT id, jenis_zakat, COALESCE(jumlah_uang, 0), COALESCE(jumlah_beras, 0), COALESCE(jumlah_jiwa, 1)
FROM public.zakat;

-- 7. Update stats functions to use new tables
CREATE OR REPLACE FUNCTION public.get_zakat_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_fitrah', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Fitrah'), 0),
    'total_mal', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Mal'), 0),
    'total_infaq', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat IN ('Infaq', 'Shodaqoh')), 0),
    'total_fidyah', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Fidyah'), 0),
    'total_zakat', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d), 0),
    'total_beras_fitrah', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d WHERE d.jenis_zakat = 'Zakat Fitrah'), 0) * 2.5,
    'total_beras_fidyah', COALESCE((SELECT SUM(d.jumlah_beras) FROM detail_zakat d WHERE d.jenis_zakat = 'Fidyah'), 0),
    'total_beras', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d WHERE d.jenis_zakat = 'Zakat Fitrah'), 0) * 2.5 + COALESCE((SELECT SUM(d.jumlah_beras) FROM detail_zakat d WHERE d.jenis_zakat = 'Fidyah'), 0),
    'total_jiwa_fitrah', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d WHERE d.jenis_zakat = 'Zakat Fitrah'), 0),
    'total_muzakki', (SELECT COUNT(DISTINCT t.nama_muzakki) FROM transaksi_zakat t),
    'total_mustahik', (SELECT COUNT(*) FROM mustahik),
    'total_distribusi', COALESCE((SELECT SUM(jumlah) FROM distribusi), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM transaksi_zakat),
    'total_distribusi_count', (SELECT COUNT(*) FROM distribusi),
    'total_mustahik_count', (SELECT COUNT(*) FROM mustahik)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_zakat_stats_filtered(_start_date date DEFAULT NULL::date, _end_date date DEFAULT NULL::date)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_fitrah', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_mal', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Mal' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_infaq', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat IN ('Infaq', 'Shodaqoh') AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_fidyah', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Fidyah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_zakat', COALESCE((SELECT SUM(d.jumlah_uang) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_beras_fitrah', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0) * 2.5,
    'total_beras_fidyah', COALESCE((SELECT SUM(d.jumlah_beras) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Fidyah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_beras', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0) * 2.5 + COALESCE((SELECT SUM(d.jumlah_beras) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Fidyah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_jiwa_fitrah', COALESCE((SELECT SUM(d.jumlah_jiwa) FROM detail_zakat d JOIN transaksi_zakat t ON t.id = d.transaksi_id WHERE d.jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)), 0),
    'total_muzakki', (SELECT COUNT(DISTINCT t.nama_muzakki) FROM transaksi_zakat t WHERE (_start_date IS NULL OR t.tanggal >= _start_date) AND (_end_date IS NULL OR t.tanggal <= _end_date)),
    'total_mustahik', (SELECT COUNT(*) FROM mustahik),
    'total_distribusi', COALESCE((SELECT SUM(jumlah) FROM distribusi WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM transaksi_zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_distribusi_count', (SELECT COUNT(*) FROM distribusi WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_mustahik_count', (SELECT COUNT(*) FROM mustahik)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_zakat_per_rt()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
  FROM (
    SELECT
      rt.nama_rt,
      COUNT(DISTINCT t.nama_muzakki) as total_muzakki,
      COALESCE(SUM(CASE WHEN d.jenis_zakat = 'Zakat Fitrah' THEN d.jumlah_jiwa ELSE 0 END), 0) as total_jiwa_fitrah,
      COALESCE(SUM(d.jumlah_uang), 0) as total_zakat
    FROM transaksi_zakat t
    JOIN detail_zakat d ON d.transaksi_id = t.id
    JOIN rt ON rt.id = t.rt_id
    GROUP BY rt.nama_rt
    ORDER BY rt.nama_rt
  ) sub
$$;
