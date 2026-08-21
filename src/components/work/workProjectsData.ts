import type { WorkProjectCardData } from './types';

/**
 * `imageUrl`      — shown at rest.
 * `hoverImageUrl` — revealed by the pixel-block dissolve on hover.
 *
 * The hover images below are placeholders drawn from the existing image set so
 * the effect is visible immediately. Swap each one for the real second shot
 * (detail view, alternate screen, interior page) when they are ready.
 */
export const WORK_PROJECTS: WorkProjectCardData[] = [
  // 1. ROW 1 (RIGHT CARD)
  {
    id: 'reunimos',
    title: 'REUNIMOS\u2122',
    category: 'Full-Stack Workspace & AI Canvas',
    year: '2024-2025',
    badge: 'CODING PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://pencillink.tech/',
    coords: '0378 X 0231 Y',
    tech: ['AI Canvas', 'Collaborative', 'TypeScript'],
    description: 'Next-gen collaborative digital workspace for product builders.',
  },
  // 2. ROW 2 LEFT CARD
  {
    id: 'inspire-mono',
    title: 'Inspire Mono',
    category: 'WASM Design Utilities & Typography',
    year: '2025',
    badge: 'CODING PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://osmins-landscaping.netlify.app/',
    coords: '0366 X 0231 Y',
    tech: ['WASM', 'Typography', 'Monospace Engine'],
    description: 'Monospaced typographic design system & WASM font tool.',
  },
  // 3. ROW 2 RIGHT CARD
  {
    id: 'pencil-link',
    title: 'Pencil Link Outsourcing',
    category: 'AI Auto & SaaS Growth Unit',
    year: '2025',
    badge: 'CODING PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://pencillink.tech/',
    coords: '0433 X 0082 Y',
    tech: ['Custom SaaS', 'AI Workflows', 'Brand Identity'],
    description: 'Bundled tech squad providing software development and automated AI agent workflows.',
  },
  // 4. ROW 3 RIGHT-CENTER CARD 1
  {
    id: 'vector-symbols',
    title: 'Vector Symbols System',
    category: 'WASM Design Utilities',
    year: '2023',
    badge: 'TOOLS',
    imageUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://pencillink.tech/',
    coords: '0811 X 0290 Y',
    tech: ['WASM Vector Core', 'Icon Generator', 'Figma Plugin'],
    description: 'High performance web assembly powered icon generator and vector export engine.',
  },
  // 5. ROW 3 RIGHT CARD 2
  {
    id: 'rene-architect',
    title: 'Rene Architect Studio',
    category: 'Biophilic Geo Architecture',
    year: '2024',
    badge: 'CODING PROJECT',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://rene-architect.netlify.app/',
    coords: '0757 X 0242 Y',
    tech: ['Eco Geometries', 'Concrete Craft', '3-Stage Framework'],
    description: 'Chittagong-based architectural studio honoring biophilic harmony and raw modern concrete shapes.',
  },
  // 6. ROW 4 LEFT TALL CARD
  {
    id: 'shore-icon',
    title: 'Shore Icon & Teambition',
    category: 'Mobile Systems & Workspace',
    year: '2020-2022',
    badge: 'TEAMBITION',
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://bela-vista-pied.vercel.app/',
    coords: '0366 X 0231 Y',
    tech: ['iOS Design', 'App Ecosystem', 'Cloud Storage'],
    description: 'Productivity suite and icon design system for mobile application suites.',
  },
  // 7. ROW 4 MIDDLE CARD
  {
    id: 'ceramic-enthusiasts',
    title: 'Ceramic Enthusiasts',
    category: 'Automotive PPF Studio',
    year: '2023',
    badge: 'AUTOMOTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://ceramic-enthusiasts.netlify.app/',
    coords: '0512 X 0241 Y',
    tech: ['Liquid PPF Shield', '10H Nano Ceramic', 'Precision Polish'],
    description: 'Houston automotive studio dedicated to single-vehicle paint protection film & ceramic coating.',
  },
  // 8. ROW 4 RIGHT CARD
  {
    id: 'clean-home',
    title: 'Family Services Cleaning',
    category: 'Pet-Safe Hygiene Systems',
    year: '2023',
    badge: 'ECO BIOPHILICS',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    hoverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://clean-home-power-washing.netlify.app/',
    coords: '0405 X 0332 Y',
    tech: ['Non-Toxic Formulas', 'HEPA Sanitization', 'Pet Safe Care'],
    description: 'Residential hygiene systems utilizing 100% biodegradable botanical non-toxic formulas.',
  },
];
