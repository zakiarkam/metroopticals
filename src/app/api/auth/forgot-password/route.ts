import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/validators/auth";
import { requestPasswordReset } from "@/features/auth/services/auth-service";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);

    const result = await requestPasswordReset(data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "password_reset_requested",
    });

    return createSuccessResponse(result);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
