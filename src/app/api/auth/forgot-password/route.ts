import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/validators/auth";
import { requestPasswordReset } from "@/features/auth/services/auth-service";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    rateLimit(`forgot-pw:${getClientIp(request)}`, 5, 15 * 60 * 1000);

    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);
    rateLimit(`forgot-pw-email:${data.email.toLowerCase()}`, 3, 60 * 60 * 1000);

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
