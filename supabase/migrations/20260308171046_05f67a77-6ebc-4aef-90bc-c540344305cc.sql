-- Remove duplicate distribusi rows, keeping the earliest created one
DELETE FROM public.distribusi
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY mustahik_id, sumber_zakat, tanggal ORDER BY created_at ASC) as rn
    FROM public.distribusi
  ) sub WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX distribusi_mustahik_sumber_tanggal_idx ON public.distribusi (mustahik_id, sumber_zakat, tanggal);