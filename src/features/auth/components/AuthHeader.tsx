import React from "react";
import Image from "next/image";

const AuthHeader = React.memo(() => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/10 text-blue">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M7 4h10l1.125 4H6.25L7 4Zm12 6H5.428l-.35-1.25H3v2h1.813l1.362 4.64A3 3 0 0 0 9.107 20h5.786a3 3 0 0 0 2.882-2.36l1.5-6A1 1 0 0 0 18.5 10ZM11 18H9a1 1 0 0 1-1-.943L7.25 9h9.5l-.75 2.935A1 1 0 0 0 15 13h3.25l-.875 3.5H16v1a.5.5 0 0 1-.5.5Z" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Metro Opticals
        </p>
        <h1 className="text-2xl font-semibold text-dark">Welcome Back</h1>
        <p className="text-xs text-muted-foreground">
          Please login to your account
        </p>
      </div>
    </div>
  );
});

AuthHeader.displayName = "AuthHeader";

export default AuthHeader;
