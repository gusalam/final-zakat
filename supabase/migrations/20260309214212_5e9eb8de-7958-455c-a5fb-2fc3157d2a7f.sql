-- Add receipt_number column
ALTER TABLE public.transaksi_zakat ADD COLUMN IF NOT EXISTS receipt_number text;

-- Create function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_year text;
  next_seq int;
BEGIN
  current_year := to_char(COALESCE(NEW.tanggal, CURRENT_DATE), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(receipt_number FROM 'ZKT-' || current_year || '-(\d+)') AS int)
  ), 0) + 1
  INTO next_seq
  FROM transaksi_zakat
  WHERE receipt_number LIKE 'ZKT-' || current_year || '-%';
  
  NEW.receipt_number := 'ZKT-' || current_year || '-' || LPAD(next_seq::text, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_receipt_number ON public.transaksi_zakat;
CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON public.transaksi_zakat
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL)
  EXECUTE FUNCTION public.generate_receipt_number();

-- Add unique constraint
ALTER TABLE public.transaksi_zakat ADD CONSTRAINT transaksi_zakat_receipt_number_key UNIQUE (receipt_number);

-- Backfill existing rows that don't have receipt_number
DO $$
DECLARE
  rec RECORD;
  current_year text;
  seq int;
BEGIN
  FOR rec IN 
    SELECT id, tanggal FROM transaksi_zakat 
    WHERE receipt_number IS NULL 
    ORDER BY tanggal, created_at
  LOOP
    current_year := to_char(rec.tanggal, 'YYYY');
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(receipt_number FROM 'ZKT-' || current_year || '-(\d+)') AS int)
    ), 0) + 1
    INTO seq
    FROM transaksi_zakat
    WHERE receipt_number LIKE 'ZKT-' || current_year || '-%';
    
    UPDATE transaksi_zakat 
    SET receipt_number = 'ZKT-' || current_year || '-' || LPAD(seq::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END;
$$;