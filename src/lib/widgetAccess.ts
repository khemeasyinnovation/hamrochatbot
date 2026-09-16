type PublicWidgetOrg = { embedKey: string; isPaid: boolean };

/** Shared by the embed page and every public Widget API. Configuration stays owner-only. */
export function widgetAccessError(org: PublicWidgetOrg | null | undefined, key: unknown) {
  if (!org) return { error: "Unknown organization", status: 404 };
  if (typeof key !== "string" || !key || key !== org.embedKey) {
    return { error: "Invalid or missing embed key", status: 403 };
  }
  if (!org.isPaid) {
    return { error: "This widget is not activated. The business owner needs to complete payment.", status: 402 };
  }
  return null;
}
