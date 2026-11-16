# Reliability and load testing

## Local development

Use the Docker PostgreSQL connection in `.env` for both `DATABASE_URL` and `DIRECT_URL`. This local direct connection is appropriate for development and migration work. The singleton Prisma client in `src/lib/prisma.ts` is reused across requests in development.

Temporary database connectivity and pool-timeout failures from covered API routes return HTTP 503 with a short retry message and `Retry-After: 3`. Validation, authentication, and game-state errors keep their existing status codes. The employee login and game screens provide retry actions for safe reads; registration and answer submission are not automatically replayed.

Run the local load script from `load-tests/README.md`. Use dedicated local employee accounts only. Local 50/100-VU results help identify app/DB query bottlenecks but do not establish serverless or hosted pool capacity.

## Supabase/Vercel verification (later staging step)

- In Supabase, obtain the shared Transaction pooler URL for serverless runtime. Check its port/mode and Prisma-compatible query parameters against the current Supabase Prisma guide; do not infer values from a local URL.
- Set Vercel runtime `DATABASE_URL` to that transaction pooler URL. Keep `DIRECT_URL` as a direct or session-mode URL used for Prisma migrations/admin tasks.
- Never run load tests against the production hostname/database. Create an isolated staging project/deployment and staging-only test employees/game.
- Before a staging run, verify the sanitized connection mode/port and Vercel environment selection without printing secrets. Observe Vercel function duration/concurrency and Supabase connection/compute metrics while ramping 1, 50, then 100 virtual users.
- Summarize p95 latency, failed request rate, function duration, pool usage, compute pressure, and observed throttling. Decide about service tier only after reviewing those measurements and costs with the owner.

References: [Supabase Prisma setup](https://supabase.com/docs/guides/database/prisma), [Supabase pool modes](https://supabase.com/docs/guides/database/connecting-to-postgres), [Prisma pooler configuration](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer).
