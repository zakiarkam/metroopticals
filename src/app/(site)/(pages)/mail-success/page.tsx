import React from "react";
import MailSuccess from "@/components/common/mail-success";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Message Sent",
  description:
    "Confirmation of your successful email submission at Metro Opticals - thank you for reaching out to us.",
  robots: {
    index: false,
    follow: false,
  },
};

const MailSuccessPage = () => {
  return (
    <>
      <MailSuccess />
    </>
  );
};

export default MailSuccessPage;
