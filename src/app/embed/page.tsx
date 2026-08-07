import { headers } from "next/headers";
import { db } from "@/db/client";
import { orgs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmbedChatWidget } from "@/components/chat/EmbedChatWidget";

function extractHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isDomainAllowed(hostname: string | null, allowedDomains: string[] | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true; // no restriction configured yet
  if (!hostname) return false; // domains ARE configured but we couldn't tell who's asking — fail closed
  return allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; key?: string; user?: string }>;
}) {
  const { org: orgSlug, key: embedKey, user: explicitVisitorId } = await searchParams;

  if (!orgSlug) {
    return <div className="p-4 text-sm text-slate-500">Missing required "org" parameter.</div>;
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) {
    return <div className="p-4 text-sm text-slate-500">Unknown organization.</div>;
  }

  if (!embedKey || embedKey !== org.embedKey) {
    return <div className="p-4 text-sm text-red-500">Invalid or missing embed key.</div>;
  }

  const referer = (await headers()).get("referer");
  const hostname = extractHostname(referer);
  if (!isDomainAllowed(hostname, org.allowedDomains)) {
    return (
      <div className="p-4 text-sm text-red-500">
        This chatbot isn't authorized for this website.
      </div>
    );
  }

  return (
    <EmbedChatWidget
      orgSlug={orgSlug}
      embedKey={embedKey}
      explicitVisitorId={explicitVisitorId ?? null}
    />
  );
}