# Security policy

Report vulnerabilities privately to the repository owner. Do not place credentials, assay data, sample identifiers, instrument serials, audit evidence, or production tenant details in public issues.

- Store `.env` values in a managed secret store and keep them untracked. Rotate any deployed database, JWT, session, or historical provider credential whose confidentiality cannot be proven.
- Use TLS, a random JWT secret of at least 32 characters, explicit CORS origins, least-privilege database/identity roles, encrypted backups, and centralized access logging.
- Provision users administratively. Public registration and demo credentials are disabled. Login attempts are rate-limited and repeated failures temporarily lock the account.
- Tenant and role checks apply to every workflow operation. Scientist and quality identities are separated; release requires password reauthentication and a reason.
- Evidence tables and hash-chained audit events are append-only. The chain is tamper-evident, not a substitute for restricted database administration, write-ahead-log retention, or external audit archival.
- Do not send tenant assay, sample, instrument, or quality evidence to an LLM. AI/demo routes are absent and startup fails closed if their legacy flags are enabled.

Production rollout remains blocked until owners verify credential rotation, source-adapter identity, privacy/retention policy, disaster recovery, and regulated validation obligations applicable to their jurisdiction and intended use.
