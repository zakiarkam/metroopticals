import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { ONLINE_PAYMENT_FEE_LABEL } from "@/features/checkout/utils/payment-fee";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description:
    "The terms on which Metro Opticals sells eyewear online and in store, including payment, delivery and liability.",
  alternates: { canonical: buildSiteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The small print"
      title="Terms & conditions"
      description="Plain terms for buying from us online and over the counter."
      crumb="Terms & conditions"
      reviewed="1 September 2026"
      sections={[
        {
          heading: "Who we are, and what these terms cover",
          paragraphs: [
            `${siteConfig.legalName}, ${siteConfig.contact.address} These terms govern your use of ${siteConfig.domain} and every purchase you make from us, online or in the shop. By using the site or placing an order you agree to them, so please read them first.`,
            "We may update these terms as the business changes. The version on this page at the time you place an order is the one that applies to that order.",
          ],
        },
        {
          heading: "Using this website",
          bullets: [
            "You must be 18 or over to place an order, or have a parent or guardian do it for you.",
            "The details you give us at checkout must be accurate and current - we deliver and dispatch to what you type.",
            "Keep your password to yourself. You are responsible for orders placed from your account; tell us straight away if you think someone else has used it.",
            "Do not use the site to break the law, to interfere with how it runs, or to take its content for your own use.",
          ],
          paragraphs: [],
        },
        {
          heading: "Products and prices",
          paragraphs: [
            "All prices are in Sri Lankan rupees (LKR) and include any taxes that apply. We work hard to describe and photograph frames accurately, but colours vary between screens and measurements are nominal - the frame you receive is the one described by its model and size markings.",
            "Prices and promotions can change without notice. If an item's price was clearly wrong when you ordered it, we will contact you before doing anything: you can pay the correct price or cancel, and nothing is charged in the meantime.",
          ],
        },
        {
          heading: "Orders",
          paragraphs: [
            "Placing an order is an offer to buy, not a completed sale. The contract is formed when we confirm the order - after we have checked stock and, where lenses are involved, your prescription.",
            "We may decline or cancel an order where an item has sold out, where a price or description was wrong, where we cannot safely make the lenses requested, or where we suspect fraud. Where money has already been taken for an order we decline, it is refunded in full.",
          ],
        },
        {
          heading: "Payment",
          paragraphs: [
            "You can pay in cash on collection or delivery, by bank transfer to the account shown on your invoice, or online by card. In the shop we also take card at the counter.",
            `Online card payments are handled by PayHere, a licensed Sri Lankan payment gateway. You enter your card details on PayHere's own secure page - they never pass through this website, and we never see or store your card number. A ${ONLINE_PAYMENT_FEE_LABEL.toLowerCase()} is added to orders paid this way to cover the gateway's charges. It is shown on the checkout before you commit and printed on your invoice; choosing cash or bank transfer avoids it entirely.`,
            "Your order is confirmed as paid only once the gateway tells us the payment has succeeded. Where you pay an advance in the shop, the balance is due on the date shown on your bill and before the goods are handed over.",
          ],
        },
        {
          heading: "Prescriptions",
          paragraphs: [
            "Lenses are made to the prescription you give us, so please make sure it is complete and current - usually issued within the last two years. We are happy to check it in the shop before we cut anything, and our eye test is free if you are unsure.",
            "We may decline to make lenses to a prescription that appears unsafe or incomplete, and will contact you rather than guess.",
          ],
        },
        {
          heading: "Delivery and collection",
          paragraphs: [
            "Delivery is free anywhere in Sri Lanka. Orders are dispatched within two working days of being ready; frames alone are usually ready the same day, while made-to-prescription lenses take longer, and we tell you the expected time when we confirm the order.",
            "Delivery times are estimates, not guarantees - once a parcel is with the courier its progress is in their hands. Orders left for collection are held for 30 days; call us if you need longer.",
          ],
        },
        {
          heading: "Returns, refunds and warranty",
          paragraphs: [
            "Our Refund policy sets out what can be returned, what cannot, how refunds are paid and how long they take. In short: unworn frames within 7 days with the invoice; prescription lenses are made for you and are not returnable unless faulty; and a 12-month warranty covers manufacturing faults. Nothing in these terms limits the rights you have under Sri Lankan consumer law.",
          ],
        },
        {
          heading: "Our content",
          paragraphs: [
            `The text, photographs, logos and design of ${siteConfig.domain} belong to ${siteConfig.legalName} or to the brands we stock, and may not be copied, republished or used commercially without our written permission.`,
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "We stand behind what we sell, and our responsibility for any single order is limited to the amount you paid for it. We are not liable for indirect or consequential losses - lost earnings, lost time, or costs arising from a delayed delivery.",
            "Nothing here excludes liability that cannot lawfully be excluded, including for death or personal injury caused by our negligence, or for fraud.",
          ],
        },
        {
          heading: "Your privacy",
          paragraphs: [
            "How we handle your details is set out in our Privacy policy, which forms part of these terms.",
          ],
        },
        {
          heading: "Governing law",
          paragraphs: [
            "These terms are governed by the laws of Sri Lanka, and the courts of Sri Lanka have exclusive jurisdiction over any dispute arising from them.",
          ],
        },
        {
          heading: "Talk to us first",
          paragraphs: [
            `If something has gone wrong, contact us before anything else - most things are sorted out in a single phone call. Write to ${siteConfig.contact.email} or call ${siteConfig.contact.phone}.`,
          ],
        },
      ]}
    />
  );
}
