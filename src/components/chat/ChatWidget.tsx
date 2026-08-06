"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiMessage,
  ApiSession,
  ApiUser,
  fetchMe,
  logout,
  listSessions,
  createSession,
  getSession,
  saveSessionMessages,
  deleteSessionApi,
  titleFromMessages,
} from "@/lib/chatApi";
import { ChatBubbleButton } from "./ChatBubbleButton";
import { ChatPanel } from "./ChatPanel";
import { AuthForm } from "./AuthForm";
import { HistorySidebar } from "./HistorySidebar";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<ApiUser | null | "loading">("loading");
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [currentMessages, setCurrentMessages] = useState<ApiMessage[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const autoCreatedRef = useRef(false);

  const sessionsWithMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "easy-re-widget", open }, "*");
  }, [open]);

  useEffect(() => {
    if (!open || user !== "loading") return;
    fetchMe().then((u) => setUser(u));
  }, [open, user]);

  useEffect(() => {
    if (!open || !user || user === "loading") return;
    listSessions().then((list) => setSessions(list));
    if (!currentSessionId && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      handleNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const cleanupIfEmpty = useCallback(async (id: string): Promise<boolean> => {
    if (!id || sessionsWithMessagesRef.current.has(id)) return false;
    try {
      await deleteSessionApi(id);
    } catch {
      // best-effort cleanup
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  async function handleSelectSession(id: string) {
    const prevId = currentSessionId;
    setSidebarOpen(false);
    setLoadingSession(true);
    const { messages } = await getSession(id);
    if (messages.length > 0) sessionsWithMessagesRef.current.add(id);
    setCurrentMessages(messages);
    setCurrentSessionId(id);
    setLoadingSession(false);
    if (prevId && prevId !== id) cleanupIfEmpty(prevId);
  }

  async function handleNewChat() {
    const prevId = currentSessionId;
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setCurrentMessages([]);
    setCurrentSessionId(session.id);
    setSidebarOpen(false);
    if (prevId && prevId !== session.id) cleanupIfEmpty(prevId);
  }

  async function handleDeleteSession(id: string) {
    await deleteSessionApi(id);
    sessionsWithMessagesRef.current.delete(id);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (id === currentSessionId) {
      if (remaining.length > 0) handleSelectSession(remaining[0].id);
      else await handleNewChat();
    }
  }

  const handleTurnComplete = useCallback(
    (msgs: ApiMessage[]) => {
      sessionsWithMessagesRef.current.add(currentSessionId);
      const title = titleFromMessages(msgs);
      saveSessionMessages(currentSessionId, msgs, title);
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === currentSessionId);
        const updated: ApiSession = {
          id: currentSessionId,
          title,
          updatedAt: new Date().toISOString(),
        };
        const next = [...prev];
        if (idx >= 0) next[idx] = updated;
        else next.unshift(updated);
        return next.sort(
          (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
        );
      });
    },
    [currentSessionId],
  );

  async function handleLogout() {
    await cleanupIfEmpty(currentSessionId);
    await logout();
    setUser(null);
    setSessions([]);
    setCurrentSessionId("");
    setCurrentMessages([]);
    autoCreatedRef.current = false;
    sessionsWithMessagesRef.current = new Set();
  }

  async function handleCloseWidget() {
    const deleted = await cleanupIfEmpty(currentSessionId);
    if (deleted) {
      setCurrentSessionId("");
      setCurrentMessages([]);
      autoCreatedRef.current = false;
    }
    setOpen(false);
  }

  return (
    <>
      {!open && <ChatBubbleButton onClick={() => setOpen(true)} />}

      {open && (
        <div className="fixed z-50 bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col font-sans inset-0 w-screen h-dvh sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[720px] sm:h-[560px] sm:rounded-2xl">
          <div className="bg-[#0b2545] text-white px-4 py-4 flex items-center justify-between shrink-0 z-30 relative">
            <div className="flex items-center gap-2 min-w-0">
              {user && user !== "loading" && (
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="text-slate-300 hover:text-white text-xl leading-none"
                  title={sidebarOpen ? "Back to chat" : "Chat history"}
                >
                  ☰
                </button>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  Easy Real Estate Assistant
                </p>
                <p className="text-slate-300 text-xs">
                  Properties in Kaski, Pokhara
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseWidget}
              className="text-slate-300  hover:text-white text-3xl"
            >
              ×
            </button>
          </div>

          <div className="flex-1 relative min-h-0">
            {user && user !== "loading" && (
              <HistorySidebar
                open={sidebarOpen}
                user={user}
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
                onLogout={handleLogout}
                onClose={() => setSidebarOpen(false)}
              />
            )}

            <div className="absolute inset-0 flex flex-col">
              {user === "loading" && (
                <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
                  Loading...
                </div>
              )}

              {user === null && <AuthForm onAuthed={(u) => setUser(u)} />}

              {user &&
                user !== "loading" &&
                (loadingSession ? (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
                    Loading chat...
                  </div>
                ) : currentSessionId ? (
                  <ChatPanel
                    key={currentSessionId}
                    initialMessages={currentMessages}
                    onTurnComplete={handleTurnComplete}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
                    Setting up your chat...
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}