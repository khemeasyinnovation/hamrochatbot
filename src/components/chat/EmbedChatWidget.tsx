
"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { WidgetTopBar } from "./WidgetTopBar";
import { WidgetHistoryPanel } from "./WidgetHistoryPanel";
import { ApiMessage } from "@/lib/chatApi";
import { getVisitorKey } from "@/lib/visitorIdentity";

import {
  WidgetSession,
  listWidgetSessions,
  createWidgetSession,
  getWidgetSession,
  saveWidgetSessionMessages,
} from "@/lib/widgetApi";

type WidgetPosition = "bottom-right" | "bottom-left";

export function EmbedChatWidget({
  orgSlug,
  embedKey,
  explicitVisitorId,
  isMobileHost,
}: {
  orgSlug: string;
  embedKey?: string | null;
  explicitVisitorId?: string | null;
  isMobileHost?: boolean;
  hostPath?: string | null;
}) {
  const hasIdentity = !!explicitVisitorId;

  const [visitorKey, setVisitorKey] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WidgetSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [initialMessages, setInitialMessages] = useState<ApiMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // This is the effective position for THIS browser session.
  //
  // It starts as right only until widget.js tells the iframe what the
  // organization's saved/default position is.
  const [position, setPosition] =
    useState<WidgetPosition>("bottom-right");

  useEffect(() => {
    setVisitorKey(getVisitorKey(explicitVisitorId));
  }, [explicitVisitorId]);

  /*
   * widget.js sends the organization's saved/default position into
   * the iframe.
   *
   * This is important because the iframe itself should not assume
   * bottom-right when the owner has saved bottom-left.
   */
  useEffect(() => {
    function handleParentMessage(event: MessageEvent) {
      const data = event.data;

      if (!data || typeof data !== "object") return;

      if (
        data.type === "easy-re-widget-appearance" &&
        (data.position === "bottom-left" ||
          data.position === "bottom-right")
      ) {
        setPosition(data.position);
      }
    }

    window.addEventListener("message", handleParentMessage);

    // Ask widget.js to send us its current configuration.
    window.parent.postMessage(
      {
        type: "easy-re-widget-request-appearance",
      },
      "*",
    );

    return () => {
      window.removeEventListener("message", handleParentMessage);
    };
  }, []);

  const loadSessionMessages = useCallback(
    async (id: string) => {
      if (!visitorKey) return;

      const messages = await getWidgetSession(
        id,
        orgSlug,
        visitorKey,
        embedKey,
      );

      setInitialMessages(messages);
      setCurrentSessionId(id);
    },
    [orgSlug, visitorKey, embedKey],
  );

  useEffect(() => {
    if (!visitorKey) return;

    (async () => {
      try {
        const list = await listWidgetSessions(
          orgSlug,
          visitorKey,
          embedKey,
        );

        let active = list[0] ?? null;

        if (!active) {
          active = await createWidgetSession(
            orgSlug,
            visitorKey,
            embedKey,
          );

          list.unshift(active);
        }

        setSessions(list);

        await loadSessionMessages(active.id);

        setReady(true);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorKey]);

  const handleTurnComplete = useCallback(
    (messages: ApiMessage[]) => {
      if (!currentSessionId || !visitorKey) return;

      saveWidgetSessionMessages(
        currentSessionId,
        orgSlug,
        visitorKey,
        embedKey,
        messages,
      );
    },
    [currentSessionId, visitorKey, orgSlug, embedKey],
  );

  function handleClose() {
    window.parent.postMessage(
      {
        type: "easy-re-widget-close",
      },
      "*",
    );
  }

  async function handleNewChat() {
    if (!visitorKey) return;

    const session = await createWidgetSession(
      orgSlug,
      visitorKey,
      embedKey,
    );

    setSessions((prev) => [session, ...prev]);
    setInitialMessages([]);
    setCurrentSessionId(session.id);
    setHistoryOpen(false);
  }

  async function handleSelectSession(id: string) {
    await loadSessionMessages(id);
    setHistoryOpen(false);
  }

  function toggleExpand() {
    const next = !expanded;

    setExpanded(next);

    window.parent.postMessage(
      {
        type: "easy-re-widget-expand",
        expanded: next,
      },
      "*",
    );
  }

  /*
   * IMPORTANT:
   *
   * Every visitor is allowed to change position.
   *
   * We ALWAYS:
   *   1. update React state
   *   2. tell widget.js to move the launcher
   *
   * We DO NOT save here.
   *
   * Persistence belongs to the owner's authenticated dashboard/API.
   * That prevents an anonymous visitor from changing the org's
   * permanent setting.
   */
  function handleTogglePosition() {
    const next: WidgetPosition =
      position === "bottom-left"
        ? "bottom-right"
        : "bottom-left";

    // Session-only state.
    setPosition(next);

    // Move the actual launcher in widget.js immediately.
    window.parent.postMessage(
      {
        type: "easy-re-widget-position",
        position: next,
      },
      "*",
    );
  }

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
    <div className="flex flex-col h-full relative">
      <WidgetTopBar
        showExpandToggle={!isMobileHost}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        showHistoryToggle={hasIdentity}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        onClose={handleClose}
        widgetPosition={position}
        onTogglePosition={handleTogglePosition}
      />

      {historyOpen && hasIdentity && (
        <WidgetHistoryPanel
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
        />
      )}

      <ChatPanel
        key={currentSessionId}
        initialMessages={initialMessages}
        onTurnComplete={handleTurnComplete}
        orgSlug={orgSlug}
        embedKey={embedKey}
      />
    </div>
  );
}

