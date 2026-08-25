"use client";

import { FormEvent, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Loader2,
  Send,
} from "lucide-react";

import Image from "next/image";

import SiteContainer from "@/components/common/SiteContainer";
import { PillLink, SectionIntro } from "@/components/common/editorial";
import ContactChannels from "@/components/common/ContactChannels";
import PageHero from "@/components/common/PageHero";
import { contactApi } from "@/features/contact/api/contact-api";
import { siteConfig } from "@/config/site";
import { inputClasses, textareaClasses } from "@/components/common/form";

type FormStatus = {
  type: "success" | "error";
  message: string;
} | null;


const HOURS = [
  { days: "Mon – Fri", time: "9:00 am – 7:00 pm" },
  { days: "Saturday", time: "9:00 am – 6:00 pm" },
  { days: "Sunday", time: "10:00 am – 4:00 pm" },
];

const Contact = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const emailTrimmed = email.trim();
    const messageTrimmed = message.trim();

    if (
      !firstNameTrimmed ||
      !lastNameTrimmed ||
      !emailTrimmed ||
      !messageTrimmed
    ) {
      setStatus({
        type: "error",
        message: "Name, email, and message are required fields.",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: `${firstNameTrimmed} ${lastNameTrimmed}`,
      email: emailTrimmed,
      phone: phone.trim() || undefined,
      subject: subject.trim() || undefined,
      message: messageTrimmed,
    };

    try {
      const response = await contactApi.submitContact(payload);

      setStatus({
        type: "success",
        message:
          response.message ??
          "Your message has been sent. We'll be in touch soon!",
      });

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send your message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="We're here to help"
        title="Get in touch"
        description="Questions about a prescription, a frame, or an order? Call the store, message us on WhatsApp, or send the form — whichever is easiest."
        crumbs={[{ label: "Contact" }]}
      />

      {/* Opens the page the way the lens guides do — a split heading and one
          photograph of the actual shop, so "get in touch" has a place attached
          to it rather than landing straight on a form. */}
      <section className="border-b border-gray-3 bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <SectionIntro
            eyebrow="Come and see us"
            title="Colombo shop,"
            titleAccent="open six days a week."
            body="Walk in for a free fitting, a lens adjustment or an eye test — no appointment needed. If it is quicker to ask than to visit, the form below reaches the same people."
            action={<PillLink href="#contact-form">Send a message</PillLink>}
          />

          <div className="relative mt-12 aspect-[21/9] overflow-hidden rounded-2xl bg-gray-1">
            <Image
              src="/images/store/consult.jpg"
              alt="An optician fitting a pair of spectacles onto a smiling customer in the store"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </SiteContainer>
      </section>

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8">
            {/* ------------------------ contact rail ------------------------ */}
            <div
              className="flex flex-col gap-6 lg:sticky lg:self-start"
              style={{ top: "calc(var(--site-header-height, 132px) + 1.5rem)" }}
            >
              {/* Flattened to hairlines: a bordered panel inside a bordered
                  panel was two boxes doing one job. */}
              <div className="overflow-hidden border-y border-gray-3 bg-gray-2">
                <div className="border-b border-gray-3 px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
                    Reach us
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold text-dark">
                    Contact details
                  </h2>
                </div>

                <ContactChannels />

                <div className="flex items-center gap-3 border-t border-gray-3 px-6 py-4">
                  <a
                    href={siteConfig.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Metro Opticals on Facebook"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-3 text-dark-4 transition-colors hover:border-blue hover:text-blue"
                  >
                    <Facebook className="h-[18px] w-[18px]" />
                  </a>
                  <a
                    href={siteConfig.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Metro Opticals on Instagram"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-3 text-dark-4 transition-colors hover:border-blue hover:text-blue"
                  >
                    <Instagram className="h-[18px] w-[18px]" />
                  </a>
                </div>
              </div>

              {/* ------------------------ hours ------------------------ */}
              <div className="border-y border-gray-3 bg-gray-2 px-6 py-6">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
                  <Clock className="h-4 w-4" />
                  Opening hours
                </p>

                <dl className="mt-4 divide-y divide-gray-3">
                  {HOURS.map((slot) => (
                    <div
                      key={slot.days}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <dt className="text-[13.5px] text-dark-4">{slot.days}</dt>
                      <dd className="text-[13.5px] font-semibold text-dark">
                        {slot.time}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 flex items-start gap-2 rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-dark-3">
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  Eye tests are free with every pair. Walk-ins welcome, booked
                  slots seen first.
                </p>
              </div>
            </div>

            {/* ------------------------ form ------------------------ */}
            <div
              id="contact-form"
              className="scroll-mt-32 rounded-2xl border border-gray-3 bg-gray-2 p-6 shadow-2 sm:p-8"
            >
              <h2 className="text-[1.35rem] font-bold tracking-tight text-dark sm:text-[1.6rem]">
                Send us a message
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-body">
                Fill this in and we&apos;ll reply within one working day. For
                anything urgent, please call the store.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-[12.5px] font-semibold text-dark"
                    >
                      First name <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="Nuwan"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className={inputClasses}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-[12.5px] font-semibold text-dark"
                    >
                      Last name <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Perera"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className={inputClasses}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-[12.5px] font-semibold text-dark"
                    >
                      Email address <span className="text-red">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClasses}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-[12.5px] font-semibold text-dark"
                    >
                      Phone{" "}
                      <span className="font-normal text-dark-5">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      placeholder="07X XXX XXXX"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className={inputClasses}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-[12.5px] font-semibold text-dark"
                  >
                    Subject{" "}
                    <span className="font-normal text-dark-5">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    placeholder="Booking an eye test"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className={inputClasses}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-2 block text-[12.5px] font-semibold text-dark"
                  >
                    Message <span className="text-red">*</span>
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows={6}
                    placeholder="Tell us what you need — the more detail, the faster we can help."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className={textareaClasses}
                    disabled={isSubmitting}
                  />
                </div>

                {status && (
                  <div
                    role="status"
                    className={`flex items-start gap-2.5 rounded-xl border px-4 py-3.5 text-[13px] leading-relaxed ${
                      status.type === "success"
                        ? "border-green/30 bg-green/10 text-green"
                        : "border-red/30 bg-red/10 text-red"
                    }`}
                  >
                    {status.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {status.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-[17px] w-[17px]" />
                      Send message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
};

export default Contact;
