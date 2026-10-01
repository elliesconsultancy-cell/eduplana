import type { UIFieldServerProps } from "payload";

import { asset } from "@/lib/assets";
import { describe, LISTING_KEYS, LISTING_LABELS, type Listing, type ListingKey } from "@/lib/outreach/listing";
import "./ui.css";
import "./submission-diff.css";

/**
 * What a school is asking to change, laid out for a decision.
 *
 * Only changed fields are listed, each as "on the site now" against "proposed",
 * because the reviewer's question is "is this change right?" — reading the
 * whole record to find the three lines that moved is how a bad edit gets waved
 * through. Photographs are shown as pictures, since a path tells nobody whether
 * an image is of a school or of something else entirely.
 */
type Images = Listing["images"];

function Pictures({ images, marked }: { images: Images; marked: Set<string> }) {
  const all = [
    ...(images.logo ? [{ src: images.logo, key: images.logo, logo: true }] : []),
    ...images.gallery.map((g) => ({ src: g.thumb, key: g.full, logo: false })),
  ];
  if (all.length === 0) return <span className="sd-none">No logo or photographs</span>;
  return (
    <ul className="sd-pics">
      {all.map((p) => (
        <li key={p.key} className={marked.has(p.key) ? "sd-pic sd-pic--marked" : "sd-pic"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of CDN thumbnails */}
          <img src={asset(p.src)} alt="" loading="lazy" />
          {p.logo ? <span className="sd-pic__tag">Logo</span> : null}
        </li>
      ))}
    </ul>
  );
}

function keysOf(images: Images): Set<string> {
  return new Set([images.logo, ...images.gallery.map((g) => g.full)].filter(Boolean) as string[]);
}

export function SubmissionDiff({ data }: UIFieldServerProps) {
  const changes = (data?.changes ?? {}) as Partial<Listing>;
  const before = (data?.before ?? {}) as Partial<Listing>;
  const kind = data?.kind as string | undefined;
  const slug = data?.schoolSlug as string | undefined;
  const keys = LISTING_KEYS.filter((k) => k in changes);

  return (
    <div className="ad sd">
      <div className="sd-head">
        <div>
          <p className="sd-eyebrow">
            {kind === "removal"
              ? "Removal request"
              : kind === "confirm"
                ? "Confirmed with no changes"
                : `${keys.length} field${keys.length === 1 ? "" : "s"} changed`}
          </p>
          <h2 className="sd-title">{String(data?.schoolName ?? "School")}</h2>
        </div>
        {slug ? (
          <a className="ad-btn" href={`/schools/${slug}`} target="_blank" rel="noreferrer">
            View the live listing ↗
          </a>
        ) : null}
      </div>

      {kind === "removal" ? (
        <p className="sd-callout">
          Approving unpublishes this listing. It is not deleted, so it can be republished from the
          school&rsquo;s record if this turns out not to be the school.
        </p>
      ) : kind === "confirm" ? (
        <p className="sd-callout">
          The school says every detail on its listing is correct. Approving marks it verified and
          changes nothing else.
        </p>
      ) : (
        <table className="sd-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">On the site now</th>
              <th scope="col">Proposed</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key: ListingKey) =>
              key === "images" ? (
                <tr key={key}>
                  <th scope="row">{LISTING_LABELS[key]}</th>
                  <td>
                    <Pictures
                      images={(before.images ?? { logo: null, gallery: [] }) as Images}
                      marked={new Set(
                        [...keysOf((before.images ?? { logo: null, gallery: [] }) as Images)].filter(
                          (k) => !keysOf(changes.images as Images).has(k),
                        ),
                      )}
                    />
                  </td>
                  <td>
                    <Pictures
                      images={changes.images as Images}
                      marked={new Set(
                        [...keysOf(changes.images as Images)].filter(
                          (k) => !keysOf((before.images ?? { logo: null, gallery: [] }) as Images).has(k),
                        ),
                      )}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={key}>
                  <th scope="row">{LISTING_LABELS[key]}</th>
                  <td className="sd-old">{describe(key, before[key])}</td>
                  <td className="sd-new">{describe(key, changes[key])}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
      {keys.includes("images") ? (
        <p className="sd-note">Outlined pictures are the ones removed (left) or newly uploaded (right).</p>
      ) : null}
    </div>
  );
}
