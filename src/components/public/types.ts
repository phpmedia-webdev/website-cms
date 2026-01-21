/**
 * TypeScript interfaces for public components
 * Base types that all public components should follow
 */

/**
 * Base component props
 */
export interface BaseComponentProps {
  className?: string;
  id?: string;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  name: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
}

/**
 * Section component props (for page sections)
 */
export interface SectionProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  content?: string | React.ReactNode;
  background?: "default" | "alt" | "primary" | "secondary";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
}

/**
 * Media component props
 */
export interface MediaProps extends BaseComponentProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}

/**
 * Layout component props
 */
export interface LayoutProps extends BaseComponentProps {
  children: React.ReactNode;
}
