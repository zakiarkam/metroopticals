"use client";

import { useEffect, useState } from "react";
import { useSession, UseSessionOptions } from "next-auth/react";
import {
  clearUserSession,
  getUserSession,
  saveUserSession,
  StoredUser,
} from "@/lib/sessionStorage";

export const useCachedSession = (options?: UseSessionOptions<any>) => {
  const sessionResult = useSession(options);
  const [cachedUser, setCachedUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setCachedUser(getUserSession());
  }, []);

  useEffect(() => {
    const user = sessionResult.data?.user as any;
    if (user?.id == null) return;

    const storedUser: StoredUser = {
      id: typeof user.id === "number" ? user.id : Number(user.id),
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? "CUSTOMER",
      image: user.image ?? null,
      createdAt: user.createdAt ?? null,
      phone: user.phone ?? null,
      address: user.address ?? null,
      city: user.city ?? null,
      country: user.country ?? null,
      postalCode: user.postalCode ?? null,
    };

    if (!Number.isNaN(storedUser.id)) {
      saveUserSession(storedUser);
      setCachedUser(storedUser);
    }
  }, [sessionResult.data?.user]);

  useEffect(() => {
    if (sessionResult.status === "unauthenticated") {
      clearUserSession();
      setCachedUser(null);
    }
  }, [sessionResult.status]);

  return { ...sessionResult, cachedUser };
};
