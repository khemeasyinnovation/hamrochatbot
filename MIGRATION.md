# HamRobot migration log

Reference: HamRobot Master Architecture and Implementation Guide v3, sections 14-16.

## Current checkpoint - 2026-09-16

The user explicitly prioritized Knowledge/setup and the pending payment boundary.
That reconciles advancing P2 and the P3 setup UI alongside the remaining P1 work;
the usage-before-BYOK dependency is unchanged. All changes are local, not deployed.

### Implemented in this continuation

- **Knowledge:** arbitrary business text remains supported. Added starter topic
  buttons, a business-creation empty state, clearer forms, error/retry states,
  deletion confirmation, and matching entry limits. Search no longer overwrites
  an unsaved description; stale search responses cannot overwrite newer results.
  Entry edits check org ownership before making an embedding call. No fictional
  business facts or test fixtures were inserted into the database.
- **Setup:** Widget Overview now shows saved Knowledge count, payment, design,
  and domain state, with a next action and links to each area. Installation is
  explicitly not automatically detected. Failed org requests no longer masquerade
  as a missing business. Clipboard failures are reported.
- **Payment boundary:** unpaid public widgets are blocked at `/embed`, all Widget
  session endpoints, and `/api/chat`. Owner configuration and owner Chat remain
  available without Widget payment. The same shared policy applies to every org;
  `hamrochatbot-support` must also have a confirmed activation record.
- **Payment handling:** already-activated orgs cannot start another activation
  payment. Callback validation checks signed activation fields, merchant code,
  transaction existence, and recorded amount before independent provider status
  confirmation. Payment completion and `isPaid` update happen in one transaction.
  Secret/signature logging was removed. The UI trusts saved `isPaid`, not a success
  query parameter. Payment remains the existing NPR 999 **sandbox** flow.
- **P1:** owner Chat now requires authentication and an owned Chat session; Widget
  generation requires paid org/key plus an org/visitor-owned session. Removed the
  default-org bypass. Owner RAG uses the owner's org rather than shared demo data.
  Owner Chat also works before business creation. Server-resolved context reaches
  the gateway. Explicit lowercase/uppercase transformations use no provider.
- **Context:** at most 12 recent text messages / 16,000 history characters, an
  8,000-character current-message limit, 8,000 retrieved characters, 2,000 per
  retrieved entry, and 2,000 description characters. Client system/tool roles are
  excluded. Retrieval uses existing top-k plus cosine-distance cutoff 0.7; this
  initial threshold still needs calibration on representative business questions.
- **Chat/UI:** bounded reading width, improved empty state, visible errors/retry,
  Stop control, and composer safe-area spacing. Browser QA found the in-app support
  launcher covering Send; it now reserves 72px above the Chat composer and updates
  after client-side navigation. Customer-site launcher positioning is unchanged.

### Verification

- `npm test`: **24 passed**, including actual chat/payment route handlers with
  mocked database/provider boundaries, access policy, signatures, context budgets,
  deterministic responses, gateway streaming, and widget regressions.
- `node node_modules/next/dist/bin/next typegen`: passed.
- `tsc --noEmit --types node,react,react-dom`: passed. The earlier default ambient
  type-discovery issue remains a dependency-installation issue, not claimed fixed.
- Targeted ESLint passed for the new gateway/context/access/validation modules,
  Setup Overview, Chat route, and new TypeScript tests.
- Headless Edge browser checks passed at **390px and 1440px** using intercepted
  API fixtures: Widget, Knowledge, Payment, Chat, horizontal overflow, visible
  composer, launcher separation, unsaved-description preservation, unverified
  success query, and paid-state removal of the Pay button. Screenshots in `tmp/ui/`
  were inspected. These are fixture tests, not live account/database tests.
- Re-run browser checks with the dev server running:
  `node tests/browser-smoke.cjs tmp/browser/node_modules/playwright`.
  The temporary Playwright package was installed under `tmp/browser`; the script
  also accepts a different module path and `HAMROBOT_BROWSER` executable path.
- No database migration, real payment, live provider call, or deployment was run.

### Remaining gates and BYOK path

