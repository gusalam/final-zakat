import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-masjid.webp';

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

export default function VerifikasiKwitansi() {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!receiptNumber) { setNotFound(true); setLoading(false); return; }

      const { data: trx, error } = await supabase
        .from('transaksi_zakat')
        .select('*, rt(nama_rt), detail_zakat(*), profiles:created_by(name)')
        .eq('receipt_number', receiptNumber)
        .single();

      if (error || !trx) {
        setNotFound(true);
      } else {
        setData(trx);
      }
      setLoading(false);
    }
    fetch();
  }, [receiptNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <Badge variant="destructive" className="text-sm px-3 py-1">❌ TIDAK VALID</Badge>
            <h1 className="text-xl font-bold">Kwitansi Tidak Ditemukan</h1>
            <p className="text-muted-foreground">
              Kwitansi tidak valid atau tidak ditemukan.
            </p>
            <Button variant="outline" asChild>
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Kembali ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const details = data.detail_zakat || [];
  const totalUang = details.reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
  const totalBeras = details.reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);
  const totalJiwa = details.find((d: any) => d.jenis_zakat === 'Zakat Fitrah')?.jumlah_jiwa || 0;
  const panitia = data.profiles?.name || 'Panitia Zakat';

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-3 pb-2">
          <img src={logo} alt="Logo" className="w-16 h-16 mx-auto" />
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-serif">Verifikasi Kwitansi Zakat</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Masjid Al-Ikhlas Kebon Baru</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-primary/10">
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">✅ VALID</Badge>
            <p className="text-xs text-primary mt-1">Kwitansi ini terverifikasi dan sah</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">No. Kwitansi</span>
              <Badge variant="outline" className="font-mono">{data.receipt_number}</Badge>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Nama Muzakki</span>
              <span className="font-medium">{data.nama_muzakki}</span>
            </div>
            {data.alamat_muzakki && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Alamat</span>
                <span className="text-right">{data.alamat_muzakki}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Jenis Zakat</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {details.map((d: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{d.jenis_zakat}</Badge>
                ))}
              </div>
            </div>
            {totalUang > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Jumlah Uang</span>
                <span className="font-semibold">Rp {fmt(totalUang)}</span>
              </div>
            )}
            {totalBeras > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Jumlah Beras</span>
                <span className="font-semibold">{totalBeras} Liter</span>
              </div>
            )}
            {totalJiwa > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Jumlah Jiwa</span>
                <span className="font-semibold">{totalJiwa} Orang</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Tanggal</span>
              <span>{new Date(data.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Panitia</span>
              <span className="font-medium">{panitia}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">RT</span>
              <span>{data.rt?.nama_rt || '-'}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Kembali ke Beranda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
