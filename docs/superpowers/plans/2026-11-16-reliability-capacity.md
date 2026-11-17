# Reliability and Capacity Implementation Plan

> **For agentic workers:** Use this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify runtime Prisma traffic uses Supabase transaction pooling, measure behavior at 50 and 100 concurrent employee users on staging, and return clear retry guidance during temporary database or pool outages.

**Architecture:** Keep Prisma 5.22 and the existing singleton `PrismaClient`. Use the Supabase transaction pooler URL for Vercel runtime and a direct/session connection URL for migrations. Add a small API error boundary that maps known temporary database connectivity/pool failures to JSON 503 responses with `Retry-After`, and make employee-facing screens show a recoverable message. Use k6 outside the app dependency graph to exercise realistic authenticated flows against staging; record latency, failure rate, Vercel function behavior, Supabase pool/compute metrics, and test configuration.

**Tech Stack:** Next.js 16 App Router, Prisma 5.22, Supabase Postgres/Supavisor, Vercel, k6.

**Spec:** `docs/superpowers/specs/2026-11-16-paina-hub-employee-auth-departments-design.md`, Requirement 3 in `YEU_CAU_TINH_NANG_MOI.md`.

## Global Constraints

- Never run load against production; use a separate staging project/database and staging Vercel deployment.
- Never print, commit, or include database URLs, admin credentials, employee passwords, or session cookies in test output/artifacts.
- `DATABASE_URL` is runtime-only and must point at the Supabase transaction pooler; `DIRECT_URL` is for migrations and admin tooling.
- Keep the Prisma singleton; do not call `$disconnect()` after each request or create a new client per request.
- Do not change Supabase or Vercel plan tiers automatically; present measured findings and cost-impacting options to the owner.
- Return stable user-safe 503 responses for recognized transient database/connection-pool failures; do not leak SQL, hostnames, query text, or Prisma internals.
- Test both 50 and 100 concurrent virtual users with pre-provisioned staging employees and representative game data.

## Review Focus

- Wrong database URL configured on Vercel (direct URL instead of transaction pooler) must be detected without exposing its credentials.
- Authentication failures (401/403) and validation/game conflicts (4xx) must not be mislabeled as temporary overload.
- Prisma pool timeout, database unavailable, connection reset, and exhausted connection conditions must return a retryable 503; unrelated programming errors must remain visible to server logs and return a generic 500.
- Browser callers must handle empty/non-JSON 5xx responses and show retry guidance rather than throwing on `.json()`.
- Load test must not collide employee codes, persist test traffic into production, or accidentally reuse user cookies between virtual users.

---

