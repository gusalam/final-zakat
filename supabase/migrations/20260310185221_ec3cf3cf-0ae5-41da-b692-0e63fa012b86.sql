
-- Remove panitia's ability to delete their own transaksi_zakat
DROP POLICY IF EXISTS "Panitia can delete own transaksi_zakat" ON public.transaksi_zakat;

-- Remove panitia's ability to delete their own detail_zakat
DROP POLICY IF EXISTS "Panitia can delete own detail_zakat" ON public.detail_zakat;

-- Restrict UPDATE on transaksi_zakat to admin only
DROP POLICY IF EXISTS "Authenticated can update transaksi_zakat" ON public.transaksi_zakat;
CREATE POLICY "Admin can update transaksi_zakat" ON public.transaksi_zakat
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict UPDATE on detail_zakat to admin only
DROP POLICY IF EXISTS "Authenticated can update detail_zakat" ON public.detail_zakat;
CREATE POLICY "Admin can update detail_zakat" ON public.detail_zakat
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
