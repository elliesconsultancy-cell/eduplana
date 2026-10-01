"use client";

import { useTheme } from "@payloadcms/ui";
import { Moon, Sun } from "lucide-react";

/**
 * Light and dark in one press. Payload keeps the choice in its own preference
 * cookie, so this is the same setting as the one on the account page.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="ep-icon-btn ep-act-theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
