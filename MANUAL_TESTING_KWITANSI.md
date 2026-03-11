# Panduan Testing Manual - Fitur Download Kwitansi PDF

## Daftar Isi
1. [Persiapan Testing](#persiapan-testing)
2. [Skenario Testing](#skenario-testing)
3. [Verifikasi Hasil](#verifikasi-hasil)
4. [Troubleshooting](#troubleshooting)
5. [Checklist Browser Compatibility](#checklist-browser-compatibility)

---

## Persiapan Testing

### Requirement
- Akses ke aplikasi (sebagai Admin atau Panitia)
- Data transaksi zakat yang sudah ada di database
- Beberapa browser untuk cross-browser testing

### Setup Console Logging
1. Buka Developer Tools (F12 atau Ctrl+Shift+I)
2. Navigasi ke tab **Console**
3. Aktifkan filter "Info" untuk melihat semua log
4. Jaga Console tetap terbuka selama testing

### Data Test yang Direkomendasikan
Siapkan data dengan variasi berikut:
- ✅ Zakat Fitrah dengan beberapa jiwa
- ✅ Kombinasi Zakat Fitrah + Infaq
- ✅ Fidyah dengan beras
- ✅ Zakat Mal
- ✅ Data dengan alamat muzakki
- ✅ Data tanpa alamat muzakki

---

## Skenario Testing

### Test 1: Download PDF Basic
**Tujuan:** Memverifikasi fungsi download dasar bekerja

**Langkah:**
1. Login ke aplikasi (Admin atau Panitia)
2. Navigasi ke halaman Data Zakat
3. Pilih salah satu transaksi zakat
4. Klik tombol "Lihat Kwitansi"
5. Pada dialog kwitansi, klik tombol **"Download PDF"**

**Expected Result:**
- ✅ Console menampilkan log: `[PDF Download] Starting kwitansi PDF generation`
- ✅ Console menampilkan log: `[PDF Download] Creating jsPDF instance`
- ✅ Console menampilkan log: `[PDF Download] Drawing PDF layout`
- ✅ Console menampilkan log: `[PDF Download] Loading logo image`
- ✅ Console menampilkan log: `[PDF Download] Logo added successfully` atau `[PDF Download] Failed to load logo, continuing without it`
- ✅ Console menampilkan log: `[PDF Download] Adding text content`
- ✅ Console menampilkan log: `[PDF Download] Generating PDF blob`
- ✅ Console menampilkan log: `[PDF Download] Attempting browser native download`
- ✅ Console menampilkan log: `[PDF Download] Download initiated successfully via native method`
- ✅ File PDF ter-download dengan nama format: `kwitansi-zakat-[NOMOR].pdf`
- ✅ Toast notification muncul: "Kwitansi PDF berhasil diunduh"

---

### Test 2: Verifikasi Konten PDF
**Tujuan:** Memastikan konten PDF sesuai dengan data transaksi

**Langkah:**
1. Download PDF dari transaksi dengan data lengkap
2. Buka file PDF yang ter-download
3. Periksa setiap elemen

**Expected Result - Header:**
- ✅ Logo masjid muncul di sisi kiri
- ✅ Teks "BADAN AMIL ZAKAT MASJID AL-IKHLAS KEBON BARU" tampil dengan warna hijau
- ✅ Judul "KWITANSI ZAKAT" tampil dengan font tebal

**Expected Result - Data Muzakki:**
- ✅ Nomor kwitansi sesuai dengan database
- ✅ Nama muzakki sesuai dengan database
- ✅ Alamat muzakki tampil (jika ada di data)
- ✅ Jumlah jiwa tampil (untuk Zakat Fitrah)

**Expected Result - Detail Pembayaran:**
- ✅ Semua jenis zakat tercantum (Zakat Fitrah, Zakat Mal, Infaq, Fidyah)
- ✅ Jumlah uang ter-format dengan benar (Rp format Indonesia)
- ✅ Jumlah beras tampil dalam Kg dan Liter (untuk Zakat Fitrah dan Fidyah)
- ✅ Total uang dihitung dengan benar
- ✅ Terbilang jumlah total benar (dalam huruf)

**Expected Result - Footer:**
- ✅ Tanggal sesuai format Indonesia (DD/MM/YYYY)
- ✅ Lokasi: Jakarta
- ✅ Nama penerima tampil
- ✅ Layout dan spacing rapi

---

### Test 3: Multiple Downloads
**Tujuan:** Memverifikasi fungsi dapat dipanggil berulang kali

**Langkah:**
1. Download kwitansi pertama
2. Tunggu hingga selesai
3. Tutup dialog
4. Buka kwitansi yang sama atau berbeda
5. Download lagi
6. Ulangi 3-5 kali

**Expected Result:**
- ✅ Setiap download berhasil tanpa error
- ✅ Console log muncul untuk setiap proses
- ✅ Tidak ada memory leak (check via DevTools Memory tab)
- ✅ URL.revokeObjectURL dipanggil setelah 30 detik

---

### Test 4: Data Edge Cases
**Tujuan:** Menguji handling data dengan kondisi khusus

#### Test 4A: Data dengan Nilai 0
**Langkah:**
1. Download kwitansi dengan salah satu jenis zakat bernilai 0

**Expected Result:**
- ✅ Jenis zakat dengan nilai 0 tidak menampilkan angka
- ✅ Kolom tetap muncul untuk menjaga format
- ✅ Total dihitung dengan benar

#### Test 4B: Data dengan Nilai Besar
**Langkah:**
1. Download kwitansi dengan nominal > 10.000.000

**Expected Result:**
- ✅ Format angka tetap rapi dengan separator
- ✅ Terbilang menggunakan kata "juta" dengan benar
- ✅ Tidak ada text overflow

#### Test 4C: Nama Muzakki Panjang
**Langkah:**
1. Download kwitansi dengan nama muzakki > 30 karakter

**Expected Result:**
- ✅ Nama tidak terpotong
- ✅ Layout tidak rusak
- ✅ Nama tetap terbaca jelas

---

### Test 5: Fallback Method (FileSaver.js)
**Tujuan:** Memverifikasi fallback download method bekerja

**Langkah (Manual Simulation):**
1. Buka Console
2. Jalankan script untuk memaksa native download gagal:
   ```javascript
   const originalAppendChild = document.body.appendChild;
   document.body.appendChild = function() { throw new Error('Forced error'); };
   ```
3. Coba download kwitansi
4. Restore fungsi:
   ```javascript
   document.body.appendChild = originalAppendChild;
   ```

**Expected Result:**
- ✅ Console menampilkan warning: `[PDF Download] Native download failed, using FileSaver.js fallback`
- ✅ Console menampilkan: `[PDF Download] Download initiated successfully via FileSaver.js`
- ✅ File tetap ter-download
- ✅ Toast notification: "File telah diunduh menggunakan metode alternatif"

---

### Test 6: Error Handling
**Tujuan:** Memverifikasi aplikasi handle error dengan baik

#### Test 6A: Network Offline
**Langkah:**
1. Buka DevTools > Network tab
2. Set throttling ke "Offline"
3. Coba download kwitansi
4. Kembalikan ke "No throttling"

**Expected Result:**
- ✅ Jika data sudah dimuat, download tetap berhasil (proses di client-side)
- ✅ Tidak ada error di console selain network request yang gagal

#### Test 6B: Corrupt Data
**Langkah:**
1. Coba download kwitansi dengan data yang tidak lengkap (jika ada)

**Expected Result:**
- ✅ Error di-catch dengan graceful
- ✅ Console menampilkan: `[PDF Download] Failed to generate or download PDF`
- ✅ Toast error muncul: "Gagal mengunduh kwitansi PDF. Silakan coba lagi."

---

## Verifikasi Hasil

### Checklist File PDF
Setelah download, verifikasi file:

- [ ] File dapat dibuka dengan PDF reader standar (Adobe Reader, Browser)
- [ ] Ukuran file reasonable (biasanya 20-100 KB)
- [ ] Orientasi landscape (horizontal)
- [ ] Ukuran halaman custom (148mm x 210mm)
- [ ] Tidak ada corruption atau error saat membuka
- [ ] Dapat di-print tanpa masalah
- [ ] Teks dapat di-select (searchable PDF)

### Checklist Visual Quality
- [ ] Logo tampil dengan jelas (tidak blur)
- [ ] Warna hijau (#276749) konsisten
- [ ] Font readable di semua ukuran
- [ ] Border dan garis tampil dengan tajam
- [ ] Background hijau muda terlihat lembut
- [ ] Spacing dan alignment konsisten
- [ ] Tidak ada text overflow atau terpotong

---

## Troubleshooting

### Issue: PDF Tidak Ter-download

**Solusi:**
1. Check console untuk error message
2. Verifikasi pop-up blocker tidak aktif
3. Pastikan browser support Blob download
4. Coba browser lain
5. Check DevTools > Application > Local Storage untuk quota

### Issue: Logo Tidak Muncul

**Diagnosis:**
- Check console log untuk: `[PDF Download] Failed to load logo`
- Verifikasi file `src/assets/logo-masjid.webp` exists
- Check network tab untuk request logo

**Solusi:**
- Logo akan di-skip, PDF tetap ter-generate tanpa logo
- Jika perlu logo, pastikan file logo accessible

### Issue: Toast Notification Tidak Muncul

**Solusi:**
1. Check apakah Toaster component di-render di App
2. Verifikasi import `sonner` berhasil
3. Check z-index toast tidak tertutup elemen lain

### Issue: Terbilang Salah

**Diagnosis:**
- Check fungsi `terbilang()` di `src/lib/terbilang.ts`
- Verifikasi total uang dihitung dengan benar

**Solusi:**
- Update logic di `terbilang.ts` jika ditemukan bug
- Report ke developer dengan contoh angka yang salah

---

## Checklist Browser Compatibility

### Desktop Browsers

#### Google Chrome (Recommended)
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] Console logs muncul: ✅ / ❌
- [ ] FileSaver fallback tested: ✅ / ❌
- [ ] Notes: ________________________________

#### Mozilla Firefox
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] Console logs muncul: ✅ / ❌
- [ ] FileSaver fallback tested: ✅ / ❌
- [ ] Notes: ________________________________

#### Microsoft Edge
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] Console logs muncul: ✅ / ❌
- [ ] FileSaver fallback tested: ✅ / ❌
- [ ] Notes: ________________________________

#### Safari (macOS)
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] Console logs muncul: ✅ / ❌
- [ ] FileSaver fallback tested: ✅ / ❌
- [ ] Notes: ________________________________

### Mobile Browsers

#### Chrome Mobile (Android)
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] File tersimpan di: ________________________________
- [ ] Notes: ________________________________

#### Safari Mobile (iOS)
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] File tersimpan di: ________________________________
- [ ] Notes: ________________________________

