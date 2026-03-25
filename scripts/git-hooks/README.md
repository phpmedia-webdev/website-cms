# Git hooks

This repo does **not** ship a pre-push hook. To remove a legacy local `pre-push` that ran `pnpm run build`, run from the repo root:

`pnpm run setup-git-hooks`
