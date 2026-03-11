import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import * as XLSX from 'xlsx';
import { exportPdf } from '@/lib/exportPdf';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';
import { useZakatStats } from '@/hooks/useZakatStats';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DateRangeFilter from '@/components/DateRangeFilter';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

const getAlamatLabel = (rt?: string, alamat?: string) => [rt, alamat].filter(Boolean).join(' — ');

export default function PanitiaLaporan() {
  const { stats, fetchStats } = useZakatStats();
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [searchZakat, setSearchZakat] = useState('');
  const [searchDist, setSearchDist] = useState('');
  const debouncedSearchZakat = useDebounce(searchZakat, 400);
  const debouncedSearchDist = useDebounce(searchDist, 400);
  const zakatPag = usePagination(50);
  const distPag = usePagination(50);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchStats(startDate, endDate);
        const distJoin = debouncedSearchDist.trim() ? 'mustahik!inner(nama, alamat, rt(nama_rt))' : 'mustahik(nama, alamat, rt(nama_rt))';
        let zq = supabase.from('transaksi_zakat').select('*, rt(nama_rt), detail_zakat(*)', { count: 'exact' }).order('tanggal', { ascending: false });
        let dq = supabase.from('distribusi').select(`*, ${distJoin}`, { count: 'exact' }).order('tanggal', { ascending: false });
        if (startDate) { zq = zq.gte('tanggal', startDate); dq = dq.gte('tanggal', startDate); }
        if (endDate) { zq = zq.lte('tanggal', endDate); dq = dq.lte('tanggal', endDate); }
        if (debouncedSearchZakat.trim()) zq = zq.ilike('nama_muzakki', `%${debouncedSearchZakat.trim()}%`);
        if (debouncedSearchDist.trim()) dq = dq.ilike('mustahik.nama', `%${debouncedSearchDist.trim()}%`);
        const [zResult, dResult] = await Promise.all([zq.range(zakatPag.from, zakatPag.to), dq.range(distPag.from, distPag.to)]);
        if (zResult.error?.message?.includes('range not satisfiable')) { zakatPag.goTo(1); return; }
        if (dResult.error?.message?.includes('range not satisfiable')) { distPag.goTo(1); return; }
        if (zResult.error) throw zResult.error; if (dResult.error) throw dResult.error;
        setZakatData(zResult.data || []); zakatPag.setTotalCount(zResult.count || 0);
        setDistribusiData(dResult.data || []); distPag.setTotalCount(dResult.count || 0);
      } catch (err) { toast({ title: 'Gagal memuat data', description: friendlyError(err), variant: 'destructive' }); }
    };
    fetchData();
  }, [zakatPag.page, distPag.page, startDate, endDate, debouncedSearchZakat, debouncedSearchDist]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const filterLabel = startDate && endDate
    ? `${format(new Date(startDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })} — ${format(new Date(endDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}`
    : startDate ? `Dari ${format(new Date(startDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}` : 'Semua Periode';

  const getJenis = (t: any) => (t.detail_zakat || []).map((d: any) => d.jenis_zakat).join(', ');
  const getUang = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
  const getBeras = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);

  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah }, { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq }, { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  const rtMap: Record<string, number> = {};
  zakatData.forEach(t => { const rt = t.rt?.nama_rt || 'Lainnya'; rtMap[rt] = (rtMap[rt] || 0) + getUang(t); });
  const rtChartData = Object.entries(rtMap).map(([name, value]) => ({ name, value }));

  const exportExcel = () => {
    const zakatSheet = zakatData.map(t => ({ 'Nama': t.nama_muzakki, 'Alamat': getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-', 'Jenis': getJenis(t), 'Uang': getUang(t), 'Beras': getBeras(t), 'Tanggal': t.tanggal }));
    const distSheet = distribusiData.map(d => ({ 'Mustahik': d.mustahik?.nama || '-', 'Alamat': getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat) || '-', 'Jenis': d.jenis_bantuan || 'Uang', 'Jumlah Uang': d.jenis_bantuan === 'Beras' ? 0 : Number(d.jumlah), 'Jumlah Beras (Liter)': d.jenis_bantuan === 'Beras' ? Number(d.jumlah_beras) : 0, 'Tanggal': d.tanggal }));
    const summarySheet = [{ Keterangan: 'Periode', Jumlah: filterLabel }, { Keterangan: 'Zakat Fitrah', Jumlah: stats.totalFitrah }, { Keterangan: 'Zakat Mal', Jumlah: stats.totalMal }, { Keterangan: 'Infaq', Jumlah: stats.totalInfaq }, { Keterangan: 'Fidyah', Jumlah: stats.totalFidyah }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zakatSheet), 'Data Zakat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distSheet), 'Distribusi');
    XLSX.writeFile(wb, `Laporan_Zakat_${filterLabel.replace(/\s/g, '_')}.xlsx`);
  };

  return (
    <PanitiaLayout>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-serif font-bold">Laporan Keuangan</h1>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={d => { setStartDate(d); zakatPag.goTo(1); distPag.goTo(1); }}
          onEndDateChange={d => { setEndDate(d); zakatPag.goTo(1); distPag.goTo(1); }}
        />
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Excel</Button>
          <Button size="sm" onClick={() => exportPdf({ title: 'Laporan Keuangan Zakat — Masjid Al-Ikhlas', subtitle: `Periode: ${filterLabel}`, headers: ['Nama', 'Alamat', 'Jenis', 'Uang', 'Beras', 'Tanggal'], rows: zakatData.map(t => [t.nama_muzakki, getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-', getJenis(t), fmt(getUang(t)), `${getBeras(t)}`, new Date(t.tanggal).toLocaleDateString('id-ID')]), filename: `Laporan_Keuangan_${filterLabel.replace(/\s/g, '_')}.pdf`, orientation: 'landscape' })}><FileText className="w-4 h-4 mr-1" />PDF Laporan</Button>
        </div>
      </div>

      {(startDate || endDate) && <p className="text-sm text-muted-foreground mb-4">Menampilkan data periode: <span className="font-medium text-foreground">{filterLabel}</span></p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[{ label: 'Zakat Fitrah', value: fmt(stats.totalFitrah) }, { label: 'Zakat Mal', value: fmt(stats.totalMal) }, { label: 'Infaq', value: fmt(stats.totalInfaq) }, { label: 'Fidyah', value: fmt(stats.totalFidyah) }, { label: 'Total Muzakki', value: stats.totalMuzakki.toString() }, { label: 'Jiwa Fitrah', value: `${stats.totalJiwaFitrah} Orang` }, { label: 'Beras Fitrah', value: `${stats.totalBerasFitrah} Liter` }, { label: 'Beras Fidyah', value: `${stats.totalBerasFidyah} Liter` }, { label: 'Total Beras', value: `${stats.totalBeras} Liter` }].map(s => (
          <Card key={s.label} className="hover:shadow-md transition-shadow"><CardContent className="p-4 sm:p-5 min-h-[100px] sm:min-h-[110px]"><p className="text-sm sm:text-base text-muted-foreground mb-2">{s.label}</p><p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tabular-nums">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="font-serif text-base sm:text-lg">Grafik Jenis Zakat</CardTitle></CardHeader><CardContent className="p-2 sm:p-6">{pieData.length > 0 ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v: number) => fmt(v)} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer> : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="font-serif text-base sm:text-lg">Zakat per RT</CardTitle></CardHeader><CardContent className="p-2 sm:p-6">{rtChartData.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={rtChartData} margin={{ left: -10, right: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} tick={{ fontSize: 10 }} /><YAxis fontSize={11} width={50} /><Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="hsl(152, 55%, 28%)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}</CardContent></Card>
      </div>

      <Card className="mb-6 hidden md:block">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">Data Zakat</CardTitle>
          <SearchInput placeholder="Cari nama muzakki..." value={searchZakat} onChange={v => { setSearchZakat(v); zakatPag.goTo(1); }} className="w-64" />
        </CardHeader>
        <CardContent className="overflow-auto p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Alamat</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>{zakatData.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nama_muzakki}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-'}</TableCell>
                <TableCell>{getJenis(t)}</TableCell>
                <TableCell>{fmt(getUang(t))}</TableCell>
                <TableCell>{getBeras(t)} Liter</TableCell>
                <TableCell>{new Date(t.tanggal).toLocaleDateString('id-ID')}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          <PaginationControls page={zakatPag.page} totalPages={zakatPag.totalPages} totalCount={zakatPag.totalCount} onNext={zakatPag.goNext} onPrev={zakatPag.goPrev} onGoTo={zakatPag.goTo} />
        </CardContent>
      </Card>
      <div className="md:hidden space-y-3 mb-6">
        <h2 className="font-serif font-semibold text-base">Data Zakat</h2>
        <SearchInput placeholder="Cari nama muzakki..." value={searchZakat} onChange={v => { setSearchZakat(v); zakatPag.goTo(1); }} />
        {zakatData.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data</p>}
        {zakatData.map(t => (
          <Card key={t.id}><CardContent className="p-3 space-y-1">
            <p className="font-semibold text-sm">{t.nama_muzakki}</p>
            {getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) && <p className="text-xs text-muted-foreground">{getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki)}</p>}
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span><span className="text-muted-foreground">Jenis:</span> {getJenis(t)}</span>
              <span><span className="text-muted-foreground">Uang:</span> {fmt(getUang(t))}</span>
              <span><span className="text-muted-foreground">Beras:</span> {getBeras(t)} Liter</span>
              <span><span className="text-muted-foreground">Tgl:</span> {new Date(t.tanggal).toLocaleDateString('id-ID')}</span>
            </div>
          </CardContent></Card>
        ))}
        <PaginationControls page={zakatPag.page} totalPages={zakatPag.totalPages} totalCount={zakatPag.totalCount} onNext={zakatPag.goNext} onPrev={zakatPag.goPrev} onGoTo={zakatPag.goTo} />
      </div>

      <Card className="mb-6 hidden md:block">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">Data Distribusi</CardTitle>
          <SearchInput placeholder="Cari nama mustahik..." value={searchDist} onChange={v => { setSearchDist(v); distPag.goTo(1); }} className="w-64" />
        </CardHeader>
        <CardContent className="overflow-auto p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>Alamat</TableHead><TableHead>Jenis</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>{distribusiData.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.mustahik?.nama || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat) || '-'}</TableCell>
                <TableCell>{d.jenis_bantuan || 'Uang'}</TableCell>
                <TableCell>{d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Liter` : fmt(Number(d.jumlah))}</TableCell>
                <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          <PaginationControls page={distPag.page} totalPages={distPag.totalPages} totalCount={distPag.totalCount} onNext={distPag.goNext} onPrev={distPag.goPrev} onGoTo={distPag.goTo} />
        </CardContent>
      </Card>
      <div className="md:hidden space-y-3">
        <h2 className="font-serif font-semibold text-base">Data Distribusi</h2>
        <SearchInput placeholder="Cari nama mustahik..." value={searchDist} onChange={v => { setSearchDist(v); distPag.goTo(1); }} />
        {distribusiData.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada data</p>}
        {distribusiData.map(d => (
          <Card key={d.id}><CardContent className="p-3 space-y-1">
            <p className="font-semibold text-sm">{d.mustahik?.nama || '-'}</p>
            {getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat) && <p className="text-xs text-muted-foreground">{getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat)}</p>}
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span><span className="text-muted-foreground">Jenis:</span> {d.jenis_bantuan || 'Uang'}</span>
              <span><span className="text-muted-foreground">Jumlah:</span> {d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Liter` : fmt(Number(d.jumlah))}</span>
              <span><span className="text-muted-foreground">Tgl:</span> {new Date(d.tanggal).toLocaleDateString('id-ID')}</span>
            </div>
          </CardContent></Card>
        ))}
        <PaginationControls page={distPag.page} totalPages={distPag.totalPages} totalCount={distPag.totalCount} onNext={distPag.goNext} onPrev={distPag.goPrev} onGoTo={distPag.goTo} />
      </div>
    </PanitiaLayout>
  );
}
