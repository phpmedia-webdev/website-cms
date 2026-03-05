# Encryption key for SMTP / credentials (archived)

**Content merged into:** `docs/tenant-site-setup-checklist.md` (Step 5: Configure environment variables → SMTP / credentials encryption).

Use this in `.env.local` (or your env) so the app can encrypt and decrypt the SMTP password stored in tenant settings.

## Variable name

Use **either** of these (the code checks both):

- `SMTP_ENCRYPTION_KEY`
- `CREDENTIALS_ENCRYPTION_KEY`

## Copy/paste template

Add one line to your `.env.local` (paste the line below and replace the value):

```
SMTP_ENCRYPTION_KEY=REPLACE_WITH_32_OR_MORE_CHAR_SECRET
```

Or with comment:

```
# SMTP password encryption (required to save SMTP config). Do not commit the real value.
SMTP_ENCRYPTION_KEY=REPLACE_WITH_32_OR_MORE_CHAR_SECRET
```

Replace `REPLACE_WITH_YOUR_SECRET` with either:

1. **Random key (recommended)** — 32+ characters. Generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Example result (64 chars): `a1b2c3d4e5f6...` — paste that as the value.

2. **Passphrase** — Any long, secret string. If shorter than 32 bytes, the app hashes it with SHA-256 to derive the key.

## Example (fake value)

```
SMTP_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

Keep this key secret and consistent: changing it will make existing encrypted SMTP passwords unreadable.

## Troubleshooting

If you see **"Encryption not configured"** or **"SMTP_ENCRYPTION_KEY must be set"**:

1. **Restart the dev server** — Next.js loads `.env.local` only at startup. After adding or changing `SMTP_ENCRYPTION_KEY`, stop the server (Ctrl+C) and run `pnpm run dev` again.
2. **No space around `=`** — Use `SMTP_ENCRYPTION_KEY=Passphrase` not `SMTP_ENCRYPTION_KEY = Passphrase`.
3. **Non-empty value** — The value must not be empty. For example: `SMTP_ENCRYPTION_KEY=Passphrase` or `SMTP_ENCRYPTION_KEY=myLongSecretString`.
4. **File and name** — The file must be `.env.local` in the project root, and the variable name must be exactly `SMTP_ENCRYPTION_KEY` or `CREDENTIALS_ENCRYPTION_KEY`.
