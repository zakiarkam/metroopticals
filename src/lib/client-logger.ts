type ClientLogLevel = "info" | "warn" | "error";

type ClientLogPayload = {
  level: ClientLogLevel;
  message: string;
  event_type?: string;
  requestId?: string;
  context?: Record<string, unknown>;
};

function generateRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sendClientLog(payload: ClientLogPayload) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/logs", blob);
      return;
    }

    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore client logging failures
  }
}

export function logClientError(
  error: unknown,
  context: Record<string, unknown> = {}
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  sendClientLog({
    level: "error",
    message,
    event_type: "client_error",
    requestId: generateRequestId(),
    context: {
      ...context,
      ...(stack ? { stack } : {}),
    },
  });
}

export function logClientAction(
  action: string,
  context: Record<string, unknown> = {}
) {
  sendClientLog({
    level: "info",
    message: action,
    event_type: "client_action",
    requestId: generateRequestId(),
    context,
  });
}
