"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CaseStudyBody from "@/components/work/case-study/CaseStudyBody";
import MediaField from "./MediaField";
import type { Field } from "./fields";
import { youtubeIdFrom } from "@/lib/admin/columns";
import type {
  CaseStudyFeedback,
  CaseStudyPrinciple,
  CaseStudyScreen,
  WorkCaseStudy,
} from "@/components/work/types";

import "@/styles/work-case-study.css";
import "@/styles/case-study-editor.css";

/**
 * THE CASE STUDY INSPECTOR.
 *
 * Centre: the real case study window, rendered by the same CaseStudyBody the
 * site uses, scaled to fit. Right: every field that feeds it. Hovering a region
 * of the document outlines it and names it; clicking it opens the inputs that
 * produce it. The document is the navigation.
 *
 * WHY THE PREVIEW IS NO LONGER TYPE-IN-PLACE. The previous version made the
 * text contentEditable. That cannot coexist with click-to-select: a single
 * click would have to both place a caret and select a component, and one of the
 * two always loses. Inert-but-selectable is also simply less fragile - there is
 * no caret to fight, no blur-to-commit race, and no chance of a paste dropping
 * markup into a column typed as text.
 *
 * WHY CaseStudyBody AND NOT CaseStudyWindow. The window is a fixed overlay that
 * sets `html.case-study-open { overflow: hidden }` and drives its own GSAP
 * scroll pinning; mounting it here would take the panel's scroll with it.
 * CaseStudyBody is pure presentation over one `study` prop - exactly the seam
 * this needs.
 *
 * HOW SELECTION IS WIRED. There is no per-element React state in the preview,
 * because the preview is not ours to annotate - it is the site's markup. After
 * each render an effect walks the rendered DOM, matches it against TARGETS, and
 * tags each hit with the group it belongs to. This keeps one contract in one
 * place: if CaseStudyBody renames a class, TARGETS is the only thing to update,
 * and a stale selector degrades to "not selectable" rather than to a crash.
 *
 * SCALING WITHOUT OVERLAY MATH. The stage is transform-scaled to fit. Selection
 * is drawn with outlines on the elements themselves rather than an absolutely
 * positioned overlay, so there are no rectangles to recompute on resize, on
 * scroll, or when the document reflows because you added a screen. The one
 * thing that must not scale is the hover label, which is counter-scaled with
 * the --adm-zoom variable the stage publishes.
 */

type Row = Record<string, unknown>;

/** Columns the save route expects as newline-delimited text. */
const LIST_KEYS = [
  "narrative",
  "highlights",
  "metrics",
  "stack",
  "palette",
  "palette_names",
  "tags",
  "scope",
  "problem",
  "build_notes",
  "pages_delivered",
  "outcome",
  "collaborators",
];

/** The width the case study is designed against. The stage is scaled from this
 *  rather than reflowed, so the preview shows desktop proportions even in a
 *  narrow panel - a document that silently switched to its mobile layout would
 *  be a misleading thing to edit against. */
const BASE_WIDTH = 1180;

type GroupId =
  | "cover"
  | "facts"
  | "problem"
  | "direction"
  | "screens"
  | "build"
  | "delivery"
  | "credits"
  | "more";

type Selection = { group: GroupId; index?: number };

const GROUPS: Array<{ id: GroupId; index: string; label: string }> = [
  { id: "cover", index: "01", label: "Cover" },
  { id: "facts", index: "02", label: "Project facts" },
  { id: "problem", index: "03", label: "The problem" },
  { id: "direction", index: "04", label: "The direction" },
  { id: "screens", index: "05", label: "Selected experience" },
  { id: "build", index: "06", label: "Build notes" },
  { id: "delivery", index: "07", label: "Delivery & outcome" },
  { id: "credits", index: "08", label: "Credits & next" },
  { id: "more", index: "--", label: "Summary & fallback content" },
];

/**
 * The map from rendered markup to inspector group.
 *
 * `indexed` marks a repeating region, where the position of the node in the
 * match list is also the position of the item in its column - that is what lets
 * clicking the third screen open the third screen and not merely the section.
 *
 * Nested matches resolve innermost-first, because each listener stops
 * propagation. So `.case-study__claim` inside `.case-study__cover` wins, which
 * is the intuitive result.
 */
