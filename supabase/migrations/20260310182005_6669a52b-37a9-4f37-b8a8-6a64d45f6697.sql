ALTER TABLE public.detail_zakat 
  ADD COLUMN IF NOT EXISTS metode_pembayaran text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS harga_beras_per_liter numeric DEFAULT NULL;