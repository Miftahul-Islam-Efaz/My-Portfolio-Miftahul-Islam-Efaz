-- ========================================================
-- SUPABASE SQL SCRIPT FOR PORTFOLIO VIBE CHECK RATINGS
-- Run this script in the Supabase SQL Editor
-- ========================================================

-- 1. Create a table to store structured feedback ratings
CREATE TABLE IF NOT EXISTS public.portfolio_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name text NOT NULL CHECK (char_length(user_name) >= 1 AND char_length(user_name) <= 100),
    rating integer NOT NULL CHECK (rating >= 0 AND rating <= 100),
    vibe_label text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.portfolio_ratings ENABLE ROW LEVEL SECURITY;

-- Allow public INSERT access so any website visitor can rate the portfolio
DROP POLICY IF EXISTS "Allow anonymous rating submits" ON public.portfolio_ratings;
CREATE POLICY "Allow anonymous rating submits" ON public.portfolio_ratings
    FOR INSERT WITH CHECK (true);

-- Allow public SELECT access so anyone can view ratings (such as live averages or counts)
DROP POLICY IF EXISTS "Allow public read access to ratings" ON public.portfolio_ratings;
CREATE POLICY "Allow public read access to ratings" ON public.portfolio_ratings
    FOR SELECT USING (true);

-- Allow full administrative access to authenticated owners
DROP POLICY IF EXISTS "Allow owners full access to ratings" ON public.portfolio_ratings;
CREATE POLICY "Allow owners full access to ratings" ON public.portfolio_ratings
    FOR ALL USING (auth.role() = 'authenticated');
