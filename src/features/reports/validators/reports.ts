import { z } from "zod";

export const reportQuerySchema = z.object({
  month: z.string().optional(), // Format: YYYY-MM
  startDate: z.string().optional(), // Format: YYYY-MM-DD
  endDate: z.string().optional(), // Format: YYYY-MM-DD
  format: z.enum(["json", "excel", "pdf"]).default("json"),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
