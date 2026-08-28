import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleError, createSuccessResponse, UnauthorizedError, ValidationError } from '@/lib/errors'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { logApiAction, logApiError } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { changePasswordSchema } from '@/features/auth/validators/auth'

export async function PATCH(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      throw new UnauthorizedError('You must be logged in to change password')
    }

    rateLimit(`change-pw:${session.user.id}`, 5, 15 * 60 * 1000)

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    })

    if (!user || !user.password) {
      throw new ValidationError('This account signs in with Google and has no password')
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      throw new ValidationError('Current password is incorrect')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    })

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: 'password_changed',
      resourceId: user.id,
    })

    return createSuccessResponse({ message: 'Password changed successfully' })
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
