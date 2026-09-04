import {
	getSiteIdentity,
	getWorkProjects,
	SITE_IDENTITY_FALLBACK,
	type SiteIdentity,
} from "@/lib/cms/queries"
import type { WorkProjectCardData } from "@/components/work/types"

/**
 * THE ANSWER TO "WHO IS THIS" IN PLAIN HTML.
 *
 * WHY THIS FILE HAS TO EXIST AT ALL.
 *
 * app/page.tsx renders exactly one thing: <HomeShell />, a client boundary
 * gated behind the intro handshake. Everything a human sees - the hero, the 3D
 * work gallery, the case-study overlays, the vault - is painted by JavaScript
 * into a WebGL canvas and GSAP-driven DOM after hydration.
 *
 * GPTBot, ClaudeBot and PerplexityBot DO NOT EXECUTE JAVASCRIPT. They fetch the
 * HTML once and read what is in it. Before this component existed, what they
 * received from the home page was the intro curtain, some font links and a
 * small Person record - and nothing whatsoever about the work. That is the
 * entire reason an assistant could describe a plain HTML portfolio in detail
 * and could say almost nothing about this one, despite this one being the
 * harder site to build.
 *
 * This is a server component with no client boundary, so its text is in the
 * initial HTML response unconditionally.
 *
 * WHY IT IS VISUALLY HIDDEN, AND WHY THAT IS NOT CLOAKING.
 *
 * Cloaking is serving text to a crawler that CONTRADICTS what the page says to
 * a person, or that a person cannot reach at all. Neither applies:
 *
 *   - It is hidden with the standard screen-reader-only clip, NOT with
 *     `display: none` or `visibility: hidden`. It is fully exposed to assistive
 *     technology, which is a real audience of real people - and this is the
 *     only textual route through a site whose content is otherwise drawn in a
 *     canvas. It is an accessibility win first.
 *   - Every sentence is generated from the SAME CMS rows the visible site
 *     renders from. It is physically incapable of saying something the page
 *     does not, and it cannot go stale, because there is no second copy of the
 *     facts to drift.
 *
 * Never reach for `display: none` here as a shortcut. That removes it from the
 * accessibility tree, at which point the accessibility justification is gone
 * and this genuinely does become crawler-only text.
 */

const SITE = "https://www.miftahulislamefaz.xyz"

async function identityOrFallback(): Promise<SiteIdentity> {
	try {
		return await getSiteIdentity()
	} catch {
		return SITE_IDENTITY_FALLBACK
	}
}

/** The work list is a bonus, not a dependency. If Supabase is unreachable the
 *  section still describes the person; it just cannot list the projects. */
async function projectsOrNone(): Promise<WorkProjectCardData[]> {
	try {
		return await getWorkProjects()
	} catch {
		return []
	}
}

/** "Business Website", falling back to the short badge, then to nothing. The
 *  category is what makes a project findable by intent rather than by name -
 *  "who builds resort websites" is the question being answered here. */
function categoryOf(project: WorkProjectCardData): string {
	return (project.siteType ?? project.badge ?? "").trim()
}

export default async function CrawlableAbstract() {
	const [identity, projects] = await Promise.all([
		identityOrFallback(),
		projectsOrNone(),
	])

	/* rel="me" is the machine-readable claim "this profile is also me". It is
	   what lets an assistant treat the X account and this site as one identity
	   instead of two strangers with the same name. */
	const profiles = [
		{ label: "GitHub", url: identity.github },
		{ label: "LinkedIn", url: identity.linkedin },
		{ label: "X", url: identity.x },
		{ label: "Instagram", url: identity.instagram },
		{ label: "Facebook", url: identity.facebook },
	].filter((p) => p.url)

	return (
		<section className="seo-abstract" aria-label="About Miftahul Islam Efaz">
			<h2>Miftahul Islam Efaz &mdash; {identity.jobTitle}</h2>

			<p>
				Miftahul Islam Efaz is a {identity.jobTitle} based in{" "}
				{identity.location}, working with clients worldwide.{" "}
				{identity.metaDescription}
			</p>

			<p>{identity.tagline}</p>

			<h3>How this site is built</h3>
			<p>{identity.craftSummary}</p>

			<h3>Areas of work</h3>
			<ul>
				{identity.knowsAbout.map((skill) => (
					<li key={skill}>{skill}</li>
				))}
			</ul>

			{projects.length > 0 ? (
				<>
					<h3>Selected work</h3>
					<ul>
						{projects.map((project) => {
							const category = categoryOf(project)
							return (
								<li key={project.id}>
									<strong>{project.title}</strong>
									{category ? ` - ${category}` : ""}
									{project.year ? ` (${project.year})` : ""}
									{project.description ? `. ${project.description}` : ""}
									{project.linkUrl ? (
										<>
											{" "}
											<a href={project.linkUrl} rel="noopener noreferrer">
												View {project.title}
											</a>
										</>
									) : null}
								</li>
							)
						})}
					</ul>
				</>
			) : null}

			<h3>Contact</h3>
			<ul>
				<li>
					Email:{" "}
					<a href={`mailto:${identity.email}`}>{identity.email}</a>
				</li>
				{identity.whatsapp ? (
					<li>WhatsApp: @{identity.whatsapp}</li>
				) : null}
				<li>Location: {identity.location}</li>
				<li>
					Website: <a href={SITE}>{SITE}</a>
				</li>
			</ul>

			{profiles.length > 0 ? (
				<>
					<h3>Profiles</h3>
					<ul>
						{profiles.map((profile) => (
							<li key={profile.label}>
								<a href={profile.url} rel="me noopener noreferrer">
									{profile.label}
								</a>
							</li>
						))}
					</ul>
				</>
			) : null}
		</section>
	)
}
