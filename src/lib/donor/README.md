# Donor code

Paste reusable code here so the AI agent (or you) can ingest it when generating or refining pages and components.

## Purpose

- **From Superadmin → Code snippets:** Copy a snippet from the Code snippets library, then save it as a file in this folder (e.g. `hero-section.tsx`, `footer.tsx`).
- **AI ingestion:** When asking the AI to generate or adapt a page, it can read files in this folder and use them as reference or starting points.
- **Hand-written:** You can also add your own donor files (sections, layouts, partials) that aren’t in the snippet library.

## Workflow

1. In the app: **Superadmin → Code snippets** → open a snippet → **Copy code**.
2. Create or open a file in `src/lib/donor/` (e.g. `hero.tsx`) and paste the code.
3. When generating or refining code, point the AI at this folder or specific files so it can use them.

## Notes

- Files in this folder are **reference only**; they are not imported by the app at runtime.
- Name files clearly (e.g. by section or component) so you can refer to them easily.
- You can use any extension (`.tsx`, `.ts`, `.md`) as needed.
