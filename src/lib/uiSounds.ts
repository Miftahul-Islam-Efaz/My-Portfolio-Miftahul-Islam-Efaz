/* ------------------------------------------------------------------
   UI SOUNDS - shared click/hover effects for buttons and links.

   Two files in /public/Sounds:
     - button-click-sound.mp3        -> clicks (played quieter)
     - menu-options-hover-sound.mp3  -> hovers over menu/button items

   Audio objects are module-level singletons created lazily on the
   first call: constructing them at import time would fetch before a
   user gesture, and autoplay policy would reject play() anyway.
   currentTime resets before each play so fast repeated triggers
   retrigger cleanly. All failures are swallowed - sound is garnish,
   never a reason to throw.
   ------------------------------------------------------------------ */

const SOUND_CLICK = '/Sounds/button-click-sound.mp3';
const SOUND_HOVER = '/Sounds/menu-options-hover-sound.mp3';

/* The click is deliberately quieter than the hover - it fires on a
   committed action, so it should sit under the interface, not on it. */
const CLICK_VOLUME = 0.4;

let clickAudio: HTMLAudioElement | null = null;
let hoverAudio: HTMLAudioElement | null = null;

function play(
	ref: { current: HTMLAudioElement | null },
	assign: (a: HTMLAudioElement) => void,
	src: string,
	volume: number,
) {
	try {
		if (!ref.current) {
			const audio = new Audio(src);
			audio.preload = 'auto';
			assign(audio);
		}
		ref.current.volume = volume;
		ref.current.currentTime = 0;
		void ref.current.play().catch(() => {});
	} catch {
		/* no audio support - stay silent */
	}
}

export function playUiClick() {
	play(
		{ get current() { return clickAudio; } },
		(a) => { clickAudio = a; },
		SOUND_CLICK,
		CLICK_VOLUME,
	);
}

export function playUiHover() {
	play(
		{ get current() { return hoverAudio; } },
		(a) => { hoverAudio = a; },
		SOUND_HOVER,
		1,
	);
}

/* ------------------------------------------------------------------
   DELEGATED HANDLERS

   Spread onto a component's root element to give every button/link
   inside it the sounds, without touching each control individually:

     <div {...uiSoundHandlers}>

   Click uses the capture phase so it still fires when an inner
   handler calls stopPropagation. Hover checks relatedTarget so it
   only sounds when the pointer ENTERS a control from outside it,
   not when moving between its children.
   ------------------------------------------------------------------ */
export const uiSoundHandlers = {
	onClickCapture: (event: React.MouseEvent) => {
		const el = event.target as HTMLElement;
		if (el.closest('[data-no-sound]')) return;
		if (el.closest('button, a')) playUiClick();
	},
} as const;

/* HOVER variant: same delegation, hover instead of click. Spread
   alongside uiSoundHandlers ONLY where hovered controls should sound
   (the contact form). The header menu keeps its own per-item wiring. */
export const uiHoverSoundHandlers = {
	onMouseOverCapture: (event: React.MouseEvent) => {
		const target = event.target as HTMLElement;
		if (target.closest('[data-no-sound]')) return;
		const control = target.closest('button, a');
		if (!control) return;
		const from = event.relatedTarget as HTMLElement | null;
		if (from && control.contains(from)) return;
		playUiHover();
	},
} as const;
