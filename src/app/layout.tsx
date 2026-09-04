import type { Metadata } from "next"
import "./globals.css"

import {
	getSiteIdentity,
	getSiteImage,
	SITE_IDENTITY_FALLBACK,
	type SiteIdentity,
} from "@/lib/cms/queries"
import SmoothScrollProvider from "@/components/SmoothScrollProvider"
import CrawlableAbstract from "@/components/seo/CrawlableAbstract"
import { graphFor, sameAsFrom } from "@/lib/seo/graph"

/** Canonical origin. Kept in step with sitemap.ts and robots.ts. */
const SITE = "https://www.miftahulislamefaz.xyz"

/** Used only if the CMS slot is empty or Supabase cannot be reached. A social
 *  card with no image is worse than a stale one, so there is always a picture. */
const OG_FALLBACK =
	"https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780795749/editorial_shot_tbzvnc.png"

const SAME_AS = [
	"https://github.com/Miftahul-Islam-Efaz",
	"https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/",
	"https://x.com/Miftahul_Islam9",
	"https://www.instagram.com/miftahul_islam_efaz/", // superseded by sameAsFrom(); kept only as the last-resort fallback list.
	"https://www.facebook.com/miftahul.islam.efaz",
]

/**
 * Social crawlers are not browsers.
 *
 * Facebook, WhatsApp and LinkedIn fetch og:image once, with no cookies, and
 * many of them refuse to follow a cross-origin redirect. A raw Drive link
 * (lh3.googleusercontent.com/d/<id>) therefore works in the admin preview and
 * then shows nothing in a WhatsApp chat. Routing it through this site's own
 * proxy fixes that: same origin, permanent cache, no redirect.
 *
 * A relative path is also not enough - og:image must be absolute, because the
 * crawler has no page context to resolve it against.
 */
function absoluteOgImage(raw: string): string {
	const url = raw.trim()
	if (!url) return ""

	const drive = url.match(
		/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,128})/
	)
	if (drive) return `${SITE}/api/drive-image?id=${drive[1]}`

	if (url.startsWith("/")) return `${SITE}${url}`
	if (/^https?:\/\//i.test(url)) return url

	return ""
}

/** "Chattogram, Bangladesh" -> a PostalAddress. Location-based searches match
 *  on the structured fields, not on the sentence, so the comma is load-bearing.
 *  With no comma the whole string is treated as the city, which is still
 *  better than emitting nothing. */
function postalAddress(location: string) {
	const parts = location
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean)

	if (parts.length === 0) return undefined

	return {
		"@type": "PostalAddress",
		addressLocality: parts[0],
		...(parts.length > 1
			? { addressCountry: parts[parts.length - 1] }
			: {}),
	}
}

/** Never let the head take the page down. A stale card is an acceptable
 *  failure; a blank site is not. */
async function identityOrFallback(): Promise<SiteIdentity> {
	try {
		return await getSiteIdentity()
	} catch {
		return SITE_IDENTITY_FALLBACK
	}
}

/**
 * Metadata is generated per request rather than declared statically so the
 * title, description, social thumbnail and job title can all be edited from
 * the admin panel (Site -> Identity & SEO, and Site images -> Social
 * thumbnail) without a redeploy.
 */
