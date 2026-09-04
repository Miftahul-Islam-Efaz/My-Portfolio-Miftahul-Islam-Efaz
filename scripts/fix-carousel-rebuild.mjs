/**
 * Fix: the work section was rebuilding its entire WebGL context on every
 * React render.
 *
 * THE BUG. useCaseStudyOverlay returns a fresh controller object each render.
 * DitherCarousel's `openFrom` was memoised against that whole object, so
 * `openFrom` was a new function every render - and the effect that builds the
 * carousel had `[openFrom]` as its dependency list. So the first pointer move
 * (setHovered) or the first centred card (setActive) re-rendered, which changed
 * the dependency, which tore the GL context down and built a new one. Every
 * render. Forever.
 *
 * THE SYMPTOMS THAT FOLLOW FROM IT, both visible in the report:
 *   - Nothing renders. The entry animation is about a second long and the
 *     textures take longer; disposing and rebuilding faster than that means no
 *     frame is ever reached where anything is drawn.
 *   - It does not start at the top. START_SLOT is seeded onto scroll.state
 *     immediately after createCarousel, and every rebuild throws that seed away
 *     and restarts at progress 0. At progress 0 the helix centres slot
 *     count/2 = 4, which maps to Oxygen Sports Zone - exactly the row that was
 *     highlighted instead of PencilLink.
 *
 * THE FIX. Depend on the overlay's `open` callback - which the hook memoises
 * with an empty dependency list and is therefore stable for the life of the
 * component - instead of the controller object that holds it. Plus a useMemo
 * on the controller itself so no other consumer can fall into the same hole.
 *
 *   node scripts/fix-carousel-rebuild.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const report = [];
let failed = 0;

function patch(file, label, find, replace) {
  const path = resolve(root, file);
  const before = readFileSync(path, 'utf8');

  if (before.includes(replace) && !before.includes(find)) {
    report.push(`SKIP  ${file} :: ${label} (already applied)`);
    return;
  }
  if (!before.includes(find)) {
    report.push(`FAIL  ${file} :: ${label} (anchor not found)`);
    failed += 1;
    return;
  }
  writeFileSync(path, before.replace(find, replace), { encoding: 'utf8' });
  report.push(`OK    ${file} :: ${label}`);
}

const CAROUSEL = 'src/components/work/DitherCarousel.tsx';
const HOOK = 'src/hooks/useCaseStudyOverlay.ts';

/* 1. Take a stable reference to the one callback that is actually needed. */
patch(
  CAROUSEL,
  'stable reference to overlay.open',
  '  const overlay = useCaseStudyOverlay({ onOccludedChange });',
  `  const overlay = useCaseStudyOverlay({ onOccludedChange });

  /* THE CONTROLLER OBJECT IS NEW ON EVERY RENDER - only its callbacks are
     stable. Anything downstream that depends on opening the window must depend
     on this, never on \`overlay\`, or it will change identity on every render.
     The effect that builds the GL context is downstream of exactly that, and
     rebuilding a WebGL pipeline sixty times a second renders nothing at all. */
  const requestOpen = overlay.open;`
);

/* 2. Memoise openFrom against that callback rather than the whole object. */
patch(
  CAROUSEL,
  'openFrom depends on requestOpen',
  `      overlay.open(project.id, { x, y });
    },
    [overlay]
  );`,
  `      requestOpen(project.id, { x, y });
    },
    [requestOpen]
  );`
);

/* 3. Say why the dependency list is what it is, so it is not "tidied" back. */
patch(
  CAROUSEL,
  'dependency list warning',
  `    /* openFrom is stable per overlay controller, and the overlay controller's
       callbacks are memoised - so this still builds the GL context exactly
       once, which is the only thing this dependency list has to guarantee. */
  }, [openFrom]);`,
  `    /* NOTHING THAT CHANGES PER RENDER MAY GO IN THIS LIST. This effect builds
       a WebGL context, an IntersectionObserver and a pinned ScrollTrigger; if
       it re-runs, all three are torn down and rebuilt, the START_SLOT seed on
       scroll.state is thrown away, and the entry animation never gets the
       second it needs to finish - a black canvas parked on whichever card sits
       at progress 0. openFrom is memoised against the overlay's \`open\`, which
       the hook memoises with an empty dependency list, so it is stable for the
       life of the component and this runs exactly once. */
  }, [openFrom]);`
);

/* 4. Memoise the controller so the next consumer cannot repeat the mistake. */
patch(
  HOOK,
  'useMemo import',
  "import { useCallback, useEffect, useRef, useState } from 'react';",
  "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';"
);

patch(
  HOOK,
  'memoise the returned controller',
  '  return { openId, closing, origin, open, close };',
  `  /* Memoised because consumers legitimately want to depend on "the overlay"
     in an effect, and a fresh object each render turns that into a rebuild
     loop. \`open\` and \`close\` are already stable, so this only changes when
     the window actually opens, closes or starts its exit. */
  return useMemo(
    () => ({ openId, closing, origin, open, close }),
    [openId, closing, origin, open, close]
  );`
);

console.log(report.join('\n'));
console.log(failed ? `\n${failed} PATCH(ES) FAILED` : '\nALL PATCHES APPLIED');
process.exit(failed ? 1 : 0);
