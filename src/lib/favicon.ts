import { cache } from "react"

import { getSiteImage } from "@/lib/cms/queries"

/**
 * THE FAVICON SLOT, INTERPRETED.
 *
 * Site images -> Favicon holds one string, and that string now describes four
 * kinds of tab icon:
 *
 *   https://.../mark.png   (or .ico, .jpg, .webp, .gif)
 *       A static image. GIF animates only where the browser animates icons.
 *
 *   https://.../mark.svg
 *       An SVG, possibly with SMIL animation inside. Emitted with the right
 *       MIME type so browsers that animate SVG favicons can do it.
 *
 *   https://.../loop.mp4   (or .webm)
 *       A video. No browser draws a video as a tab icon by itself, so a
 *       client component pulls frames onto a canvas and swaps the icon -
 *       see components/favicon/AnimatedFavicon.tsx.
 *
 *   animated:ascii-m
 *       The built-in ASCII logo animation, drawn in code. No file at all.
 *
 * Animated kinds keep a static PNG in the metadata as well, so crawlers and
 * no-JS contexts still get a real icon.
 */

export const ANIMATED_FAVICON_FALLBACK = "/favicon-ascii-m.png"

export type FaviconSpec =
	| { kind: "none" }
	| { kind: "image"; url: string }
	| { kind: "svg"; url: string }
	| { kind: "video"; url: string }
	| { kind: "ascii" }

const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i
const SVG_FILE = /\.svg(\?|#|$)/i
const BUILTIN = /^animated:[a-z0-9-]+$/i

export function parseFavicon(raw: string): FaviconSpec {
	const value = raw.trim()
	if (!value) return { kind: "none" }
	if (BUILTIN.test(value)) return { kind: "ascii" }
	if (VIDEO_FILE.test(value)) return { kind: "video", url: value }
	if (SVG_FILE.test(value)) return { kind: "svg", url: value }
	return { kind: "image", url: value }
}

/** Cached per request - generateMetadata and the layout body both ask. */
export const getFaviconSpec = cache(async (): Promise<FaviconSpec> => {
	try {
		return parseFavicon(await getSiteImage("favicon", ""))
	} catch {
		return { kind: "none" }
	}
})
