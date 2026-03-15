import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagFilter from "./TagFilter";

describe("TagFilter", () => {
  const allTags = ["testing", "automation", "ci-cd"];

  it("renders all tags as buttons", () => {
    render(<TagFilter allTags={allTags} activeTags={[]} onToggleTag={() => {}} />);
    expect(screen.getByRole("button", { name: "#testing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#automation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#ci-cd" })).toBeInTheDocument();
  });

  it("marks active tags with aria-pressed=true", () => {
    render(<TagFilter allTags={allTags} activeTags={["testing"]} onToggleTag={() => {}} />);
    expect(screen.getByRole("button", { name: "#testing" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "#automation" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggleTag with tag name when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TagFilter allTags={allTags} activeTags={[]} onToggleTag={onToggle} />);
    await user.click(screen.getByRole("button", { name: "#automation" }));
    expect(onToggle).toHaveBeenCalledWith("automation");
  });

  it("renders nothing when allTags is empty", () => {
    const { container } = render(<TagFilter allTags={[]} activeTags={[]} onToggleTag={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
