export interface HowIDoItPage {
  slug: string;
  title: string;
  description: string;
}

export const howIDoItPages: HowIDoItPage[] = [
  {
    slug: "test-plan",
    title: "Test Plan",
    description:
      "How I structure test plans — scope, risk analysis, entry/exit criteria, and resource allocation.",
  },
  {
    slug: "test-case",
    title: "Test Case Design",
    description:
      "My approach to writing effective test cases — templates, boundary analysis, and traceability.",
  },
  {
    slug: "test-architecture",
    title: "Test Architecture",
    description:
      "Designing scalable test frameworks — layered architecture, fixtures, and maintainability patterns.",
  },
  {
    slug: "automation-framework",
    title: "Automation Framework",
    description:
      "Building automation frameworks with Pytest and Pester — project structure, reporting, and CI integration.",
  },
  {
    slug: "bug-reporting",
    title: "Bug Reporting",
    description:
      "Writing clear, actionable bug reports — reproduction steps, severity classification, and root cause hints.",
  },
];
