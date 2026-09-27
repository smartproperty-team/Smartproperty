// ===========================================
// Frontend - legal pages
// ===========================================

import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { useLanguageStore } from "../../../i18n";
import LegalPage from "../LegalPage";
import { LEGAL_CONTACT_EMAIL, legalContent } from "../legalContent";

const renderPage = (kind: "privacy" | "terms") =>
  render(
    <MemoryRouter>
      <LegalPage kind={kind} />
    </MemoryRouter>,
  );

describe("LegalPage", () => {
  afterEach(() => {
    cleanup();
    act(() => useLanguageStore.setState({ language: "en" }));
  });

  it("says plainly that the site is a student project", () => {
    renderPage("privacy");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Privacy Policy",
    );
    expect(screen.getByText(/student project built at ESPRIT/)).toBeTruthy();
  });

  it("lists every section in the table of contents, linked by anchor", () => {
    renderPage("privacy");
    const toc = screen.getByRole("navigation", { name: "On this page" });
    const links = within(toc).getAllByRole("link");

    expect(links).toHaveLength(legalContent.en.privacy.sections.length);
    for (const link of links) {
      const id = link.getAttribute("href")!.slice(1);
      expect(document.getElementById(id)?.textContent).toBe(link.textContent);
    }
  });

  it("gives the contact email as a mailto link", () => {
    renderPage("privacy");
    const links = screen.getAllByRole("link", { name: LEGAL_CONTACT_EMAIL });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("href")).toBe(`mailto:${LEGAL_CONTACT_EMAIL}`);
  });

  it("links the two documents to each other", () => {
    renderPage("terms");
    const main = screen.getByRole("main");
    expect(
      within(main)
        .getByRole("link", { name: "Privacy Policy" })
        .getAttribute("href"),
    ).toBe("/privacy");
  });

  it("says documents are private and asks for samples on this demo", () => {
    renderPage("privacy");
    expect(screen.getByText(/private storage/)).toBeTruthy();
    expect(screen.getByText(/stops working after 10 minutes/)).toBeTruthy();
    expect(screen.getByText(/please upload sample documents/)).toBeTruthy();
  });

  it("follows the chosen language", () => {
    act(() => useLanguageStore.setState({ language: "fr" }));
    renderPage("terms");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Conditions d'utilisation",
    );
  });

  it("keeps English and French in step, section for section", () => {
    for (const kind of ["privacy", "terms"] as const) {
      expect(legalContent.fr[kind].sections).toHaveLength(
        legalContent.en[kind].sections.length,
      );
    }
  });
});
