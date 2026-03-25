/**
 * Removes the legacy pre-push hook that ran `pnpm run build` before every push
 * (timeouts and friction on some machines). We no longer install build-on-push hooks.
 *
 * Run once if you previously ran setup-git-hooks: `pnpm run setup-git-hooks`
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const gitDir = path.join(repoRoot, ".git");
const hooksDir = path.join(gitDir, "hooks");
const destHook = path.join(hooksDir, "pre-push");

if (!fs.existsSync(gitDir)) {
  console.warn("No .git directory found. Run from repo root.");
  process.exit(1);
}

try {
  if (fs.existsSync(destHook)) {
    fs.unlinkSync(destHook);
    console.log("Removed .git/hooks/pre-push — pushes no longer run a production build first.");
  } else {
    console.log("No .git/hooks/pre-push found — nothing to remove.");
  }
} catch (err) {
  console.error("Failed to remove hook:", err.message);
  process.exit(1);
}
