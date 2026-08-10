import "server-only";
import fs from "fs";
import path from "path";
import winston from "winston";
import type TransportStream from "winston-transport";

const isProduction = process.env.NODE_ENV === "production";
const logDir =
  process.env.LOG_DIR ||
  (isProduction ? "/var/log/app" : path.join(process.cwd(), "logs"));

let hasLogDir = true;
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (error) {
  hasLogDir = false;
  console.warn("Logger: unable to create log directory, using console only.");
}

const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleTransport = new winston.transports.Console({
  format: baseFormat,
});

const appTransports: TransportStream[] = [consoleTransport];
const auditTransports: TransportStream[] = [consoleTransport];
const performanceTransports: TransportStream[] = [consoleTransport];

if (hasLogDir) {
  appTransports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
  appTransports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  auditTransports.push(
    new winston.transports.File({
      filename: path.join(logDir, "audit.log"),
      maxsize: 5242880,
      maxFiles: 10,
    })
  );

  performanceTransports.push(
    new winston.transports.File({
      filename: path.join(logDir, "performance.log"),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "metro-opticals-api" },
  format: baseFormat,
  transports: appTransports,
});

export const auditLogger = winston.createLogger({
  level: "info",
  defaultMeta: { service: "metro-opticals-api", type: "audit" },
  format: baseFormat,
  transports: auditTransports,
});

export const performanceLogger = winston.createLogger({
  level: "info",
  defaultMeta: { service: "metro-opticals-api", type: "performance" },
  format: baseFormat,
  transports: performanceTransports,
});

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  if (error && typeof error === "object") {
    const maybeError = error as { name?: string; message?: string; stack?: string };
    return {
      name: maybeError.name,
      message: maybeError.message,
      stack: maybeError.stack,
    };
  }

  return { message: String(error) };
}

export function getRequestMeta(request: {
  headers?: Headers;
  method?: string;
  nextUrl?: { pathname?: string };
}) {
  const forwardedFor = request.headers?.get("x-forwarded-for") || "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers?.get("x-real-ip") ||
    undefined;

  return {
    ip,
    method: request.method,
    path: request.nextUrl?.pathname,
    userAgent: request.headers?.get("user-agent") || undefined,
    requestId: request.headers?.get("x-request-id") || undefined,
  };
}
