/**
 * THE DOCUMENT INSIDE THE CASE STUDY WINDOW.
 *
 * This file is the READING ORDER and almost nothing else. Motion lives in
 * CaseStudyWindow (the wipe, the plate flight, the parallax), behaviour lives in
 * CaseStudyCover (the pointer cue), numbers live in config/caseStudy.ts, and
 * prose lives in caseStudyData.ts. What is left here is the sequence of eight
 * sections and the fallbacks that keep every project printing the same shape.
 *
 * THE TEMPLATE IS THE PRODUCT. Every project renders these eight sections in
 * this order:
 *
 *   1. Hero              project name, impact headline, one visual, live link
 *   2. Project facts     one compact row: client, year, industry, role, scope,
 *                        timeline, status
 *   3. The problem       two or three short lines - what was wrong, and to whom
 *   4. The direction     three principles behind the work
 *   5. Selected experience   four to six screens or clips, one caption each
 *   6. Build notes       stack, responsive, integrations, performance, motion,
 *                        and the colour palette grid
 *   7. Delivery          pages shipped, launch status, real feedback, real
 *                        results only
 *   8. Credits + next    role, collaborators, live link, next project, and the
 *                        "Start a project" call to action
 *
 * ADDING A NEW PROJECT IS A DATA EDIT, NOT A COMPONENT EDIT. Every field this
 * file reads beyond the original required set is optional, and every one has a
 * fallback written down next to where it is used. A brand new record with only
 * the old fields filled in still prints all eight sections; each blank simply
 * degrades to something true rather than to an empty heading. Blocks that would
 * be genuinely empty (feedback, collaborators, metrics) are dropped instead of
 * printed hollow.
 *
 * NO INVENTED NUMBERS. Section 7 prints `metrics` only where a record carries
 * them, and any record whose numbers are illustrative rather than measured
 * carries a `note` that is printed underneath. That footnote is load-bearing -
 * see the house rules at the top of caseStudyData.ts.
 */

import type { WorkCaseStudy } from '@/components/work/types';
import { getAllCaseStudies } from '@/components/work/caseStudyData';
import { driveImage } from '@/lib/driveImage';
import {
  CASE_STUDY_SECTIONS,
  CASE_STUDY_DEFAULTS,
  CASE_STUDY_START_CTA,
} from '@/config/caseStudy';
import CaseStudyCover from './CaseStudyCover';
import CaseStudyVideo from './CaseStudyVideo';
import CaseStudyScreenMedia from './CaseStudyScreenMedia';

/* ------------------------------------------------------------------ */
/* THE ARRIVAL LADDER                                                 */
/* ------------------------------------------------------------------ */

/**
 * Blocks rise in sequence after the window's wipe clears. `--i` is the rung,
 * and the stagger itself is in the stylesheet so the whole ladder can be
 * retimed in one place.
 *
 * A module-level counter would leak between renders, so the counter is created
 * per render and threaded through. `rung()` returns the props to spread.
 */
function makeLadder() {
  let i = 0;
  return () =>
    ({
      'data-rise': 'true',
      style: { '--i': i++ } as React.CSSProperties,
    }) as const;
}

/** Section heading with its printed index, e.g. `02 / The problem`. */
function SectionTitle({ index, label }: { index: string; label: string }) {
  return (
    <h2 className="case-study__section-title">
      {index ? <span className="case-study__section-index">{index}</span> : null}
      {label}
    </h2>
  );
}

/** Look up a section's printed index and label by id, so the running order
 *  above is stated once, in config, and never duplicated as literals here. */
function meta(id: string) {
  const found = CASE_STUDY_SECTIONS.find((s) => s.id === id);
  return { index: found?.index ?? '', label: found?.label ?? '' };
}

/* ------------------------------------------------------------------ */

interface CaseStudyBodyProps {
  study: WorkCaseStudy;
  /** Provided by the window; absent when the body is rendered in isolation,
   *  which is why the next-project card falls back to inert rather than
   *  throwing. */
  onOpenStudy?: (id: string, origin: { x: number; y: number }) => void;
}

