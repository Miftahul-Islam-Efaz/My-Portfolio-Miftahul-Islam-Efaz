"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/**
 * Username and password, posted once to /api/admin/login.
 *
 * On success it calls router.refresh() rather than navigating: the server
 * component re-runs, sees the fresh cookie, and swaps this form for the panel
 * without a full page load.
 */
export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not sign in.");
        setBusy(false);
        return;
      }
      // Full reload so the server component re-evaluates the cookie.
      window.location.reload();
    } catch {
      setError("Network error. Is the dev server still running?");
      setBusy(false);
    }
  }

  return (
    <div className="adm-gate">
      <motion.form
        className="adm-gate-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="adm-gate-eyebrow">
          <span className="adm-dot" />
          Restricted
        </div>
        <h1 className="adm-gate-title">Control room</h1>

        <div className="adm-field" style={{ marginBottom: 14 }}>
          <label className="adm-label" htmlFor="adm-user">
            Username
          </label>
          <input
            id="adm-user"
            className="adm-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="adm-field" style={{ marginBottom: 20 }}>
          <label className="adm-label" htmlFor="adm-pass">
            Password
          </label>
          <input
            id="adm-pass"
            className="adm-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="adm-btn is-primary adm-btn-full" disabled={busy}>
          {busy ? "Checking..." : "Enter"}
        </button>

        {error ? (
          <p className="adm-msg is-error" style={{ marginTop: 14 }}>
            {error}
          </p>
        ) : null}
      </motion.form>
    </div>
  );
}