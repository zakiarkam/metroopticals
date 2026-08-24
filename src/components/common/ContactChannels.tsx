import React from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * The "how to reach us" list.
 *
 * The contact page hand-wrote four of these rows and the FAQ page mapped three
 * from its own array — same markup, same icons, two sources of truth, and the
 * two had already drifted on which channels they offered.
 */

type Channel = "phone" | "email" | "whatsapp" | "address";

const CHANNELS: Record<
  Channel,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    href?: string;
  }
> = {
  phone: {
    icon: Phone,
    label: "Phone",
    value: siteConfig.contact.phone,
    href: siteConfig.contact.phoneHref,
  },
  email: {
    icon: Mail,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Message the store",
    href: `https://wa.me/${siteConfig.contact.whatsapp}`,
  },
  address: {
    icon: MapPin,
    label: "Visit us",
    value: siteConfig.contact.address,
  },
};

export default function ContactChannels({
  only = ["phone", "email", "whatsapp", "address"],
  className = "",
}: {
  /** Which channels to show, in order. */
  only?: Channel[];
  className?: string;
}) {
  return (
    <ul className={`divide-y divide-gray-3 ${className}`}>
      {only.map((key) => {
        const { icon: Icon, label, value, href } = CHANNELS[key];

        const body = (
          <>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
              <Icon className="h-[17px] w-[17px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-dark-5">
                {label}
              </span>
              <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-dark transition-colors group-hover:text-blue">
                {value}
              </span>
            </span>
          </>
        );

        return (
          <li key={key}>
            {href ? (
              <a
                href={href}
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex items-start gap-3.5 px-6 py-4 transition-colors hover:bg-gray-8"
              >
                {body}
              </a>
            ) : (
              <div className="flex items-start gap-3.5 px-6 py-4">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
