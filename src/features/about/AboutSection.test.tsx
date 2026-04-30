import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AboutSection from "./AboutSection";

describe("AboutSection", () => {
  it("renders the cat-block frame with terminal header", () => {
    const { container, getByLabelText } = render(<AboutSection />);
    expect(container.querySelector(".cat-block")).not.toBeNull();
    expect(container.querySelector(".cat-head")).not.toBeNull();
    expect(getByLabelText(/^cat\s*$/)).toBeTruthy();
    expect(getByLabelText(/^~\/profile\.txt$/)).toBeTruthy();
  });

  it("renders all 5 tool categories", () => {
    const { getByText } = render(<AboutSection />);
    expect(getByText("Test Automation")).toBeTruthy();
    expect(getByText("Languages")).toBeTruthy();
    expect(getByText("CI/CD & DevOps")).toBeTruthy();
    expect(getByText("Test Management")).toBeTruthy();
    expect(getByText("AI & Tooling")).toBeTruthy();
  });

  it("renders versioned badges (Pytest v8.x example)", () => {
    const { container } = render(<AboutSection />);
    const badges = Array.from(container.querySelectorAll(".badge"));
    const pytest = badges.find((b) => b.textContent?.includes("Pytest"));
    expect(pytest).toBeTruthy();
    expect(pytest?.querySelector(".ver")?.textContent).toBe("v8.x");
  });

  it("renders unversioned badges without a .ver span (JIRA example)", () => {
    const { container } = render(<AboutSection />);
    const badges = Array.from(container.querySelectorAll(".badge"));
    const jira = badges.find((b) => b.textContent?.trim() === "JIRA");
    expect(jira).toBeTruthy();
    expect(jira?.querySelector(".ver")).toBeNull();
  });

  it("renders the ASCII separator with aria-hidden", () => {
    const { container } = render(<AboutSection />);
    const sep = container.querySelector(".ascii-div");
    expect(sep).not.toBeNull();
    expect(sep?.getAttribute("aria-hidden")).toBe("true");
    expect(sep?.textContent).toContain("END_OF_FILE");
  });

  it("trailing bio paragraph carries .cursor-blink class", () => {
    const { container } = render(<AboutSection />);
    const paragraphs = container.querySelectorAll(".cat-block p:not(.cat-head)");
    const last = paragraphs[paragraphs.length - 1];
    expect(last.classList.contains("cursor-blink")).toBe(true);
  });
});
