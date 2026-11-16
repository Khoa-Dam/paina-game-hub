# Department Catalog Implementation Plan

> **For agentic workers:** Use this plan task by task. The user has authorized inline implementation of Requirement 1. Steps use checkbox syntax for tracking.

**Goal:** Replace free-text employee departments with an Admin-managed catalog and dropdowns for new employee registration and Admin employee creation/editing, while preserving existing employee data for manual assignment.

**Architecture:** Add a relational `Department` model and a nullable employee relation, preserving unmatched legacy department text during migration. Provide public read-only access to active departments, authenticated Admin CRUD, and update employee registration, Admin management, CSV import, and department display/reporting to use canonical department records.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 5.22, PostgreSQL, Zod, existing Tailwind UI.

**Spec:** `docs/superpowers/specs/2026-11-16-paina-hub-employee-auth-departments-design.md`, Requirement 1 in `YEU_CAU_TINH_NANG_MOI.md`.

## Global Constraints

- Seed the eight departments listed in the spec; the three additional units remain Admin-addable, not seeded, until confirmed.
- Never guess department assignments for the existing seven employee accounts; preserve unknown legacy text and allow Admin to assign each account.
- Only active catalog departments appear in registration dropdowns; Admin can view inactive departments.
- Prevent deleting departments assigned to employees; allow deactivation instead.
- Keep the existing employee login credentials/behavior unchanged in this requirement; password work belongs to Requirement 2.
- Preserve canonical department names in employee displays, leaderboards, results, and CSV exports.

## Review Focus

- Existing employees with unrecognized free-text departments must retain that text for Admin review rather than losing it during migration.
- A first-time employee registration must fail clearly if no active department is selected; an existing employee login must not require a department selection.
- A stale or inactive department ID must be rejected by employee create/update/import APIs.
- Concurrent requests must not bypass the database foreign-key protection against deleting a department still assigned to employees.
- Renaming a department must update every employee-facing surface because those surfaces resolve the relation at read time.

---

### Task 1: Add the relational department catalog and safe backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_department_catalog/migration.sql`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces `Department` fields `id`, nullable unique `code`, unique `name`, `isActive`, `sortOrder`, timestamps.
- Produces optional `Employee.departmentId`, `Employee.departmentInfo`, and `Employee.legacyDepartment`.

- [ ] Add `Department` model and optional employee relation; retain the legacy value in `legacyDepartment`.
- [ ] Create the migration: seed the eight canonical records, add employee relation/legacy columns, map existing values only on case-insensitive exact name matches, copy unmatched values to `legacyDepartment`, then remove the old free-text column and add a restrictive foreign key.
- [ ] Update seed data to upsert the eight departments and connect demo employees to canonical records without overwriting existing employee assignments.
- [ ] Run `npx prisma validate` and `npx prisma generate`; inspect the migration SQL to confirm unmatched values are copied before the old column is dropped.

### Task 2: Add department APIs and use the catalog for first-time registration

**Files:**
- Create: `src/lib/departmentSchemas.ts`
- Create: `src/app/api/departments/route.ts`
- Create: `src/app/api/admin/departments/route.ts`
- Create: `src/app/api/admin/departments/[id]/route.ts`
- Modify: `src/lib/validators.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Public `GET /api/departments` returns `{ departments: { id, code, name }[] }` for active departments ordered by `sortOrder`, then `name`.
- Admin `GET /api/admin/departments` returns active and inactive departments.
- Admin `POST /api/admin/departments` accepts `{ name, code?, sortOrder? }`; `PATCH /api/admin/departments/[id]` accepts a partial of those fields plus `isActive`; `DELETE` returns 409 if employees are assigned.
- Employee login accepts optional `departmentId`; it is required and validated against an active department only when the employee code is first registered. Existing account login ignores it.

- [ ] Add Zod schemas for create/update department payloads and validate unique code/name conflicts with clear 409 responses.
- [ ] Implement public active-department listing and Admin CRUD with `requireAdmin` and audit log actions.
- [ ] Guard department deletion with both an assignment count and foreign-key error handling; return a useful 409 response.
- [ ] Update the existing login schema and registration branch to require an active `departmentId` only when creating a new employee, and connect the relation atomically with the unique employee code.
- [ ] Load active departments on the login page; show a department dropdown labeled as required for first-time accounts, send its ID, and surface the server validation message when it is absent/inactive.
- [ ] Run `npx tsc --noEmit` and `npm run build`; inspect the public department response to ensure it contains no employee data.

### Task 3: Use department selections in Admin employee management and imports

**Files:**
- Modify: `src/lib/validators.ts`
- Modify: `src/app/api/admin/employees/route.ts`
- Modify: `src/app/api/admin/employees/[id]/route.ts`
- Modify: `src/app/api/admin/employees/import/route.ts`
- Modify: `src/app/admin/(dashboard)/employees/page.tsx`

**Interfaces:**
- Employee create/update payloads use `departmentId`, never a department name supplied as free text.
- Admin employee records include `departmentInfo` and `legacyDepartment`.
- CSV `department` values resolve by exact active department name or code; unknown values are reported and are not saved as free text.

- [ ] Change employee validation and create/update APIs to verify active department IDs and persist the relation.
- [ ] Update the Admin create form to use the department dropdown and add an edit form for name/email/department; display preserved legacy text beside unassigned employees.
- [ ] Update CSV import to resolve department values by catalog name/code, preserve the existing employee department when the CSV field is blank, and report invalid department values without creating free-text entries.
- [ ] Include canonical department names in Admin employee list responses and render a clear “Chưa phân loại” state for legacy records needing assignment.
- [ ] Run `npx tsc --noEmit` and `npm run build`; manually inspect the employee create/edit and CSV-import flows in the local app.

### Task 4: Preserve department displays across profile, ranking, and reports

**Files:**
- Modify: `src/lib/session.ts`
- Modify: `src/lib/leaderboard.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Modify: `src/app/api/admin/results/route.ts`
- Modify: `src/app/api/admin/reports/export/route.ts`
- Modify: `src/app/(app)/home/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/leaderboard/page.tsx`
- Modify: `src/app/admin/(dashboard)/results/page.tsx`

**Interfaces:**
- Employee session reads include the department relation and expose the canonical name to existing page components.
- Leaderboard, result, and report DTOs expose the canonical department name or the legacy value where an employee remains unassigned.

- [ ] Update current-employee lookup and `/api/auth/me` to include the department relation and resolve legacy text safely.
- [ ] Update leaderboard queries and result/report selects to read `departmentInfo.name` and fallback to `legacyDepartment` or “Chưa phân loại”.
- [ ] Update employee home/profile, leaderboards, Admin results, and CSV export to display the resolved name without exposing employee codes/emails on public leaderboards.
- [ ] Run `npx tsc --noEmit` and `npm run build`; inspect representative employee, leaderboard, Admin result, and CSV responses.

### Task 5: Reconcile existing employee assignments

**Files:**
- Create: `prisma/scripts/report-unassigned-employees.ts` (or equivalent one-off CLI under `prisma/`)
- Modify: `README.md`

**Interfaces:**
- Read-only report lists employee code, name, current legacy department, and assignment status; it does not modify database records.

- [ ] Add a read-only report command for employees without a department relation, including preserved legacy text.
- [ ] Document that Admin must assign the seven existing accounts using the verified organization chart; do not guess mappings in code or seed data.
- [ ] Run the report against the configured local database and confirm it identifies unassigned records without exposing credentials.

