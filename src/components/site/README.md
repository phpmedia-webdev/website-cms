# Site-Specific Components

Project-specific components that may be promoted to public components later.

## Directory Structure

- **`pages/`** - Page composition components (HomePage, AboutPage, etc.)
- **`config/`** - Site-specific configuration
- **`overrides/`** - Component overrides for specific pages
- **`experiments/`** - Experimental components (test before promoting)

## Promotion Workflow

When a component is ready to be shared:
1. Move from `site/experiments/` to `src/components/public/`
2. Remove client-specific branding/copy
3. Ensure it uses design system CSS variables
4. Make it prop-driven (no hard-coded values)
5. Create PR to template repository
