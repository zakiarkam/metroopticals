import { z } from "zod";

export const reportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["json", "excel", "pdf"]).default("json"),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
