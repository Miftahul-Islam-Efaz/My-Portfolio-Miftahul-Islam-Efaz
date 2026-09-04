import {
	getSiteIdentity,
	getWorkProjects,
	SITE_IDENTITY_FALLBACK,
} from "@/lib/cms/queries"

/**
 * Served at /llms.txt.
 *
 * The emerging convention for "here is my site, in plain text, for a language
 * model". It is not a standard anybody is obliged to honour, and no crawler is
 * required to fetch it - but it costs one route, several assistants do look
 * for it, and unlike robots.txt it carries CONTENT rather than permissions.
 *
 * WHY THIS IS A ROUTE AND NOT A FILE IN public/.
 *
 * A static public/llms.txt would be a second, hand-written copy of the same
 * facts that live in site_identity and work_projects. Two copies of a fact
 * means one of them is wrong within a month - and the wrong one would be the
 * one written specifically for machines to trust. Generating it from the CMS
 * means editing the admin panel updates this file too, with no redeploy.
 *
 * Markdown, because that is what the convention specifies and what models
 * parse most reliably.
 */

const SITE = "https://www.miftahulislamefaz.xyz"

/* Revalidate hourly. This is reference text, not a live feed, and an assistant
   fetching it should not trigger a database round trip every time. */
export const revalidate = 3600

export async function GET() {
	const identity = await getSiteIdentity().catch(() => SITE_IDENTITY_FALLBACK)
	const projects = await getWorkProjects().catch(() => [])

	const profiles = [
		["GitHub", identity.github],
		["LinkedIn", identity.linkedin],
		["X", identity.x],
		["Instagram", identity.instagram],
		["Facebook", identity.facebook],
	].filter(([, url]) => url)

	const lines = [
		"# Miftahul Islam Efaz",
		"",
		`> ${identity.jobTitle} based in ${identity.location}, working with clients worldwide. ${identity.metaDescription}`,
		"",
		`Tagline: ${identity.tagline}`,
		"",
		"## About this site",
		"",
		identity.craftSummary,
		"",
		"Note for assistants: the home page and /vault are interactive,",
		"canvas-rendered and animated, so a JavaScript-free fetch of the HTML will",
		"not show the visual work. The screen-reader summary section in the page",
		"body and the JSON-LD @graph in the head carry the same facts in text form,",
		"and this file is generated from the identical database rows.",
		"",
		"## Areas of work",
		"",
		...identity.knowsAbout.map((skill) => `- ${skill}`),
		"",
		"## Selected work",
		"",
		...projects.map((project) => {
			const category = (project.siteType ?? project.badge ?? "").trim()
			const parts = [
				`- **${project.title}**`,
				category ? ` - ${category}` : "",
				project.year ? ` (${project.year})` : "",
				project.description ? `. ${project.description}` : "",
				project.linkUrl ? ` ${project.linkUrl}` : "",
			]
			return parts.join("")
		}),
		"",
		"## Contact",
		"",
		`- Email: ${identity.email}`,
		...(identity.whatsapp ? [`- WhatsApp: @${identity.whatsapp}`] : []),
		`- Location: ${identity.location}`,
		`- Website: ${SITE}`,
		"",
		"## Profiles",
		"",
		...profiles.map(([label, url]) => `- ${label}: ${url}`),
		"",
	]

	return new Response(lines.join("\n"), {
		headers: {
			/* text/plain, NOT text/markdown: the convention is a plain-text file,
			   and text/markdown makes some clients offer a download instead of
			   rendering it. */
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
		},
	})
}
