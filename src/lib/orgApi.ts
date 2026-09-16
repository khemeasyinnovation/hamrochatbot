export type Org = {
  id: string;
  name: string;
  slug: string;
  embedKey: string;
  allowedDomains: string[] | null;
  isPaid: boolean;
  widgetColor: string | null;
  widgetPosition: string | null;
  businessDescription: string | null;
  knowledgeCount?: number;
};

export const updateAllowedDomains = (allowedDomains: string[]) =>
  fetch("/api/orgs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allowedDomains }),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to save domains");
    return data.org as Org;
  });

export const fetchMyOrg = () =>
  fetch("/api/orgs").then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to load your business");
    return data.org as Org | null;
  });

export const createOrg = (name: string) =>
  fetch("/api/orgs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to create business");
    return data.org as Org;
  });

  export const updateWidgetAppearance = (widgetColor: string, widgetPosition: string) =>
  fetch("/api/orgs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetColor, widgetPosition }),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to save appearance");
    return data.org as Org;
  });
