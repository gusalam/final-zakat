import { useEffect, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, FileText, Eye, Download, RotateCcw } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { exportPdf } from '@/lib/exportPdf';
import KwitansiZakat, { KwitansiData, DetailZakatItem } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { downloadKwitansiPdf } from '@/lib/downloadKwitansi';
import ZakatDetailFields, { DetailForm, emptyDetail } from '@/components/ZakatDetailFields';

export default function DataZakat() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nama_muzakki: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], status_muzakki: 'RT', alamat_muzakki: '' });
  const [detail, setDetail] = useState<DetailForm>(emptyDetail());
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const pag = usePagination(50);
  const [search, setSearch] = useState('');
  const [filterRt, setFilterRt] = useState('all');
  const debouncedSearch = useDebounce(search, 400);

  const fetchData = async () => {
    let query = supabase.from('transaksi_zakat').select('*, rt(nama_rt), detail_zakat(*), profiles:created_by(name)', { count: 'exact' }).order('tanggal', { ascending: false });
    if (debouncedSearch.trim()) query = query.ilike('nama_muzakki', `%${debouncedSearch.trim()}%`);
    if (filterRt !== 'all') query = query.eq('rt_id', filterRt);
    const [{ data: transaksi, count }, { data: rt }] = await Promise.all([
      query.range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(transaksi || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page, debouncedSearch, filterRt]);

  const resetForm = () => { setForm({ nama_muzakki: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], status_muzakki: 'RT', alamat_muzakki: '' }); setDetail(emptyDetail()); };

  const LITER_PER_JIWA = 3.5;

  const buildDetails = (): DetailZakatItem[] => {
    const items: DetailZakatItem[] = [];
    if (detail.fitrah.enabled) {
      const jiwa = Number(detail.fitrah.jumlah_jiwa) || 1;
      const metode = detail.fitrah.metode;
      const harga = Number(detail.fitrah.harga_beras_per_liter) || 0;
      items.push({
        jenis_zakat: 'Zakat Fitrah', jumlah_jiwa: jiwa,
        jumlah_uang: metode === 'uang' ? jiwa * LITER_PER_JIWA * harga : 0,
        jumlah_beras: metode === 'beras' ? jiwa * LITER_PER_JIWA : 0,
        metode_pembayaran: metode, harga_beras_per_liter: metode === 'uang' ? harga : null,
      });
    }
    if (detail.mal.enabled) items.push({ jenis_zakat: 'Zakat Mal', jumlah_uang: Number(detail.mal.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.infaq.enabled) items.push({ jenis_zakat: 'Infaq', jumlah_uang: Number(detail.infaq.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.fidyah.enabled) {
      const jiwa = Number(detail.fidyah.jumlah_jiwa) || 1;
      const metode = detail.fidyah.metode;
      const harga = Number(detail.fidyah.harga_beras_per_liter) || 0;
      items.push({
        jenis_zakat: 'Fidyah', jumlah_jiwa: jiwa,
        jumlah_uang: metode === 'uang' ? jiwa * LITER_PER_JIWA * harga : 0,
        jumlah_beras: metode === 'beras' ? jiwa * LITER_PER_JIWA : 0,
        metode_pembayaran: metode, harga_beras_per_liter: metode === 'uang' ? harga : null,
      });
    }
    return items;
  };

  const handleSubmit = async () => {
    const items = buildDetails();
    if (!form.nama_muzakki.trim()) { toast.error('Nama muzakki wajib diisi'); return; }
    if (!form.alamat_muzakki.trim()) { toast.error('Alamat muzakki wajib diisi untuk transparansi data.'); return; }
    if (items.length === 0) { toast.error('Pilih minimal satu jenis zakat'); return; }

    if (editItem) {
      const { error } = await supabase.from('transaksi_zakat').update({
        nama_muzakki: form.nama_muzakki.trim(), rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
        tanggal: form.tanggal, status_muzakki: form.status_muzakki, alamat_muzakki: form.alamat_muzakki.trim() || null,
      }).eq('id', editItem.id);
      if (error) { toast.error(friendlyError(error)); return; }
      const { error: deleteError } = await supabase.from('detail_zakat').delete().eq('transaksi_id', editItem.id);
      if (deleteError) { toast.error(friendlyError(deleteError)); return; }
      
      await supabase.from('detail_zakat').insert(items.map(d => ({ transaksi_id: editItem.id, ...d })));
      toast.success('Data zakat berhasil diperbarui ✓');
    } else {
      const { data: inserted, error } = await supabase.from('transaksi_zakat').insert({
        nama_muzakki: form.nama_muzakki.trim(), rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
        tanggal: form.tanggal, created_by: user?.id, status_muzakki: form.status_muzakki, alamat_muzakki: form.alamat_muzakki.trim() || null,
      }).select('id, nomor_kwitansi, receipt_number').single();
      if (error) { toast.error(friendlyError(error)); return; }
      await supabase.from('detail_zakat').insert(items.map(d => ({ transaksi_id: inserted.id, ...d })));
      toast.success('Data zakat berhasil ditambahkan ✓');
    }
    setOpen(false); resetForm(); setEditItem(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    setData(prev => prev.filter(d => d.id !== id));
    const { error: detailErr } = await supabase.from('detail_zakat').delete().eq('transaksi_id', id);
    if (detailErr) { toast.error(friendlyError(detailErr)); await fetchData(); return; }
    const { error } = await supabase.from('transaksi_zakat').delete().eq('id', id);
    if (error) { toast.error(friendlyError(error)); await fetchData(); }
    else { toast.success('Data zakat berhasil dihapus ✓'); await fetchData(); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ nama_muzakki: item.nama_muzakki, rt_id: item.rt_id || '', tanggal: item.tanggal, status_muzakki: item.status_muzakki || 'RT', alamat_muzakki: item.alamat_muzakki || '' });
    const d = emptyDetail();
    (item.detail_zakat || []).forEach((det: any) => {
      const metode = det.metode_pembayaran || (Number(det.jumlah_beras) > 0 ? 'beras' : 'uang');
      if (det.jenis_zakat === 'Zakat Fitrah') { d.fitrah = { enabled: true, jumlah_jiwa: String(det.jumlah_jiwa || 1), jumlah_uang: String(det.jumlah_uang || 0), jumlah_beras: String(det.jumlah_beras || 0), metode: metode as any, harga_beras_per_liter: String(det.harga_beras_per_liter || '') }; }
      if (det.jenis_zakat === 'Zakat Mal') d.mal = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0) };
      if (det.jenis_zakat === 'Infaq' || det.jenis_zakat === 'Shodaqoh') d.infaq = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0) };
      if (det.jenis_zakat === 'Fidyah') d.fidyah = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0), jumlah_beras: String(det.jumlah_beras || 0), jumlah_jiwa: String(det.jumlah_jiwa || 1), metode: metode as any, harga_beras_per_liter: String(det.harga_beras_per_liter || '') };
    });
    setDetail(d);
    setOpen(true);
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

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus data zakat?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Data Zakat</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <SearchInput placeholder="Cari nama muzakki..." value={search} onChange={v => { setSearch(v); pag.goTo(1); }} className="w-48 sm:w-64" />
          <Select value={filterRt} onValueChange={v => { setFilterRt(v); pag.goTo(1); }}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Semua RT" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua RT</SelectItem>
              {rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterRt !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterRt('all'); pag.goTo(1); }}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
          )}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportPdf({
            title: 'Data Zakat — Masjid Al-Ikhlas',
            subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            headers: ['No', 'Nama Muzakki', 'Jenis', 'Total Uang', 'Beras (Liter)', 'RT', 'Tanggal'],
            rows: data.map(t => [String(t.nomor_kwitansi || '-'), t.nama_muzakki, getJenisLabels(t), fmt(getTotalUang(t)), `${getTotalBeras(t)}`, t.rt?.nama_rt || '-', new Date(t.tanggal).toLocaleDateString('id-ID')]),
            filename: 'Data_Zakat_Al_Ikhlas.pdf',
          })}><FileText className="w-4 h-4 mr-1" />Export PDF</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { resetForm(); setEditItem(null); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Tambah</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} Data Zakat</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nama Muzakki</Label><Input value={form.nama_muzakki} onChange={e => setForm({ ...form, nama_muzakki: e.target.value })} /></div>
                <div><Label>Alamat Muzakki <span className="text-destructive">*</span></Label><Input value={form.alamat_muzakki} onChange={e => setForm({ ...form, alamat_muzakki: e.target.value })} placeholder="Contoh: Gang Melati, Jakarta" required /></div>
                <div>
                  <Label>Status Muzakki</Label>
                  <Select value={form.status_muzakki} onValueChange={v => setForm({ ...form, status_muzakki: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="RT">RT</SelectItem><SelectItem value="Jamaah">Jamaah</SelectItem></SelectContent>
                  </Select>
                </div>
                {form.status_muzakki === 'RT' && (
                  <div><Label>RT</Label>
                    <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                      <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <ZakatDetailFields detail={detail} onChange={handleDetailChange} idPrefix="admin" />
                <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
                <Button onClick={handleSubmit} className="w-full">{editItem ? 'Simpan Perubahan' : 'Tambah Zakat'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Alamat</TableHead><TableHead>Status</TableHead><TableHead>Jenis</TableHead><TableHead>Total Uang</TableHead><TableHead>Beras</TableHead><TableHead>RT</TableHead><TableHead>Tanggal</TableHead><TableHead>Input oleh</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.receipt_number || t.nomor_kwitansi}</TableCell><TableCell>{t.nama_muzakki}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{t.alamat_muzakki || '-'}</TableCell>
                  <TableCell><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>{t.status_muzakki || 'RT'}</span></TableCell>
                  <TableCell>{getJenisLabels(t)}</TableCell><TableCell>{fmt(getTotalUang(t))}</TableCell><TableCell>{getTotalBeras(t)} Liter</TableCell><TableCell>{t.rt?.nama_rt || '-'}</TableCell><TableCell>{new Date(t.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{getCreatorName(t)}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => showKwitansi(t)} title="Lihat Kwitansi"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadKwitansi(t)} title="Download Kwitansi"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={t.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4"><PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} /></div>
        </CardContent>
      </Card>

      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{t.receipt_number || `#${t.nomor_kwitansi}`} — {t.nama_muzakki}</p>
                  {t.alamat_muzakki && <p className="text-xs text-muted-foreground">{t.alamat_muzakki}</p>}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(t.detail_zakat || []).map((d: any, i: number) => <span key={i} className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.jenis_zakat}</span>)}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.status_muzakki || 'RT'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showKwitansi(t)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadKwitansi(t)}><Download className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <DeleteButton id={t.id} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Uang:</span> <span className="font-medium">{fmt(getTotalUang(t))}</span></div>
                <div><span className="text-muted-foreground">Beras:</span> <span className="font-medium">{getTotalBeras(t)} Liter</span></div>
                <div><span className="text-muted-foreground">RT:</span> <span className="font-medium">{t.rt?.nama_rt || '-'}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(t.tanggal).toLocaleDateString('id-ID')}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Input oleh:</span> <span className="font-medium">{getCreatorName(t)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </AdminLayout>
  );
}
