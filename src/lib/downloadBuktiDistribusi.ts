import jsPDF from 'jspdf';
import { terbilang } from '@/lib/terbilang';
import logoImg from '@/assets/logo-masjid.webp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BuktiDistribusiData } from '@/components/BuktiDistribusi';

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(); img.src = src;
  });
}

export async function downloadBuktiDistribusiPdf(data: BuktiDistribusiData) {
  try {
    let panitiaName = 'Panitia Zakat';
    if (data.created_by) {
      const { data: p } = await supabase.from('profiles').select('name').eq('id', data.created_by).single();
      if (p?.name) panitiaName = p.name;
    }

    const isUang = data.jenis_bantuan !== 'Beras';
    const jumlah = isUang ? data.jumlah_uang : data.jumlah_beras;
    const jumlahStr = isUang ? `Rp ${fmt(jumlah)}` : `${jumlah} Liter`;
    const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const green = [39, 103, 73] as const;
    const pageW = 148;

    doc.setDrawColor(...green); doc.setLineWidth(1.2); doc.rect(5, 5, pageW - 10, 200);
    doc.setLineWidth(0.4); doc.rect(7, 7, pageW - 14, 196);

    try {
      const img = await loadImage(logoImg);
      doc.addImage(img, 'PNG', pageW / 2 - 12, 12, 24, 24);
    } catch {}

    let y = 42;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green);
    doc.text('BUKTI PENYALURAN ZAKAT', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Masjid Al-Ikhlas — Kebon Baru', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(...green); doc.line(15, y, pageW - 15, y);

    y += 10;
    const labelX = 15, colonX = 55, valX = 60;
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);

    const rows = [
      ['Nama Mustahik', data.nama_mustahik],
      ...(data.kategori_mustahik ? [['Status', data.kategori_mustahik]] : []),
      ...(data.rt_mustahik ? [['RT', data.rt_mustahik]] : []),
      ['Alamat', data.alamat_mustahik || '-'],
      ['Jenis Zakat', data.sumber_zakat],
      ['Bentuk Bantuan', data.jenis_bantuan],
      ['Jumlah', jumlahStr],
      ['Tanggal Distribusi', dateStr],
      ['Disalurkan oleh', panitiaName],
    ];

    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal'); doc.text(label, labelX, y);
      doc.text(':', colonX, y);
      doc.setFont('helvetica', 'bold'); doc.text(value, valX, y);
      y += 8;
    });

    if (isUang && jumlah > 0) {
      y += 4;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Terbilang:', labelX, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      const splitText = doc.splitTextToSize(terbilang(jumlah), pageW - 35);
      doc.text(splitText, labelX, y);
      y += splitText.length * 5;
    }

    y = Math.max(y + 15, 155);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Jakarta, ${dateStr}`, pageW - 20, y, { align: 'right' });
    y += 5;
    doc.text('Penyalur,', pageW - 40, y, { align: 'center' });
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.text(panitiaName, pageW - 40, y, { align: 'center' });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bukti-distribusi-${data.nama_mustahik.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast.success('Bukti distribusi PDF berhasil diunduh');
  } catch (error) {
    console.error('[PDF] Failed', error);
    toast.error('Gagal mengunduh PDF. Silakan coba lagi.');
  }
}
