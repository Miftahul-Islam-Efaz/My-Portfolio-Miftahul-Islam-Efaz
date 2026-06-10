import { createClient } from '@supabase/supabase-js';

// Fallback public credentials in case environment variables are not injected (e.g., in AI Studio preview)
const DEFAULT_SUPABASE_URL = 'https://ofilalrcacqemfftmmwo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWxhbHJjYWNxZW1mZnRtbXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzU2OTEsImV4cCI6MjA5NTgxMTY5MX0.7i2pGgVQNokmLSD4Q740INMEBRezaujhZPEHtDr-Gzo';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Initialize client safely with fallback mock to prevent app crashes when environment keys are missing or invalid
let supabaseInstance;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required for client initialization.');
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
  supabaseInstance = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  } as any;
}

export const supabase = supabaseInstance;

export interface DatabaseProject {
  id: string;
  title: string;
  category?: string;
  accent_color: string;
  badge: string;
  tech: string[];
  description: string;
  link_text: string;
  link_url: string;
  glow?: string;
  sort_order: number;
}

export interface DatabaseVideoSettings {
  id: string;
  video_url: string;
  video_opacity: number;
  multiply_overlay_opacity: number;
  gradient_overlay_opacity_from: number;
  gradient_overlay_opacity_to: number;
  muted: boolean;
  loop_video: boolean;
  created_at?: string;
}

