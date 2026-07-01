#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const hookArgs = process.argv.slice(2);

if (hookArgs.length === 0) {
  console.error("Usage: node .codex/hooks/run-python-hook.mjs <hook.py> [args...]");
  process.exit(2);
}

const candidates = [
  { command: "python", args: ["-X", "utf8"] },
  { command: "python3", args: ["-X", "utf8"] },
  { command: "py", args: ["-3", "-X", "utf8"] },
];

const missing = [];

for (const candidate of candidates) {
  const result = spawnSync(candidate.command, [...candidate.args, ...hookArgs], {
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    missing.push(candidate.command);
    continue;
  }

  if (result.error) {
    console.error(`${candidate.command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }

  process.exit(result.status ?? 1);
}

console.error(`No Python interpreter found. Tried: ${missing.join(", ")}`);
process.exit(127);
