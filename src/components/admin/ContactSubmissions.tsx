"use client";

/**
 * CONTACT SUBMISSIONS - the inbox tab.
 *
 * This is the one tab that is not schema-driven, and that is the point.
 * Every other tab hands a TableSpec to RowEditor and gets a form that can
 * rewrite any column. A submission is a record of what somebody said, so the
 * only things this component can change are which pile it sits in and whether
 * it exists at all. There is no field here that writes the visitor's words.
 *
 * The flow stores option ids ("marketing", "5k-10k"). Those are read back
 * through the same config the form was built from, so the inbox shows the
 * words the visitor actually clicked rather than the slug underneath.
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SUBMISSION_STATUSES,
  type ContactSubmissionRow,
  type SubmissionStatus,
} from "@/lib/cms/types";
import {
  APP_STACKS,
  PROJECT_BUDGETS,
  PROJECT_SERVICES,
  SITE_TYPES,
  STACK_OPTIONS,
  type ContactOption,
} from "@/components/contact/contactContent";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
};

const FILTERS: Array<{ id: SubmissionStatus | ""; label: string }> = [
  { id: "", label: "All" },
  ...SUBMISSION_STATUSES.map((status) => ({
    id: status,
    label: STATUS_LABEL[status],
  })),
];

/** An option id turned back into the label the visitor saw. Falls back to the
 *  raw id, so retiring an option from the config later does not blank the
 *  submissions that chose it. */
function labelOf(
  options: readonly ContactOption[],
  id: string | null | undefined
): string {
  if (!id) return "";
  return options.find((option) => option.id === id)?.label ?? id;
}

/** Coarse relative time for the collapsed row. Precision past "3d ago" is
 *  noise; the exact stamp is one click away in the detail. */
function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 30) return days + "d ago";
  return new Date(then).toLocaleDateString();
}

function fullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ContactSubmissions() {
  const [rows, setRows] = useState<ContactSubmissionRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<SubmissionStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  /* `quiet` refetches without flashing the loading state, which is what every
     mutation wants: the counts and the filtered view both go stale after a
     status change, and refetching is the only version of this that cannot
     drift out of sync with the database. */
  const load = useCallback(async (status: string, quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/submissions" + (status ? "?status=" + status : ""),
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        rows?: ContactSubmissionRow[];
        counts?: Record<string, number>;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error || "Could not load submissions.");
        setRows([]);
      } else {
        setRows(data.rows ?? []);
        setCounts(data.counts ?? {});
      }
    } catch {
      setError("Network error.");
      setRows([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
    setOpenId(null);
    setConfirming(null);
  }, [filter, load]);

  const setStatus = useCallback(
    async (id: string, status: SubmissionStatus) => {
      setBusy(id);
      try {
        const response = await fetch("/api/admin/submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error || "Could not update.");
          return;
        }
        await load(filter, true);
      } catch {
        setError("Network error.");
      } finally {
        setBusy(null);
      }
    },
    [filter, load]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        const response = await fetch("/api/admin/submissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error || "Could not delete.");
          return;
        }
        setConfirming(null);
        setOpenId(null);
        await load(filter, true);
      } catch {
        setError("Network error.");
      } finally {
        setBusy(null);
      }
    },
    [filter, load]
  );

  return (
    <>
      <div className="adm-sub-filters">
        {FILTERS.map((entry) => {
          const count = entry.id === "" ? counts.total : counts[entry.id];
          return (
            <button
              key={entry.id || "all"}
              className="adm-sub-chip"
              data-active={filter === entry.id}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
              {typeof count === "number" ? (
                <span className="adm-sub-count">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? <p className="adm-msg is-error">{error}</p> : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={filter || "all"}
          className="adm-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          {loading ? (
            <div className="adm-empty">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="adm-empty">
              {filter
                ? "Nothing in " + STATUS_LABEL[filter].toLowerCase() + "."
                : "No submissions yet. The form writes straight here."}
            </div>
          ) : (
            rows.map((row) => {
              const open = openId === row.id;
              const working = busy === row.id;

              const who =
                row.full_name || row.email || "Someone";

              /* The collapsed line is a triage line: who, what they want, how
                 much, how long ago. Enough to decide whether to open it. */
              const meta = [
                labelOf(PROJECT_BUDGETS, row.budget),
                (row.services ?? [])
                  .map((service) => labelOf(PROJECT_SERVICES, service))
                  .join(" + "),
                ago(row.created_at),
              ]
                .filter(Boolean)
                .join("  \u00b7  ");

              const pairs: Array<[string, string]> = [];
              const push = (key: string, value: string | null | undefined) => {
                if (value && value.trim()) pairs.push([key, value.trim()]);
              };

              push("Sent", fullDate(row.created_at));
              push("Name", row.full_name);
              push("Company", row.company);
              push("Phone", row.phone);
              push(
                "Services",
                (row.services ?? [])
                  .map((service) => labelOf(PROJECT_SERVICES, service))
                  .join(", ")
              );
              push("Site type", labelOf(SITE_TYPES, row.site_type));
              push("In their words", row.site_type_other);
              push("Android stack", labelOf(APP_STACKS, row.app_stack));
              push("Budget", labelOf(PROJECT_BUDGETS, row.budget));
              push("Build", labelOf(STACK_OPTIONS, row.stack));
              push("Country", row.locale_country);

              const prose = row.description || row.message || "";

              return (
                <div className="adm-card" key={row.id}>
                  <div
                    className="adm-card-head"
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <span
                      className="adm-sub-badge"
                      data-status={row.status}
                      title={STATUS_LABEL[row.status]}
                    />

                    <div>
                      <div className="adm-card-title">
                        {who}
                        <span
                          className="adm-sub-kind"
                          data-kind={row.kind}
                        >
                          {row.kind === "project" ? "Project" : "Say hi"}
                        </span>
                      </div>
                      <div className="adm-card-meta">
                        {meta || "\u2014"}
                        {row.status === "new" ? "  \u00b7  UNREAD" : ""}
                      </div>
                    </div>

                    <span className="adm-spacer" />

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
                        <div className="adm-card-body">
                          <div className="adm-sub-detail">
                            {pairs.map(([key, value]) => (
                              <div className="adm-sub-row" key={key}>
                                <span className="adm-sub-key">{key}</span>
                                <span className="adm-sub-val">{value}</span>
                              </div>
                            ))}

                            {row.email ? (
                              <div className="adm-sub-row">
                                <span className="adm-sub-key">Email</span>
                                <span className="adm-sub-val">
                                  <a
                                    className="adm-sub-link"
                                    href={"mailto:" + row.email}
                                  >
                                    {row.email}
                                  </a>
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {prose ? (
                            <div className="adm-sub-prose">
                              <span className="adm-sub-key">
                                {row.description ? "Project brief" : "Message"}
                              </span>
                              <p>{prose}</p>
                            </div>
                          ) : null}

                          {row.referrer || row.user_agent ? (
                            <div className="adm-sub-context">
                              {row.referrer ? <div>From {row.referrer}</div> : null}
                              {row.user_agent ? <div>{row.user_agent}</div> : null}
                            </div>
                          ) : null}

                          <div className="adm-sub-actions">
                            {SUBMISSION_STATUSES.filter(
                              (status) => status !== row.status
                            ).map((status) => (
                              <button
                                key={status}
                                className="adm-btn is-small"
                                disabled={working}
                                onClick={() => void setStatus(row.id, status)}
                              >
                                {"Mark " + STATUS_LABEL[status].toLowerCase()}
                              </button>
                            ))}

                            <span className="adm-spacer" />

                            {confirming === row.id ? (
                              <>
                                <button
                                  className="adm-btn is-danger"
                                  disabled={working}
                                  onClick={() => void remove(row.id)}
                                >
                                  Delete for good
                                </button>
                                <button
                                  className="adm-btn"
                                  onClick={() => setConfirming(null)}
                                >
                                  Keep it
                                </button>
                              </>
                            ) : (
                              <button
                                className="adm-btn is-danger"
                                onClick={() => setConfirming(row.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
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
  );
}
