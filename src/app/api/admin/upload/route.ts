import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { MEDIA_BUCKET, adminClient } from "@/lib/supabase/clients";

/**
 * POST /api/admin/upload  (multipart: file, folder?)
 *
 * Uploads straight into the public portfolio-media bucket and returns the
 * public URL, which the panel then drops into whichever URL field asked for
 * it. The upload goes through the SERVER with the service role key rather than
 * from the browser with the anon key - the bucket has no anon insert policy at
 * all, so a stranger who finds the bucket cannot write to it.
 *
 * The filename is slugified and suffixed with a timestamp. Original filenames
 * carry spaces, brackets and non-ASCII that turn into percent-encoded noise in
 * a CDN URL, and two files called screenshot.png must not overwrite each other.
 */
const MAX_BYTES = 100 * 1024 * 1024;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

function slugify(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "bin";
  const clean =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  return clean + "-" + Date.now().toString(36) + "." + ext.replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 100 MB. Compress it, or host the video elsewhere and paste the URL." },
      { status: 400 }
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type: " + (file.type || "unknown") + "." },
      { status: 400 }
    );
  }

  const folderRaw = form.get("folder");
  const folder =
    typeof folderRaw === "string" && /^[a-z0-9-]{1,40}$/.test(folderRaw)
      ? folderRaw
      : "uploads";

  const path = folder + "/" + slugify(file.name);

  try {
    const db = adminClient();
    const { error } = await db.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}