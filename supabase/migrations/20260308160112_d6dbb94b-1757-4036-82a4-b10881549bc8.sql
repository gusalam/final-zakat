
CREATE OR REPLACE FUNCTION public.get_zakat_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_fitrah', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Zakat Fitrah'), 0),
    'total_mal', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Zakat Mal'), 0),
    'total_infaq', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat IN ('Infaq', 'Shodaqoh')), 0),
    'total_fidyah', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Fidyah'), 0),
    'total_zakat', COALESCE((SELECT SUM(jumlah_uang) FROM zakat), 0),
    'total_beras', COALESCE((SELECT SUM(jumlah_beras) FROM zakat), 0),
    'total_jiwa_fitrah', COALESCE((SELECT SUM(jumlah_jiwa) FROM zakat WHERE jenis_zakat = 'Zakat Fitrah'), 0),
    'total_muzakki', (SELECT COUNT(DISTINCT nama_muzakki) FROM zakat),
    'total_mustahik', (SELECT COUNT(*) FROM mustahik),
    'total_distribusi', COALESCE((SELECT SUM(jumlah) FROM distribusi), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM zakat),
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
    'total_fitrah', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_mal', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Zakat Mal' AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_infaq', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat IN ('Infaq', 'Shodaqoh') AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_fidyah', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE jenis_zakat = 'Fidyah' AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_zakat', COALESCE((SELECT SUM(jumlah_uang) FROM zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_beras', COALESCE((SELECT SUM(jumlah_beras) FROM zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_jiwa_fitrah', COALESCE((SELECT SUM(jumlah_jiwa) FROM zakat WHERE jenis_zakat = 'Zakat Fitrah' AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_muzakki', (SELECT COUNT(DISTINCT nama_muzakki) FROM zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_mustahik', (SELECT COUNT(*) FROM mustahik),
    'total_distribusi', COALESCE((SELECT SUM(jumlah) FROM distribusi WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_distribusi_count', (SELECT COUNT(*) FROM distribusi WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_mustahik_count', (SELECT COUNT(*) FROM mustahik)
  )
$$;
