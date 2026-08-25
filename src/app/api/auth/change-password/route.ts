import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleError, createSuccessResponse, UnauthorizedError } from '@/lib/errors'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { logApiAction, logApiError } from '@/lib/audit'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export async function PATCH(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      throw new UnauthorizedError('You must be logged in to change password')
    }

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    })

    if (!user || !user.password) {
      throw new UnauthorizedError('User not found')
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
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
