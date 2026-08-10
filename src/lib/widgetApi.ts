export type WidgetSession = { id: string; title: string; updatedAt: string };

export async function listWidgetSessions(
  orgSlug: string,
  visitorKey: string,
  embedKey?: string | null,
): Promise<WidgetSession[]> {
  const res = await fetch(
    `/api/widget/sessions?org=${encodeURIComponent(orgSlug)}&visitor=${encodeURIComponent(
      visitorKey,
    )}&key=${encodeURIComponent(embedKey ?? "")}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load chats");
  return data.sessions ?? [];
}

export async function createWidgetSession(
  orgSlug: string,
  visitorKey: string,
  embedKey?: string | null,
): Promise<WidgetSession> {
  const res = await fetch("/api/widget/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgSlug, visitorKey, embedKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start chat");
  return data.session;
}

export async function getWidgetSession(
  id: string,
  orgSlug: string,
  visitorKey: string,
  embedKey?: string | null,
) {
  const res = await fetch(
    `/api/widget/sessions/${id}?visitor=${encodeURIComponent(visitorKey)}&org=${encodeURIComponent(
      orgSlug,
    )}&key=${encodeURIComponent(embedKey ?? "")}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load messages");
  return data.messages ?? [];
}

export async function saveWidgetSessionMessages(
  id: string,
  orgSlug: string,
  visitorKey: string,
  embedKey: string | null | undefined,
  messages: unknown[],
) {
  await fetch(`/api/widget/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorKey, orgSlug, embedKey, messages }),
  }).catch(() => {
    // best-effort autosave
  });
}