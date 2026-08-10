import React from "react";
import Link from "next/link";
import { ArrowRight, Eye, Glasses, Shield, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function MetroOpticalsHero() {
  return (
    <div className="relative bg-gradient-to-br from-gray-1 via-blue-light-5 to-blue-light-3 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-light-3/30 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-blue-light-4/30 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-700"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NjNmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-60"></div>

      <div className="relative z-10  mx-auto px-4 sm:px-6 lg:px-16 pt-8">
        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            {/* <div className="inline-flex items-center gap-2 px-4 py-2 bg-white shadow-sm border border-blue-light-5 rounded-full">
              <Zap className="w-4 h-4 text-blue" />
              <span className="text-sm font-semibold text-dark-4">
                20+ Years of Excellence
              </span>
            </div> */}

            {/* Heading */}
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-dark">
                Welcome to{" "}
                <span className="text-blue">{siteConfig.name}</span>
              </h1>
              <p className="text-xl text-body leading-relaxed">
                Prescription eyeglasses, sunglasses and contact lenses — fitted
                by people who care about how you see and how you look.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-blue">500+</div>
                <div className="text-sm text-body">Frames In Store</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-blue">2-3</div>
                <div className="text-sm text-body">Days To Collect</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-blue">1000+</div>
                <div className="text-sm text-body">Happy Customers</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/shop-with-sidebar"
                className="group px-8 py-4 bg-blue hover:bg-blue-dark text-white rounded-lg font-semibold transition-all duration-300 inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                Shop Eyewear
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green" />
                <span className="text-sm text-body">Genuine Brands</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue" />
                <span className="text-sm text-body">Expert Eye Care</span>
              </div>
            </div>
          </div>

          {/* Right content - What we offer */}
          <div className="space-y-4">
            <div className="group from-blue-light-5 to-blue-light-4 border border-blue-light-3 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-light-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <Glasses className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-dark mb-2">
                    Prescription Eyeglasses
                  </h3>
                  <p className="text-body">
                    Single-vision, progressive and blue-light lenses
                  </p>
                  <div className="mt-2 inline-flex items-center text-sm text-blue font-medium">
                    Made to your prescription
                  </div>
                </div>
              </div>
            </div>

            <div className="group from-blue-light-5 to-blue-light-4 border border-blue-light-3 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-light-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-dark mb-2">
                    Sunglasses &amp; Contact Lenses
                  </h3>
                  <p className="text-body">
                    UV-protective sunglasses and daily or monthly lenses
                  </p>
                  <div className="mt-2 inline-flex items-center text-sm text-blue font-medium">
                    Powered and non-powered
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-r from-blue-light-5 to-blue-light-4 border border-blue-light-3 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-light-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-dark mb-2">
                    Eye Testing &amp; Fitting
                  </h3>
                  <p className="text-body">
                    Comprehensive eye exams and professional fitting
                  </p>
                  <div className="mt-2 inline-flex items-center text-sm text-blue font-medium">
                    In store, by appointment
                  </div>
                </div>
              </div>
            </div>

            {/* Online highlight */}
            <div className="mt-6 bg-gradient-to-r from-blue-light-5 to-blue-light-4 border border-blue-light-3 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-dark">
                    Now Available Online
                  </h4>
                  <p className="text-sm text-blue font-semibold">
                    {siteConfig.domain}
                  </p>
                </div>
              </div>
              <p className="text-sm text-body">
                Browse our full collection, enter your prescription at checkout,
                and have your eyewear delivered anywhere in Sri Lanka.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
}
