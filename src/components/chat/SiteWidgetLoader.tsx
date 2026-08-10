"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

export function SiteWidgetLoader() {
  const pathname = usePathname();
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (pathname?.startsWith("/embed")) return null;
  if (!origin) return null; // wait until we know our own origin (client-only, avoids SSR issues)

  return (
    <Script
      src={`${origin}/widget.js`}
      data-org="hamrochatbot-support"
      data-key="0cc30f1d32bd9298b42aab9339dfe4b570c38f061ac13a16"
      strategy="afterInteractive"
    />
  );
}