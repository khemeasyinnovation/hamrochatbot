export type ApiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: { type: string; text?: string }[];
};
export type ApiSession = { id: string; title: string; updatedAt: string };
export type ApiUser = { id: string; email: string };

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  console.log("[signup/login raw response]", res.status, text);
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const fetchMe = () =>
  fetch("/api/auth/me").then((r) => r.json()).then((d) => d.user as ApiUser | null);

export type SignupResult =
  | ApiUser
  | { needsConfirmation: true; email: string };

export const signup = (email: string, password: string) =>
  fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => json<SignupResult>(r));

export const login = (email: string, password: string) =>
  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => json<ApiUser>(r));

  export const verifyOtp = (email: string, token: string) =>
  fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token }),
  }).then((r) => json<ApiUser>(r));

export const logout = () => fetch("/api/auth/logout", { method: "POST" });

export const listSessions = () =>
  fetch("/api/chat/sessions").then((r) => r.json()).then((d) => d.sessions as ApiSession[]);

export const createSession = () =>
  fetch("/api/chat/sessions", { method: "POST" }).then((r) => r.json()).then((d) => d.session as ApiSession);

export const getSession = (id: string) =>
  fetch(`/api/chat/sessions/${id}`).then((r) => r.json()) as Promise<{ session: ApiSession; messages: ApiMessage[] }>;

export const saveSessionMessages = (id: string, messages: ApiMessage[], title?: string) =>
  fetch(`/api/chat/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, title }),
  });

export const deleteSessionApi = (id: string) =>
  fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });

export function titleFromMessages(messages: ApiMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser?.parts?.find((p) => p.type === "text")?.text ?? "New chat";
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}