/**
 * Desktop-only premium design tokens.
 * These values are ONLY used when Platform.OS === 'web' && isDesktop.
 * They have ZERO effect on mobile layout or colors.
 */

export const webPremium = {
  /* ── Palette ────────────────────────────────────────────── */
  bg: '#FCFCFD',               // studio-white (not pure white)
  bgSubtle: '#F8F9FA',         // card hover / secondary surface
  border: '#E5E7EB',           // silver stroke
  borderLight: '#F0F1F3',      // very faint divider
  text: '#1A1A2E',             // near-black with a hint of depth
  textMuted: '#6B7280',        // secondary copy
  textTertiary: '#9CA3AF',     // tertiary / metadata
  accent: '#8A5A44',           // keep Olive & Oak teak
  accentSoft: 'rgba(138,90,68,0.08)',
  accentGlow: 'rgba(138,90,68,0.18)',
  white: '#FFFFFF',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.45)',

  /* ── Typography ─────────────────────────────────────────── */
  fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontDisplay: "'Plus Jakarta Sans', 'Inter', sans-serif",
  letterSpacingTight: -0.03,   // em — for headings
  letterSpacingNormal: -0.01,  // em — for body
  letterSpacingWide: 0.08,     // em — for labels / caps

  /* ── Shadows ────────────────────────────────────────────── */
  shadowSoft: '0 10px 50px rgba(0,0,0,0.04)',
  shadowCard: '0 4px 24px rgba(0,0,0,0.03)',
  shadowHover: '0 16px 64px rgba(0,0,0,0.07)',
  shadowGlow: '0 0 0 4px rgba(138,90,68,0.10)',

  /* ── Spacing ────────────────────────────────────────────── */
  sectionPaddingY: 80,         // px — section vertical padding (desktop)
  heroPaddingY: 100,           // px — hero area breathing room
  cardPadding: 20,             // px — internal card padding
  containerMaxWidth: 1140,     // px — max content width on desktop

  /* ── Radii ──────────────────────────────────────────────── */
  radiusSm: 8,
  radiusMd: 14,
  radiusLg: 20,
  radiusXl: 28,

  /* ── Transitions ────────────────────────────────────────── */
  easeExpensive: 'cubic-bezier(0.4, 0, 0.2, 1)',
  durationFast: '180ms',
  durationNormal: '280ms',
  durationSlow: '420ms',
} as const;

/**
 * Inlined Google Fonts URL for Plus Jakarta Sans + Inter.
 * Injected once via <style> in the web-only HomeScreen enhancement.
 */
export const WEB_FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;
