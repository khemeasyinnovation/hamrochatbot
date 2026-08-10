"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ApiMessage,
  ApiSession,
  ApiUser,
  fetchMe,
  logout as apiLogout,
  listSessions,
  createSession,
  getSession,
  saveSessionMessages,
  deleteSessionApi,
  titleFromMessages,
} from "@/lib/chatApi";

type Ctx = {
  user: ApiUser | null | "loading";
  sessions: ApiSession[];
  currentSessionId: string;
  currentMessages: ApiMessage[];
  loadingSession: boolean;
  selectSession: (id: string) => Promise<void>;
  newChat: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  turnComplete: (msgs: ApiMessage[]) => void;
  logout: () => Promise<void>;
};

const DashboardChatCtx = createContext<Ctx | null>(null);

export function useDashboardChat() {
  const ctx = useContext(DashboardChatCtx);
  if (!ctx) throw new Error("useDashboardChat must be used inside DashboardChatProvider");
  return ctx;
}

export function DashboardChatProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null | "loading">("loading");
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [currentMessages, setCurrentMessages] = useState<ApiMessage[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const autoCreatedRef = useRef(false);
  const sessionsWithMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchMe().then((u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user || user === "loading") return;
    listSessions().then((list) => setSessions(list));
    if (!currentSessionId && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      newChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cleanupIfEmpty = useCallback(async (id: string): Promise<boolean> => {
    if (!id || sessionsWithMessagesRef.current.has(id)) return false;
    try {
      await deleteSessionApi(id);
    } catch {}
    setSessions((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  async function selectSession(id: string) {
    const prevId = currentSessionId;
    setLoadingSession(true);
    const { messages } = await getSession(id);
    if (messages.length > 0) sessionsWithMessagesRef.current.add(id);
    setCurrentMessages(messages);
    setCurrentSessionId(id);
    setLoadingSession(false);
    if (prevId && prevId !== id) cleanupIfEmpty(prevId);
  }

  async function newChat() {
    const prevId = currentSessionId;
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setCurrentMessages([]);
    setCurrentSessionId(session.id);
    if (prevId && prevId !== session.id) cleanupIfEmpty(prevId);
  }

  async function deleteSession(id: string) {
    await deleteSessionApi(id);
    sessionsWithMessagesRef.current.delete(id);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (id === currentSessionId) {
      if (remaining.length > 0) selectSession(remaining[0].id);
      else await newChat();
    }
  }

  const turnComplete = useCallback(
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
        return next.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      });
    },
    [currentSessionId],
  );

  async function logout() {
    await cleanupIfEmpty(currentSessionId);
    await apiLogout();
    window.location.href = "/";
  }

  return (
    <DashboardChatCtx.Provider
      value={{
        user,
        sessions,
        currentSessionId,
        currentMessages,
        loadingSession,
        selectSession,
        newChat,
        deleteSession,
        turnComplete,
        logout,
      }}
    >
      {children}
    </DashboardChatCtx.Provider>
  );
}