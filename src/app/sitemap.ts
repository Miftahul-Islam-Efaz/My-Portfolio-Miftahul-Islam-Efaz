import type { MetadataRoute } from "next";

/** Canonical origin. Must match `metadataBase` in app/layout.tsx, including the
 *  www - a sitemap that lists the apex while the site canonicalises to www is
 *  reported by Search Console as "URL not on the sitemap". */
const SITE = "https://www.miftahulislamefaz.xyz";

/**
 * The sitemap Next serves at /sitemap.xml.
 *
 * ONLY real, indexable documents belong here. This site has exactly two:
 * the home page and /vault. Everything else is either an API route, the admin
 * panel (both blocked in robots.ts), or a client-side overlay.
 *
 * The case studies and vault tiles are deliberately absent: they are not route
 * segments, they are overlays drawn over the page that owns them. Listing a URL
 * that returns no standalone document earns a crawl error, not a ranking.
 * If a case study ever becomes a real /work/[slug] page, add it here by
 * reading the slugs from the CMS.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();

	return [
		{
			url: SITE,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 1,
		},
		{
			url: `${SITE}/vault`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
	];
}
