/**
 * Free a TCP port before starting Next.js (fixes EADDRINUSE on Windows).
 * Usage: node scripts/free-port.js 3004
 *
 * Uses absolute Windows tool paths because npm scripts often have a stripped PATH.
 */
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const port = Number(process.argv[2] || 3004);
if (!Number.isFinite(port) || port <= 0) {
  console.error("Usage: node scripts/free-port.js <port>");
  process.exit(1);
}

function system32(exe) {
  const root = process.env.SystemRoot || "C:\\Windows";
  return path.join(root, "System32", exe);
}

function killPids(pids) {
  const unique = [
    ...new Set(pids.map(String).filter((p) => /^\d+$/.test(p) && p !== "0")),
  ];
  for (const pid of unique) {
    try {
      if (process.platform === "win32") {
        const taskkill = system32("taskkill.exe");
        spawnSync(taskkill, ["/PID", pid, "/F"], { stdio: "ignore" });
      } else {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      }
      console.log(`[free-port] Killed PID ${pid} on port ${port}`);
    } catch {
      /* already gone */
    }
  }
}

function freePortWindows(p) {
  const pids = new Set();

  const psCandidates = [
    path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
    "powershell.exe",
  ];
  for (const ps of psCandidates) {
    if (ps !== "powershell.exe" && !fs.existsSync(ps)) continue;
    const result = spawnSync(
      ps,
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-NetTCPConnection -LocalPort ${p} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ' '`,
      ],
      { encoding: "utf8" },
    );
    if (result.status === 0 && result.stdout && result.stdout.trim()) {
      result.stdout
        .trim()
        .split(/\s+/)
        .forEach((id) => pids.add(id));
      break;
    }
  }

  if (pids.size === 0) {
    const netstat = system32("netstat.exe");
    const findstr = system32("findstr.exe");
    if (fs.existsSync(netstat)) {
      const result = spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", `"${netstat}" -ano | "${findstr}" :${p}`],
        { encoding: "utf8", windowsVerbatimArguments: true },
      );
      const out = `${result.stdout || ""}${result.stderr || ""}`;
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        pids.add(parts[parts.length - 1]);
      }
    }
  }

  killPids([...pids]);
}

function freePortUnix(p) {
  try {
    const out = execSync(`lsof -ti tcp:${p}`, { encoding: "utf8" }).trim();
    if (out) killPids(out.split(/\s+/));
  } catch {
    /* nothing listening */
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
