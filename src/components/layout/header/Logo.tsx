"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";

const Logo = memo(function Logo() {
  return (
    <Link className="flex-shrink-0" href="/" aria-label="Go to Home">
      <Image
        src={siteConfig.logo}
        alt={siteConfig.name}
        width={867}
        height={983}
        className="h-11 w-auto sm:h-14"
        priority
      />
    </Link>
  );
});

export default Logo;
