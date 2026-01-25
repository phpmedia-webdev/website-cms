# Media Library Refactoring Plan

**Date:** 2026-01-24  
**Status:** Ready for Implementation  
**Priority:** CRITICAL

---

## Overview

This document outlines the refactoring plan to resolve database recursion issues and improve the media library implementation based on the comprehensive code review.

---

## Current Status

✅ **Emergency Fix Applied:** Migration 037 resolved the immediate recursion issue  
✅ **Documentation Updated:** prd-technical.md includes search_path requirements  
✅ **Code Review Complete:** All issues identified and documented  
✅ **Refactoring Migration Created:** Migration 038 ready for deployment  

---

## Issues Identified

### Critical Issues
1. ❌ **4 migrations have wrong search_path pattern** (028, 031, 034, 036)
2. ❌ **Migration 031 directly caused the recursion error**
3. ⚠️ **TypeScript code uses inconsistent patterns** (RPC vs direct access)

### Medium Priority Issues
1. ⚠️ **Missing RPC functions** (stats, search)
2. ⚠️ **Client-side search is inefficient**
3. ⚠️ **Error messages lack schema context**

---

## Implementation Steps

### Step 1: Deploy Migration 038 (CRITICAL)

**Action:** Run migration `038_fix_all_media_rpc_functions.sql` in production

**What it does:**
- Consolidates all media RPC functions with correct search_path
- Adds new functions: `search_media()`, `get_media_stats()`
- Ensures all functions follow the correct pattern
- Prevents future recursion issues

**Commands:**
```sql
-- Run in Supabase SQL Editor
-- Copy contents of: supabase/migrations/038_fix_all_media_rpc_functions.sql
```

**Verification:**
```sql
-- Test that functions work correctly
SELECT * FROM public.get_media_with_variants() LIMIT 1;
SELECT * FROM public.get_media_by_id('some-uuid');
SELECT * FROM public.search_media('test');
SELECT * FROM public.get_media_stats();
```

**Expected Result:** All queries return data without errors

---

### Step 2: Archive Problematic Migrations

**Action:** Move migrations 028, 031, 034, 036 to archive folder

**Rationale:**
- These migrations have the wrong search_path pattern
- Migration 038 replaces all of them
- Keeping them in active migrations could cause confusion

**Commands:**
```bash
# Move to archive (run manually)
mv supabase/migrations/028_create_media_rpc.sql supabase/migrations/archive/
mv supabase/migrations/031_fix_media_rpc_variants_null.sql supabase/migrations/archive/
mv supabase/migrations/034_create_media_rpc_in_custom_schema.sql supabase/migrations/archive/
mv supabase/migrations/036_fix_media_rpc_custom_schema.sql supabase/migrations/archive/
```

**Note:** Migration 037 (emergency fix) can also be archived since 038 replaces it.

---

### Step 3: Update TypeScript Code

**File:** `src/lib/supabase/media.ts`

#### 3.1 Update getMediaStats() to use RPC

**Current (Lines 134-168):**
```typescript
export async function getMediaStats(): Promise<{ totalCount: number; totalSizeBytes: number }> {
  const { count } = await supabase.from('media').select('*', { count: 'exact', head: true });
  // ... direct table access
}
```

**Updated:**
```typescript
export async function getMediaStats(): Promise<{ totalCount: number; totalSizeBytes: number }> {
  try {
    const supabase = createRpcClient();
    const { data, error } = await supabase.rpc('get_media_stats').single();

    if (error) {
      console.error('Error fetching media stats:', error);
      throw error;
    }

    return {
      totalCount: data?.total_count || 0,
      totalSizeBytes: data?.total_size_bytes || 0,
    };
  } catch (error) {
    console.error('Exception in getMediaStats:', error);
    throw error;
  }
}
```

#### 3.2 Update searchMedia() to use RPC

**Current (Lines 321-338):**
```typescript
export async function searchMedia(query: string): Promise<MediaWithVariants[]> {
  const allMedia = await getMediaWithVariants();  // Fetches ALL
  // ... client-side filtering
}
```

