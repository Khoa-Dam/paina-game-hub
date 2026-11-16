# Employee Password Authentication Implementation Plan

> **For agentic workers:** Use this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate first-time employee registration from returning login, store employee passwords only as bcrypt hashes, and give existing passwordless accounts a safe Admin-assisted password setup path.

**Architecture:** Extend the existing `Employee` model with a nullable `passwordHash` so deployed accounts remain able to use the setup flow. Replace the current name/code login endpoint with code-based registration-status lookup, registration, and password login endpoints; keep the existing signed employee cookie session. Add an Admin-triggered one-time setup token with expiry and single-use state, deliver only the token to Admin for communication through a trusted company channel, and require the employee to set a password before login. The employee UI becomes a code-first registration/login flow and continues to consume the active department catalog introduced in Requirement 1.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 5.22/PostgreSQL, Zod, `bcryptjs`, existing HMAC cookie sessions.

**Spec:** `docs/superpowers/specs/2026-11-16-paina-hub-employee-auth-departments-design.md`, Requirement 2 in `YEU_CAU_TINH_NANG_MOI.md`.

## Global Constraints

- Registration collects employee code, full name, active department, password, and password confirmation; returning login needs only employee code and password.
- Reuse the existing `bcryptjs` dependency and Admin pattern: `bcrypt.hash(password, 10)` on set and `bcrypt.compare(password, passwordHash)` on login; accept 10–72 UTF-8 bytes and never log, return, or store plaintext passwords.
- A unique employee code may only be registered once; concurrent registration attempts must not create duplicates.
- Existing accounts with no password must have an Admin-assisted first-time setup route and remain recoverable.
- Do not implement email reset without verified email ownership; no email channel exists today.
- Preserve inactive employee blocking, existing 12-hour signed employee sessions, and all game/history data.
- Keep the admin login flow unchanged.

## Review Focus

- Employee-code lookup reveals only the minimum account state needed to choose registration, login, or legacy setup; it must not reveal an existing employee's name, department, or active/inactive status.
- Concurrent registration with the same code must yield one account and a safe conflict for the other request.
- Disabled employees must not register, log in, or complete a password setup token.
- Expired, reused, malformed, and unknown setup tokens must fail without changing the password.
- Passwords above bcrypt's 72-byte input boundary must be rejected before hashing; multibyte UTF-8 values must count bytes, not JavaScript characters.

---

### Task 1: Add employee credential and password-setup persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_employee_password_auth/migration.sql`
- Modify: `src/lib/validators.ts`
- Create: `src/lib/passwordPolicy.ts`

**Interfaces:**
- `Employee.passwordHash String?` remains null for existing employees until setup.
- New `EmployeePasswordSetup` model stores `id`, unique `tokenHash`, `employeeId`, `expiresAt`, nullable `usedAt`, and `createdAt`; cascade delete with employee.
- `validateEmployeePassword(password: string): { ok: true } | { ok: false; reason: string }` enforces 10–72 UTF-8 bytes.

- [ ] Add the nullable employee hash and one-time setup model; add the migration without modifying existing employee credential or game data.
- [ ] Add registration, password-login, status-lookup, setup-token-create, and setup-token-complete Zod schemas, using exact request fields defined in the task interfaces.
- [ ] Implement and verify the UTF-8 byte-count password policy.
- [ ] Run `npx prisma validate`, `npx prisma generate`, and `npx tsc --noEmit` after migration/model changes.

### Task 2: Implement safe registration, lookup, and login APIs

**Files:**
- Create: `src/app/api/auth/employee-status/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/employee-login/route.ts`
- Modify: `src/app/api/auth/login/route.ts` (remove legacy name/code auto-registration behavior or retire route with a controlled response)
- Modify: `src/lib/validators.ts`

