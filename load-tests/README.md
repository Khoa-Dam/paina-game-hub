# Local employee traffic test

This k6 scenario exercises employee code lookup and password login once per virtual user, then repeatedly reads the authenticated game list. Optionally, `GAME_SLUG` also reads game detail on each iteration and starts/reads/completes a session once per virtual user. Each virtual user uses a separate account and cookie jar, with its session cookie retained across iterations. Output includes separate timing metrics for status lookup, login, and game-list requests.

For a local production-mode app reached over `http://host.docker.internal`, the script makes the signed `Secure` session cookie available to that local VU over HTTP only. This test-client adjustment does not change app cookie settings; staging should be tested over HTTPS with the normal secure cookie behavior.

## Prerequisites

- Docker PostgreSQL, migrations, seed data, and the app running locally.
- At least as many dedicated local test employees with passwords as the `VUS` value.
- k6 installed locally, or Docker Desktop to run the official `grafana/k6` image.
- For the optional game flow, an active local game with at least one question and enough remaining plays for each test account.

To create dedicated local accounts and the ignored credentials file automatically, run this in PowerShell after migrations and seed data are ready:

```powershell
$env:LOAD_TEST_USER_COUNT = "50"
yarn db:load-test-users
```

Set the count to `100` before running the 100-VU scenario. This command only accepts a loopback `DATABASE_URL`, uses the reserved `K6LOCAL###` employee codes, and writes credentials to the ignored `load-tests/users.local.json` file. It resets passwords only for those reserved local test codes.

- A local-only file containing test credentials, for example:

```json
[
  { "employeeCode": "LOAD001", "password": "local-test-password-1" },
  { "employeeCode": "LOAD002", "password": "local-test-password-2" }
]
```

Do not use employee passwords from a real environment. Keep this file outside version control.

## Run

PowerShell example for a 1-user smoke run:

```powershell
$env:BASE_URL = "http://127.0.0.1:3000"
$env:LOAD_TEST_USERS_JSON = "D:\private\paina-load-users.json"
$env:VUS = "1"
k6 run --vus 1 --iterations 1 load-tests/k6/employee-traffic.js
```

Then repeat with `VUS=50`, and `VUS=100` if the local machine has enough capacity and at least that many distinct test employees. For the full game flow, set `GAME_SLUG` to the active local game's slug. The script completes one game session per test employee on each run that enables the game flow, so use test accounts and leave enough plays configured. Start with short durations and monitor Docker/Postgres and the Next.js terminal.

The default target is local. The production hostname is always blocked. Any non-local host requires `ALLOW_NON_LOCAL_TARGET=YES`; reserve that override for a separately isolated staging deployment and never point it at production.

The initial targets are under 1% failed requests, p95 HTTP request latency under 2.5 seconds, and p95 employee authentication flow under 2.5 seconds. Treat these as initial local signals, not proof of Vercel/Supabase capacity. Local tests measure the laptop, Docker, and direct Postgres connection; they do not model Vercel serverless scaling or Supabase transaction-pool limits. Hosted pool/capacity validation remains a separate staging step after local behavior is confirmed.
