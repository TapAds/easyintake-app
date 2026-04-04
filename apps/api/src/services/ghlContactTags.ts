import { getGhlClientForLocation } from "./ghl";

/**
 * Add or remove a single tag on a GHL contact (fetch-merge-put).
 */
export async function mergeGhlContactTag(
  ghlLocationId: string,
  contactId: string,
  tag: string,
  mode: "add" | "remove"
): Promise<void> {
  const { client } = await getGhlClientForLocation(ghlLocationId);
  const res = await client.get<{ contact?: { tags?: string[] } }>(`/contacts/${contactId}`);
  const existing = res.data?.contact?.tags ?? [];
  const next =
    mode === "add"
      ? Array.from(new Set([...existing, tag]))
      : existing.filter((t) => t !== tag);
  await client.put(`/contacts/${contactId}`, {
    tags: next,
    locationId: ghlLocationId,
  });
}
