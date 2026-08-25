import React from "react";

interface AuthHeaderProps {
  kicker: string;
  title: string;
  subtitle: string;
}

/** Title block above whichever form is showing. */
const AuthHeader = React.memo(
  ({ kicker, title, subtitle }: AuthHeaderProps) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        {kicker}
      </p>
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-dark">
        {title}
      </h1>
      <p className="text-sm text-dark-4">{subtitle}</p>
    </div>
  ),
);

AuthHeader.displayName = "AuthHeader";

export default AuthHeader;
