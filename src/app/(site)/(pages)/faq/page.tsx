import Breadcrumb from "@/components/common/Breadcrumb";
import SiteContainer from "@/components/common/SiteContainer";
import { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { siteConfig } from "@/config/site";

const faqs = [
  {
    question: "What does Metro Opticals offer?",
    answer: [
      "We stock prescription eyeglasses, sunglasses, reading glasses, blue-light and computer lenses, contact lenses, and a full range of eyewear accessories such as cases, cleaning kits and lens solutions.",
      "Our frames span everyday budget-friendly options through to premium designer brands, in metal, acetate, titanium and rimless styles for men, women and children.",
    ],
  },
  {
    question: "Can I order prescription glasses online?",
    answer: [
      "Yes. Choose your frame, select your lens type, and enter your prescription details at checkout. If you do not have a current prescription, you can upload one later or visit us in store.",
      "We recommend a prescription issued within the last two years. If yours is older, book an eye test with us first so your lenses are made to the correct power.",
    ],
  },
  {
    question: "Do you offer eye tests?",
    answer: [
      "We provide comprehensive eye examinations at our store, including vision testing, prescription checks and basic eye health screening.",
      "Call or message us to book an appointment. Walk-ins are welcome, though booked slots are served first during busy periods.",
    ],
  },
  {
    question: "How long does it take to make my glasses?",
    answer: [
      "Single-vision lenses are typically ready in 2–3 working days. Progressive, high-index and specially coated lenses usually take 5–7 working days.",
      "Once your glasses are ready, we will notify you, and delivery across Sri Lanka takes a further 1–3 working days depending on your location.",
    ],
  },
  {
    question: "What if my glasses do not fit or the prescription feels wrong?",
    answer: [
      "Bring them in and we will adjust the fit free of charge for as long as you own the frame.",
      "If the prescription does not feel right, contact us within 14 days of receiving your order and we will recheck it and remake the lenses if there has been an error on our side.",
    ],
  },
  {
    question: "Are the frames and lenses genuine, and are they under warranty?",
    answer: [
      "All our frames and lenses are sourced from authorised suppliers and come with the manufacturer's warranty.",
      "Frames carry a 12-month warranty against manufacturing defects. Warranty does not cover accidental damage, scratches from normal wear, or loss.",
    ],
  },
  {
    question: "What payment methods do you accept?",
    answer: [
      "We accept credit and debit cards, bank transfers, and cash on delivery for orders within selected areas.",
      "Select your preferred method at checkout. For corporate or bulk orders, contact us to arrange invoicing.",
    ],
  },
];

const FAQPage = () => {
  return (
    <section className="overflow-hidden py-8 bg-gray-2">
      <SiteContainer>
        <div className="rounded-xl bg-white p-6 sm:p-10 shadow-1">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-blue uppercase tracking-wide">
                  Frequently Asked Questions
                </p>
                <h2 className="mt-2 text-3xl sm:text-4xl font-semibold text-dark">
                  Everything you need to know before placing an order
                </h2>
                <p className="mt-3 text-body leading-relaxed">
                  From choosing the right frame to understanding your
                  prescription, here are the questions our customers ask most.
                  If you cannot find your answer, our team is happy to help.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-light-5 to-blue-light-4 p-6 shadow-xl">
              <p className="text-sm font-semibold text-blue">Need help?</p>
              <h3 className="mt-2 text-2xl font-semibold text-dark">
                Talk to our team
              </h3>
              <p className="mt-3 text-sm text-body leading-relaxed">
                Call or email us to book an eye test, check frame availability,
                or ask about your prescription.
              </p>
              <div className="mt-6 space-y-3 text-sm text-dark">
                <p className="font-semibold">Phone</p>
                <a
                  className="text-body hover:text-blue"
                  href={siteConfig.contact.phoneHref}
                >
                  {siteConfig.contact.phone}
                </a>
                <p className="font-semibold">Email</p>
                <a
                  className="text-body hover:text-blue"
                  href={`mailto:${siteConfig.contact.email}`}
                >
                  {siteConfig.contact.email}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-gray-3 bg-gray-1 p-6"
                open={index === 0}
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer font-semibold text-lg text-dark">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-5 w-5 text-blue transition-transform duration-300 group-open:-rotate-180" />
                </summary>
                <div className="mt-4 space-y-3 text-body leading-relaxed">
                  {faq.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </SiteContainer>
    </section>
  );
};

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Metro Opticals — eyewear range, prescriptions, eye tests, delivery times, warranty and payment options.",
};

export default FAQPage;
