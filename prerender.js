import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_SUPABASE_URL = "https://ofilalrcacqemfftmmwo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWxhbHJjYWNxZW1mZnRtbXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzU2OTEsImV4cCI6MjA5NTgxMTY5MX0.7i2pGgVQNokmLSD4Q740INMEBRezaujhZPEHtDr-Gzo";

const supabaseUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Fallback static projects in case Supabase fetch fails
const STATIC_PROJECTS = [
  {
    id: 'osmins-landscaping',
    title: "Osmin's Landscaping",
    category: 'Premium Family Greenscaping',
    accentColor: '#10b981',
    badge: '01. LANDSCAPING ATELIER',
    tech: ['Metro Atlanta Serv', 'Sod Installation', 'Retaining Walls', 'Irrigation Sys'],
    description: 'Over 20 years of family-operated landscaping expertise servicing a 60-mile radius around Marietta and Metro Atlanta with live dynamic sod selections.',
    linkText: 'Launch Landscaping Portal',
    linkUrl: 'https://osmins-landscaping.netlify.app/'
  },
  {
    id: 'bela-vista',
    title: 'Bela Vista Nature Resort',
    category: 'Elite Minimal Nature Cove',
    accentColor: '#d97706',
    badge: '02. RESORT LANDING',
    tech: ['Saint Martin Cove', 'Rustic Cottages', 'Sunset Vlog Logs', 'Open-Fire Dining'],
    description: 'A minimalist slow-living nature cove on Saint Martin island overlooking the Bay of Bengal, featuring rustic beach cottages and open-fire culinary menus.',
    linkText: 'Browse Sunset Cove',
    linkUrl: 'https://bela-vista-pied.vercel.app/'
  },
  {
    id: 'rene-architect',
    title: 'Rene Architect Studio',
    category: 'Biophilic Geo Architecture',
    accentColor: '#84cc16',
    badge: '03. RAW MODERN DESIGN',
    tech: ['Kazi Fahim Nasir', 'Chittagong Studio', 'Eco Geometries', '3-Stage Framework'],
    description: 'Chittagong-based architectural practice honoring biophilic harmony, sustainable workspaces, and clean organic concrete geometries.',
    linkText: 'Inspect Architectural Plans',
    linkUrl: 'https://rene-architect.netlify.app/'
  },
  {
    id: 'ceramic-enthusiasts',
    title: 'Ceramic Enthusiasts',
    category: 'Premium Detailing Studio',
    accentColor: '#3b82f6',
    badge: '04. AUTOMOTIVE PROTECTION',
    tech: ['Houston Outpost', 'Liquid PPF Shield', '10H Nano Ceramic', 'One-Car-At-Time'],
    description: 'Houston automotive detailing studio with a strict one-car-at-a-time focus on liquid premium paint-protection film & ceramics.',
    linkText: 'Protect Your Vehicle',
    linkUrl: 'https://ceramic-enthusiasts.netlify.app/'
  },
  {
    id: 'clean-home',
    title: 'Family Services Cleaning',
    category: 'Pet-Safe Hygiene Systems',
    accentColor: '#06b6d4',
    badge: '05. ECO HOME BIOPHILICS',
    tech: ['Zero Toxic Chemicals', 'HEPA Sanitization', 'Allergen Reduction', 'Garage Restoring'],
    description: 'Family-centered residential hygiene systems utilizing 100% biodegradable botanical non-toxic formulas built for allergen-free pet safe wellness.',
    linkText: 'Schedule Guard Shine',
    linkUrl: 'https://clean-home-power-washing.netlify.app/'
  },
  {
    id: 'pencil-link',
    title: 'Pencil Link Outsourcing',
    category: 'AI Auto & SaaS Growth Unit',
    accentColor: '#a855f7',
    badge: '06. SaaS ENGINE & GROWTH',
    tech: ['Custom SaaS Build', 'AI Agent Workflows', 'Outbound Sales Gen', 'Brand Identity'],
    description: 'A cohesive bundled team providing complete custom software development, automated AI agent workflows, and outbound high-growth lead engines.',
    linkText: 'Outsource Growth Squad',
    linkUrl: 'https://pencillink.tech/'
  }
];

