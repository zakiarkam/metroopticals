"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";

const Logo = memo(function Logo() {
  return (
    <Link className="flex-shrink-0" href="/" aria-label="Go to Home">
      {/* The lockup stacks a glasses mark over the wordmark, so it needs real
          height to stay legible  at 44px the "opticals" line was a smudge. */}
      <Image
        src={siteConfig.logo}
        alt={siteConfig.name}
        width={867}
        height={983}
        sizes="72px"
        className="h-14 w-auto sm:h-16"
        priority
      />
    </Link>
  );
});

export default Logo;
