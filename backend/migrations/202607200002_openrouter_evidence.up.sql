CREATE TABLE tsc_runtime_ai_results (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES tsc_users(id) ON DELETE RESTRICT,
  feature VARCHAR(80) NOT NULL CHECK (feature = 'assay-readiness'),
  input JSONB NOT NULL,
  provider_request_id TEXT NOT NULL,
  provider_model TEXT NOT NULL,
  result_text TEXT NOT NULL CHECK (length(result_text) >= 40),
  provider_receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (provider_receipt->>'requestId' = provider_request_id)
);
CREATE INDEX tsc_runtime_ai_results_tenant_created ON tsc_runtime_ai_results(tenant_id, created_at DESC);
CREATE TRIGGER tsc_runtime_ai_results_append_only BEFORE UPDATE OR DELETE ON tsc_runtime_ai_results FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
