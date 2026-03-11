
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'panitia');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- RT table
CREATE TABLE public.rt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_rt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zakat table
CREATE TABLE public.zakat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_muzakki TEXT NOT NULL,
  jenis_zakat TEXT NOT NULL,
  jumlah_uang NUMERIC DEFAULT 0,
  jumlah_beras NUMERIC DEFAULT 0,
  rt_id UUID REFERENCES public.rt(id),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mustahik table
CREATE TABLE public.mustahik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  rt_id UUID REFERENCES public.rt(id),
  kategori TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distribusi table
CREATE TABLE public.distribusi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mustahik_id UUID NOT NULL REFERENCES public.mustahik(id) ON DELETE CASCADE,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zakat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mustahik ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribusi ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE POLICY "Anyone can read user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admin can insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete user_roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RT
CREATE POLICY "Anyone can view RT" ON public.rt FOR SELECT USING (true);
CREATE POLICY "Admin can insert RT" ON public.rt FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update RT" ON public.rt FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete RT" ON public.rt FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Zakat
CREATE POLICY "Anyone can view zakat" ON public.zakat FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert zakat" ON public.zakat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update zakat" ON public.zakat FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete zakat" ON public.zakat FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Mustahik
CREATE POLICY "Anyone can view mustahik" ON public.mustahik FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert mustahik" ON public.mustahik FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update mustahik" ON public.mustahik FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete mustahik" ON public.mustahik FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Distribusi
CREATE POLICY "Anyone can view distribusi" ON public.distribusi FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert distribusi" ON public.distribusi FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update distribusi" ON public.distribusi FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete distribusi" ON public.distribusi FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.zakat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mustahik;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distribusi;
