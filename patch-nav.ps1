$ErrorActionPreference = 'Stop'
$log = @()

# Replaces only when the anchor occurs EXACTLY ONCE. A .Replace on a string that
# appears twice would silently patch both sites.
function Swap1([string]$path, [string]$name, [string]$old, [string]$new) {
  $t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
  $n = ([regex]::Matches($t, [regex]::Escape($old))).Count
  if ($n -eq 1) {
    [IO.File]::WriteAllText($path, $t.Replace($old, $new), (New-Object Text.UTF8Encoding($false)))
    $script:log += "OK   $name"
  } else {
    $script:log += "MISS $name (found $n, need 1)"
  }
}

function AppendText([string]$path, [string]$name, [string]$text) {
  $t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
  [IO.File]::WriteAllText($path, ($t.TrimEnd() + "`n" + $text + "`n"), (New-Object Text.UTF8Encoding($false)))
  $script:log += "OK   $name (appended)"
}

$css = 'src\styles\work-case-study.css'
$win = 'src\components\work\case-study\CaseStudyWindow.tsx'
$body = 'src\components\work\case-study\CaseStudyBody.tsx'
$data = 'src\components\work\caseStudyData.ts'
$hook = 'src\hooks\useCaseStudyOverlay.ts'
$cfg = 'src\config\caseStudy.ts'
$dc = 'src\components\work\DitherCarousel.tsx'

# =====================================================================
# A. THE LAG. Three compositing fixes, no visual change.
# =====================================================================

# A1 - skip layout AND paint for off-screen sections
Swap1 $css 'lag-content-visibility' @'
.case-study__credits {
  padding: 0 var(--cs-gutter);
  margin-top: var(--cs-section-gap);
  color: var(--cs-ink, #171614);
}
'@ @'
.case-study__credits {
  padding: 0 var(--cs-gutter);
  margin-top: var(--cs-section-gap);
  color: var(--cs-ink, #171614);

  /* SCROLL COST, NOT APPEARANCE. This document is one paint layer holding
     eight sections, several full-width images, three grids and a frosted bar
     that samples whatever passes under it - so every scroll frame was
     repainting work that was nowhere near the viewport.

     content-visibility: auto lets the browser skip layout and paint for a
     section until it approaches the screen. contain-intrinsic-size is the
     placeholder height used while a section is skipped; without it the
     scrollbar would jump as real heights replace zero. 900px is a deliberate
     over-estimate of a typical section - too small causes visible settling,
     too large only costs a little scrollbar drift.

     The tab highlight still tracks correctly because it is driven by an
     IntersectionObserver on these same elements, and a skipped section keeps
     its box - only its contents are not painted. */
  content-visibility: auto;
  contain-intrinsic-size: auto 900px;
}
'@

# A2 - isolate the cover's paint
Swap1 $css 'lag-cover-contain' @'
  align-items: flex-end;
  overflow: hidden;
  background: var(--cs-plate-bg);
}
'@ @'
  align-items: flex-end;
  overflow: hidden;
  /* Nothing inside the cover can paint outside it - it already clips - so
     promising that lets the compositor treat the hero as its own region
     instead of re-testing it against the document on every frame. */
  contain: paint;
  background: var(--cs-plate-bg);
}
'@

# A3 - the expensive one: stop blurring once the cover is gone
AppendText $css 'lag-blur-gate' @'

/* ---- THE CORNER GLASS STOPS COSTING ANYTHING ONCE IT IS GONE ------
   The two corner shapes are the most expensive thing in this window:
   large clip-pathed layers running blur(20px) plus a saturate pass, and
   backdrop-filter is re-sampled whenever the content behind it moves. A
   blurred layer that has scrolled off-screen is not reliably dropped by
   the compositor, so the cover was still being asked about on frames
   where it was a full viewport away - which is exactly where the lag was
   felt, scrolling the document below the hero.

   data-cover-past is written by the parallax handler that is already
   reading scrollTop, so this costs no new listener and no new layout -
   one dataset write when the flag actually flips. While the cover is on
   screen the glass is untouched and looks exactly as before. */
