import { prisma } from "@/lib/db/prisma";
import { sendContactFormEmail } from "@/lib/email/resend";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { env } from "@/config/env";
import type { ContactFormInput } from "@/features/contact/validators/contact";
import { logger, serializeError } from "@/lib/logger";

export async function submitContactForm(data: ContactFormInput) {
  // Step 1: Save contact message to database
  const contactMessage = await prisma.contactMessage.create({
    data,
  });

  // Step 2: Check if email configuration is available
  const hasEmailConfig =
    !!env.ADMIN_EMAIL &&
    (!!env.RESEND_API_KEY ||
      (!!env.SMTP_HOST &&
        !!env.SMTP_PORT &&
        !!env.SMTP_USER &&
        !!env.SMTP_PASSWORD));

  // Step 3: Send email notification to admin
  if (hasEmailConfig) {
    try {
      const emailResult = await sendContactFormEmail(env.ADMIN_EMAIL!, data);
    } catch (error) {
      logger.error("❌ Email sending error", serializeError(error));
    }
  } else {
    logger.warn(
      "⚠️  Contact form email skipped - missing email configuration (RESEND_API_KEY or SMTP settings)"
    );
  }

  // Step 4: Send WhatsApp notification to admin (if phone number is provided)
  if (data.phone && env.ADMIN_PHONE) {
    try {
      // Format WhatsApp message with contact form details
      const whatsappMessage = `*New Contact Form Submission*\n\n*Name:* ${data.name}\n*Email:* ${data.email}\n*Phone:* ${data.phone}\n${
        data.subject ? `*Subject:* ${data.subject}\n` : ""
      }*Message:*\n${data.message}`;

      // Send WhatsApp notification to admin
      const whatsappResult = await sendWhatsAppMessage(
        env.ADMIN_PHONE,
        whatsappMessage
      );
    } catch (error) {
      logger.error("❌ WhatsApp sending error", serializeError(error));
    }
  } else {
    if (!data.phone) {
    } else if (!env.ADMIN_PHONE) {
    }
  }

  return contactMessage;
}
