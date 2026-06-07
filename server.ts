import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  // Parse incoming JSON
  app.use(express.json());

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
