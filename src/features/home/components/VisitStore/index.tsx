import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import { siteConfig } from "@/config/site";

const HOURS = [
  { days: "Monday – Friday", time: "9:00 am – 7:00 pm" },
  { days: "Saturday", time: "9:00 am – 6:00 pm" },
  { days: "Sunday", time: "10:00 am – 4:00 pm" },
];

export default function VisitStore() {
  return (
    <section className="relative overflow-hidden bg-gray-1 py-12 sm:py-14 lg:py-16">
      <SiteContainer>
        <div className="grid overflow-hidden rounded-3xl border border-gray-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          {/* ---------- copy side ---------- */}
          <div className="relative bg-gradient-to-br from-blue-light-3 via-blue-light-2 to-blue-light p-6 sm:p-10 lg:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "radial-gradient(#1B1713 1.5px, transparent 1.5px)",
                backgroundSize: "18px 18px",
              }}
            />

            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-dark-2">
                Come and try them on
              </p>
              <h2 className="mt-3 max-w-md font-display text-[2rem] font-bold leading-[1.06] tracking-[-0.03em] text-dark sm:text-[2.5rem]">
                Visit the store. Bring your old pair.
              </h2>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-dark-2">
                We will measure your pupillary distance, check the fit against
                your face shape, and read the prescription off your current
                lenses if you have lost the paperwork.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-dark px-6 py-3 text-[13.5px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Book an eye test
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-dark/40 px-5 py-[10px] text-[13.5px] font-bold text-dark transition-colors hover:border-dark"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp us
                </a>
              </div>

              <dl className="mt-9 grid gap-4 border-t border-dark/25 pt-7 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-dark-2" />
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-dark-2">
                      Where
                    </dt>
                    <dd className="mt-1 break-words text-[13.5px] font-semibold leading-snug text-dark">
                      {siteConfig.contact.address}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-[18px] w-[18px] shrink-0 text-dark-2" />
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-dark-2">
                      Call
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={siteConfig.contact.phoneHref}
                        className="text-[13.5px] font-semibold text-dark hover:underline"
                      >
                        {siteConfig.contact.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* ---------- hours + photo side ---------- */}
          <div className="relative flex flex-col justify-between bg-gray-2">
            <div className="relative h-52 w-full overflow-hidden sm:h-64 lg:h-[46%]">
              <Image
                src="/images/hero/eye-test.jpg"
                alt="Optometrist carrying out an eye examination at Metro Opticals"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-gray-2 via-gray-2/20 to-transparent"
              />
            </div>

            <div className="p-6 sm:p-10">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
                <Clock className="h-4 w-4" />
                Opening hours
              </p>

              <dl className="mt-5 divide-y divide-gray-3">
                {HOURS.map((slot) => (
                  <div
                    key={slot.days}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5"
                  >
                    <dt className="text-[13.5px] font-medium text-dark-3">
                      {slot.days}
                    </dt>
                    <dd className="text-[13.5px] font-semibold text-dark">
                      {slot.time}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-[12.5px] leading-relaxed text-dark-5">
                Walk-ins are welcome. Booked appointments are seen first during
                weekends and public holidays.
              </p>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
