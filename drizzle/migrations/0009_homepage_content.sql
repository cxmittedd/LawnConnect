CREATE TABLE public.homepage_communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parish text NOT NULL DEFAULT 'Jamaica',
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.homepage_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  cta_label text,
  cta_link text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_communities, public.homepage_promos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_communities, public.homepage_promos TO authenticated;
GRANT ALL ON public.homepage_communities, public.homepage_promos TO service_role;
ALTER TABLE public.homepage_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active communities" ON public.homepage_communities FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage communities" ON public.homepage_communities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public reads active promos" ON public.homepage_promos FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage promos" ON public.homepage_promos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.homepage_communities (name, parish, sort_order) VALUES
 ('Coral Springs Village','Trelawny',1),('Castlewood','Jamaica',2),('Holland Estate','Jamaica',3);