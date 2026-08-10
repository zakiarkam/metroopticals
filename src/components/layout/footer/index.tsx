"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import SiteContainer from "@/components/common/SiteContainer";
import { siteConfig } from "@/config/site";

// Social Media Icons Component
const SocialIcon = ({ href, label, children }) => (
  <a
    href={href}
    aria-label={label}
    className="flex ease-out duration-200 hover:text-blue transition-colors"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

// Contact Info Item Component
const ContactItem = ({
  icon,
  children,
  href = undefined,
  ariaLabel = undefined,
}) => {
  const content = (
    <div className="flex gap-3 md:gap-4.5 items-start">
      <span className="flex-shrink-0 mt-1">{icon}</span>
      <span className="text-sm md:text-base">{children}</span>
    </div>
  );

  return href ? (
    <a
      href={href}
      className="hover:text-blue transition-colors"
      aria-label={ariaLabel}
    >
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
};

// Footer Section Component
const FooterSection = ({ title, children, className = "" }) => (
  <div className={`w-full sm:w-auto ${className}`}>
    <h2 className="mb-5 md:mb-7.5 text-base md:text-lg font-medium text-dark">
      {title}
    </h2>
    {children}
  </div>
);

// Footer Link Component
const FooterLink = ({ href, children }) => (
  <li>
    <Link
      className="text-sm md:text-base ease-out duration-200 hover:text-blue transition-colors inline-block"
      href={href}
    >
      {children}
    </Link>
  </li>
);

// Account Links Component with session check
const AccountLinks = () => {
  const { status } = useCachedSession();
  const isAuthenticated = status === "authenticated";

  return (
    <ul className="flex flex-col gap-3 md:gap-3.5">
      <FooterLink href="/my-account">My Account</FooterLink>
      {!isAuthenticated && (
        <FooterLink href="/log-in">Login / Register</FooterLink>
      )}
      <FooterLink href="/cart">Cart</FooterLink>
      <FooterLink href="/wishlist">Wishlist</FooterLink>
    </ul>
  );
};

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden border-t border-gray-200">
      <SiteContainer>
        {/* Footer Menu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 xl:gap-19 pt-12 md:pt-17.5 xl:pt-22.5 pb-8 md:pb-10 xl:pb-15">
          {/* Contact Section */}
          <FooterSection
            title="Help & Support"
            className="sm:col-span-2 lg:col-span-1"
          >
            <ul className="flex flex-col gap-4 md:gap-5">
              <li>
                <ContactItem
                  icon={
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3C50E0"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  }
                >
                  {siteConfig.contact.address}
                </ContactItem>
              </li>

              <li>
                <ContactItem
                  href={siteConfig.contact.phoneHref}
                  ariaLabel={`Call ${siteConfig.contact.phone}`}
                  icon={
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3C50E0"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  }
                >
                  {siteConfig.contact.phone}
                </ContactItem>
              </li>

              <li>
                <ContactItem
                  href={`mailto:${siteConfig.contact.email}`}
                  ariaLabel={`Email ${siteConfig.contact.email}`}
                  icon={
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3C50E0"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  }
                >
                  {siteConfig.contact.email}
                </ContactItem>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6 md:mt-7.5">
              <SocialIcon href={siteConfig.social.facebook} label="Facebook">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1877F2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </SocialIcon>

              <SocialIcon
                href={siteConfig.social.instagram}
                label="Instagram"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="url(#instagramGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient
                      id="instagramGradient"
                      x1="0%"
                      y1="100%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "#E1306C", stopOpacity: 1 }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "#C13584", stopOpacity: 1 }}
                      />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </SocialIcon>
            </div>
          </FooterSection>

          {/* Account Section */}
          <FooterSection title="Account">
            <AccountLinks />
          </FooterSection>

          {/* Quick Links Section */}
          <FooterSection title="Quick Link">
            <ul className="flex flex-col gap-3">
              <FooterLink href="/shop-with-sidebar">Shop</FooterLink>
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/faq">FAQ&apos;s</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </ul>
          </FooterSection>
        </div>
      </SiteContainer>

      {/* Footer Bottom */}
      <div className="py-4 md:py-5 xl:py-7.5 bg-gray-1">
        <SiteContainer>
          <div className="text-center md:text-left">
            <p className="text-dark font-medium text-sm md:text-base">
              &copy; {year}. All rights reserved by {siteConfig.name}.
            </p>
          </div>
        </SiteContainer>
      </div>
    </footer>
  );
};

export default Footer;
