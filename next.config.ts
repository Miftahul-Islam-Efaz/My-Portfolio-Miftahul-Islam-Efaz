import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	reactStrictMode: false,
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "images.unsplash.com" },
			// Project shots for the work section live on Drive and are served
			// through lh3.googleusercontent.com/d/<fileId>. The WebGL cards load
			// them as raw textures and bypass next/image entirely, but the case
			// study window's hero plate is a next/image, so the host has to be
			// allowed here or that one image throws at render.
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
		],
	},
}

export default nextConfig
