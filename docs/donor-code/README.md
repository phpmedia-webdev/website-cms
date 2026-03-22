# Donor code (reference for styling)

## Production / safety (read this first)

- **`docs/donor-code/` is not part of the application.** Treat it as **scratch / reference** that may be **deleted before or when shipping production** (or omitted from deploy artifacts).
- **Do not put usable runtime code here** in the sense of code the app must import to work. Nothing under this tree should be **imported** from `src/`, wired in `tsconfig`, or required by build scripts.
- **Port patterns into `src/`** (and real `components/`) when implementing; keep donor files as **visual and structural reference only** (snippets, V0 dumps, screenshots, NOTES).

Drop **HTML, CSS, React snippets, screenshots, or design exports** here before we port patterns into the real app. Nothing in this folder is imported by the build — it is **review-only** reference.

## Layout

| Folder | Use for |
|--------|---------|
| **`public/`** | Public / marketing / site-facing pages, layouts, components, tokens |
| **`admin/`** | Admin / CMS UI: dashboards, tables, forms, nav chrome |

**Convention:** put each V0 (or other) donor page under its **own folder**, e.g. `admin/task-detail-and-edit/`, `admin/invoices/`, so multiple references stay organized. Names with spaces are OK but hyphenated names are easier in terminal links.

Add subfolders as you like (e.g. `public/home/`, `admin/task-detail-and-edit/`).

## Suggested workflow

1. Paste or copy donor files into the right subfolder (keep original filenames if helpful).
2. Note the **source** (URL, Figma page, repo) in a one-line comment at the top of the file or in `NOTES.md` next to it.
3. In implementation chats, point to paths under `docs/donor-code/…` so we match spacing, typography, and components intentionally.

## App styling targets (when implementing)

- **Public:** `src/app/` routes that are not under `src/app/admin/` (and shared `components/` used there).
- **Admin:** `src/app/admin/` and admin-specific components under `components/` (often with `components/ui` for shadcn).

## V0 / full shadcn bundles vs this repo

V0 exports often include **many** `components/ui/*` files and **extra** npm packages (Radix primitives, Sonner, Recharts, `vaul`, etc.). That does **not** mean the main app needs all of them to **mimic one screen**.

1. Open the donor **`task-detail-view.tsx`** (or equivalent) and note **actual imports** — usually `Card`, `Button`, `lucide-react`, and Tailwind classes.
2. Map those to **`src/components/ui/`** in website-cms; use **Tailwind** for layout, borders, and simple progress bars (the task detail donor uses a `div` bar, not `@radix-ui/react-progress`).
3. Only **`pnpm add`** / add shadcn components when a donor screen **imports** something we do not have yet.

## TypeScript

The main app **`tsconfig.json` excludes `docs/donor-code`** so `pnpm exec tsc` and the IDE do not typecheck V0 mini-projects inside this folder.

## Git

This folder is tracked so donor references travel with the repo. If a donor bundle is huge or licensed restrictively, prefer a short excerpt + link in `NOTES.md` instead of committing the full asset.
