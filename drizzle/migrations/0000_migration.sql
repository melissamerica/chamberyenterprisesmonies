CREATE TABLE public.custom_templates (traveler_id text PRIMARY KEY, traveler_name text NOT NULL, template_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.executive_upload_files (id text PRIMARY KEY, executive_id text NOT NULL, filename text NOT NULL, object_key text NOT NULL, content_type text NOT NULL, created_at text NOT NULL);
CREATE TABLE public.executive_upload_trips (trip_id text PRIMARY KEY, executive_id text NOT NULL, trip_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.executive_upload_exclusions (id text PRIMARY KEY, executive_id text NOT NULL, source_file_id text NOT NULL, row_json text NOT NULL, approved_at text NOT NULL);
CREATE TABLE public.executive_vendor_rules (id text PRIMARY KEY, executive_id text NOT NULL, rule_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.executive_deferred_uploads (id text PRIMARY KEY, executive_id text NOT NULL, row_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.itinerary_attachments (id text PRIMARY KEY, trip_id text NOT NULL, executive_id text NOT NULL, entry_id text NOT NULL, byte_count integer NOT NULL, created_at text NOT NULL, updated_at text NOT NULL);
CREATE INDEX idx_itinerary_attachments_trip_entry ON public.itinerary_attachments (trip_id, entry_id);
CREATE TABLE public.template_library (id text PRIMARY KEY, template_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.executive_unassigned_uploads (id text PRIMARY KEY, executive_id text NOT NULL, executive_name text NOT NULL, row_json text NOT NULL, updated_at text NOT NULL);
CREATE INDEX idx_unassigned_uploads_executive ON public.executive_unassigned_uploads (executive_id);
CREATE TABLE public.expense_approval_requests (id text PRIMARY KEY, trip_id text NOT NULL, executive_id text NOT NULL, approver_email text NOT NULL, token_hash text NOT NULL, send_token_hash text NOT NULL, snapshot_json text NOT NULL, documents_json text NOT NULL, status text NOT NULL, signature_name text, signed_at text, notes text, clarification text NOT NULL DEFAULT '', message_id text, created_at text NOT NULL, updated_at text NOT NULL);
CREATE INDEX idx_expense_approvals_trip ON public.expense_approval_requests (trip_id);
CREATE INDEX idx_expense_approvals_token ON public.expense_approval_requests (token_hash);
CREATE INDEX idx_expense_approvals_send_token ON public.expense_approval_requests (send_token_hash);
CREATE UNIQUE INDEX idx_expense_approvals_active_trip ON public.expense_approval_requests (trip_id) WHERE status IN ('draft','sending','pending','approved','delivery_unknown');
CREATE TABLE public.billing_codes (id text PRIMARY KEY, code text NOT NULL, code_key text NOT NULL, label text NOT NULL, active integer NOT NULL DEFAULT 1, updated_at text NOT NULL, executive_ids_json text NOT NULL DEFAULT '[]');
CREATE UNIQUE INDEX idx_billing_codes_key ON public.billing_codes (code_key);
CREATE TABLE public.executive_profiles (executive_id text PRIMARY KEY, name text NOT NULL, profile_json text NOT NULL, updated_at text NOT NULL);
CREATE TABLE public.expense_learning_decisions (id text PRIMARY KEY, executive_id text NOT NULL, row_key text NOT NULL, decision_json text NOT NULL, recorded_at text NOT NULL, active integer NOT NULL DEFAULT 1);
CREATE INDEX idx_learning_decisions_executive_time ON public.expense_learning_decisions (executive_id, recorded_at);
CREATE TABLE public.expense_learning_preferences (id text PRIMARY KEY, executive_id text NOT NULL, preference_json text NOT NULL, updated_at text NOT NULL, active integer NOT NULL DEFAULT 1);
CREATE INDEX idx_learning_preferences_executive ON public.expense_learning_preferences (executive_id);
CREATE TABLE public.expense_learning_settings (executive_id text PRIMARY KEY, enabled integer NOT NULL DEFAULT 1, updated_at text NOT NULL);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['custom_templates','executive_upload_files','executive_upload_trips','executive_upload_exclusions','executive_vendor_rules','executive_deferred_uploads','itinerary_attachments','template_library','executive_unassigned_uploads','expense_approval_requests','billing_codes','executive_profiles','expense_learning_decisions','expense_learning_preferences','expense_learning_settings'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Server-only batch executor mirroring Cloudflare D1 prepare/bind/batch semantics.
-- Each statement: {"sql": text, "params": [..], "returns": bool}. Runs atomically.
CREATE OR REPLACE FUNCTION public.anya_exec(batch jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  stmt jsonb; src text; params jsonb; outsql text; i int; n int; ch text; num text; pos int; in_str boolean;
  result jsonb := '[]'::jsonb; rows jsonb; cnt bigint;
BEGIN
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
    IF coalesce((stmt->>'returns')::boolean, false) THEN
      EXECUTE 'WITH q AS (' || outsql || ') SELECT coalesce(jsonb_agg(to_jsonb(q)), ''[]''::jsonb) FROM q' INTO rows;
      cnt := jsonb_array_length(rows);
    ELSE
      EXECUTE outsql; GET DIAGNOSTICS cnt = ROW_COUNT; rows := '[]'::jsonb;
    END IF;
    result := result || jsonb_build_array(jsonb_build_object('results', rows, 'changes', cnt));
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.anya_exec(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anya_exec(jsonb) TO service_role;