| Order | Work | Planning estimate | Exit condition |
| --- | --- | --- | --- |
| 1 | Live P0/P1/P2 regressions and retrieval tuning | Depends on test accounts/data | Auth/history, paid/unpaid Widget, domains, KB CRUD, eSewa sandbox roundtrip, support org local/production checked |
| 2 | P4 actual usage ledger | 1-2 focused working days | Every generation, embedding, probe/retry request attributed once; actual reported usage and unknown usage distinguished |
| 3 | P5 allowance and Usage UI | 1-2 days | Used/remaining visible; zero managed allowance stops generation safely; concurrent requests accounted for |
| 4 | P6 optional premium BYOK | 2-4 days | Server-side credential validation, encryption, replace/revoke, provider selection behind gateway, tenant-isolation tests |
| 5 | P7 real billing products | 1-2 days | Usage top-up/BYOK entitlements tied to confirmed payments |
| 6 | P8 installation detection | 1-3 days | Actual installation evidence, independent of payment/design state |

The usage + allowance + BYOK sequence is roughly **4-8 focused working days after
the regression gate**, not a delivery promise. Premium BYOK billing depends on
P7; do not present a working purchase button before that entitlement exists.
Managed AI remains the default; BYOK must never be required for normal Widget use.

Still pending: custom logo selection/upload, complete live/mobile-keyboard QA,
usage/allowance schema and UI, encrypted BYOK storage, production merchant setup,
and the remaining migration phases. PDF/web ingestion, memory, model training,
and learners remain future work. Current deterministic routing is deliberately
small; broader intent routing and deterministic KB-miss policies need separate
coverage before P1 is called fully complete.

---

## Earlier checkpoint (historical)

## 2026-09-16 - P1: shared provider boundary

Continued the existing `src/lib/aiGateway/types.ts` scaffold. Existing uncommitted
widget and dashboard work was retained.

- Moved generation, Gemini model discovery/fallback, cache invalidation, and
  embedding behind `src/lib/aiGateway/index.ts`.
- Routed the existing Chat/Widget chat endpoint through that gateway. Kept the
  existing system instructions, org-scoped retrieval, top-k, and UI stream protocol.
- Kept `lib/gemini.ts` as a compatibility re-export for KB CRUD and ingestion.
- Explicitly configured both Google clients with `GEMINI_API_KEY`, matching the
  guide. Previously the generation SDK implicitly used its own environment key.
- Preserved the existing generation candidates, 30-minute model cache, and
  `gemini-embedding-001` embedding format. Concurrent discovery now shares probes;
  failed or invalidated probes cannot leave stale cache state.
- Returned the SDK stream intact so actual usage metadata remains available.
  Probe calls are still provider calls; P4 must account for them as well as
  embeddings, generation, retries, and failed requests with reported usage.

Validation:

- `npm test`: nine passing tests, covering gateway credentials, embedding
  compatibility, UI streaming, provider usage metadata, model fallback/expiry,
  concurrent requests, failure recovery, invalidation races, and widget regressions.
- Provider HTTP responses are mocked; no live AI calls or database mutations.
- Full TypeScript validation encountered missing installed `@types` packages
  (`debug`, `estree`, `hast`, and others), including outside the sandbox.
- `tsc --noEmit --types node,react,react-dom` passed. This validates the project
  while avoiding automatic discovery of those missing ambient type packages;
  it does not repair the dependency installation.
- Live auth, KB CRUD, domain allow/block, eSewa, and local/production dogfooding
  still require regression verification. P0 is not claimed complete.

Next work within P1:

1. Carry server-validated org/surface/session/user/visitor context through requests.
   The exported context type is a contract scaffold, not implemented authorization.
2. Add deterministic routing separately from generation.
3. Introduce bounded recent history, context budgets, and relevance filtering.
4. Verify Widget KB-miss behavior and the complete baseline regression checklist.

P1 is not complete. Follow the guide's order after P1: P2 payment enforcement,
P3 Setup Center, P4 actual usage ledger, P5 allowance UX, then P6 optional BYOK.
Future document ingestion, memory, and own-model training remain deferred.
