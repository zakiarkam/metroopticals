import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { adminUpdateUserSchema } from "@/features/users/validators/user";
import { createSuccessResponse, handleError, ForbiddenError } from "@/lib/errors";
import {
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
} from "@/features/users/services/user-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  try {
    await requireAdmin();
    const user = await getUserById(id);
    return createSuccessResponse(user);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  const start = Date.now();
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const data = adminUpdateUserSchema.parse(body);

    // Only a SUPER_ADMIN may grant elevated roles or modify a SUPER_ADMIN.
    if (session.user.role !== "SUPER_ADMIN") {
      if (data.role && data.role !== "CUSTOMER") {
        throw new ForbiddenError("Only a super admin can assign admin roles");
      }
      const target = await getUserById(id);
      if (target.role !== "CUSTOMER") {
        throw new ForbiddenError("Only a super admin can modify admin accounts");
      }
    }

    const user = await updateUserByAdmin(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "admin_user_update",
      resourceId: id,
    });

    return createSuccessResponse(user);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  const start = Date.now();
  try {
    const session = await requireAdmin();

    if (id === session.user.id) {
      throw new ForbiddenError("You cannot delete your own account");
    }
    if (session.user.role !== "SUPER_ADMIN") {
      const target = await getUserById(id);
      if (target.role !== "CUSTOMER") {
        throw new ForbiddenError("Only a super admin can delete admin accounts");
      }
    }

    const result = await deleteUserByAdmin(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "admin_user_delete",
      resourceId: id,
    });

    return createSuccessResponse(result);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
