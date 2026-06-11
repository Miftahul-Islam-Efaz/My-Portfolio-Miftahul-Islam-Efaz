-- ========================================================
-- SUPABASE SQL SCRIPT FOR PORTFOLIO ACHIEVEMENTS/CERTIFICATIONS
-- Run this script in the Supabase SQL Editor
-- ========================================================

-- 1. Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id text PRIMARY KEY,
    title text NOT NULL,
    issuer text NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    external_url text,
    category text NOT NULL CHECK (category IN ('Mastery', 'Hackathons')),
    sort_order integer NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configure Row Level Security (RLS)
-- This ensures the portfolio can retrieve records publicly while protecting insert/update rights
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read-only access (for portfolio visitors and bots)
DROP POLICY IF EXISTS "Allow public read access to achievements" ON public.achievements;
CREATE POLICY "Allow public read access to achievements" ON public.achievements
    FOR SELECT USING (true);

-- Allow authenticated users complete administrative control
DROP POLICY IF EXISTS "Allow authenticated owners full access to achievements" ON public.achievements;
CREATE POLICY "Allow authenticated owners full access to achievements" ON public.achievements
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Reset existing rows during schema migrations to avoid duplicate primary key collisions
TRUNCATE TABLE public.achievements CASCADE;

-- 4. Seed initial achievements layout data
INSERT INTO public.achievements (
    id,
    title,
    issuer,
    description,
    image_url,
    external_url,
    category,
    sort_order
) VALUES
(
  'upgrad-prompt-engineering',
  'Generative AI Masterclass',
  'Upgrad Academy',
  'Prompts, LLMs & Workflow Automation',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780745781/Upgrad_Prompt_Engineering_yptpsq.png',
  NULL,
  'Mastery',
  1
),
(
  'wordpress-development',
  'WordPress Web Development',
  'Interactive Cares',
  'Themes, Builders & Custom Plugins',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780746084/wordpress_certificate_znnalh.png',
  NULL,
  'Mastery',
  2
),
(
  'hp-life-ai',
  'AI & Prompt Engineering',
  'HP Life Education',
  'Expert Tech & Creative Prompts',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564404/Hp_life_AI_for_Beginners_z1woti.png',
  NULL,
  'Mastery',
  3
),
(
  'interactive-cares-chatgpt',
  'ChatGPT Prompt Hacks',
  'Interactive Cares',
  'Productivity & LLM Hacks',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564382/Interactive_cares_cvbdcu.png',
  NULL,
  'Mastery',
  4
),
(
  'lablab-winner',
  '1st Place / Global Winner',
  'LabLab.ai Hackathon',
  'Agentic Economy Co-pilot App Dev',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564302/Agentic_Economy_on_Arc-certificate_rp3jwq.png',
  NULL,
  'Hackathons',
  5
),
(
  'impact-dhaka-champion',
  'Grand Champion AI Workflows',
  'Impact Dhaka Festival',
  'High Speed Full-Stack Vibe-Coding',
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780748387/Impact_Dhaka_hackathon_Certificates_gihlbt.png',
  NULL,
  'Hackathons',
  6
); 
