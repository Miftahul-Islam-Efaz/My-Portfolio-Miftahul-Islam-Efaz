/* ------------------------------------------------------------------
   PATCH: THE VAULT WINDOW'S OUTRO

   The intro was accepted; the outro was not. It was the case study
   window's outro verbatim, which is a single wipe down on an ease-in
   curve - and next to a four-movement intro that reads as the window
   being snatched away rather than leaving.

   THE BRIEF: "the closing animation should also be smooth and have the
   same motion as the intro animation".

   THREE CHANGES, in order of how much they matter:

   1. THE CURVE. closeEase was cubic-bezier(0.64, 0, 0.78, 0) - the
      EXACT mathematical mirror of the open's quint-out (reflect
      (0.22, 1, 0.36, 1) through the diagonal and that is precisely
      what you get). Symmetric on paper, wrong in the eye: a mirrored
      exit accelerates INTO its end, so the window's last frames are
      its fastest and it appears to be yanked off screen. The intro
      feels good because it is FRONT-LOADED - it commits immediately
      and settles. "The same motion" means the same curve, not the
      reflected one.

   2. THE MISSING MOVEMENT. The intro is four overlapping movements
      (veil, wipe, plate flight, per-letter rise). The outro had the
      veil, the wipe and a flat fade - the PHOTOGRAPH never travelled.
      One element carrying an exit alone is what "less smooth" almost
      always is. vw-plate-leave sends it back into the folder's mouth
      it flew out of, using the origin already on the element.

   3. THE FADE. The text left on `linear`, the only linear curve in the
      window. Now on the same curve as everything else.

   Idempotent: re-running is a no-op. Anchors throw rather than
   silently matching nothing - a patch that quietly does nothing is how
   this feature lost an afternoon already.
   ------------------------------------------------------------------ */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const load = (rel) => {
	const p = path.join(ROOT, rel);
	const raw = fs.readFileSync(p, 'utf8');
	return { rel, p, s: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') };
};

const save = (f) => {
	const out = f.crlf ? f.s.replace(/\n/g, '\r\n') : f.s;
	fs.writeFileSync(f.p, out);
	console.log(`wrote ${f.rel} (${Buffer.byteLength(out)} bytes, ${f.crlf ? 'CRLF' : 'LF'})`);
};

const swap = (f, from, to, label) => {
	const a = from.replace(/\r\n/g, '\n');
	const b = to.replace(/\r\n/g, '\n');
	if (f.s.includes(b)) {
		console.log(`  skip  ${label} (already applied)`);
		return;
	}
	const hits = f.s.split(a).length - 1;
	if (hits === 0) throw new Error(`ANCHOR MISSED in ${f.rel}: ${label}`);
	if (hits > 1) throw new Error(`ANCHOR AMBIGUOUS (${hits}x) in ${f.rel}: ${label}`);
	f.s = f.s.replace(a, b);
	console.log(`  ok    ${label}`);
};

/* ================= config/vaultWindow.ts ================= */

const cfg = load('src/config/vaultWindow.ts');

swap(
	cfg,
	`\t/** The close is faster than the open - always. An exit that takes as
	 *  long as the entrance reads as the interface hesitating. */
	closeDuration: 520,`,
	`\t/** The close is faster than the open - always. An exit that takes as
	 *  long as the entrance reads as the interface hesitating.
	 *
	 *  520 -> 620. The outro now has the same overlapping movements as
	 *  the intro instead of one flat wipe, and at 520ms the
	 *  photograph's retreat had no room to read - it arrived at the
	 *  folder before the eye had followed it. Still clearly under the
	 *  700ms open, which is the rule that matters. */
	closeDuration: 620,`,
	'closeDuration 520 -> 620'
);

swap(
	cfg,
	`\topenEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
	closeEase: 'cubic-bezier(0.64, 0, 0.78, 0)',`,
	`\topenEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
	/** THE SAME CURVE AS THE OPEN, DELIBERATELY.
	 *
	 *  This was cubic-bezier(0.64, 0, 0.78, 0), which is the exact
	 *  mathematical mirror of openEase - reflect a quint-out through the
	 *  diagonal and you get that quint-in. It is the textbook answer and
	 *  it was wrong here.
	 *
	 *  A mirrored exit ACCELERATES INTO ITS END: the window's final
	 *  frames are its fastest, so it does not leave, it gets yanked. The
	 *  intro reads well precisely because it is front-loaded - it
	 *  commits on the first frame and settles - and the brief is that
	 *  the outro have the same motion. So it gets the same curve.
	 *
	 *  Overshoot-free still matters as much as it does on the way in: an
	 *  overshooting mask would lift off the bottom edge and flash the
	 *  page behind for a frame. */
	closeEase: 'cubic-bezier(0.22, 1, 0.36, 1)',`,
	'closeEase -> the open curve'
);

swap(
	cfg,
	`\tplateDuration: 900,`,
	`\tplateDuration: 900,
	/** THE PHOTOGRAPH'S RETREAT - the flight above, run backwards into
	 *  the folder's mouth on the way out.
	 *
	 *  This is the movement the outro was missing. Shorter than the
	 *  arrival (560 against 900) because the eye already knows the path;
	 *  a retreat that takes as long as the arrival feels like the window
	 *  is reluctant to go. Slightly UNDER closeDuration so the plate is
	 *  gone a moment before the mask lands, rather than the two ending
	 *  together and flattening back into one card. */
	plateExitDuration: 560,`,
	'plateExitDuration added'
);

save(cfg);

/* ================= styles/vault-window.css ================= */

const css = load('src/styles/vault-window.css');

swap(
	css,
	`\tto {
		opacity: 1;
		border-radius: 0;
		transform: none;
	}
}`,
	`\tto {
		opacity: 1;
		border-radius: 0;
		transform: none;
	}
}

/* THE RETREAT. vw-plate-land backwards: the photograph shrinks and
   tilts back into the folder's mouth it came out of, while the mask
   wipes down over it.

   THIS IS THE MOVEMENT THE OUTRO WAS MISSING. The close used to be the
   panel and the veil alone - one edge travelling, everything inside it
   static - against an intro of four overlapping movements. That
   asymmetry is what read as "not smooth": nothing was wrong with the
   wipe, there was simply nothing else happening.

   The origin is the same --vw-origin-x/y the arrival used, and it is
   still correct on the way out: it was read once on the first render
   and the page behind is frozen, so the folder has not moved.

   Specificity beats the base .vault-window__plate rule, so this
   replaces the arrival rather than layering on it. */
.vault-window[data-state='closing'] .vault-window__plate {
	animation: vw-plate-leave var(--vw-plate-exit) var(--vw-close-ease) forwards;
}

@keyframes vw-plate-leave {
	from {
		opacity: 1;
		border-radius: 0;
		transform: none;
	}
	to {
		opacity: 0.45;
		border-radius: 20px;
		transform:
			translate(
				calc(var(--vw-origin-x) - 50vw),
				calc(var(--vw-origin-y) - 50vh)
			)
			scale(var(--vw-plate-scale))
			rotate(var(--vw-plate-rotate));
	}
}`,
	'vw-plate-leave added'
);

swap(
	css,
	`\tanimation: vw-fade-out calc(var(--vw-close) * 0.5) linear forwards;`,
	`\t/* On the window's own curve, not linear - this was the one linear
	   easing left in the file, and a linear fade next to eased motion
	   is visible as a flatness even when you cannot name it. 0.42 of
	   the close: the type must be gone before the mask reaches it,
	   otherwise letters are still fading as the edge crosses them. */
	animation: vw-fade-out calc(var(--vw-close) * 0.42) var(--vw-close-ease)
		forwards;`,
	'content fade -> eased'
);

swap(
	css,
	`\t.vault-window[data-state='closing'] .vault-window__glyph-inner,
	.vault-window[data-state='closing'] .vault-window__eyebrow,
	.vault-window[data-state='closing'] .vault-window__close {
		animation: none;
	}`,
	`\t.vault-window[data-state='closing'] .vault-window__plate,
	.vault-window[data-state='closing'] .vault-window__glyph-inner,
	.vault-window[data-state='closing'] .vault-window__eyebrow,
	.vault-window[data-state='closing'] .vault-window__close {
		animation: none;
	}`,
	'reduced motion covers the retreat'
);

save(css);

/* ================= components/vault/VaultWindow.tsx ================= */

const tsx = load('src/components/vault/VaultWindow.tsx');

swap(
	tsx,
	"\t\t'--vw-plate-rotate': `${m.plateFromRotation}deg`,",
	"\t\t'--vw-plate-rotate': `${m.plateFromRotation}deg`,\n\t\t'--vw-plate-exit': `${m.plateExitDuration}ms`,"
	,
	'--vw-plate-exit exposed'
);

save(tsx);

console.log('\npatch-vault-outro: done');
