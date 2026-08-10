import { NextRequest } from 'next/server'
import { contactFormSchema } from '@/features/contact/validators/contact'
import { submitContactForm } from '@/features/contact/services/contact-service'
import { handleError, createSuccessResponse } from '@/lib/errors'
import { logApiAction, logApiError } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const body = await request.json()
    const data = contactFormSchema.parse(body)
    
    const contactMessage = await submitContactForm(data)
    
    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: 'contact_submit',
      resourceId: contactMessage.id,
    })

    return createSuccessResponse(
      {
        message: 'Contact form submitted successfully',
        contactMessage,
      },
      201
    )
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
