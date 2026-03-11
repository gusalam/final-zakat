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

export async function downloadKwitansiPdf(data: KwitansiData) {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 8;
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

    // Sidebar (22% width)
    const innerX = margin + 3;
    const innerY = margin + 3;
    const innerW = pageW - margin * 2 - 6;
    const innerH = pageH - margin * 2 - 6;
    const sidebarW = Math.round(innerW * 0.22);

    doc.setFillColor(...lightGreen);
    doc.rect(innerX, innerY, sidebarW, innerH, 'F');
    doc.setDrawColor(...green);
    doc.setLineWidth(0.5);
    doc.line(innerX + sidebarW, innerY, innerX + sidebarW, innerY + innerH);

    // Logo
    const logoSize = 40;
    const logoCenterX = innerX + sidebarW / 2 - logoSize / 2;
    try {
      const img = await loadImage(logoImg);
      doc.addImage(img, 'PNG', logoCenterX, innerY + 20, logoSize, logoSize);
    } catch {}

    // Org name
    const sidebarCenterX = innerX + sidebarW / 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text('BADAN AMIL', sidebarCenterX, innerY + 70, { align: 'center' });
    doc.text('ZAKAT', sidebarCenterX, innerY + 77, { align: 'center' });
    doc.text('MASJID AL-IKHLAS', sidebarCenterX, innerY + 84, { align: 'center' });
    doc.text('KEBON BARU', sidebarCenterX, innerY + 91, { align: 'center' });

    // QR code
    if (qrImg) {
      const qrSize = 35;
      try { doc.addImage(qrImg, 'PNG', sidebarCenterX - qrSize / 2, innerY + 105, qrSize, qrSize); } catch {}
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Scan untuk verifikasi', sidebarCenterX, innerY + 144, { align: 'center' });
    }

    // Content area
    const contentX = innerX + sidebarW + 8;
    const contentW = innerW - sidebarW - 16;
    const contentEndY = innerY + innerH - 8;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text('KWITANSI ZAKAT', contentX + contentW / 2, innerY + 18, { align: 'center' });
    doc.setDrawColor(...green);
    doc.setLineWidth(1);
    doc.line(contentX, innerY + 22, contentX + contentW, innerY + 22);

    // Muzakki info
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    let y = innerY + 34;
    const labelX = contentX;
    const colonX = labelX + 42;
    const valX = colonX + 5;

    doc.setFont('helvetica', 'normal'); doc.text('No. Kwitansi', labelX, y); doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold'); doc.text(data.receipt_number || String(data.nomor), valX, y);

    y += 8;
    doc.setFont('helvetica', 'normal'); doc.text('Nama Muzakki', labelX, y); doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(data.nama_muzakki, valX, y);
    doc.setFontSize(13);

    if (data.status_muzakki) {
      y += 7;
      doc.setFont('helvetica', 'normal'); doc.text('Status', labelX, y); doc.text(':', colonX, y);
      doc.setFont('helvetica', 'bold'); doc.text(data.status_muzakki, valX, y);
    }

    if (data.rt_nama) {
      y += 7;
      doc.setFont('helvetica', 'normal'); doc.text('RT', labelX, y); doc.text(':', colonX, y);
      doc.setFont('helvetica', 'bold'); doc.text(data.rt_nama, valX, y);
    }

    if (data.alamat_muzakki) {
      y += 7;
      doc.setFont('helvetica', 'normal'); doc.text('Alamat', labelX, y); doc.text(':', colonX, y);
      doc.text(data.alamat_muzakki, valX, y);
    }

    // Payment details
    y += 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Untuk Pembayaran :', labelX, y);
    y += 9;

    const detailMap: Record<string, DetailZakatItem> = {};
    data.details.forEach(d => { detailMap[d.jenis_zakat] = d; });

    const entries = [
      { no: 1, name: 'Zakat Fitrah', detail: detailMap['Zakat Fitrah'] },
      { no: 2, name: 'Zakat Mal', detail: detailMap['Zakat Mal'] },
      { no: 3, name: 'Infaq', detail: detailMap['Infaq'] || detailMap['Shodaqoh'] },
      { no: 4, name: 'Fidyah', detail: detailMap['Fidyah'] },
    ];

    let totalUang = 0;
    let totalBeras = 0;
    let totalJiwa = 0;

    entries.forEach(p => {
      if (!p.detail) return;
      const isFitrahFidyah = p.name === 'Zakat Fitrah' || p.name === 'Fidyah';

      if (isFitrahFidyah) {
        const metode = p.detail.metode_pembayaran || (p.detail.jumlah_beras > 0 ? 'beras' : 'uang');
        const jiwa = p.detail.jumlah_jiwa || 0;
        const totalLiter = jiwa * LITER_PER_JIWA;
        const hargaBeras = p.detail.harga_beras_per_liter || 0;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text(`${p.no}. ${p.name} (${metode === 'beras' ? 'Beras' : 'Uang'})`, labelX + 4, y);
        y += 6;

        if (metode === 'beras') {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
          doc.text(`Jumlah Jiwa: ${jiwa}`, labelX + 10, y);
          y += 5;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
          doc.text(`${totalLiter} Liter Beras`, labelX + 10, y);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
          y += 5;
          doc.text(`${jiwa} Jiwa × 3,5 Liter`, labelX + 10, y);
          if (hargaBeras > 0) {
            y += 5;
            doc.text(`Harga Beras: Rp ${fmt(hargaBeras)} / Liter`, labelX + 10, y);
            y += 5;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
            doc.setTextColor(...green);
            doc.text(`Nilai Setara: Rp ${fmt(totalLiter * hargaBeras)}`, labelX + 10, y);
            doc.setTextColor(0, 0, 0);
          }
          totalBeras += totalLiter;
          totalJiwa += jiwa;
        } else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
          doc.text(`Jumlah Uang: `, labelX + 10, y);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
          doc.text(`Rp ${fmt(p.detail.jumlah_uang)}`, labelX + 40, y);
          totalUang += p.detail.jumlah_uang;
          totalJiwa += jiwa;
          if (hargaBeras > 0) {
            const setaraLiter = p.detail.jumlah_uang / hargaBeras;
            y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
            doc.text(`Setara Beras: ${parseFloat(setaraLiter.toFixed(2))} Liter`, labelX + 10, y);
            y += 5;
            doc.text(`Harga Beras: Rp ${fmt(hargaBeras)} / Liter`, labelX + 10, y);
          }
        }
        doc.setFontSize(13);
        y += 8;
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
        doc.text(`${p.no}.`, labelX + 4, y);
        doc.text(p.name, labelX + 12, y);
        doc.text('Uang :', labelX + 50, y);
        if (p.detail.jumlah_uang > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`Rp  ${fmt(p.detail.jumlah_uang)}`, labelX + 68, y);
          totalUang += p.detail.jumlah_uang;
        }
        y += 8;
      }
    });

    // Totals
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, y - 2, contentX + contentW, y - 2);

    if (totalJiwa > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(14);
      doc.text('Jumlah Total Jiwa :', labelX + 4, y + 4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(`${totalJiwa} Jiwa`, labelX + 68, y + 4);
      y += 8;
    }
    if (totalUang > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(14);
      doc.text('Jumlah Total (Uang) :', labelX + 4, y + 4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(`Rp  ${fmt(totalUang)}`, labelX + 68, y + 4);
      y += 8;
    }
    if (totalBeras > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(14);
      doc.text('Jumlah Total Beras :', labelX + 4, y + 4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(`${totalBeras} Liter`, labelX + 68, y + 4);
      y += 8;
    }

    // Terbilang & Signature at bottom
    const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sigY = Math.max(y + 12, contentEndY - 40);
    const sigX = contentX + contentW * 0.6;

    // Terbilang (left)
    if (totalUang > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.text('Terbilang :', labelX, sigY);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      const splitText = doc.splitTextToSize(terbilang(totalUang), contentW * 0.52);
      doc.text(splitText, labelX + 25, sigY);
    }

    // Signature (right)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
    doc.text(`Jakarta,  ${dateStr}`, sigX + 20, sigY, { align: 'center' });
    doc.text('Penerima,', sigX + 20, sigY + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(data.penerima, sigX + 20, sigY + 30, { align: 'center' });
    // Underline name
    const nameW = doc.getTextWidth(data.penerima);
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
    doc.line(sigX + 20 - nameW / 2, sigY + 31, sigX + 20 + nameW / 2, sigY + 31);

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
