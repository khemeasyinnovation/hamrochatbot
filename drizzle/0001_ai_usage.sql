-- Additive migration. Apply once with scripts/apply-usage-migration.cjs.
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES public.orgs(id),
  user_id uuid,
  session_id uuid,
  surface text NOT NULL,
  task text NOT NULL,
  operation text NOT NULL,
  mode text NOT NULL DEFAULT 'managed',
  provider text NOT NULL DEFAULT 'google',
  model text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  tokens_in bigint, tokens_out bigint, tokens_total bigint,
  tokens_cached bigint, tokens_reasoning bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX ai_usage_org_created_idx ON public.ai_usage(org_id, created_at);
CREATE INDEX ai_usage_user_created_idx ON public.ai_usage(user_id, created_at);
-- Browser Supabase roles get no direct access. Only the server database connection writes.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM PUBLIC;
