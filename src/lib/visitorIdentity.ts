const STORAGE_KEY = "easy_re_visitor_id";

/**
 * Returns a stable identifier for this visitor.
 * Priority: an explicitly passed-in id (from the host site's own login)
 * always wins. Otherwise, falls back to a random id persisted in
 * localStorage so the same browser is recognized on return visits.
 */
export function getVisitorKey(explicitId?: string | null): string {
  if (explicitId) return explicitId;

  if (typeof window === "undefined") return ""; // SSR guard, never actually used server-side

  let stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    stored = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, stored);
  }
  return stored;
}

/**
 * Clears the anonymous visitor id from this browser. Call this on an
 * explicit "end chat" action so the next person on a shared/public
 * computer doesn't inherit the previous visitor's conversation history —
 * this is the exact bug class Intercom has documented and fixed for.
 * Does nothing (and shouldn't be called) when an explicitId was in use,
 * since that identity belongs to the host site, not us.
 */
export function clearAnonymousVisitorKey() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}