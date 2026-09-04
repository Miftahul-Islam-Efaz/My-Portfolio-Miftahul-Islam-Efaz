import type { WorkProjectCardData } from './types';

/**
 * THE EIGHT CARDS ON THE HELIX, IN SCROLL ORDER.
 *
 * This file is the card layer only: what the helix renders and what the
 * bottom-right list prints. The long-form content for each project lives in
 * `caseStudyData.ts`, keyed by the same `id`. Two files rather than one
 * because the GL layer only ever needs `imageUrl` + `title`, and pulling a
 * few hundred lines of prose into the module graph that feeds a WebGL texture
 * loader buys nothing.
 *
 * IMAGES ARE GOOGLE DRIVE CDN LINKS (lh3.googleusercontent.com/d/<fileId>),
 * served through the same trick GDrive Host automates. Two consequences worth
 * knowing:
 *   1. They are loaded as WebGL textures with crossOrigin="anonymous", so they
 *      depend on lh3 continuing to answer with a permissive CORS header. If a
 *      card ever renders as a black rectangle, check the console for a CORS
 *      failure before touching the shader.
 *   2. The file must stay shared as "anyone with the link". A permission change
 *      in Drive is indistinguishable, from here, from a broken URL.
 *
 * `hoverImageUrl` is deliberately unset. The pixel-dissolve second shot was a
 * placeholder feature filled with duplicates of the existing set; there are no
 * real alternate shots for these eight, and hovering now racks focus and
 * raises the open cue instead. The field stays optional in `types.ts` so a
 * second shot can be reintroduced per project without a schema change.
 */
export const WORK_PROJECTS: WorkProjectCardData[] = [
  {
    id: 'pencillink',
    title: 'PencilLink',
    category: 'Full-Cycle Business Growth Partner',
    year: '2026',
    badge: 'BRAND SITE + CMS',
    imageUrl: 'https://lh3.googleusercontent.com/d/1P8jZubj6pnP2BGIjpdDMNspJj3hsEQiS=w2400-rj',
    linkUrl: 'https://pencillink.tech/',
    coords: '0501 X 0231 Y',
    tech: ['React', 'TypeScript', 'Supabase', 'n8n'],
    description: 'A studio that automates other businesses, finally running on its own system.',
  },
  {
    id: 'bela-vista',
    title: 'Bela Vista Resort',
    category: 'Where the Bay of Bengal Meets Luxury',
    year: '2026',
    badge: 'HOSPITALITY',
    imageUrl: 'https://lh3.googleusercontent.com/d/1tunZoB3VTRYehOSiDAEUoTKlCug6jbcQ=w2400-rj',
    linkUrl: 'https://bela-vista-pied.vercel.app/',
    coords: '0208 X 0922 Y',
    tech: ['React', 'Tailwind', 'Vercel'],
    description: "Bangladesh's only coral island, sold as a travel film instead of a spreadsheet.",
  },
  {
    id: 'rene-architect',
    title: 'René Architect',
    category: 'Architecture Redefined',
    year: '2026',
    badge: 'STUDIO SITE',
    imageUrl: 'https://lh3.googleusercontent.com/d/1kIHJOWW8dS5_-yiHFTMwRjLPAHJN3_zu=w2400-rj',
    linkUrl: 'https://rene-architect.netlify.app/',
    coords: '0300 X 0157 Y',
    tech: ['React', 'Tailwind', 'GSAP', 'Netlify'],
    description: 'Fifteen years of built work, moved out of a photo grid and into a sequence.',
  },
  {
    id: 'sonapahar',
    title: 'Sonapahar Farmhouse',
    category: 'Here you are permitted to simply be',
    year: '2026',
    badge: 'BOOKING ENGINE',
    imageUrl: 'https://lh3.googleusercontent.com/d/1eZq-CRDnuMbFWxdvQG-FumINwT1wHI2I=w2400-rj',
    linkUrl: 'https://sonapahar.netlify.app/',
    coords: '0224 X 0917 Y',
    tech: ['HTML', 'CSS', 'JavaScript', 'Netlify'],
    description: 'A dead brick kiln became the first Miyawaki forest in Bangladesh. Nobody knew.',
  },
  {
    id: 'oxygen-sports',
    title: 'Oxygen Sports Zone',
    category: 'Play & Perform',
    year: '2026',
    badge: 'BOOKING ENGINE',
    imageUrl: 'https://lh3.googleusercontent.com/d/1iBiZ58h1qCKb3E69x_W5vRhOTRSNF3q2=w2400-rj',
    linkUrl: 'https://oxygen-sports.netlify.app/',
    coords: '0223 X 0918 Y',
    tech: ['TypeScript', 'React', 'Custom CSS'],
    description: 'Ten disciplines, one phone number. Now a five-step reservation deck.',
  },
  {
    id: 'vantra-logistics',
    title: 'Vantra Logistics',
    category: "Freight that doesn't wait",
    year: '2026',
    badge: 'DESIGN STUDY',
    imageUrl: 'https://lh3.googleusercontent.com/d/1DM-W0hSfQ4bDAbQjQDNWzXl0tASjeOW4=w2400-rj',
    linkUrl: 'https://vantra-logistics.netlify.app/',
    coords: '0418 X 0876 Y',
    tech: ['TypeScript', 'React', 'GSAP', 'Tailwind'],
    description: 'Logistics sites all look like inventory. This one behaves like cargo.',
  },
  {
    id: 'type-archive',
    title: 'Type Archive',
    category: 'Every family, previewed',
    year: '2026',
    badge: 'PRODUCT',
    imageUrl: 'https://lh3.googleusercontent.com/d/12I-4G7X8U8IG-hQ5IqEgN2L1kdQhUdBU=w2400-rj',
    linkUrl: 'https://type-archive.miftahulislamefaz.xyz/',
    coords: '0487 X 0041 Y',
    tech: ['Next.js', 'TypeScript', 'Supabase'],
    description: '41 families, 487 styles, and a real home for the fonts you keep losing.',
  },
  {
    id: 'gdrive-host',
    title: 'GDrive Host',
    category: 'Your Drive is now a CDN',
    year: '2026',
    badge: 'OPEN SOURCE',
    imageUrl: 'https://lh3.googleusercontent.com/d/1qOrVw-JArkhjMA8duwhyvgR1mpt2wHnd=w2400-rj',
    linkUrl: 'https://g-drive-media-hosting.vercel.app/',
    coords: '0015 X 0006 Y',
    tech: ['Next.js 15', 'Drive API v3', 'Vercel'],
    description: 'Everyone pays for image hosting they already own. 15GB, one click, no backend.',
  },
];
