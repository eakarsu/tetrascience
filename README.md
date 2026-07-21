# TetraScience assay evidence release

This repository supports one production-oriented application workflow: **a tenant instrument service ingests an assay packet, deterministic rules validate or quarantine it, a scientist submits valid evidence, and a different quality reviewer electronically releases or rejects it**.

The primary users are laboratory scientists and quality reviewers operating within one organization. Instrument services and tenant administrators supply controlled master/source data; auditors verify evidence without changing it. Generic AI output, generated gap pages, public registration, demo fixtures, and startup seeding are not part of the product.

## Acceptance criteria

- Every request and database query is tenant-scoped; roles separate administration, instruments, science, quality, and audit.
- Instrument packets have stable source IDs and checksums. Exact retries are idempotent; conflicting retries fail; rejected packets remain visible for correction.
- Samples must be active, instruments source-bound and calibrated, protocol units/analytes/replicates valid, and timestamps bounded. Release-blocking findings quarantine the run.
- A corrected run links to a quarantined predecessor and withdraws it only after the correction validates.
- A scientist can submit only a validated run. A different quality reviewer must re-enter their password and provide a reason to release or reject.
- Measurements, findings, decisions, transitions, and the per-tenant hash-chained audit log are append-only.
- Migration, failure, tenant-boundary, authentication, backup/restore, build, audit, and container checks run in CI.

## Local setup

1. Install Node 22+, PostgreSQL 16+, npm, and PostgreSQL client tools.
2. Copy `.env.example` to `.env`, replace placeholders, and create the configured empty database.
3. Run `npm --prefix backend ci && npm --prefix backend run migrate && npm --prefix backend run build`.
4. Provision identities without putting passwords on the command line:
   `TETRASCIENCE_INITIAL_PASSWORD='<12+ chars>' npm --prefix backend run user:create -- acme-labs 'Acme Labs' scientist@example.com SCIENTIST 'Lab Scientist'`.
5. Run `npm --prefix backend start`, then `npm --prefix frontend ci && npm --prefix frontend run dev -- --port 3001`.

`./start.sh` performs locked installs, runtime validation, explicit migration/build, and process-scoped shutdown. It does not source shell data, kill unrelated ports, create databases, synchronize schemas, or seed demo records.

See [docs/instrument-contract.md](docs/instrument-contract.md), [docs/operations.md](docs/operations.md), and [SECURITY.md](SECURITY.md).
