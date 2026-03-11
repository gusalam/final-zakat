import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      toast.error('Gagal menyimpan profil');
      return;
    }

    toast.success('Profil berhasil diperbarui');
    // Reload to refresh profile in AuthContext
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Nama</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama" />
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
