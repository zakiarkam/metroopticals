import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { logClientAction, logClientError } from "@/lib/client-logger";

const axiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 20000,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
      logClientAction("api_request", {
        method,
        url: config.url,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Check if response is HTML instead of JSON
    const contentType = String(response.headers["content-type"] ?? "");
    const isHTML = contentType.includes("text/html");
    const isString = typeof response.data === "string";

    if (isHTML || (isString && response.data.includes("<!DOCTYPE html>"))) {
      const url = response.config.url || "";

      // Skip HTML check for NextAuth endpoints - they handle their own flow
      const isNextAuthEndpoint =
        url.includes("/api/auth/") ||
        url.includes("/auth/callback/") ||
        url.includes("/auth/log-in") ||
        url.includes("/auth/session");

      if (isNextAuthEndpoint) {
        return {
          ...response,
          data: {
            success: true,
            isNextAuth: true,
            status: response.status,
          },
        };
      }

      // For non-auth endpoints, throw error
      console.error("Server returned HTML instead of JSON", {
        url,
        contentType,
        dataSnippet: isString ? response.data.substring(0, 100) : "N/A",
      });

      throw new Error(
        `API endpoint returned HTML. This usually means the route doesn't exist or isn't returning JSON. URL: ${url}`,
      );
    }

    // Handle wrapped responses
    if (response.data?.data && typeof response.data.data === "object") {
      return { ...response, data: response.data.data };
    }

    return response;
  },
  (error: AxiosError) => {
    const isCanceled =
      (error as any)?.code === "ERR_CANCELED" ||
      error.message?.toLowerCase() === "canceled" ||
      (error as any)?.name === "CanceledError" ||
      (error as any)?.name === "AbortError" ||
      (axios as any).isCancel?.(error);

    // Silently reject canceled requests - this is expected behavior
    if (isCanceled) {
      return Promise.reject(error);
    }

    // Handle common errors
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("admin_user");

        // Only pages that need a login are sent to it. A 401 on a public
        // page  a retired session fetching the cart on the home page  is
        // handled by the caller; navigating away from it turned a stale
        // cookie into a redirect loop between / and /log-in.
        const { pathname } = window.location;
        const needsLogin =
          pathname.startsWith("/admin") ||
          pathname.startsWith("/checkout") ||
          pathname.startsWith("/my-account");
        if (needsLogin && !pathname.includes("/log-in")) {
          window.location.href = "/log-in";
        }
      }
    }

    const status = error.response?.status;
    const detail = {
      url: error.config?.url,
      method: error.config?.method,
      status,
      message:
        // prefer server message if exists
        (error.response?.data as any)?.message || error.message,
    };

    // "You are not signed in" is a state the app handles, not a fault. Logged
    // as an error it became a red overlay in development and a stream of
    // pointless entries in the client log - for something as ordinary as a
    // session expiring while a tab was left open. The caller still gets the
    // rejection and still decides what to do about it.
    if (status === 401 || status === 403) {
      console.warn("API request not authorised:", detail);
      return Promise.reject(error);
    }

    console.error("API Error:", detail);

    logClientError(error, {
      url: error.config?.url,
      method: error.config?.method,
      status,
    });

    return Promise.reject(error);
  },
);

export default axiosInstance;
