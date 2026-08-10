/**
 * Session Storage Utility
 * Manages user session data in localStorage for quick access
 */

export interface StoredUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  image?: string | null;
  createdAt?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

const SESSION_KEY = "user_session";

/**
 * Save user session to localStorage
 */
export function saveUserSession(user: StoredUser): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save user session:", error);
  }
}

/**
 * Get user session from localStorage
 */
export function getUserSession(): StoredUser | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to get user session:", error);
    return null;
  }
}

/**
 * Clear user session from localStorage
 */
export function clearUserSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SESSION_KEY);
    // Also clear other auth-related items
    localStorage.removeItem("authToken");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("nextauth.message");
  } catch (error) {
    console.error("Failed to clear user session:", error);
  }
}

/**
 * Check if user session exists in localStorage
 */
export function hasUserSession(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return !!localStorage.getItem(SESSION_KEY);
  } catch (error) {
    return false;
  }
}
