import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Extract credentials from Vercel environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  // Set response headers for text/plain index
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).send(
      "# Configuration Error\n\nSupabase credentials are not configured in your Vercel Project Environment Variables.\nPlease add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside your Vercel Project Dashboard Settings."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from("llms_content")
      .select("content")
      .eq("id", "default")
      .single();

    if (error) {
      console.error("Vercel Function: Supabase lookup failure:", error);
      return res.status(404).send(
        `# Data Fetch Error\n\nFailed to fetch content from table 'llms_content'.\nMake sure the table exists and has a row with id 'default'.\n\nError details: ${error.message}`
      );
    }

    return res.status(200).send(data?.content || "");
  } catch (err: any) {
    console.error("Vercel Function: Internal unexpected error:", err);
    return res.status(500).send(
      `# Internal Error\n\nAn unexpected error occurred in the Vercel serverless worker: ${err.message || err}`
    );
  }
}
