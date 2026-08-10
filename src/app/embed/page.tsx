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
  if (!allowedDomains || allowedDomains.length === 0) return true;
  if (!hostname) return false;
  return allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh w-full bg-white flex flex-col">{children}</div>;
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; key?: string; user?: string; layout?: string; path?: string }>;
}) {
  const { org: orgSlug, key: embedKey, user: explicitVisitorId, layout, path } = await searchParams;

  if (!orgSlug) {
    return (
      <Shell>
        <div className="p-4 text-sm text-slate-500">Missing required "org" parameter.</div>
      </Shell>
    );
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) {
    return (
      <Shell>
        <div className="p-4 text-sm text-slate-500">Unknown organization.</div>
      </Shell>
    );
  }

  if (!embedKey || embedKey !== org.embedKey) {
    return (
      <Shell>
        <div className="p-4 text-sm text-red-500">Invalid or missing embed key.</div>
      </Shell>
    );
  }

  const referer = (await headers()).get("referer");
  const hostname = extractHostname(referer);
  if (!isDomainAllowed(hostname, org.allowedDomains)) {
    return (
      <Shell>
        <div className="p-4 text-sm text-red-500">
          This chatbot isn't authorized for this website.
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <EmbedChatWidget
        orgSlug={orgSlug}
        embedKey={embedKey}
        explicitVisitorId={explicitVisitorId ?? null}
        isMobileHost={layout === "mobile"}
        hostPath={path ?? null}
      />
    </Shell>
  );
}