/* Swaps THE REDUCTION out for THE RAKE.

   The paper concept was rejected on tone: a 14%-of-screen fade from
   black into cream produced a grey ramp that read as a broken render,
   and low-alpha grey mono on cream had no contrast. THE RAKE keeps the
   approved copy and rebuilds the visual out of the hero's own language
   - one hard ember light raking a corrugated wall, type engraved into
   it and lit only as the blade passes.

   This script only unmounts the old section. It DELETES NOTHING: the
   reduction files stay on disk until Efaz says otherwise.

   All anchors are \r?\n tolerant - these files are mixed LF/CRLF and
   LF-only anchors have silently missed here before. */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/website/nextjs-site';
let failed = 0;

const patch = (rel, label, find, replace, expected = 1) => {
	const path = `${ROOT}/${rel}`;
	const before = readFileSync(path, 'utf8');
	const matches = before.match(find);
	const count = matches ? (find.global ? matches.length : 1) : 0;

	if (count !== expected) {
		console.log(
			`FAIL  ${rel} :: ${label} (expected ${expected} match(es), found ${count})`
		);
		failed += 1;
		return;
	}

	writeFileSync(path, before.replace(find, replace), 'utf8');
	console.log(`OK    ${rel} :: ${label}`);
};

/* ---------------- HomeShell ---------------- */

patch(
	'src/components/HomeShell.tsx',
	'swap the import',
	/import ReductionSection from '\.\/reduction\/ReductionSection';/,
	"import RakeSection from './rake/RakeSection';"
);

patch(
	'src/components/HomeShell.tsx',
	'section order comment',
	/-> ReductionSection ->/,
	'-> RakeSection ->'
);

patch(
	'src/components/HomeShell.tsx',
	'swap the mounted section',
	/\{\/\* THE REDUCTION\.[\s\S]*?<ReductionSection \/>/,
	`{/* THE RAKE. Scroll does not play an animation here, it moves a
					    light: one hard ember blade sweeps a corrugated wall, and the
					    statement is engraved into that wall - invisible until the
					    light reaches it, holding a cooling ember once it passes. It
					    answers "who is this" straight after the hero, in the hero's
					    own visual language, then points down at the work as proof.
					    Tuned in config/rakeLight.ts. */}
					<RakeSection />`
);

/* ---------------- globals.css ---------------- */

patch(
	'src/app/globals.css',
	'register rake.css in place of reduction.css',
	/(@import\s+(["'])([^"']*))reduction\.css(\2;)/,
	'$1rake.css$4'
);

console.log(failed === 0 ? 'ALL PATCHES OK' : `${failed} PATCH(ES) FAILED`);
process.exit(failed === 0 ? 0 : 1);
