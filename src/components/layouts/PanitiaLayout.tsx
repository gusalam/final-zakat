import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, Users, Truck, BarChart3, LogOut, Menu, Pencil } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import logo from '@/assets/logo-masjid.webp';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const menuItems = [
  { path: '/panitia/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/panitia/zakat', label: 'Input Zakat', icon: FileText },
  { path: '/panitia/mustahik', label: 'Data Mustahik', icon: Users },
  { path: '/panitia/distribusi', label: 'Distribusi', icon: Truck },
  { path: '/panitia/laporan', label: 'Laporan', icon: BarChart3 },
];

export default function PanitiaLayout({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-full object-contain" />
            <div>
              <h2 className="font-serif text-lg font-bold">Al-Ikhlas</h2>
              <p className="text-xs opacity-75">Panel Panitia</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'hover:bg-sidebar-accent/50'}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={() => setEditProfileOpen(true)} className="flex items-center gap-2 px-3 py-2 mb-2 text-sm opacity-75 hover:opacity-100 w-full rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            <span className="truncate">{profile?.name}</span>
            <Pencil className="w-3.5 h-3.5 shrink-0" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base w-full hover:bg-sidebar-accent/50 text-destructive-foreground">
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Logout</AlertDialogTitle>
                <AlertDialogDescription>Apakah Anda yakin ingin keluar dari sistem?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b px-4 py-3 flex items-center justify-between lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="font-serif text-lg font-bold text-primary">Panel Panitia</h1>
          <div className="w-10" />
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
    </div>
  );
}
