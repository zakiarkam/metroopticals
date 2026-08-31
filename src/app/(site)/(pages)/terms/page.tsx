import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms on which Metro Opticals sells eyewear online and in store.",
  alternates: { canonical: buildSiteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The small print"
      title="Terms & conditions"
      description="Plain terms for buying from us online and over the counter."
      crumb="Terms & conditions"
      reviewed="26 August 2026"
      sections={[
        {
          heading: "Orders and prices",
          paragraphs: [
            "Prices are in Sri Lankan rupees and include any applicable taxes. An order placed on the website is confirmed once our team has checked it — including any prescription — and you will receive a confirmation message. Until then we may decline an order, for example if an item has just sold out, and nothing will be charged.",
          ],
        },
        {
          heading: "Prescriptions",
          paragraphs: [
            "Lenses are made to the prescription you give us. Please make sure it is current — usually within two years — and complete. We are happy to check it in the shop before we make your lenses, and our free eye test is available if you are unsure.",
          ],
        },
        {
          heading: "Payment",
          paragraphs: [
            "Online orders can be paid in cash on collection or delivery, or by bank transfer to the account shown on your invoice. In the shop we accept cash, card and bank transfer. Where you pay an advance, the balance is due on the date shown on your bill, before the goods are handed over.",
          ],
        },
        {
          heading: "Delivery and collection",
          paragraphs: [
            "Island-wide delivery is dispatched within two working days of your order being ready. Made-to-prescription lenses take longer than frames alone; we will tell you the expected time when we confirm the order. Orders left for collection are held for 30 days.",
          ],
        },
        {
          heading: "Returns and warranty",
          paragraphs: [
            "See our Returns & warranty page for what can be exchanged and what is covered. In short: unworn frames within 7 days with the invoice; prescription lenses are made for you and cannot be returned unless faulty; a 12-month warranty covers manufacturing faults.",
          ],
        },
        {
          heading: "Accounts",
          paragraphs: [
            "Keep your password to yourself; you are responsible for orders placed from your account. Tell us straight away if you think someone else has used it.",
          ],
        },
        {
          heading: "Who we are",
          paragraphs: [
            "Metro Opticals, No 98, Super Commercial Complex, Nawalapitiya, Sri Lanka. These terms are governed by the laws of Sri Lanka.",
          ],
        },
      ]}
    />
  );
}
