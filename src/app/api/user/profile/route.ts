import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth"
import { prisma } from "@/lib/db/prisma"
import { createSuccessResponse, handleError, NotFoundError } from "@/lib/errors"
import { logApiAction, logApiError } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await requireAuth()
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        customerType: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
      },
    })

    if (!user) {
      throw new NotFoundError("User not found")
    }

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "user_profile_view",
      resourceId: session.user.id,
    })

    return createSuccessResponse(user)
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  customerType: z.enum(["END_USER", "WHOLESALER", "RESELLER", "INSTALLER", "PROJECTS", "COMPANY"]).optional(),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
})

export async function PATCH(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const name = `${data.firstName.trim()} ${data.lastName.trim()}`.trim()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email: data.email,
        ...(data.customerType ? { customerType: data.customerType } : {}),
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        customerType: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
      },
    })

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "user_profile_update",
      resourceId: session.user.id,
    })

    return createSuccessResponse(user)
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