async function fetchProjects() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/projects?select=*&order=sort_order.asc`, {
      headers: {
        'apikey': supabaseAnonKey,
        'authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category || '',
        accentColor: item.accent_color,
        badge: item.badge,
        tech: item.tech || [],
        description: item.description,
        linkText: item.link_text,
        linkUrl: item.link_url
      }));
    }
  } catch (err) {
    console.warn('Supabase fetch failed during prerender, using fallback static projects:', err.message);
  }
  return STATIC_PROJECTS;
}

async function prerender() {
  console.log('Starting static HTML pre-rendering step...');
  const projects = await fetchProjects();
  const htmlPath = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`Build index.html not found at ${htmlPath}. Run "vite build" first.`);
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Generate the static HTML representation of the portfolio sections
  const preRenderedHTML = `
    <!-- Pre-rendered Static HTML Skeleton for SEO, Crawlers and non-JS clients -->
    <div class="static-site-skeleton">
      <!-- Navigation -->
      <nav style="display:none;">
        <a href="#skills">Skills</a>
        <a href="#services">Services</a>
        <a href="#outcomes">Projects</a>
        <a href="#contact">Contact</a>
      </nav>

      <!-- Hero Section -->
      <section id="hero-section" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; text-align: left;">
        <h1 style="font-size: 4rem; line-height: 1; font-family: sans-serif; font-weight: 900;">Miftahul Islam Efaz</h1>
        <p style="font-size: 1.5rem; color: #a3a3a3; font-family: monospace;">Entrepreneur, Vibe-Coder & AI Orchestrator</p>
        <p style="font-size: 1.1rem; line-height: 1.6; color: #d4d4d4; max-width: 800px;">
          Architect of intelligent automated engines, bespoke n8n pipelines, and modular enterprise backend infrastructures.
        </p>
      </section>

      <!-- SkillShowcase Section -->
      <section id="skills" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; background: #070707; text-align: left;">
        <h2 style="font-size: 2.5rem; font-weight: 800;">Technical Expertise & Stack</h2>
        <ul style="line-height: 2; font-size: 1.1rem; color: #d4d4d4;">
          <li><strong>AI Integration:</strong> n8n Workflow Automation, LangChain, MCP Connections, Multi-Agent Systems</li>
          <li><strong>Software Dev:</strong> TypeScript, Node.js, Express, React, Vite, Next.js</li>
          <li><strong>Infrastructure:</strong> Docker, Git, REST APIs, GraphQL, Supabase, Postgres</li>
          <li><strong>Mobile Dev:</strong> Android SDK, Gradle, JVM, Custom Package Orchestration</li>
        </ul>
      </section>

      <!-- WebsiteProjectsShowcase Section -->
      <section id="outcomes" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; text-align: left;">
        <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 32px;">Selected Projects & Case Studies</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
          ${projects.map(p => `
            <article style="border: 1px solid #222; padding: 24px; border-radius: 8px; background: #0b0a0a;">
              <span style="font-size: 0.8rem; color: #a3a3a3; font-family: monospace;">${p.badge || ''}</span>
              <h3 style="color: ${p.accentColor || '#fff'}; font-size: 1.5rem; margin: 8px 0; font-family: sans-serif;">${p.title}</h3>
              <span style="font-size: 0.9rem; font-style: italic; color: #737373; display: block; margin-bottom: 12px;">${p.category}</span>
              <p style="margin: 16px 0; font-size: 0.95rem; line-height: 1.6; color: #d4d4d4;">${p.description}</p>
              <div style="margin-bottom: 20px;">
                ${p.tech.map(t => `<span style="display: inline-block; background: #1a1919; color: #a3a3a3; font-size: 0.75rem; padding: 4px 8px; margin: 2px; border-radius: 4px; font-family: monospace;">${t}</span>`).join('')}
              </div>
              <a href="${p.linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">${p.linkText || 'Launch Project'}</a>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Services Section -->
      <section id="services" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; background: #070707; text-align: left;">
        <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 32px;">Core Services</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
          <div style="border: 1px solid #222; padding: 24px; border-radius: 8px;">
            <h3>Creative Frontend Engineering</h3>
            <p style="color: #a3a3a3; line-height: 1.5;">WebGL, Three.js 3D, GSAP animations, and custom scroll experiences.</p>
          </div>
          <div style="border: 1px solid #222; padding: 24px; border-radius: 8px;">
            <h3>Vibe Coding & Prototyping</h3>
            <p style="color: #a3a3a3; line-height: 1.5;">Ultra high-speed development, AI-accelerated stack deployment, and client product delivery.</p>
          </div>
          <div style="border: 1px solid #222; padding: 24px; border-radius: 8px;">
            <h3>Automated Workflow Systems</h3>
            <p style="color: #a3a3a3; line-height: 1.5;">n8n logic structures, event synchronization, and data mapping.</p>
          </div>
          <div style="border: 1px solid #222; padding: 24px; border-radius: 8px;">
            <h3>Enterprise Backend Core</h3>
            <p style="color: #a3a3a3; line-height: 1.5;">Server.ts customization, API bridges, database scaling, and security schemas.</p>
          </div>
          <div style="border: 1px solid #222; padding: 24px; border-radius: 8px;">
            <h3>Generative AI & LLM Systems</h3>
            <p style="color: #a3a3a3; line-height: 1.5;">Prompt engineering optimization, agentic structures, and context mapping.</p>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section id="testimonials" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; text-align: left;">
        <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 32px;">Client Testimonials</h2>
        <blockquote style="border-left: 4px solid #38bdf8; padding-left: 16px; margin: 24px 0;">
          <p style="font-size: 1.25rem; font-style: italic; color: #d4d4d4;">"Radiant made undercutting all of our competitors an absolute breeze."</p>
          <cite style="color: #a3a3a3;">— John Doe, Content Marketing</cite>
        </blockquote>
        <blockquote style="border-left: 4px solid #38bdf8; padding-left: 16px; margin: 24px 0;">
          <p style="font-size: 1.25rem; font-style: italic; color: #d4d4d4;">"An exceptional experience. They exceeded expectations with professionalism, great communication, and attention to detail."</p>
          <cite style="color: #a3a3a3;">— Zeyad, Medicine Specialist</cite>
        </blockquote>
      </section>

      <!-- Contact Section -->
      <section id="contact" style="padding: 100px 24px; max-width: 1200px; margin: 0 auto; background: #070707; text-align: left;">
        <h2 style="font-size: 2.5rem; font-weight: 800;">Let's Connect</h2>
        <p style="font-size: 1.1rem; color: #d4d4d4;">Currently Open for Projects.</p>
        <p>Email: <a href="mailto:webigns@gmail.com" style="color: #38bdf8; font-weight: bold;">webigns@gmail.com</a></p>
        <p>Phone: +880 1234 567890</p>
        <p>Location: Dhaka, Bangladesh</p>
      </section>

      <!-- Footer -->
      <footer style="padding: 40px 24px; text-align: center; border-top: 1px solid #222; margin-top: 80px; color: #737373;">
        <p>© 2026 Miftahul Islam Efaz. All rights reserved.</p>
        <p><a href="https://www.miftahulislamefaz.xyz/" target="_blank" rel="noopener noreferrer" style="color: #a3a3a3;">www.miftahulislamefaz.xyz</a></p>
      </footer>
    </div>
  `;

  // Inject inside the root div in the build output index.html
  html = html.replace('<div id="root"></div>', `<div id="root">${preRenderedHTML}</div>`);

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Successfully pre-rendered static HTML skeleton inside dist/index.html!');
}

prerender();
