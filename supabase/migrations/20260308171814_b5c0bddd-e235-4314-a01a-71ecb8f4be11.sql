CREATE OR REPLACE FUNCTION public.get_zakat_per_rt()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      rt.nama_rt,
      COUNT(DISTINCT z.nama_muzakki) as total_muzakki,
      COALESCE(SUM(CASE WHEN z.jenis_zakat = 'Zakat Fitrah' THEN z.jumlah_jiwa ELSE 0 END), 0) as total_jiwa_fitrah,
      COALESCE(SUM(z.jumlah_uang), 0) as total_zakat
    FROM zakat z
    JOIN rt ON rt.id = z.rt_id
    GROUP BY rt.nama_rt
    ORDER BY rt.nama_rt
  ) t
$$;