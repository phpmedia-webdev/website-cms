# Comprehensive Code Review: Media Library Database Implementation

**Date:** 2026-01-24  
**Reviewer:** Senior Backend Software Architect & Database Specialist  
**Focus:** Database schema, RPC functions, infinite recursion prevention

---

## Executive Summary

This review identified **critical database recursion issues** in the media library implementation caused by incorrect `search_path` ordering in PostgreSQL functions. The emergency fix (migration 037) resolved the immediate issue, but **multiple migrations still contain the problematic pattern** that could cause future recursion errors.

**Status:** ⚠️ **CRITICAL ISSUES FOUND** - Requires immediate refactoring

---

## 1. Root Cause Analysis

### 1.1 The Infinite Recursion Problem

**What Happened:**
- Migration 031 introduced `SET search_path = website_cms_template_dev, public` (custom schema first)
- When `public.get_media_with_variants()` was called, PostgreSQL resolved it to `website_cms_template_dev.get_media_with_variants()` instead
- The custom schema wrapper called `public.get_media_with_variants()` again
- This created infinite recursion: `public` → `custom` → `public` → `custom` → ...
- Result: Stack depth limit exceeded error

**Why It Happened:**
PostgreSQL's function resolution follows `search_path` order. When custom schema is first:
1. Function call `public.get_media_with_variants()` is resolved
2. PostgreSQL searches `website_cms_template_dev` first (from search_path)
3. Finds `website_cms_template_dev.get_media_with_variants()` wrapper
4. Wrapper calls `public.get_media_with_variants()`
5. Cycle repeats infinitely

**The Fix:**
Always put `public` FIRST in `search_path`: `SET search_path = public, website_cms_template_dev`

---

## 2. Migration Analysis

### 2.1 Media Library Migrations - Status Review

| Migration | Status | search_path Order | Risk Level |
|-----------|--------|-------------------|------------|
| **026** - Create tables | ✅ Safe | Session-level (not in function) | None |
| **028** - Create RPC | ❌ **WRONG** | `website_cms_template_dev, public` | **HIGH** |
| **031** - Fix NULL variants | ❌ **WRONG** | `website_cms_template_dev, public` | **CRITICAL** (caused recursion) |
| **034** - Custom schema wrappers | ❌ **WRONG** | `%I, public` (dynamic) | **HIGH** |
| **036** - Fix custom schema | ❌ **WRONG** | `website_cms_template_dev, public` | **HIGH** |
| **037** - Emergency fix | ✅ **CORRECT** | `public, website_cms_template_dev` | None |

### 2.2 Detailed Migration Issues

#### Migration 028 (`028_create_media_rpc.sql`)
**Lines 33, 94:**
```sql
SET search_path = website_cms_template_dev, public  -- ❌ WRONG
```

**Issue:** Functions created with custom schema first in search_path. If custom schema wrappers existed, this would cause recursion.

**Impact:** Medium - Functions work if no custom schema wrappers exist, but dangerous pattern.

---

#### Migration 031 (`031_fix_media_rpc_variants_null.sql`)
**Lines 24, 88:**
```sql
SET search_path = website_cms_template_dev, public  -- ❌ WRONG - CAUSED RECURSION
```

**Issue:** This migration introduced the bug that caused the infinite recursion. After migration 034 created custom schema wrappers, this migration's search_path order caused the recursion.

**Impact:** **CRITICAL** - This directly caused the production recursion error.

---

#### Migration 034 (`034_create_media_rpc_in_custom_schema.sql`)
**Lines 31, 61, 76:**
```sql
SET search_path = %I, public  -- ❌ WRONG (custom schema first)
```

**Issue:** Dynamic SQL creates functions with custom schema first. This creates the wrapper functions that, combined with migration 031's wrong search_path, caused recursion.

**Impact:** High - Creates the wrapper pattern that enables recursion.

**Additional Issue:** Uses `current_schema()` which may not work correctly. Should use explicit schema name or parameter.

---

#### Migration 036 (`036_fix_media_rpc_custom_schema.sql`)
**Lines 6, 28, 56, 69:**
```sql
SET search_path TO website_cms_template_dev, public;  -- ❌ WRONG (session level)
SET search_path = website_cms_template_dev, public   -- ❌ WRONG (function level)
```

**Issue:** Both session-level and function-level search_path have custom schema first. This would cause recursion if migration 037 hadn't fixed it.

