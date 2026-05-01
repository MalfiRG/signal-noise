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
    name: "Agentic Coding (Claude Code, Multi-Agent Orchestration)",
    level: 85,
    description:
      "Daily driver since the GPT-3 era. Build, debug, refactor, and orchestrate multi-agent workflows.",
  },
  {
    name: "REST API Testing & Automation",
    level: 85,
    description:
      "Bread and butter. Designing and executing comprehensive test suites for RESTful APIs. Utilizing tools like Postman, Newman, Pytest to automate what can and should be automated.",
  },
  {
    name: "DevOps from Zero to Hero",
    level: 80,
    description:
      "Bootstrap full environments end-to-end: BIOS, OS install, hardening, networking, observability, CI/CD wiring, application deploy.",
  },
  {
    name: "PowerShell Module Authoring",
    level: 80,
    description:
      "Class-based PSM1 modules using Builder, Strategy, and Factory patterns.",
  },
  {
    name: "Linux/Windows Infrastructure & Networking",
    level: 80,
    description:
      "SSH hardening, NordVPN Meshnet tunneling, port-proxy plumbing, sshd drop-in ordering, UFW, fail2ban, Let's Encrypt.",
  },
  {
    name: "Cross-Team Collaboration & Technical Writing",
    level: 80,
    description:
      "Translate between developers, product, and DevOps. Mentor junior testers. Write the blog you're reading.",
  },
  {
    name: "VMware Virtualization",
    level: 75,
    description:
      "Daily-driver hypervisor. Snapshot strategies, programmatic VM lifecycle (PowerCLI + custom orchestrator), test-environment rotation at scale.",
  },
  {
    name: "Docker / Containerization",
    level: 75,
    description:
      "Reproducible test and deploy environments. Multi-stage builds, Compose, userns-remap on production VPS, network isolation.",
  },
  {
    name: "CI/CD (Jenkins, GitLab CI, GitHub Actions)",
    level: 75,
    description:
      "Pipeline integration for test suites and deploys. Comfortable across all three; choice is project-shape-dependent, not religious.",
  },
  {
    name: "Python",
    level: 75,
    description:
      "Test automation, scripting, REST API testing, data processing. Comfortable architecting whole programs from scratch with AI assistance. No worries, I am taking care to gitignore .venv and .env ;)",
  },
  {
    name: "PowerShell / Pester",
    level: 75,
    description:
      "My primary scripting language for Windows test automation. Authored a Pester-based regression suite that cut the manual testing time by ~50% in everyday use.",
  },
  {
    name: "Pytest",
    level: 70,
    description:
      "Confident on parametrize, fixtures, and custom plugins from scratch.",
  },
  {
    name: "Observability (Grafana, Structured Logging)",
    level: 70,
    description:
      "Dashboard authoring, structured JSON logs with run_id correlation, post-mortem diagnostics. Logs are a queryable data source, not a tail-and-pray archive.",
  },
  {
    name: "Playwright / Selenium",
    level: 65,
    description:
      "Web UI automation, Page Object Model, cross-browser. Used in this blog's E2E suite and in ScoutQL.",
  },
];

export const learning: LearningItem[] = [
  {
    name: "TypeScript",
    level: 35,
    description:
      "Type-safe applications and test utilities. Daily exposure via this blog and ScoutQL - closing the gap by shipping, not studying.",
  },
  {
    name: "React + Tailwind + Vite",
    level: 35,
    description:
      "Modern frontend stack. Built this blog and ScoutQL's dashboard on it; still learning the idiomatic patterns.",
  },
  {
    name: "Robot Framework",
    level: 25,
    description:
      "BDD-style test framework. On the radar for cross-team test readability and keyword-driven scenarios.",
  },
  {
    name: "Mobile Testing",
    level: 25,
    description:
      "Appium and platform-specific tooling. Adjacent to the day job but not yet a core skill.",
  },
  {
    name: ".NET / C#",
    level: 40,
    description: "Backend understanding for ASP.NET Core.",
  },
];
