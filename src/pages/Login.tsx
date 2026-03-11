import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/errorHandler';
import logo from '@/assets/logo-masjid.webp';
import SplashScreen from '@/components/SplashScreen';

const SPLASH_KEY = 'zakat-login-splash-shown';

export default function Login() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_KEY));
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  if (showSplash) return <SplashScreen onComplete={() => { sessionStorage.setItem(SPLASH_KEY, '1'); setShowSplash(false); }} />;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  if (user && role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user && role === 'panitia') return <Navigate to="/panitia/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(friendlyError(error));
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="px-6 pt-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
        <CardHeader className="text-center">
          <img src={logo} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-full" />
          <CardTitle className="font-serif text-2xl">Login Sistem Zakat</CardTitle>
          <p className="text-muted-foreground text-base">Masjid Al-Ikhlas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@masjid.com" required className="text-base h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="text-base h-12 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              {submitting ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