**Impact:** High - Would cause recursion if emergency fix wasn't applied.

---

#### Migration 037 (`037_emergency_fix_recursion.sql`)
**Lines 31, 95, 161, 189:**
```sql
SET search_path = public, website_cms_template_dev  -- ✅ CORRECT
```

**Status:** ✅ **CORRECT** - This is the proper pattern. Emergency fix correctly resolved the recursion.

**Note:** This migration should be the template for all future RPC functions.

---

## 3. TypeScript Code Review

### 3.1 Media Library TypeScript (`src/lib/supabase/media.ts`)

**Status:** ✅ **Generally Good** - Code is well-structured, but has some concerns:

#### Strengths:
1. ✅ Proper error handling with detailed messages
2. ✅ Uses RPC functions for reads (correct pattern)
3. ✅ Fallback handling for NULL variants
4. ✅ Clear function documentation

#### Issues Found:

**1. Inconsistent RPC vs Direct Access (Lines 139-151, 178-193)**
```typescript
// Uses .from() for stats and writes
const { count } = await supabase.from('media').select('*', { count: 'exact', head: true });
const { data } = await supabase.from('media').insert({...});
```

**Issue:** Direct table access may fail if PostgREST hasn't cached the schema. Should use RPC functions for consistency.

**Recommendation:** Create RPC functions for:
- `get_media_stats()` - For statistics
- `create_media()` - For inserts (if `.from()` fails)
- `update_media()` - For updates (if `.from()` fails)
- `delete_media()` - For deletes (if `.from()` fails)

**2. Client-Side Search (Lines 321-338)**
```typescript
export async function searchMedia(query: string): Promise<MediaWithVariants[]> {
  const allMedia = await getMediaWithVariants();  // Fetches ALL media
  // Then filters client-side
}
```

**Issue:** Inefficient - fetches all media then filters client-side. For large media libraries, this will be slow.

**Recommendation:** Create `search_media(query TEXT)` RPC function for server-side filtering.

**3. Missing Error Context (Various)**
Some error messages don't include schema context, making debugging harder.

**Recommendation:** Include schema name in error logs for multi-schema environments.

---

## 4. Other RPC Functions Review

### 4.1 Taxonomy Functions (`023_create_taxonomy_rpc.sql`)

**Status:** ✅ **SAFE** - Uses dynamic SQL with `EXECUTE`, which is safer but has different concerns:

**Pattern:**
```sql
CREATE OR REPLACE FUNCTION public.get_taxonomy_terms_dynamic(schema_name text)
-- No SET search_path - uses dynamic SQL with format()
```

**Analysis:**
- ✅ No search_path recursion risk (uses dynamic SQL)
- ⚠️ SQL injection risk if `schema_name` not validated (but uses `%I` format which is safe)
- ✅ More flexible (works with any schema)

**Recommendation:** This pattern is acceptable for dynamic functions, but static functions should use the `public, custom_schema` pattern.

---

### 4.2 Settings Functions (Archived - `archive/008_create_settings_rpc.sql`)

**Status:** ⚠️ **NEEDS REVIEW** - Archived migrations may still be in use.

**Pattern Found:**
```sql
SET search_path = website_cms_template_dev, public  -- ❌ WRONG if still in use
```

**Action Required:** Verify if settings RPC functions are still active and check their search_path.

---

## 5. Refactoring Plan

### Phase 1: Immediate Fixes (Critical)

**Priority: CRITICAL** - Prevent future recursion errors

1. **Create Migration 038: Fix All Media RPC Functions**
   - Consolidate all media RPC functions with correct search_path
   - Remove redundant migrations (028, 031, 034, 036 can be archived)
   - Ensure all functions follow: `SET search_path = public, website_cms_template_dev`

2. **Verify Emergency Fix is Applied**
   - Confirm migration 037 has been run in production
   - Test that recursion no longer occurs

### Phase 2: Code Improvements (High Priority)

**Priority: HIGH** - Improve reliability and performance

1. **Create Missing RPC Functions**
   - `get_media_stats()` - For statistics queries
   - `search_media(query TEXT)` - For server-side search
   - Consider RPC functions for writes if `.from()` fails

2. **Refactor TypeScript Code**
   - Add schema context to error messages
   - Implement server-side search
   - Add retry logic for RPC calls

### Phase 3: Documentation & Standards (Medium Priority)

**Priority: MEDIUM** - Prevent future issues

