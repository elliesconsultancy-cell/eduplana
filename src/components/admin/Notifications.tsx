import Link from "next/link";
import { Bell } from "lucide-react";
import type { Payload } from "payload";

/**
 * The bell: things waiting on a person. Today that is school submissions to
 * review; a dot appears only when there is something, so it means something.
 */
export async function Notifications({ payload }: { payload: Payload }) {
  const { totalDocs } = await payload
    .count({ collection: "school-submissions", where: { status: { equals: "pending" } }, overrideAccess: true })
    .catch(() => ({ totalDocs: 0 }));

  return (
    <Link
      href="/admin/collections/school-submissions?where[status][equals]=pending"
      className="ep-icon-btn ep-act-bell"
      prefetch={false}
      aria-label={totalDocs ? `${totalDocs} submission${totalDocs === 1 ? "" : "s"} waiting for review` : "No submissions waiting"}
      title={totalDocs ? `${totalDocs} waiting for review` : "Nothing waiting for review"}
    >
      <Bell size={19} aria-hidden />
      {totalDocs ? <span className="ep-icon-btn__dot" aria-hidden /> : null}
    </Link>
  );
}
