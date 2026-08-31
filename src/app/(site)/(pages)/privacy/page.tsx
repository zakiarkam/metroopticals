import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Metro Opticals collects when you shop with us, why, and how it is kept.",
  alternates: { canonical: buildSiteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy policy"
      description="What we collect when you shop with us, what we do with it, and what we never do."
      crumb="Privacy policy"
      reviewed="26 August 2026"
      sections={[
        {
          heading: "What we collect",
          paragraphs: [
            "When you create an account or place an order we keep your name, email address, phone number and the delivery address you give us. If you buy in the shop and give us your phone number, we keep that with your bill so we can tell you when your glasses are ready and so you can collect them.",
            "If you bring us a prescription we keep it with your order, because we need it to make your lenses and to remake them under warranty.",
          ],
        },
        {
          heading: "What we use it for",
          bullets: [
            "Making and delivering what you ordered, and telling you when it is ready.",
            "Answering messages you send us.",
            "Warranty, adjustments and remakes on glasses you bought from us.",
            "Offers and news — only if you told us at the counter or online that you would like them. You can say no at any time, and we will stop.",
          ],
          paragraphs: [],
        },
        {
          heading: "What we never do",
          paragraphs: [
            "We do not sell or rent your details to anyone. We share them only with the services that make the shop work: the courier delivering your order, the service that sends our emails and WhatsApp messages, and the company that hosts this website.",
          ],
        },
        {
          heading: "Payments",
          paragraphs: [
            "We do not store card numbers. Cash and bank-transfer payments are recorded as amounts against your bill and nothing more.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "The site uses a sign-in cookie so you stay logged in, and nothing else that follows you around. There are no advertising trackers on this site.",
          ],
        },
        {
          heading: "Virtual try-on",
          paragraphs: [
            "When you use Try on with your camera, the picture from your camera is handled on your own phone or computer, inside your browser. It is not uploaded, recorded or seen by us, and it is gone the moment you close the try-on. The same is true of a photo you choose instead of the camera.",
            "The measurements it shows — your face width and the distance between your pupils — are worked out on your device and are not stored by us. If you save a picture, it goes to your own device or wherever you choose to share it, not to us.",
            "We count how often the try-on is opened and on which frames, and nothing more.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "You can see and change your details in My account. Ask us to remove your details and we will, apart from records of purchases we are required to keep for accounts. To stop receiving offers, reply to any message or tell us in the shop.",
          ],
        },
      ]}
    />
  );
}
