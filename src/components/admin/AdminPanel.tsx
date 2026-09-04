"use client";
import { driveImage } from "@/lib/driveImage";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TABLES, emptyRow, prepareRow, type Field, type TableSpec } from "./fields";
import MediaField from "./MediaField";
import CaseStudyEditor from "./CaseStudyEditor"; import MediaInspector from "./MediaInspector";
import ContactSubmissions from "./ContactSubmissions";

/**
 * ONE panel, nine sections, one form component.
 *
 * Sections are grouped in a rail rather than laid out as peer tabs. Nine flat
 * tabs gave a setting, a gallery and a mailbox the same weight, which is the
 * one thing the navigation should never do.
 *
 * Rows are read through /api/admin/rows rather than the public client, because
 * the public RLS policy hides unpublished rows - correct for visitors, useless
 * for the person editing a draft.
 *
 * State is deliberately simple: rows live in an array, edits live in the open
 * card, and after a successful save the row is patched in place from the
 * server response rather than refetching the table. That keeps the list from
 * flickering and guarantees what you see is what Postgres actually stored.
 */

type Row = Record<string, unknown>;

const EASE = [0.22, 1, 0.36, 1] as const;

/* The inbox is not an editable table, so it has no TableSpec and cannot live
   in TABLES. It gets its own tab id, and everything schema-driven below
   short-circuits on it. */
const SUBMISSIONS_TAB = "contact_submissions" as const;

type TabId = (typeof TABLES)[number]["table"] | typeof SUBMISSIONS_TAB;

/**
 * THE NAV IS GROUPED, and that is the main fix in here.
 *
 * Nine tabs in one flat strip gave every section the same weight, so nothing
 * on screen said that Hero and Submissions are different KINDS of thing - one
 * is a setting, one is a mailbox. Three headings do that work, and they also
 * turn "which tab was that in" into a question with a shape.
 */
const NAV_GROUPS: Array<{ label: string; tables: TabId[] }> = [
  {
    label: "Site",
    tables: [
      "hero_video_settings",
      "work_projects",
      "work_case_studies",
      "site_images",
      "site_identity",
    ],
  },
  { label: "Vault", tables: ["vault_visuals", "vault_categories", "vault_tools"] },
  { label: "Inbox", tables: [SUBMISSIONS_TAB] },
  { label: "Private", tables: ["admin_notes"] },
];

const SUBMISSIONS_BLURB =
  "Everything sent through the contact form. Read-only on purpose: you can file a submission or delete it, but nothing here can rewrite what somebody wrote to you.";

function tabLabel(table: TabId): string {
  if (table === SUBMISSIONS_TAB) return "Submissions";
  return TABLES.find((t) => t.table === table)?.tab ?? table;
}

/** Textarea-backed list fields arrive as arrays and must be shown as lines. */
function toText(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  if (value === null || value === undefined) return "";
  return String(value);
}

