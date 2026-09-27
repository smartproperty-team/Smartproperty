// ===========================================
// SmartProperty - Privacy Policy / Terms of Use page
// ===========================================

import { Fragment, useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { HomeFooter, Navbar } from "../../components/layout";
import { useLanguageStore } from "../../i18n";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED,
  legalContent,
  type LegalSection,
} from "./legalContent";
import "./legal.css";

export type LegalKind = "privacy" | "terms";

const slug = (heading: string) =>
  heading
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");

/** Turns {email}, {privacy} and {terms} in a sentence into links. */
function RichText({
  text,
  titles,
}: {
  text: string;
  titles: Record<LegalKind, string>;
}) {
  const parts = text.split(/(\{email\}|\{privacy\}|\{terms\})/);
  return (
    <>
      {parts.map((part, i) => {
        let node: ReactNode = part;
        if (part === "{email}") {
          node = (
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
          );
        } else if (part === "{privacy}") {
          node = <Link to="/privacy">{titles.privacy}</Link>;
        } else if (part === "{terms}") {
          node = <Link to="/terms">{titles.terms}</Link>;
        }
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function Section({
  section,
  titles,
}: {
  section: LegalSection;
  titles: Record<LegalKind, string>;
}) {
  const id = slug(section.heading);
  return (
    <section className="legal-section" aria-labelledby={id}>
      <h2 id={id}>{section.heading}</h2>
      {section.items && (
        <ul>
          {section.items.map((item) => (
            <li key={item}>
              <RichText text={item} titles={titles} />
            </li>
          ))}
        </ul>
      )}
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph}>
          <RichText text={paragraph} titles={titles} />
        </p>
      ))}
    </section>
  );
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { language } = useLanguageStore();
  const copy = legalContent[language] ?? legalContent.en;
  const doc = copy[kind];
  const titles = { privacy: copy.privacy.title, terms: copy.terms.title };
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString(
    language === "fr" ? "fr-FR" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  useEffect(() => {
    document.title = `${doc.title} - SmartProperty`;
  }, [doc.title]);

  return (
    <div className="legal-page">
      <Navbar />
      <main className="legal-main">
        <article className="legal-article">
          <header className="legal-header">
            <h1>{doc.title}</h1>
            <p className="legal-updated">
              {copy.updated}: <time dateTime={LEGAL_UPDATED}>{updated}</time>
            </p>
            <p className="legal-intro">{doc.intro}</p>
          </header>

          <nav className="legal-toc" aria-labelledby="legal-toc-title">
            <h2 id="legal-toc-title">{copy.onThisPage}</h2>
            <ol>
              {doc.sections.map((section) => (
                <li key={section.heading}>
                  <a href={`#${slug(section.heading)}`}>{section.heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((section) => (
            <Section key={section.heading} section={section} titles={titles} />
          ))}
        </article>
      </main>
      <HomeFooter />
    </div>
  );
}