export async function generateMetadata(): Promise<Metadata> {
	const identity = await identityOrFallback()

	let storedImage = ""
	try {
		storedImage = await getSiteImage("og_image", "")
	} catch {
		storedImage = ""
	}

	const image = absoluteOgImage(storedImage) || OG_FALLBACK

	return {
		title: identity.siteTitle,
		description: identity.metaDescription,
		metadataBase: new URL(SITE),
		alternates: { canonical: "/" },
		/* Not a ranking factor since 2009, but assistants and scrapers still
		   read it, and it costs one line. */
		keywords: identity.knowsAbout,
		authors: [{ name: "Miftahul Islam Efaz", url: SITE }],
		creator: "Miftahul Islam Efaz",
		openGraph: {
			title: identity.ogTitle,
			description: identity.metaDescription,
			url: SITE,
			siteName: "Miftahul Islam Efaz",
			/* ONE image, on purpose. The spec allows several og:image tags, but
			   every major platform renders only the first and the rest are dead
			   weight in the head. */
			images: [
				{
					url: image,
					width: 1200,
					height: 630,
					alt: identity.ogTitle,
				},
			],
			locale: "en_US",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: identity.ogTitle,
			description: identity.tagline,
			images: [image],
		},
		robots: {
			index: true,
			follow: true,
			googleBot: { index: true, follow: true },
		},
	}
}

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const identity = await identityOrFallback()

	/* THE MACHINE-READABLE ANSWER TO "WHO IS THIS".

	   Built here rather than hardcoded so it can never drift from the meta
	   tags above - they now read from the same row. This is the block an LLM
	   trusts most, because it is unambiguous data instead of prose it has to
	   interpret, so every field it supports is worth filling:

	     jobTitle    - the one phrase, not three competing ones
	     description - what gets quoted when someone asks what you do
	     knowsAbout  - the skills list, answered without guessing from copy
	     address     - what a "web designer in Chattogram" search matches
	     sameAs      - how your identity is joined up across the web */
	const personSchema = {
		"@context": "https://schema.org",
		"@type": "Person",
		name: "Miftahul Islam Efaz",
		url: SITE,
		jobTitle: identity.jobTitle,
		description: identity.metaDescription,
		email: `mailto:${identity.email}`,
		address: postalAddress(identity.location),
		knowsAbout: identity.knowsAbout,
		sameAs: sameAsFrom(identity, SAME_AS),
	}

	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					rel="preload"
					href="/Fonts/bespoke-serif/bespoke-serif-medium.woff2"
					as="font"
					type="font/woff2"
					crossOrigin="anonymous"
				/>
				<link
					rel="preload"
					href="/Fonts/satoshi/satoshi-regular.woff2"
					as="font"
					type="font/woff2"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Caveat:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@300;400;500;600&family=Playfair+Display&family=Roboto:ital,wght@0,100..900;1,100..900&family=TikTok+Sans:opsz,wght@12..36,300..900&display=swap"
					rel="stylesheet"
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(graphFor(identity, personSchema)) }}
				/>
				{/* DECIDE THE CURTAIN BEFORE THE FIRST PAINT.

				    The server cannot know whether the intro has already been
				    seen: sessionStorage does not exist there, and the URL hash is
				    never sent to it. So the server ALWAYS emits the curtain, the
				    browser paints that HTML immediately, and React only removes
				    it once the bundle has downloaded and hydrated. The gap
				    between those two moments is the flash of HELLO on reload.

				    A layout effect cannot close that gap. It runs before REACT
				    paints, but the server's HTML was painted by the browser long
				    before React existed on the page. The only thing that runs
				    earlier is a synchronous script in the head, which blocks
				    parsing of the body it precedes - so this must stay inline and
				    must never gain defer, async or type=module, any of which
				    would move it after the paint and make it pointless.

				    It only suppresses the PAINT. React still owns the decision
				    and still unmounts RevealLoader during hydration, reading the
				    same two inputs in HomeShell. The matching CSS rule lives at
				    the foot of styles/reveal-loader.css; HomeShell clears the
				    attribute when the intro is replayed by hand.

				    Wrapped in try/catch because sessionStorage THROWS rather than
				    returning null when storage is blocked, and an exception here
				    would abort the head. Failing means the intro plays, which is
				    the old behaviour. */}
				<script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement,h=location.hash;if(sessionStorage.getItem('intro_seen')==='1'||(h&&h!=='#')){d.setAttribute('data-intro-skip','1')}}catch(e){}" }} />
			</head>
			<body>
				{/* Headless: owns Lenis, the gsap.ticker bridge and the global
				    [data-reveal] scan. It renders nothing, so it sits beside the
				    tree rather than wrapping it.

				    Navigation deliberately lives inside
				    HomeShell instead of here: the original gated them behind the
				    intro's pointer-events lock, and mounting them here too would
				    render each of them twice. */}
				<SmoothScrollProvider />
				<CrawlableAbstract />
				{children}
				{/* NO MODAL SLOT, deliberately.

				    The Vault used to render here through a parallel route
				    (app/@modal + app/@modal/(.)vault). It is now a client-side
				    overlay owned by the Vault teaser, because a route segment
				    cannot be rendered without first being fetched, and the click
				    has to be instant - see the note in
				    components/vault/VaultTeaser.tsx.

				    /vault still exists as a real standalone document for direct
				    loads, shares and crawlers; the overlay keeps the URL in step
				    with the History API.

				    If a slot is ever reintroduced here, app/@modal/default.tsx
				    has to come back with it or every hard navigation 404s on the
				    unmatched slot. */}
			</body>
		</html>
	)
}
