CREATE TABLE tsc_tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR(80) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tsc_users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(24) NOT NULL CHECK (role IN ('TENANT_ADMIN','SCIENTIST','QUALITY_REVIEWER','INSTRUMENT_SERVICE','AUDITOR')),
  service_source_system VARCHAR(80),
  service_instrument_key VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((role = 'INSTRUMENT_SERVICE' AND service_source_system IS NOT NULL AND service_instrument_key IS NOT NULL) OR (role <> 'INSTRUMENT_SERVICE' AND service_source_system IS NULL AND service_instrument_key IS NULL))
);
CREATE INDEX tsc_users_tenant ON tsc_users(tenant_id, role, active);

CREATE TABLE tsc_instruments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  external_key VARCHAR(120) NOT NULL,
  source_system VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  instrument_type VARCHAR(30) NOT NULL CHECK (instrument_type IN ('PLATE_READER','HPLC','MASS_SPEC','FLOW_CYTOMETER')),
  serial_number VARCHAR(120) NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('ACTIVE','MAINTENANCE','RETIRED')),
  calibrated_at TIMESTAMPTZ NOT NULL,
  calibration_due_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES tsc_users(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, external_key),
  UNIQUE (tenant_id, serial_number),
  CHECK (calibration_due_at > calibrated_at)
);

CREATE TABLE tsc_samples (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  sample_code VARCHAR(120) NOT NULL,
  description VARCHAR(300) NOT NULL,
  matrix VARCHAR(100) NOT NULL,
  state VARCHAR(16) NOT NULL CHECK (state IN ('ACTIVE','CONSUMED','RETIRED')),
  created_by UUID NOT NULL REFERENCES tsc_users(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sample_code)
);

CREATE TABLE tsc_ingestion_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  instrument_id UUID REFERENCES tsc_instruments(id) ON DELETE RESTRICT,
  source_system VARCHAR(80) NOT NULL,
  source_record_id VARCHAR(180) NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_checksum CHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('RECEIVED','PROCESSED','REJECTED','ERROR')),
  error_code VARCHAR(80),
  error_message VARCHAR(300),
  assay_run_id UUID,
  UNIQUE (tenant_id, source_system, source_record_id)
);
CREATE INDEX tsc_ingestion_status_time ON tsc_ingestion_events(tenant_id, status, received_at DESC);

CREATE TABLE tsc_assay_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES tsc_instruments(id) ON DELETE RESTRICT,
  ingestion_event_id UUID UNIQUE NOT NULL REFERENCES tsc_ingestion_events(id) ON DELETE RESTRICT,
  external_run_key VARCHAR(160) NOT NULL,
  protocol_id VARCHAR(120) NOT NULL,
  protocol_version VARCHAR(40) NOT NULL,
  assay_type VARCHAR(30) NOT NULL CHECK (assay_type IN ('POTENCY','PURITY','BINDING','CELL_VIABILITY')),
  required_analyte VARCHAR(120) NOT NULL,
  result_unit VARCHAR(20) NOT NULL CHECK (result_unit IN ('RFU','PERCENT','NM','MG_PER_ML')),
  minimum_replicates INTEGER NOT NULL CHECK (minimum_replicates BETWEEN 1 AND 12),
  lower_bound NUMERIC(24,8),
  upper_bound NUMERIC(24,8),
  captured_at TIMESTAMPTZ NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('VALIDATED','QUARANTINED','SUBMITTED','RELEASED','REJECTED','WITHDRAWN')),
  revision_of_id UUID REFERENCES tsc_assay_runs(id) ON DELETE RESTRICT,
  submitted_by UUID REFERENCES tsc_users(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ,
  released_by UUID REFERENCES tsc_users(id) ON DELETE RESTRICT,
  released_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, external_run_key),
  CHECK (lower_bound IS NULL OR upper_bound IS NULL OR lower_bound <= upper_bound)
);
ALTER TABLE tsc_ingestion_events ADD CONSTRAINT tsc_ingestion_run_fk FOREIGN KEY (assay_run_id) REFERENCES tsc_assay_runs(id) ON DELETE RESTRICT;
CREATE INDEX tsc_runs_tenant_state ON tsc_assay_runs(tenant_id, state, captured_at DESC);

CREATE TABLE tsc_measurements (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  assay_run_id UUID NOT NULL REFERENCES tsc_assay_runs(id) ON DELETE RESTRICT,
  sample_id UUID NOT NULL REFERENCES tsc_samples(id) ON DELETE RESTRICT,
  analyte VARCHAR(120) NOT NULL,
  value NUMERIC(24,8) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  replicate INTEGER NOT NULL CHECK (replicate BETWEEN 1 AND 12),
  qualifier VARCHAR(12) NOT NULL CHECK (qualifier IN ('NONE','LT','GT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assay_run_id, sample_id, analyte, replicate)
);

CREATE TABLE tsc_validation_findings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  assay_run_id UUID NOT NULL REFERENCES tsc_assay_runs(id) ON DELETE RESTRICT,
  code VARCHAR(80) NOT NULL,
  severity VARCHAR(12) NOT NULL CHECK (severity IN ('WARNING','ERROR')),
  message VARCHAR(400) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tsc_review_decisions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  assay_run_id UUID NOT NULL REFERENCES tsc_assay_runs(id) ON DELETE RESTRICT,
  client_decision_id VARCHAR(120) NOT NULL,
  stage VARCHAR(24) NOT NULL CHECK (stage IN ('SCIENTIST_SUBMISSION','QUALITY_RELEASE')),
  decision VARCHAR(12) NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  reason VARCHAR(500) NOT NULL,
  signature_statement VARCHAR(300) NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES tsc_users(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, assay_run_id, client_decision_id)
);

CREATE TABLE tsc_state_transitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  entity_type VARCHAR(30) NOT NULL,
  entity_id UUID NOT NULL,
  from_state VARCHAR(30),
  to_state VARCHAR(30) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  actor_user_id UUID REFERENCES tsc_users(id) ON DELETE RESTRICT,
  ingestion_event_id UUID REFERENCES tsc_ingestion_events(id) ON DELETE RESTRICT,
  entity_version INTEGER NOT NULL CHECK (entity_version > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX tsc_transitions_entity ON tsc_state_transitions(tenant_id, entity_type, entity_id, occurred_at);

CREATE TABLE tsc_audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tsc_tenants(id) ON DELETE RESTRICT,
  tenant_sequence BIGINT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id UUID,
  actor_user_id UUID REFERENCES tsc_users(id) ON DELETE RESTRICT,
  request_id UUID,
  event_data JSONB NOT NULL,
  previous_hash CHAR(64) NOT NULL,
  event_hash CHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, tenant_sequence)
);

CREATE OR REPLACE FUNCTION tsc_prevent_evidence_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER tsc_measurements_append_only BEFORE UPDATE OR DELETE ON tsc_measurements FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
CREATE TRIGGER tsc_findings_append_only BEFORE UPDATE OR DELETE ON tsc_validation_findings FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
CREATE TRIGGER tsc_decisions_append_only BEFORE UPDATE OR DELETE ON tsc_review_decisions FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
CREATE TRIGGER tsc_transitions_append_only BEFORE UPDATE OR DELETE ON tsc_state_transitions FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
CREATE TRIGGER tsc_audit_append_only BEFORE UPDATE OR DELETE ON tsc_audit_events FOR EACH ROW EXECUTE FUNCTION tsc_prevent_evidence_mutation();