**Interfaces:**
- `POST /api/auth/employee-status` accepts `{ employeeCode }`; returns `{ status: "NEW" | "PASSWORD_REQUIRED" | "LOGIN" }` without employee name/department.
- `POST /api/auth/register` accepts `{ employeeCode, fullName, departmentId, password, passwordConfirmation }`; creates an active employee with bcrypt hash and department relation, then sets the existing employee session.
- `POST /api/auth/employee-login` accepts `{ employeeCode, password }`; verifies active state and bcrypt hash, then sets the existing employee session.
- Legacy `POST /api/auth/login` must no longer create an account from a guessable name/code pair.

- [ ] Implement employee status lookup using the exact statuses above; return no profile fields and do not distinguish active from inactive employees in this lookup.
- [ ] Implement registration with active-department validation, password confirmation, bcrypt hash, and unique-code race handling.
- [ ] Implement login with one generic invalid-credentials response for unknown code/wrong password, and explicit disabled-account messaging only after successful credential verification if retaining current UX.
- [ ] Ensure old passwordless accounts are routed to setup, not silently registered again or locked out.
- [ ] Add focused tests for successful registration, duplicate/concurrent code, wrong password, inactive account, missing/inactive department, and generic unknown-code failure.

### Task 3: Add Admin-assisted first-password setup

**Files:**
- Create: `src/app/api/admin/employees/[id]/password-setup/route.ts`
- Create: `src/app/api/auth/password-setup/[token]/route.ts`
- Create: `src/app/set-password/[token]/page.tsx`
- Modify: `src/app/admin/(dashboard)/employees/page.tsx`
- Modify: `src/lib/session.ts` only if setup completion needs session invalidation.

**Interfaces:**
- Admin `POST /api/admin/employees/[id]/password-setup` invalidates earlier unused tokens and returns a one-time URL/token once; token lifetime is 24 hours.
- `POST /api/auth/password-setup/[token]` accepts `{ password, passwordConfirmation }`; hashes the token for lookup, atomically checks expiry/unused/active employee, stores bcrypt password hash, marks token used, and sets employee session.
- Raw setup tokens are never persisted; only SHA-256 token digests are stored.

- [ ] Implement Admin-authorized token issue with cryptographically secure random token, SHA-256 digest storage, expiry, and audit entry; return the raw token only in the one-time response for trusted manual delivery.
- [ ] Implement atomic single-use setup completion, including expired/reused/unknown tokens and disabled employees.
- [ ] Add an Admin employee-list action to issue/setup-reset a password and clearly display the one-time URL with copy support; warn that it must be communicated privately.
- [ ] Add the employee set-password page with confirmation and password-policy guidance.
- [ ] Add tests for Admin authorization, token digest-only persistence, expiry, single use under concurrent submits, disabled employee, and successful hash storage.

### Task 4: Replace the employee sign-in UI

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/api/auth/logout/route.ts` only if logout/session behavior needs adjustment.

**Interfaces:**
- Code-first UI calls status lookup and presents one of: registration fields (full name, active department dropdown, password, confirmation), login fields (password only), or password-setup guidance/link request via Admin for passwordless legacy accounts.

- [ ] Add employee-code-first state transitions with loading, retry, and accessible validation/error messages.
- [ ] Connect registration to the active department catalog and registration endpoint.
- [ ] Connect returning login to the password endpoint; do not ask for name or department.
- [ ] Route legacy passwordless accounts to the Admin-assisted setup instructions without revealing personal profile data.
- [ ] Verify successful new and returning users land at `/home` with a valid employee session; verify Admin login remains unchanged.

### Task 5: Remove legacy employee credentials and document rollout

**Files:**
- Modify: `src/lib/validators.ts`
- Modify: `src/app/api/auth/login/route.ts` (or remove if no longer referenced)
- Modify: `src/app/login/page.tsx`
- Modify: `README.md`

- [ ] Search the repository for the legacy `{ fullName, employeeCode }` employee-login contract and remove or explicitly retire every call path.
- [ ] Document migration, new employee registration, legacy-account Admin setup, token expiration, and the trusted-channel handoff for existing employees.
- [ ] Run the focused auth tests, `npx tsc --noEmit`, and `npm run build`.
- [ ] On staging/local data, verify existing employees still retain history/results and can complete first-time password setup.

