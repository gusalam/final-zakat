import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
      nilaiSetara: harga > 0 ? `Nilai Beras: Rp ${fmt(nilaiSetara)}` : undefined,
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
      QRCode.toDataURL(verifyUrl, { width: 150, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }
  }, [data?.receipt_number]);

  if (!data) return null;

  const payments = getPaymentRows(data.details);
  const totalUang = payments.reduce((s, p) => s + (p.detail?.jumlah_uang || 0), 0);
  const totalBeras = payments.reduce((s, p) => {
    if (!p.detail) return s;
    const metode = p.detail.metode_pembayaran || (p.detail.jumlah_beras > 0 ? 'beras' : 'uang');
    if (metode === 'beras' && (p.name === 'Zakat Fitrah' || p.name === 'Fidyah')) {
      const jiwa = p.detail.jumlah_jiwa || 0;
      return s + (jiwa * LITER_PER_JIWA);
    }
    return s;
  }, 0);
  const totalJiwa = payments.reduce((s, p) => s + (p.detail?.jumlah_jiwa || 0), 0);

  // Calculate beras equivalent value for terbilang
  const berasEquivalent = payments.reduce((s, p) => {
    if (!p.detail) return s;
    const metode = p.detail.metode_pembayaran || (p.detail.jumlah_beras > 0 ? 'beras' : 'uang');
    if (metode === 'beras' && (p.name === 'Zakat Fitrah' || p.name === 'Fidyah')) {
      const jiwa = p.detail.jumlah_jiwa || 0;
      const totalLiter = jiwa * LITER_PER_JIWA;
      const harga = p.detail.harga_beras_per_liter || 0;
      return s + (totalLiter * harga);
    }
    return s;
  }, 0);
  const grandTotal = totalUang + berasEquivalent;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Kwitansi Zakat</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; }
        @page { size: A4 landscape; margin: 10mm; }
        @media print { 
          body { margin: 0; padding: 0; }
          .kwitansi-page { width: 277mm !important; height: 190mm !important; }
        }
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

  // Filter active payments for grid display
  const activePayments = payments.filter(p => p.detail);
  const fitrahFidyahPayments = activePayments.filter(p => p.name === 'Zakat Fitrah' || p.name === 'Fidyah');
  const otherPayments = activePayments.filter(p => p.name !== 'Zakat Fitrah' && p.name !== 'Fidyah');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl p-2 md:p-6 overflow-auto max-h-[90vh]">
        <div className="flex gap-2 justify-end mb-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          <Button size="sm" onClick={handleDownloadPdf}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
        </div>

        <div ref={printRef}>
          <div className="kwitansi-page" style={{ width: '277mm', height: '190mm', padding: '0', boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif', margin: '0 auto', overflow: 'hidden' }}>
            {/* Outer border */}
            <div style={{ border: '3px solid #276749', padding: '4px', width: '100%', height: '100%', boxSizing: 'border-box' }}>
              {/* Inner border */}
              <div style={{ border: '1px solid #276749', display: 'grid', gridTemplateColumns: '22% 78%', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                
                {/* Kolom Kiri - Sidebar */}
                <div style={{ backgroundColor: '#e6f5e6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 10px', borderRight: '2px solid #276749' }}>
                  <img src={logoImg} alt="Logo" style={{ width: '80px', height: '80px', marginBottom: '14px' }} />
                  <div style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '13px', lineHeight: '1.6' }}>
                    BADAN AMIL<br />ZAKAT<br />MASJID AL-IKHLAS<br />KEBON BARU
                  </div>
                  {qrDataUrl && (
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <img src={qrDataUrl} alt="QR Verifikasi" style={{ width: '90px', height: '90px' }} />
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '6px' }}>Scan untuk verifikasi</div>
                    </div>
                  )}
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '8px' }}>www.masjidalikhas.or.id</div>
                </div>

                {/* Kolom Kanan - Konten */}
                <div style={{ padding: '16px 24px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                  {/* Top section */}
                  <div>
                    {/* Title */}
                    <h2 style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '28px', borderBottom: '3px solid #276749', paddingBottom: '6px', marginBottom: '14px', letterSpacing: '3px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      KWITANSI ZAKAT
                    </h2>

                    {/* Info Muzakki */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', marginBottom: '12px', lineHeight: '1.6' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '150px', padding: '3px 0', fontWeight: 'bold' }}>No. Kwitansi</td>
                          <td style={{ width: '14px' }}>:</td>
                          <td><strong>{data.receipt_number || data.nomor}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0' }}>Nama Muzakki</td>
                          <td>:</td>
                          <td><strong style={{ fontSize: '17px' }}>{data.nama_muzakki}</strong></td>
                        </tr>
                        {data.status_muzakki && (
                          <tr>
                            <td style={{ padding: '3px 0' }}>Status</td>
                            <td>:</td>
                            <td><strong>{data.status_muzakki}</strong></td>
                          </tr>
                        )}
                        {data.rt_nama && (
                          <tr>
                            <td style={{ padding: '3px 0' }}>RT</td>
                            <td>:</td>
                            <td><strong>{data.rt_nama}</strong></td>
                          </tr>
                        )}
                        {data.alamat_muzakki && (
                          <tr>
                            <td style={{ padding: '3px 0' }}>Alamat</td>
                            <td>:</td>
                            <td>{data.alamat_muzakki}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Detail Pembayaran */}
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ marginBottom: '6px', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                        Untuk Pembayaran :
                      </div>

                      {/* Fitrah/Fidyah in grid */}
                      {fitrahFidyahPayments.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: fitrahFidyahPayments.length > 1 ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '8px' }}>
                          {fitrahFidyahPayments.map(p => {
                            const info = renderFitrahFidyahInfo(p.detail!);
                            return (
                              <div key={p.no} style={{ border: '1px solid #ddd', padding: '10px 12px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' }}>
                                  {p.no}. {p.name} {info.label}
                                </div>
                                {info.jiwa && <div style={{ fontSize: '15px', marginBottom: '3px' }}>{info.jiwa}</div>}
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px' }}>{info.amount}</div>
                                {info.extra && <div style={{ fontSize: '14px', color: '#444', marginBottom: '2px' }}>{info.extra}</div>}
                                {info.harga && <div style={{ fontSize: '14px', color: '#444', marginBottom: '2px' }}>{info.harga}</div>}
                                {info.nilaiSetara && <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#276749' }}>{info.nilaiSetara}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Other payments */}
                      {otherPayments.length > 0 && (
                        <table style={{ width: '100%', fontSize: '15px', borderCollapse: 'collapse' }}>
                          <tbody>
                            {otherPayments.map(p => (
                              <tr key={p.no}>
                                <td style={{ width: '24px', padding: '4px 0' }}>{p.no}.</td>
                                <td style={{ width: '120px' }}>{p.name}</td>
                                <td style={{ width: '60px' }}>Uang :</td>
                                <td style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                  {p.detail!.jumlah_uang > 0 ? `Rp ${fmt(p.detail!.jumlah_uang)}` : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Totals */}
                    <div style={{ marginTop: '10px', borderTop: '2px solid #276749', paddingTop: '10px' }}>
                      {totalJiwa > 0 && (
                        <div style={{ fontSize: '18px', marginBottom: '4px', lineHeight: '1.6' }}>
                          <span>Jumlah Total Jiwa : </span>
                          <strong style={{ marginLeft: '12px' }}>{totalJiwa} Jiwa</strong>
                        </div>
                      )}
                      {totalUang > 0 && (
                        <div style={{ fontSize: '18px', marginBottom: '4px', lineHeight: '1.6' }}>
                          <span>Jumlah Total (Uang) : </span>
                          <strong style={{ marginLeft: '12px' }}>Rp {fmt(totalUang)}</strong>
                        </div>
                      )}
                      {totalBeras > 0 && (
                        <div style={{ fontSize: '18px', lineHeight: '1.6' }}>
                          <span>Jumlah Total Beras : </span>
                          <strong style={{ marginLeft: '12px' }}>{totalBeras} Liter</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom section: Terbilang & Tanda Tangan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', marginTop: '14px', gap: '12px', alignItems: 'end' }}>
                    {/* Kiri: Terbilang */}
                    <div>
                      {grandTotal > 0 && (
                        <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
                          <span style={{ color: '#276749', fontWeight: 'bold' }}>Terbilang: </span>
                          <strong style={{ fontStyle: 'italic' }}>{terbilang(grandTotal)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Kanan: Tanggal & Tanda Tangan */}
                    <div style={{ textAlign: 'center', fontSize: '16px' }}>
                      <div>Jakarta, {dateStr}</div>
                      <div style={{ marginTop: '4px' }}>Penerima,</div>
                      <div style={{ marginTop: '40px', fontWeight: 'bold', borderBottom: '1px solid #000', display: 'inline-block', paddingBottom: '2px' }}>
                        {data.penerima || '(                    )'}
                      </div>
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
