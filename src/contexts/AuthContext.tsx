import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppRole = 'admin' | 'panitia' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  profile: { name: string; email: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = () => {
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  const fetchUserData = async (userId: string): Promise<boolean> => {
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      supabase.from('profiles').select('name, email').eq('id', userId).single(),
    ]);

    const userRole = (roleData?.role as AppRole) || null;

    if (!userRole) {
      // User has no role — force logout
      toast.error('Akun Anda tidak memiliki akses ke sistem. Silakan hubungi admin.');
      await supabase.auth.signOut();
      clearAuth();
      return false;
    }

    setRole(userRole);
    setProfile(profileData || null);
    return true;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          const ok = await fetchUserData(session.user.id);
          if (!ok) return; // already cleared
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const ok = await fetchUserData(session.user.id);
        if (!ok) {
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
