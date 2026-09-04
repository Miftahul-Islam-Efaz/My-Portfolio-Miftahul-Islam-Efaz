import type { SiteIdentity } from "@/lib/cms/queries"

/**
 * THE STRUCTURED-DATA GRAPH.
 *
 * Split out of app/layout.tsx because it is data assembly, not layout, and
 * because the layout should stay readable.
 *
 * WHY A @graph AND NOT THREE SEPARATE SCRIPT TAGS.
 *
 * A page may carry several JSON-LD blocks, and parsers do read them all - but
 * they arrive as three unrelated things. Inside a single @graph, the nodes are
 * JOINED by @id: the ProfilePage says `about: { "@id": ...#person }`, so the
 * consumer knows the page is ABOUT the person rather than merely containing a
 * person. That relationship is what turns "a page mentioning a name" into "the
 * profile of this individual", which is the difference between an assistant
 * hedging and an assistant answering.
 *
 * Every @id here is a fragment on the canonical origin. They are identifiers,
 * not addresses - nothing has to resolve - but they must be stable, because
 * changing one silently breaks the joins.
 */

const SITE = "https://www.miftahulislamefaz.xyz"

export const PERSON_ID = `${SITE}#person`
export const WEBSITE_ID = `${SITE}#website`
export const WEBPAGE_ID = `${SITE}#webpage`

/**
 * The profile URLs, in descending order of how much weight a consumer gives
 * them for a working developer.
 *
 * `sameAs` is the single most useful field on this graph for the specific goal
 * of an assistant recognising you: it is the claim that all of these accounts
 * are ONE identity. Without it, your GitHub, your LinkedIn and this site are
 * three separate entities that happen to share a name.
 *
 * @param fallback used only if every CMS slot is empty, so clearing one box in
 *        the panel cannot silently erase the identity joins.
 */
export function sameAsFrom(
	identity: SiteIdentity,
	fallback: string[]
): string[] {
	const list = [
		identity.github,
		identity.linkedin,
		identity.x,
		identity.instagram,
		identity.facebook,
	]
		.map((url) => url.trim())
		.filter(Boolean)

	return list.length > 0 ? list : fallback
}

/**
 * Wraps the Person record the layout already builds, and adds the two nodes
 * that describe the SITE rather than the human.
 *
 * @param person the existing personSchema object, passed in rather than rebuilt
 *        so there is still exactly one place the Person fields are written.
 */
export function graphFor(
	identity: SiteIdentity,
	person: Record<string, unknown>
) {
	/* WhatsApp is a ContactPoint identifier, NOT a url. A wa.me link requires a
	   phone number in international format; a username is not one, and emitting
	   wa.me/<username> would produce a link that 404s for everyone who clicks
	   it. Published as an identifier, it is still machine-readable and still
	   quotable by an assistant, and it is honest about what it is. */
	const contactPoint: Record<string, unknown>[] = [
		{
			"@type": "ContactPoint",
			contactType: "Business enquiries",
			email: identity.email,
			url: SITE,
			availableLanguage: ["English", "Bengali"],
		},
	]

	if (identity.whatsapp) {
		contactPoint.push({
			"@type": "ContactPoint",
			contactType: "WhatsApp",
			identifier: `@${identity.whatsapp}`,
		})
	}

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				...person,
				"@id": PERSON_ID,
				contactPoint,
				mainEntityOfPage: { "@id": WEBPAGE_ID },
			},
			{
				"@type": "WebSite",
				"@id": WEBSITE_ID,
				url: SITE,
				name: "Miftahul Islam Efaz",
				description: identity.metaDescription,
				inLanguage: "en",
				/* One person is author, publisher and subject. Saying so
				   explicitly is what stops a consumer inventing an organisation
				   that does not exist. */
				author: { "@id": PERSON_ID },
				publisher: { "@id": PERSON_ID },
				about: { "@id": PERSON_ID },
			},
			{
				/* ProfilePage, not WebPage. It is the schema.org type that means
				   "this document exists to present a person", and it is the type
				   consumers look for when resolving an individual. */
				"@type": "ProfilePage",
				"@id": WEBPAGE_ID,
				url: SITE,
				name: identity.siteTitle,
				isPartOf: { "@id": WEBSITE_ID },
				about: { "@id": PERSON_ID },
				mainEntity: { "@id": PERSON_ID },
				description: identity.metaDescription,
				/* THE ONE FIELD THAT DESCRIBES THE CRAFT.

				   `abstract` is a summary of the work itself, which is the right
				   slot for "this is a WebGL, motion-led, 60fps interactive site".
				   It is written as verifiable technical fact in the CMS, on
				   purpose: an unbacked claim of holding awards is the fastest way
				   to make an assistant discredit everything around it, whereas a
				   precise description of the engineering reads as award-level on
				   its own evidence. */
				abstract: identity.craftSummary,
			},
		],
	}
}
