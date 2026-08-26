/**
 * Cut the served brand assets out of the supplied logo export.
 *
 *   node scripts/build-brand-assets.mjs
 *
 * The designer supplies one file — the lock-up in blue, on transparency. Every
 * asset the app references is derived from it, including the reversed mark, so
 * the two can never drift apart and re-exporting the logo is a one-command job
 * rather than a manual trip through an image editor.
 */
import sharp from "sharp";

const SOURCE = "design/brand/lockup.png";

/* Measured from the source: the mean of its strongly-blue pixels. The export
   is faintly noisy, so no single pixel is authoritative — the mean is. */
const BLUE = [34, 96, 183];
const WHITE = [255, 255, 255];

const ALPHA_FLOOR = 8; // below this a pixel is background, not soft edge

async function raw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Row/column histograms with a floor, so a stray pixel cannot stretch the crop. */
function bounds({ data, w, h }) {
  const cols = new Uint32Array(w);
  const rows = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < ALPHA_FLOOR) continue;
      cols[x]++;
      rows[y]++;
    }
  }
  const FLOOR = 2;
  const first = (a) => a.findIndex((n) => n >= FLOOR);
  const last = (a) => a.length - 1 - [...a].reverse().findIndex((n) => n >= FLOOR);
  return { minX: first(cols), maxX: last(cols), minY: first(rows), maxY: last(rows) };
}

function crop(img, box) {
  const w = box.maxX - box.minX + 1;
  const h = box.maxY - box.minY + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = ((y + box.minY) * img.w + box.minX) * 4;
    img.data.copy(out, y * w * 4, src, src + w * 4);
  }
  return { data: out, w, h };
}

/**
 * Swap the two brand colours to build the reversed lock-up: the blue tile
 * becomes white, the white bulb inside it becomes blue, and the wordmark turns
 * white while keeping its alpha.
 *
 * Interpolating on "how blue is this pixel" rather than testing a threshold is
 * what keeps the antialiased edges clean — a hard swap would leave a fringe of
 * the old colour one pixel wide around every letter.
 */
function reverse({ data, w, h }) {
  const out = Buffer.from(data);
  const span = Math.hypot(WHITE[0] - BLUE[0], WHITE[1] - BLUE[1], WHITE[2] - BLUE[2]);
  for (let o = 0; o < out.length; o += 4) {
    if (out[o + 3] === 0) continue;
    const d = Math.hypot(out[o] - WHITE[0], out[o + 1] - WHITE[1], out[o + 2] - WHITE[2]);
    const blueness = Math.min(1, d / span);
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(BLUE[c] + (WHITE[c] - BLUE[c]) * blueness);
  }
  return { data: out, w, h };
}

/** The widest fully-empty column run separates the icon tile from the wordmark. */
function tileWidth({ data, w, h }) {
  let best = { start: -1, len: 0 };
  let run = -1;
  for (let x = 0; x < w; x++) {
    let empty = true;
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3] >= ALPHA_FLOOR) { empty = false; break; }
    }
    if (empty) {
      if (run < 0) run = x;
      if (x - run + 1 > best.len) best = { start: run, len: x - run + 1 };
    } else run = -1;
  }
  return best.start;
}

const png = ({ data, w, h }) => sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 });

const source = await raw(SOURCE);
const lockup = crop(source, bounds(source));
const tw = tileWidth(lockup);
// Slice at the gap, then re-bound: the split lands in the middle of the
// clear space, so the tile would otherwise carry that slack as padding and
// render visually smaller than its box wherever it is sized by height.
const slice = crop(lockup, { minX: 0, maxX: tw - 1, minY: 0, maxY: lockup.h - 1 });
const tile = crop(slice, bounds(slice));

const written = [];
async function write(file, img, resize) {
  let p = png(img);
  if (resize) {
    p = p.resize(resize, resize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    });
  }
  await p.toFile(file);
  written.push([file, resize ? `${resize}x${resize}` : `${img.w}x${img.h}`]);
}

await write("public/brand/eduplana-logo.png", lockup);
await write("public/brand/eduplana-logo-reversed.png", reverse(lockup));
await write("public/brand/eduplana-mark.png", tile);
await write("public/brand/icon.png", tile, 256);

for (const [f, size] of written) console.log(`  ${f.padEnd(42)} ${size}`);
