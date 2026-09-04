"use client";

import { useState } from "react";
import type { Field } from "./fields";
import { driveImage } from "@/lib/driveImage";

/**
 * Paste a URL, or upload and have the URL filled in for you.
 *
 * Lives in its own file because two editors now need it - the schema-driven
 * form and the visual case study editor - and the alternative was one importing
 * the other in a circle.
 */
export default function MediaField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (next: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputId = "upl-" + field.key;

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", field.folder || "uploads");
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error || "Upload failed.");
      } else {
        onChange(data.url);
      }
    } catch {
      setError("Upload failed - network error.");
    } finally {
      setBusy(false);
    }
  }

  const isVideo = /\.(mp4|webm)(\?|$)/i.test(value);

  return (
    <div>
      <div className="adm-media-row">
        <input
          className="adm-input"
          value={value}
          placeholder="https://..."
          onChange={(e) => onChange(e.target.value)}
        />
        <label className="adm-btn is-small" htmlFor={inputId} style={{ cursor: "pointer" }}>
          {busy ? "..." : "Upload"}
        </label>
        <input
          id={inputId}
          type="file"
          accept={field.accept}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {value ? (
        <div className="adm-preview">
          {isVideo ? (
            <video src={driveImage(value)} muted loop playsInline autoPlay />
          ) : (
            // Plain img, not next/image: these URLs are user-supplied at
            // runtime and would each need a remotePatterns entry.
            // eslint-disable-next-line @next/next/no-img-element
            <img referrerPolicy="no-referrer" src={driveImage(value)} alt="" />
          )}
        </div>
      ) : null}

      {error ? <p className="adm-msg is-error" style={{ marginTop: 6 }}>{error}</p> : null}
      {field.hint ? <p className="adm-hint">{field.hint}</p> : null}
    </div>
  );
}