-- Backfill alamat_muzakki using RT name for records that have rt_id
UPDATE transaksi_zakat
SET alamat_muzakki = rt.nama_rt
FROM rt
WHERE transaksi_zakat.rt_id = rt.id
  AND transaksi_zakat.alamat_muzakki IS NULL;

-- Backfill remaining null alamat_muzakki with default
UPDATE transaksi_zakat
SET alamat_muzakki = 'Belum diisi'
WHERE alamat_muzakki IS NULL;

-- Backfill mustahik alamat (currently 0 but just in case)
UPDATE mustahik
SET alamat = 'Belum diisi'
WHERE alamat IS NULL;