
-- Fix: Drop restrictive policies and recreate as permissive for transaksi_zakat DELETE
DROP POLICY IF EXISTS "Admin can delete transaksi_zakat" ON public.transaksi_zakat;
DROP POLICY IF EXISTS "Panitia can delete own transaksi_zakat" ON public.transaksi_zakat;

CREATE POLICY "Admin can delete transaksi_zakat" ON public.transaksi_zakat
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Panitia can delete own transaksi_zakat" ON public.transaksi_zakat
FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix detail_zakat DELETE policies
DROP POLICY IF EXISTS "Admin can delete detail_zakat" ON public.detail_zakat;
DROP POLICY IF EXISTS "Panitia can delete own detail_zakat" ON public.detail_zakat;

CREATE POLICY "Admin can delete detail_zakat" ON public.detail_zakat
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Panitia can delete own detail_zakat" ON public.detail_zakat
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.transaksi_zakat t WHERE t.id = detail_zakat.transaksi_id AND t.created_by = auth.uid())
);

-- Fix mustahik DELETE policies
DROP POLICY IF EXISTS "Admin can delete mustahik" ON public.mustahik;
DROP POLICY IF EXISTS "Panitia can delete own mustahik" ON public.mustahik;

CREATE POLICY "Admin can delete mustahik" ON public.mustahik
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Panitia can delete own mustahik" ON public.mustahik
FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix distribusi DELETE policies
DROP POLICY IF EXISTS "Admin can delete distribusi" ON public.distribusi;
DROP POLICY IF EXISTS "Panitia can delete own distribusi" ON public.distribusi;

CREATE POLICY "Admin can delete distribusi" ON public.distribusi
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Panitia can delete own distribusi" ON public.distribusi
FOR DELETE TO authenticated USING (auth.uid() = created_by);
