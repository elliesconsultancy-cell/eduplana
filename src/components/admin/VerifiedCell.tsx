"use client";

import "./verified-cell.css";

/**
 * The list column for `verified`.
 *
 * Payload renders a checkbox column as the literal strings "true" and "false",
 * which reads as debug output in a table a non-developer is meant to scan.
 * A badge for the rare true case and a quiet dash for the common false one
 * makes the exceptions findable at a glance.
 */
export function VerifiedCell({ cellData }: { cellData?: boolean }) {
  if (!cellData) return <span className="eduplana-verified eduplana-verified--no">—</span>;
  return <span className="eduplana-verified eduplana-verified--yes">Verified</span>;
}
