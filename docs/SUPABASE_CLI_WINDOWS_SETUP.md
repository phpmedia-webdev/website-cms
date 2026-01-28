# Supabase CLI on Windows (Scoop)

Simple setup for installing the Supabase CLI on Windows using Scoop. Use this when setting up a new dev machine (e.g. desktop) or when the CLI is not yet installed.

**Why this method:** Supabase no longer supports `npm install -g supabase`. Scoop is a lightweight Windows package manager that installs the official Supabase CLI binary and keeps it on your PATH for all projects.

---

## Prerequisites

- Windows 10/11
- PowerShell (built-in)

---

## Step 1: Set execution policy (one-time per machine)

Open **PowerShell** (no need to run as Administrator). Run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

This allows local scripts to run; required for Scoop’s installer.

---

## Step 2: Install Scoop

In the same PowerShell window:

```powershell
irm get.scoop.sh | iex
```

When it finishes, you should see: **Scoop was installed successfully!**  
Scoop installs to `~\scoop` and adds `~\scoop\shims` to your user PATH.

---

## Step 3: Add Supabase bucket and install CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Scoop may install a dependency (e.g. 7-Zip) first, then the Supabase CLI.  
If you see a warning like *Multiple buckets contain manifest 'supabase'*, the default choice (e.g. `main/supabase`) is fine—continue.

---

## Step 4: Verify

Open a **new** PowerShell window (so PATH is refreshed), then run:

```powershell
supabase --version
```

You should see a version number (e.g. `2.72.7`). The CLI is now available in any directory for all projects.

---

## Using the CLI in this project

1. Go to the project root:
   ```powershell
   cd C:\Users\ray\WEB_DEV_PROJECTS\website-cms
   ```
2. **Remote (hosted Supabase):** link once, then push migrations:
   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
   Get `YOUR_PROJECT_REF` from the Supabase dashboard (Project Settings → General, or from the project URL).
3. **Local:** start Supabase and apply migrations:
   ```powershell
   supabase start
   supabase db reset
   ```

---

## Updating Supabase CLI later

```powershell
scoop update supabase
```

---

## Cursor / VS Code terminal doesn’t see `supabase`

Cursor (and VS Code) inherit PATH from when the app **was started**. If you installed Scoop/supabase while Cursor was open, the integrated terminal still has the old PATH.

**Fix (recommended):**

1. **Add Scoop shims to your User PATH** (so every app sees it after restart):
   - Press **Win + R**, type `sysdm.cpl`, Enter → **Advanced** tab → **Environment Variables**.
   - Under **User variables**, select **Path** → **Edit** → **New** → add:
     ```text
     C:\Users\YourUsername\scoop\shims
     ```
     (Replace `YourUsername` with your Windows username, e.g. `ray`.)
   - OK through all dialogs.
2. **Fully quit Cursor** (File → Exit or close the window), then open Cursor again.
3. In the project, open a **new** integrated terminal (Terminal → New Terminal) and run:
   ```powershell
   supabase --version
   ```
   You should see the version. Then `supabase db push` and other commands will work in that terminal for any project.

**If you don’t want to edit System PATH:**  
Use an **external** PowerShell window (outside Cursor) for `supabase` commands; that window gets the updated PATH when you open it.

---

## Troubleshooting

- **`scoop` not recognized after install:** Close PowerShell and open a new window so PATH (including `~\scoop\shims`) is loaded.
- **`supabase` not recognized:** Same as above; or run `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")` in the current session, then try again.
- **Cursor terminal still doesn’t see `supabase`:** Ensure `C:\Users\<you>\scoop\shims` is in User PATH (see “Cursor / VS Code terminal” above), then **restart Cursor** (not just the terminal).
- **Execution policy errors:** Ensure you ran Step 1 in PowerShell (CurrentUser scope). Do not use Command Prompt for the Scoop install.

---

## Reference (copy-paste block)

Full sequence for a clean machine:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
irm get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Then open a **new** PowerShell and run:

```powershell
supabase --version
```
