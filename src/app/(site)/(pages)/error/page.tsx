import React from "react";
import Error from "@/components/common/error";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Error",
  description:
    "Oops! Something went wrong at Metro Opticals - we're here to help you get back on track.",
  // other metadata
};

const ErrorPage = () => {
  return (
    <>
      <Error />
    </>
  );
};

export default ErrorPage;
