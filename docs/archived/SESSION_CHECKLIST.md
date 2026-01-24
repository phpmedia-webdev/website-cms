# Session Checklist - Immediate Next Steps

Quick reference checklist for today's development session.

## 1. Admin Page Navigation Improvements
- [ ] Add back button at top of sidebar (return to main website without logout)
- [ ] Add logout link at bottom of sidebar
- [ ] Ensure no navigation menu visible on admin pages (sidebar only)

## 2. Design System Settings UI - Color Palette Enhancements
- [ ] Add modal window for reviewing/accepting preset palettes before applying
- [ ] Expand dropdown to ~100 preset options, grouped by themes (pastels, gradients, gray tones)
- [ ] Allow users to customize labels for 15 colors (e.g., "H1 color", "accent color", "hover color")
- [ ] Consider increasing palette size to 20 colors if needed
- [ ] Ensure customized color labels are referenceable in code (CSS variables)

## 3. Design System Settings UI - Font Section Improvements
- [ ] Add font preview samples (text and paragraph examples)
- [ ] Enable H1, H2, H3 style customization with color options linked to palette
- [ ] Ensure users can reference customized color labels in code (e.g., `--color-h1`, `--color-accent`)

## 4. Design System Settings UI - Other
- [ ] Admin dark theme implementation
- [ ] CSS variable integration refinements (if needed)

## 5. Taxonomy System for Media Library and Blog
- [ ] Implement WordPress-like categorization (categories, subcategories, tags)
- [ ] Create taxonomy tables (categories, tags, content_taxonomy relationships)
- [ ] Make taxonomy searchable and filterable on public pages (galleries, blog)
- [ ] Apply taxonomy to media library content and blog posts
- [ ] Build admin UI for managing categories, subcategories, and tags
- [ ] Implement public-facing taxonomy filtering and search

## 6. Media Library - Image Optimization
- [ ] Limit image variants to original + 2 optimized versions
- [ ] Implement threshold warning for oversized images (prevent DB overload)
- [ ] Research best practices for maximum resolution suitable for websites

## 7. Media Library - Video Hosting Research
- [ ] Investigate Supabase object bucket storage for small video files and GIFs
- [ ] Determine if Supabase CDN suitable for video playback vs external hosting (Vimeo, YouTube)
- [ ] Document findings and recommendations

## 8. Media Library - Other
- [ ] Review current media library implementation
- [ ] Plan local copy workflow implementation

## 9. Super Admin Settings
- [ ] Add captcha field to super admin panel
- [ ] Add fields for Google Analytics keys
- [ ] Add visitor tracking configuration
- [ ] Add commenter settings
- [ ] Integrate PHP BME email account for notifications
- [ ] Implement programmable username/password storage for email account

## 10. Color Palette Schema Evolution (Future Consideration)
- [ ] Move to `color01`–`color15` as fixed keys with user-defined labels
- [ ] Store colors as `color01`…`color15`; store labels separately
- [ ] UI displays user-defined label; fallback to "Color 1" etc. when missing
- [ ] Migration: map existing `primary`/`alternate1`–`alternate6` → `color01`–`color15`
- [ ] Update types, DB (settings + `color_palettes`), design-system CSS vars, predefined palettes

---

**Quick Reference:**
- RPC Functions Pattern: See `docs/ADDING_NEW_TABLES_CHECKLIST.md`
- Example RPC: `supabase/migrations/018_create_color_palettes_rpc.sql`
- Example TypeScript: `src/lib/supabase/color-palettes.ts`

**Current State:**
- Color palettes working ✓
- Design System Settings UI functional ✓
- All migrations run (012, 013, 014, 015, 018) ✓
