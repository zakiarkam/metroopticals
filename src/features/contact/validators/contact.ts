import { z } from 'zod'

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(2000),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>


