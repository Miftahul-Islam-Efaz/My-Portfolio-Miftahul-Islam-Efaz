import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Auto-detect production mode if running from the compiled dist directory
if (typeof __dirname !== "undefined" && __dirname.replace(/\\/g, "/").includes("/dist")) {
  process.env.NODE_ENV = "production";
}

const app = express();
const PORT = 3000;

// Initialize Supabase Client safely with default fallback credentials
const DEFAULT_SUPABASE_URL = "https://ofilalrcacqemfftmmwo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWxhbHJjYWNxZW1mZnRtbXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzU2OTEsImV4cCI6MjA5NTgxMTY5MX0.7i2pGgVQNokmLSD4Q740INMEBRezaujhZPEHtDr-Gzo";

const supabaseUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

let supabaseInstance;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required for client initialization.');
  }
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.error("Failed to initialize Supabase client in server.ts:", err);
  supabaseInstance = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  } as any;
}
const supabase = supabaseInstance;

async function startServer() {
  // Parse incoming JSON
  app.use(express.json());

  // Intercept AI Bots, scrapers and crawlers and direct them to /llms.txt
  app.use((req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    
    // Comprehensive regex targeting AI agents, scanners, and standard crawlers
    const isBot = /gptbot|chatgpt-user|claudebot|google-extended|perplexity|groq|cohere|anthropic|oai-searchbot|meta-externalagent|scrapper|crawler|spider|facebookexternalhit|scrappy/i.test(userAgent);
    
    // Only redirect if it's indeed a bot, and they are seeking the main HTML pages (not assets, API, or /llms.txt)
    if (isBot && !req.path.startsWith("/api") && req.path !== "/llms.txt" && !path.extname(req.path)) {
      console.log(`Bot/Crawler detected: "${userAgent}". Redirecting ${req.path} to /llms.txt`);
      return res.redirect(302, "/llms.txt");
    }
    next();
  });

  // Dynamic /llms.txt Endpoint from Supabase
  app.get("/llms.txt", async (req, res) => {
    try {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).send(
          "# Configuration Error\n\nSupabase credentials are not configured in the environment variables.\nPlease set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings."
        );
      }

      const { data, error } = await supabase
        .from("llms_content")
        .select("content")
        .eq("id", "default")
        .single();

      if (error) {
        console.error("Supabase error fetching llms_content:", error);
        return res.status(404).send(
          `# Table 'llms_content' Not Found or Empty\n\nPlease run the SQL statements from your 'supabase_llms_schema.sql' inside your Supabase SQL Editor first.\n\nError detail: ${error.message}`
        );
      }

      return res.send(data?.content || "");
    } catch (err: any) {
      console.error("Internal server error:", err);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      return res.status(500).send(
        `# Internal Server Error\n\nAn unexpected error occurred while fetching the LLMs index: ${err.message || err}`
      );
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Vite development server / static file routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with dynamic /llms.txt endpoint`);
  });
}

startServer();
