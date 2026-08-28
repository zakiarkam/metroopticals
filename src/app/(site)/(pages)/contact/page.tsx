import dynamic from "next/dynamic";
import Loading from "./loading";

import { Metadata } from "next";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Metro Opticals - contact us for any inquiries, support, or feedback.",
  alternates: { canonical: buildSiteUrl("/contact") },
};

const Contact = dynamic(() => import("@/features/contact/components"), {
  loading: () => <Loading />,
});

const ContactPage = () => {
  return <Contact />;
};

export default ContactPage;
