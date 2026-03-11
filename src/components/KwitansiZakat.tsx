import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import { terbilang } from '@/lib/terbilang';
import logoImg from '@/assets/logo-masjid.webp';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export interface DetailZakatItem {
  jenis_zakat: string;
  jumlah_uang: number;
  jumlah_beras: number;
  jumlah_jiwa: number;
  metode_pembayaran?: string | null;
  harga_beras_per_liter?: number | null;
}

export interface KwitansiData {
  nomor: number;
  receipt_number?: string;
  nama_muzakki: string;
  status_muzakki?: string;
  rt_nama?: string;
  alamat_muzakki?: string;
  details: DetailZakatItem[];
  tanggal: string;
  penerima: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: KwitansiData | null;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const LITER_PER_JIWA = 3.5;

function getPaymentRows(details: DetailZakatItem[]) {
  const map: Record<string, DetailZakatItem> = {};
  details.forEach(d => { map[d.jenis_zakat] = d; });
  return [
    { no: 1, name: 'Zakat Fitrah', detail: map['Zakat Fitrah'] },
    { no: 2, name: 'Zakat Mal', detail: map['Zakat Mal'] },
    { no: 3, name: 'Infaq', detail: map['Infaq'] || map['Shodaqoh'] ? { jenis_zakat: 'Infaq', jumlah_uang: (map['Infaq']?.jumlah_uang || 0) + (map['Shodaqoh']?.jumlah_uang || 0), jumlah_beras: 0, jumlah_jiwa: 0 } as DetailZakatItem : undefined },
    { no: 4, name: 'Fidyah', detail: map['Fidyah'] },
  ];
}

function renderFitrahFidyahInfo(d: DetailZakatItem) {
  const metode = d.metode_pembayaran || (d.jumlah_beras > 0 ? 'beras' : 'uang');
  const jiwa = d.jumlah_jiwa || 0;
  const totalLiter = jiwa * LITER_PER_JIWA;
  const harga = d.harga_beras_per_liter || 0;
  const nilaiSetara = totalLiter * harga;

  if (metode === 'beras') {
    return {
      label: `(Beras)`,
      jiwa: jiwa > 0 ? `Jumlah Jiwa: ${jiwa}` : undefined,
      amount: `${totalLiter} Liter Beras`,
      extra: `${jiwa} Jiwa × 3,5 Liter`,
      harga: harga > 0 ? `Harga Beras: Rp ${fmt(harga)} / Liter` : undefined,
      nilaiSetara: harga > 0 ? `Nilai Setara: Rp ${fmt(nilaiSetara)}` : undefined,
    };
  } else {
    const setaraLiter = harga > 0 ? d.jumlah_uang / harga : 0;
    return {
      label: `(Uang)`,
      jiwa: jiwa > 0 ? `Jumlah Jiwa: ${jiwa}` : undefined,
      amount: `Rp ${fmt(d.jumlah_uang)}`,
      extra: harga > 0 ? `Setara: ${parseFloat(setaraLiter.toFixed(2))} Liter Beras` : undefined,
      harga: harga > 0 ? `Harga Beras: Rp ${fmt(harga)} / Liter` : undefined,
    };
  }
}

export default function KwitansiZakat({ open, onOpenChange, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (data?.receipt_number) {
      const verifyUrl = `${window.location.origin}/verifikasi/${data.receipt_number}`;
      QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }
  }, [data?.receipt_number]);

  if (!data) return null;

  const payments = getPaymentRows(data.details);
  const totalUang = payments.reduce((s, p) => s + (p.detail?.jumlah_uang || 0), 0);
  const totalBeras = payments.reduce((s, p) => s + (p.detail?.jumlah_beras || 0), 0);
  const totalJiwa = payments.reduce((s, p) => s + (p.detail?.jumlah_jiwa || 0), 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Kwitansi Zakat</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; }
        @page { size: A4 landscape; margin: 0; }
        @media print { body { margin: 0; padding: 0; } }
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = async () => {
    try {
      const { downloadKwitansiPdf } = await import('@/lib/downloadKwitansi');
      await downloadKwitansiPdf(data);
    } catch (error) {
      console.error('Download kwitansi error:', error);
      toast.error('Gagal mengunduh kwitansi PDF. Silakan coba lagi.');
    }
  };

  const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl p-2 md:p-6 overflow-auto max-h-[90vh]">
        <div className="flex gap-2 justify-end mb-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          <Button size="sm" onClick={handleDownloadPdf}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
        </div>