#### Firefox Mobile
- [ ] Version: ________
- [ ] Download berhasil: ✅ / ❌
- [ ] File tersimpan di: ________________________________
- [ ] Notes: ________________________________

---

## Reporting Issues

Jika menemukan bug atau issue, catat informasi berikut:

### Template Bug Report
```
**Browser:** [Chrome 120 / Firefox 115 / etc]
**OS:** [Windows 11 / macOS 14 / Android 13 / etc]
**Langkah Reproduksi:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Console Logs:**
```
[Paste console logs here]
```

**Screenshot:**
[Attach if applicable]

**Data Transaksi:**
- Nomor Kwitansi: 
- Jenis Zakat: 
- Total Uang: 
```

---

## Additional Notes

### Performance Benchmarks
- Waktu generate PDF: < 2 detik (normal)
- Ukuran file PDF: 20-100 KB (average)
- Memory usage: < 50 MB increase (sementara)

### Known Limitations
- Logo image harus accessible via network
- Browser harus support Blob API
- File download location bergantung browser settings
- Mobile browser mungkin meminta permission

### Best Practices
1. Selalu check console untuk debug info
2. Test di multiple browsers sebelum production
3. Verifikasi data sebelum generate PDF
4. Gunakan data real untuk testing yang akurat

---

**Last Updated:** 2024-03-09
**Version:** 1.0
**Tested By:** _________________
**Date:** _________________
