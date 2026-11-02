CREATE TABLE public.decision_batches (
  id text NOT NULL,
  executive_id text NOT NULL,
  batch_json text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  updated_at text NOT NULL,
  firm_id text NOT NULL DEFAULT current_setting('app.firm_id', true),
  PRIMARY KEY (firm_id, id)
);
CREATE TABLE public.decision_responses (
  id text NOT NULL,
  batch_id text NOT NULL,
  item_id text NOT NULL,
  action_json text NOT NULL,
  recorded_at text NOT NULL,
  firm_id text NOT NULL DEFAULT current_setting('app.firm_id', true),
  PRIMARY KEY (firm_id, id)
);
GRANT ALL ON public.decision_batches TO service_role;
GRANT ALL ON public.decision_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_batches TO anya_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_responses TO anya_tenant;
ALTER TABLE public.decision_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY firm_isolation ON public.decision_batches FOR ALL TO anya_tenant USING (firm_id = current_setting('app.firm_id', true)) WITH CHECK (firm_id = current_setting('app.firm_id', true));
CREATE POLICY firm_isolation ON public.decision_responses FOR ALL TO anya_tenant USING (firm_id = current_setting('app.firm_id', true)) WITH CHECK (firm_id = current_setting('app.firm_id', true));
CREATE INDEX idx_decision_batches_exec ON public.decision_batches (firm_id, executive_id);
CREATE INDEX idx_decision_responses_batch ON public.decision_responses (firm_id, batch_id);