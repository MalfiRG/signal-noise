# Hard Reload Dev Servers — No HMR Trust on WSL2

## Rule

After ANY file change that affects runtime behavior, **kill and hard-restart** the dev server. Do NOT rely on Vite HMR — it is unreliable on WSL2 + NTFS cross-mounts.

Do this **automatically without being asked** after edit sessions or before visual testing.

## Decide first: ephemeral or long-lived?

Before starting a dev server, choose the right lifetime model. The command-pattern depends on it.

| Purpose | Lifetime model | Where it should run |
|---|---|---|
| Automated visual testing (Playwright inside a subagent) | Ephemeral (seconds to minutes) | Agent Bash with `run_in_background: true`. Accept that the harness may reap it. |
| You (the human) manually browsing the site to verify a feature | Long-lived (minutes to hours) | **OUTSIDE the Claude Code harness** — user-session or separate terminal. |
| A background agent running a full test run that needs a live preview | Long-lived | Outside harness (same as user browsing). |

**The harness is not a process supervisor.** It reaps long-running child processes when the tool call that spawned them finishes its idle window. Even with `run_in_background: true` you get only a window, not a guarantee. **Do not use Agent-spawned dev servers for manual browsing.**

## How — ephemeral (short-lived, inside the harness)

```bash
# Kill old server (foreground Bash call)
pkill -f "vite.*--port 8080" 2>/dev/null; sleep 1

# Start new server (MUST use run_in_background: true)
# Run from the repo root. If your cwd is already the repo root, skip the cd.
node node_modules/vite/bin/vite.js --port 8080 --host
```

### Forbidden invocation patterns — all trigger exit 144 (SIGRTMIN)

The harness reaps any process group that is not directly owned by the Bash wrapper invoking the tool call. Each of these breaks ownership:

- `nohup node ... &` — nohup reparents; backgrounding detaches.
- `node ... &` — trailing `&` creates a detached job.
- `(node ...)` — subshell parens create a new process group even without `&`. **This is a surprising footgun.** The node process becomes the child of the sub-shell, and when the sub-shell exits after launching node, node is orphaned into its own PGID which the harness treats as "not mine" and reaps.
- `(cd X && node ...)` — same reason, the subshell pattern is the problem, not the `cd`.
- `bash -c 'node ...'` — inner shell creates a new group; same issue.
- `setsid node ...` — explicit group detachment.

Correct pattern: **plain `node node_modules/vite/bin/vite.js --port 8080 --host`** with `run_in_background: true`. No parens, no `&`, no wrapper shell. If you need to cd, use `git -C` for git-only ops, or set cwd via the Bash tool's command ordering (if already there, skip; if not, put a `cd` on its own prior foreground Bash call — NOT combined with the start command).

## How — long-lived (outside the harness, for manual browsing)

Ask the user to run one of the following themselves:

**Option A — `!` prefix (output lands in the current conversation):**
```
! node node_modules/vite/bin/vite.js --port 8080 --host
```
The `!` prefix runs the command in the user's interactive session, not a tool-call sandbox. The process is attached to the user's terminal and lives for the session's lifetime. Suitable when you (the user) will stay in this chat and want the vite log visible inline.

**Option B — separate terminal window:**
User opens a new WSL terminal (outside Claude Code) and runs:
```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix
node node_modules/vite/bin/vite.js --port 8080 --host
```
Process lives as long as the terminal stays open. Independent of Claude Code session lifetime.

## First-cold-start patience

WSL2 + NTFS cross-mount: Vite's first-ever cold start scans the `src/` and `node_modules/` trees over a slow filesystem. **Expect 15–30 seconds before port 8080 binds and HTTP 200 returns.** Subsequent restarts within the same dev session are faster (5–10s) because the filesystem is warm.

When health-checking, poll up to 60 seconds before declaring failure:

```bash
for i in 10 20 30 45 60; do
  sleep 10
  ss -tln 2>/dev/null | grep -q :8080 && break
done
curl -s -m 10 -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/
```

Do not declare vite "dead" until (a) the process is gone from `pgrep -af vite` AND (b) port 8080 has no listener. A process in `Dl` state (uninterruptible I/O wait) is still initializing, not hung.

## Cross-session port contention

If you see exit 144 immediately after starting vite correctly, check whether another Claude Code session OR a parallel agent in this session is already using the port:

```bash
pgrep -af "vite" | grep -v grep
ss -tlnp 2>/dev/null | grep :8080
pgrep -af "playwright" | grep -v grep   # Playwright's webServer spawns its own vite
```

Common offenders:
- A Wave 3 qa-strategist or test-execution agent running Playwright locally spawns `npm run dev` via `playwright.config.ts`'s `webServer.command`.
- A second Claude Code session opened on the same project has its own vite on port 8080.
- A previously-backgrounded vite from earlier in this session is still alive and was counted as "orphan" by the harness.

Resolution: either (a) wait for the competing agent/session to release the port, (b) use a different port (`--port 8081`) for your own manual browsing, or (c) ask the user to kill the competing process themselves from outside the harness.

## Exposing to LAN / Meshnet (port-proxy)

WSL2 `--host` binds to `0.0.0.0` inside WSL, but Windows only auto-forwards `localhost`. For LAN phones, Meshnet peers, or other network access:

**Use the canonical helper script, not manual `netsh`:**
```powershell
C:\Users\malfi\scripts\fix-wsl-portproxy.ps1
```

This script self-heals WSL2 IP drift (the WSL IP changes on every restart and manually-entered `netsh` rules break silently). It forwards the canonical dev ports (5173, 8080, 8000) to the current WSL IP and adds firewall rules for the Meshnet interface. Always suggest this over ad-hoc `netsh interface portproxy add` commands.

If the user asks for direct access instead of Meshnet-scoped, the equivalent manual command (to be run in **elevated Windows PowerShell**) is:
```powershell
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=<WSL2-IP>
```
The `<WSL2-IP>` comes from `hostname -I` inside WSL — it drifts on WSL2 restart, so re-run the command after every Windows reboot or WSL restart.

## Why (filesystem + supervision)

- WSL2 filesystem events over NTFS cross-mounts are flaky — `inotify` doesn't always fire, so HMR misses changes silently.
- A crashed React tree can't recover via HMR either. Hard restart is the only reliable path.
- The Claude Code harness is a tool-call runtime, not a process supervisor. Long-running child processes need to live outside it.
- Subagent sandboxes enforce process-group ownership; any indirection (subshell, nohup, detached bg job) trips the reaper.

## Failure-mode summary

| Symptom | Likely cause | Fix |
|---|---|---|
| Exit 144 immediately | Subshell / `nohup` / `&` invocation pattern | Drop the wrapper; invoke `node ...` directly with `run_in_background: true` |
| Exit 144 after 30-90 seconds | Harness reaped a long-lived bg process | Switch to `! <command>` or separate terminal |
| Port bound per `ss -tln` but `curl` returns 000 | Vite still cold-starting (filesystem scan) | Wait up to 60s; WSL2+NTFS is slow on first start |
| Exit 144 while another agent is running | Port contention with parallel agent's Playwright webServer | Wait for agent; use port 8081; or kill the competing process from outside |
| `pgrep` shows no vite yet stdout log is empty | Vite crashed silently (rare) OR stdout buffering delay | Check `ss :8080` + process state; `Dl` state means still initializing |

## Last-trim

2026-04-24 — incorporated subshell failure mode, cold-start patience threshold, cross-session contention diagnostics, `fix-wsl-portproxy.ps1` canonical reference, ephemeral vs long-lived lifetime decision table, `! <command>` escape hatch, failure-mode summary table.
