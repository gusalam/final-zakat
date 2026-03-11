import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';

export default function KelolaRT() {
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [namaRt, setNamaRt] = useState('');

  const fetchData = async () => {
    const { data } = await supabase.from('rt').select('*').order('nama_rt');
    setData(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setNamaRt(''); setEditItem(null); };

  const handleSubmit = async () => {
    if (editItem) {
      const { error } = await supabase.from('rt').update({ nama_rt: namaRt }).eq('id', editItem.id);
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data RT berhasil diperbarui ✓');
    } else {
      const { error } = await supabase.from('rt').insert({ nama_rt: namaRt });
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data RT berhasil ditambahkan ✓');
    }
    setOpen(false); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rt').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data RT berhasil dihapus ✓'); fetchData(); }
  };

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus RT?</AlertDialogTitle><AlertDialogDescription>Semua data terkait RT ini mungkin terpengaruh.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Kelola RT</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah RT</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} RT</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama RT</Label><Input value={namaRt} onChange={e => setNamaRt(e.target.value)} placeholder="RT 01" /></div>
              <Button onClick={handleSubmit} className="w-full">{editItem ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama RT</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.nama_rt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setNamaRt(r.nama_rt); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={r.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data RT</p>}
        {data.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <p className="font-semibold">{r.nama_rt}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(r); setNamaRt(r.nama_rt); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <DeleteButton id={r.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
