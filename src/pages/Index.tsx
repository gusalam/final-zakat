import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { Banknote, Users, Wheat, CalendarDays } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import logo from '@/assets/logo-masjid.webp';
import { useZakatStats } from '@/hooks/useZakatStats';
import SplashScreen from '@/components/SplashScreen';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import { useAnimationLoop } from '@/hooks/useAnimationLoop';
import InfiniteTickerList from '@/components/InfiniteTickerList';

const SPLASH_KEY = 'zakat-splash-shown';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];
const PAGE_SIZE = 100; // fetch more for auto-scroll
const VISIBLE_ROWS = 5;

export default function Index() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_KEY));
  const { stats, fetchStats } = useZakatStats();
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);
  const [rtChartData, setRtChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Search state
  const [zakatSearch, setZakatSearch] = useState('');
  const [distSearch, setDistSearch] = useState('');

  // Refs for latest values (avoid stale closures in realtime callbacks)
  const zakatSearchRef = useRef('');
  const distSearchRef = useRef('');

  // Sync refs
  zakatSearchRef.current = zakatSearch;
  distSearchRef.current = distSearch;

  // Auto-scroll hooks
  // Search-based pause for ticker
  const zakatTickerPaused = !!zakatSearch;
  const distTickerPaused = !!distSearch;

  // Debounce timer refs
  const zakatDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const distDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ---- Fetch zakat data (all matching, no pagination) ----
  const fetchZakat = useCallback(async (search: string) => {
    let query = supabase
      .from('transaksi_zakat')
      .select('id, nama_muzakki, alamat_muzakki, tanggal, rt(nama_rt), detail_zakat(jenis_zakat, jumlah_uang, jumlah_beras, jumlah_jiwa)')
      .order('tanggal', { ascending: false })
      .limit(PAGE_SIZE);

    if (search.trim()) {
      query = query.ilike('nama_muzakki', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error) setZakatData(data || []);
  }, []);

  // ---- Fetch distribusi data (all matching, no pagination) ----
  const fetchDistribusi = useCallback(async (search: string) => {
    const { data, error } = await supabase
      .from('distribusi')
      .select('id, jumlah, jumlah_beras, jenis_bantuan, sumber_zakat, tanggal, mustahik!inner(nama, alamat, rt(nama_rt))')
      .order('tanggal', { ascending: false })
      .ilike('mustahik.nama', search.trim() ? `%${search.trim()}%` : '%')
      .limit(PAGE_SIZE);

    if (!error) setDistribusiData(data || []);
  }, []);

  // ---- Fetch chart data ----
  const fetchChartData = useCallback(async () => {
    const { data } = await supabase.rpc('get_zakat_per_rt');
    if (data && Array.isArray(data)) {
      setRtChartData(data.map((r: any) => ({ name: r.nama_rt, value: Number(r.total_zakat) })));
    }
  }, []);

  // ---- Initial load ----
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          fetchStats(),
          fetchZakat(''),
          fetchDistribusi(''),
          fetchChartData(),
        ]);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ---- Realtime channels ----
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      fetchStats();
      fetchZakat(zakatSearchRef.current);
      fetchDistribusi(distSearchRef.current);
      fetchChartData();
      setLastUpdated(new Date());
    };

    const ch1 = supabase.channel('pub-zakat-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, handleRealtimeUpdate)
      .subscribe();
    const ch2 = supabase.channel('pub-dist-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchStats, fetchZakat, fetchDistribusi, fetchChartData]);

  // ---- Search handlers with debounce ----
  const handleZakatSearch = (value: string) => {
    setZakatSearch(value);
    clearTimeout(zakatDebounceRef.current);
    zakatDebounceRef.current = setTimeout(() => {
      fetchZakat(value);
    }, 400);
  };

  const handleDistSearch = (value: string) => {
    setDistSearch(value);
    clearTimeout(distDebounceRef.current);
    distDebounceRef.current = setTimeout(() => {
      fetchDistribusi(value);
    }, 400);
  };

  const pieKey = useAnimationLoop(20000);
  const barKey = useAnimationLoop(25000);

  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah },
    { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq },
    { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (showSplash) return <SplashScreen onComplete={() => { sessionStorage.setItem(SPLASH_KEY, '1'); setShowSplash(false); }} />;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <img src={logo} alt="Logo Masjid Al-Ikhlas" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-foreground/20 p-1 flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold leading-tight">Sistem Zakat Masjid Al-Ikhlas</h1>
              <p className="text-sm sm:text-base md:text-lg opacity-90 mt-0.5">Transparansi Zakat Online — Ramadhan 1447H</p>
            </div>
          </div>
          <Link to="/login" className="hidden md:inline-flex px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition text-base">Login Panitia</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="flex items-center gap-2 text-sm md:text-base text-muted-foreground">
          <CalendarDays className="w-4 h-4 md:w-5 md:h-5" /><span>Data diperbarui: {fmtDate(lastUpdated)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Zakat Fitrah', value: stats.totalFitrah, icon: Banknote, color: 'text-primary', isCurrency: true },
            { label: 'Zakat Mal', value: stats.totalMal, icon: Banknote, color: 'text-secondary', isCurrency: true },
            { label: 'Infaq', value: stats.totalInfaq, icon: Banknote, color: 'text-primary', isCurrency: true },
            { label: 'Fidyah', value: stats.totalFidyah, icon: Banknote, color: 'text-secondary', isCurrency: true },
            { label: 'Total Muzakki', value: stats.totalMuzakki, icon: Users, color: 'text-primary' },
            { label: 'Total Mustahik', value: stats.totalMustahik, icon: Users, color: 'text-secondary', suffix: ' Orang' },
            { label: 'Jiwa Fitrah', value: stats.totalJiwaFitrah, icon: Users, color: 'text-primary', suffix: ' Orang' },
            { label: 'Beras Fitrah', value: stats.totalBerasFitrah, icon: Wheat, color: 'text-primary', suffix: ' Liter' },
            { label: 'Beras Fidyah', value: stats.totalBerasFidyah, icon: Wheat, color: 'text-secondary', suffix: ' Liter' },
            { label: 'Total Beras', value: stats.totalBeras, icon: Wheat, color: 'text-primary', suffix: ' Liter' },
          ].map((stat) => (
            <AnimatedStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} isCurrency={stat.isCurrency} suffix={stat.suffix} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3"><CardTitle className="font-serif text-xl sm:text-2xl">Grafik Jenis Zakat</CardTitle></CardHeader>
            <CardContent className="p-4 sm:p-6">
              {pieData.length > 0 ? (
                <ResponsiveContainer key={`pie-${pieKey}`} width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" isAnimationActive animationBegin={0} animationDuration={1200} animationEasing="ease-out" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-base py-12">Belum ada data zakat</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3"><CardTitle className="font-serif text-xl sm:text-2xl">Zakat per RT</CardTitle></CardHeader>
            <CardContent className="p-4 sm:p-6">
              {rtChartData.length > 0 ? (
                <ResponsiveContainer key={`bar-${barKey}`} width="100%" height={320}>
                  <BarChart data={rtChartData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={13} /><YAxis fontSize={13} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationBegin={0} animationDuration={1500} animationEasing="ease-out">
                      {rtChartData.map((_, index) => (
                        <Cell key={index} fill={['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#6366F1', '#D946EF', '#22C55E', '#EAB308', '#0EA5E9'][index % 15]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-base py-12">Belum ada data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Transparansi Zakat */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-serif text-xl sm:text-2xl mb-3">Transparansi Zakat</CardTitle>
            <SearchInput placeholder="Cari nama muzakki..." value={zakatSearch} onChange={handleZakatSearch} />
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table Header - hidden on mobile */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-4 px-4 sm:px-6 py-3 border-b-2 border-border text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <div>Nama Muzakki</div><div>Jenis Zakat</div><div>Jumlah</div><div>Tanggal</div>
            </div>
            <InfiniteTickerList
              data={zakatData}
              visibleCount={VISIBLE_ROWS}
              isPaused={zakatTickerPaused}
              renderRow={(z: any, idx: number) => {
                const details = z.detail_zakat || [];
                const totalUang = details.reduce((s: number, d: any) => s + Number(d.jumlah_uang || 0), 0);
                const totalBeras = details.reduce((s: number, d: any) => s + Number(d.jumlah_beras || 0), 0);
                const jenisLabels = details.map((d: any) => {
                  if (d.jenis_zakat === 'Zakat Fitrah') {
                    const beras = Number(d.jumlah_beras || 0);
                    const uang = Number(d.jumlah_uang || 0);
                    if (beras > 0 && uang === 0) return `Zakat Fitrah — ${beras} Liter`;
                    if (uang > 0 && beras === 0) return `Zakat Fitrah — Rp ${new Intl.NumberFormat('id-ID').format(uang)}`;
                    return d.jenis_zakat;
                  }
                  return d.jenis_zakat;
                }).join(', ');
                return (
                  <>
                    {/* Mobile Card Layout */}
                    <div className="md:hidden px-4 py-4 border-b border-border space-y-2">
                      <div className="font-semibold text-base leading-relaxed break-words">{z.nama_muzakki}</div>
                      {(z.rt?.nama_rt || z.alamat_muzakki) && (
                        <div className="text-sm text-muted-foreground break-words">
                          {[z.rt?.nama_rt, z.alamat_muzakki].filter(Boolean).join(' — ')}
                        </div>
                      )}
                      <div className="text-base"><span className="text-muted-foreground text-sm">Jenis Zakat:</span> {jenisLabels || '-'}</div>
                      <div className="text-base font-medium"><span className="text-muted-foreground text-sm font-normal">Jumlah:</span> {totalUang > 0 ? fmt(totalUang) : ''}{totalUang > 0 && totalBeras > 0 ? ' + ' : ''}{totalBeras > 0 ? `${totalBeras} Liter` : ''}</div>
                      <div className="text-sm text-muted-foreground">Tanggal: {new Date(z.tanggal).toLocaleDateString('id-ID')}</div>
                    </div>
                    {/* Desktop Table Layout */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-4 px-4 sm:px-6 py-3 border-b border-border text-base leading-relaxed">
                      <div className="font-medium break-words">
                        {z.nama_muzakki}
                        {(z.rt?.nama_rt || z.alamat_muzakki) && (
                          <span className="block text-sm text-muted-foreground mt-0.5 break-words">
                            {[z.rt?.nama_rt, z.alamat_muzakki].filter(Boolean).join(' — ')}
                          </span>
                        )}
                      </div>
                      <div className="break-words">{jenisLabels || '-'}</div>
                      <div className="break-words">{totalUang > 0 ? fmt(totalUang) : ''}{totalUang > 0 && totalBeras > 0 ? ' + ' : ''}{totalBeras > 0 ? `${totalBeras} Liter` : ''}</div>
                      <div>{new Date(z.tanggal).toLocaleDateString('id-ID')}</div>
                    </div>
                  </>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Distribusi Zakat */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-serif text-xl sm:text-2xl mb-3">Distribusi Zakat</CardTitle>
            <SearchInput placeholder="Cari nama mustahik..." value={distSearch} onChange={handleDistSearch} />
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table Header - hidden on mobile */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-4 px-4 sm:px-6 py-3 border-b-2 border-border text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <div>Nama Mustahik</div><div>Sumber Zakat</div><div>Jumlah Bantuan</div><div>Tanggal</div>
            </div>
            <InfiniteTickerList
              data={distribusiData}
              visibleCount={VISIBLE_ROWS}
              isPaused={distTickerPaused}
              renderRow={(d: any, idx: number) => (
                <>
                  {/* Mobile Card Layout */}
                  <div className="md:hidden px-4 py-4 border-b border-border space-y-2">
                    <div className="font-semibold text-base leading-relaxed break-words">{d.mustahik?.nama || '-'}</div>
                    {(d.mustahik?.rt?.nama_rt || d.mustahik?.alamat) && (
                      <div className="text-sm text-muted-foreground break-words">
                        {[d.mustahik?.rt?.nama_rt, d.mustahik?.alamat].filter(Boolean).join(' — ')}
                      </div>
                    )}
                    <div className="text-base"><span className="text-muted-foreground text-sm">Sumber Zakat:</span> {d.sumber_zakat || '-'}</div>
                    <div className="text-base font-medium"><span className="text-muted-foreground text-sm font-normal">Jumlah Bantuan:</span> {d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Liter Beras` : fmt(Number(d.jumlah))}</div>
                    <div className="text-sm text-muted-foreground">Tanggal: {new Date(d.tanggal).toLocaleDateString('id-ID')}</div>
                  </div>
                  {/* Desktop Table Layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-4 px-4 sm:px-6 py-3 border-b border-border text-base leading-relaxed">
                    <div className="font-medium break-words">
                      {d.mustahik?.nama || '-'}
                      {(d.mustahik?.rt?.nama_rt || d.mustahik?.alamat) && (
                        <span className="block text-sm text-muted-foreground mt-0.5 break-words">
                          {[d.mustahik?.rt?.nama_rt, d.mustahik?.alamat].filter(Boolean).join(' — ')}
                        </span>
                      )}
                    </div>
                    <div className="break-words">{d.sumber_zakat || '-'}</div>
                    <div className="break-words">{d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Liter Beras` : fmt(Number(d.jumlah))}</div>
                    <div>{new Date(d.tanggal).toLocaleDateString('id-ID')}</div>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>
      </main>

      <footer className="bg-primary text-primary-foreground py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-serif text-xl md:text-2xl">Masjid Al-Ikhlas</p>
          <p className="text-base md:text-lg opacity-75 mt-2">Sistem Transparansi Zakat — {new Date().getFullYear()}</p>
          <Link to="/login" className="text-base underline opacity-75 mt-3 inline-block md:hidden">Login Panitia</Link>
        </div>
      </footer>
    </div>
  );
}
