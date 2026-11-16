# PAINA Game Hub: Employee Access and Game Reliability Design

## Intent

Upgrade the deployed PAINA Game Hub so employee registration captures a valid department and a private password, employee login thereafter needs only employee code and password, the app remains understandable under temporary database load, game feedback feels more playful, and saving game settings cannot change a game's type accidentally. Preserve existing employee and game data while moving from the current free-text department and passwordless employee login.

## Goals

1. Manage departments from Admin rather than a hard-coded list; employees select an active department from a dropdown.
2. Separate first-time registration from returning employee login. Hash employee passwords with `bcryptjs`; provide an administrator-assisted password setup/reset path for existing accounts.
3. Verify Supabase/Postgres pooling for Vercel runtime, exercise 50–100 concurrent users in a non-production environment, and give users a clear temporary-unavailability message.
4. Add lightweight per-answer feedback and optional, opt-in looping music with mobile vibration where available.
5. Prevent PATCH settings updates from changing game type by default; safely identify and correct any previously affected games.

## Non-goals

- Google OAuth, OTP, or employee self-service password reset by email. The app has no verified employee email channel today.
- Automatically changing Vercel or Supabase subscription tiers. Any paid upgrade decision follows measured staging results and owner approval.
- Replacing the four current game engines or disclosing correct answers before a player submits.
- Deploying directly to production or modifying production records without reviewing a dry-run report and backup.

## Current implementation and constraints

- Next.js App Router, TypeScript, Prisma 5.22, PostgreSQL, bcryptjs for the single admin account, and HMAC-signed HTTP-only sessions.
- `Employee.department` is currently a nullable free-text column. `Employee` has no password hash. `/api/auth/login` creates an employee on first use from name and employee code.
- Admin employee create/edit APIs and the employee form accept department text.
- The play page already displays right/wrong feedback; a sparse `Confetti` component exists. There is no per-answer sound or background music.
- The Prisma schema uses PostgreSQL and `DIRECT_URL`, while `.env.example` still documents SQLite. Vercel runs `prisma migrate deploy` in its build command. `src/lib/prisma.ts` reuses a singleton client in development.
- The game PATCH route currently uses `gameUpsertSchema.partial()` and conditionally applies fields. The admin settings form omits `type` and does not reload the saved game. A dedicated update schema and regression coverage are still required by the request.
- The project has no existing test framework or test files. The requested 50–100-user load exercise must be explicitly set up and run against staging/local infrastructure, never against production data.

## Approaches considered

1. **Risk-first phased delivery (selected):** close the game-type corruption path and prepare a safe repair report; add department and employee-account migrations with backward-compatible data handling; then verify capacity and overload handling; then add optional game audio and feedback. This isolates production data and authentication changes from visual work and supports staged rollout.
2. **Experience-first delivery:** ship department/auth UI and game feedback first, then repair the bug and test capacity. This gets visible changes earlier but keeps the reported type-corruption issue open while other work lands.
3. **One combined release:** build every change behind one release. This reduces rollout steps but couples database migration, login behavior, pooling and game UI into one larger failure surface.

Risk-first is selected as the working default because the app is deployed and the highest-cost failures involve account access, production data, and game integrity.

## Proposed decisions

### Department catalog and migration

- Add a `Department` model with a stable identifier, unique display name, active state, and display order. Admin may create, rename, deactivate, reactivate, and delete departments. Deletion is rejected while employees still reference that department; the admin must reassign them first.
- Seed the eight departments listed in `YEU_CAU_TINH_NANG_MOI.md`. The three other units named there are not seeded initially; Admin can add them as catalog entries if the owner later confirms they should be available to employees.
- Replace the free-text employee field with a department relation. Use an expand/backfill/contract migration: create the catalog and nullable relation first, match existing text values only when names match unambiguously, preserve unmatched legacy text for Admin review, then make all new registration and employee-admin flows select an active department.
- Keep old employee records. Admin assigns the existing seven accounts to departments; do not guess assignments from names or codes.

### Employee registration and login

- Registration checks whether an employee code exists, then collects full name, active department, password, and confirmation for a new employee. Returning employees log in with employee code and password only.
- Store only a bcrypt hash for employee passwords. Proposed policy: 10–72 UTF-8 bytes, aligned with bcrypt's input limit; confirm server-side and in the UI.
- Make registration atomic around the unique employee code so concurrent submissions cannot create duplicates. The lookup response reveals only whether the code is registered, not the employee's name or department.
- Existing and admin-imported accounts without a password enter an Admin-assisted setup/reset flow. Admin initiates a one-time temporary credential and must communicate it through the company's existing trusted channel; the employee must replace it before regular use. No plaintext password is stored.
- Do not add email self-service reset until the app can verify employee email ownership.

### Reliability and capacity

- Keep runtime queries on Supabase's transaction pooler through `DATABASE_URL`; keep migrations on the direct endpoint through `DIRECT_URL`. Review the deployment values without printing credentials and verify the runtime URL is pooler-backed.
- Keep the Prisma singleton pattern. The load exercise uses a staging deployment and representative game/login traffic at 50 and 100 concurrent virtual users. Record latency, error rate, pool exhaustion, and database limits before recommending a paid tier change.
- Map known transient database connectivity/pool errors to a stable HTTP 503 response with retry guidance. Add a user-facing recovery message and retry action on relevant login/game screens; do not return database internals.
- Update `.env.example` to describe PostgreSQL and both URLs accurately.

### Game feedback and audio

- Add a small, original arcade-style melody synthesized in browser code, avoiding copied game tunes and third-party audio licensing uncertainty. Music is off by default, starts only after a clear user gesture, loops during play, and has a visible toggle.
- Synthesize short correct/incorrect sounds in browser code; use a small confetti/flash on correct answers and a brief shake on incorrect answers. Use `navigator.vibrate` only when available. Keep the next-question control immediately usable and respect reduced-motion preferences.

### Game-type integrity and repair

- Add a dedicated `gameUpdateSchema` with no default for `type`; use it in PATCH. The settings form submits the current type and reloads server state after a successful save.
- Add a dry-run audit/repair utility that infers candidate types from question storage shape and reports confidence. Apply only unambiguous corrections after reviewing the report and backing up the target database. Require manual mapping for games with no questions or ambiguous content.

## Delivery order

1. Close the PATCH type-default path and create a dry-run report for corrupted game types.
2. Add the department catalog/admin management and migrate employee department data without loss.
3. Add employee password registration/login and admin-assisted setup for legacy accounts; update employee admin forms to use the catalog.
4. Review Vercel/Supabase pooling, add overload handling, and execute the requested staging load exercise.
5. Add answer effects and optional synthesized music.

## Open for review

- Confirm whether the three additional units (Board of Directors, Systems-Building Project, and Internal Control) should be included in the registration catalog. Working default: seed only the eight listed departments and let Admin add the other units if needed.
- Confirm the proposed minimum password length of 10 characters (with a 72-byte maximum due to bcrypt).
- Confirm that the Admin-assisted temporary-password workflow is acceptable for legacy accounts without a verified email channel.
