"use client";

import { useState } from "react";

/** A link to select and copy. Works without a button too: the field is read-only text. */
export function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="or-copy">
      <input type="text" readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      <button
        type="button"
        className="ad-btn ad-btn--primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            /* The field is selectable by hand. */
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
