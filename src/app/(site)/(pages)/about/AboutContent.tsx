import Breadcrumb from "@/components/common/Breadcrumb";
import SiteContainer from "@/components/common/SiteContainer";
import { Globe, Zap, Shield, Award, Users, Building2 } from "lucide-react";
import HeroNew from "@/features/home/components/HeroNew";
import { siteConfig } from "@/config/site";

const AboutContent = () => {
  return (
    <main>
      <HeroNew />

      <section className="overflow-hidden py-8 sm:py-8">
        <SiteContainer>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 lg:p-10">
            <div className="mb-6">
              <h2 className="font-bold text-3xl sm:text-4xl text-dark mb-3 bg-gradient-to-r from-blue to-blue-dark bg-clip-text text-transparent">
                About {siteConfig.name}
              </h2>
              <div className="space-y-3 text-body leading-relaxed">
                <p>
                  <strong className="text-dark">{siteConfig.name}</strong> is a
                  trusted optical store helping people across Sri Lanka see
                  clearly and look their best. We combine careful eye care with
                  a frame collection chosen for quality, comfort and style.
                </p>
                <p>
                  From your first eye test to the day you collect your glasses,
                  our team guides you through every step — measuring accurately,
                  explaining your options honestly, and fitting your eyewear so
                  it feels right from the moment you put it on.
                </p>
              </div>
            </div>

            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-bold text-xl sm:text-2xl text-dark mb-3 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue" />
                What We Offer
              </h3>
              <div className="space-y-3 text-body leading-relaxed">
                <p>
                  We stock{" "}
                  <strong className="text-dark">
                    prescription eyeglasses, sunglasses and contact lenses
                  </strong>{" "}
                  for men, women and children, in metal, acetate, titanium and
                  rimless styles. Our lens range covers single-vision,
                  progressive, blue-light filtering, photochromic and
                  high-index options.
                </p>
                <p>
                  Every pair is made to your prescription and checked before it
                  reaches you. We also carry cases, cleaning kits and lens
                  solutions, and offer free frame adjustments for as long as you
                  own your glasses.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-light-5 via-blue-light-4 to-blue-light-3 rounded-xl p-5 sm:p-6 mb-6 border border-blue-light-3 shadow-sm">
              <div className="mb-3">
                <h3 className="font-bold text-xl text-dark flex items-center gap-2">
                  <Globe className="w-6 h-6 text-blue" />
                  Shop Online, Fitted With Care
                </h3>
              </div>
              <div className="space-y-3 text-body leading-relaxed">
                <p>
                  Browse our full collection online, choose your frame and lens
                  type, and enter your prescription at checkout. Your order is
                  made up by our team and delivered anywhere in Sri Lanka.
                </p>
                <p>
                  Prefer to try before you buy? Visit us in store for a
                  professional eye test, personal frame styling, and a proper
                  fitting.
                </p>
              </div>
            </div>

            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-bold text-xl sm:text-2xl text-dark mb-3 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue" />
                Our Promise
              </h3>
              <div className="space-y-3 text-body leading-relaxed">
                <p>
                  Good vision should be accessible. We keep our pricing fair and
                  transparent, stock frames at every budget, and never
                  recommend an upgrade you do not need.
                </p>
                <p>
                  If your glasses do not feel right, bring them back. We will
                  adjust the fit, recheck the prescription, and put it right.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="font-bold text-xl sm:text-2xl text-dark mb-4">
                Why Choose Us
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <Shield className="w-12 h-12 text-blue mx-auto mb-3" />
                  <h4 className="font-bold text-dark mb-1.5">
                    Genuine Quality
                  </h4>
                  <p className="text-sm text-body leading-snug">
                    Authentic frames and lenses from authorised suppliers
                  </p>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <Zap className="w-12 h-12 text-blue mx-auto mb-3" />
                  <h4 className="font-bold text-dark mb-1.5">Expert Care</h4>
                  <p className="text-sm text-body leading-snug">
                    Professional eye tests and accurate lens fitting
                  </p>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <Award className="w-12 h-12 text-blue mx-auto mb-3" />
                  <h4 className="font-bold text-dark mb-1.5">Fair Pricing</h4>
                  <p className="text-sm text-body leading-snug">
                    Honest prices with free lifetime frame adjustments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>
    </main>
  );
};

export default AboutContent;
