/**
 * Shape of the hero background-video settings.
 *
 * In the original React app these rows came from Supabase. Supabase has been
 * dropped from this port, so the type lives here and the values come from
 * HERO_CONFIG.defaultVideoSettings. Re-adding a remote source later only means
 * feeding an object of this shape into <Hero />.
 */
export interface DatabaseVideoSettings {
	id: string
	video_url: string
	video_opacity: number
	multiply_overlay_opacity: number
	gradient_overlay_opacity_from: number
	gradient_overlay_opacity_to: number
	muted: boolean
	loop_video: boolean
}
