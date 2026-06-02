-- Supabase projects table creation script
-- To execute this script, paste it into your Supabase Dashboard SQL Editor and click "Run".

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    title text NOT NULL,
    category text NOT NULL,
    accent_color text NOT NULL,         -- Stores HEX color codes, e.g., '#10b981'
    badge text NOT NULL,                -- Stores badges, e.g., '01. LANDSCAPING ATELIER'
    tech text[] NOT NULL,               -- Stores list of tech tags, e.g., ARRAY['React', 'Tailwind']
    description text NOT NULL,          -- Project summary/description text
    link_text text NOT NULL,            -- Button label, e.g., 'Launch Landscaping Portal'
    link_url text NOT NULL,             -- External live project iframe URL
    glow text NOT NULL,                 -- Drop shadow background glow, e.g., 'rgba(16, 185, 129, 0.12)'
    sort_order integer NOT NULL UNIQUE, -- Guarantees exact carousel sorting
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configure Row Level Security (RLS)
-- This ensures the portfolio can retrieve records publicly while protecting insert/update rights
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read-only access (for portfolio visitors)
DROP POLICY IF EXISTS "Allow public read access" ON public.projects;
CREATE POLICY "Allow public read access" ON public.projects
    FOR SELECT USING (true);

-- Allow authenticated users with credentials complete control (for you via Supabase Dashboard / App Admin)
DROP POLICY IF EXISTS "Allow authenticated users all access" ON public.projects;
CREATE POLICY "Allow authenticated users all access" ON public.projects
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Reset existing rows during schema migrations to avoid duplicate primary key collisions
TRUNCATE TABLE public.projects CASCADE;

-- 4. Seed initial layout data
INSERT INTO public.projects (
    id, 
    title, 
    category, 
    accent_color, 
    badge, 
    tech, 
    description, 
    link_text, 
    link_url, 
    glow, 
    sort_order
) VALUES
(
  'osmins-landscaping',
  'Osmin''s Landscaping',
  'Premium Family Greenscaping',
  '#10b981',
  '01. LANDSCAPING ATELIER',
  ARRAY['Metro Atlanta Serv', 'Sod Installation', 'Retaining Walls', 'Irrigation Sys'],
  'Over 20 years of family-operated landscaping expertise servicing a 60-mile radius around Marietta and Metro Atlanta with live dynamic sod selections.',
  'Launch Landscaping Portal',
  'https://osmins-landscaping.netlify.app/',
  'rgba(16, 185, 129, 0.12)',
  1
),
(
  'bela-vista',
  'Bela Vista Nature Resort',
  'Elite Minimal Nature Cove',
  '#d97706',
  '02. RESORT LANDING',
  ARRAY['Saint Martin Cove', 'Rustic Cottages', 'Sunset Vlog Logs', 'Open-Fire Dining'],
  'A minimalist slow-living nature cove on Saint Martin island overlooking the Bay of Bengal, featuring rustic beach cottages and open-fire culinary menus.',
  'Browse Sunset Cove',
  'https://bela-vista-pied.vercel.app/',
  'rgba(217, 119, 6, 0.12)',
  2
),
(
  'rene-architect',
  'Rene Architect Studio',
  'Biophilic Geo Architecture',
  '#84cc16',
  '03. RAW MODERN DESIGN',
  ARRAY['Kazi Fahim Nasir', 'Chittagong Studio', 'Eco Geometries', '3-Stage Framework'],
  'Chittagong-based architectural practice honoring biophilic harmony, sustainable workspaces, and clean organic concrete geometries.',
  'Inspect Architectural Plans',
  'https://rene-architect.netlify.app/',
  'rgba(132, 204, 22, 0.12)',
  3
),
(
  'ceramic-enthusiasts',
  'Ceramic Enthusiasts',
  'Premium Detailing Studio',
  '#3b82f6',
  '04. AUTOMOTIVE PROTECTION',
  ARRAY['Houston Outpost', 'Liquid PPF Shield', '10H Nano Ceramic', 'One-Car-At-Time'],
  'Veteran-owned automotive detailing studio based in Houston Metro with a strict one-car-at-a-time focus on liquid premium paint-protection film & ceramics.',
  'Protect Your Vehicle',
  'https://ceramic-enthusiasts.netlify.app/',
  'rgba(59, 130, 246, 0.12)',
  4
),
(
  'clean-home',
  'Family Services Cleaning',
  'Pet-Safe Hygiene Systems',
  '#06b6d4',
  '05. ECO HOME BIOPHILICS',
  ARRAY['Zero Toxic Chemicals', 'HEPA Sanitization', 'Allergen Reduction', 'Garage Restoring'],
  'Family-centered residential hygiene systems utilizing 100% biodegradable botanical non-toxic formulas built for allergen-free pet safe wellness.',
  'Schedule Guard Shine',
  'https://clean-home-power-washing.netlify.app/',
  'rgba(6, 182, 212, 0.12)',
  5
),
(
  'pencil-link',
  'Pencil Link Outsourcing',
  'AI Auto & SaaS Growth Unit',
  '#a855f7',
  '06. SaaS ENGINE & GROWTH',
  ARRAY['Custom SaaS Build', 'AI Agent Workflows', 'Outbound Sales Gen', 'Brand Identity'],
  'A cohesive bundled team providing complete custom software development, automated AI agent workflows, and outbound high-growth lead engines.',
  'Outsource Growth Squad',
  'https://pencillink.tech/',
  'rgba(168, 85, 247, 0.12)',
  6
);

