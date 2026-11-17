import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

type LoadTestUser = {
  employeeCode: string;
  password: string;
};

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const expectedProjectRef = process.env.LOAD_TEST_STAGING_PROJECT_REF;

if (process.env.LOAD_TEST_ALLOW_STAGING_WRITES !== "YES") {
  throw new Error("Set LOAD_TEST_ALLOW_STAGING_WRITES=YES to confirm staging writes.");
}
if (!databaseUrl || !expectedProjectRef) {
  throw new Error("DATABASE_URL and LOAD_TEST_STAGING_PROJECT_REF are required.");
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
}

const actualProjectRef = decodeURIComponent(parsedUrl.username).match(
  /\.([a-z0-9]+)$/i,
)?.[1];
if (
  !parsedUrl.hostname.endsWith(".pooler.supabase.com") ||
  parsedUrl.port !== "6543" ||
  parsedUrl.searchParams.get("pgbouncer") !== "true" ||
  actualProjectRef !== expectedProjectRef
) {
  throw new Error(
    "Refusing staging user setup: DATABASE_URL must be the confirmed project's Supabase transaction pooler URL.",
  );
}

const count = Number(process.env.LOAD_TEST_USER_COUNT ?? 100);
if (!Number.isInteger(count) || count < 1 || count > 100) {
  throw new Error("LOAD_TEST_USER_COUNT must be an integer from 1 to 100.");
}

const prisma = new PrismaClient();

async function main() {
  const department = await prisma.department.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!department) {
    throw new Error("Seed an active department before preparing staging users.");
  }

  const password = randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  const users: LoadTestUser[] = Array.from({ length: count }, (_, index) => ({
    employeeCode: `K6STAGE${String(index + 1).padStart(3, "0")}`,
    password,
  }));

  for (const user of users) {
    await prisma.employee.upsert({
      where: { employeeCode: user.employeeCode },
      create: {
        employeeCode: user.employeeCode,
        fullName: `Staging Load Test ${user.employeeCode}`,
        departmentId: department.id,
        passwordHash,
        status: "ACTIVE",
      },
      update: {
        fullName: `Staging Load Test ${user.employeeCode}`,
        departmentId: department.id,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }

  const credentialsPath = path.resolve(
    process.cwd(),
    "load-tests/users.staging.local.json",
  );
  await writeFile(credentialsPath, `${JSON.stringify(users, null, 2)}\n`, {
    encoding: "utf8",
  });

  process.stdout.write(
    `Prepared ${count} staging-only load-test accounts for project ${expectedProjectRef}. Credentials saved locally; password omitted.\n`,
  );
}

main()
  .catch((error: unknown) => {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : error instanceof Error
          ? error.name
          : "UnknownError";
    process.stderr.write(`Could not prepare staging users (${code}).\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
