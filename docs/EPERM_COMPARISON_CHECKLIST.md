# EPERM Issue: Desktop vs Laptop Comparison Checklist

**Purpose:** Compare configurations between desktop (fails) and laptop (works) to identify why tool execution works on one but not the other.

## System Information

### Desktop (Current - Fails)
- **Computer Name:** 2020-PHP-DESKTO
- **Node.js Version:** 22.20.0
- **User Profile:** C:\Users\ray
- **Project Path:** C:\Users\ray\WEB_DEV_PROJECTS\website-cms

### Laptop (Works)
- **Computer Name:** ________________
- **Node.js Version:** ________________
- **User Profile:** ________________
- **Project Path:** ________________

---

## ESET Antivirus Configuration

### Desktop (Fails)
- [ ] ESET Version: ________________
- [ ] Real-time Protection: Enabled / Disabled
- [ ] HIPS Status: Enabled / Disabled
- [ ] Advanced Threat Protection: Enabled / Disabled

**Exclusions in ESET:**
- [ ] Project folder: `C:\Users\ray\WEB_DEV_PROJECTS\website-cms`
- [ ] Node.js folder: `C:\Program Files\nodejs`
- [ ] npm/pnpm folder: `C:\Users\ray\AppData\Roaming\npm`
- [ ] Cursor folder: `C:\Users\ray\AppData\Local\Programs\cursor`
- [ ] Node.exe: `C:\Program Files\nodejs\node.exe`
- [ ] Cursor.exe: `C:\Users\ray\AppData\Local\Programs\cursor\Cursor.exe`

**HIPS Exclusions:**
- [ ] Project folder
- [ ] Node.js folder
- [ ] Cursor folder
- [ ] Node.exe
- [ ] Cursor.exe

### Laptop (Works)
- [ ] ESET Version: ________________
- [ ] Real-time Protection: Enabled / Disabled
- [ ] HIPS Status: Enabled / Disabled
- [ ] Advanced Threat Protection: Enabled / Disabled

**Exclusions in ESET:**
- [ ] Project folder: ________________
- [ ] Node.js folder: ________________
- [ ] npm/pnpm folder: ________________
- [ ] Cursor folder: ________________
- [ ] Node.exe: ________________
- [ ] Cursor.exe: ________________

**HIPS Exclusions:**
- [ ] Project folder
- [ ] Node.js folder
- [ ] Cursor folder
- [ ] Node.exe
- [ ] Cursor.exe

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Windows Defender Configuration

### Desktop (Fails)
- [ ] Windows Defender Status: Active / Inactive
- [ ] Real-time Protection: Enabled / Disabled
- [ ] Controlled Folder Access: Enabled / Disabled

**Exclusions:**
- [ ] Project folder
- [ ] Node.js folder
- [ ] npm/pnpm folder
- [ ] Cursor folder
- [ ] Node.exe
- [ ] Cursor.exe

### Laptop (Works)
- [ ] Windows Defender Status: Active / Inactive
- [ ] Real-time Protection: Enabled / Disabled
- [ ] Controlled Folder Access: Enabled / Disabled

**Exclusions:**
- [ ] Project folder
- [ ] Node.js folder
- [ ] npm/pnpm folder
- [ ] Cursor folder
- [ ] Node.exe
- [ ] Cursor.exe

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Cursor Configuration

### Desktop (Fails)
- [ ] Cursor Version: ________________
- [ ] Installation Path: `C:\Users\ray\AppData\Local\Programs\cursor`
- [ ] Running as Administrator: Yes / No
- [ ] Terminal Type: PowerShell / CMD / Git Bash

**Cursor Settings:**
- [ ] `terminal.integrated.shell.windows`: ________________
- [ ] `terminal.integrated.env.windows`: `NODE_OPTIONS: ""`
- [ ] Any other terminal-related settings: ________________

### Laptop (Works)
- [ ] Cursor Version: ________________
- [ ] Installation Path: ________________
- [ ] Running as Administrator: Yes / No
- [ ] Terminal Type: PowerShell / CMD / Git Bash

**Cursor Settings:**
- [ ] `terminal.integrated.shell.windows`: ________________
- [ ] `terminal.integrated.env.windows`: ________________
- [ ] Any other terminal-related settings: ________________

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Node.js / pnpm Configuration

### Desktop (Fails)
- [ ] Node.js Version: 22.20.0
- [ ] Node.js Path: `C:\Program Files\nodejs`
- [ ] pnpm Version: ________________
- [ ] pnpm Path: ________________
- [ ] npm/pnpm installed globally: Yes / No

### Laptop (Works)
- [ ] Node.js Version: ________________
- [ ] Node.js Path: ________________
- [ ] pnpm Version: ________________
- [ ] pnpm Path: ________________
- [ ] npm/pnpm installed globally: Yes / No

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Windows User Permissions

### Desktop (Fails)
- [ ] User Account Type: Administrator / Standard
- [ ] UAC Level: ________________
- [ ] Group Policy Restrictions: Yes / No
- [ ] Any special security policies: ________________

### Laptop (Works)
- [ ] User Account Type: Administrator / Standard
- [ ] UAC Level: ________________
- [ ] Group Policy Restrictions: Yes / No
- [ ] Any special security policies: ________________

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## PowerShell Execution Policy

### Desktop (Fails)
Run: `Get-ExecutionPolicy -List`
- [ ] MachinePolicy: ________________
- [ ] UserPolicy: ________________
- [ ] Process: ________________
- [ ] CurrentUser: ________________
- [ ] LocalMachine: ________________

### Laptop (Works)
Run: `Get-ExecutionPolicy -List`
- [ ] MachinePolicy: ________________
- [ ] UserPolicy: ________________
- [ ] Process: ________________
- [ ] CurrentUser: ________________
- [ ] LocalMachine: ________________

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Process Spawn Test

### Desktop (Fails)
Run this in Cursor's manual terminal:
```powershell
node -e "const {spawn} = require('child_process'); const proc = spawn('node', ['--version']); proc.stdout.on('data', (d) => console.log(d.toString())); proc.on('error', (e) => console.error('SPAWN ERROR:', e));"
```
- [ ] Result: Works / Fails with EPERM

### Laptop (Works)
Run the same command:
- [ ] Result: Works / Fails with EPERM

**Key Differences:**
- ________________________________________________
- ________________________________________________

---

## Cursor Tool Execution Test

### Desktop (Fails)
- [ ] Tool execution fails with EPERM: Yes / No
- [ ] Manual terminal works: Yes / No

### Laptop (Works)
- [ ] Tool execution works: Yes / No
- [ ] Manual terminal works: Yes / No

---

## Summary of Key Differences

1. **ESET Configuration:**
   - Desktop: ________________________________________________
   - Laptop: ________________________________________________

2. **Windows Defender:**
   - Desktop: ________________________________________________
   - Laptop: ________________________________________________

3. **Cursor Settings:**
   - Desktop: ________________________________________________
   - Laptop: ________________________________________________

4. **Node.js/pnpm:**
   - Desktop: ________________________________________________
   - Laptop: ________________________________________________

5. **Permissions:**
   - Desktop: ________________________________________________
   - Laptop: ________________________________________________

6. **Most Likely Cause:**
   - ________________________________________________
   - ________________________________________________

---

## Next Steps

After completing this comparison, identify the key differences and apply the working configuration from the laptop to the desktop.
