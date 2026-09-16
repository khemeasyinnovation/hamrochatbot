/** Cache successful probes only; concurrent requests share one discovery pass. */
export function createModelResolver({
  candidates,
  probe,
  now = Date.now,
  cacheMs = 30 * 60 * 1000,
}: {
  candidates: readonly string[];
  probe: (model: string) => Promise<void>;
  now?: () => number;
  cacheMs?: number;
}) {
  let cached: { model: string; at: number } | undefined;
  let pending: Promise<string> | undefined;
  let revision = 0;

  async function discover(startRevision: number, probeCandidate = probe) {
    for (const model of candidates) {
      try {
        await probeCandidate(model);
        if (revision === startRevision) cached = { model, at: now() };
        return model;
      } catch {
        // Preserve candidate fallback without logging provider errors or credentials.
      }
    }
    throw new Error("All candidate Gemini models are currently unavailable.");
  }

  return {
    resolve(probeCandidate = probe): Promise<string> {
      if (cached && now() - cached.at < cacheMs) return Promise.resolve(cached.model);
      if (!pending) {
        const request = discover(revision, probeCandidate).finally(() => {
          if (pending === request) pending = undefined;
        });
        pending = request;
      }
      return pending;
    },
    invalidate() {
      cached = undefined;
      pending = undefined;
      revision += 1;
    },
  };
}
