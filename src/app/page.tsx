import HomeShell from "@/components/HomeShell"
import CaseStudyRegistry from "@/components/work/CaseStudyRegistry"
import { getCaseStudies } from "@/lib/cms/queries"

/**
 * The page stays a server component. HomeShell is the client boundary that owns
 * the intro handshake (RevealLoader -> introExiting -> introComplete) and the
 * tree it gates: Navigation, the hero, the work section and the dissolve.
 *
 * It is also where the case studies enter the client tree. The carousel opens a
 * study over the helix without ever passing through /work, so this route needs
 * the same database read that route does - otherwise the landing page prints
 * the hardcoded fallback while /work prints the live rows, which is worse than
 * either being wrong on its own. <CaseStudyRegistry> loads the rows into the
 * module every client consumer already reads; a failed or empty fetch leaves
 * the fallback untouched.
 */
export const revalidate = 0

export default async function Home() {
	const studies = await getCaseStudies().catch(() => null)

	return (
		<CaseStudyRegistry studies={studies}>
			<HomeShell />
		</CaseStudyRegistry>
	)
}
