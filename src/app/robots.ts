import type { MetadataRoute } from "next";

/** Same origin as sitemap.ts and layout.tsx's metadataBase. */
const SITE = "https://www.miftahulislamefaz.xyz";

/**
 * Served at /robots.txt.
 *
 * /admin is disallowed because it is a login wall with nothing to index - but
 * note that robots.txt is a REQUEST, not a lock. It keeps the panel out of
 * search results; it does not protect it. The actual protection is the session
 * cookie in lib/admin/session.ts.
 *
 * /api/ is disallowed because those routes return JSON, and a crawler that
 * indexes them wastes crawl budget on payloads no human will read.
 * /api/drive-image is the one exception: it serves the OG thumbnail, so social
 * crawlers must be able to fetch it.
 *
 * WHY THE AI AGENTS ARE NAMED ONE BY ONE.
 *
 * A single `User-agent: *` rule is technically enough to permit them, but
 * robots.txt matching is LONGEST-PREFIX, not cumulative: the moment any file
 * on this domain grows a specific rule for one of these agents, that agent
 * stops reading the wildcard block entirely. Naming them makes the permission
 * explicit and survives that. It also documents the actual policy decision,
 * which is the point:
 *
 *   GPTBot, ClaudeBot, PerplexityBot, Applebot   - train and index. ALLOWED.
 *   OAI-SearchBot, ChatGPT-User, Claude-User     - fetch a page a user asked
 *                                                  about, live. ALLOWED, and
 *                                                  these are the ones that
 *                                                  answer "what do you know
 *                                                  about this person".
 *   Google-Extended, Applebot-Extended           - not crawlers at all. They
 *                                                  are consent switches for
 *                                                  Gemini and Apple
 *                                                  Intelligence training.
 *                                                  ALLOWED on purpose.
 *
 * The whole point of this site being legible to assistants is that they are
 * allowed to read it. If that ever changes, this is the one file to edit - the
 * structured data and the summary section stay exactly as they are.
 */
export default function robots(): MetadataRoute.Robots {
	const shared = {
		allow: ["/", "/api/drive-image"],
		disallow: ["/admin", "/api/"],
	};

	const aiAgents = [
		"GPTBot",
		"OAI-SearchBot",
		"ChatGPT-User",
		"ClaudeBot",
		"Claude-User",
		"Claude-SearchBot",
		"anthropic-ai",
		"PerplexityBot",
		"Perplexity-User",
		"Google-Extended",
		"Applebot",
		"Applebot-Extended",
		"Bingbot",
		"DuckAssistBot",
		"MistralAI-User",
		"cohere-ai",
		"YouBot",
		"meta-externalagent",
	];

	return {
		rules: [
			{ userAgent: "*", ...shared },
			...aiAgents.map((userAgent) => ({ userAgent, ...shared })),
		],
		sitemap: `${SITE}/sitemap.xml`,
		host: SITE,
	};
}
