/**
 * Theme Constants
 * 
 * Centralized color system and design tokens for Decision Trace.
 * Supports light theme (default) and dark theme via CSS variables.
 */

export const theme = {
  // Colors - Light Theme (default) - Elegant restrained palette
  colors: {
    // Primary accent - dark slate/indigo
    primary: '#475569', // slate-600
    primaryHover: '#334155', // slate-700
    primaryLight: '#f1f5f9', // slate-100
    
    // Neutral backgrounds
    background: '#ffffff',
    backgroundSecondary: '#fafafa', // neutral-50
    backgroundTertiary: '#f5f5f5', // neutral-100
    
    // Text - accessible contrast
    textPrimary: '#171717', // neutral-900
    textSecondary: '#525252', // neutral-600
    textTertiary: '#737373', // neutral-500
    textMuted: '#a3a3a3', // neutral-400
    
    // Borders and dividers - subtle neutral
    border: '#e5e5e5', // neutral-200
    borderLight: '#f5f5f5', // neutral-100
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // Shadows
    shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    shadowMd: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    shadowLg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  
  // Typography
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Font sizes
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2rem',    // 32px
    },
    
    // Font weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Line heights
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  
  // Border radius
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  
  // Transitions
  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },
} as const;

/**
 * Get CSS properties object for React inline styles
 */
export function getThemeStyles() {
  return {
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    transition: theme.transition,
  };
}

/**
 * Convert theme values to CSS custom properties format
 * Used for CSS variables in globals.css
 */
export function getCSSVariables() {
  return {
    '--color-primary': theme.colors.primary,
    '--color-primary-hover': theme.colors.primaryHover,
    '--color-primary-light': theme.colors.primaryLight,
    '--color-background': theme.colors.background,
    '--color-background-secondary': theme.colors.backgroundSecondary,
    '--color-background-tertiary': theme.colors.backgroundTertiary,
    '--color-text-primary': theme.colors.textPrimary,
    '--color-text-secondary': theme.colors.textSecondary,
    '--color-text-tertiary': theme.colors.textTertiary,
    '--color-text-muted': theme.colors.textMuted,
    '--color-border': theme.colors.border,
    '--color-border-light': theme.colors.borderLight,
    '--color-success': theme.colors.success,
    '--color-error': theme.colors.error,
    '--color-warning': theme.colors.warning,
    '--color-info': theme.colors.info,
    '--shadow-sm': theme.colors.shadowSm,
    '--shadow-md': theme.colors.shadowMd,
    '--shadow-lg': theme.colors.shadowLg,
  };
}

