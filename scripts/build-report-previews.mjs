/**
 * Derive a cover image and a page count for every report.
 *
 *   node scripts/build-report-previews.mjs
 *
 * The archive holds 30 PDFs whose titles range from serviceable ("2020
 * Education Budget") to meaningless ("Report 2"), and until now the only way
 * to find out what one contained was to download it. The cover page is the
 * most descriptive thing about a document and it is already inside the file,
 * so it is rendered here rather than described.
 *
 * Deliberately no auto-generated summary. Extracting the opening text was
 * tried and abandoned: the budget PDFs open with classification codes, and
 * every Eduplana report opens with the same "Eduplana is a civic technology
 * organization…" boilerplate, so the same paragraph appeared on a dozen
 * unrelated pages while describing none of them. A summary that fits every
 * report describes no report. Descriptions are written by hand into the
 * `description` field of the manifest instead, and pages without one show the
 * cover and the facts, which are at least true.
 */
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const MANIFEST = "src/data/insights.json";
const COVERS = "public/insights/covers";
mkdirSync(COVERS, { recursive: true });

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

let covers = 0;

for (const doc of manifest.documents) {
  const pdf = path.join("public", doc.file);
  if (!existsSync(pdf)) {
    console.log("  missing: " + doc.slug);
    continue;
  }

  try {
    const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
    const pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1]);
    if (Number.isFinite(pages)) doc.pages = pages;
  } catch {
    /* leave pages unset rather than guess */
  }

  const work = mkdtempSync(path.join(tmpdir(), "cover-"));
  try {
    execFileSync("pdftoppm", [
      "-png",
      "-f",
      "1",
      "-l",
      "1",
      "-r",
      "110",
      "-singlefile",
      pdf,
      path.join(work, "p"),
    ]);
    const png = path.join(work, "p.png");
    if (existsSync(png)) {
      const out = path.join(COVERS, doc.slug + ".webp");
      await sharp(png)
        .resize({ width: 720, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(out);
      doc.cover = "/insights/covers/" + doc.slug + ".webp";
      covers++;
    }
  } catch {
    /* a cover is a nicety; a failure here must not stop the rest */
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log("  covers rendered : " + covers + "/" + manifest.documents.length);
