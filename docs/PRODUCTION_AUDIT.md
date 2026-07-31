# MatchMind Bot — Production Audit

Date: 2026-07-31  
Scope: application code, authorization, subscriptions, data imports, AI safety, dependencies, CI and Railway deployment.

## Executive summary

No committed secrets or known production dependency vulnerabilities were found. The audit identified four high-impact issues and four medium-impact reliability gaps. All high-impact findings and the deployment-critical medium findings are fixed in this change.

## Findings and remediation

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| MM-01 | High | Daily limits used a read-then-update transaction. Parallel requests could consume more than the configured limit. | Replaced with a single atomic PostgreSQL `INSERT ... ON CONFLICT ... WHERE ... RETURNING` statement. |
| MM-02 | High | OpenFootball and StatsBomb syncs could run concurrently, causing duplicate work and database pressure. | Added a database-backed lease lock per data source with owner-safe release and stale-lock expiry. |
| MM-03 | High | An LLM response was returned without post-validation, so unsupported xG, shots, possession percentages or tactical claims could leak through despite the prompt. | Added system-level restrictions, deterministic fallback and output rejection for unsupported claims or missing score/disclaimer. |
| MM-04 | High | Free users could invoke the favorite callback directly even though favorites are a Pro feature. | Added server-side plan enforcement inside the mutation handler. |
| MM-05 | Medium | Upstream JSON was trusted without runtime validation or response-size limits. | Added Zod schemas, timeouts, maximum byte sizes and clear invalid-format failures. |
| MM-06 | Medium | Invalid or missing production configuration failed late and ambiguously. | Added fail-fast validation for PostgreSQL URL, Telegram bot token format and numeric admin IDs. |
| MM-07 | Medium | Railway build/database/start settings existed only in the dashboard and could drift. | Added `railway.json` with build, pre-deploy schema sync, start and restart policy. |
| MM-08 | Medium | Pull requests had no automated validation. | Added least-privilege GitHub Actions CI for install, Prisma generation/validation, build, tests and production dependency audit. |

## Verification

- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilities
- `prisma validate`: passed
- TypeScript build: passed
- unit tests: passed
- live schema validation against representative OpenFootball and StatsBomb files: passed

## Residual risks

These are not release blockers for a small closed beta, but should be handled before wider paid use:

1. **Prisma `db push` instead of versioned migrations (Medium).** The existing Railway database was created with `db push`. Move to baselined migrations before schema changes become frequent.
2. **StatsBomb still runs manually (Low).** OpenFootball has a dedicated daily Railway cron command. Move the heavier StatsBomb import to its own weekly worker before increasing coverage.
3. **No PostgreSQL integration test in CI (Medium).** Unit and compile checks exist, but rate-limit SQL and lock behavior should gain containerized integration tests.
4. **In-memory Telegram conversation session (Low).** A restart can cancel a partially completed two-step interaction. Redis-backed sessions are appropriate when multiple bot replicas are introduced.
5. **No payment verification (Expected MVP limitation).** Plans remain admin-assigned until a payment provider and webhook signature validation are implemented.

## Operational recommendations

- Keep exactly one long-polling bot replica until distributed Telegram update handling is designed.
- Keep `BOT_TOKEN`, `DATABASE_URL`, `OPENAI_API_KEY` and admin IDs only in Railway variables.
- Rotate the Telegram token immediately if it is ever pasted into chat, logs or source control.
- Run OpenFootball daily through the dedicated Railway cron service and move StatsBomb basic sync to a separate weekly worker before beta traffic grows.
- Enable Railway PostgreSQL backups before opening the beta to external users.
