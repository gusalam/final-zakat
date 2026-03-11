import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { terbilang } from '@/lib/terbilang';
import logoImg from '@/assets/logo-masjid.webp';
import { KwitansiData, DetailZakatItem } from '@/components/KwitansiZakat';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const LITER_PER_JIWA = 3.5;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function getPaymentEntries(details: DetailZakatItem[]) {
  const map: Record<string, DetailZakatItem> = {};
  details.forEach(d => { map[d.jenis_zakat] = d; });
  return [
    { no: 1, name: 'Zakat Fitrah', detail: map['Zakat Fitrah'] },
    { no: 2, name: 'Zakat Mal', detail: map['Zakat Mal'] },
    { no: 3, name: 'Infaq', detail: map['Infaq'] || map['Shodaqoh'] ? { jenis_zakat: 'Infaq', jumlah_uang: (map['Infaq']?.jumlah_uang || 0) + (map['Shodaqoh']?.jumlah_uang || 0), jumlah_beras: 0, jumlah_jiwa: 0 } as DetailZakatItem : undefined },
    { no: 4, name: 'Fidyah', detail: map['Fidyah'] },
  ];
}

export async function downloadKwitansiPdf(data: KwitansiData) {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 10;
    const green = [39, 103, 73] as const;
    const lightGreen = [230, 245, 230] as const;

    // Generate QR code
    const verifyUrl = data.receipt_number ? `${window.location.origin}/verifikasi/${data.receipt_number}` : '';
    let qrImg = '';
    if (verifyUrl) {
      try { qrImg = await QRCode.toDataURL(verifyUrl, { width: 150, margin: 1 }); } catch {}
    }

    // Outer border
    doc.setDrawColor(...green);
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);
    doc.setLineWidth(0.5);
    doc.rect(margin + 2, margin + 2, pageW - margin * 2 - 4, pageH - margin * 2 - 4);

    // Dimensions
    const innerX = margin + 3;
    const innerY = margin + 3;
    const innerW = pageW - margin * 2 - 6;
    const innerH = pageH - margin * 2 - 6;
    const sidebarW = Math.round(innerW * 0.22);

    // Sidebar background
    doc.setFillColor(...lightGreen);
    doc.rect(innerX, innerY, sidebarW, innerH, 'F');
    doc.setDrawColor(...green);
    doc.setLineWidth(0.5);
    doc.line(innerX + sidebarW, innerY, innerX + sidebarW, innerY + innerH);

    // Logo
    const logoSize = 32;
    const sidebarCenterX = innerX + sidebarW / 2;
    try {
      const img = await loadImage(logoImg);
      doc.addImage(img, 'PNG', sidebarCenterX - logoSize / 2, innerY + 22, logoSize, logoSize);
    } catch {}

    // Org name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    const orgY = innerY + 62;
    doc.text('BADAN AMIL', sidebarCenterX, orgY, { align: 'center' });
    doc.text('ZAKAT', sidebarCenterX, orgY + 6, { align: 'center' });
    doc.text('MASJID AL-IKHLAS', sidebarCenterX, orgY + 12, { align: 'center' });
    doc.text('KEBON BARU', sidebarCenterX, orgY + 18, { align: 'center' });

    // QR code
    if (qrImg) {
      const qrSize = 30;
      try { doc.addImage(qrImg, 'PNG', sidebarCenterX - qrSize / 2, orgY + 28, qrSize, qrSize); } catch {}
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Scan untuk verifikasi', sidebarCenterX, orgY + 62, { align: 'center' });
    }

    // Website
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('www.masjidalikhas.or.id', sidebarCenterX, innerY + innerH - 6, { align: 'center' });

    // === Content area ===
    const contentX = innerX + sidebarW + 6;
    const contentW = innerW - sidebarW - 12;
    const contentEndY = innerY + innerH - 6;

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text('KWITANSI ZAKAT', contentX + contentW / 2, innerY + 16, { align: 'center' });
    doc.setDrawColor(...green);
    doc.setLineWidth(1.2);
    doc.line(contentX, innerY + 20, contentX + contentW, innerY + 20);

    // Muzakki info
    let y = innerY + 30;
    const labelX = contentX;
    const colonX = labelX + 40;
    const valX = colonX + 4;

    const drawInfoRow = (label: string, value: string, bold = true, fontSize = 14) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(label, labelX, y);
      doc.text(':', colonX, y);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.text(value, valX, y);
      y += 7;
    };

    drawInfoRow('No. Kwitansi', data.receipt_number || String(data.nomor), true, 14);
    drawInfoRow('Nama Muzakki', data.nama_muzakki, true, 15);
    if (data.status_muzakki) drawInfoRow('Status', data.status_muzakki);
    if (data.rt_nama) drawInfoRow('RT', data.rt_nama);
    if (data.alamat_muzakki) drawInfoRow('Alamat', data.alamat_muzakki, false);

    // Payment section header
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Untuk Pembayaran :', labelX, y);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(labelX + 48, y + 1, contentX + contentW, y + 1);
    y += 8;

    const entries = getPaymentEntries(data.details);
    const fitrahFidyah = entries.filter(e => e.detail && (e.name === 'Zakat Fitrah' || e.name === 'Fidyah'));
    const others = entries.filter(e => e.detail && e.name !== 'Zakat Fitrah' && e.name !== 'Fidyah');

    let totalUang = 0;
    let totalBeras = 0;
    let totalJiwa = 0;

    // Draw fitrah/fidyah side by side
    if (fitrahFidyah.length > 0) {
      const colW = fitrahFidyah.length > 1 ? (contentW - 8) / 2 : contentW;
      const startY = y;

      fitrahFidyah.forEach((p, idx) => {
        const d = p.detail!;
        const isFitrahFidyah = true;
        const metode = d.metode_pembayaran || (d.jumlah_beras > 0 ? 'beras' : 'uang');
        const jiwa = d.jumlah_jiwa || 0;
        const totalLiter = jiwa * LITER_PER_JIWA;
        const harga = d.harga_beras_per_liter || 0;

        const colX = labelX + (idx * (colW + 8));
        let cy = startY;

        // Border box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(`${p.no}. ${p.name} (${metode === 'beras' ? 'Beras' : 'Uang'})`, colX + 2, cy);
        cy += 6;

        // Jiwa
        if (jiwa > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(13);
          doc.text(`Jumlah Jiwa: ${jiwa}`, colX + 6, cy);
          cy += 5.5;
          totalJiwa += jiwa;
        }

        if (metode === 'beras') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`${totalLiter} Liter Beras`, colX + 6, cy);
          cy += 5.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.text(`${jiwa} Jiwa × 3,5 Liter`, colX + 6, cy);
          cy += 5;

          if (harga > 0) {
            doc.text(`Harga Beras: Rp ${fmt(harga)} / Liter`, colX + 6, cy);
            cy += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(...green);
            doc.text(`Nilai Beras: Rp ${fmt(totalLiter * harga)}`, colX + 6, cy);
            doc.setTextColor(0, 0, 0);
            cy += 5.5;
          }
          totalBeras += totalLiter;
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`Rp ${fmt(d.jumlah_uang)}`, colX + 6, cy);
          totalUang += d.jumlah_uang;
          cy += 5.5;

          if (harga > 0) {
            const setaraLiter = d.jumlah_uang / harga;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(`Setara: ${parseFloat(setaraLiter.toFixed(2))} Liter Beras`, colX + 6, cy);
            cy += 5;
            doc.text(`Harga Beras: Rp ${fmt(harga)} / Liter`, colX + 6, cy);
            cy += 5;
          }
        }

        // Draw box around this entry
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(colX, startY - 5, colW, cy - startY + 7);
      });

      // Advance y to after the boxes
      const maxBoxH = fitrahFidyah.reduce((max, p, idx) => {
        const d = p.detail!;
        const metode = d.metode_pembayaran || (d.jumlah_beras > 0 ? 'beras' : 'uang');
        const harga = d.harga_beras_per_liter || 0;
        let h = 12; // title + jiwa base
        if (d.jumlah_jiwa > 0) h += 5.5;
        if (metode === 'beras') { h += 11; if (harga > 0) h += 10.5; }
        else { h += 5.5; if (harga > 0) h += 10; }
        return Math.max(max, h);
      }, 0);
      y = startY + maxBoxH + 4;
    }

    // Other payments
    others.forEach(p => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(`${p.no}.`, labelX + 2, y);
      doc.text(p.name, labelX + 10, y);
      doc.text('Uang :', labelX + 48, y);
      if (p.detail!.jumlah_uang > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Rp ${fmt(p.detail!.jumlah_uang)}`, labelX + 64, y);
        totalUang += p.detail!.jumlah_uang;
      }
      y += 7;
    });

    // Totals
    y += 3;
    doc.setDrawColor(...green);
    doc.setLineWidth(0.8);
    doc.line(labelX, y - 2, contentX + contentW, y - 2);

    if (totalJiwa > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Jumlah Total Jiwa :', labelX + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalJiwa} Jiwa`, labelX + 64, y + 4);
      y += 8;
    }
    if (totalUang > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(16);
      doc.text('Jumlah Total (Uang) :', labelX + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rp ${fmt(totalUang)}`, labelX + 64, y + 4);
      y += 8;
    }
    if (totalBeras > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(16);
      doc.text('Jumlah Total Beras :', labelX + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalBeras} Liter`, labelX + 64, y + 4);
      y += 8;
    }

    // Terbilang & Signature
    const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Calculate beras equivalent for terbilang
    let berasEquivalent = 0;
    entries.forEach(p => {
      if (!p.detail) return;
      const metode = p.detail.metode_pembayaran || (p.detail.jumlah_beras > 0 ? 'beras' : 'uang');
      if (metode === 'beras' && (p.name === 'Zakat Fitrah' || p.name === 'Fidyah')) {
        const jiwa = p.detail.jumlah_jiwa || 0;
        const totalLiter = jiwa * LITER_PER_JIWA;
        const harga = p.detail.harga_beras_per_liter || 0;
        berasEquivalent += totalLiter * harga;
      }
    });
    const grandTotal = totalUang + berasEquivalent;

    const sigY = Math.max(y + 8, contentEndY - 32);
    const sigX = contentX + contentW * 0.6;

    // Terbilang
    if (grandTotal > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...green);
      doc.text('Terbilang:', labelX, sigY);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(terbilang(grandTotal), contentW * 0.5);
      doc.text(splitText, labelX + 26, sigY);
    }

    // Signature
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Jakarta, ${dateStr}`, sigX + 16, sigY, { align: 'center' });
    doc.text('Penerima,', sigX + 16, sigY + 6, { align: 'center' });

    const sigName = data.penerima || '(                    )';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(sigName, sigX + 16, sigY + 26, { align: 'center' });
    const nameW = doc.getTextWidth(sigName);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(sigX + 16 - nameW / 2, sigY + 27, sigX + 16 + nameW / 2, sigY + 27);

    const blob = doc.output('blob');
    const fileName = `kwitansi-${data.receipt_number || data.nomor}.pdf`;

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast.success('Kwitansi PDF berhasil diunduh', {
        description: 'Klik untuk membuka file',
        action: { label: '📄 Buka', onClick: () => window.open(url, '_blank') },
        duration: 5000,
      });
    } catch (nativeError) {
      saveAs(blob, fileName);
      toast.success('Kwitansi PDF berhasil diunduh');
    }
  } catch (error) {
    console.error('[PDF Download] Failed', error);
    toast.error('Gagal mengunduh kwitansi PDF. Silakan coba lagi.');
  }
}
