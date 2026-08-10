import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { adminCreateUserSchema, userQuerySchema } from '@/features/users/validators/user'
import { createSuccessResponse, handleError } from '@/lib/errors'
import { createUserByAdmin, listUsers } from '@/features/users/services/user-service'
import { logApiAction, logApiError } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const query = userQuerySchema.parse(Object.fromEntries(searchParams))

    const result = await listUsers(query)
    return createSuccessResponse(result)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    await requireAdmin()

    const body = await request.json()
    const data = adminCreateUserSchema.parse(body)

    const user = await createUserByAdmin(data)

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: 'admin_user_create',
      resourceId: user.id,
    })

    return createSuccessResponse(user, 201)
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