const TARGETS: Array<{
  selector: string;
  group: GroupId;
  label: string;
  indexed?: boolean;
}> = [
  { selector: ".case-study__cover-headline", group: "cover", label: "Title" },
  { selector: ".case-study__claim", group: "cover", label: "Hook" },
  { selector: ".case-study__cover-note", group: "cover", label: "Cover note" },
  { selector: ".case-study__cover-media", group: "cover", label: "Cover image" },
  { selector: ".case-study__fact-row", group: "facts", label: "Project facts" },
  { selector: ".case-study__principle", group: "direction", label: "Principle", indexed: true },
  { selector: ".case-study__screen", group: "screens", label: "Screen", indexed: true },
  { selector: ".case-study__notes", group: "build", label: "Build notes" },
  { selector: ".case-study__chips", group: "build", label: "Stack & typefaces" },
  { selector: ".case-study__palette", group: "build", label: "Palette" },
  { selector: ".case-study__delivered", group: "delivery", label: "Delivered" },
  { selector: ".case-study__metrics", group: "delivery", label: "Metrics" },
  { selector: ".case-study__quote", group: "delivery", label: "Feedback" },
  { selector: ".case-study__credits", group: "credits", label: "Credits" },
  { selector: ".case-study__next", group: "credits", label: "Next project" },
];

/** Fields with no region of their own to click. Most ARE printed - they just
 *  have no single node that means "this field" (the palette is a row of chips,
 *  the title is animated per-character spans). */
const MORE_FIELDS: Field[] = [
  { key: "category", label: "Category", type: "text", hint: "The Industry fact falls back to this." },
  { key: "tags", label: "Tags", type: "list", hint: "One per line. The Scope fact falls back to these." },
  { key: "highlights", label: "Highlights", type: "list", hint: "4 to 5 fragments, sentence case, no full stops. Also the stand-in for Build notes." },
  { key: "narrative", label: "Narrative (exactly 3)", type: "list", hint: "What was wrong / what you did / what it is now. Lines 1 and 3 are the fallbacks for the problem and outcome sections, so this is required even when both are filled in." },
];

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  const text = str(value);
  return text ? text.split("\n").map((l) => l.trim()).filter(Boolean) : [];
}

/** Empty string means "fall back", which only works if the key is ABSENT. */
function opt(value: unknown): string | undefined {
  const text = str(value).trim();
  return text ? text : undefined;
}

/** Undefined rather than [] for the same reason: an empty array is present,
 *  and would defeat CaseStudyBody's fallback instead of triggering it. */
function optList(value: unknown): string[] | undefined {
  const items = list(value);
  return items.length ? items : undefined;
}