**Updated:**
```typescript
export async function searchMedia(query: string): Promise<MediaWithVariants[]> {
  try {
    const supabase = createRpcClient();
    const { data, error } = await supabase.rpc('search_media', {
      search_query: query,
    });

    if (error) {
      console.error('Error searching media:', error);
      throw error;
    }

    return (data || []).map((item) => ({
      id: item.media_id,
      name: item.name,
      // ... transform to MediaWithVariants
    }));
  } catch (error) {
    console.error('Exception in searchMedia:', error);
    throw error;
  }
}
```

#### 3.3 Add Schema Context to Error Messages

**Update error logging to include schema:**
```typescript
const schema = getClientSchema();
console.error(`Error fetching media [schema: ${schema}]:`, error);
```

---

### Step 4: Testing

#### 4.1 Function Resolution Test

**Test that functions resolve correctly:**
```sql
-- Should call public function, not custom schema function
SELECT * FROM public.get_media_with_variants() LIMIT 1;
```

**Expected:** Returns data without recursion

#### 4.2 Recursion Prevention Test

**Test with custom schema wrapper:**
```sql
-- Should call public function through wrapper
SELECT * FROM website_cms_template_dev.get_media_with_variants() LIMIT 1;
```

**Expected:** Returns data without recursion

#### 4.3 Performance Test

**Test search function:**
```sql
-- Test server-side search
SELECT * FROM public.search_media('test') LIMIT 10;
```

**Expected:** Returns filtered results quickly

#### 4.4 Integration Test

**Test from TypeScript:**
```typescript
// Test all functions from application code
await getMediaWithVariants();
await getMediaById('some-id');
await searchMedia('test');
await getMediaStats();
```

**Expected:** All functions work without errors

---

### Step 5: Documentation Updates

#### 5.1 Update Migration Documentation

**Add note to migration 038:**
- Explain it consolidates previous migrations
- Document the correct search_path pattern
- Include testing instructions

#### 5.2 Create RPC Function Template

**Create:** `docs/templates/RPC_FUNCTION_TEMPLATE.sql`

**Include:**
- Standard function structure
- Correct search_path pattern
- Security best practices
- Testing guidelines

#### 5.3 Update Development Guidelines

**Update:** `docs/prd-technical.md`

**Add:**
- RPC function creation checklist
- Code review requirements
- Testing requirements

---

## Rollback Plan

If migration 038 causes issues:

1. **Immediate Rollback:**
   ```sql
   -- Re-run migration 037 (emergency fix)
   -- Copy contents of: supabase/migrations/037_emergency_fix_recursion.sql
   ```

2. **Investigation:**
   - Check error logs
   - Verify function permissions
   - Test function resolution

3. **Fix and Redeploy:**
   - Fix issues in migration 038
   - Test thoroughly
   - Redeploy

---

## Success Criteria

✅ All media RPC functions use correct search_path  
✅ No recursion errors possible  
✅ All functions tested and working  
✅ TypeScript code uses consistent RPC pattern  
✅ Performance improved (server-side search)  
✅ Documentation updated  
✅ Team trained on correct pattern  

---

## Timeline

**Week 1:**
- ✅ Code review complete
- ✅ Migration 038 created
- ⏳ Deploy migration 038
- ⏳ Archive old migrations

**Week 2:**
- ⏳ Update TypeScript code
- ⏳ Testing and verification
- ⏳ Documentation updates

**Week 3:**
- ⏳ Performance testing
- ⏳ Team training
- ⏳ Final review

---

## Risk Assessment

**Current Risk:** LOW (after migration 038)

**Mitigation:**
- ✅ Emergency fix (037) is working
- ✅ Migration 038 follows correct pattern
- ✅ Comprehensive testing planned
- ✅ Rollback plan in place

---

## Next Steps

1. **Review migration 038** with team
2. **Schedule deployment** window
3. **Deploy migration 038** in production
4. **Verify functions** work correctly
5. **Update TypeScript code**
6. **Run comprehensive tests**
7. **Archive old migrations**
8. **Update documentation**

---

## Questions or Concerns?

If you have questions about this refactoring plan, please:
1. Review the code review document: `CODE_REVIEW_MEDIA_LIBRARY.md`
2. Check the technical documentation: `prd-technical.md`
3. Review migration 038: `supabase/migrations/038_fix_all_media_rpc_functions.sql`

---

**Status:** Ready for implementation  
**Approval Required:** Yes  
**Estimated Time:** 2-3 days for full implementation
