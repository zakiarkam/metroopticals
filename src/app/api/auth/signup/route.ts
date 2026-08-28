import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/features/auth/validators/auth";
import { createUser } from "@/features/auth/services/auth-service";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    rateLimit(`signup:${getClientIp(request)}`, 5, 15 * 60 * 1000);

    const body = await request.json();
    const data = signupSchema.parse(body);

    // Per address as well as per IP, so the "already exists" answer cannot be
    // used to test a list of emails from many connections.
    rateLimit(`signup-email:${data.email.toLowerCase()}`, 3, 60 * 60 * 1000);

    const user = await createUser(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "user_signup",
      resourceId: user.id,
    });

    return createSuccessResponse(
      {
        message: "User created successfully",
        user,
      },
      201
    );
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
