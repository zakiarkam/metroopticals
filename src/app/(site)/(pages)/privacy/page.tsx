import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Metro Opticals collects when you shop with us, why, who it is shared with, and how it is kept.",
  alternates: { canonical: buildSiteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy policy"
      description="What we collect when you shop with us, what we do with it, and what we never do."
      crumb="Privacy policy"
      reviewed="1 September 2026"
      sections={[
        {
          heading: "Who is responsible for your data",
          paragraphs: [
            `${siteConfig.legalName}, ${siteConfig.contact.address} We decide what is collected on this site and why, and we are the people to contact about any of it: ${siteConfig.contact.email} or ${siteConfig.contact.phone}.`,
          ],
        },
        {
          heading: "What we collect",
          paragraphs: [
            "When you create an account or place an order we keep your name, email address, phone number, and the billing and delivery addresses you give us. If you buy in the shop and give us your phone number, we keep that with your bill so we can tell you when your glasses are ready.",
            "If you bring us a prescription we keep it with your order, because we need it to make your lenses and to remake them under warranty.",
            "The site also records the ordinary technical details every website sees - your IP address, the browser you used, and which pages you opened - in server logs we keep for security and troubleshooting.",
          ],
        },
        {
          heading: "What we use it for",
          bullets: [
            "Making and delivering what you ordered, and telling you when it is ready.",
            "Taking payment, and matching a payment to the right bill.",
            "Answering messages you send us.",
            "Warranty, adjustments and remakes on glasses you bought from us.",
            "Keeping accounting records we are required by law to keep.",
            "Spotting and stopping fraud and abuse of the site.",
            "Offers and news - only if you told us at the counter or online that you would like them. You can say no at any time, and we will stop.",
          ],
          paragraphs: [],
        },
        {
          heading: "Card payments",
          paragraphs: [
            "Card payments made on this website are processed by PayHere (PayHere Pvt Ltd), a licensed Sri Lankan payment gateway. Your card number, expiry date and CVV are entered on PayHere's own secure page and are sent directly to them. They never pass through this website and we never see or store them.",
            "What comes back to us is a confirmation: whether the payment succeeded, PayHere's reference for it, and which method was used. That is what we record against your order, and it is all we hold. PayHere handles your card details under its own privacy policy and its PCI-DSS obligations.",
            "Cash and bank-transfer payments are recorded as amounts against your bill and nothing more.",
          ],
        },
        {
          heading: "Who else sees your details",
          paragraphs: [
            "We do not sell, rent or trade your details to anyone, ever. We share only what a service needs to do its job:",
          ],
          bullets: [
            "The courier delivering your order - your name, address and phone number.",
            "PayHere, our payment gateway - your name, email, phone and the amount, so the payment page can be shown to you.",
            "The services that send our email and WhatsApp messages - your name, contact details and order number.",
            "The company that hosts this website and its database.",
            "The authorities, where the law requires it of us.",
          ],
        },
        {
          heading: "Keeping it safe",
          paragraphs: [
            "The site is served only over HTTPS. Passwords are stored hashed, never as text we could read. Access to order and customer records is limited to staff accounts that need it, and every administrative action is logged.",
            "No system is perfectly secure, and we will not pretend otherwise - but we do not hold card numbers, which is the single most useful thing anyone could steal from a shop like ours.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Order and payment records are kept for as long as our accounting and tax obligations require. Prescriptions are kept while you remain a customer, so we can remake your lenses. An account you ask us to close is removed, apart from the purchase records we must keep.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "The site uses a sign-in cookie so you stay logged in, and remembers what is in your cart. There are no advertising trackers and no third-party analytics that follow you around the web. Blocking cookies in your browser will stop you being able to stay signed in or check out.",
          ],
        },
        {
          heading: "Virtual try-on",
          paragraphs: [
            "When you use Try on with your camera, the picture from your camera is handled on your own phone or computer, inside your browser. It is not uploaded, recorded or seen by us, and it is gone the moment you close the try-on. The same is true of a photo you choose instead of the camera.",
            "The measurements it shows - your face width and the distance between your pupils - are worked out on your device and are not stored by us. If you save a picture, it goes to your own device or wherever you choose to share it, not to us.",
            "We count how often the try-on is opened and on which frames, and nothing more.",
          ],
        },
        {
          heading: "Children",
          paragraphs: [
            "This site is not intended for children, and we do not knowingly collect details from anyone under 18. We are of course glad to make children's glasses - a parent or guardian places the order.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "You can see and change your details in My account at any time. Ask us for a copy of what we hold about you and we will provide it. Ask us to delete it and we will, apart from records of purchases we are required to keep. To stop receiving offers, reply to any message or tell us in the shop.",
          ],
        },
        {
          heading: "Changes to this policy",
          paragraphs: [
            "We update this page when what we do changes, and the date at the top always says when it was last reviewed. Material changes will be flagged on the site.",
          ],
        },
      ]}
    />
  );
}
