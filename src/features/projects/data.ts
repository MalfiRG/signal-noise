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
      "The fully agentic workspace. A multi-project monorepo with a routing layer (60+ patterns, 97%+ regression-tested accuracy), a semantic knowledge graph (~180K indexed drawers, ~12K knowledge triples), and a multi-agent orchestration stack - adversarial review loops, parallel team dispatch, pattern-graduation from repeated defects into architectural rules. ~30 orchestration skills, ~20 behavioral rules, and a session state machine (checkpoints, handoffs, pre-compaction hooks) keep coherence across context boundaries.",
    tech_stack: ["Python", "Claude Code", "MCP", "pytest", "YAML", "Bash"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "VMware Orchestrator",
    description:
      "PowerShell class-based PSM1 module for orchestrating dozens of VMs at once. Snapshot rotation, programmatic revert/create cycles, remote script execution, and system-agnostic update routing across Debian, RHEL, and Windows hosts (package-manager-as-strategy). Built end-to-end with Builder, Strategy, and Factory patterns. Runs daily on demand and via Windows Task Scheduler.",
    tech_stack: [
      "PowerShell",
      "PSM1 modules",
      "VMware PowerCLI",
      "OOP",
      "Design Patterns",
    ],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "PowerShell Testing Framework",
    description:
      "Pester-based regression suite with bootstrap scripts that stand up the test environment from zero. Cut the manual regression cycle by ~50% in steady-state use. Built from scratch - environment provisioning, test orchestration, and reporting all in PowerShell.",
    tech_stack: ["PowerShell", "Pester", "VMware", "CI/CD"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "ScoutQL",
    description:
      "Full-stack job aggregator built end-to-end. Dual acquisition - Crawlee browser scraper and an API fetcher (Strategy/Factory/Adapter patterns) pulling from multiple sources. Stores listings in a centralized DB, scores postings against my CV with an LLM worker, reviewed through a React dashboard. Self-hosted on a hardened VPS with an observability bus, self-healing layer, and the DevOps pipeline that runs the box.",
    tech_stack: ["React", "TypeScript", "FastAPI", "SQLAlchemy", "SQLite", "Redis", "Crawlee", "Docker", "Tailwind"],
    stars: "0",
    forks: "0",
    private: true,
  },
  {
    title: "SIGNAL_NOISE",
    description:
      "This blog and portfolio. React SPA with a Night City visual identity, custom animated diagrams (framer-motion + Recharts for interactive technical storytelling), and an e-ink reader aesthetic for long-form posts. Motion-aware - animations gate by device tier and reduced-motion preference. Regression-proofed with a Playwright E2E suite that asserts every visual element renders as designed.",
    tech_stack: ["React", "TypeScript", "Vite", "Tailwind", "Framer Motion", "Recharts", "Playwright"],
    github_url: "https://github.com/MalfiRG/signal-noise",
    live_url: "https://piotrtarach.dev",
    github_owner_repo: "MalfiRG/signal-noise",
    stars: "0",
    forks: "0",
    language: "TypeScript",
    ciBadge: {
      label: "Playwright E2E Tests",
      imageUrl:
        "https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/MalfiRG/58e37ead5baa74b10aaca477f228b7ae/raw/signal-noise-e2e-status.json",
      linkUrl:
        "https://github.com/MalfiRG/signal-noise/actions/workflows/e2e.yml",
    },
  },
  {
    title: "Mr. Robot",
    description:
      "Persistent meshnet VPN across multiple devices using NordVPN Meshnet. SSH hardening, port proxying, and custom routing rules to access home lab services from anywhere. Tailscale overlay adds a remote LLM server with host-level network isolation - the remote peer sees only the laptop, never the LAN. Full remote dev stack: SSH + tmux + Claude Code from Android. Looks quite cool and a bit scary for bystanders, I suppose.",
    tech_stack: ["Bash", "NordVPN Meshnet", "Tailscale", "SSH"],
    stars: "0",
    forks: "0",
    private: true,
  },
];
