import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Printer, Download } from 'lucide-react';
import { terbilang } from '@/lib/terbilang';
import jsPDF from 'jspdf';
import logoImg from '@/assets/logo-masjid.webp';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface BuktiDistribusiData {
  nama_mustahik: string;
  kategori_mustahik?: string;
  rt_mustahik?: string;
  alamat_mustahik: string;
  sumber_zakat: string;
  jenis_bantuan: string;
  jumlah_uang: number;
  jumlah_beras: number;
  tanggal: string;
  created_by: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BuktiDistribusiData | null;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

export default function BuktiDistribusi({ open, onOpenChange, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [panitiaName, setPanitiaName] = useState('Panitia Zakat');

  useEffect(() => {
    if (data?.created_by) {
      supabase.from('profiles').select('name').eq('id', data.created_by).single()
        .then(({ data: p }) => { if (p?.name) setPanitiaName(p.name); });
    }
  }, [data?.created_by]);

  if (!data) return null;

  const isUang = data.jenis_bantuan !== 'Beras';
  const jumlah = isUang ? data.jumlah_uang : data.jumlah_beras;
  const jumlahStr = isUang ? `Rp ${fmt(jumlah)}` : `${jumlah} Liter`;
  const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Bukti Penyaluran Zakat</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 20px; }</style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = async () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a5' });
      const green = [39, 103, 73] as const;
      const pageW = 148;

      // Border
      doc.setDrawColor(...green); doc.setLineWidth(1.2); doc.rect(5, 5, pageW - 10, 200);
      doc.setLineWidth(0.4); doc.rect(7, 7, pageW - 14, 196);

      // Logo
      try {
        const img = new Image(); img.crossOrigin = 'anonymous';
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = logoImg; });
        doc.addImage(img, 'PNG', pageW / 2 - 12, 12, 24, 24);
      } catch {}

      // Header
      let y = 42;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green);
      doc.text('BUKTI PENYALURAN ZAKAT', pageW / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Masjid Al-Ikhlas — Kebon Baru', pageW / 2, y, { align: 'center' });
      y += 4;
      doc.setDrawColor(...green); doc.line(15, y, pageW - 15, y);

      // Content
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

      // Terbilang (only for uang)
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

      // Signature
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-lg p-2 md:p-6 overflow-auto max-h-[90vh]">
        <div className="flex gap-2 justify-end mb-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          <Button size="sm" onClick={handleDownloadPdf}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
        </div>
        <div ref={printRef}>
          <div style={{ border: '3px solid #276749', padding: '4px', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ border: '1px solid #276749', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <img src={logoImg} alt="Logo" style={{ width: '50px', height: '50px', margin: '0 auto 8px' }} />
                <h2 style={{ color: '#276749', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>BUKTI PENYALURAN ZAKAT</h2>
                <p style={{ color: '#276749', fontSize: '11px', margin: '2px 0 0' }}>Masjid Al-Ikhlas — Kebon Baru</p>
                <hr style={{ border: 'none', borderTop: '2px solid #276749', margin: '8px 0' }} />
              </div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Nama Mustahik', data.nama_mustahik],
                    ...(data.kategori_mustahik ? [['Status', data.kategori_mustahik]] : []),
                    ...(data.rt_mustahik ? [['RT', data.rt_mustahik]] : []),
                    ['Alamat', data.alamat_mustahik || '-'],
                    ['Jenis Zakat', data.sumber_zakat],
                    ['Bentuk Bantuan', data.jenis_bantuan],
                    ['Jumlah', jumlahStr],
                    ['Tanggal Distribusi', dateStr],
                    ['Disalurkan oleh', panitiaName],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ padding: '4px 0', width: '140px', verticalAlign: 'top' }}>{label}</td>
                      <td style={{ padding: '4px 0', width: '10px', verticalAlign: 'top' }}>:</td>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isUang && jumlah > 0 && (
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <span>Terbilang: </span><strong style={{ fontStyle: 'italic' }}>{terbilang(jumlah)}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '12px' }}>Jakarta, {dateStr}</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Penyalur,</div>
                  <div style={{ marginTop: '30px', fontWeight: 'bold', fontSize: '13px' }}>{panitiaName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
