import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger, serializeError } from "@/lib/logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", public errors?: any) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export function handleError(error: unknown): NextResponse {
  logger.error("Request failed", serializeError(error));

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: true,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: true,
        message: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: any };

    if (prismaError.code === "P2002") {
      return NextResponse.json(
        {
          error: true,
          message: "A record with this value already exists",
          code: "DUPLICATE_ENTRY",
        },
        { status: 409 }
      );
    }

    if (prismaError.code === "P2025") {
      return NextResponse.json(
        {
          error: true,
          message: "Record not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // A write that ran out of its transaction budget. Nothing was saved, and
    // trying again usually works, so say that rather than "internal server
    // error" — which reads as "your data is gone" and is not what happened.
    if (prismaError.code === "P2028") {
      return NextResponse.json(
        {
          error: true,
          message:
            "That took too long and was rolled back — nothing was saved. Please try again.",
          code: "TRANSACTION_TIMEOUT",
        },
        { status: 503 }
      );
    }
  }

  // Unknown errors
  return NextResponse.json(
    {
      error: true,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error instanceof Error
          ? error.message
          : "Unknown error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}
