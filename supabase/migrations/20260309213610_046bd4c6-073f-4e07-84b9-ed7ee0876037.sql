ALTER TABLE public.transaksi_zakat 
ADD CONSTRAINT transaksi_zakat_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);