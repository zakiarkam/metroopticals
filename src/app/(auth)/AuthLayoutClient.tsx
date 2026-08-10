"use client";

import React from "react";
const AuthLayoutClient = React.memo(function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-gray-2 antialiased min-h-screen">{children}</div>;
});

export default AuthLayoutClient;
