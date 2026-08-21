/**
 * Shared data shapes for the work section.
 *
 * This interface used to live in WorkProjectCard.tsx, which meant the project
 * DATA imported from the project COMPONENT. That one type-only import was
 * enough to pull the card component - and the 365-line dissolve image it
 * renders, plus GSAP and ScrollTrigger - into the module graph, long after the
 * dither carousel replaced both. Types belong somewhere data and components can
 * each depend on without depending on each other.
 */

/** A single project in the work section. */
export interface WorkProjectCardData {
  id: string;
  title: string;
  category: string;
  year: string;
  badge: string;
  imageUrl: string;
  /** Second image revealed by the pixel dissolve on hover. */
  hoverImageUrl?: string;
  linkUrl: string;
  coords: string;
  accentColor?: string;
  tech?: string[];
  description?: string;
}
