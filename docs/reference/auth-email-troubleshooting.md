# Auth email troubleshooting (signup confirmation, custom SMTP)

Use this when signup shows "Check your email" but no confirmation email arrives (e.g. with custom SMTP that isn’t fully tested yet).

---

## 1. Supabase Dashboard checks

- **Authentication → Logs**  
  Look for failed auth events or errors when the user signed up. Errors here often point to SMTP or template issues.

- **Authentication → URL Configuration**  
  - **Site URL**: set to your app origin (e.g. `http://localhost:3000` in dev).  
  - **Redirect URLs**: must include your callback, e.g. `http://localhost:3000/auth/callback`.

- **Authentication → Email Templates**  
  Confirm the "Confirm signup" template exists and has a valid link (e.g. `{{ .ConfirmationURL }}`). Syntax errors can prevent sending.

---

## 2. Custom SMTP (Auth → SMTP Settings)

- **Host, port, username, password**  
  Match your provider’s docs (e.g. TLS on port 587, or SSL 465). Wrong port or auth often causes silent failure.

- **Sender address**  
  Use an address that your SMTP provider is allowed to send from (e.g. `noreply@yourdomain.com`). Some providers require the "From" to be a verified domain.

- **Provider limits / logs**  
  After Supabase hands the email to your SMTP server, delivery is up to the provider. Check the provider’s dashboard for bounces, blocks, or rate limits.

- **Spam / corporate filters**  
  Confirmation links and "verify" wording can be filtered. Check spam; for work emails, try a personal address to rule out server-side blocking.

- **iCloud / Apple addresses**  
  Some Apple/iCloud mail setups block or filter auth emails (signup, reset). If confirmation never arrives, try a different provider (e.g. Gmail) to confirm SMTP is working; then check iCloud spam or use another address for testing.

---

## 3. Test without receiving email (dev only)

**Option A: Turn off confirmations in Supabase**

1. **Authentication → Providers → Email**  
2. Disable **"Confirm email"**.  
3. New signups are created and treated as confirmed immediately (no email sent).  
4. Use this only in dev/staging. Re-enable before production.

**Option B: Manually confirm the user in Dashboard**

1. **Authentication → Users**  
2. Find the user by email.  
3. Open the user → set **Email confirmed** to true (or use the option to confirm).  
4. User can then sign in without clicking the link.

**Option C: Resend confirmation email**

On the app login page, use **"Resend confirmation email"** (if shown), enter the same email, and click Resend. Then check Supabase Auth logs again to see if the resend attempt errors.

---

## 4. Checklist summary

- [ ] Auth logs show no errors for the signup/resend.
- [ ] SMTP host, port, user, password, and sender address are correct.
- [ ] Redirect URLs include `.../auth/callback`.
- [ ] Check spam and, if possible, provider delivery logs.
- [ ] For quick dev testing: disable "Confirm email" or manually confirm the user in Dashboard.

---

## References

- [Supabase: Not receiving auth emails](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
