import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import { toast } from 'sonner';
import { Plus, Eye, Download } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import KwitansiZakat, { KwitansiData, DetailZakatItem } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import PaginationControls from '@/components/PaginationControls';
import { downloadKwitansiPdf } from '@/lib/downloadKwitansi';
import ZakatDetailFields, { DetailForm, emptyDetail } from '@/components/ZakatDetailFields';

interface MuzakkiSuggestion {
  nama_muzakki: string;
  jumlah_jiwa: number;
  rt_id: string | null;
}

const emptyForm = () => ({
  nama_muzakki: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0],
  penerima: '', alamat: '', status_muzakki: 'RT', alamat_muzakki: '',
});

export default function InputZakat() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [detail, setDetail] = useState<DetailForm>(emptyDetail());
  const [showForm, setShowForm] = useState(false);
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pag = usePagination(50);
  const [listSearch, setListSearch] = useState('');
  const debouncedListSearch = useDebounce(listSearch, 400);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MuzakkiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    let query = supabase.from('transaksi_zakat').select('*, rt(nama_rt), detail_zakat(*), profiles:created_by(name)', { count: 'exact' }).order('tanggal', { ascending: false });
    if (debouncedListSearch.trim()) query = query.ilike('nama_muzakki', `%${debouncedListSearch.trim()}%`);
    const [{ data: transaksi, count }, { data: rt }] = await Promise.all([
      query.range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(transaksi || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page, debouncedListSearch]);

  const searchMuzakki = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('transaksi_zakat')
      .select('nama_muzakki, rt_id')
      .ilike('nama_muzakki', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    const seen = new Map<string, MuzakkiSuggestion>();
    (data || []).forEach(d => {
      if (!seen.has(d.nama_muzakki)) {
        seen.set(d.nama_muzakki, { nama_muzakki: d.nama_muzakki, jumlah_jiwa: 1, rt_id: d.rt_id });
      }
    });
    setSuggestions(Array.from(seen.values()));
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setForm(f => ({ ...f, nama_muzakki: value }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { searchMuzakki(value); setShowSuggestions(true); }, 300);
  };

  const selectMuzakki = (m: MuzakkiSuggestion) => {
    setForm(f => ({ ...f, nama_muzakki: m.nama_muzakki, rt_id: m.rt_id || '' }));
    setSearchQuery(m.nama_muzakki);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetForm = () => { setForm(emptyForm()); setDetail(emptyDetail()); setSearchQuery(''); setShowSuggestions(false); };

  const LITER_PER_JIWA = 3.5;

  const buildDetails = (): DetailZakatItem[] => {
    const items: DetailZakatItem[] = [];
    if (detail.fitrah.enabled) {
      const jiwa = Number(detail.fitrah.jumlah_jiwa) || 1;
      const metode = detail.fitrah.metode;
      const harga = Number(detail.fitrah.harga_beras_per_liter) || 0;
      items.push({
        jenis_zakat: 'Zakat Fitrah',
        jumlah_uang: metode === 'uang' ? jiwa * LITER_PER_JIWA * harga : 0,
        jumlah_beras: metode === 'beras' ? jiwa * LITER_PER_JIWA : 0,
        jumlah_jiwa: jiwa,
        metode_pembayaran: metode,
        harga_beras_per_liter: harga || null,
      });
    }
    if (detail.mal.enabled) items.push({ jenis_zakat: 'Zakat Mal', jumlah_uang: Number(detail.mal.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.infaq.enabled) items.push({ jenis_zakat: 'Infaq', jumlah_uang: Number(detail.infaq.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.fidyah.enabled) {
      const jiwa = Number(detail.fidyah.jumlah_jiwa) || 1;
      const metode = detail.fidyah.metode;
      const harga = Number(detail.fidyah.harga_beras_per_liter) || 0;
      items.push({
        jenis_zakat: 'Fidyah',
        jumlah_uang: metode === 'uang' ? jiwa * LITER_PER_JIWA * harga : 0,
        jumlah_beras: metode === 'beras' ? jiwa * LITER_PER_JIWA : 0,
        jumlah_jiwa: jiwa,
        metode_pembayaran: metode,
        harga_beras_per_liter: harga || null,
      });
    }
    return items;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.nama_muzakki.trim()) { toast.error('Nama muzakki wajib diisi'); return; }
    if (!form.alamat_muzakki.trim()) { toast.error('Alamat muzakki wajib diisi untuk transparansi data.'); return; }
    const items = buildDetails();
    if (items.length === 0) { toast.error('Pilih minimal satu jenis zakat'); return; }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase.from('transaksi_zakat').insert({
        nama_muzakki: form.nama_muzakki.trim(),
        rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
        tanggal: form.tanggal, created_by: user?.id, status_muzakki: form.status_muzakki,
        alamat_muzakki: form.alamat_muzakki.trim() || null,
      }).select('id, nomor_kwitansi, receipt_number').single();
      if (error) { toast.error(friendlyError(error)); return; }

      const detailRows = items.map(d => ({ transaksi_id: inserted.id, ...d }));
      const { error: detailError } = await supabase.from('detail_zakat').insert(detailRows);
      if (detailError) { toast.error(friendlyError(detailError)); return; }

      toast.success(`Zakat ${form.nama_muzakki} berhasil disimpan`);
      const rtName = form.status_muzakki === 'RT' && form.rt_id ? rtList.find((r: any) => r.id === form.rt_id)?.nama_rt : undefined;
      setKwitansiData({ nomor: inserted.nomor_kwitansi, receipt_number: inserted.receipt_number, nama_muzakki: form.nama_muzakki, status_muzakki: form.status_muzakki || undefined, rt_nama: rtName, alamat_muzakki: form.alamat_muzakki.trim() || undefined, details: items, tanggal: form.tanggal, penerima: profile?.name || 'Panitia Zakat' });
      setKwitansiOpen(true);
      resetForm();
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const getCreatorName = (t: any) => t.profiles?.name || 'Panitia Zakat';

  const toKwitansiData = (t: any): KwitansiData => ({
    nomor: t.nomor_kwitansi || 0, receipt_number: t.receipt_number || undefined, nama_muzakki: t.nama_muzakki,
    status_muzakki: t.status_muzakki || undefined, rt_nama: t.rt?.nama_rt || undefined,
    alamat_muzakki: t.alamat_muzakki || undefined,
    details: (t.detail_zakat || []).map((d: any) => ({ jenis_zakat: d.jenis_zakat, jumlah_uang: Number(d.jumlah_uang) || 0, jumlah_beras: Number(d.jumlah_beras) || 0, jumlah_jiwa: Number(d.jumlah_jiwa) || 0, metode_pembayaran: d.metode_pembayaran || null, harga_beras_per_liter: Number(d.harga_beras_per_liter) || null })),
    tanggal: t.tanggal, penerima: getCreatorName(t),
  });

  const showKwitansi = (t: any) => { setKwitansiData(toKwitansiData(t)); setKwitansiOpen(true); };
  const handleDownloadKwitansi = (t: any) => { downloadKwitansiPdf(toKwitansiData(t)); };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const getJenisLabels = (t: any) => (t.detail_zakat || []).map((d: any) => d.jenis_zakat).join(', ');
  const getTotalUang = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
  const getTotalBeras = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);

  const handleDetailChange = useCallback((updater: (prev: DetailForm) => DetailForm) => {
    setDetail(updater);
  }, []);


  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Input Zakat</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />{showForm ? 'Tutup Form' : 'Tambah Zakat'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Form Input Zakat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Nama Muzakki */}
            <div className="relative" ref={suggestionsRef}>
              <Label>Nama Muzakki <span className="text-destructive">*</span></Label>
              <Input value={searchQuery || form.nama_muzakki} onChange={e => handleSearchInput(e.target.value)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} placeholder="Masukkan nama muzakki" />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((m, i) => (
                    <button key={`${m.nama_muzakki}-${i}`} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors" onClick={() => selectMuzakki(m)}>
                      <span className="font-medium">{m.nama_muzakki}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Muzakki */}
            <div>
              <Label>Status Muzakki</Label>
              <Select value={form.status_muzakki} onValueChange={v => setForm({ ...form, status_muzakki: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="RT">RT</SelectItem><SelectItem value="Jamaah">Jamaah</SelectItem></SelectContent>
              </Select>
            </div>

            {form.status_muzakki === 'RT' && (
              <div>
                <Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div><Label>Alamat Muzakki <span className="text-destructive">*</span></Label><Input value={form.alamat_muzakki} onChange={e => setForm({ ...form, alamat_muzakki: e.target.value })} placeholder="Contoh: Gang Melati, Jakarta" required /></div>

            <ZakatDetailFields detail={detail} onChange={handleDetailChange} idPrefix="panitia" />

            <div><Label>Tanggal Transaksi</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting}><Plus className="w-4 h-4 mr-1" />Simpan</Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="hidden md:block">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">Riwayat Zakat</CardTitle>
          <SearchInput placeholder="Cari nama muzakki..." value={listSearch} onChange={v => { setListSearch(v); pag.goTo(1); }} className="w-64" />
        </CardHeader>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Jenis</TableHead><TableHead>Total Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead><TableHead>Input oleh</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.receipt_number || t.nomor_kwitansi}</TableCell>
                  <TableCell>{t.nama_muzakki}</TableCell>
                  <TableCell><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>{t.status_muzakki || 'RT'}</span></TableCell>
                  <TableCell>{getJenisLabels(t)}</TableCell>
                  <TableCell>{fmt(getTotalUang(t))}</TableCell>
                  <TableCell>{getTotalBeras(t)} Liter</TableCell>
                  <TableCell>{new Date(t.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{getCreatorName(t)}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => showKwitansi(t)} title="Lihat Kwitansi"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadKwitansi(t)} title="Download Kwitansi"><Download className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4"><PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} /></div>
        </CardContent>
      </Card>

      {/* Riwayat - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-serif font-semibold text-base">Riwayat Zakat</h2>
        </div>
        <SearchInput placeholder="Cari nama muzakki..." value={listSearch} onChange={v => { setListSearch(v); pag.goTo(1); }} />
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{t.receipt_number || `#${t.nomor_kwitansi}`} — {t.nama_muzakki}</p>
                  {t.alamat_muzakki && <p className="text-xs text-muted-foreground">{t.alamat_muzakki}</p>}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(t.detail_zakat || []).map((d: any, i: number) => (
                      <span key={i} className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.jenis_zakat}</span>
                    ))}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.status_muzakki || 'RT'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showKwitansi(t)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadKwitansi(t)}><Download className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Uang:</span> <span className="font-medium">{fmt(getTotalUang(t))}</span></div>
                <div><span className="text-muted-foreground">Beras:</span> <span className="font-medium">{getTotalBeras(t)} Liter</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(t.tanggal).toLocaleDateString('id-ID')}</span></div>
                <div><span className="text-muted-foreground">Input oleh:</span> <span className="font-medium">{getCreatorName(t)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>



      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </PanitiaLayout>
  );
}
