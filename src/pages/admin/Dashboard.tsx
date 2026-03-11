import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Users, Wheat, TrendingUp, Truck } from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { useZakatStats } from '@/hooks/useZakatStats';
import ZakatTrendChart from '@/components/ZakatTrendChart';
import MustahikPieChart from '@/components/MustahikPieChart';

export default function AdminDashboard() {
  const { stats, fetchStats } = useZakatStats();
  const [recentZakat, setRecentZakat] = useState<any[]>([]);
  const [recentDistribusi, setRecentDistribusi] = useState<any[]>([]);
  const [mustahikData, setMustahikData] = useState<any[]>([]);
  const [zakatByRt, setZakatByRt] = useState<any[]>([]);
  const [zakatTrend, setZakatTrend] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [rz, rd, mk, zrt, trend] = await Promise.all([
        supabase.from('transaksi_zakat').select('nama_muzakki, tanggal, rt(nama_rt), detail_zakat(jumlah_uang, jumlah_beras, jenis_zakat)').order('tanggal', { ascending: false }).limit(5),
        supabase.from('distribusi').select('jumlah, jumlah_beras, jenis_bantuan, tanggal, mustahik_id, mustahik(nama)').order('tanggal', { ascending: false }).limit(5),
        supabase.from('mustahik').select('kategori'),
        supabase.from('transaksi_zakat').select('nama_muzakki, rt(nama_rt), detail_zakat(jumlah_uang, jumlah_beras)'),
        supabase.from('transaksi_zakat').select('tanggal, detail_zakat(jumlah_uang, jenis_zakat)').order('tanggal', { ascending: true }),
      ]);
      setRecentZakat(rz.data || []);
      setRecentDistribusi(rd.data || []);
      setMustahikData(mk.data || []);
      setZakatByRt(zrt.data || []);
      setZakatTrend(trend.data || []);
      await fetchStats();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('admin-dash-tz').on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('admin-dash-distribusi').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, () => fetchData()).subscribe();
    const ch3 = supabase.channel('admin-dash-mustahik').on('postgres_changes', { event: '*', schema: 'public', table: 'mustahik' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtNum = (n: number) => n.toLocaleString('id-ID');
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });


  const statCards = [
    { label: 'Zakat Fitrah', value: stats.totalFitrah, icon: Banknote, color: 'text-emerald-600', isCurrency: true },
    { label: 'Zakat Mal', value: stats.totalMal, icon: Banknote, color: 'text-blue-600', isCurrency: true },
    { label: 'Infaq', value: stats.totalInfaq, icon: Banknote, color: 'text-amber-600', isCurrency: true },
    { label: 'Fidyah', value: stats.totalFidyah, icon: Banknote, color: 'text-purple-600', isCurrency: true },
    { label: 'Total Muzakki', value: stats.totalMuzakki, icon: Users, color: 'text-blue-600' },
    { label: 'Total Mustahik', value: stats.totalMustahik, icon: Users, color: 'text-purple-600', suffix: ' Orang' },
    { label: 'Jiwa Fitrah', value: stats.totalJiwaFitrah, icon: Users, color: 'text-emerald-600', suffix: ' Orang' },
    { label: 'Beras Fitrah', value: stats.totalBerasFitrah, icon: Wheat, color: 'text-emerald-600', suffix: ' Liter' },
    { label: 'Beras Fidyah', value: stats.totalBerasFidyah, icon: Wheat, color: 'text-purple-600', suffix: ' Liter' },
    { label: 'Total Beras', value: stats.totalBeras, icon: Wheat, color: 'text-amber-600', suffix: ' Liter' },
  ];
  const kategoriSummary = mustahikData.reduce((acc: Record<string, number>, m: any) => {
    const k = m.kategori || 'Tidak Dikategorikan'; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});

  const rtZakatSummary = zakatByRt.reduce((acc: Record<string, { uang: number; beras: number; muzakki: Set<string> }>, t: any) => {
    const rtName = t.rt?.nama_rt || '-';
    if (!acc[rtName]) acc[rtName] = { uang: 0, beras: 0, muzakki: new Set() };
    (t.detail_zakat || []).forEach((d: any) => { acc[rtName].uang += Number(d.jumlah_uang || 0); acc[rtName].beras += Number(d.jumlah_beras || 0); });
    acc[rtName].muzakki.add(t.nama_muzakki);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-5 sm:mb-6 leading-tight">Dashboard Admin</h1>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        {statCards.map(s => (
          <AnimatedStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            isCurrency={s.isCurrency}
            suffix={s.suffix}
          />
        ))}
      </div>

      {/* Trend Chart */}
      <div className="mb-5">
        <ZakatTrendChart data={zakatTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary shrink-0" />
              Ringkasan Zakat Per RT
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RT</TableHead>
                    <TableHead className="text-right">Muzakki</TableHead>
                    <TableHead className="text-right">Uang</TableHead>
                    <TableHead className="text-right">Beras (Liter)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(rtZakatSummary).map(([rt, d]: [string, any]) => (
                    <TableRow key={rt}>
                      <TableCell className="font-medium">{rt}</TableCell>
                      <TableCell className="text-right">{fmtNum(d.muzakki.size)}</TableCell>
                      <TableCell className="text-right">{fmt(d.uang)}</TableCell>
                      <TableCell className="text-right">{fmtNum(d.beras)}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(rtZakatSummary).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <MustahikPieChart data={mustahikData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary shrink-0" />
              Zakat Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-0">
              {recentZakat.map((t: any, i: number) => {
                const totalUang = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
                const totalBeras = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);
                return (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-sm leading-tight truncate">{t.nama_muzakki}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(t.tanggal)} · {t.rt?.nama_rt || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {totalUang > 0 && <p className="text-sm font-bold tabular-nums">{fmt(totalUang)}</p>}
                      {totalBeras > 0 && <p className="text-xs text-muted-foreground tabular-nums">{fmtNum(totalBeras)} Liter</p>}
                    </div>
                  </div>
                );
              })}
              {recentZakat.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary shrink-0" />
              Distribusi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-0">
              {recentDistribusi.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-sm leading-tight truncate">{d.mustahik?.nama || '-'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(d.tanggal)}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0">
                    {d.jenis_bantuan === 'Beras' ? `${fmtNum(Number(d.jumlah_beras) || 0)} Liter` : fmt(d.jumlah)}
                  </p>
                </div>
              ))}
              {recentDistribusi.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
