# Hard Reload Dev Servers — No HMR Trust on WSL2

## Rule

After ANY file change that affects runtime behavior, **kill and hard-restart** the dev server. Do NOT rely on Vite HMR — it is unreliable on WSL2 + NTFS cross-mounts.

Do this **automatically without being asked** after edit sessions or before visual testing.

## How

```bash
# Kill old server (foreground Bash call)
pkill -f "vite.*--port 8080" 2>/dev/null; sleep 1

# Start new server (MUST use run_in_background: true)
cd <repo-root> && node node_modules/vite/bin/vite.js --port 8080 --host
```

**Always use `run_in_background: true`** on the Bash tool call. Never use `nohup ... &` or trailing `&` — the harness tears down child process groups and the server dies (exit code 144 = 128 + SIGRTMIN).

## Why

WSL2 filesystem events over NTFS mounts are flaky — `inotify` doesn't always fire, so HMR misses changes silently. A crashed React tree can't recover via HMR either. Hard restart is the only reliable path.
