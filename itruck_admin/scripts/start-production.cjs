"use strict";

/**
 * Production starter for Windows-friendly restarts.
 * Reuses the existing `.next` build. Never runs `next build`.
 */
const fs = require("fs");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
process.chdir(root);
process.env.NODE_ENV = "production";

const extraArgs = process.argv.slice(2);
const buildIdPath = path.join(root, ".next", "BUILD_ID");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

function getRequestedPort(args) {
  const shortIdx = args.indexOf("-p");
  if (shortIdx >= 0 && args[shortIdx + 1]) {
    return Number(args[shortIdx + 1]);
  }
  const longIdx = args.indexOf("--port");
  if (longIdx >= 0 && args[longIdx + 1]) {
    return Number(args[longIdx + 1]);
  }
  const longEq = args.find((arg) => arg.startsWith("--port="));
  if (longEq) return Number(longEq.slice("--port=".length));
  if (process.env.PORT) return Number(process.env.PORT);
  return 3000;
}

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      resolve(err && err.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, "0.0.0.0");
  });
}

async function main() {
  if (!fs.existsSync(nextBin)) {
    console.error("Next.js is not installed. Run: npm install");
    process.exit(1);
  }

  if (!fs.existsSync(buildIdPath)) {
    console.error(
      "No production build found in .next (missing BUILD_ID).\n" +
        "Run this once after code changes:\n" +
        "  npm run build\n" +
        "Then start with:\n" +
        "  npm run start\n" +
        "Restarting the app does not require another build.",
    );
    process.exit(1);
  }

  const port = getRequestedPort(extraArgs);
  if (Number.isFinite(port) && (await portInUse(port))) {
    console.error(
      `Port ${port} is already in use. The previous server is probably still running.\n` +
        "Stop that process, then run: npm run start\n" +
        "You do NOT need to run npm run build again unless you changed code.",
    );
    process.exit(1);
  }

  process.argv = [process.execPath, nextBin, "start", ...extraArgs];
  require(nextBin);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
