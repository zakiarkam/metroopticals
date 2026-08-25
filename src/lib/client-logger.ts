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

// Browser noise that carries no signal and can fire dozens of times a second
// (Safari emits the ResizeObserver one on every layout pass of an accordion).
const IGNORED_MESSAGES = [
  /ResizeObserver loop/i,
  /Script error\.?$/i,
  /Load failed/i,
  /NetworkError when attempting to fetch/i,
];

// Collapse bursts of the same message so one broken render doesn't flood the
// server (and trip its rate limit) with identical entries.
const recentMessages = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;

function shouldSend(payload: ClientLogPayload): boolean {
  if (IGNORED_MESSAGES.some((re) => re.test(payload.message))) return false;

  const key = `${payload.level}:${payload.message}`;
  const now = Date.now();
  const last = recentMessages.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;

  recentMessages.set(key, now);
  if (recentMessages.size > 200) {
    const oldest = recentMessages.keys().next().value;
    if (oldest !== undefined) recentMessages.delete(oldest);
  }
  return true;
}

function sendClientLog(payload: ClientLogPayload) {
  if (!shouldSend(payload)) return;
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
