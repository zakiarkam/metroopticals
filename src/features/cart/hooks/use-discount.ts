"use client";

import { useSession } from "next-auth/react";

export const useDiscountVisibility = () => {
  const { status } = useSession();
  return status === "authenticated";
};
