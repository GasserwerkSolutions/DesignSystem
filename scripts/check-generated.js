#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const result = spawnSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "dist"], {
  encoding: "utf8",
  cwd: require("node:path").resolve(__dirname, ".."),
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || "git status failed\n");
  process.exit(result.status || 1);
}

if (result.stdout.trim()) {
  console.error("Generated dist artifacts do not match the committed source:");
  console.error(result.stdout.trim());
  process.exit(1);
}

console.log("[check-generated] dist is committed and reproducible.");
