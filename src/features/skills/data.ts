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
      "Daily driver since the GPT-3 era. Build, debug, refactor, and orchestrate multi-agent workflows. Authored MetaOrchestrator - a workspace harness with routing logic, three-tier memory (lazy file-tier, eager session-tier, semantic palace-tier), and a regression test suite for the routing layer itself.",
  },
  {
    name: "DevOps from Zero (BIOS → OS → Harden → CI/CD → App)",
    level: 80,
    description:
      "Bootstrap full environments end-to-end: BIOS, OS install, hardening, networking, observability, CI/CD wiring, application deploy. Recently migrated a Windows-bound workspace to Linux-native by mounting the VHD and porting the entire infrastructure through Claude Code.",
  },
  {
    name: "PowerShell Module Authoring (OOP + Design Patterns)",
    level: 80,
    description:
      "Class-based PSM1 modules using Builder, Strategy, and Factory patterns. Built a VMware orchestrator that snapshot-rotates dozens of VMs, executes remote scripts, and routes system-agnostic updates across Debian, RHEL, and Windows hosts. PowerShell as a real language, not glue.",
  },
  {
    name: "Linux/Windows Infrastructure & Networking",
    level: 80,
    description:
      "SSH hardening, NordVPN Meshnet tunneling, port-proxy plumbing, sshd drop-in ordering, UFW, fail2ban, Let's Encrypt. Run a hardened Hetzner VPS end-to-end - bootstrap, certs, firewall, observability, deploy.",
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
    name: "Python (Intermediate-Strong, AI-Augmented)",
    level: 75,
    description:
      "Test automation, scripting, REST API testing, data processing. Build from scratch with AI assistance comfortably.",
  },
  {
    name: "PowerShell / Pester",
    level: 75,
    description:
      "Primary scripting language for Windows test automation. Authored a Pester-based regression suite that cut the manual regression cycle by ~50% in steady-state use.",
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
  {
    name: "FastAPI / REST API Development",
    level: 70,
    description:
      "Full backend builds: routers, auth (JWT + refresh), Pydantic v2 schemas, SQLAlchemy 2.0, rate limiting, SSRF prevention. Built ScoutQL's entire API layer from scratch.",
  },
  {
    name: "Web Scraping / Data Engineering",
    level: 70,
    description:
      "Crawlee actors on Apify, Playwright-based pagination, structured extraction, error classification (transient vs deterministic).",
  },
  {
    name: "Linux Server Administration",
    level: 70,
    description:
      "Production VPS on Hetzner end-to-end: systemd services, UFW firewall, Let's Encrypt SSL, Docker deploy, fail2ban, SSH hardening.",
  },
  {
    name: "Research & Technical Writing",
    level: 75,
    description:
      "Multi-source research pipelines with adversarial review gates.",
  },
  {
    name: "Cross-Team Collaboration & Technical Writing",
    level: 80,
    description:
      "Translate between developers, product, and DevOps. Mentor junior testers. Write the blog you're reading.",
  },
];

export const learning: LearningItem[] = [
  {
    name: "TypeScript",
    level: 50,
    description:
      "Shipped a full portfolio site and ScoutQL dashboard in TS. Comfortable with generics, utility types, and strict mode.",
  },
  {
    name: "React + Tailwind + Vite",
    level: 50,
    description:
      "Built two production apps (this blog + ScoutQL). 4-theme system, Framer Motion cascades, responsive layouts.",
  },
  {
    name: "Security Testing",
    level: 40,
    description:
      "Purple-team exercises, OWASP Top 10, JWT attack vectors, SSRF prevention, prompt injection defense.",
  },
  {
    name: "Terraform / IaC",
    level: 25,
    description:
      "Natural next step from Docker + Hetzner VPS. On the roadmap for reproducible multi-environment infrastructure.",
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
      "Appium and platform-specific tooling.",
  },
  {
    name: ".NET / C#",
    level: 40,
    description:
      "Backend understanding for ASP.NET Core.",
  },
];
