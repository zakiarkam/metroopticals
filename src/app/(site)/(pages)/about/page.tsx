import dynamic from "next/dynamic";
import { Metadata } from "next";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Metro Opticals - your trusted optical store offering prescription eyewear, sunglasses, contact lenses and professional eye care.",
  // other metadata
};

const AboutContent = dynamic(() => import("./AboutContent"), {
  loading: () => <Loading />,
});

const AboutPage = () => {
  return <AboutContent />;
};

export default AboutPage;
