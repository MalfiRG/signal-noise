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
      "Daily driver since the GPT-3 era. Build, debug, refactor, and orchestrate multi-agent workflows. Authored MetaOrchestrator — a workspace harness with routing logic, three-tier memory (lazy file-tier, eager session-tier, semantic palace-tier), and a regression test suite for the routing layer itself.",
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
      "SSH hardening, NordVPN Meshnet tunneling, port-proxy plumbing, sshd drop-in ordering, UFW, fail2ban, Let's Encrypt. Run a hardened Hetzner VPS end-to-end — bootstrap, certs, firewall, observability, deploy.",
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
      "Test automation, scripting, REST API testing, data processing. Build from scratch with AI assistance comfortably; reading and modifying unfamiliar Python codebases benefits from doc-lookup loops — the honest version of this skill.",
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
      "Confident on parametrize, fixtures, and custom plugins from scratch. Existing legacy scaffolding still warrants a docs cycle — same as anyone honest about their stack.",
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
    name: "Cross-Team Collaboration & Technical Writing",
    level: 80,
    description:
      "Translate between developers, product, and DevOps. Mentor junior testers. Write the blog you're reading.",
  },
];

export const learning: LearningItem[] = [
  {
    name: "TypeScript",
    level: 35,
    description:
      "Type-safe applications and test utilities. Daily exposure via this blog and ScoutQL — closing the gap by shipping, not studying.",
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
    description:
      "Backend understanding for ASP.NET Core. Less active than the others; kept here for honesty.",
  },
];
