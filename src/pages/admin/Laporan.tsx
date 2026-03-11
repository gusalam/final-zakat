import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText, Users } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import * as XLSX from 'xlsx';
import { exportPdf } from '@/lib/exportPdf';
import { useZakatStats } from '@/hooks/useZakatStats';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DateRangeFilter from '@/components/DateRangeFilter';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

const getAlamatLabel = (rt?: string, alamat?: string) => [rt, alamat].filter(Boolean).join(' — ');

interface PanitiaOption {
  id: string;
  name: string;
}

export default function Laporan() {
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

  // Panitia filter
  const [panitiaList, setPanitiaList] = useState<PanitiaOption[]>([]);
  const [selectedPanitia, setSelectedPanitia] = useState<string>('all');

  // Fetch panitia list
  useEffect(() => {
    const fetchPanitia = async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['panitia', 'admin']);
      if (!roles) return;
      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) return;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)
        .order('name');
      if (profiles) {
        setPanitiaList(profiles.map(p => ({ id: p.id, name: p.name })));
      }
    };
    fetchPanitia();
  }, []);

  const selectedPanitiaName = selectedPanitia === 'all'
    ? 'Semua Panitia'
    : panitiaList.find(p => p.id === selectedPanitia)?.name || 'Panitia';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch global stats if no panitia filter (RPC doesn't support created_by filter)
        if (selectedPanitia === 'all') {
          await fetchStats(startDate, endDate);
        }

        const distJoin = debouncedSearchDist.trim() ? 'mustahik!inner(nama, alamat, rt(nama_rt))' : 'mustahik(nama, alamat, rt(nama_rt))';
        let zq = supabase.from('transaksi_zakat').select('*, rt(nama_rt), detail_zakat(*)', { count: 'exact' }).order('tanggal', { ascending: false });
        let dq = supabase.from('distribusi').select(`*, ${distJoin}`, { count: 'exact' }).order('tanggal', { ascending: false });

        if (startDate) { zq = zq.gte('tanggal', startDate); dq = dq.gte('tanggal', startDate); }
        if (endDate) { zq = zq.lte('tanggal', endDate); dq = dq.lte('tanggal', endDate); }
        if (debouncedSearchZakat.trim()) zq = zq.ilike('nama_muzakki', `%${debouncedSearchZakat.trim()}%`);
        if (debouncedSearchDist.trim()) dq = dq.ilike('mustahik.nama', `%${debouncedSearchDist.trim()}%`);

        // Apply panitia filter
        if (selectedPanitia !== 'all') {
          zq = zq.eq('created_by', selectedPanitia);
          dq = dq.eq('created_by', selectedPanitia);
        }

        const [zResult, dResult] = await Promise.all([zq.range(zakatPag.from, zakatPag.to), dq.range(distPag.from, distPag.to)]);
        if (zResult.error?.message?.includes('range not satisfiable')) { zakatPag.goTo(1); return; }
        if (dResult.error?.message?.includes('range not satisfiable')) { distPag.goTo(1); return; }
        if (zResult.error) throw zResult.error; if (dResult.error) throw dResult.error;
        setZakatData(zResult.data || []); zakatPag.setTotalCount(zResult.count || 0);
        setDistribusiData(dResult.data || []); distPag.setTotalCount(dResult.count || 0);

        // When panitia filter is active, calculate stats from ALL matching data (not just current page)
        if (selectedPanitia !== 'all') {
          let allZq = supabase.from('transaksi_zakat').select('detail_zakat(jenis_zakat, jumlah_uang, jumlah_beras, jumlah_jiwa)').eq('created_by', selectedPanitia);
          if (startDate) allZq = allZq.gte('tanggal', startDate);
          if (endDate) allZq = allZq.lte('tanggal', endDate);
          const { data: allZ } = await allZq;
          if (allZ) {
            let totalFitrah = 0, totalMal = 0, totalInfaq = 0, totalFidyah = 0;
            let totalBerasFitrah = 0, totalBerasFidyah = 0, totalJiwaFitrah = 0;
            const muzakkiNames = new Set<string>();
            
            // Also get nama_muzakki for counting
            let countQ = supabase.from('transaksi_zakat').select('nama_muzakki').eq('created_by', selectedPanitia);
            if (startDate) countQ = countQ.gte('tanggal', startDate);
            if (endDate) countQ = countQ.lte('tanggal', endDate);
            const { data: countData } = await countQ;
            countData?.forEach(t => muzakkiNames.add(t.nama_muzakki));

            allZ.forEach((t: any) => {
              (t.detail_zakat || []).forEach((d: any) => {
                const uang = Number(d.jumlah_uang) || 0;
                const beras = Number(d.jumlah_beras) || 0;
                const jiwa = Number(d.jumlah_jiwa) || 0;
                switch (d.jenis_zakat) {
                  case 'Zakat Fitrah': totalFitrah += uang; totalBerasFitrah += beras; totalJiwaFitrah += jiwa; break;
                  case 'Zakat Mal': totalMal += uang; break;
                  case 'Infaq': case 'Shodaqoh': totalInfaq += uang; break;
                  case 'Fidyah': totalFidyah += uang; totalBerasFidyah += beras; break;
                }
              });
            });

            // We need to manually set stats since we can't use the RPC
            // Using a workaround: dispatch stats directly
            await fetchStats(startDate, endDate);
            // Override with panitia-specific values - we'll use a local override approach
          }
        }
      } catch (err) { toast({ title: 'Gagal memuat data', description: friendlyError(err), variant: 'destructive' }); }
    };
    fetchData();
  }, [zakatPag.page, distPag.page, startDate, endDate, debouncedSearchZakat, debouncedSearchDist, selectedPanitia]);

  // Calculate panitia-specific stats from data when filter active
  const [panitiaStats, setPanitiaStats] = useState<any>(null);
  
  useEffect(() => {
    if (selectedPanitia === 'all') {
      setPanitiaStats(null);
      return;
    }
    const calcStats = async () => {
      let allZq = supabase.from('transaksi_zakat').select('nama_muzakki, detail_zakat(jenis_zakat, jumlah_uang, jumlah_beras, jumlah_jiwa)').eq('created_by', selectedPanitia);
      if (startDate) allZq = allZq.gte('tanggal', startDate);
      if (endDate) allZq = allZq.lte('tanggal', endDate);
      const { data: allZ, count } = await allZq;
      
      if (!allZ) { setPanitiaStats(null); return; }

      let totalFitrah = 0, totalMal = 0, totalInfaq = 0, totalFidyah = 0;
      let totalBerasFitrah = 0, totalBerasFidyah = 0, totalJiwaFitrah = 0;
      const muzakkiNames = new Set<string>();

      allZ.forEach((t: any) => {
        muzakkiNames.add(t.nama_muzakki);
        (t.detail_zakat || []).forEach((d: any) => {
          const uang = Number(d.jumlah_uang) || 0;
          const beras = Number(d.jumlah_beras) || 0;
          const jiwa = Number(d.jumlah_jiwa) || 0;
          switch (d.jenis_zakat) {
            case 'Zakat Fitrah': totalFitrah += uang; totalBerasFitrah += beras; totalJiwaFitrah += jiwa; break;
            case 'Zakat Mal': totalMal += uang; break;
            case 'Infaq': case 'Shodaqoh': totalInfaq += uang; break;
            case 'Fidyah': totalFidyah += uang; totalBerasFidyah += beras; break;
          }
        });
      });

      setPanitiaStats({
        totalFitrah, totalMal, totalInfaq, totalFidyah,
        totalZakat: totalFitrah + totalMal + totalInfaq + totalFidyah,
        totalBerasFitrah, totalBerasFidyah,
        totalBeras: totalBerasFitrah + totalBerasFidyah,
        totalJiwaFitrah,
        totalMuzakki: muzakkiNames.size,
        totalZakatCount: allZ.length,
      });
    };
    calcStats();
  }, [selectedPanitia, startDate, endDate]);

  // Use panitia stats when filtered, otherwise global stats
  const displayStats = panitiaStats && selectedPanitia !== 'all' ? {
    ...stats,
    totalFitrah: panitiaStats.totalFitrah,
    totalMal: panitiaStats.totalMal,
    totalInfaq: panitiaStats.totalInfaq,
    totalFidyah: panitiaStats.totalFidyah,
    totalZakat: panitiaStats.totalZakat,
    totalBerasFitrah: panitiaStats.totalBerasFitrah,
    totalBerasFidyah: panitiaStats.totalBerasFidyah,
    totalBeras: panitiaStats.totalBeras,
    totalJiwaFitrah: panitiaStats.totalJiwaFitrah,
    totalMuzakki: panitiaStats.totalMuzakki,
    totalZakatCount: panitiaStats.totalZakatCount,
  } : stats;

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const filterLabel = startDate && endDate
    ? `${format(new Date(startDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })} — ${format(new Date(endDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}`
    : startDate ? `Dari ${format(new Date(startDate + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}` : 'Semua Periode';

  const getJenis = (t: any) => (t.detail_zakat || []).map((d: any) => d.jenis_zakat).join(', ');
  const getUang = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
  const getBeras = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);

  const pieData = [
    { name: 'Zakat Fitrah', value: displayStats.totalFitrah }, { name: 'Zakat Mal', value: displayStats.totalMal },
    { name: 'Infaq', value: displayStats.totalInfaq }, { name: 'Fidyah', value: displayStats.totalFidyah },
  ].filter(d => d.value > 0);

  const rtMap: Record<string, number> = {};
  zakatData.forEach(t => { const rt = t.rt?.nama_rt || 'Lainnya'; rtMap[rt] = (rtMap[rt] || 0) + getUang(t); });
  const rtChartData = Object.entries(rtMap).map(([name, value]) => ({ name, value }));

  const exportExcel = () => {
    const zakatSheet = zakatData.map(t => ({ 'Nama Muzakki': t.nama_muzakki, 'Alamat': getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-', 'Jenis': getJenis(t), 'Jumlah Uang': getUang(t), 'Jumlah Beras': getBeras(t), 'Tanggal': t.tanggal }));
    const distSheet = distribusiData.map(d => ({ 'Nama Mustahik': d.mustahik?.nama || '-', 'Alamat': getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat) || '-', 'Jenis': d.jenis_bantuan || 'Uang', 'Jumlah Uang': d.jenis_bantuan === 'Beras' ? 0 : Number(d.jumlah), 'Jumlah Beras (Liter)': d.jenis_bantuan === 'Beras' ? Number(d.jumlah_beras) : 0, 'Tanggal': d.tanggal }));
    const summarySheet = [{ Keterangan: 'Periode', Jumlah: filterLabel }, { Keterangan: 'Panitia', Jumlah: selectedPanitiaName }, { Keterangan: 'Zakat Fitrah', Jumlah: displayStats.totalFitrah }, { Keterangan: 'Zakat Mal', Jumlah: displayStats.totalMal }, { Keterangan: 'Infaq', Jumlah: displayStats.totalInfaq }, { Keterangan: 'Fidyah', Jumlah: displayStats.totalFidyah }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zakatSheet), 'Data Zakat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distSheet), 'Distribusi');
    XLSX.writeFile(wb, `Laporan_Zakat_${filterLabel.replace(/\s/g, '_')}.xlsx`);
  };

  const exportCSV = () => {
    const rows = zakatData.map(t => `"${t.nama_muzakki}","${getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-'}","${getJenis(t)}",${getUang(t)},${getBeras(t)},"${t.tanggal}"`);
    const csv = 'Nama,Alamat,Jenis,Uang,Beras,Tanggal\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `laporan_zakat_${filterLabel.replace(/\s/g, '_')}.csv`; a.click();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-serif font-bold">Laporan</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={d => { setStartDate(d); zakatPag.goTo(1); distPag.goTo(1); }}
            onEndDateChange={d => { setEndDate(d); zakatPag.goTo(1); distPag.goTo(1); }}
          />
          {/* Filter Panitia */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedPanitia} onValueChange={v => { setSelectedPanitia(v); zakatPag.goTo(1); distPag.goTo(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih Panitia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Panitia</SelectItem>
                {panitiaList.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportPdf({ title: 'Laporan Zakat — Masjid Al-Ikhlas', subtitle: `Periode: ${filterLabel} | Panitia: ${selectedPanitiaName}`, headers: ['Nama', 'Alamat', 'Jenis', 'Uang', 'Beras', 'Tanggal'], rows: zakatData.map(t => [t.nama_muzakki, getAlamatLabel(t.rt?.nama_rt, t.alamat_muzakki) || '-', getJenis(t), fmt(getUang(t)), `${getBeras(t)}`, new Date(t.tanggal).toLocaleDateString('id-ID')]), filename: `Laporan_Zakat_${filterLabel.replace(/\s/g, '_')}.pdf`, orientation: 'landscape' })}><FileText className="w-4 h-4 mr-1" />PDF Zakat</Button>
          <Button size="sm" onClick={() => exportPdf({ title: 'Laporan Distribusi — Masjid Al-Ikhlas', subtitle: `Periode: ${filterLabel} | Panitia: ${selectedPanitiaName}`, headers: ['Mustahik', 'Alamat', 'Jenis', 'Jumlah', 'Tanggal'], rows: distribusiData.map(d => [d.mustahik?.nama || '-', getAlamatLabel(d.mustahik?.rt?.nama_rt, d.mustahik?.alamat) || '-', d.jenis_bantuan || 'Uang', d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Liter` : fmt(Number(d.jumlah)), new Date(d.tanggal).toLocaleDateString('id-ID')]), filename: `Laporan_Distribusi_${filterLabel.replace(/\s/g, '_')}.pdf` })}><FileText className="w-4 h-4 mr-1" />PDF Distribusi</Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
        <span>Menampilkan data dari: <span className="font-medium text-foreground">{selectedPanitiaName}</span></span>
        {(startDate || endDate) && <span>| Periode: <span className="font-medium text-foreground">{filterLabel}</span></span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[{ label: 'Zakat Fitrah', value: fmt(displayStats.totalFitrah) }, { label: 'Zakat Mal', value: fmt(displayStats.totalMal) }, { label: 'Infaq', value: fmt(displayStats.totalInfaq) }, { label: 'Fidyah', value: fmt(displayStats.totalFidyah) }, { label: 'Total Muzakki', value: displayStats.totalMuzakki.toString() }, { label: 'Jiwa Fitrah', value: `${displayStats.totalJiwaFitrah} Orang` }, { label: 'Beras Fitrah', value: `${displayStats.totalBerasFitrah} Liter` }, { label: 'Beras Fidyah', value: `${displayStats.totalBerasFidyah} Liter` }, { label: 'Total Beras', value: `${displayStats.totalBeras} Liter` }].map(s => (
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
    </AdminLayout>
  );
}
