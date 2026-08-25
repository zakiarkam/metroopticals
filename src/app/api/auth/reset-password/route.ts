import { NextRequest } from 'next/server'
import { resetPasswordSchema } from '@/features/auth/validators/auth'
import { resetPassword } from '@/features/auth/services/auth-service'
import { handleError, createSuccessResponse } from '@/lib/errors'
import { logApiAction, logApiError } from '@/lib/audit'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    rateLimit(`reset-pw:${getClientIp(request)}`, 10, 15 * 60 * 1000)

    const body = await request.json()
    const data = resetPasswordSchema.parse(body)
    
    const result = await resetPassword(data)
    
    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: 'password_reset_completed',
    })

    return createSuccessResponse(result)
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