.case-study__cover[data-cover-past='true'] .case-study__cover-text::before,
.case-study__cover[data-cover-past='true'] .case-study__cover-text::after {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* ---- THE NEXT PROJECT IS A CONTROL NOW, NOT A LABEL ---------------
   It became a <button>, so it needs the usual reset: a button brings its
   own font, colour, padding, border and centred text, none of which
   belong here. The title and hook are <span>s rather than <p>s because a
   button may only contain phrasing content, so they need display: block
   to keep stacking the way the paragraphs did. */
.case-study__next {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.case-study__next-title,
.case-study__next-hook {
  display: block;
}

.case-study__next-title {
  transition: color 220ms ease;
}

.case-study__next:hover .case-study__next-title {
  color: var(--cs-ember, #b56c4b);
}

.case-study__next:focus-visible {
  outline: 2px solid var(--cs-ember, #b56c4b);
  outline-offset: 6px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .case-study__next-title {
    transition: none;
  }
}
'@

# A3b - the one dataset write, inside the handler that already reads scrollTop
Swap1 $win 'lag-past-flag' @'
      const progress = Math.min(1, Math.max(0, top / height));
'@ @'
      const progress = Math.min(1, Math.max(0, top / height));

      /* Tells the stylesheet when the hero is fully behind us, so the two
         blurred corner layers can be switched off for the whole rest of the
         document. Guarded, because assigning a dataset value is a DOM write
         and this runs on every scroll frame - the flag flips twice per
         visit, not sixty times a second. */
      const past = progress >= 1 ? 'true' : 'false';
      if (cover.dataset.coverPast !== past) cover.dataset.coverPast = past;
'@

# =====================================================================
# B. SLUGS + THE ADDRESS BAR
# =====================================================================
AppendText $cfg 'cfg-hash-prefix' @'

/**
 * The case study window is a full takeover rather than a route, so its
 * address is a hash: #work/pencillink.
 *
 * A hash and not a real /work/<slug> path for the same reason the gallery
 * uses #work - a hash reloads harmlessly onto the landing page, while a path
 * would 404 until that route actually exists. The prefix deliberately nests
 * under the gallery's own #work so the two rooms read as one place.
 */
export const CASE_STUDY_HASH_PREFIX = '#work/';
'@

AppendText $data 'data-slug-helpers' @'

/* ---- URL SLUGS -------------------------------------------------------
   Derived from the TITLE rather than the id, because the title is what the
   visitor sees and therefore what they expect in the address bar. For every
   current record the two agree ("GDrive Host" -> gdrive-host), so this is
   not a change of URL today - it is insurance for the day an id drifts from
   its title, or a title arrives from the admin panel with capitals, an
   ampersand or an accent in it.

   getCaseStudyBySlug also accepts a bare id, so any link that was ever
   built from an id keeps working. */
export function caseStudySlug(study: WorkCaseStudy): string {
  return study.title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCaseStudyBySlug(slug: string): WorkCaseStudy | undefined {
  const want = slug.toLowerCase();
  return Object.values(WORK_CASE_STUDIES).find(
    (study) => caseStudySlug(study) === want || study.id === want
  );
}
'@

# ---- the hook: imports ----
Swap1 $hook 'hook-imports' @'
import { WINDOW_MOTION } from '@/config/caseStudy';
'@ @'
import { CASE_STUDY_HASH_PREFIX, WINDOW_MOTION } from '@/config/caseStudy';
import {
  caseStudySlug,
  getCaseStudy,
  getCaseStudyBySlug,
} from '@/components/work/caseStudyData';
'@

# ---- the hook: a ref so history-driven opens do not push history again ----
Swap1 $hook 'hook-history-ref' @'
  const exitTimer = useRef<number | null>(null);
'@ @'
  const exitTimer = useRef<number | null>(null);
  /* True when the CURRENT openId arrived from the URL - a Back/Forward step
     or a deep link on arrival. The address is already correct in that case,
     and pushing it again would add a duplicate entry, which is what turns
     Back into a button that appears to do nothing. */
  const fromHistory = useRef(false);
'@

# ---- the hook: deep link + address bar + Back between projects ----
Swap1 $hook 'hook-url-sync' @'
  /* THE WORDMARK CLOSES THIS TOO.
'@ @'
  /* ARRIVING ON A LINK. If the page loads with #work/<slug>, open that study
     immediately. origin stays null, so the cover flies from the middle of the
     viewport instead of from a cursor that was never there. */
  useEffect(() => {
    const { hash } = window.location;
    if (!hash.startsWith(CASE_STUDY_HASH_PREFIX)) return;
    const study = getCaseStudyBySlug(
      decodeURIComponent(hash.slice(CASE_STUDY_HASH_PREFIX.length))
    );
    if (!study) return;
    fromHistory.current = true;
    setOrigin(null);
    setOpenId(study.id);
  }, []);

  /* THE ADDRESS BAR FOLLOWS THE WINDOW.

     pushState rather than replaceState, and one entry per project: opening a
     study, then walking through three "next project" cards, leaves four
     entries, so Back retraces the reading order and eventually lands back on
     the page with no study open. That is why the popstate handler below can
     both switch projects and close.

     Skipped while `closing` is true - the id survives the exit animation, and
     rewriting the URL mid-wipe would fight the rewind in the cleanup. */
  useEffect(() => {
    if (!openId || closing) return;

    const study = getCaseStudy(openId);
    if (!study) return;

    const { pathname, search } = window.location;
    const target = CASE_STUDY_HASH_PREFIX + caseStudySlug(study);

    if (fromHistory.current) {
      fromHistory.current = false;
    } else if (window.location.hash !== target) {
      window.history.pushState(null, '', target);
    }

    const onPop = () => {
      const { hash } = window.location;
      if (!hash.startsWith(CASE_STUDY_HASH_PREFIX)) {
        close();
        return;
      }
      const wanted = getCaseStudyBySlug(
        decodeURIComponent(hash.slice(CASE_STUDY_HASH_PREFIX.length))
      );
      if (!wanted) {
        close();
        return;
      }
      if (wanted.id !== openId) {
        fromHistory.current = true;
        setOrigin(null);
        setOpenId(wanted.id);
      }
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      /* Only rewind if the hash is STILL ours. A close that came from the
         Back button has already moved the URL, and rewriting it would eat a
         second history entry - the same trap the gallery documents. */
      if (window.location.hash.startsWith(CASE_STUDY_HASH_PREFIX)) {
        window.history.replaceState(null, '', pathname + search);
      }
    };
  }, [openId, closing, close]);

  /* THE WORDMARK CLOSES THIS TOO.
'@

# =====================================================================
# C. NEXT PROJECT: thread the opener down and make the card a button
# =====================================================================
Swap1 $dc 'dither-open-prop' @'
          onClose={overlay.close}
        />
      ) : null}
'@ @'
          onClose={overlay.close}
          onOpenStudy={overlay.open}
        />
      ) : null}
'@

Swap1 $win 'win-props' @'
  closing,
  onClose,
}: {
  study: WorkCaseStudy;
  /** Viewport point the cover flies from - the cursor at click time. */
  origin: OpenOrigin | null;
  closing: boolean;
  onClose: () => void;
}) {
'@ @'
  closing,
  onClose,
  onOpenStudy,
}: {
  study: WorkCaseStudy;
  /** Viewport point the cover flies from - the cursor at click time. */
  origin: OpenOrigin | null;
  closing: boolean;
  onClose: () => void;
  /** Swap this window to another project without closing it - the "next
   *  project" card at the foot of the document. Same opener the carousel
   *  tiles use, so the URL, the history entry and the plate flight all
   *  behave identically to opening from the grid. */
  onOpenStudy?: (id: string, origin: OpenOrigin) => void;
}) {
'@

Swap1 $win 'win-body-prop' @'
          <CaseStudyBody study={study} />
'@ @'
          <CaseStudyBody study={study} onOpenStudy={onOpenStudy} />
'@

# A new project must start at the top, on the first tab.
Swap1 $win 'win-reset-on-swap' @'
  /* ---- COVER PARALLAX: the photograph lags, the floor deepens. ---- */
'@ @'
  /* ---- A NEW PROJECT STARTS AT THE TOP ----
     The window does not unmount when the "next project" card swaps the study
     underneath it, so without this the reader would arrive at the new project
     already scrolled to wherever they were in the old one. Immediate rather
     than smooth: this is a different document, not a jump within one, and the
     entry animation is already playing over it. */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    lenisRef.current?.scrollTo(0, { immediate: true });
    scroller.scrollTop = 0;
    setActive('cover');
  }, [study.id]);

  /* ---- COVER PARALLAX: the photograph lags, the floor deepens. ---- */
'@

Swap1 $body 'body-props-type' @'
  study: WorkCaseStudy;
'@ @'
  study: WorkCaseStudy;
  /** Provided by the window; absent in isolation (tests, storybook), which
   *  is why the next-project card falls back to being inert rather than
   *  throwing. */
  onOpenStudy?: (id: string, origin: { x: number; y: number }) => void;
'@

Swap1 $body 'body-signature' @'
export default function CaseStudyBody({ study }: CaseStudyBodyProps) {
'@ @'
export default function CaseStudyBody({
  study,
  onOpenStudy,
}: CaseStudyBodyProps) {
'@

Swap1 $body 'body-next-button' @'
            <div className="case-study__next">
              <span className="case-study__chips-label">Next project</span>
              <p className="case-study__next-title">{next.title}</p>
              <p className="case-study__next-hook">{next.hook}</p>
            </div>
'@ @'
            /* A BUTTON, NOT A LINK. There is no page to navigate to - the
               window stays mounted and swaps the study underneath itself,
               which is what keeps the reader inside the takeover. The URL and
               the history entry are handled by useCaseStudyOverlay, so this
               only has to say which project and where the click happened;
               the origin is what makes the new cover fly from the card the
               reader just pressed. */
            <button
              type="button"
              className="case-study__next"
              onClick={(event) =>
                onOpenStudy?.(next.id, { x: event.clientX, y: event.clientY })
              }
              aria-label={`Read the next project: ${next.title}`}
            >
              <span className="case-study__chips-label">Next project</span>
              <span className="case-study__next-title">{next.title}</span>
              <span className="case-study__next-hook">{next.hook}</span>
            </button>
'@

# =====================================================================
# VERIFY
# =====================================================================
$vc = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$vw = [IO.File]::ReadAllText($win, [Text.Encoding]::UTF8)
$vb = [IO.File]::ReadAllText($body, [Text.Encoding]::UTF8)
$vh = [IO.File]::ReadAllText($hook, [Text.Encoding]::UTF8)
$log += '--- verify ---'
$log += 'content-visibility (1):      ' + ([regex]::Matches($vc,'content-visibility: auto')).Count
$log += 'contain: paint (1):          ' + ([regex]::Matches($vc,'contain: paint')).Count
$log += 'blur gate selector (1):      ' + ([regex]::Matches($vc,"data-cover-past='true'\] \.case-study__cover-text::before")).Count
$log += 'dataset write (1):           ' + ([regex]::Matches($vw,'cover\.dataset\.coverPast = past')).Count
$log += 'next-button reset (1):       ' + ([regex]::Matches($vc,'\.case-study__next \{\n  appearance: none')).Count
$log += 'onOpenStudy in window (3):   ' + ([regex]::Matches($vw,'onOpenStudy')).Count
$log += 'onOpenStudy in body (3):     ' + ([regex]::Matches($vb,'onOpenStudy')).Count
$log += 'next is a button (1):        ' + ([regex]::Matches($vb,'className="case-study__next"\n')).Count
$log += 'no <p> next-title left (0):  ' + ([regex]::Matches($vb,'<p className="case-study__next')).Count
$log += 'pushState in hook (1):       ' + ([regex]::Matches($vh,'history\.pushState')).Count
$log += 'popstate in hook (1):        ' + ([regex]::Matches($vh,"addEventListener\('popstate'")).Count
$log += 'reset-on-swap (1):           ' + ([regex]::Matches($vw,"setActive\('cover'\);\n  \}, \[study\.id\]")).Count
$log += 'css braces: ' + ([regex]::Matches($vc,'\{')).Count + '/' + ([regex]::Matches($vc,'\}')).Count
$log | Out-File -Encoding ascii navlog.txt
