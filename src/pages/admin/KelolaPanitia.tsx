import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil } from 'lucide-react';
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
import { Plus, Trash2 } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';

export default function KelolaPanitia() {
  const [panitiaList, setPanitiaList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchData = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').eq('role', 'panitia');
    if (!roles || roles.length === 0) { setPanitiaList([]); return; }
    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
    const merged = roles.map(r => ({
      ...r,
      name: profiles?.find(p => p.id === r.user_id)?.name || '-',
      email: profiles?.find(p => p.id === r.user_id)?.email || '-',
    }));
    setPanitiaList(merged);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Harap isi semua data yang diperlukan.'); return; }
    if (form.password.length < 6) { toast.error('Password minimal 6 karakter.'); return; }
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke('create-panitia', {
        body: { name: form.name, email: form.email, password: form.password },
      });
      if (res.error) throw res.error;
      toast.success('Panitia berhasil ditambahkan ✓');
      setOpen(false); setForm({ name: '', email: '', password: '' }); fetchData();
    } catch (err: any) {
      toast.error(friendlyError(err));
    }
    setSubmitting(false);
  };

  const handleDelete = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'panitia');
    if (error) toast.error(friendlyError(error));
    else { toast.success('Role panitia berhasil dihapus ✓'); fetchData(); }
  };

  const openEdit = (p: any) => {
    setEditUserId(p.user_id);
    setEditForm({ name: p.name, email: p.email });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editUserId || !editForm.name || !editForm.email) { toast.error('Nama dan email wajib diisi.'); return; }
    setEditSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: editForm.name, email: editForm.email }).eq('id', editUserId);
      if (error) throw error;
      toast.success('Profil panitia berhasil diperbarui ✓');
      setEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(friendlyError(err));
    }
    setEditSubmitting(false);
  };

  const DeleteButton = ({ userId }: { userId: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus panitia?</AlertDialogTitle><AlertDialogDescription>Role panitia akan dihapus dari user ini.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(userId)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Kelola Panitia</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Panitia</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Panitia Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Tambah Panitia'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Profil Panitia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <Button onClick={handleEditSubmit} className="w-full" disabled={editSubmitting}>{editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {panitiaList.map((p: any) => (
                <TableRow key={p.user_id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <DeleteButton userId={p.user_id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="md:hidden space-y-3">
        {panitiaList.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada panitia</p>}
        {panitiaList.map((p: any) => (
          <Card key={p.user_id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.email}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                <DeleteButton userId={p.user_id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
