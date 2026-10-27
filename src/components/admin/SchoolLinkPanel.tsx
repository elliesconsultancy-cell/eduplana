"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useState } from "react";

import { CopyLink } from "./CopyLink";
import "./ui.css";
import "./outreach.css";

/**
 * On a school's admin page: makes a private link for this school to check and
 * update its own listing, to copy and send by WhatsApp or your own email.
 *
 * The link is the one the outreach email carries, so what the school sends
 * back lands in the same review queue. Only a hash is stored, so a link can be
 * shown once, here, and not looked up again.
 */
export function SchoolLinkPanel() {
  const { id } = useDocumentInfo();
  const [link, setLink] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A school that has not been saved yet has nothing to link to.
  if (!id) return null;

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/admin-actions/school-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: String(id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "The link could not be made.");
      setLink(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The link could not be made.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad sl">
      <p className="sl__title">Update link for this school</p>
      <p className="sl__note">
        A private link the school can use to check and correct its own details. Send it by WhatsApp or email.
        Nothing they change goes live until you approve it. Works for 30 days.
      </p>
      {link ? (
        <div className="sl__result" role="status">
          <p>Copy it now: it is not stored in a readable form, so it cannot be shown again.</p>
          <CopyLink value={link.url} />
        </div>
      ) : null}
      {error ? (
        <p className="sl__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="ad-btn" onClick={make} disabled={busy}>
        {busy ? "Making…" : link ? "Make another link" : "Create update link"}
      </button>
    </div>
  );
}
