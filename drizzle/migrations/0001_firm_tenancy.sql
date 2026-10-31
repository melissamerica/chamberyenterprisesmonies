CREATE TYPE public.firm_role AS ENUM ('owner','admin','editor','viewer');

CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sso_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.firms TO service_role;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.firm_members (
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  role public.firm_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (firm_id, user_id)
);
CREATE INDEX idx_firm_members_user ON public.firm_members(user_id);
GRANT ALL ON public.firm_members TO service_role;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.firm_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.firm_role NOT NULL DEFAULT 'editor',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, email)
);
GRANT ALL ON public.firm_invites TO service_role;
ALTER TABLE public.firm_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  team_size text,
  product text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_requests TO service_role;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Per-firm isolation for workspace tables
CREATE ROLE anya_tenant NOLOGIN;
GRANT anya_tenant TO service_role;
GRANT USAGE ON SCHEMA public TO anya_tenant;

DO $$ DECLARE t text; pk text; BEGIN
  FOR t, pk IN SELECT * FROM (VALUES
    ('custom_templates','traveler_id'),('executive_upload_files','id'),('executive_upload_trips','trip_id'),
    ('executive_upload_exclusions','id'),('executive_vendor_rules','id'),('executive_deferred_uploads','id'),
    ('itinerary_attachments','id'),('template_library','id'),('executive_unassigned_uploads','id'),
    ('expense_approval_requests','id'),('billing_codes','id'),('executive_profiles','executive_id'),
    ('expense_learning_decisions','id'),('expense_learning_preferences','id'),('expense_learning_settings','executive_id')) v(a,b)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN firm_id text NOT NULL DEFAULT current_setting(''app.firm_id'', true)', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, t || '_pkey');
    EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (firm_id, %I)', t, pk);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anya_tenant', t);
    EXECUTE format('CREATE POLICY firm_isolation ON public.%I FOR ALL TO anya_tenant USING (firm_id = current_setting(''app.firm_id'', true)) WITH CHECK (firm_id = current_setting(''app.firm_id'', true))', t);
  END LOOP;
END $$;

DROP INDEX public.idx_billing_codes_key;
CREATE UNIQUE INDEX idx_billing_codes_key ON public.billing_codes (firm_id, code_key);
DROP INDEX public.idx_expense_approvals_active_trip;
CREATE UNIQUE INDEX idx_expense_approvals_active_trip ON public.expense_approval_requests (firm_id, trip_id) WHERE status IN ('draft','sending','pending','approved','delivery_unknown');

DROP FUNCTION public.anya_exec(jsonb);
CREATE OR REPLACE FUNCTION public.anya_exec(batch jsonb, firm text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  stmt jsonb; src text; params jsonb; outsql text; i int; n int; ch text; num text; pos int; in_str boolean;
  result jsonb := '[]'::jsonb; rows jsonb; cnt bigint;
BEGIN
  IF firm IS NULL OR length(firm) < 8 THEN RAISE EXCEPTION 'firm required'; END IF;
  PERFORM set_config('app.firm_id', firm, true);
  SET LOCAL ROLE anya_tenant;
  FOR stmt IN SELECT * FROM jsonb_array_elements(batch) LOOP
    src := stmt->>'sql'; params := coalesce(stmt->'params','[]'::jsonb);
    outsql := ''; i := 1; n := length(src); pos := 0; in_str := false;
    WHILE i <= n LOOP
      ch := substr(src, i, 1);
      IF ch = '''' THEN in_str := NOT in_str; outsql := outsql || ch; i := i + 1;
      ELSIF ch = '?' AND NOT in_str THEN
        num := ''; i := i + 1;
        WHILE i <= n AND substr(src, i, 1) ~ '[0-9]' LOOP num := num || substr(src, i, 1); i := i + 1; END LOOP;
        IF num = '' THEN pos := pos + 1; ELSE pos := num::int; END IF;
        IF params->(pos-1) IS NULL OR jsonb_typeof(params->(pos-1)) = 'null' THEN outsql := outsql || 'NULL';
        ELSE outsql := outsql || quote_literal(params->>(pos-1)); END IF;
      ELSE outsql := outsql || ch; i := i + 1; END IF;
    END LOOP;
    outsql := regexp_replace(outsql, 'ON CONFLICT\s*\(', 'ON CONFLICT(firm_id, ', 'gi');
    IF coalesce((stmt->>'returns')::boolean, false) THEN
      EXECUTE 'WITH q AS (' || outsql || ') SELECT coalesce(jsonb_agg(to_jsonb(q) - ''firm_id''), ''[]''::jsonb) FROM q' INTO rows;
      cnt := jsonb_array_length(rows);
    ELSE
      EXECUTE outsql; GET DIAGNOSTICS cnt = ROW_COUNT; rows := '[]'::jsonb;
    END IF;
    result := result || jsonb_build_array(jsonb_build_object('results', rows, 'changes', cnt));
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.anya_exec(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anya_exec(jsonb, text) TO service_role;