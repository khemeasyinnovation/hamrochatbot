"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { ApiMessage } from "@/lib/chatApi";
import { getVisitorKey } from "@/lib/visitorIdentity";

type WidgetSession = { id: string; title: string; updatedAt: string };

export function EmbedChatWidget({
  orgSlug,
  embedKey,
  explicitVisitorId,
}: {
  orgSlug: string;
  embedKey?: string | null;
  explicitVisitorId?: string | null;
}) {
  const [visitorKey, setVisitorKey] = useState<string | null>(null);
  const [session, setSession] = useState<WidgetSession | null>(null);
  const [initialMessages, setInitialMessages] = useState<ApiMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Resolve visitor identity once, client-side only (localStorage).
  useEffect(() => {
    setVisitorKey(getVisitorKey(explicitVisitorId));
  }, [explicitVisitorId]);

  // Find this visitor's existing session for this org, or create one.
  useEffect(() => {
    if (!visitorKey) return;

    (async () => {
      try {
        const listRes = await fetch(
          `/api/widget/sessions?org=${encodeURIComponent(orgSlug)}&visitor=${encodeURIComponent(visitorKey)}&key=${encodeURIComponent(embedKey ?? "")}`,
        );
        const listData = await listRes.json();
        if (!listRes.ok)
          throw new Error(listData.error || "Failed to load session");

        let activeSession: WidgetSession | null =
          listData.sessions?.[0] ?? null;

        if (!activeSession) {
          const createRes = await fetch("/api/widget/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgSlug, visitorKey, embedKey }),
          });
          const createData = await createRes.json();
          if (!createRes.ok)
            throw new Error(createData.error || "Failed to start session");
          activeSession = createData.session;
        }

        const detailRes = await fetch(
          `/api/widget/sessions/${activeSession!.id}?visitor=${encodeURIComponent(visitorKey)}&org=${encodeURIComponent(orgSlug)}&key=${encodeURIComponent(embedKey ?? "")}`,
        );
        const detailData = await detailRes.json();
        if (!detailRes.ok)
          throw new Error(detailData.error || "Failed to load messages");

        setSession(activeSession);
        setInitialMessages(detailData.messages ?? []);
        setReady(true);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    })();
  }, [visitorKey, orgSlug]);

  const handleTurnComplete = useCallback(
    (messages: ApiMessage[]) => {
      if (!session || !visitorKey) return;
      fetch(`/api/widget/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorKey, orgSlug, embedKey, messages }),
      }).catch(() => {
        // Best-effort autosave -- a failed save shouldn't interrupt the chat.
      });
    },
    [session, visitorKey],
  );

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-slate-400">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatPanel
        initialMessages={initialMessages}
        onTurnComplete={handleTurnComplete}
        orgSlug={orgSlug}
      />
    </div>
  );
}
