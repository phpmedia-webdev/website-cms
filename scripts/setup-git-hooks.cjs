/**
 * Copy repo git hooks to .git/hooks so pre-push runs build before deploy.
 * Run once: pnpm run setup-git-hooks
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const gitDir = path.join(repoRoot, ".git");
const hooksDir = path.join(gitDir, "hooks");
const sourceHook = path.join(repoRoot, "scripts", "git-hooks", "pre-push");
const destHook = path.join(hooksDir, "pre-push");

if (!fs.existsSync(gitDir)) {
  console.warn("No .git directory found. Run from repo root.");
  process.exit(1);
}

if (!fs.existsSync(sourceHook)) {
  console.warn("scripts/git-hooks/pre-push not found.");
  process.exit(1);
}

try {
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
  fs.copyFileSync(sourceHook, destHook);
  fs.chmodSync(destHook, 0o755);
  console.log("Git hooks installed. Pre-push will run 'pnpm run build' before each push.");
} catch (err) {
  console.error("Failed to install hooks:", err.message);
  process.exit(1);
}
