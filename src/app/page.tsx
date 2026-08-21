import HomeShell from "@/components/HomeShell"

/**
 * The page stays a server component. HomeShell is the client boundary that owns
 * the intro handshake (RevealLoader -> introExiting -> introComplete) and the
 * tree it gates: Navigation, the hero, the work section and the dissolve.
 */
export default function Home() {
	return <HomeShell />
}
