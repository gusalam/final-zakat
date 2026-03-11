
CREATE OR REPLACE FUNCTION public.get_zakat_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'total_distribusi_beras', COALESCE((SELECT SUM(jumlah_beras) FROM distribusi WHERE jenis_bantuan = 'Beras'), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM transaksi_zakat),
    'total_distribusi_count', (SELECT COUNT(*) FROM distribusi),
    'total_mustahik_count', (SELECT COUNT(*) FROM mustahik)
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_zakat_stats_filtered(_start_date date DEFAULT NULL::date, _end_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'total_distribusi_beras', COALESCE((SELECT SUM(jumlah_beras) FROM distribusi WHERE jenis_bantuan = 'Beras' AND (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)), 0),
    'total_zakat_count', (SELECT COUNT(*) FROM transaksi_zakat WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_distribusi_count', (SELECT COUNT(*) FROM distribusi WHERE (_start_date IS NULL OR tanggal >= _start_date) AND (_end_date IS NULL OR tanggal <= _end_date)),
    'total_mustahik_count', (SELECT COUNT(*) FROM mustahik)
  )
$function$;
