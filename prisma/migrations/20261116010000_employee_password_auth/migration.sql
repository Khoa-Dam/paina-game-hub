ALTER TABLE "Employee" ADD COLUMN "passwordHash" TEXT;

CREATE TABLE "EmployeePasswordSetup" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePasswordSetup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeePasswordSetup_tokenHash_key" ON "EmployeePasswordSetup"("tokenHash");
CREATE INDEX "EmployeePasswordSetup_employeeId_expiresAt_idx" ON "EmployeePasswordSetup"("employeeId", "expiresAt");

ALTER TABLE "EmployeePasswordSetup"
ADD CONSTRAINT "EmployeePasswordSetup_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
