"use client";

import { useEffect, useMemo, useState } from "react";
import MediaField from "./MediaField";
import { prepareRow, type Field, type TableSpec } from "./fields";
import { driveImage } from "@/lib/driveImage";

import "@/styles/case-study-editor.css";
import "@/styles/media-inspector.css";

/**
 * THE MEDIA INSPECTOR.
 *
 * One inspector for every table whose row is really a picture with words
 * attached: site images, vault visuals, vault tools. The file fills the centre
 * canvas, the words sit in the right panel, and clicking either side opens the
 * matching group.
 *
 * It is driven by the table spec rather than hand-written per table, because
 * the three differ only in which fields they carry - and a hand-written copy
 * each would mean three places to forget when a column is added.
 *
 * The panel is deliberately quiet: labels and inputs at rest, and a field's
 * hint only while that field has focus. The guidance is all still there, it
 * just does not shout when you are not using it.
 *
 * Same class names as the case study inspector, so the shell, bar and group
 * styling are inherited rather than restated.
 */

type Row = Record<string, unknown>;

type GroupId = "file" | "details" | "more";

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

export default function MediaInspector({
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
  const [group, setGroup] = useState<GroupId>("file");
  const [collapsed, setCollapsed] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(
    null,
  );

  // If the row is replaced from outside (a save elsewhere), resync.
  useEffect(() => setDraft(row), [row]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(row),
    [draft, row],
  );

  /* The first media field is the one on the canvas. Everything else is words,
     split only by the spec's own advanced flag. */
  const mediaField = spec.fields.find((field) => field.type === "media");
  const detailFields = spec.fields.filter(
    (field) => field.type !== "media" && !field.advanced,
  );
  const advancedFields = spec.fields.filter((field) => field.advanced);

  const groups: Array<{ id: GroupId; index: string; label: string }> = [];
  if (mediaField) {
    groups.push({ id: "file", index: "01", label: mediaField.label });
  }
  if (detailFields.length) {
    groups.push({
      id: "details",
      index: groups.length + 1 === 1 ? "01" : "02",
      label: "Details",
    });
  }
  if (advancedFields.length) {
    groups.push({
      id: "more",
      index: String(groups.length + 1).padStart(2, "0"),
      label: "Detail window copy",
    });
  }

  const src = mediaField ? str(draft[mediaField.key]) : "";
  const title = str(draft.label) || str(draft.title);
  const caption =
    str(draft.alt_text) || str(draft.caption) || str(draft.title);
  const isVideo = str(draft.media_type) === "video" || VIDEO_FILE.test(src);

  /* The two footer photographs have to be the same picture at the same size,
     one frosted and one sharp, because the sharp copy is revealed under the
     cursor. The warning belongs where the mistake would be made. */
  const isFooterPhoto =
    spec.table === "site_images" && title.toLowerCase().includes("footer");

  function set(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function openGroup(next: GroupId) {
    if (group === next) {
      setCollapsed((current) => !current);
      return;
    }
    setCollapsed(false);
    setGroup(next);
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
        /* The id can CHANGE on the first save of a slugFrom row, so the old
           key goes back with it - that is what lets the list replace the
           draft rather than end up holding both. */
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

  /* One input, chosen by field type - the same set RowEditor supports, so no
     table loses an editor by moving to this pane. */
  function renderField(field: Field) {
    const id = "ins-" + field.key;
    const value = draft[field.key];
    const wide = field.type === "textarea" || field.type === "list";
    const showHint = field.hint && focused === field.key;

    return (
      <div
        className={"adm-field" + (wide ? " is-wide" : "")}
        key={field.key}
        onFocus={() => setFocused(field.key)}
        onBlur={() => setFocused((current) => (current === field.key ? null : current))}
      >
        {field.type !== "bool" ? (
          <label className="adm-label" htmlFor={id}>
            {field.label}
          </label>
        ) : null}

        {field.type === "media" ? (
          <MediaField
            field={field}
            value={str(value)}
            onChange={(next) => {
              setBroken(false);
              set(field.key, next);
            }}
          />
        ) : field.type === "bool" ? (
          <label className="adm-check">
            <input
              id={id}
              type="checkbox"
              checked={value === true}
              onChange={(event) => set(field.key, event.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        ) : field.type === "select" ? (
          <select
            id={id}
            className="adm-select"
            value={str(value)}
            onChange={(event) => set(field.key, event.target.value)}
          >
            {field.optionsFrom === "vault_categories" ? (
              <>
                <option value="">Uncategorised</option>
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            ) : (
              (field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        ) : wide ? (
          <textarea
            id={id}
            className="adm-textarea"
            value={str(value)}
            onChange={(event) => set(field.key, event.target.value)}
          />
        ) : (
          <input
            id={id}
            className="adm-input"
            type={field.type === "number" ? "number" : "text"}
            step={field.type === "number" ? "any" : undefined}
            value={str(value)}
            onChange={(event) => set(field.key, event.target.value)}
          />
        )}

        {showHint ? <p className="adm-hint">{field.hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="adm-ins">
      <div className="adm-ins-bar">
        <span className="adm-ins-title">{title || spec.singular}</span>
        <span className="adm-ins-id">{str(draft.id)}</span>
        <span className="adm-spacer" />
        {message ? (
          <span className={"adm-msg " + (message.bad ? "is-error" : "is-ok")}>
            {message.text}
          </span>
        ) : null}
        <button
          type="button"
          className="adm-btn is-small is-primary"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? "Saving..." : dirty ? "Save" : "Saved"}
        </button>
      </div>

      <div className="adm-ins-body">
        <div className="adm-ins-canvas" data-lenis-prevent>
          <figure className="adm-mi-stage">
            {src && isVideo ? (
              <video
                className="adm-mi-media"
                src={src}
                data-selected={group === "file"}
                muted
                loop
                playsInline
                controls
                onError={() => setBroken(true)}
                onClick={() => openGroup("file")}
              />
            ) : src ? (
              /* Raw img rather than next/image: the value can be any pasted
                 URL, including a Drive CDN link, and this is an admin-only
                 pane where the optimiser earns nothing. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="adm-mi-media"
                src={driveImage(src)}
                alt={caption || title}
                referrerPolicy="no-referrer"
                data-selected={group === "file"}
                onError={() => setBroken(true)}
                onLoad={() => setBroken(false)}
                onClick={() => openGroup("file")}
              />
            ) : (
              <button
                type="button"
                className="adm-mi-empty"
                onClick={() => openGroup("file")}
              >
                Nothing in this slot yet - click to add a file
              </button>
            )}

            {detailFields.length ? (
              <figcaption
                className="adm-mi-cap"
                data-selected={group === "details"}
                onClick={() => openGroup("details")}
              >
                {caption || "No words yet - click to write them"}
              </figcaption>
            ) : null}
          </figure>

          {broken && src ? (
            <p className="adm-mi-warn">
              This URL did not load. If it is a Drive link, check the file is
              shared publicly - a private file fails on the site too.
            </p>
          ) : null}
        </div>

        {/* data-lenis-prevent, or the page smooth-scroller swallows the wheel
            and this column cannot be scrolled at all. */}
        <aside className="adm-ins-panel" data-lenis-prevent>
          {isFooterPhoto ? (
            <p className="adm-hint adm-mi-pair">
              Both footer photographs must be the same picture at the same size
              - one frosted, one sharp.
            </p>
          ) : null}

          {groups.map((entry) => {
            const selected = group === entry.id;
            const isOpen = selected && !collapsed;
            return (
              <section
                className="adm-ins-group"
                key={entry.id}
                data-open={isOpen}
                data-selected={selected}
              >
                <button
                  type="button"
                  className="adm-ins-group-head"
                  onClick={() => openGroup(entry.id)}
                >
                  <span className="adm-ins-group-index">{entry.index}</span>
                  <span className="adm-ins-group-label">{entry.label}</span>
                </button>

                {isOpen ? (
                  <div className="adm-ins-group-body">
                    {entry.id === "file" && mediaField
                      ? renderField(mediaField)
                      : entry.id === "details"
                        ? detailFields.map(renderField)
                        : advancedFields.map(renderField)}
                  </div>
                ) : null}
              </section>
            );
          })}

          {!spec.singleton && !spec.fixedRows ? (
            <div className="adm-mi-danger">
              {confirming ? (
                <>
                  <button
                    type="button"
                    className="adm-btn is-small is-danger"
                    onClick={remove}
                    disabled={busy}
                  >
                    Delete for good
                  </button>
                  <button
                    type="button"
                    className="adm-btn is-small"
                    onClick={() => setConfirming(false)}
                  >
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="adm-btn is-small is-danger"
                  onClick={() => setConfirming(true)}
                >
                  Delete
                </button>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
