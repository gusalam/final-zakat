import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Users, Wheat } from 'lucide-react';
import { useZakatStats } from '@/hooks/useZakatStats';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ZakatTrendChart from '@/components/ZakatTrendChart';

interface RtStat { nama_rt: string; total_muzakki: number; total_jiwa_fitrah: number; total_zakat: number; }

export default function PanitiaDashboard() {
  const { stats, fetchStats } = useZakatStats();
  const [rtStats, setRtStats] = useState<RtStat[]>([]);
  const [zakatTrend, setZakatTrend] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    await fetchStats();
    const [rtRes, trendRes] = await Promise.all([
      supabase.rpc('get_zakat_per_rt'),
      supabase.from('transaksi_zakat').select('tanggal, detail_zakat(jumlah_uang, jenis_zakat)').order('tanggal', { ascending: true }),
    ]);
    setRtStats((rtRes.data as unknown as RtStat[]) || []);
    setZakatTrend(trendRes.data || []);
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('panitia-dash-tz').on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('panitia-dash-distribusi').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtNum = (n: number) => n.toLocaleString('id-ID');


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
  return (
    <PanitiaLayout>
      <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-5 sm:mb-6 leading-tight">Dashboard Panitia</h1>

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

      {/* RT Stats Table */}
      {rtStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base sm:text-lg">Statistik Zakat per RT</CardTitle>
          </CardHeader>

          {/* Desktop table */}
          <CardContent className="px-4 pb-4 hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RT</TableHead>
                    <TableHead className="text-right">Muzakki</TableHead>
                    <TableHead className="text-right">Jiwa Fitrah</TableHead>
                    <TableHead className="text-right">Total Zakat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtStats.map(r => (
                    <TableRow key={r.nama_rt}>
                      <TableCell className="font-medium">{r.nama_rt}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.total_muzakki)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.total_jiwa_fitrah)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(Number(r.total_zakat))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Mobile cards */}
          <CardContent className="px-3 pb-3 md:hidden space-y-2">
            {rtStats.map(r => (
              <div key={r.nama_rt} className="border border-border rounded-lg p-3">
                <p className="font-semibold text-sm mb-2">{r.nama_rt}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Muzakki</p>
                    <p className="font-bold tabular-nums">{fmtNum(r.total_muzakki)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Jiwa</p>
                    <p className="font-bold tabular-nums">{fmtNum(r.total_jiwa_fitrah)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Zakat</p>
                    <p className="font-bold tabular-nums">{fmt(Number(r.total_zakat))}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </PanitiaLayout>
  );
}
