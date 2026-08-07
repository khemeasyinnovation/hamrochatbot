
export type Org = {
  id: string;
  name: string;
  slug: string;
  embedKey: string;
  allowedDomains: string[] | null;
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
  fetch("/api/orgs").then((r) => r.json()).then((d) => d.org as Org | null);

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



 