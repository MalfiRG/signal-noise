import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import Seo from "@/components/Seo";
import JsonLd from "@/components/JsonLd";

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe("Seo", () => {
  it("sets page title with site name suffix", () => {
    renderWithHelmet(<Seo title="Projects" path="/projects" />);
    expect(document.title).toBe("Projects | PIOTR_TARACH | SIGNAL_NOISE");
  });

  it("uses site name alone when no title provided", () => {
    renderWithHelmet(<Seo />);
    expect(document.title).toBe("PIOTR_TARACH | SIGNAL_NOISE");
  });

  it("sets canonical URL from path", () => {
    renderWithHelmet(<Seo path="/blog" />);
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toBe(
      "https://piotrtarach.dev/blog"
    );
  });

  it("sets og:type to article when specified", () => {
    renderWithHelmet(
      <Seo title="Test Post" path="/blog/test" type="article" />
    );
    const ogType = document.querySelector('meta[property="og:type"]');
    expect(ogType?.getAttribute("content")).toBe("article");
  });
});

describe("JsonLd", () => {
  it("renders a valid JSON-LD script tag", () => {
    const data = { "@context": "https://schema.org", "@type": "WebSite", name: "Test" };
    renderWithHelmet(<JsonLd data={data} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent!)).toEqual(data);
  });
});
