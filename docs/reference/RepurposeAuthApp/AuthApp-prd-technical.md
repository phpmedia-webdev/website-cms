## Lessons Learned

Vercel Deployment
- **Keep vercel.json MINIMAL**: Use only `buildCommand` and `outputDirectory` properties
- **Avoid complexity**: Complex routing, version numbers, and extra config causes JSON parsing errors and 404s
- **Working configuration**:
  ```json
  {
    "buildCommand": "npm run vercel-build",
    "outputDirectory": "dist/public"
  }
  ```
- **Build command**: `vercel-build` script in package.json runs `vite build`
- **Output directory**: Vite builds to `dist/public` - this is where index.html and assets live
- **Let Vercel use defaults**: Framework detection and smart defaults work better than manual configuration
- **If 404 errors occur**: Check that vercel.json exists and uses minimal configuration above

### Vercel Deployment Issues

**BOM (Byte Order Mark) in JSON Files:**
- Problem: vercel.json with UTF-8 BOM character causes "Could not parse File as JSON" error
- Solution: Delete and recreate the file with clean UTF-8 encoding (no BOM)
- Detection: Use `node -e "console.log(JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')))"` to test
- Prevention: Ensure editor saves JSON files without BOM (VS Code/Cursor: "Save without BOM")

**Environment Variables Required:**
- Vercel does NOT automatically copy environment variables from local .env
- Must manually add to Vercel Dashboard → Settings → Environment Variables:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Public anon key
  - `DATABASE_URL` - Connection string with SESSION pooler (port 6543)
- Apply to: Production, Preview, AND Development environments
- Redeploy after adding variables

**Supabase Connection Pooler:**
- Use SESSION pooler (port 6543) for Express/Node.js apps with Drizzle ORM
- Use TRANSACTION pooler (port 6543) only for single-query serverless functions
- Connection string format: `postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- Enable in Supabase: Settings → Database → Connection String → Toggle "Use connection pooling" → Session mode

**Static File Serving Paths:**
- Vite builds to different locations based on environment:
  - Vercel: `dist/` (when `VERCEL` env var is set)
  - Local: `dist/public/` (Replit-style)
- Solution: Check both paths and use whichever exists
- serveStatic function must detect environment and adjust paths accordingly

**TypeScript Build Errors Block Deployment:**
- TypeScript errors in production builds cause 500 FUNCTION_INVOCATION_FAILED
- Common issues:
  - Missing imports (e.g., `sql` from drizzle-orm)
  - Type mismatches (null vs undefined)
  - Missing required fields in type definitions
- Always fix TypeScript errors before deploying - builds may "succeed" but runtime crashes

**vercel.json Configuration:**
- Minimal config works best - avoid overriding build settings
- Don't use `buildCommand` in vercel.json v2 (not supported)
- Let Vercel auto-detect when possible
- Correct minimal format:
```json
{
  "version": 2,
  "builds": [{"src": "api/index.ts", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "/api/index.ts"}]
}
```

**Vercel includeFiles Not Working (Complex Express Apps):**
- Problem: `includeFiles: ["server/**"]` in vercel.json doesn't reliably deploy imported directories
- Symptom: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routes'`
- Root cause: Vercel's @vercel/node doesn't always bundle imports from parent directories
- Solution: Pre-bundle with esbuild before deployment
  - Rename source: `api/index.ts` → `api/handler.ts`
  - Bundle to output: `api/handler.ts` → `api/index.js` (esbuild --bundle)
  - Commit bundled `api/index.js` to git
  - No filename conflict: source and output have different names
  - All code in single file - no import errors possible
- Build command: `esbuild api/handler.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js`
- Result: 170-180kb single file with all dependencies bundled

**Vercel Stuck on Old Commit:**
- Problem: Pushing to GitHub but Vercel keeps deploying old commit
- Symptom: Dashboard shows old commit hash, new commits don't appear in deployment list
- Causes: Webhook failure, cache issues, Git integration stuck
- Solutions:
  1. Reconnect GitHub integration: Settings → Git → Disconnect → Reconnect
  2. Manual redeploy: Select specific commit hash and uncheck "Use existing Build Cache"
  3. Empty commit: `git commit --allow-empty -m "trigger"` to force webhook
  4. Check Settings → Git → Production Branch is correct
- Prevention: Monitor deployment dashboard after pushes to confirm auto-deploy working

### Git Workflow for Production

**Merging dev to main with Conflicts:**
- If merge conflicts occur, use force-push strategy:
  ```bash
  git checkout main
  git reset --hard origin/dev
  git push --force origin main
  ```
- This replaces main with dev content completely
- Safe for projects where main was just a standby page

**Preventing Premature Deployments:**
- Set up proper staging/production environments
- Use Vercel branch settings to control what deploys
- Don't integrate external websites until auth system has permanent URL
- Always test locally first: `npm run build` before pushing

### Database Migrations

**Running Migrations in Production:**
- Always run database migrations BEFORE deploying code that depends on them
- Use Supabase SQL Editor for manual migrations
- Verify success messages before deploying application code
- Check table exists: `SELECT COUNT(*) FROM table_name;`

**Migration File Format:**
- Include verification queries at end of migration
- Use `IF NOT EXISTS` for idempotent migrations
- Add indexes for performance
- Document expected output in comments

### Emergency Recovery Procedures

**Website Down - Quick Rollback:**
- Keep original working code in version control
- Document rollback procedures in advance
- For websites: Restore previous form/component versions first, fix integration later
- Priority: Get site online fast, then fix properly with testing

**Fast Track Deployment:**
- MVP approach: Ship with essential security, harden post-launch
- Acceptable to defer: MFA, multi-tier auth, full OWASP audit
- Must have: Environment variables, basic auth, API keys, audit logging
- Timeline: 8-12 hours for MVP production launch is achievable
