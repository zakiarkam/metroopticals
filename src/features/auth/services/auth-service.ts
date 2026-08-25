import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email/resend";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import type {
  SignupInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/features/auth/validators/auth";

const DUMMY_HASH = bcrypt.hashSync("placeholder-password", 12);

export async function createUser(data: SignupInput) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ValidationError("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "CUSTOMER",
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
      role: true,
      createdAt: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      postalCode: true,
    },
  });

  try {
    await sendWelcomeEmail(user.email, user.name);
  } catch (error) {
    logger.error("Failed to send welcome email", serializeError(error));
  }

  return user;
}

export async function requestPasswordReset(data: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    // Don't reveal if user exists for security
    return { message: "A reset link has been sent" };
  }

  // Generate reset token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

  // Delete any existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Create new reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires,
    },
  });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    logger.error("Failed to send password reset email", serializeError(error));
  }

  return { message: "A reset link has been sent" };
}

export async function resetPassword(data: ResetPasswordInput) {
  // Find reset token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: data.token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new ValidationError("Invalid or expired reset token");
  }

  // Check if token is expired
  if (new Date() > resetToken.expires) {
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    throw new ValidationError("Reset token has expired");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Update user password
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  });

  // Delete reset token
  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id },
  });

  return { message: "Password reset successfully" };
}

export async function verifyUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
      },
    });

    if (!user || !user.password) {
      // Keep timing identical whether or not the account exists.
      await bcrypt.compare(password, DUMMY_HASH);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      phone: user.phone,
      address: user.address,
      city: user.city,
      country: user.country,
      postalCode: user.postalCode,
    };
  } catch (error) {
    logger.error("Error verifying user", serializeError(error));
    throw new Error("Failed to verify user");
  }
}
