export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
  github_owner_repo?: string;
  stars: string;
  forks: string;
  language?: string;
  pushedAt?: string;
  private?: boolean;
  ciBadge?: {
    label: string;
    imageUrl: string;
    linkUrl: string;
  };
}

export const projects: Project[] = [
  {
    title: "MetaOrchestrator",
    description:
      "The fully agentic workspace. A multi-project monorepo with a routing layer that decides which project a query belongs to, a three-tier memory architecture (lazy file-tier, eager session-tier, semantic mem-palace tier with tens of thousands of indexed drawers), and a regression test harness that keeps routing accuracy above 97%. Built by hardening an existing folder structure into a research instrument.",
    tech_stack: ["Python", "Claude Code", "MCP", "pytest", "YAML", "Bash"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "VMware Orchestrator",
    description:
      "PowerShell class-based PSM1 module for orchestrating dozens of VMs at once. Snapshot rotation, programmatic revert/create cycles, remote script execution, and system-agnostic update routing across Debian, RHEL, and Windows hosts (package-manager-as-strategy). Built end-to-end with Builder, Strategy, and Factory patterns. Runs daily on demand and via Windows Task Scheduler.",
    tech_stack: ["PowerShell", "PSM1 modules", "VMware PowerCLI", "OOP", "Design Patterns"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "PowerShell Testing Framework",
    description:
      "Pester-based regression suite with bootstrap scripts that stand up the test environment from zero. Cut the manual regression cycle by ~50% in steady-state use. Built from scratch — environment provisioning, test orchestration, and reporting all in PowerShell.",
    tech_stack: ["PowerShell", "Pester", "VMware", "CI/CD"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "ScoutQL",
    description:
      "Full-stack job aggregator I built end-to-end: scrape career pages with Crawlee/Playwright, store in a centralized DB, score postings against my CV with an LLM worker, then review through a React dashboard. JWT auth, BYOK provider config, structured run-correlation logging, Docker-Compose deploy on a hardened Hetzner VPS.",
    tech_stack: ["React", "TypeScript", "FastAPI", "SQLAlchemy", "Crawlee", "Docker", "Tailwind"],
    github_url: "https://github.com/MalfiRG/ScoutQL",
    github_owner_repo: "MalfiRG/ScoutQL",
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "SIGNAL_NOISE",
    description:
      "This blog and portfolio. React SPA with a response web design featuring a Night City visual identity, Mermaid rendering, and an e-ink reader aesthetic - monochrome, paper-like, distraction-free. Regression-proofed with a Playwright E2E suite that asserts every visual element renders as envisioned",
    tech_stack: ["React", "TypeScript", "Vite", "Tailwind", "Framer Motion", "Playwright"],
    github_url: "https://github.com/MalfiRG/the-digital-matrix",
    live_url: "https://the-digital-matrix.vercel.app",
    github_owner_repo: "MalfiRG/the-digital-matrix",
    stars: "0",
    forks: "0",
    language: "TypeScript",
    private: true,
    ciBadge: {
      label: "Playwright E2E Tests",
      imageUrl: "https://github.com/MalfiRG/the-digital-matrix/actions/workflows/e2e.yml/badge.svg",
      linkUrl: "https://github.com/MalfiRG/the-digital-matrix/actions/workflows/e2e.yml",
    },
  },
];
