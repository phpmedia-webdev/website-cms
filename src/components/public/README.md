# Public Components

Reusable, themeable components for building public-facing pages.

## Directory Structure

- **`layout/`** - Layout components (Header, Footer, Navigation)
- **`sections/`** - Page sections (Hero, TextBlock, ImageBlock, GalleryBlock, FormBlock)
- **`blocks/`** - Smaller content blocks (Button, Card, Badge, etc.)
- **`content/`** - Content-specific components (PostCard, GalleryCard, etc.)
- **`media/`** - Media display components (Image, Video, Lightbox)

## Design System Integration

All components should:
- Use design system CSS variables (e.g., `var(--color-primary)`, `var(--font-primary)`)
- Be theme-tagged (support theme switching)
- Define structure/layout, inherit colors/fonts from design system
- Be server-first (use `"use client"` only when interactivity is required)

## Component Guidelines

1. **Props-driven**: Accept data via props, not hard-coded values
2. **Themeable**: Use CSS variables for colors and fonts
3. **Accessible**: Semantic HTML, keyboard navigation, ARIA labels
4. **Responsive**: Mobile-first design
5. **Type-safe**: Full TypeScript support
