/* Wires THE REDUCTION section into the page.

   1. HomeShell.tsx   - import + mount between the hero cut and the work
                        section, and update the section-order comment.
   2. WorkIntroHeader.tsx - REMOVE the placeholder statement + credits.
                        That copy named reunimos and Osmin's Landscaping,
                        which are not Efaz's projects - it came over from
                        the reference site. The reveal hook guards every
                        target with `if (target)`, so removing these two
                        blocks disarms their tweens rather than throwing.
                        `linkStyle`, the `accentColor` prop binding and
                        the WORK_THEME import all become dead with it.
   3. globals.css     - register the stylesheet next to the other work
                        sheets, deriving the import path from the
                        existing work-case-study line so this does not
                        have to guess the prefix.

   Every anchor is \r?\n tolerant: these files are a mix of LF and CRLF
   and LF-only anchors have silently missed here before. */

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

/* ---------------- 1. HomeShell ---------------- */

patch(
	'src/components/HomeShell.tsx',
	'import ReductionSection',
	/import WebsiteProjectsShowcase from '\.\/WebsiteProjectsShowcase';/,
	"import ReductionSection from './reduction/ReductionSection';\nimport WebsiteProjectsShowcase from './WebsiteProjectsShowcase';"
);

patch(
	'src/components/HomeShell.tsx',
	'section order comment',
	/HeroToWorkCut\( Hero \) -> WebsiteProjectsShowcase/,
	'HeroToWorkCut( Hero ) -> ReductionSection -> WebsiteProjectsShowcase'
);

patch(
	'src/components/HomeShell.tsx',
	'mount ReductionSection before the work section',
	/<WebsiteProjectsShowcase \/>/,
	`{/* THE REDUCTION. The only light section on the page: a field of
					    everything this site could have said, struck out one line at a
					    time until one sentence is left. It answers "who is this" in
					    the two seconds after the hero, then points down at the work
					    as proof. Tuned in config/reduction.ts. */}
					<ReductionSection />

					<WebsiteProjectsShowcase />`
);

/* ---------------- 2. WorkIntroHeader: drop the placeholder copy ---------------- */

patch(
	'src/components/work/WorkIntroHeader.tsx',
	'remove placeholder statement + credits',
	/\{\/\* TYPOGRAPHY\.[\s\S]*?\{\/\* PORTRAIT, below the copy\./,
	'{/* PORTRAIT, below the copy.'
);

patch(
	'src/components/work/WorkIntroHeader.tsx',
	'remove dead linkStyle',
	/\r?\n  \/\/ Hover colour for the product names[\s\S]*?\} as React\.CSSProperties;\r?\n/,
	'\n'
);

patch(
	'src/components/work/WorkIntroHeader.tsx',
	'drop the now-unused accentColor binding',
	/export const WorkIntroHeader: React\.FC<WorkIntroHeaderProps> = \(\{\r?\n  accentColor = WORK_THEME\.accent,\r?\n\}\) => \{/,
	'export const WorkIntroHeader: React.FC<WorkIntroHeaderProps> = () => {'
);

patch(
	'src/components/work/WorkIntroHeader.tsx',
	'remove dead WORK_THEME import',
	/import \{ WORK_THEME \} from '\.\/workTheme';\r?\n/,
	''
);

/* ---------------- 3. globals.css ---------------- */

patch(
	'src/app/globals.css',
	'register reduction.css',
	/(@import\s+(["'])([^"']*)work-case-study\.css\2;)/,
	(_full, line, quote, prefix) =>
		`${line}\n@import ${quote}${prefix}reduction.css${quote};`
);

console.log(
	failed === 0 ? 'ALL PATCHES OK' : `${failed} PATCH(ES) FAILED`
);
process.exit(failed === 0 ? 0 : 1);
