/* Payload's admin shell. Deliberately separate from the site layout: it ships
   its own CSS reset, providers and <html>/<body>, and must not inherit the
   public site's chrome. */
import type { ServerFunctionClient } from "payload";
import { Plus_Jakarta_Sans } from "next/font/google";
import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import { importMap } from "./admin/importMap";

import "@payloadcms/next/css";
import "./custom.css";

/**
 * The same family the public site uses. Payload owns the <html> element, so the
 * font variable is passed through `htmlProps` — `custom.css` then points
 * Payload's `--font-body` at it.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function PayloadLayout({ children }: Args) {
  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
      htmlProps={{ className: jakarta.variable }}
    >
      {children}
    </RootLayout>
  );
}
