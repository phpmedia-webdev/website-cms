# MFA Setup Guide

## Prerequisites: Enable MFA in Supabase

Before you can use 2FA in the application, you **must enable MFA in your Supabase project**:

### Steps to Enable MFA in Supabase:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: Authentication → Settings → Multi-Factor Authentication
4. **Enable MFA**:
   - Toggle "Enable Multi-Factor Authentication" to ON
   - Select "TOTP" as the factor type
   - Save changes

### Verify MFA is Enabled:

After enabling, you should see:
- MFA settings showing TOTP as available
- No error messages about MFA not being enabled

## Common Issues

### Error: "Unexpected failure, please check server logs"

**Cause**: MFA is not enabled in your Supabase project

**Solution**: 
1. Follow the steps above to enable MFA in Supabase Dashboard
2. Wait a few seconds for the changes to propagate
3. Try enrolling again

### Error: "MFA is not enabled"

**Cause**: MFA feature flag is not enabled in Supabase project settings

**Solution**: 
1. Check Supabase Dashboard → Authentication → Settings
2. Ensure MFA is enabled
3. If you don't see the MFA option, your Supabase plan might not support it
   - MFA is available on all Supabase plans (including free tier)
   - If you still don't see it, contact Supabase support

### Error: "No enrollment data returned"

**Cause**: The enrollment API call succeeded but returned no data

**Solution**:
1. Check browser console (F12) for detailed error messages
2. Verify you're using the correct Supabase client (client-side, not server-side)
3. Check that your user has proper authentication

### Error: "Enrollment response missing factor ID"

**Cause**: Supabase returned data but without the expected structure

**Solution**:
1. Check browser console for the actual response structure
2. Verify Supabase MFA API hasn't changed
3. Check Supabase documentation for current API structure

## Testing After Setup

Once MFA is enabled in Supabase:

1. **Clear browser cache** (optional but recommended)
2. **Navigate to**: http://localhost:3000/admin/mfa/enroll
3. **You should see**:
   - A QR code displayed
   - A secret code for manual entry
   - "Continue" button to proceed with verification

## Browser Console Debugging

If you're still having issues, check the browser console (F12 → Console):

1. Look for error messages starting with "MFA Enrollment Error:"
2. Check the "MFA Enrollment Response:" log to see what data was returned
3. Share the console output for troubleshooting

## Supabase MFA Documentation

For more information, see:
- https://supabase.com/docs/guides/auth/mfa