### Task 1: Audit and document the deployed pooling configuration

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/operations/reliability-and-load-testing.md`

**Interfaces:**
- Runtime config: `DATABASE_URL` points to the Supabase transaction pooler endpoint (typically port `6543`) and includes `pgbouncer=true` when required by the deployed Supavisor configuration.
- CLI config: `DIRECT_URL` points to a direct/session endpoint that supports Prisma Migrate.
- Local Docker may set both URLs to the same local direct PostgreSQL URL; docs distinguish local from Vercel staging/production.

- [ ] Review URL host/port/query parameter names from Vercel and Supabase settings without printing credentials; record only sanitized host class, pool mode, and port in the operations document.
- [ ] Verify local runtime continues to accept direct localhost PostgreSQL URLs while staging runtime uses the transaction pooler.
- [ ] Correct `.env.example` and README descriptions so they match PostgreSQL schema and explain pooled versus migration URLs.
- [ ] Document safe Vercel/Supabase dashboard checks for function region, pooler mode, database connection/compute graphs, and plan limits; do not change plan tiers.

### Task 2: Add safe temporary database failure responses

**Files:**
- Create: `src/lib/apiErrorResponse.ts`
- Modify: `src/app/api/auth/employee-status/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/employee-login/route.ts`
- Modify: `src/app/api/departments/route.ts`
- Modify: `src/app/api/games/route.ts`
- Modify: `src/app/api/sessions/start/route.ts`
- Modify: `src/app/api/sessions/[id]/route.ts`
- Modify: `src/app/api/sessions/[id]/answer/route.ts`
- Modify: `src/app/api/sessions/[id]/complete/route.ts`

**Interfaces:**
- `toApiErrorResponse(error: unknown): NextResponse | null` returns JSON `{ error: "Hệ thống đang bận, vui lòng thử lại sau.", code: "TEMPORARILY_UNAVAILABLE" }` with status 503 and `Retry-After: 3` for recognized transient database/pool failures, otherwise `null`.
- Each route catches at its boundary, returns the mapped 503 where available, and rethrows/returns generic 500 handling for unknown exceptions without leaking internals.

- [ ] Implement classification for Prisma known request errors `P1001`, `P1002`, `P2024`, provider connection-limit errors, and Node socket timeout/reset/refused codes; classify only known availability failures as 503.
- [ ] Add a small route-boundary wrapper or explicit `try/catch` in the listed high-traffic endpoints while preserving their existing auth, validation, and conflict status codes.
- [ ] Ensure logs keep server-side error details but responses never contain connection strings, SQL, hostnames, or Prisma error metadata.
- [ ] Preserve `Retry-After` and the stable response shape across all covered APIs.

### Task 3: Show recoverable errors in employee flows

**Files:**
- Modify: `src/features/auth/login/hooks/useEmployeeLogin.ts`
- Modify: `src/features/auth/login/utils/api.ts`
- Modify: `src/features/auth/login/components/EmployeeLoginForm.tsx`
- Modify: `src/app/(app)/games/page.tsx`
- Modify: `src/app/(app)/games/[slug]/page.tsx`
- Modify: `src/app/(app)/play/[sessionId]/page.tsx`
- Create: `src/components/TemporaryUnavailableNotice.tsx` (only if reuse across screens improves consistency)

**Interfaces:**
- API response helper recognizes `TEMPORARILY_UNAVAILABLE` and empty/non-JSON responses, displaying a short Vietnamese retry message without hiding the retry action.
- Retry repeats only safe reads or a user-initiated action; non-idempotent registration/answer submission must not be automatically replayed.

- [ ] Update login/status and department loading to show an inline retry action when a 503 occurs.
- [ ] Update game list/detail/session screens to show a consistent temporary-outage message when their API calls return 503 or transport failures.
- [ ] Preserve answers and form state after recoverable errors; do not silently resubmit registration, answers, or session completion.
- [ ] Ensure ordinary validation/auth/game errors retain their existing messages and statuses.

### Task 4: Create isolated k6 staging scenarios

**Files:**
- Create: `load-tests/k6/employee-traffic.js`
- Create: `load-tests/README.md`
- Modify: `.gitignore` only if local result files need ignore rules.

**Interfaces:**
- Environment variables: `BASE_URL`, `LOAD_TEST_USERS_JSON` (local path to a JSON array of staging-only employee code/password pairs), and optional `GAME_SLUG`.
- Each VU owns one unique staging employee and its own cookie jar. The script performs status/login, game-list read, game detail read, session start, answer(s), and completion when valid; otherwise it completes a read-only login/list workload.
- k6 emits request rate, p50/p95/p99 latency, status/error rate, and checks for the expected response codes.

- [ ] Implement a smoke scenario at 1 VU and a ramp scenario at 50 then 100 VUs; hold each stage long enough to observe sustained pool and compute behavior without exhausting monthly quotas.
- [ ] Add a preflight guard that refuses localhost/production-looking targets unless an explicit staging opt-in variable is set; document that production URLs are forbidden targets.
- [ ] Keep credentials out of source control and console output; do not create, delete, or mutate real employee accounts.
- [ ] Document how to provision isolated test employees and an active game in staging, run the script, and safely clear staging-only test records after the run.

### Task 5: Run staging load checks and record the capacity decision

**Files:**
- Modify: `docs/operations/reliability-and-load-testing.md`
- Create: `load-tests/results/<date>-staging-summary.md` (sanitized summary only; no raw secrets or user-level data).

- [ ] Confirm the staging deployment uses the transaction-pooler runtime URL and direct/session migration URL before testing.
- [ ] Run smoke, 50-VU, and 100-VU stages on staging; collect application latency/errors, Vercel function duration/concurrency, Supabase pool occupancy/compute, and provider limit events.
- [ ] Record environment tier, region, test duration, aggregate metrics, observed bottleneck, and whether additional Vercel/Supabase capacity appears necessary.
- [ ] If staging fails, tune only evidence-backed pool/timeouts or query behavior and repeat the failing load stage; do not upgrade service plans without owner approval.
- [ ] Close with a go/no-go recommendation tied to the agreed success targets; if no target is specified, report measured values and recommend a threshold instead of silently declaring capacity sufficient.

## Source references

- Supabase Prisma guidance: https://supabase.com/docs/guides/database/prisma
- Supabase pooling modes and connection strings: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma PgBouncer/Supavisor compatibility: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