// ---------------------------------------------------------------------------
// One row, expanded into a form.
// ---------------------------------------------------------------------------
function RowEditor({
  spec,
  row,
  categories,
  takenIds,
  onSaved,
  onDeleted,
}: {
  spec: TableSpec;
  row: Row;
  categories: { value: string; label: string }[];
  takenIds: string[];
  onSaved: (row: Row, previousId?: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mainFields = spec.fields.filter((f) => !f.advanced);
  const advancedFields = spec.fields.filter((f) => f.advanced);
  const shownFields = showAdvanced ? [...mainFields, ...advancedFields] : mainFields;

  // If the row is replaced from outside (a save elsewhere), resync.
  useEffect(() => setDraft(row), [row]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(row),
    [draft, row]
  );

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: spec.table,
          row: prepareRow(spec, draft, takenIds),
        }),
      });
      const data = (await response.json()) as {
        row?: Row;
        error?: string;
        notice?: string | null;
      };
      if (!response.ok) {
        setMessage({ text: data.error || "Save failed.", bad: true });
      } else if (data.row) {
        /* The id can CHANGE on the first save of a slugFrom row: the draft
           carries a throwaway "new-xxxx" key until the server derives the
           real slug from the title. Handing the old key back is what lets
           the list replace the draft rather than end up holding both. */
        onSaved(data.row, String(row.id ?? ""));
        setMessage({
          text: data.notice ? "Saved. " + data.notice : "Saved.",
          bad: false,
        });
      }
    } catch {
      setMessage({ text: "Network error.", bad: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: spec.table, id: draft.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage({ text: data.error || "Delete failed.", bad: true });
      } else {
        onDeleted(String(draft.id));
      }
    } catch {
      setMessage({ text: "Network error.", bad: true });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="adm-card-body">
      <div className="adm-grid">
        {shownFields.map((field) => {
          const wide =
            field.type === "textarea" || field.type === "list" || field.type === "media";
          const value = draft[field.key];

          return (
            <div
              key={field.key}
              className={
                "adm-field" +
                (wide ? " is-wide" : "") +
                (spec.bigPreview && field.type === "media" ? " adm-media-big" : "")
              }
            >
              {field.type !== "bool" ? (
                <label className="adm-label">{field.label}</label>
              ) : null}

              {field.type === "media" ? (
                <MediaField
                  field={field}
                  value={toText(value)}
                  onChange={(next) => set(field.key, next)}
                />
              ) : field.type === "bool" ? (
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => set(field.key, e.target.checked)}
                  />
                  <span>{field.label}</span>
                </label>
              ) : field.type === "select" ? (
                <select
                  className="adm-select"
                  value={toText(value)}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  {field.optionsFrom === "vault_categories" ? (
                    <>
                      <option value="">Uncategorised</option>
                      {categories.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </>
                  ) : (
                    (field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  )}
                </select>
              ) : field.type === "textarea" || field.type === "list" ? (
                <textarea
                  className="adm-textarea"
                  value={toText(value)}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : (
                <input
                  className="adm-input"
                  type={field.type === "number" ? "number" : "text"}
                  step={field.type === "number" ? "any" : undefined}
                  value={toText(value)}
                  onChange={(e) =>
                    set(
                      field.key,
                      field.type === "number" ? e.target.value : e.target.value
                    )
                  }
                />
              )}

              {field.hint && field.type !== "media" ? (
                <p className="adm-hint">{field.hint}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {advancedFields.length ? (
        <button
          className="adm-btn is-small adm-cs-more"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} detail window copy
        </button>
      ) : null}

      <div className="adm-actions">
        <button
          className="adm-btn is-primary"
          onClick={save}
          disabled={busy || !dirty}
        >
          {busy ? "Saving..." : dirty ? "Save changes" : "Saved"}
        </button>

        {!spec.singleton && !spec.fixedRows ? (
          confirming ? (
            <>
              <button className="adm-btn is-danger" onClick={remove} disabled={busy}>
                Delete for good
              </button>
              <button className="adm-btn" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button className="adm-btn is-danger" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )
        ) : null}

        {message ? (
          <span className={"adm-msg " + (message.bad ? "is-error" : "is-ok")}>
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The panel.
// ---------------------------------------------------------------------------
export default function AdminPanel() {
  const [activeTable, setActiveTable] = useState<TabId>(TABLES[0].table);
  const [notesOpen, setNotesOpen] = useState(false);

  /* Contact submissions are a read-only inbox, not a CMS table: no spec, no
     RowEditor, no reorder arrows. This flag is what keeps the schema-driven
     half of the panel from trying to render a table that has no fields. */
  const inbox = activeTable === SUBMISSIONS_TAB;

  /* THE UNREAD COUNT IS FETCHED EVEN WHEN THE INBOX IS CLOSED.

     An inbox you have to open to discover is not an inbox. This is the one
     number in the panel worth knowing without asking for it, so it rides in
     the nav and refreshes whenever the section changes - which includes the
     moment you navigate away from Submissions having just read something. */
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/submissions?status=new", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        counts?: Record<string, number>;
      };
      setUnread(data.counts?.new ?? 0);
    } catch {
      /* The badge simply does not show. */
    }
  }, []);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread, activeTable]);
  const [rows, setRows] = useState<Row[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  /* Falls back to the first tab while the inbox is open. The fallback is
     never rendered - `inbox` short-circuits every consumer - but keeping spec
     non-null means none of the existing spec.* reads need a guard. */
  const spec = useMemo(
    () =>
      (TABLES.find((t) => t.table === activeTable) ?? TABLES[0]) as TableSpec,
    [activeTable]
  );

  const load = useCallback(async (table: string) => {
    setLoading(true);
    setError("");

    /* The inbox fetches itself from its own route. /api/admin/rows would
       reject this table name, and rightly so - it is not in the whitelist. */
    if (table === SUBMISSIONS_TAB) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/rows?table=" + table, {
        cache: "no-store",
      });
      const data = (await response.json()) as { rows?: Row[]; error?: string };
      if (!response.ok) {
        setError(data.error || "Could not load.");
        setRows([]);
      } else {
        setRows(data.rows ?? []);
      }
    } catch {
      setError("Network error.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(activeTable);
    setOpenId(null);
    /* A filter left over from another tab would silently hide rows that
       have nothing to do with it. */
    setSearch("");
    setCatFilter("");
  }, [activeTable, load]);

  // The category list is needed by the visuals tab, so it is fetched
  // independently of whichever tab happens to be open.
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/rows?table=vault_categories", {
        cache: "no-store",
      });
      const data = (await response.json()) as { rows?: Row[] };
      setCategories(
        (data.rows ?? []).map((r) => ({
          value: String(r.id),
          label: String(r.label ?? r.id),
        }))
      );
    } catch {
      /* The select simply falls back to "Uncategorised". */
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /* ------------------------------------------------------------------
     THE VISUALS FILTER.

     Only the visuals tab gets this: it is the one table that grows without
     limit and the one with a category to narrow by. Everything else here
     is a handful of fixed rows where a search box would be furniture.

     The search reads the category LABEL as well as its id, because the
     panel shows "Typography" while the row stores "typography" - and
     typing what is on screen has to work.
     ------------------------------------------------------------------ */
  /* SEARCH IS ON EVERY TABLE NOW.

     It used to exist on Vault visuals alone, on the reasoning that the other
     tables were "a handful of fixed rows where a search box would be
     furniture". That was wrong about the question being asked: "which row was
     that" is the thing you do most, and it was answerable on one tab in nine.

     The CATEGORY select stays visuals-only, because it is still the only
     table with a category to narrow by. */
  const searchable = !inbox && !spec.singleton;
  const catFilterable = !inbox && spec.table === "vault_visuals";

  const filtering = !inbox && (search.trim() !== "" || catFilter !== "");

  const shown = useMemo(() => {
    if (inbox) return rows;

    const needle = search.trim().toLowerCase();
    if (!needle && !catFilter) return rows;

    return rows.filter((row) => {
      const category = String(row.category ?? "");

      if (catFilter) {
        /* "__none__" is the unfiled bucket, which is a real answer and not
           the same as "no filter applied". */
        if (catFilter === "__none__") {
          if (category !== "") return false;
        } else if (category !== catFilter) {
          return false;
        }
      }

      if (!needle) return true;

      /* Every text-ish value the row actually holds, rather than a fixed list
         of four columns. A note is found by its body, a case study by its
         hook - which is what you remember about them.

         The category LABEL is searched alongside them because the panel shows
         "Typography" while the row stores "typography", and typing what is on
         screen has to work. */
      const label =
        categories.find((c) => c.value === category)?.label ?? category;

      return [...Object.values(row), label].some(
        (value) =>
          (typeof value === "string" || typeof value === "number") &&
          String(value).toLowerCase().includes(needle)
      );
    });
  }, [inbox, rows, search, catFilter, categories]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2200);
  }

  function handleSaved(saved: Row, previousId?: string) {
    setRows((list) => {
      /* Match on the OLD key as well: a first save can rename the row, and
         matching only on the new one would leave the draft card behind and
         append a second card for the same row. */
      const index = list.findIndex(
        (r) => r.id === saved.id || (previousId ? r.id === previousId : false)
      );
      if (index === -1) return [...list, saved];
      const copy = [...list];
      copy[index] = saved;
      return copy;
    });
    if (activeTable === "vault_categories") void loadCategories();

    /* The save may have renumbered OTHER rows to clear a position, and the
       response only describes the row that was saved. Refetching is the
       only way the list can be trusted after that. */
    if (spec.sortable) void load(activeTable);

    flash("Saved. The site is already showing it.");
  }

  function handleDeleted(id: string) {
    setRows((list) => list.filter((r) => r.id !== id));
    setOpenId(null);
    if (activeTable === "vault_categories") void loadCategories();
    flash("Deleted.");
  }

  /* NEW ROWS GO ON TOP.

     Appending was the obvious implementation and the wrong one: on a tab with
     nine rows, "Add" scrolled the form you just asked for off the bottom of the
     screen. The new row is put first AND given the lowest sort_order, so the
     list is not lying about where the site will draw it - a purely visual
     prepend would have been a different bug. Move it down afterwards if it
     belongs further along. */
  function addDraft() {
    const draft = emptyRow(spec);
    if (spec.sortable) {
      /* SUGGEST THE NEXT FREE POSITION, not a negative one.

         This used to hand the new row `lowest - 1`, which put it first by
         going below every existing number. It worked, and it meant a table
         edited for a while drifted into -1, -2, -3... - positions that read
         as broken data and that collide the moment anything is reordered.

         One past the highest is the honest answer to "where does a new
         thing go": the end, in a free slot, with nothing to displace. Type
         over it to place the row anywhere else and the server will clear
         room. */
      const highest = rows.reduce(
        (max, r) => Math.max(max, Number(r.sort_order) || 0),
        0
      );
      draft.sort_order = highest + 1;
    }
    if (!spec.autoId && !spec.slugFrom) draft.id = "";
    setRows((list) => [draft, ...list]);
    setOpenId(String(draft.id ?? ""));
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    const [lifted] = reordered.splice(index, 1);
    reordered.splice(target, 0, lifted);
    setRows(reordered);

    const response = await fetch("/api/admin/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: spec.table,
        ids: reordered.map((r) => String(r.id)),
      }),
    });
    if (!response.ok) {
      // Put it back rather than leaving the UI lying about the real order.
      void load(activeTable);
      flash("Could not reorder.");
    } else {
      void load(activeTable);
    }
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  function summaryOf(row: Row) {
    if (spec.table === "admin_notes") {
      const preview = toText(row.body).replace(/\s+/g, " ").trim();
      return (row.pinned === true ? "PINNED  \u00b7  " : "") +
        (preview.length > 90 ? preview.slice(0, 90) + "\u2026" : preview || "Empty");
    }

    const bits = spec.fields
      .filter((f) => f.summary && f.type !== "media" && f.type !== "bool")
      .map((f) => toText(row[f.key]))
      .filter(Boolean);
    return bits.join("  \u00b7  ");
  }

  function thumbOf(row: Row): string {
    const mediaField = spec.fields.find((f) => f.type === "media" && f.summary);
    return mediaField ? toText(row[mediaField.key]) : "";
  }

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-side-brand">
          <span className="adm-dot" />
          Control room
        </div>

        <nav className="adm-nav">
          {NAV_GROUPS.map((group) => (
            <div className="adm-nav-group" key={group.label}>
              <div className="adm-nav-label">{group.label}</div>
              {group.tables.map((table) => (
                <button
                  key={table}
                  className="adm-nav-item"
                  data-active={table === activeTable}
                  onClick={() => setActiveTable(table)}
                >
                  {table === activeTable ? (
                    <motion.span
                      layoutId="adm-nav-bar"
                      className="adm-nav-bar"
                    />
                  ) : null}
                  {tabLabel(table)}
                  {table === SUBMISSIONS_TAB && unread > 0 ? (
                    <span className="adm-nav-badge">{unread}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button className="adm-btn adm-side-out" onClick={signOut}>
          Sign out
        </button>
      </aside>

      <main className="adm-main">
        {/* ONE HEADER LINE: where you are, how much of it there is, how to
            find one, and the single thing you are most likely to want to do.
            These used to be four stacked blocks. */}
        <header className="adm-head">
          <div className="adm-head-line">
            <h1 className="adm-head-title">
              {inbox ? "Submissions" : spec.tab}
            </h1>

            {!inbox && !spec.singleton ? (
              <span className="adm-head-count">
                {filtering
                  ? shown.length + " of " + rows.length
                  : String(rows.length)}
              </span>
            ) : null}

            <div className="adm-head-tools">
              {searchable ? (
                <input
                  className="adm-input adm-head-search"
                  type="search"
                  placeholder={"Search " + spec.tab.toLowerCase()}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              ) : null}

              {catFilterable ? (
                <select
                  className="adm-select adm-filter-cat"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                  <option value="__none__">Unfiled</option>
                </select>
              ) : null}

              {filtering ? (
                <button
                  className="adm-btn is-small"
                  onClick={() => {
                    setSearch("");
                    setCatFilter("");
                  }}
                >
                  Clear
                </button>
              ) : null}

              {!inbox && !spec.singleton && !spec.fixedRows ? (
                <button className="adm-btn is-primary" onClick={addDraft}>
                  + Add {spec.singular.toLowerCase()}
                </button>
              ) : null}
            </div>
          </div>

          {/* The blurb is reference, not instruction: read once, then in the
              way on every visit after that. Every field keeps its own hint,
              so nothing is lost by folding this away. */}
          <button
            className="adm-note-toggle"
            onClick={() => setNotesOpen((open) => !open)}
          >
            {notesOpen ? "Hide notes" : "About this section"}
          </button>

          <AnimatePresence initial={false}>
            {notesOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <p className="adm-blurb">
                  {inbox ? SUBMISSIONS_BLURB : spec.blurb}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </header>

        {error && !inbox ? (
          <p className="adm-msg is-error">{error}</p>
        ) : null}

        {inbox ? (
          <ContactSubmissions />
        ) : (
          <>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTable}
          className="adm-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          {loading ? (
            <div className="adm-empty">Loading...</div>
          ) : shown.length === 0 ? (
            <div className="adm-empty">
              {filtering ? (
                "Nothing matches that filter."
              ) : (
                <>
                  Nothing here yet.
                  {!spec.fixedRows ? " Use Add above to create the first one." : ""}
                </>
              )}
            </div>
          ) : (
            shown.map((row, index) => {
              const id = String(row.id ?? "");
              const open = openId === id;
              const thumb = thumbOf(row);
              const isVideo = /\.(mp4|webm)(\?|$)/i.test(thumb);

              /* The arrows reorder the REAL table, so they need this row's
                 place in it - which is not its place in a filtered view. */
              const realIndex = rows.findIndex((r) => r.id === row.id);

              return (
                <div className="adm-card" key={id || "new-" + index}>
                  <div
                    className="adm-card-head"
                    onClick={() => setOpenId(open ? null : id)}
                  >
                    {thumb && !isVideo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img referrerPolicy="no-referrer" className="adm-thumb" src={driveImage(thumb)} alt="" />
                    ) : (
                      <div className="adm-thumb" />
                    )}

                    <div>
                      <div className="adm-card-title">
                        {/* A singleton has no title column, so it used to draw
                            its primary key: "hero_section". The spec already
                            has a human name for it. */}
                        {toText(row.title) ||
                          toText(row.label) ||
                          (spec.singleton ? spec.singular : id) ||
                          "Untitled"}
                        {row.published === false ? (
                          <span className="adm-flag">Hidden</span>
                        ) : null}
                      </div>
                      <div className="adm-card-meta">
                        {summaryOf(row) || "\u2014"}
                      </div>
                    </div>

                    <span className="adm-spacer" />

                    {spec.sortable ? (
                      <>
                        <button
                          className="adm-btn is-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            void move(realIndex, -1);
                          }}
                          disabled={filtering || realIndex <= 0}
                          aria-label="Move up"
                        >
                          {"\u2191"}
                        </button>
                        <button
                          className="adm-btn is-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            void move(realIndex, 1);
                          }}
                          disabled={filtering || realIndex === rows.length - 1}
                          aria-label="Move down"
                        >
                          {"\u2193"}
                        </button>
                      </>
                    ) : null}

                    <span
                      className="adm-chev"
                      style={{ transform: open ? "rotate(180deg)" : "none" }}
                    >
                      {"\u25be"}
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.34, ease: EASE }}
                        style={{ overflow: "hidden" }}
                      >
                        {spec.inspector === "media" ? (<MediaInspector spec={spec} row={row} categories={categories} takenIds={rows.map((r) => String(r.id ?? "")).filter((candidate) => candidate !== id)} onSaved={handleSaved} onDeleted={handleDeleted} />) : spec.visual ? (
                          <CaseStudyEditor row={row} onSaved={handleSaved} />
                        ) : (
                          <RowEditor
                            spec={spec}
                            row={row}
                            categories={categories}
                            takenIds={rows
                              .map((r) => String(r.id ?? ""))
                              .filter((candidate) => candidate !== id)}
                            onSaved={handleSaved}
                            onDeleted={handleDeleted}
                          />
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
          </>
        )}
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="adm-toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <span className="adm-dot" />
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}