1. **Create RPC Function Template**
   - Standard template with correct search_path
   - Include recursion prevention comments
   - Add testing guidelines

2. **Update Development Guidelines**
   - Document search_path requirement
   - Add to code review checklist
   - Create migration validation script

### Phase 4: Testing & Validation (Ongoing)

**Priority: ONGOING** - Ensure quality

1. **Create Function Resolution Tests**
   - Test that functions resolve correctly
   - Verify no recursion possible
   - Test with multiple schemas

2. **Performance Testing**
   - Test RPC function performance
   - Compare with direct table access
   - Optimize slow queries

---

## 6. Recommended Migration: 038_fix_all_media_rpc_functions.sql

This migration consolidates and fixes all media RPC functions with the correct pattern:

**Key Features:**
- ✅ Correct search_path: `public, website_cms_template_dev`
- ✅ Consolidates functions from multiple migrations
- ✅ Includes NULL variant handling (from migration 031)
- ✅ Includes both public and custom schema wrappers
- ✅ Proper permissions
- ✅ Comments explaining the pattern

**Implementation:** See separate file `038_fix_all_media_rpc_functions.sql`

---

## 7. Best Practices Going Forward

### 7.1 RPC Function Template

**ALWAYS use this pattern for RPC functions:**

```sql
CREATE OR REPLACE FUNCTION public.your_function_name(...)
RETURNS TABLE(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, website_cms_template_dev  -- ⚠️ CRITICAL: public FIRST
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM website_cms_template_dev.your_table ...
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.your_function_name(...) TO anon, authenticated;
```

### 7.2 Code Review Checklist

Before merging any migration with RPC functions:

- [ ] `search_path` has `public` FIRST
- [ ] Function tested in isolation
- [ ] No circular function dependencies
- [ ] Proper error handling
- [ ] Permissions granted correctly
- [ ] Schema-qualified table names in queries

### 7.3 Testing Requirements

Before deploying RPC functions:

1. **Function Resolution Test:**
   ```sql
   -- Should call public function, not custom schema function
   SELECT * FROM public.get_media_with_variants() LIMIT 1;
   ```

2. **Recursion Prevention Test:**
   - Verify function doesn't call itself
   - Test with custom schema wrapper if exists
   - Monitor for stack depth errors

3. **Performance Test:**
   - Test with realistic data volumes
   - Verify query performance
   - Check for N+1 query issues

---

## 8. Risk Assessment

### Current Risk Level: **MEDIUM-HIGH**

**Active Risks:**
1. ⚠️ Multiple migrations with wrong search_path pattern (028, 031, 034, 036)
2. ⚠️ If migration 037 is rolled back, recursion will return
3. ⚠️ Future migrations may repeat the same mistake

**Mitigation:**
- ✅ Emergency fix (037) is in place and working
- ✅ Documentation updated with correct pattern
- ⚠️ Need migration 038 to consolidate and prevent future issues

---

## 9. Recommendations Summary

### Immediate Actions (This Week)

1. ✅ **DONE:** Emergency fix applied (migration 037)
2. ✅ **DONE:** Documentation updated (prd-technical.md)
3. 🔄 **IN PROGRESS:** Create migration 038 to consolidate functions
4. ⏳ **PENDING:** Review and test all RPC functions
5. ⏳ **PENDING:** Create RPC function template

### Short-Term Actions (This Month)

1. Create missing RPC functions (stats, search)
2. Refactor TypeScript code for consistency
3. Add comprehensive testing
4. Create migration validation script

### Long-Term Actions (Ongoing)

1. Regular code reviews for RPC functions
2. Performance monitoring
3. Documentation maintenance
4. Team training on search_path requirements

---

## 10. Conclusion

The media library database implementation has **critical recursion issues** that were resolved by the emergency fix (migration 037). However, **multiple migrations still contain the problematic pattern** that could cause future issues.

**Key Findings:**
- ✅ Emergency fix is correct and working
- ❌ 4 migrations (028, 031, 034, 036) have wrong search_path pattern
- ⚠️ TypeScript code needs improvements for consistency
- ✅ Architecture pattern (RPC functions) is sound

**Next Steps:**
1. Create migration 038 to consolidate and fix all functions
2. Archive problematic migrations (028, 031, 034, 036)
3. Implement missing RPC functions
4. Add comprehensive testing

**Status:** Ready for refactoring implementation.
