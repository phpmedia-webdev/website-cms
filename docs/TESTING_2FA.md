# 2FA Testing Guide

## Prerequisites

1. **Dev server running**: `pnpm run dev` (should be running on http://localhost:3000)
2. **Authenticator app installed**: 
   - Google Authenticator (iOS/Android)
   - Authy (iOS/Android)
   - Microsoft Authenticator (iOS/Android)
   - Any TOTP-compatible authenticator app

3. **User account**: You should have a superadmin or admin account with proper metadata

## Testing Steps

### Test 1: MFA Enrollment Flow

1. **Navigate to enrollment page**:
   - Go to http://localhost:3000/admin/login
   - Log in with your credentials
   - If you don't have any enrolled factors, you should be redirected to `/admin/mfa/enroll`
   - OR manually navigate to: http://localhost:3000/admin/mfa/enroll

2. **Enroll a new authenticator**:
   - You should see a QR code displayed
   - Open your authenticator app
   - Scan the QR code (or manually enter the secret if provided)
   - Click "Continue" button
   - Enter the 6-digit code from your authenticator app
   - Click "Verify & Enable"

3. **Expected result**:
   - Success message displayed
   - Redirected to dashboard after 2 seconds
   - Authenticator is now enrolled

### Test 2: MFA Challenge Flow (After Enrollment)

1. **Trigger a challenge**:
   - Log out: Click logout in the sidebar
   - Log back in: http://localhost:3000/admin/login
   - After successful login, if accessing a protected route (like `/admin/super/*`), middleware should redirect to `/admin/mfa/challenge`

2. **Complete the challenge**:
   - You should see the challenge page with a code input field
   - Enter the 6-digit code from your authenticator app
   - Click "Verify & Continue"

3. **Expected result**:
   - Session upgraded to AAL2
   - Redirected to intended destination
   - Can now access protected routes

### Test 3: MFA Management UI

1. **Navigate to security settings**:
   - Go to: http://localhost:3000/admin/settings/security
   - OR navigate via Settings → Security (if link exists)

2. **View enrolled factors**:
   - You should see your enrolled authenticator listed
   - Should show friendly name and enrollment date

3. **Test adding another factor**:
   - Click "Add Another Authenticator" button
   - Should redirect to enrollment page
   - Enroll a second authenticator (for backup)

4. **Test removing a factor**:
   - Click "Remove" button on one of the factors
   - Confirm the removal
   - Factor should be removed from the list
   - **Note**: You cannot remove the last factor (safety check)

### Test 4: Middleware Protection

1. **Test superadmin route protection**:
   - Ensure you're logged in but haven't completed 2FA challenge
   - Try to access: http://localhost:3000/admin/super
   - Should be redirected to `/admin/mfa/challenge`

2. **Test after completing challenge**:
   - Complete the MFA challenge
   - Try accessing `/admin/super` again
   - Should now have access

### Test 5: Login Flow Integration

1. **Test first-time enrollment**:
   - If you have no enrolled factors and you're a superadmin
   - After login, should be redirected to `/admin/mfa/enroll`
   - Complete enrollment
   - Should then be able to access dashboard

2. **Test with existing factors**:
   - If you have enrolled factors
   - After login, middleware will check AAL
   - If accessing protected route, will redirect to challenge
   - Complete challenge to access

## Troubleshooting

### Issue: "No enrollment data returned"
- **Cause**: Supabase MFA might not be enabled in your project
- **Fix**: Check Supabase Dashboard → Authentication → MFA settings

### Issue: "Invalid verification code"
- **Cause**: Code might be expired (30-second window) or device time is out of sync
- **Fix**: 
  - Make sure device time is synchronized
  - Try entering a fresh code
  - Wait for the next code cycle

### Issue: "Failed to create challenge"
- **Cause**: Factor might not be verified yet
- **Fix**: Make sure you completed the enrollment verification step

### Issue: Redirect loop
- **Cause**: Middleware might be checking AAL incorrectly
- **Fix**: Check if `NEXT_PUBLIC_DEV_BYPASS_2FA=true` is set in `.env.local` (this bypasses 2FA in dev mode)

## Dev Mode Bypass

If you want to bypass 2FA during development:

1. Add to `.env.local`:
   ```
   NEXT_PUBLIC_DEV_BYPASS_2FA=true
   ```

2. Restart dev server

**Note**: Authentication is still required - only 2FA is bypassed. This is for development only.

## Expected Console Output

When testing, you might see:
- Enrollment success messages
- Challenge creation logs
- Verification success messages
- Any errors will be displayed in the UI

## Next Steps After Testing

Once 2FA is working:
1. Test with multiple factors (backup authenticators)
2. Test removing factors
3. Test edge cases (expired codes, wrong codes)
4. Verify middleware protection on all protected routes
