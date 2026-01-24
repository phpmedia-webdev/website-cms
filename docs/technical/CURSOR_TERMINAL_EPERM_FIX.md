# Cursor Terminal EPERM Error Fix

## Problem

When running `pnpm run dev` through Cursor's automated terminal, you get:
```
Error: spawn EPERM
errno: -4048
code: 'EPERM'
syscall: 'spawn'
```

However, running the same command manually in PowerShell works fine.

## Root Cause

Antivirus software (ESET, Windows Defender, etc.) is blocking child process spawning from Node.js when executed through Cursor's automated terminal context. This is a security/permission restriction, not a Next.js or pnpm issue.

**Confirmed:** Even simple Node.js `spawn()` calls fail with EPERM in Cursor's terminal, but work in manual PowerShell.

## Solutions

### Solution 1: ESET Antivirus Exclusions (Recommended for ESET Users)

If you're using **ESET Antivirus** (most common cause):

1. Open **ESET Security** application
2. Go to **Setup** → **Advanced Setup** (or press F5)
3. Navigate to **Protection** → **Real-time file system protection**
4. Click **Exclusions** → **Edit**
5. Add these folders as exclusions:
   - `C:\Users\ray\WEB_DEV_PROJECTS\website-cms` (project folder)
   - `C:\Program Files\nodejs` (Node.js installation)
   - `C:\Users\ray\AppData\Roaming\npm` (npm/pnpm global)
   - `C:\Users\ray\AppData\Local\pnpm` (if exists)

6. Also check **HIPS (Host-based Intrusion Prevention System)**:
   - Go to **Protection** → **HIPS**
   - Click **Exclusions** → **Edit**
   - Add the same folders
   - Or temporarily disable HIPS to test

7. Check **Advanced Threat Protection**:
   - Go to **Protection** → **Advanced Threat Protection**
   - Click **Exclusions**
   - Add the same folders

8. **Add Cursor executable to exclusions:**
   - Find Cursor's installation path (usually `C:\Users\[username]\AppData\Local\Programs\cursor\Cursor.exe`)
   - Add `Cursor.exe` to exclusions (not just folders)
   - This is often needed because ESET blocks processes spawned BY Cursor

9. **Add Node.js executable to exclusions:**
   - Add `C:\Program Files\nodejs\node.exe` as an exclusion
   - This allows Node.js to spawn child processes

10. Restart Cursor and try `pnpm run dev` again

**Note:** ESET's HIPS (Host-based Intrusion Prevention System) is particularly aggressive and often blocks child process spawning. Disabling HIPS temporarily or adding exclusions there usually fixes this. **If folder exclusions don't work, try adding the actual executables (Cursor.exe, node.exe) to exclusions.**

### Solution 1b: Windows Defender Exclusions (CRITICAL - Often Re-enabled After Updates)

**Windows Defender may have been re-enabled after a recent Windows update.** Even if you have ESET, Windows Defender can still be active and blocking.

1. Open **Windows Security** → **Virus & threat protection**
2. Click **Manage settings** under Virus & threat protection settings
3. Scroll to **Exclusions** → Click **Add or remove exclusions**
4. **Add these folders:**
   - `C:\Users\ray\WEB_DEV_PROJECTS\website-cms` (project folder)
   - `C:\Program Files\nodejs` (Node.js installation)
   - `C:\Users\ray\AppData\Roaming\npm` (npm/pnpm global)
   - `C:\Users\ray\AppData\Local\pnpm` (if exists)
   - `C:\Users\ray\AppData\Local\Programs\cursor` (Cursor installation folder)

5. **Also add these processes:**
   - `C:\Program Files\nodejs\node.exe`
   - `C:\Users\ray\AppData\Local\Programs\cursor\Cursor.exe` (or wherever Cursor is installed)

6. **Check Controlled Folder Access:**
   - Windows Security → Virus & threat protection → Manage ransomware protection
   - If enabled, add the project folder to allowed apps

7. Restart Cursor and try `pnpm run dev` again

**Note:** Windows Defender often re-enables itself after Windows updates, even if you have third-party antivirus. Check this regularly.

### Solution 2: Check Cursor Terminal Settings

1. Open Cursor Settings (Ctrl+,)
2. Search for "terminal"
3. Check **Terminal > Integrated** settings
4. Ensure no restrictions on process execution
5. Try setting `terminal.integrated.shell.windows` to explicit PowerShell path

### Solution 3: Run as Administrator (Not Recommended)

- Right-click Cursor → Run as Administrator
- This may bypass restrictions but is a security risk

### Solution 4: Use Manual Terminal (Workaround)

Until fixed, run the dev server manually:
1. Open PowerShell or Command Prompt
2. `cd C:\Users\ray\WEB_DEV_PROJECTS\website-cms`
3. `pnpm run dev`

## Verification

Test if spawn works:
```powershell
node -e "const {spawn} = require('child_process'); const proc = spawn('node', ['--version']); proc.stdout.on('data', (d) => console.log(d.toString())); proc.on('error', (e) => console.error('SPAWN ERROR:', e));"
```

If this fails with EPERM, your antivirus (ESET, Windows Defender, etc.) is likely blocking it.

## Status

- **Issue:** Child process spawning blocked in Cursor's automated terminal (EPERM error)
- **Current Workaround:** Run `pnpm run dev` manually in PowerShell (works fine)
- **Status:** Known limitation - Cursor/Windows security changes prevent automated terminal from spawning child processes
- **Investigation Notes:**
  - ESET disabled → Still fails
  - Windows Defender exclusions attempted → Still fails
  - Node.js runs fine, but `spawn()` fails in Cursor's terminal
  - Works perfectly in manual PowerShell, fails in Cursor's automated terminal
  - **Conclusion:** Likely a Cursor terminal integration issue or Windows security policy that blocks automated process spawning
  - **Resolution:** Use manual PowerShell for `pnpm run dev` until Cursor/Windows fix is available

## Additional Troubleshooting

If ESET exclusions don't work, try:

1. **Check Windows Group Policy:**
   - Run `gpedit.msc` (if available)
   - Check Computer Configuration → Windows Settings → Security Settings → Software Restriction Policies
   - Look for policies blocking process spawning

2. **Check if ESET is truly disabled:**
   - ESET may have kernel-level protection that persists even when "disabled"
   - Check Task Manager for `ekrn.exe` (ESET kernel process)
   - May need to fully uninstall ESET to test

3. **Try running Cursor as Administrator:**
   - Right-click Cursor → Run as Administrator
   - Test if elevated privileges bypass the restriction

4. **Check Windows Defender:**
   - Even with ESET, Windows Defender may be active
   - Add exclusions to Windows Defender as well

5. **Contact Cursor Support:**
   - This may be a Cursor-specific issue with how it spawns terminal processes
   - Cursor may need to update their terminal integration
