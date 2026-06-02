import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client safely
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

