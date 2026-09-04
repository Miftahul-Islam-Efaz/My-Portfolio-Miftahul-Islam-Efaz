import type { WorkCaseStudy } from './types';

/**
 * THE CONTENT LAYER OF THE WORK SECTION.
 *
 * One record per card, keyed by the same `id` as `workProjectsData.ts`. The
 * helix never imports this file - only the case study window does, and that
 * window is a dynamic import, so none of this prose reaches the initial
 * bundle.
 *
 * HOUSE RULES FOR THIS FILE, so eight projects read as one voice:
 *   - `hook` is one line and states the PROBLEM, never the solution.
 *   - `narrative` is exactly three paragraphs: what was wrong, what was done,
 *     what it now is. No fourth paragraph. If it needs one, it needs an edit.
 *   - `highlights` are four to five fragments, sentence case, no full stops.
 *   - `metrics` are only real numbers. Vantra's are fictional and carry a
 *     `note` for exactly that reason - do not remove it.
 *   - `palette` is at most three hexes, in the order the project uses them.
 */
export const WORK_CASE_STUDIES: Record<string, WorkCaseStudy> = {
  pencillink: {
    id: 'pencillink',
    client: 'PencilLink',
    industry: 'Business services',
    role: 'Design, build & CMS',
    scope: ['Brand Site', 'Service Architecture', 'CMS', 'Lead Capture'],
    timeline: '3 months',
    status: 'Live',
    problem: [
      'A growth agency was pitching full-cycle partnership through a site that read as a list of unrelated services.',
      'Prospects could not tell which of the six offerings applied to them, so qualified enquiries arrived asking questions the site should have answered.',
      'Every case the team won was won on a call, not on the page.',
    ],
    principles: [
      {
        title: 'One partner, not six services',
        body: 'Offerings are framed as stages of one engagement, so the range reads as capability rather than as scatter.',
      },
      {
        title: 'Qualify before the call',
        body: 'Scope, process and working style are stated on the page, so the first conversation starts at the brief.',
      },
      {
        title: 'Editable by the team, not the developer',
        body: 'Every claim, case and service block is CMS-backed, because copy that needs a deploy never gets updated.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'States the partnership offer in one line, before any service list.' },
      { label: 'Service stages', caption: 'Turns six separate offerings into one legible sequence of work.' },
      { label: 'Process', caption: 'Shows how an engagement actually runs, so the first call is not spent explaining it.' },
      { label: 'Case index', caption: 'Puts delivered work in front of the enquiry form rather than behind it.' },
      { label: 'Enquiry', caption: 'Collects scope and budget context up front, which is what makes a lead qualified.' },
    ],
    buildNotes: [
      'React and Tailwind front end, deployed on Vercel with preview builds per branch.',
      'Service, case and testimonial content is CMS-driven - no copy change requires a deploy.',
      'Layouts are fluid between 360px and 1920px rather than snapped to device breakpoints.',
      'Images are served in modern formats and lazily loaded below the fold.',
      'Scroll motion is short and single-purpose, and is disabled under prefers-reduced-motion.',
    ],
    pagesDelivered: ['Home', 'Services', 'Process', 'Work', 'About', 'Contact'],
    paletteNames: ['Ink', 'Signal', 'Support'],
    title: 'PencilLink',
    subtitle: 'Full-Cycle Business Growth Partner',
    category: 'Brand Site + CMS · Client Work',
    year: '2026',
    liveUrl: 'https://pencillink.tech/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/pencil-link',
    imageUrl: 'https://lh3.googleusercontent.com/d/1P8jZubj6pnP2BGIjpdDMNspJj3hsEQiS=w2400-rj',
    hook: "A studio that automates other people's businesses had no system of its own.",
    narrative: [
      'Most agencies sell five services from five disconnected pages, and the client never learns what the agency actually does.',
      'We refused the service list. The site was rebuilt as a single ladder — Operations, Digital Presence, Identity, Hook, Scale — so a visitor climbs one story instead of browsing five.',
      'Backed by a Supabase CMS and n8n automations, the studio now runs on the same infrastructure it sells. 50+ projects delivered.',
    ],
    highlights: [
      'Five-layer growth narrative as site architecture',
      'Supabase-backed CMS, no dev needed to publish',
      'n8n automation pipelines behind the lead flow',
      'Book-a-demo funnel wired end to end',
    ],
    metrics: ['50+ projects', '10x efficiency gain', '24/7 support'],
    stack: ['React', 'TypeScript', 'Supabase', 'n8n', 'Tailwind'],
    palette: ['#000000', '#FFB6C1', '#99A1AF'],
    typefaces: 'Space Grotesk / Inter',
    tags: ['branding', 'cms', 'ai-automation', 'web-development', 'bangladesh'],
    location: 'Lake Circus, Kolabagan, Dhaka 1205',
  },

  'bela-vista': {
    id: 'bela-vista',
    client: 'Bela Vista Resort',
    industry: 'Hospitality',
    role: 'Design & build',
    scope: ['Hospitality Site', 'Booking Journey', 'Content Direction'],
    timeline: '6 weeks',
    status: 'Live',
    problem: [
      "Bangladesh's only coral island was being sold like a spreadsheet - room counts, rates, amenity checklists.",
      'The one thing a guest is actually buying, the feeling of arriving on that shore, was nowhere on the page.',
      'Guests comparing resorts had nothing to compare except price, so the property competed on the only axis it could not win.',
    ],
    principles: [
      {
        title: 'Sell emotion first',
        body: 'The shore takes the entire first screen, silent and full-bleed. Specifications wait until the guest wants them.',
      },
      {
        title: 'Make booking easy',
        body: 'The reservation route is reachable from every screen, so intent is never more than one action from action.',
      },
      {
        title: 'Use proof over adjectives',
        body: 'Verified Google reviews carry the trust, because a guest believes another guest and discounts the brand.',
      },
    ],
    screens: [
      { label: 'Arrival', caption: 'Gives the shore the full first screen so the sell is the place, not the rate.' },
      { label: 'Experience pillars', caption: 'Reduces the stay to three things worth travelling for: West Beach, cottages, BBQ.' },
      { label: 'Cottages', caption: 'Answers what the guest sleeps in without turning into a specification table.' },
      { label: 'Reviews', caption: 'Hands the trust argument to verified guests instead of to adjectives.' },
      { label: 'Reservation', caption: 'Keeps booking one action away from wherever the guest was persuaded.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Vercel.',
      'Muted autoplaying shore video with a poster frame first paint, so the hero is never blank while it loads.',
      'Video is replaced by a still on narrow screens and on metered connections.',
      'Gold-on-navy editorial system held to a 4px radius throughout.',
      'Google review content is pulled in as structured data rather than pasted as screenshots.',
    ],
    pagesDelivered: ['Home', 'Cottages', 'Experiences', 'Gallery', 'Reservation', 'Contact'],
    paletteNames: ['Deep navy', 'Gold', 'Near black'],
    title: 'Bela Vista Resort',
    subtitle: 'Where the Bay of Bengal Meets Luxury',
    category: 'Hospitality Site · Personal Project',
    year: '2026',
    liveUrl: 'https://bela-vista-pied.vercel.app/',
    imageUrl: 'https://lh3.googleusercontent.com/d/1tunZoB3VTRYehOSiDAEUoTKlCug6jbcQ=w2400-rj',
    hook: "Bangladesh's only coral island, sold like a spreadsheet.",
    narrative: [
      'Island resorts here market on price and room count — the one thing a guest is actually buying, the feeling of arriving, goes missing.',
      'So nothing was explained. A silent shore video takes the full first screen, the copy shrinks to a single promise, and the sell is handed to real Google reviews instead of adjectives.',
      'The page now reads like a travel film with a booking button — serenity first, specifications later.',
    ],
    highlights: [
      'Full-bleed muted video hero, one promise only',
      'Verified Google reviews as the trust layer',
      'Three-pillar experience: West Beach, cottages, BBQ',
      'Gold-on-navy editorial system, 4px radius',
    ],
    stack: ['React', 'Tailwind', 'Vercel'],
    palette: ['#0F172A', '#D4AF37', '#111111'],
    typefaces: 'Italiana / Montserrat / Playfair Display',
    tags: ['hospitality', 'luxury', 'editorial', 'video-hero', 'saint-martins'],
    location: "West Beach, Dakhinpara, Saint Martin's Island",
    note: 'No public repository — source held privately.',
  },

  'rene-architect': {
    id: 'rene-architect',
    client: 'Rene Architect',
    industry: 'Architecture',
    role: 'Design & build',
    scope: ['Studio Site', 'Project Sequencing', 'Motion Direction'],
    timeline: '2 months',
    status: 'Live',
    problem: [
      'A 300-project firm was showing fifteen years of built work as a photo grid.',
      'Scale and craft - the only things a client is buying from an architect - vanished into thumbnails.',
      'Prospective clients left with a sense of quantity and no sense of quality.',
    ],
    principles: [
      {
        title: 'A sequence, not a gallery',
        body: 'Projects arrive one at a time, at full height, so each building gets the attention a building needs.',
      },
      {
        title: 'Name buildings like buildings',
        body: 'Emerald Silence. Sunlit Solitude. Earth and Light. A named work is remembered; a filename is not.',
      },
      {
        title: 'Discipline over decoration',
        body: 'Zero border radius everywhere, because the site should hold the same edges the practice does.',
      },
    ],
    screens: [
      { label: 'Entry', caption: 'Opens with an opt-in cinematic sequence that sets scale before any copy.' },
      { label: 'WE DESIGN / WE BUILD', caption: 'Splits the practice in two full-screen statements instead of a paragraph.' },
      { label: 'Process', caption: 'Reduces the practice to three honest stages - Concept, Design, Build - with no jargon.' },
      { label: 'Project reveal', caption: 'Gives one building the whole viewport so craft survives at reading size.' },
      { label: 'Contact', caption: 'Ends on the studio, its city and one way to start a conversation.' },
    ],
    buildNotes: [
      'React, Tailwind and GSAP, deployed on Netlify.',
      'Scroll-driven reveals are ScrollTrigger-based and pinned only where the sequence needs it.',
      'Audio is strictly opt-in and never autoplays.',
      'Full-bleed architectural photography is served responsively at several widths to protect mobile data.',
      'All motion collapses to plain fades under prefers-reduced-motion.',
    ],
    pagesDelivered: ['Home', 'Practice', 'Process', 'Projects', 'Contact'],
    paletteNames: ['Carbon', 'Deep teal', 'Slate blue'],
    title: 'René Architect',
    subtitle: 'Architecture Redefined',
    category: 'Architecture Studio Site · Client Work',
    year: '2026',
    liveUrl: 'https://rene-architect.netlify.app/',
    imageUrl: 'https://lh3.googleusercontent.com/d/1kIHJOWW8dS5_-yiHFTMwRjLPAHJN3_zu=w2400-rj',
    hook: 'A 300-project firm was showing its work as a photo grid.',
    narrative: [
      'Fifteen years of built work had been flattened into thumbnails, so scale and craft — the only things a client is buying — vanished.',
      'The site became a sequence instead of a gallery: an audio-enabled opening, WE DESIGN / WE BUILD as full-screen statements, then the practice reduced to three honest stages — Concept, Design, Build.',
      'Projects now arrive one at a time, named like buildings rather than files. Emerald Silence. Sunlit Solitude. Earth and Light.',
    ],
    highlights: [
      'Opt-in audio cinematic entry sequence',
      'Three-stage process narrative, zero jargon',
      'Named project reveals with scroll-driven motion',
      'Zero border radius throughout — architectural discipline',
    ],
    metrics: ['Since 2010', '300+ projects', 'Based in Chattogram'],
    stack: ['React', 'Tailwind', 'GSAP', 'Netlify'],
    palette: ['#0A0A0A', '#08151C', '#15303D'],
    typefaces: 'Geist / Lora / Outfit · 0px radius',
    tags: ['architecture', 'cinematic', 'motion', 'portfolio', 'chattogram'],
    credit: 'Firm led by Kazi Fahim Nasir',
    note: 'No public repository — source held privately.',
  },

  sonapahar: {
    id: 'sonapahar',
    client: 'Sonapahar Farmhouse Resort',
    industry: 'Hospitality',
    role: 'Design & build',
    scope: ['Resort Site', 'Villa Pages', 'Rate Transparency'],
    timeline: '6 weeks',
    status: 'Live',
    problem: [
      'A hill farmhouse resort was taking bookings through phone calls and social messages.',
      'Rates, villa differences and what the tariff actually included were explained one guest at a time, over and over.',
      'Guests asked the same three questions before every booking, which is a website problem, not a staffing problem.',
    ],
    principles: [
      {
        title: 'Answer the tariff question first',
        body: 'Rates and what they include are printed plainly, because a hidden price reads as an expensive one.',
      },
      {
        title: 'Give each villa its own character',
        body: 'Akash, Kusum and Madhavilata are presented as three different stays, not three room codes.',
      },
      {
        title: 'Let the hill do the selling',
        body: 'Warm, wide photography carries the mood; the copy stays out of its way.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Establishes the hill setting before a single amenity is mentioned.' },
      { label: 'Villas', caption: 'Turns three villas into three distinct stays a guest can choose between.' },
      { label: 'Tariff', caption: 'States nightly rates and VAT openly so the pricing question never reaches staff.' },
      { label: 'Grounds', caption: 'Shows what there is to do once the guest has arrived and unpacked.' },
      { label: 'Getting here', caption: 'Answers the second most asked question - how far, and how - with a route and a map.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Netlify.',
      'Villa content is data-driven, so a fourth villa is a record rather than a new page.',
      'Rates and VAT live in one place and are printed from it, so they cannot disagree between pages.',
      'Photography is compressed and lazily loaded, since this audience arrives largely on mobile data.',
      'Layout is fluid from 360px up, with the villa grid collapsing to a single column early.',
    ],
    pagesDelivered: ['Home', 'Villas', 'Tariff', 'Grounds', 'Location', 'Contact'],
    paletteNames: ['Bone', 'Wheat gold', 'Forest'],
    title: 'Sonapahar Farmhouse Resort',
    subtitle: 'Here you are permitted to simply be',
    category: 'Hospitality Site + Booking · Client Work',
    year: '2026',
    liveUrl: 'https://sonapahar.netlify.app/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/Sonapahar-farmhouse-resort-website',
    imageUrl: 'https://lh3.googleusercontent.com/d/1eZq-CRDnuMbFWxdvQG-FumINwT1wHI2I=w2400-rj',
    hook: 'A dead brick kiln became a forest. Nobody knew.',
    narrative: [
      "The land under this resort used to be a brick kiln. Today it holds Bangladesh's first Miyawaki forest — and the old site led with room rates.",
      'Restoration became the headline. The forest is the product, the villas are how you enter it, and slowness was designed into the page itself through parallax and long editorial calm.',
      'Three villas — Akash, Kusum, Madhavilata — each with its own reason to exist, priced live with tax inside a glass booking panel.',
    ],
    highlights: [
      'Interactive villa selector, ৳12,500–৳18,500 per night',
      'Live rate + 15% VAT summary before submit',
      'Parallax forest storytelling, photo-ribbon gallery',
      'Glassmorphic reservation flow with concierge callback',
    ],
    metrics: ['Est. 2024', 'First Miyawaki forest in Bangladesh'],
    stack: ['HTML', 'CSS', 'JavaScript', 'Netlify'],
    palette: ['#FAF8F5', '#C5A880', '#1A2417'],
    typefaces: 'Amarante / Cormorant Garamond / Montserrat',
    tags: ['eco-luxury', 'booking-engine', 'parallax', 'miyawaki', 'chattogram'],
    location: 'Zorarganj, Mirsharai, Chattogram',
  },

  'oxygen-sports': {
    id: 'oxygen-sports',
    client: 'Oxygen Sports Zone',
    industry: 'Sport & recreation',
    role: 'Design & build',
    scope: ['Turf Site', 'Slot Enquiry Flow', 'Facility Pages'],
    timeline: '5 weeks',
    status: 'Live',
    problem: [
      'A turf ground was run entirely through phone calls: one caller at a time asking which slots were free.',
      'Players could not see what the ground offered, what it cost, or when it was open without ringing first.',
      'The busiest hours were also the hours nobody could get through.',
    ],
    principles: [
      {
        title: 'Get to the slot fast',
        body: 'Booking intent is the only reason anyone opens this site, so the enquiry route is never more than one action away.',
      },
      {
        title: 'Show the ground, not a stock pitch',
        body: 'Real photography of the actual turf, under actual floodlights, because players recognise their own ground.',
      },
      {
        title: 'State the terms plainly',
        body: 'Hours, rates and facilities are printed, which removes the entire category of question the phone was answering.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Leads with the ground under lights and a single booking action.' },
      { label: 'Facilities', caption: 'Lists what a team actually gets - surface, lighting, changing, parking.' },
      { label: 'Rates & hours', caption: 'Publishes the terms so the phone stops being the price list.' },
      { label: 'Slot enquiry', caption: 'Captures date, time and team size, so the callback starts with an answer.' },
      { label: 'Location', caption: 'Puts the ground on a map for players deciding between two nearby turfs.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Netlify.',
      'Enquiry form posts to a single endpoint with client and server side validation.',
      'Built mobile-first: nearly every visit is a phone deciding on the way to a match.',
      '12px radius system and a green-on-black palette drawn from the floodlit turf itself.',
      'Hover motion is limited to buttons and cards, so it degrades cleanly on touch.',
    ],
    pagesDelivered: ['Home', 'Facilities', 'Rates', 'Booking enquiry', 'Contact'],
    paletteNames: ['Night black', 'Turf green', 'Bone'],
    title: 'Oxygen Sports Zone',
    subtitle: 'Play & Perform',
    category: 'Sports Facility Site + Booking · Client Work',
    year: '2026',
    liveUrl: 'https://oxygen-sports.netlify.app/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/Oxygen-sports-turf-website',
    imageUrl: 'https://lh3.googleusercontent.com/d/1iBiZ58h1qCKb3E69x_W5vRhOTRSNF3q2=w2400-rj',
    hook: 'Ten sports, one phone number, endless back-and-forth.',
    narrative: [
      'Booking a pitch in Chattogram meant calling, waiting, and hoping the slot was still free. Ten disciplines, no system.',
      'The whole facility was modelled as a five-step reservation deck — date, discipline, intensity, zone, duration — that builds a live receipt as you go, so you always see what you are about to commit to.',
      'Football to padel to Hyrox circuits now book themselves, in a dark performance UI built to feel like equipment, not a form.',
    ],
    highlights: [
      'Five-step booking deck with live receipt stub',
      '10 disciplines: football, padel, cricket, swim, more',
      'Peak / off-peak intensity pricing logic',
      'Olive-on-black high-performance interface',
    ],
    stack: ['TypeScript', 'React', 'Custom CSS'],
    palette: ['#000000', '#8DA040', '#FAF7F2'],
    typefaces: 'Space Grotesk / Outfit · 12px radius',
    tags: ['booking-engine', 'sports', 'dark-ui', 'multi-step-form', 'chattogram'],
    location: 'Khulshi, Chattogram',
  },

  'vantra-logistics': {
    id: 'vantra-logistics',
    client: 'Self-initiated concept',
    industry: 'Freight & logistics',
    role: 'Design study',
    scope: ['Concept Brand Site', 'Interface System', 'Motion Study'],
    timeline: '3 weeks',
    status: 'Concept - not a client engagement',
    problem: [
      'Freight sites sell trust with stock photography of lorries and a paragraph about reliability.',
      'Nothing on them tells a shipper what actually happens to their consignment, or when.',
      'This study asks what the category looks like if the interface, rather than the adjectives, carries the confidence.',
    ],
    principles: [
      {
        title: 'Speed as the visual argument',
        body: 'Type, motion and orange signal are tuned to read as momentum before a word is read.',
      },
      {
        title: 'Show the operation',
        body: 'Tracking, lanes and status are treated as interface surfaces rather than as marketing claims.',
      },
      {
        title: 'Hard edges, no softening',
        body: 'Zero radius and a single accent, because a logistics brand that looks friendly does not look precise.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Makes the speed claim structurally, through scale and motion rather than copy.' },
      { label: 'Lanes', caption: 'Shows coverage as a network a shipper can read at a glance.' },
      { label: 'Tracking', caption: 'Treats consignment status as the product surface, not as a support page.' },
      { label: 'Fleet', caption: 'Answers capacity questions with specifics instead of lorry photography.' },
      { label: 'Quote', caption: 'Reduces the first contact to the three fields a quote actually needs.' },
    ],
    buildNotes: [
      'React, Tailwind and GSAP, deployed on Netlify.',
      'Zero border radius and one accent colour, applied to single points only.',
      'Scroll and hover motion built on a shared easing set so the whole site moves as one system.',
      'Fully responsive from 360px, with the lane and tracking views reflowing rather than scaling down.',
      'Numbers shown in the interface are illustrative fixtures, labelled as such in the copy.',
    ],
    pagesDelivered: ['Home', 'Services', 'Network', 'Tracking', 'Quote'],
    paletteNames: ['Carbon', 'Signal orange', 'Steel'],
    title: 'Vantra Logistics',
    subtitle: "Freight that doesn't wait",
    category: 'Concept Brand Site · Design Study',
    year: '2026',
    liveUrl: 'https://vantra-logistics.netlify.app/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/Vantra_Logistics_Site',
    imageUrl: 'https://lh3.googleusercontent.com/d/1DM-W0hSfQ4bDAbQjQDNWzXl0tASjeOW4=w2400-rj',
    hook: 'Logistics sites all look like inventory. This one moves.',
    narrative: [
      'Freight is an industry of speed that markets itself with stock photos and static spec tables.',
      'A self-directed study asked the opposite question: what if the page behaved like the cargo? Motion carries the argument — containers swing, hubs snap into place, numbers count as you scroll.',
      'Real container specs, real terminal geography, one orange accent doing all the work. Precision made visible.',
    ],
    highlights: [
      'GSAP motion system as the primary brand asset',
      'Real spec depth: 20DC, 40DC, 40HC dimensions',
      'Three global hubs — Chicago, LA, Rotterdam',
      'Single-accent discipline: orange on near-black',
    ],
    metrics: ['20k+ shipments', '10k+ drivers', '98% on-time'],
    stack: ['TypeScript', 'React', 'GSAP', 'Tailwind'],
    palette: ['#0A0A0A', '#FF4500', '#E5E5E5'],
    typefaces: 'Inter · 0px radius',
    tags: ['gsap', 'motion-design', 'logistics', 'concept', 'ui-design'],
    note: 'Fictional brand, self-initiated design study — the metrics above are illustrative, not client results.',
  },

  'type-archive': {
    id: 'type-archive',
    client: 'Self-initiated product',
    industry: 'Design tools',
    role: 'Design, build & API',
    scope: ['Web App', 'Font Preview Engine', 'Public API'],
    timeline: '2 months',
    status: 'Live - actively maintained',
    problem: [
      'Choosing a typeface means opening a dozen foundry pages and typing the same sentence into each of them.',
      'Nothing lets you preview every family you own side by side, in your own words, at your own size.',
      'The comparison a designer actually needs to make is the one no font site supports.',
    ],
    principles: [
      {
        title: 'Every family, previewed',
        body: 'One string of your text renders across the whole archive at once - comparison is the product.',
      },
      {
        title: 'Readable defaults, then control',
        body: 'It opens on a sensible size and specimen, and only then exposes weight, size and spacing.',
      },
      {
        title: 'Machine readable too',
        body: 'The same archive is exposed over an API and as plain text, so other tools can consume it.',
      },
    ],
    screens: [
      { label: 'Archive', caption: 'Renders every family against one shared string, which is the comparison that matters.' },
      { label: 'Live specimen', caption: 'Lets a designer type their own words instead of reading a canned pangram.' },
      { label: 'Family detail', caption: 'Shows all styles in a family together so weight range is judged, not guessed.' },
      { label: 'Controls', caption: 'Exposes size, weight and spacing without burying the preview under a panel.' },
      { label: 'API', caption: 'Documents the endpoints so the archive is usable from outside the interface.' },
    ],
    buildNotes: [
      'Next.js App Router with TypeScript, deployed behind a custom subdomain.',
      'Fonts are loaded on demand per family, so a large archive does not block first paint.',
      'Public surfaces: /api/fonts as JSON, plus /fonts.txt and /llms.txt as plain text.',
      'Preview rendering is virtualised, which is what keeps scrolling smooth as families grow.',
      'Fully keyboard navigable, since this is a tool people use for long sittings.',
    ],
    pagesDelivered: ['Archive', 'Family detail', 'API docs', 'About'],
    paletteNames: ['Paper', 'Ink', 'Highlight'],
    title: 'Type Archive',
    subtitle: 'Every family, previewed',
    category: 'Web App · Product',
    year: '2026',
    liveUrl: 'https://type-archive.miftahulislamefaz.xyz/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/Type-Archive',
    imageUrl: 'https://lh3.googleusercontent.com/d/12I-4G7X8U8IG-hQ5IqEgN2L1kdQhUdBU=w2400-rj',
    hook: 'The fonts you love end up scattered across downloads and half-remembered websites.',
    narrative: [
      'Every designer has the same graveyard: a Downloads folder, dead bookmarks, and a typeface they can no longer find.',
      'Type Archive gives each family a real home — upload the files or paste a stylesheet link, and it becomes a proper entry with a specimen you can type your own words into.',
      'Private space, public library, no account needed to browse. Built for machines too: JSON, plain-text and llms.txt endpoints.',
    ],
    highlights: [
      '41 families · 487 styles · 21 categories',
      'Live editable specimens in regular, bold, italic',
      'Font pairing tool + favourites via Google sign-in',
      'Download, embed, or install from the terminal',
      'Machine-readable API: /api/fonts, /fonts.txt, /llms.txt',
    ],
    metrics: ['41 families', '487 styles', '2 contributors'],
    stack: ['Next.js', 'TypeScript', 'React', 'Supabase'],
    palette: ['#FFFFFF', '#0B0B0B', '#FFFFE3'],
    typefaces: 'Instrument Serif / Instrument Sans',
    tags: ['nextjs', 'typescript', 'typography', 'webfonts', 'product', 'tool'],
  },

  'gdrive-host': {
    id: 'gdrive-host',
    client: 'Open source',
    industry: 'Developer tools',
    role: 'Design, build & maintenance',
    scope: ['Open Source Tool', 'Documentation', 'Hosted Demo'],
    timeline: '1 month',
    status: 'Live - open source, MIT',
    problem: [
      'Small projects need image hosting and reach for a paid CDN or a free tier that expires.',
      'Everyone already has a Drive full of storage that cannot be pointed at a website.',
      'The gap is not storage, it is a usable URL - which is the whole tool.',
    ],
    principles: [
      {
        title: 'Use the storage people already have',
        body: 'No new account, no new bill: a Drive file becomes a direct, hotlinkable media URL.',
      },
      {
        title: 'One paste, one URL',
        body: 'The interface is a single field and a result, because anything more is a reason to give up.',
      },
      {
        title: 'Document the sharp edges',
        body: 'Referrer policy, rate limits and what Drive will refuse are written down rather than discovered.',
      },
    ],
    screens: [
      { label: 'Converter', caption: 'Turns a Drive link into a usable media URL in one paste.' },
      { label: 'Result', caption: 'Shows the live preview next to the URL so the link is verified before it is used.' },
      { label: 'Formats', caption: 'Explains which sizes and transforms are available and how to ask for them.' },
      { label: 'Docs', caption: 'Covers the referrer and caching gotchas that break Drive hotlinking in production.' },
    ],
    buildNotes: [
      'Next.js and TypeScript, deployed on Vercel.',
      'Pure client-side URL transformation - no upload, no proxy, no stored user data.',
      'Documents the no-referrer requirement, which is what makes Drive images load cross-origin at all.',
      'MIT licensed with the source public on GitHub.',
      'Responsive single-column interface; the tool is one field, so it needs no layout system.',
    ],
    pagesDelivered: ['Converter', 'Documentation', 'GitHub repository'],
    paletteNames: ['Cloud white', 'Drive blue', 'Ink'],
    title: 'GDrive Host',
    subtitle: 'Your Drive is now a CDN',
    category: 'Open Source Tool · Product',
    year: '2026',
    liveUrl: 'https://g-drive-media-hosting.vercel.app/',
    repoUrl: 'https://github.com/Miftahul-Islam-Efaz/GDrive-Media-Hosting',
    imageUrl: 'https://lh3.googleusercontent.com/d/1qOrVw-JArkhjMA8duwhyvgR1mpt2wHnd=w2400-rj',
    hook: 'Everyone pays for image hosting they already own.',
    narrative: [
      'Free image hosts expire, watermark, or vanish — while 15GB of Google Drive sits unused in every account.',
      'The insight was that Drive already serves files publicly; it just never gave you the URL. This does, in one click, entirely in the browser with a drive.file scope, so no server ever touches your media.',
      'Upload, get a hotlinkable CDN link, ship. No backend, no bill — the images on these very cards are served by it.',
    ],
    highlights: [
      'Instant public CDN URLs for images and video',
      'Client-side only — no backend, no credentials stored',
      'Narrow drive.file OAuth scope by design',
      'MIT licensed, deployable in one click',
    ],
    metrics: ['6 GitHub stars', '1 fork', 'MIT'],
    stack: ['Next.js 15', 'JavaScript', 'Drive API v3', 'Vercel'],
    palette: ['#F8FAFD', '#4899FF', '#1F1F1F'],
    typefaces: 'Outfit · 16/20/24px radius',
    tags: ['cdn', 'nextjs', 'google-drive-api', 'image-hosting', 'free-hosting'],
    license: 'MIT',
  },
};

/** Undefined for a card with no written case study yet - the open cue is
 *  suppressed rather than opening an empty window. */
export function getCaseStudy(id: string): WorkCaseStudy | undefined {
  return WORK_CASE_STUDIES[id];
}

/* ---- URL SLUGS -------------------------------------------------------
   Derived from the TITLE rather than the id, because the title is what the
   visitor sees and therefore what they expect in the address bar. For every
   current record the two already agree ("GDrive Host" -> gdrive-host), so
   this changes no URL today - it is insurance for the day an id drifts from
   its title, or a title arrives from the admin panel with capitals, an
   ampersand or an accent in it.

   getCaseStudyBySlug also accepts a bare id, so any link ever built from an
   id keeps working. */
export function caseStudySlug(study: WorkCaseStudy): string {
  return study.title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCaseStudyBySlug(slug: string): WorkCaseStudy | undefined {
  const want = slug.toLowerCase();
  return Object.values(WORK_CASE_STUDIES).find(
    (study) => caseStudySlug(study) === want || study.id === want
  );
}