export default function CaseStudyBody({
  study,
  onOpenStudy,
}: CaseStudyBodyProps) {
  const rise = makeLadder();

  /* ---- 2. FACTS. Every cell has a fallback; the row is never ragged. ---- */
  const facts: Array<{ term: string; value: string }> = [
    { term: 'Client', value: study.client ?? CASE_STUDY_DEFAULTS.client },
    { term: 'Year', value: study.year },
    { term: 'Industry', value: study.industry ?? study.category },
    { term: 'Role', value: study.role ?? CASE_STUDY_DEFAULTS.role },
    {
      term: 'Scope',
      /* `scope` is written for print; `tags` are lowercase slugs and read
       * badly in a fact row, but they are better than a blank cell. */
      value: (study.scope ?? study.tags).join(' \u00b7 '),
    },
    { term: 'Timeline', value: study.timeline ?? CASE_STUDY_DEFAULTS.timeline },
    { term: 'Status', value: study.status ?? CASE_STUDY_DEFAULTS.status },
  ];

  /* ---- 3. PROBLEM. narrative[0] is by definition the what-was-wrong
   *       paragraph, so a record with no explicit `problem` still opens on the
   *       right note - just at paragraph length rather than in short lines. */
  const problemLines = study.problem ?? [study.narrative[0]];

  /* ---- 4. DIRECTION. Three principles. Where none are written, the first
   *       three highlights stand in: they are already the sharpest fragments
   *       in the record, just without the sentence of reasoning under them. */
  const principles =
    study.principles ??
    study.highlights.slice(0, 3).map((title) => ({ title, body: '' }));

  /* ---- 5. SELECTED EXPERIENCE. Screens fall back to whatever real imagery
   *       the record has - the lockup, the system crop, the cover - tagged
   *       DEMO so a placeholder is never mistaken for a shipped screen. */
  const fallbackScreens = [
    { label: 'Identity', caption: 'The lockup as it lands on the live site.', src: study.logoImage },
    { label: 'System', caption: 'The same system taken apart.', src: study.systemImage },
    { label: 'Cover', caption: 'The first screen a visitor meets.', src: study.imageUrl },
  ];

  /**
   * A SCREEN CAN BE A CLIP INSTEAD OF A STILL.
   *
   * Some of what a build does - a transition, a scroll sequence, a cursor
   * behaviour - cannot be shown in a screenshot, and a caption reading "the
   * menu animates" is a worse answer than showing it animating. Where a screen
   * carries a YouTube id it renders the custom player; everything else takes
   * the original image path untouched.
   *
   * The `in` guards are here because `fallbackScreens` above is a narrower
   * shape than CaseStudyScreen - it has no mediaType and never will, since a
   * fallback is by definition a still we already have.
   */
  const screens = (study.screens ?? fallbackScreens).map((screen) => {
    /* Both halves required: a video with no id is not playable, so it falls
       through to the image path and gets the DEMO treatment like any other
       screen with nothing to show yet. */
    const youtubeId =
      'mediaType' in screen && screen.mediaType === 'video'
        ? screen.youtubeId
        : undefined;

    return {
      label: screen.label,
      caption: screen.caption,
      layout: 'layout' in screen ? screen.layout : undefined,
      orientation: 'orientation' in screen ? screen.orientation : undefined,
      youtubeId,
      posterUrl:
        'posterUrl' in screen && screen.posterUrl
          ? driveImage(screen.posterUrl)
          : undefined,
      /* No screenshot yet: borrow the cover and say so. */
      src: driveImage(screen.src ?? study.imageUrl),
      /* A clip is never DEMO - it is the real thing, moving. */
      demo: !youtubeId && !screen.src,
    };
  });

  /* ---- 6. BUILD NOTES. `highlights` are the softer, more editorial version
   *       of the same material, so they are the natural stand-in. */
  const buildNotes = study.buildNotes ?? study.highlights;

  /* Palette swatch names are index-matched to the hexes, then fall back to the
   * generic role names - Base / Accent / Support. */
  const paletteName = (i: number) =>
    study.paletteNames?.[i] ??
    CASE_STUDY_DEFAULTS.paletteNames[i] ??
    `Tone ${i + 1}`;

  /* ---- 7. OUTCOME. narrative[2] is the what-it-now-is paragraph. ---- */
  const outcomeLines = study.outcome ?? [study.narrative[2]];

  /* ---- 8. NEXT. Explicit pointer first; otherwise the following record in
   *       the data file, wrapping at the end so the sequence never dead-ends
   *       on the last project. */
  const all = getAllCaseStudies();
  const ids = Object.keys(all);
  const here = ids.indexOf(study.id);
  const nextId =
    study.nextProjectId ?? (here === -1 ? ids[0] : ids[(here + 1) % ids.length]);
  const next = nextId === study.id ? undefined : all[nextId];

  const credits = study.collaborators ?? (study.credit ? [study.credit] : []);

  return (
    <article className="case-study__doc">
      {/* 1 ------------------------------------------------------------ */}
      <CaseStudyCover study={study} />

      {/* 2 ------------------------------------------------------------ */}
      <section className="case-study__facts" data-section="facts">
        <dl className="case-study__fact-row" {...rise()}>
          {facts.map((fact) => (
            <div className="case-study__fact" key={fact.term}>
              <dt>{fact.term}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3 ------------------------------------------------------------ */}
      <section className="case-study__problem" data-section="problem">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('problem')} />
          </div>
          <div className="case-study__copy" {...rise()}>
            {problemLines.map((line, i) => (
              <p key={i} data-lead={i === 0 ? 'true' : undefined}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 4 ------------------------------------------------------------ */}
      <section className="case-study__direction" data-section="direction">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('direction')} />
          </div>
          <ol className="case-study__principles" {...rise()}>
            {principles.map((principle, i) => (
              <li className="case-study__principle" key={principle.title}>
                <span className="case-study__principle-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="case-study__principle-title">{principle.title}</h3>
                {principle.body ? (
                  <p className="case-study__principle-body">{principle.body}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 ------------------------------------------------------------ */}
      <section className="case-study__experience" data-section="experience">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('experience')} />
            <p className="case-study__grid-note">
              Selected screens, one line each on what the screen solves.
            </p>
          </div>
        </div>
        <div className="case-study__screens" {...rise()}>
          {screens.map((screen, i) => (
            <figure
              className="case-study__screen"
              data-demo={screen.demo ? 'true' : undefined}
              data-layout={screen.layout ?? (study.id === 'sonapahar' ? (i === 0 ? 'centered' : 'full') : 'auto')}
              data-orientation={screen.orientation ?? 'landscape'}
              data-media={screen.youtubeId ? 'video' : 'image'}
              key={`${screen.label}-${i}`}
            >
              {/* The frame measures the file and becomes its exact ratio, so
                  nothing is ever cropped - see CaseStudyScreenMedia. */}
              <CaseStudyScreenMedia
                src={screen.src}
                alt={`${study.title} \u2014 ${screen.label}`}
                orientation={screen.orientation}
                video={
                  screen.youtubeId ? (
                    <CaseStudyVideo
                      youtubeId={screen.youtubeId}
                      label={`${study.title} \u2014 ${screen.label}`}
                      posterUrl={screen.posterUrl}
                    />
                  ) : undefined
                }
              />
              <figcaption className="case-study__screen-caption">
                <span className="case-study__screen-label">{screen.label}</span>
                {screen.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 6 ------------------------------------------------------------ */}
      <section className="case-study__build" data-section="build">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('build')} />
          </div>
          <ul className="case-study__notes" {...rise()}>
            {buildNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="case-study__build-meta" {...rise()}>
          <div className="case-study__chips">
            <span className="case-study__chips-label">Stack</span>
            <div className="case-study__chip-row">
              {study.stack.map((item) => (
                <span className="case-study__chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="case-study__chips">
            <span className="case-study__chips-label">Typefaces</span>
            <p className="case-study__chips-text">{study.typefaces}</p>
          </div>
        </div>

        {/* THE PALETTE, SHOWN RATHER THAN LISTED. Hex codes in a sentence are
            data; a grid of the actual colours is the only version of this a
            visitor can evaluate. The swatch prints its own hex so the value is
            still copyable. */}
        {study.palette.length ? (
          <div className="case-study__palette" {...rise()}>
            <span className="case-study__chips-label">Colour palette</span>
            <ul className="case-study__palette-grid">
              {study.palette.map((hex, i) => (
                <li className="case-study__swatch" key={hex}>
                  <span
                    className="case-study__swatch-chip"
                    style={{ background: hex }}
                    aria-hidden="true"
                  />
                  <span className="case-study__swatch-meta">
                    <span className="case-study__swatch-name">{paletteName(i)}</span>
                    <span className="case-study__swatch-hex">{hex.toUpperCase()}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 7 ------------------------------------------------------------ */}
      <section className="case-study__outcome" data-section="outcome">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('outcome')} />
          </div>
          <div className="case-study__copy" {...rise()}>
            {outcomeLines.map((line, i) => (
              <p key={i} data-lead={i === 0 ? 'true' : undefined}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {study.pagesDelivered?.length ? (
          <div className="case-study__delivered" {...rise()}>
            <span className="case-study__chips-label">Delivered</span>
            <div className="case-study__chip-row">
              {study.pagesDelivered.map((page) => (
                <span className="case-study__chip" key={page}>
                  {page}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {study.metrics?.length ? (
          <dl className="case-study__metrics" {...rise()}>
            {study.metrics.map((metric) => (
              <div className="case-study__metric" key={metric}>
                <dd>{metric}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/* Real quotes only. No feedback, no block. */}
        {study.feedback ? (
          <blockquote className="case-study__quote" {...rise()}>
            <p>{study.feedback.quote}</p>
            <cite>{study.feedback.attribution}</cite>
          </blockquote>
        ) : null}

        {/* The caveat, printed where the numbers are - not buried at the end. */}
        {study.note ? (
          <p className="case-study__footnote" {...rise()}>
            {study.note}
          </p>
        ) : null}
      </section>

      {/* 8 ------------------------------------------------------------ */}
      <section className="case-study__credits" data-section="credits">
        <div className="case-study__grid">
          <div className="case-study__grid-head" {...rise()}>
            <SectionTitle {...meta('credits')} />
          </div>
          <dl className="case-study__credit-list" {...rise()}>
            <div className="case-study__fact">
              <dt>{CASE_STUDY_DEFAULTS.builtByLabel}</dt>
              <dd>{study.director ?? CASE_STUDY_DEFAULTS.builtBy}</dd>
            </div>
            <div className="case-study__fact">
              <dt>Role</dt>
              <dd>{study.role ?? CASE_STUDY_DEFAULTS.role}</dd>
            </div>
            {credits.length ? (
              <div className="case-study__fact">
                <dt>Collaborators</dt>
                <dd>{credits.join(' \u00b7 ')}</dd>
              </div>
            ) : null}
            {study.location ? (
              <div className="case-study__fact">
                <dt>Location</dt>
                <dd>{study.location}</dd>
              </div>
            ) : null}
            {study.license ? (
              <div className="case-study__fact">
                <dt>License</dt>
                <dd>{study.license}</dd>
              </div>
            ) : null}
            <div className="case-study__fact">
              <dt>Live site</dt>
              <dd>
                <a href={study.liveUrl} target="_blank" rel="noreferrer noopener">
                  {study.liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </dd>
            </div>
            <div className="case-study__fact">
              <dt>Source</dt>
              <dd>
                {study.repoUrl ? (
                  <a href={study.repoUrl} target="_blank" rel="noreferrer noopener">
                    Public repository
                  </a>
                ) : (
                  'Held privately'
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="case-study__end" {...rise()}>
          {next ? (
            /* A BUTTON, NOT A LINK. There is no page to navigate to - the
               window stays mounted and swaps the study underneath itself,
               which is what keeps the reader inside the takeover. The URL and
               the history entry are handled by useCaseStudyOverlay, so this
               only has to say which project and where the click landed; the
               origin is what makes the new cover fly from the card that was
               just pressed. */
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
          ) : null}

          <a
            className="case-study__start"
            href={CASE_STUDY_START_CTA.href}
            aria-label={CASE_STUDY_START_CTA.label}
          >
            <span>{CASE_STUDY_START_CTA.label}</span>
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* The original exit, kept: the foot of a case study is exactly where
            someone decides to go and look at the thing. */}
        <footer className="case-study__foot">
          <a
            className="case-study__exit"
            href={study.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Visit the live site
            {/* &#8599; as an HTML entity, NOT \u2197. A JS escape only
                means something inside a string literal - as bare JSX text it
                is eight characters that render verbatim, which is exactly
                what was on screen. */}
            <span className="case-study__exit-arrow" aria-hidden="true">
              &#8599;
            </span>
          </a>
        </footer>
      </section>
    </article>
  );
}
