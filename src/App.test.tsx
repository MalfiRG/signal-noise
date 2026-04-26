import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppContent } from "./App";

describe("App reading-mode wrapper", () => {
  it("mounts .theme-reading wrapper for blog post routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/blog/style-test"]}>
        <AppContent />
      </MemoryRouter>
    );
    const wrapper = container.querySelector(".theme-reading");
    expect(wrapper).toBeTruthy();
  });

  it("does NOT mount .theme-reading wrapper on non-blog routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/projects"]}>
        <AppContent />
      </MemoryRouter>
    );
    expect(container.querySelector(".theme-reading")).toBeNull();
  });
});
