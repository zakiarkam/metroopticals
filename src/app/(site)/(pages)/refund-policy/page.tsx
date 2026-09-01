import type { Metadata } from "next";
import LegalPage from "@/components/common/LegalPage";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "Returns, exchanges, refunds and the 12-month warranty on eyewear bought from Metro Opticals, online and in store.",
  alternates: { canonical: buildSiteUrl("/refund-policy") },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="After you buy"
      title="Refund policy"
      description="What you can bring back, how refunds are paid, what we repair free, and how long each takes."
      crumb="Refund policy"
      reviewed="1 September 2026"
      sections={[
        {
          heading: "In short",
          paragraphs: [
            "We want you to see well and to like what you are wearing. If something is not right, bring it back and talk to us — most problems are solved with an adjustment or an exchange, on the spot and at no charge.",
            "This policy applies to everything bought from Metro Opticals, whether you ordered on this website or over the counter at our Nawalapitiya store. All amounts are in Sri Lankan rupees (LKR).",
          ],
        },
        {
          heading: "Returning a frame or accessory",
          paragraphs: [
            "You may return an unworn frame, sunglasses or accessory within 7 days of receiving it. The item must be in the condition it reached you in, with its case, cloth and any tags, and you must be able to show the invoice or your order number.",
            "A frame that has already had prescription lenses fitted can be exchanged only where the lenses can be reused. Where they cannot, the cost of the lenses is not refundable — they were cut to your prescription and cannot be sold to anyone else.",
          ],
        },
        {
          heading: "Items we cannot take back",
          paragraphs: [
            "Some things cannot be returned or refunded unless they are faulty, because they are made for you alone or cannot be resold for reasons of hygiene:",
          ],
          bullets: [
            "Prescription lenses, and frames glazed with prescription lenses.",
            "Contact lenses once the sealed packaging has been opened.",
            "Lens-cleaning solutions and eye drops once opened.",
            "Items altered, engraved or made to order at your request.",
            "Gift vouchers.",
          ],
        },
        {
          heading: "Exchanges",
          paragraphs: [
            "Would rather have a different size, colour or model? Tell us within 7 days of receiving your order and we will arrange the exchange. Where the new item costs more you pay the difference; where it costs less we refund the difference by the method you originally paid with.",
          ],
        },
        {
          heading: "Damaged, faulty or wrong items",
          paragraphs: [
            "If your order arrives damaged, faulty, or is simply not what you ordered, contact us within 48 hours of receiving it with a photograph. We will replace it or refund it in full, including any delivery charge, and we will pay the cost of getting it back to us. You will never be out of pocket for our mistake.",
          ],
        },
        {
          heading: "12-month warranty",
          paragraphs: [
            "Every frame and lens we sell is covered for 12 months from the date of purchase against manufacturing faults. Bring the glasses and the invoice and we will repair or replace them at no charge.",
          ],
          bullets: [
            "Covered: coating defects, peeling or discolouration, hinge and joint failure, lens delamination.",
            "Not covered: scratches from normal use, damage from being dropped, sat on or crushed, and loss or theft.",
            "Nose pads and temple tips wear out — we replace those free of charge, warranty or not.",
          ],
        },
        {
          heading: "Free adjustments, for life",
          paragraphs: [
            "Glasses bought from us can be brought in at any time for tightening, re-fitting, cleaning and new nose pads at no charge, for as long as you own them.",
          ],
        },
        {
          heading: "If you cannot get used to a new prescription",
          paragraphs: [
            "Give new lenses two weeks. If they still do not feel right, come in and we will check them against the prescription free of charge. Where the lenses were made correctly to the prescription you gave us and the prescription itself turns out to be wrong, we will remake them at the cost of the lenses only, once, within 60 days of collection.",
          ],
        },
        {
          heading: "Cancelling an order",
          paragraphs: [
            "An order can be cancelled at no cost at any time before we begin cutting lenses or dispatch it — usually within one working day of placing it. Message us on WhatsApp or call the shop with your order number. Once lenses have been cut to your prescription the order can no longer be cancelled, because the lenses cannot be used for anyone else.",
            "An online card payment that is not completed cancels the order by itself, and nothing is charged.",
          ],
        },
        {
          heading: "How refunds are paid",
          paragraphs: [
            "Refunds always go back the way the money came in. We do not refund a card payment in cash, and we do not refund cash to a card.",
          ],
          bullets: [
            "Paid by card online: refunded to the same card through PayHere. Once we release it, the bank usually takes 5–14 working days to show it on your statement.",
            "Paid by bank transfer: refunded to the account the transfer came from. Please have the account details ready.",
            "Paid in cash: refunded in cash at the shop, or by bank transfer to an account in your name if you would rather not travel.",
          ],
        },
        {
          heading: "How long it takes",
          paragraphs: [
            "We inspect returned items and tell you the outcome within 3 working days of receiving them. Approved refunds are released within 7 working days of that inspection. Your bank then takes its own time to post the money to your account, which is outside our control.",
            "Delivery charges are not refunded on a change-of-mind return. They are refunded in full where the item was faulty, damaged or wrongly supplied.",
          ],
        },
        {
          heading: "Return postage",
          paragraphs: [
            "For a change-of-mind return you pay the cost of sending the item back, and we recommend a tracked service — an item that does not reach us cannot be refunded. Where the return is our fault, we arrange and pay for the collection.",
          ],
        },
        {
          heading: "How to start a return",
          paragraphs: [
            "Bring the item and your invoice to the shop, or message us on WhatsApp with your order number, a photograph and a line about what is wrong. We will reply with what to do next. There is no form to fill in.",
          ],
        },
      ]}
    />
  );
}
