/**
 * Cache tags shared between the data layer and the collections that invalidate
 * them.
 *
 * This lives on its own with no imports on purpose. `lib/schools.ts` pulls in
 * the Payload config, and the Payload config pulls in the collections — so a
 * collection importing the tag from `lib/schools.ts` would close a circular
 * import and break the admin at boot.
 */
export const SCHOOLS_TAG = "schools";
