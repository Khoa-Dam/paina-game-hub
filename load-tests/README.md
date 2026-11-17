# Local and staging employee traffic test

This k6 scenario checks employee status lookup and login once per virtual user (VU), then repeatedly reads the authenticated game list. When `GAME_SLUG` is set, each VU also reads game detail and, once per run, starts a session, submits one valid-shaped answer per question, reads the session, and completes it. The optional game flow writes answers and one result per VU, so use only isolated local or staging data.

The script reports overall request latency/failures plus separate trends for status lookup, login, game list/detail, session start, answers, session read, session completion, and the authentication flow. Each VU uses one distinct employee account and its own cookie jar.

## Safety and prerequisites

- Never load test production. The known production hostname is blocked by the script. For any non-local target, `ALLOW_NON_LOCAL_TARGET=YES` is required; set it only after verifying that both the app deployment and its database are isolated staging resources. This opt-in bypasses the host guard and does not identify the database for you.
- Local testing requires the `paina-postgres` Docker container, migrations, seed data, and a production-mode Next.js server.
- Install k6 locally, or use Docker Desktop with the Docker command below.
- Use at least as many dedicated test employees as `VUS`. The ignored `load-tests/users.local.json` file must contain a JSON array of unique `{ "employeeCode", "password" }` pairs. Never use real employee credentials.
- For the optional game flow, use an active game with at least one question and set its `maxPlaysPerUser` high enough for every planned run. Each VU completes one play per run; results persist in the target database.

## Prepare local data and app

Run these commands only with the local Docker database configured by `.env`:

```powershell
docker start paina-postgres
yarn db:migrate
yarn db:seed
$env:LOAD_TEST_USER_COUNT = "100"
yarn db:load-test-users
yarn build
yarn start
```

`db:load-test-users` refuses to run unless `DATABASE_URL` resolves to loopback. It uses reserved `K6LOCAL###` codes, hashes one freshly generated random password for these dedicated accounts, and writes the credentials file locally. Running it again resets only those reserved accounts' passwords and replaces that file. Keep the app running in this terminal; run k6 from another PowerShell terminal.

To prepare fewer users, set `LOAD_TEST_USER_COUNT` to the desired integer from 1 to 100. The checked-in test scenario requires a distinct account for every VU.

## Run with k6 installed locally (PowerShell)

Smoke test: one VU for 30 seconds. The script declares a `constant-vus` scenario, so use its environment variables; do not pass `--iterations` expecting to override the scenario.

```powershell
$env:BASE_URL = "http://127.0.0.1:3000"
$env:LOAD_TEST_USERS_JSON = (Resolve-Path .\load-tests\users.local.json).Path
$env:VUS = "1"
$env:DURATION = "30s"
k6 run .\load-tests\k6\employee-traffic.js
```

Ramp manually in separate runs, reviewing the summary and server/database metrics after each stage:

```powershell
$env:VUS = "50"
$env:DURATION = "2m"
k6 run .\load-tests\k6\employee-traffic.js

$env:VUS = "100"
$env:DURATION = "2m"
k6 run .\load-tests\k6\employee-traffic.js
```

These are separate constant-load stages, not a gradual ramp inside one k6 run. The first burst includes status lookup and login for all VUs; after login, each VU repeatedly reads the game list with a one-second pause. To include game traffic, set a suitable slug before a run:

```powershell
$env:GAME_SLUG = "your-active-test-game-slug"
```

Unset it for a read-only game-list workload:

```powershell
Remove-Item Env:GAME_SLUG -ErrorAction SilentlyContinue
```

With `GAME_SLUG`, each VU submits an answer for every question, then completes the session once. Those runs create answer rows and completed results in the test database. For three game-flow runs (smoke, 50 VUs, 100 VUs), configure at least three plays per account first, or use separate test-account sets per stage.

## Run k6 from Docker Desktop (PowerShell)

When the app runs on Windows host port 3000, the k6 container must use `host.docker.internal`, not `127.0.0.1`. The local-target guard requires the opt-in for that Docker hostname:

```powershell
docker run --rm -i `
  -v "${PWD}:/work" -w /work `
  -e BASE_URL=http://host.docker.internal:3000 `
  -e LOAD_TEST_USERS_JSON=/work/load-tests/users.local.json `
  -e VUS=1 -e DURATION=30s `
  -e ALLOW_NON_LOCAL_TARGET=YES `
  grafana/k6 run /work/load-tests/k6/employee-traffic.js
```

Change `VUS` and `DURATION` for the 50/100 stages as above. Do not add the opt-in when targeting a hosted URL unless it is an isolated staging deployment and you have confirmed its database environment.

## Staging run

Provision dedicated staging accounts through the staging app/admin flow and save their credentials in a local file outside version control. Do not run `yarn db:load-test-users` against staging; that script intentionally accepts only loopback database URLs. Use a separate staging-only game and accounts, and verify Vercel's selected environment has staging `DATABASE_URL` and `DIRECT_URL` before enabling the non-local target:

```powershell
$env:BASE_URL = "https://your-isolated-staging-host"
$env:LOAD_TEST_USERS_JSON = "D:\private\paina-staging-users.json"
$env:ALLOW_NON_LOCAL_TARGET = "YES"
$env:VUS = "1"
$env:DURATION = "30s"
k6 run .\load-tests\k6\employee-traffic.js
```

After the smoke run, repeat at 50 then 100 VUs only if responses and provider metrics are healthy. Observe Vercel function duration/concurrency and Supabase pool usage/compute during each stage. A local Docker run measures the laptop and local Postgres; it does not validate Vercel serverless scaling or Supabase pooler capacity.

The script thresholds are initial targets: under 1% failed requests, p95 HTTP request latency below 2.5 seconds, and p95 employee authentication flow below 2.5 seconds. A successful k6 exit is not enough to declare hosted capacity: review provider metrics and record the sanitized results in `docs/operations/reliability-and-load-testing.md`.
