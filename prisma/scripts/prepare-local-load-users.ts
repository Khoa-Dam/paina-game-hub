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

loadEnvConfig(process.cwd(), true);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to prepare local load-test users.");
}

let databaseHost: string;
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase();
} catch {
  throw new Error("DATABASE_URL must be a valid local PostgreSQL URL.");
}
if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error(
    "Refusing to create load-test accounts: DATABASE_URL must point to localhost.",
  );
}

const count = Number(process.env.LOAD_TEST_USER_COUNT ?? 50);
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
    throw new Error("Create an active department before preparing test users.");
  }

  const password = randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  const users: LoadTestUser[] = Array.from({ length: count }, (_, index) => ({
    employeeCode: `K6LOCAL${String(index + 1).padStart(3, "0")}`,
    password,
  }));

  for (const user of users) {
    await prisma.employee.upsert({
      where: { employeeCode: user.employeeCode },
      create: {
        employeeCode: user.employeeCode,
        fullName: `Local Load Test ${user.employeeCode}`,
        departmentId: department.id,
        passwordHash,
        status: "ACTIVE",
      },
      update: {
        fullName: `Local Load Test ${user.employeeCode}`,
        departmentId: department.id,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }

  const credentialsPath = path.resolve(
    process.cwd(),
    "load-tests/users.local.json",
  );
  await writeFile(credentialsPath, `${JSON.stringify(users, null, 2)}\n`, {
    encoding: "utf8",
  });

  console.log(
    `Prepared ${count} local-only test accounts. Credentials saved to ${credentialsPath}.`,
  );
}

main()
  .catch(() => {
    console.error(
      "Could not prepare local load-test users. Check local DB and migrations.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
