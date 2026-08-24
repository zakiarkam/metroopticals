"use client";

import React from "react";
const AuthLayoutClient = React.memo(function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-1 antialiased">{children}</div>;
});

export default AuthLayoutClient;
