-- ==========================================
-- SUPABASE SQL SCRIPT FOR DYNAMIC LLMS.TXT
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- 1. Create a simple table to store your portfolio's LLM description
CREATE TABLE IF NOT EXISTS public.llms_content (
    id text PRIMARY KEY DEFAULT 'default',
    content text NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) so anybody can read it, but only you can write it
ALTER TABLE public.llms_content ENABLE ROW LEVEL SECURITY;

-- Allow public read-only access (anonymous SELECT)
DROP POLICY IF EXISTS "Allow public read access to llms_content" ON public.llms_content;
CREATE POLICY "Allow public read access to llms_content" ON public.llms_content
    FOR SELECT USING (true);

-- Allow authenticated admins complete management (INSERT, UPDATE, DELETE, ALL)
DROP POLICY IF EXISTS "Allow authenticated users all access to llms_content" ON public.llms_content;
CREATE POLICY "Allow authenticated users all access to llms_content" ON public.llms_content
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seed an initial placeholder value
-- (You can run the update script below at any time to set your real text!)
INSERT INTO public.llms_content (id, content)
VALUES (
    'default',
    '# Miftahul Islam Efaz - Creative Frontend Engineer\n\nWelcome to my developer profile. Update this text in Supabase to sync live details.'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Simple SQL to update the text in your dynamic LLM page:
-- Run this statement in Supabase whenever you want to update the live content!
--
-- UPDATE public.llms_content 
-- SET content = 'YOUR NEW CUSTOM TEXT GOES HERE', updated_at = now()
-- WHERE id = 'default';
