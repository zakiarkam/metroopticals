import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Returns & warranty",
  description: "Exchanges, returns and the 12-month warranty on eyewear from Metro Opticals.",
  alternates: { canonical: buildSiteUrl("/returns") },
};

export default function ReturnsPage() {
  return (
    <LegalPage
      eyebrow="After you buy"
      title="Returns & warranty"
      description="What you can bring back, what we fix for free, and how to do it."
      crumb="Returns & warranty"
      reviewed="26 August 2026"
      sections={[
        {
          heading: "Exchanging a frame",
          paragraphs: [
            "Changed your mind about a frame? Bring it back unworn, in its case, with the invoice, within 7 days and we will exchange it or credit the amount against something else. Frames that have had lenses fitted can be exchanged only if the lenses can be reused.",
          ],
        },
        {
          heading: "Prescription lenses",
          paragraphs: [
            "Lenses are cut to your prescription and cannot be resold, so they are not returnable unless they are faulty. If your lenses were made to the prescription you gave us and the prescription turns out to be wrong, we will remake them at the cost of the lenses only.",
            "If you cannot get used to a new prescription within two weeks, come in  most of the time a small adjustment to the fit is all it needs, and that is free.",
          ],
        },
        {
          heading: "12-month warranty",
          paragraphs: [
            "Every frame and lens we sell is covered for 12 months against manufacturing faults: peeling coatings, loose hinges, cracks that are not the result of a knock. Bring the glasses and the invoice and we will repair or replace them.",
          ],
          bullets: [
            "Covered: coating defects, hinge and joint faults, frame discolouration.",
            "Not covered: scratches from use, damage from being sat on or dropped, wear to nose pads and temple tips (we replace those free anyway).",
          ],
        },
        {
          heading: "Free adjustments, for life",
          paragraphs: [
            "Glasses bought from us can be brought in any time for tightening, re-fitting, cleaning and new nose pads at no charge.",
          ],
        },
        {
          heading: "How to return something",
          paragraphs: [
            "Bring it to the shop with your invoice, or if you are far away, message us on WhatsApp with your order number and a photo and we will arrange it. Refunds for online orders go back the way you paid within 7 working days of the item reaching us.",
          ],
        },
      ]}
    />
  );
}
