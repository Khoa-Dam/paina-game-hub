import { z } from "zod";

const departmentNameSchema = z.string().trim().min(1).max(150);
const departmentCodeSchema = z.string().trim().max(20).optional().or(z.literal(""));

export const departmentCreateSchema = z.object({
  name: departmentNameSchema,
  code: departmentCodeSchema,
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const departmentUpdateSchema = z.object({
  name: departmentNameSchema.optional(),
  code: departmentCodeSchema,
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});