/** Read a jsonb array column, tolerating a JSON string from the wire. */
function objects<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function moveItem<T>(items: T[], from: number, delta: number): T[] {
  const to = from + delta;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function CaseStudyEditor({
  row,
  onSaved,
}: {
  row: Row;
  onSaved: (row: Row) => void;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [selection, setSelection] = useState<Selection>({ group: "cover" });
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true); const [collapsed, setCollapsed] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Partial<Record<GroupId, HTMLElement | null>>>({});

  useEffect(() => {
    setDraft(row);
    setMessage(null);
  }, [row]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(row),
    [draft, row]
  );

  const set = useCallback((key: string, value: unknown) => {
    setDraft((d) => (str(d[key]) === str(value) ? d : { ...d, [key]: value }));
  }, []);

  /* Objects cannot be compared with str() - two different screens both
     stringify to "[object Object]". */
  const setRaw = useCallback((key: string, value: unknown) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const screens = useMemo(() => objects<CaseStudyScreen>(draft.screens), [draft.screens]);
  const principles = useMemo(
    () => objects<CaseStudyPrinciple>(draft.principles),
    [draft.principles]
  );

  const feedback = useMemo<CaseStudyFeedback>(() => {
    const raw = draft.feedback;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const f = raw as Partial<CaseStudyFeedback>;
      return { quote: str(f.quote), attribution: str(f.attribution) };
    }
    return { quote: "", attribution: "" };
  }, [draft.feedback]);

  const patchScreen = (index: number, patch: Partial<CaseStudyScreen>) => {
    setRaw("screens", screens.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const patchPrinciple = (index: number, patch: Partial<CaseStudyPrinciple>) => {
    setRaw("principles", principles.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  /* The shape CaseStudyBody wants. Optional fields stay undefined rather than
     empty so the documented fallbacks fire in the preview too - what you see
     here is then genuinely what the site will draw. */
  const study: WorkCaseStudy = useMemo(() => {
    const narrative = list(draft.narrative);
    while (narrative.length < 3) narrative.push("");

    /* The preview needs a real id to play a clip, and the box may still hold a
       full watch URL that has not been through the server yet. */
    const previewScreens = screens
      .filter((s) => str(s.label).trim())
      .map((s) => {
        const id = youtubeIdFrom(s.youtubeId);
        const isVideo = s.mediaType === "video" && Boolean(id);
        return {
          label: str(s.label),
          caption: str(s.caption),
          mediaType: isVideo ? ("video" as const) : ("image" as const),
          src: opt(s.src),
          youtubeId: isVideo ? id : undefined,
          posterUrl: opt(s.posterUrl),
          orientation: s.orientation === "portrait" ? ("portrait" as const) : undefined,
        };
      });

    const previewPrinciples = principles
      .filter((p) => str(p.title).trim())
      .map((p) => ({ title: str(p.title), body: str(p.body) }));

    return {
      id: str(draft.id),
      title: str(draft.title),
      subtitle: str(draft.subtitle),
      category: str(draft.category),
      year: str(draft.year),
      liveUrl: str(draft.live_url),
      repoUrl: opt(draft.repo_url),
      imageUrl: str(draft.image_url),
      hook: str(draft.hook),
      narrative: [narrative[0], narrative[1], narrative[2]],
      highlights: list(draft.highlights),
      metrics: optList(draft.metrics),
      stack: list(draft.stack),
      palette: list(draft.palette),
      paletteNames: optList(draft.palette_names),
      typefaces: str(draft.typefaces),
      tags: list(draft.tags),
      location: opt(draft.location),
      credit: opt(draft.credit),
      license: opt(draft.license),
      note: opt(draft.note),
      industry: opt(draft.industry),
      scope: optList(draft.scope),
      director: opt(draft.director),
      timeline: opt(draft.timeline),
      logoImage: opt(draft.logo_image),
      systemImage: opt(draft.system_image),

      client: opt(draft.client),
      role: opt(draft.role),
      status: opt(draft.status),
      problem: optList(draft.problem),
      principles: previewPrinciples.length ? previewPrinciples : undefined,
      screens: previewScreens.length ? previewScreens : undefined,
      buildNotes: optList(draft.build_notes),
      pagesDelivered: optList(draft.pages_delivered),
      outcome: optList(draft.outcome),
      feedback:
        feedback.quote.trim() && feedback.attribution.trim() ? feedback : undefined,
      collaborators: optList(draft.collaborators),
      nextProjectId: opt(draft.next_project_id),
    };
  }, [draft, screens, principles, feedback]);

  /* ---- Fit the stage to the canvas. ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!fit) return;

    const measure = () => {
      /* 48px of breathing room, and never magnify past 1: a document blown up
         beyond its design size tells you nothing true about its typography. */
      const available = canvas.clientWidth - 48;
      setZoom(Math.max(0.28, Math.min(1, available / BASE_WIDTH)));
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fit]);

  /* ---- Tag the rendered document as selectable. ----

     Re-runs whenever the preview re-renders, since the nodes it annotated are
     gone by then. Listeners are per-node and stop propagation so the innermost
     match wins. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cleanups: Array<() => void> = [];

    const tag = (node: Element, group: GroupId, label: string, index?: number) => {
      if (!(node instanceof HTMLElement)) return;
      node.dataset.admTarget = group;
      node.dataset.admLabel = index === undefined ? label : `${label} ${index + 1}`;
      if (index !== undefined) node.dataset.admIndex = String(index);

      const select = () => setSelection({ group, index });

      const onClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        select();
      };
      /* Keyboard parity: the document is a list of controls now, so it should
         be reachable without a mouse. */
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", `Edit ${node.dataset.admLabel}`);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        select();
      };

      node.addEventListener("click", onClick);
      node.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        node.removeEventListener("click", onClick);
        node.removeEventListener("keydown", onKeyDown);
        delete node.dataset.admTarget;
        delete node.dataset.admLabel;
        delete node.dataset.admIndex;
        node.removeAttribute("tabindex");
        node.removeAttribute("role");
        node.removeAttribute("aria-label");
      });
    };

    for (const target of TARGETS) {
      const nodes = Array.from(stage.querySelectorAll(target.selector));
      nodes.forEach((node, i) => {
        tag(node, target.group, target.label, target.indexed ? i : undefined);
      });
    }

    /* Sections 3 and 7 both use .case-study__copy, in document order, so the
       first block is the problem and the second is the outcome. Matching them
       positionally is the same contract CaseStudyBody itself relies on. */
    const copyBlocks = Array.from(stage.querySelectorAll(".case-study__copy"));
    if (copyBlocks[0]) tag(copyBlocks[0], "problem", "The problem");
    if (copyBlocks[1]) tag(copyBlocks[1], "delivery", "Outcome");

    /* Nothing inside the preview should navigate. The case study prints real
       outbound links, and one stray click on the live-site link would take the
       whole panel with it, unsaved draft included. */
    const swallow = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (anchor) event.preventDefault();
    };
    stage.addEventListener("click", swallow);
    cleanups.push(() => stage.removeEventListener("click", swallow));

    return () => cleanups.forEach((fn) => fn());
  }, [study]);

  /* Selecting a region opens its inputs and puts the caret in the first one, so
     a click in the document leaves you ready to type. */
  useEffect(() => {
    const group = groupRefs.current[selection.group];
    if (!group) return;
    group.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const first = group.querySelector<HTMLElement>(
      "input:not([type=file]), textarea, select"
    );
    /* preventScroll, or focusing an input at the bottom of a long group would
       immediately undo the scrollIntoView above. */
    first?.focus({ preventScroll: true }); setCollapsed(false);
  }, [selection]);

  async function save() {
    setBusy(true);
    setMessage(null);
    /* The save route splits list columns on newlines, so arrays are flattened
       back to that contract rather than teaching the route a second shape. The
       jsonb columns are the exception: they travel as real objects and are
       normalised server-side, next to the constraints that police them. */
    const payload: Row = { ...draft };
    for (const key of LIST_KEYS) {
      if (Array.isArray(payload[key])) payload[key] = (payload[key] as unknown[]).join("\n");
    }
    try {
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "work_case_studies", row: payload }),
      });
      const data = (await response.json()) as { row?: Row; error?: string };
      if (!response.ok) {
        setMessage({ text: data.error || "Save failed.", bad: true });
      } else if (data.row) {
        onSaved(data.row);
        setMessage({ text: "Saved.", bad: false });
      }
    } catch {
      setMessage({ text: "Network error.", bad: true });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Small building blocks for the panel. ---- */

  const textField = (key: string, label: string, hint?: string) => (
    <div className="adm-field" key={key}>
      <label className="adm-label" htmlFor={`cs-${key}`}>{label}</label>
      <input
        id={`cs-${key}`}
        className="adm-input"
        value={str(draft[key])}
        onChange={(e) => set(key, e.target.value)}
      />
      {hint ? <p className="adm-hint">{hint}</p> : null}
    </div>
  );

  const listField = (key: string, label: string, hint?: string) => (
    <div className="adm-field is-wide" key={key}>
      <label className="adm-label" htmlFor={`cs-${key}`}>{label}</label>
      <textarea
        id={`cs-${key}`}
        className="adm-textarea"
        value={str(draft[key])}
        onChange={(e) => set(key, e.target.value)}
      />
      {hint ? <p className="adm-hint">{hint}</p> : null}
    </div>
  );

  const mediaFieldFor = (key: string, label: string, hint?: string) => (
    <div className="adm-field is-wide" key={key}>
      <label className="adm-label">{label}</label>
      <MediaField
        field={{ key, label, type: "media", folder: "cases", accept: "image/*" }}
        value={str(draft[key])}
        onChange={(next) => set(key, next)}
      />
      {hint ? <p className="adm-hint">{hint}</p> : null}
    </div>
  );

  const repeaterHead = (
    i: number,
    length: number,
    onMove: (delta: number) => void,
    onRemove: () => void,
    selected: boolean
  ) => (
    <div className="adm-cs-item-head">
      <span className="adm-cs-item-num">{String(i + 1).padStart(2, "0")}</span>
      {selected ? <span className="adm-cs-item-flag">Selected</span> : null}
      <span className="adm-spacer" />
      <button className="adm-btn is-small" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up">Up</button>
      <button className="adm-btn is-small" disabled={i === length - 1} onClick={() => onMove(1)} aria-label="Move down">Down</button>
      <button className="adm-btn is-small is-danger" onClick={onRemove} aria-label="Remove">Remove</button>
    </div>
  );

  function groupBody(id: GroupId) {
    switch (id) {
      case "cover":
        return (
          <>
            {textField("title", "Title", "Drawn on the cover as animated characters.")}
            {textField("subtitle", "Subtitle", "Shown under the claim when no cover note is set.")}
            {listField("hook", "Hook", "ONE line, and it states the PROBLEM - not the solution.")}
            {listField("note", "Cover note", "Use this to disclose anything the reader would otherwise assume, e.g. that metrics are illustrative.")}
            {mediaFieldFor("image_url", "Cover image")}
          </>
        );

      case "facts":
        return (
          <>
            <p className="adm-hint">The seven cells of the fact row, in printed order.</p>
            {textField("client", "Client", "Who it was for. Self-initiated work should say so.")}
            {textField("year", "Year")}
            {textField("industry", "Industry", "Empty falls back to Category.")}
            {textField("role", "Role", "What you did: design, build, CMS, API.")}
            {listField("scope", "Scope", "One per line, printed joined by a middle dot. Empty falls back to Tags.")}
            {textField("timeline", "Timeline")}
            {textField("status", "Status", "Live, concept, maintained. A concept must say it is a concept.")}
          </>
        );

      case "problem":
        return listField(
          "problem",
          "The problem",
          "Two or three short lines: what was wrong, and for whom. One per line. Empty falls back to the first narrative paragraph."
        );

      case "direction":
        return (
          <>
            <p className="adm-hint">
              Three is the designed number. The title is the rule; the body is one
              sentence of reasoning. A principle with no title is dropped on save.
            </p>
            {principles.length === 0 ? (
              <p className="adm-hint">None set - the window is standing in the first three highlights.</p>
            ) : null}
            {principles.map((principle, i) => (
              <div
                className="adm-cs-item"
                key={i}
                data-selected={selection.group === "direction" && selection.index === i}
              >
                {repeaterHead(
                  i,
                  principles.length,
                  (delta) => setRaw("principles", moveItem(principles, i, delta)),
                  () => setRaw("principles", principles.filter((_, n) => n !== i)),
                  selection.group === "direction" && selection.index === i
                )}
                <div className="adm-field">
                  <label className="adm-label">Title</label>
                  <input
                    className="adm-input"
                    value={str(principle.title)}
                    onChange={(e) => patchPrinciple(i, { title: e.target.value })}
                  />
                </div>
                <div className="adm-field is-wide">
                  <label className="adm-label">Body</label>
                  <textarea
                    className="adm-textarea"
                    value={str(principle.body)}
                    onChange={(e) => patchPrinciple(i, { body: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <button
              className="adm-btn is-small"
              onClick={() => setRaw("principles", [...principles, { title: "", body: "" }])}
            >
              Add principle
            </button>
          </>
        );

      case "screens":
        return (
          <>
            <p className="adm-hint">
              Add as many images as needed. Every screen needs a label and one
              line on what it SOLVES - a screenshot with no caption is decoration.
              Leave the image empty to borrow the cover, tagged DEMO.
            </p>
            {screens.length === 0 ? (
              <p className="adm-hint">
                None set - the window is standing in the identity plate, the system
                plate and the cover.
              </p>
            ) : null}

            {screens.map((screen, i) => {
              const isVideo = screen.mediaType === "video";
              const resolvedId = youtubeIdFrom(screen.youtubeId);
              const selected = selection.group === "screens" && selection.index === i;
              return (
                <div className="adm-cs-item" key={i} data-selected={selected}>
                  {repeaterHead(
                    i,
                    screens.length,
                    (delta) => setRaw("screens", moveItem(screens, i, delta)),
                    () => setRaw("screens", screens.filter((_, n) => n !== i)),
                    selected
                  )}

                  <div className="adm-field">
                    <label className="adm-label">Label</label>
                    <input
                      className="adm-input"
                      value={str(screen.label)}
                      onChange={(e) => patchScreen(i, { label: e.target.value })}
                      placeholder="Hero, Booking, Reviews"
                    />
                  </div>

                  <div className="adm-field is-wide">
                    <label className="adm-label">Caption</label>
                    <textarea
                      className="adm-textarea"
                      value={str(screen.caption)}
                      onChange={(e) => patchScreen(i, { caption: e.target.value })}
                      placeholder="What this screen solves."
                    />
                  </div>

                  <div className="adm-field">
                    <label className="adm-label">Media</label>
                    <select
                      className="adm-select"
                      value={isVideo ? "video" : "image"}
                      onChange={(e) =>
                        patchScreen(i, {
                          mediaType: e.target.value === "video" ? "video" : "image",
                        })
                      }
                    >
                      <option value="image">Image</option>
                      <option value="video">YouTube video</option>
                    </select>
                    <p className="adm-hint">
                      A clip plays in the site&rsquo;s own player - no YouTube chrome,
                      no suggested videos at the end.
                    </p>
                  </div>

                  {isVideo ? (
                    <>
                      <div className="adm-field is-wide">
                        <label className="adm-label">YouTube link or ID</label>
                        <input
                          className="adm-input"
                          value={str(screen.youtubeId)}
                          onChange={(e) => patchScreen(i, { youtubeId: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <p className="adm-hint">
                          {resolvedId ? (
                            <>
                              Reads as <strong>{resolvedId}</strong>. Watch, share,
                              embed and Shorts links all work - it is reduced to the
                              ID on save.
                            </>
                          ) : (
                            "No video ID found yet. Until there is one, this screen saves as an image."
                          )}
                        </p>
                      </div>
                      <div className="adm-field is-wide">
                        <label className="adm-label">Poster image</label>
                        <MediaField
                          field={{
                            key: `screen_poster_${i}`,
                            label: "Poster",
                            type: "media",
                            folder: "cases",
                            accept: "image/*",
                          }}
                          value={str(screen.posterUrl)}
                          onChange={(next) => patchScreen(i, { posterUrl: next })}
                        />
                        <p className="adm-hint">
                          The still shown before play is pressed. Empty uses
                          YouTube&rsquo;s own thumbnail.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="adm-field is-wide">
                        <label className="adm-label">Screenshot</label>
                        <MediaField
                          field={{
                            key: `screen_src_${i}`,
                            label: "Screenshot",
                            type: "media",
                            folder: "cases",
                            accept: "image/*",
                          }}
                          value={str(screen.src)}
                          onChange={(next) => patchScreen(i, { src: next })}
                        />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Loading placeholder</label>
                        <select
                          className="adm-select"
                          value={screen.orientation === "portrait" ? "portrait" : "landscape"}
                          onChange={(e) =>
                            patchScreen(i, {
                              orientation:
                                e.target.value === "portrait" ? "portrait" : "landscape",
                            })
                          }
                        >
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <button
              className="adm-btn is-small"
              onClick={() =>
                setRaw("screens", [
                  ...screens,
                  { label: "", caption: "", mediaType: "image" as const },
                ])
              }
            >
              Add screen
            </button>
          </>
        );

      case "build":
        return (
          <>
            {listField("build_notes", "Build notes", "Short factual bullets - stack, responsive work, integrations, performance, motion. Empty falls back to Highlights.")}
            {listField("stack", "Stack", "One per line. Printed as chips.")}
            {textField("typefaces", "Typefaces")}
            {listField("palette", "Palette", "Max 3 hex values, in usage order.")}
            {listField("palette_names", "Palette names", "One per swatch, same order. Anything past the third hex is trimmed on save. Empty falls back to Base / Accent / Support.")}
            {mediaFieldFor("logo_image", "Identity plate", "The finished lockup. While empty the window shows the cover image tagged DEMO.")}
            {mediaFieldFor("system_image", "System plate", "The same mark taken apart - grid, tile or macro crop. Match its brightness to the plate beside it or the row reads as a mistake.")}
          </>
        );

      case "delivery":
        return (
          <>
            {listField("pages_delivered", "Delivered", "Pages or surfaces actually shipped. Printed as chips.")}
            {listField("outcome", "Outcome", "Factual result lines. Empty falls back to the third narrative paragraph.")}
            {listField("metrics", "Metrics", "Real numbers only. Illustrative ones need a cover note saying so.")}
            <div className="adm-field is-wide">
              <label className="adm-label">Feedback quote</label>
              <textarea
                className="adm-textarea"
                value={feedback.quote}
                onChange={(e) => setRaw("feedback", { ...feedback, quote: e.target.value })}
              />
            </div>
            <div className="adm-field is-wide">
              <label className="adm-label">Attribution</label>
              <input
                className="adm-input"
                value={feedback.attribution}
                onChange={(e) => setRaw("feedback", { ...feedback, attribution: e.target.value })}
                placeholder="Name, and their relationship to the project"
              />
              <p className="adm-hint">
                BOTH boxes are required - an unattributed quote is not printed, and
                half a quote is discarded on save.
              </p>
            </div>
          </>
        );

      case "credits":
        return (
          <>
            {listField("collaborators", "Collaborators", "One per line, with what they did. Empty falls back to Credit.")}
            {textField("credit", "Credit", "The single-line stand-in when there are no collaborators.")}
            {textField("director", "Built by", "Name displayed in the Built by credit. Leave empty to use Miftahul Islam Efaz.")}
            {textField("role", "Role", "Also updates Role in Project facts.")}
            {textField("location", "Location")}
            {textField("license", "License")}
            {textField("live_url", "Live site link")}
            {textField("repo_url", "Source link", "Leave empty to show Held privately.")}
            {textField("next_project_id", "Next project ID", "Choose which project appears next. Its title and description come from that project. Leave empty for automatic order.")}
          </>
        );

      case "more":
        return (
          <>
            {MORE_FIELDS.map((field) =>
              field.type === "list"
                ? listField(field.key, field.label, field.hint)
                : textField(field.key, field.label, field.hint)
            )}
          </>
        );

      default:
        return null;
    }
  }

  return (
    <div className="adm-ins">
      <div className="adm-ins-bar">
        <span className="adm-ins-title">{str(draft.title) || "Untitled case study"}</span>
        <span className="adm-ins-id">{str(draft.id)}</span>
        <span className="adm-spacer" />
        <span className="adm-ins-zoom">{Math.round(zoom * 100)}%</span>
        <button
          className="adm-btn is-small"
          onClick={() => {
            setFit(false);
            setZoom((z) => Math.max(0.28, Number((z - 0.1).toFixed(2))));
          }}
          aria-label="Zoom out"
        >
          &minus;
        </button>
        <button
          className="adm-btn is-small"
          onClick={() => {
            setFit(false);
            setZoom((z) => Math.min(1, Number((z + 0.1).toFixed(2))));
          }}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          className={"adm-btn is-small" + (fit ? " is-active" : "")}
          onClick={() => setFit(true)}
        >
          Fit
        </button>
        <button className="adm-btn is-primary" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving..." : dirty ? "Save changes" : "Saved"}
        </button>
        {message ? (
          <span className={"adm-msg " + (message.bad ? "is-error" : "is-ok")}>
            {message.text}
          </span>
        ) : null}
      </div>

      <div className="adm-ins-body">
        <div className="adm-ins-canvas" ref={canvasRef} data-lenis-prevent>
          <div
            className="adm-ins-stage"
            ref={stageRef}
            data-selected-group={selection.group}
            data-selected-index={selection.index ?? ""}
            style={{
              width: BASE_WIDTH,
              zoom,
              ["--adm-zoom" as string]: String(zoom),
            }}
          >
            <div className="case-study" data-adm-preview="true">
              <CaseStudyBody study={study} />
            </div>
          </div>
        </div>

        <aside className="adm-ins-panel" data-lenis-prevent>
          <p className="adm-hint adm-ins-tip">
            Click anything in the document to open its fields here. Everything the
            window prints is editable; nothing reaches Postgres until you save.
          </p>

          {GROUPS.map((group) => {
            const selected = selection.group === group.id; const open = selected && !collapsed;
            return (
              <section
                className="adm-ins-group"
                key={group.id}
                data-open={open} data-selected={selected}
                ref={(node) => {
                  groupRefs.current[group.id] = node;
                }}
              >
                <button
                  className="adm-ins-group-head"
                  onClick={() => { if (selected) { setCollapsed((c) => !c); return; } setCollapsed(false); setSelection({ group: group.id }); }}
                  aria-expanded={open}
                >
                  <span className="adm-ins-group-index">{group.index}</span>
                  <span className="adm-ins-group-label">{group.label}</span>
                  <span className="adm-spacer" />
                  <span className="adm-chev" aria-hidden="true" />
                </button>
                {open ? <div className="adm-ins-group-body">{groupBody(group.id)}</div> : null}
              </section>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
