export type Skill = {
  name: string;
  level: number;
  description?: string;
};

export type LearningItem = {
  name: string;
  level: number;
  description: string;
};

export const skills: Skill[] = [
  {
    name: "Pytest (Python)",
    level: 80,
    description:
      "Primary automation framework at Veeam. Designing and maintaining large-scale test suites with fixtures, parametrization, and custom plugins.",
  },
  {
    name: "PowerShell / Pester",
    level: 75,
    description:
      "Primary scripting language for Windows test automation. Building Pester test suites for infrastructure validation and deployment verification.",
  },
  {
    name: "Python",
    level: 75,
    description:
      "Main programming language for test automation, scripting, and tooling. Experience with REST API testing, data processing, and CI integration.",
  },
  {
    name: "CI/CD (GitLab CI, Jenkins)",
    level: 70,
    description:
      "Pipeline integration for test suites. Configuring automated test execution, reporting, and quality gates.",
  },
  {
    name: "JIRA / TestRail / Confluence",
    level: 75,
    description:
      "Test management, defect tracking, and documentation. Designing test plans, managing test cycles, and reporting metrics.",
  },
  {
    name: "Testing Frameworks (Playwright, Selenium)",
    level: 65,
    description:
      "Secondary frameworks for web UI automation. Experience with Page Object Pattern and cross-browser testing.",
  },
  {
    name: "Manual Testing",
    level: 65,
    description:
      "Exploratory testing, grey-box testing, and UAT. Risk-based test design and defect triage.",
  },
  {
    name: "Docker",
    level: 60,
    description:
      "Containerized test environments. Building reproducible test infrastructure with Docker Compose.",
  },
  {
    name: "AI-Augmented Testing",
    level: 70,
    description:
      "Leveraging AI for test generation, log analysis, and anomaly detection. Prompt engineering for QA workflows.",
  },
  {
    name: "Teamwork & Communication",
    level: 80,
    description:
      "Cross-team collaboration with developers, product owners, and DevOps. Mentoring junior testers.",
  },
];

export const learning: LearningItem[] = [
  {
    name: "TypeScript",
    level: 30,
    description:
      "Building type-safe applications and test utilities. Learning React + TypeScript patterns.",
  },
  {
    name: "CI/CD & DevOps (GitHub Actions)",
    level: 45,
    description:
      "Expanding pipeline skills with GitHub Actions. Automating deployment, SSL, and backup workflows.",
  },
  {
    name: ".NET C#",
    level: 40,
    description:
      "Developing backend understanding with ASP.NET Core. Enabling better collaboration with .NET development teams.",
  },
];
