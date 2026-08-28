import PageHero from "@/components/common/PageHero";
import SiteContainer from "@/components/common/SiteContainer";
import { siteConfig } from "@/config/site";

export type LegalSection = { heading: string; paragraphs: string[]; bullets?: string[] };

/**
 * One layout for the policy pages, so they read as a set: a hero, the date
 * the text was last reviewed, and plain sections a person can actually read.
 */
export default function LegalPage({
  eyebrow,
  title,
  description,
  crumb,
  reviewed,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  crumb: string;
  reviewed: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} crumbs={[{ label: crumb }]} />
      <section className="bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <div className="mx-auto max-w-3xl">
            <p className="text-custom-xs font-semibold uppercase tracking-[0.16em] text-dark-5">
              Last reviewed {reviewed}
            </p>
            <div className="mt-8 space-y-10">
              {sections.map((section) => (
                <div key={section.heading}>
                  <h2 className="text-custom-1 font-bold text-dark">{section.heading}</h2>
                  <div className="mt-3 space-y-3 text-custom-sm leading-relaxed text-body">
                    {section.paragraphs.map((text, index) => (
                      <p key={index}>{text}</p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc space-y-1.5 pl-5">
                        {section.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 rounded-2xl border border-gray-3 bg-gray-1 p-6">
              <p className="text-custom-sm text-body">
                Questions about this policy? Write to{" "}
                <a href={`mailto:${siteConfig.contact.email}`} className="font-semibold text-blue underline-offset-2 hover:underline">
                  {siteConfig.contact.email}
                </a>{" "}
                or call {siteConfig.contact.phone}. {siteConfig.legalName}, {siteConfig.contact.address}
              </p>
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
}
