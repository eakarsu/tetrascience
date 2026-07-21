# Completeness Review: tetrascience

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 95 project files (82 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for application workflow. Generated gap/demo patterns are present: it contains 82 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Define the primary user and acceptance criteria, then complete one end-to-end workflow against persistent data instead of demo fixtures.
2. Replace mocks, placeholders, and generic AI responses with validated domain services and explicit failure/retry behavior.
3. Implement secure identity, role/tenant boundaries, input validation, secrets handling, and auditable state changes.
4. Add representative automated tests, CI quality gates, environment documentation, migrations, observability, backup, and deployment configuration.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.

## Evidence inspected

- `backend/src/middleware/auth.ts:8`
- `backend/src/index.ts:22`
- `frontend/src/App.tsx`
- `backend/src/middleware/auth.ts`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one application workflow workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

- **Implemented — primary users and acceptance:** narrowed the product to tenant-scoped laboratory scientists and independent quality reviewers completing instrument packet → deterministic validation/quarantine → scientist submission → electronically signed quality release/rejection. Acceptance criteria are documented and asserted in tests.
- **Implemented — persistent domain workflow:** added explicit reversible PostgreSQL migrations for tenants, bound service identities, instruments/calibration, samples, idempotent ingestion events, assay runs/corrections, measurements, validation findings, review decisions, state transitions, and a per-tenant hash-chained audit log. Startup no longer synchronizes or seeds schemas.
- **Implemented — validated services and failure/retry:** replaced generic AI, mock, fixture, and placeholder behavior with typed assay/protocol parsing; bounded timestamps and packet sizes; exact source/instrument binding; sample, analyte, unit, replicate, calibration, and optimistic-version rules; immutable source IDs/checksums; retained rejection evidence; explicit conflict and retryable dependency errors; correction lineage without evidence mutation.
- **Implemented — identity, tenant, and audit controls:** removed public registration, fallback secrets, demo credentials, and legacy AI routes; added runtime secret/CORS fail-closed checks, rate limits and login lockout, live active-user/tenant validation on every authenticated request, least-privilege roles, exact instrument-service binding, cross-tenant query constraints, scientist/quality separation of duties, password reauthentication, immutable signed decisions, append-only evidence, and structured request IDs/logs.
- **Implemented — operability:** added health/readiness/metrics, locked dependency startup, administrative provisioning, source and operations contracts, guarded backup/checksum/restore/count verification, Docker/Compose definitions, dependency and secret checks, and CI gates for migration up/down/up, unit/integration/e2e tests, failure paths, backup restore, builds, audits, secret scanning, and images.
- **Verification:** PostgreSQL migration up/down/up passed; 32 project-owned tests across 6 suites passed; backend TypeScript and frontend Vite production builds passed; backend and frontend audits report zero vulnerabilities; Docker Compose, shell syntax, executable permissions, diff, runtime configuration, current/history private-key/provider-token pattern, and tracked-environment checks passed; a custom-format backup restored into a guarded disposable database with matching tenant/run/measurement/decision/audit counts, then the restore database and temporary archive were removed.
- **External rollout gates:** production owners must configure real instrument/LIMS adapters and exact service bindings, rotate deployed database/JWT/session/provider credentials, complete privacy/retention/regulatory validation and backup-recovery sign-off, and exercise the images in a running container environment. Local image builds could not execute because the available Docker daemon was stopped; CI is configured to build both images.

## Runtime acceptance verification (2026-07-20)

`start.sh` is now a non-mutating launcher for prepared backend and frontend artifacts, honors explicit loopback hosts and ports, and no longer installs dependencies, builds, or migrates during service startup. A disposable-loopback-only `create-admin` adapter invokes the existing audited tenant/user provisioner. The initial validator triple (`55704` database, `6208` API, `6209` UI) reached both listeners but failed login because the generic SQL bootstrap replayed the checked-in down migration after provisioning and removed the acceptance identity.

Rollback support was preserved by moving the down artifact to the project-specific `.rollback.pgsql` suffix and updating the migration runner, keeping it outside generic forward-SQL discovery. On the separately assigned retry triple (`55717` database, `6228` API, `6229` UI), the shared validator launched `start.sh`, received HTTP 200 from the real `/api/auth/login`, and verified the database-backed bearer session through `/api/auth/me`, recording `API_VERIFIED startup_login_session_api`.

The retry verification also passed migration up/down/up with the renamed rollback artifact, all 32 tests across 6 suites, the backend TypeScript build, the frontend TypeScript/Vite build, launcher syntax, and admin-adapter syntax. Both the consumed initial triple and the retry triple were released; no port from the failed attempt was reused.
