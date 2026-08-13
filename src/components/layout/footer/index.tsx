"use client";
import React from "react";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Footer as AnimatedFooter } from "@/components/ui/modem-animated-footer";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { siteConfig } from "@/config/site";

const Footer = () => {
  const { status } = useCachedSession();
  const isAuthenticated = status === "authenticated";

  const socialLinks = [
    {
      icon: <Facebook className="w-6 h-6" />,
      href: siteConfig.social.facebook,
      label: "Facebook",
    },
    {
      icon: <Instagram className="w-6 h-6" />,
      href: siteConfig.social.instagram,
      label: "Instagram",
    },
  ];

  const contactItems = [
    {
      icon: <MapPin className="w-4 h-4" />,
      label: siteConfig.contact.address,
    },
    {
      icon: <Phone className="w-4 h-4" />,
      label: siteConfig.contact.phone,
      href: siteConfig.contact.phoneHref,
    },
    {
      icon: <Mail className="w-4 h-4" />,
      label: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
    },
  ];

  // Login / Register is hidden once signed in, matching the previous footer.
  const navLinks = [
    { label: "Shop", href: "/shop-with-sidebar" },
    { label: "FAQ's", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "My Account", href: "/my-account" },
    ...(isAuthenticated
      ? []
      : [{ label: "Login / Register", href: "/log-in" }]),
    { label: "Cart", href: "/cart" },
    { label: "Wishlist", href: "/wishlist" },
  ];

  return (
    <AnimatedFooter
      brandName={siteConfig.name}
      // Single word keeps the oversized wordmark on one line.
      backgroundText="Metro"
      brandDescription={siteConfig.description}
      socialLinks={socialLinks}
      contactItems={contactItems}
      navLinks={navLinks}
      brandIcon={
        <Image
          src={siteConfig.logoMark}
          alt={siteConfig.name}
          width={96}
          height={96}
          className="w-8 sm:w-10 md:w-16 h-auto"
        />
      }
    />
  );
};

export default Footer;