        <div ref={printRef}>
          <div style={{ width: '297mm', minHeight: '210mm', padding: '8mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', margin: '0 auto' }}>
            <div style={{ border: '3px solid #276749', padding: '5px', width: '100%', height: '100%' }}>
              <div style={{ border: '1px solid #276749', display: 'grid', gridTemplateColumns: '22% 78%', minHeight: '190mm' }}>
                {/* Kolom Kiri - Sidebar */}
                <div style={{ backgroundColor: '#e6f5e6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', borderRight: '2px solid #276749' }}>
                  <img src={logoImg} alt="Logo" style={{ width: '90px', height: '90px', marginBottom: '16px' }} />
                  <div style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '14px', lineHeight: '1.5' }}>
                    BADAN AMIL<br />ZAKAT<br />MASJID AL-IKHLAS<br />KEBON BARU
                  </div>
                  {qrDataUrl && (
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                      <img src={qrDataUrl} alt="QR Verifikasi" style={{ width: '80px', height: '80px' }} />
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>Scan untuk verifikasi</div>
                    </div>
                  )}
                </div>

                {/* Kolom Kanan - Konten */}
                <div style={{ padding: '20px 28px', fontSize: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Top section */}
                  <div>
                    <h2 style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '24px', borderBottom: '3px solid #276749', paddingBottom: '8px', marginBottom: '20px', letterSpacing: '2px' }}>
                      KWITANSI ZAKAT
                    </h2>

                    {/* Info Muzakki */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                      <tbody>
                        <tr><td style={{ width: '140px', padding: '4px 0', verticalAlign: 'top' }}>No. Kwitansi</td><td style={{ width: '12px', verticalAlign: 'top' }}>:</td><td><strong style={{ border: '1px solid #ccc', padding: '2px 10px', fontSize: '14px' }}>{data.receipt_number || data.nomor}</strong></td></tr>
                        <tr><td style={{ padding: '4px 0' }}>Nama Muzakki</td><td>:</td><td><strong style={{ fontSize: '15px' }}>{data.nama_muzakki}</strong></td></tr>
                        {data.status_muzakki && (
                          <tr><td style={{ padding: '4px 0' }}>Status</td><td>:</td><td><strong>{data.status_muzakki}</strong></td></tr>
                        )}
                        {data.rt_nama && (
                          <tr><td style={{ padding: '4px 0' }}>RT</td><td>:</td><td><strong>{data.rt_nama}</strong></td></tr>
                        )}
                        {data.alamat_muzakki && (
                          <tr><td style={{ padding: '4px 0' }}>Alamat</td><td>:</td><td>{data.alamat_muzakki}</td></tr>
                        )}
                      </tbody>
                    </table>

                    {/* Detail Pembayaran */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Untuk Pembayaran :</div>
                      <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                          {payments.map(p => {
                            if (!p.detail) return null;
                            const isFitrahFidyah = p.name === 'Zakat Fitrah' || p.name === 'Fidyah';
                            if (isFitrahFidyah) {
                              const info = renderFitrahFidyahInfo(p.detail);
                              return (
                                <tr key={p.no}>
                                  <td colSpan={7} style={{ padding: '6px 0' }}>
                                    <div style={{ fontSize: '14px' }}><strong>{p.no}. {p.name} {info.label}</strong></div>
                                    <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                      {p.detail.jumlah_jiwa > 0 && <div style={{ fontSize: '14px' }}>Jumlah Jiwa: <strong>{p.detail.jumlah_jiwa}</strong></div>}
                                      <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>{info.amount}</div>
                                      {info.harga && <div style={{ fontSize: '12px', color: '#444', marginTop: '2px' }}>{info.harga}</div>}
                                      {info.extra && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{info.extra}</div>}
                                      {info.nilaiSetara && <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#276749', marginTop: '2px' }}>{info.nilaiSetara}</div>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={p.no}>
                                <td style={{ width: '20px', padding: '4px 0', fontSize: '14px' }}>{p.no}</td>
                                <td style={{ width: '110px', fontSize: '14px' }}>{p.name}</td>
                                <td style={{ width: '60px', fontSize: '14px' }}>Uang :</td>
                                <td style={{ width: '30px', fontWeight: 'bold', fontSize: '14px' }}>{p.detail.jumlah_uang > 0 ? 'Rp' : ''}</td>
                                <td style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.detail.jumlah_uang > 0 ? fmt(p.detail.jumlah_uang) : ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div style={{ marginTop: '16px', borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                      {totalJiwa > 0 && (
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'normal' }}>Jumlah Total Jiwa : </span>
                          <span style={{ marginLeft: '20px' }}>{totalJiwa} Jiwa</span>
                        </div>
                      )}
                      {totalUang > 0 && (
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'normal' }}>Jumlah Total (Uang) : </span>
                          <span style={{ marginLeft: '20px' }}>Rp {fmt(totalUang)}</span>
                        </div>
                      )}
                      {totalBeras > 0 && (
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          <span style={{ fontWeight: 'normal' }}>Jumlah Total Beras : </span>
                          <span style={{ marginLeft: '20px' }}>{totalBeras} Liter</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom section: Terbilang & Tanda Tangan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', marginTop: '24px', gap: '16px', alignItems: 'end' }}>
                    {/* Kiri: Terbilang */}
                    <div>
                      {totalUang > 0 && (
                        <div style={{ fontSize: '13px' }}>
                          <span>Terbilang : </span>
                          <strong style={{ fontStyle: 'italic' }}>{terbilang(totalUang)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Kanan: Tanggal & Tanda Tangan */}
                    <div style={{ textAlign: 'center', fontSize: '14px' }}>
                      <div>Jakarta, {dateStr}</div>
                      <div style={{ marginTop: '6px' }}>Penerima,</div>
                      <div style={{ marginTop: '50px', fontWeight: 'bold', borderBottom: '1px solid #000', display: 'inline-block', paddingBottom: '2px' }}>{data.penerima}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
