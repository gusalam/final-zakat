
-- 1. Add created_by column to mustahik table
ALTER TABLE public.mustahik ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Add DELETE policy for panitia on transaksi_zakat (own data only)
CREATE POLICY "Panitia can delete own transaksi_zakat"
ON public.transaksi_zakat
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 3. Add DELETE policy for panitia on detail_zakat (via parent transaksi ownership)
CREATE POLICY "Panitia can delete own detail_zakat"
ON public.detail_zakat
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transaksi_zakat t
    WHERE t.id = detail_zakat.transaksi_id
    AND t.created_by = auth.uid()
  )
);

-- 4. Add DELETE policy for panitia on distribusi (own data only)
CREATE POLICY "Panitia can delete own distribusi"
ON public.distribusi
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 5. Add DELETE policy for panitia on mustahik (own data only)
CREATE POLICY "Panitia can delete own mustahik"
ON public.mustahik
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
