CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

INSERT INTO "Department" ("id", "code", "name", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  ('dept-01', '01', 'P. Kinh doanh Sỉ', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-02', '02', 'P. Kinh doanh Lẻ', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-03', '03', 'P. Kế toán – Nhân sự', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-04', '04', 'P. Phát triển Sản phẩm & Media', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-05', '05', 'P. Kế hoạch & Vận hành Sản xuất', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-06', '06', 'Sản xuất (gồm Tổ Sáp, Tổ Đúc, Tổ Nguội, Tổ Khắc Cưa – Xi mạ)', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-07', '07', 'P. QC – Đóng gói', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept-08', '08', 'P. Kho', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Employee" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "legacyDepartment" TEXT;

UPDATE "Employee" AS e
SET "departmentId" = d."id"
FROM "Department" AS d
WHERE e."department" IS NOT NULL
  AND LOWER(BTRIM(e."department")) = LOWER(BTRIM(d."name"));

UPDATE "Employee"
SET "legacyDepartment" = "department"
WHERE "department" IS NOT NULL AND "departmentId" IS NULL;

ALTER TABLE "Employee" DROP COLUMN "department";
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