-- 5. Create video_settings table to dynamically control the Contact Section's interactive video background
CREATE TABLE IF NOT EXISTS public.video_settings (
    id text PRIMARY KEY,
    video_url text NOT NULL,
    video_opacity float8 NOT NULL DEFAULT 1.0,              -- Opacity of the <video> element (0.0 to 1.0)
    multiply_overlay_opacity float8 NOT NULL DEFAULT 0.35,  -- Dark multiply layer opacity (0.0 to 1.0)
    gradient_overlay_opacity_from float8 NOT NULL DEFAULT 0.9, -- Top gradient layer start opacity (0.0 to 1.0)
    gradient_overlay_opacity_to float8 NOT NULL DEFAULT 0.3,   -- Top gradient layer end opacity (0.0 to 1.0)
    muted boolean NOT NULL DEFAULT false,                   -- Keep audio on by default per user request
    loop_video boolean NOT NULL DEFAULT true,               -- Loop video playback
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configure Row Level Security (RLS) for video_settings table
ALTER TABLE public.video_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read-only access for portfolio visitors
DROP POLICY IF EXISTS "Allow public read access to video_settings" ON public.video_settings;
CREATE POLICY "Allow public read access to video_settings" ON public.video_settings
    FOR SELECT USING (true);

-- Allow authenticated dashboard administrators complete management
DROP POLICY IF EXISTS "Allow authenticated users all access to video_settings" ON public.video_settings;
CREATE POLICY "Allow authenticated users all access to video_settings" ON public.video_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed settings for Contact Section video background
INSERT INTO public.video_settings (
    id,
    video_url,
    video_opacity,
    multiply_overlay_opacity,
    gradient_overlay_opacity_from,
    gradient_overlay_opacity_to,
    muted,
    loop_video
) VALUES (
    'contact_section',
    'https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780301975/Animate_image_with_moving_grass_202606011415_slx0sb.mp4',
    1.0,
    0.35,
    0.9,
    0.3,
    false,
    true
) ON CONFLICT (id) DO UPDATE SET
    video_url = EXCLUDED.video_url,
    video_opacity = EXCLUDED.video_opacity,
    multiply_overlay_opacity = EXCLUDED.multiply_overlay_opacity,
    gradient_overlay_opacity_from = EXCLUDED.gradient_overlay_opacity_from,
    gradient_overlay_opacity_to = EXCLUDED.gradient_overlay_opacity_to,
    muted = EXCLUDED.muted,
    loop_video = EXCLUDED.loop_video;

