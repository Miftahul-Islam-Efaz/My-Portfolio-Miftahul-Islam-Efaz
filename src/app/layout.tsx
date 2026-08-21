import type { Metadata } from "next"
import "./globals.css"

import SmoothScrollProvider from "@/components/SmoothScrollProvider"

export const metadata: Metadata = {
	title: "Miftahul Islam Efaz — Entrepreneur, Vibe-Coder, AI Orchestrator",
	description:
		"I explore how to shape AI-era workflows with craft and taste, building the next generation of digital products.",
	metadataBase: new URL("https://www.miftahulislamefaz.xyz"),
	openGraph: {
		title: "Miftahul Islam Efaz — Turning ideas into systems. Systems into legacy.",
		description:
			"I explore how to shape AI-era workflows with craft and taste, building the next generation of digital products.",
		url: "https://www.miftahulislamefaz.xyz",
		siteName: "Miftahul Islam Efaz",
		images: [
			"https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780795749/editorial_shot_tbzvnc.png",
		],
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Miftahul Islam Efaz",
		description: "Turning ideas into systems. Systems into legacy.",
		images: [
			"https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780795749/editorial_shot_tbzvnc.png",
		],
	},
}

const personSchema = {
	"@context": "https://schema.org",
	"@type": "Person",
	name: "Miftahul Islam Efaz",
	url: "https://www.miftahulislamefaz.xyz",
	jobTitle: "Entrepreneur, Vibe-Coder, AI Orchestrator",
	sameAs: [
		"https://github.com/Miftahul-Islam-Efaz",
		"https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/",
		"https://x.com/Miftahul_Islam9",
		"https://www.instagram.com/miftahul_islam_efaz/",
		"https://www.facebook.com/miftahul.islam.efaz",
	],
}

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
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
					dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
				/>
			</head>
			<body>
				{/* Headless: owns Lenis, the gsap.ticker bridge and the global
				    [data-reveal] scan. It renders nothing, so it sits beside the
				    tree rather than wrapping it.

				    Navigation and PixelDissolveTransition deliberately live inside
				    HomeShell instead of here: the original gated them behind the
				    intro's pointer-events lock, and mounting them here too would
				    render each of them twice. */}
				<SmoothScrollProvider />
				{children}
			</body>
		</html>
	)
}
