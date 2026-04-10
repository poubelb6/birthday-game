/**
 * DESIGN TOKENS — Birthday Game
 * Source unique de vérité pour toutes les valeurs de design.
 * Modifier ici = appliqué partout dans l'app.
 */

// ─── COULEURS ────────────────────────────────────────────────────────────────
export const colors = {
  // Couleurs primaires
  primary:       '#FF4B4B',  // Rouge principal — CTAs, accents
  primaryDark:   '#CC2E2E',  // Ombre 3D sur boutons rouges
  primaryLight:  'rgba(255, 75, 75, 0.08)', // Fond teinté rouge (badges XP, etc.)

  // Succès / gamification
  success:       '#58CC02',  // Vert Duolingo — cartes débloquées, succès
  successDark:   '#46A302',

  // Dorés — éléments Légendaires
  gold:          '#D4A017',
  goldLight:     '#FFD700',

  // Raretés de cartes
  rarity: {
    common:      '#1f2937',  // border slate-800
    rare:        '#1A6FC4',
    epic:        '#7B2FBE',
    legendary:   '#D4A017',
  },

  // Neutres
  bg:            '#f1f5f9',  // Fond général (slate-100)
  surface:       '#ffffff',  // Cartes, modales
  border:        '#e2e8f0',  // Séparateurs doux (slate-200)
  borderStrong:  '#0f172a',  // Bordures neo-brutal (slate-900)

  // Texte — tous conformes WCAG AA sur fond blanc
  textPrimary:   '#0f172a',  // slate-900 — titres
  textSecondary: '#475569',  // slate-600 — sous-titres (ratio 5.9:1 ✅)
  textMuted:     '#64748b',  // slate-500 — labels secondaires (ratio 4.6:1 ✅)
  textDisabled:  '#94a3b8',  // slate-400 — uniquement sur grands éléments non-texte

  // Notifications
  notifBg:       '#FEFCE8',  // Jaune clair — cloche
  notifIcon:     '#A16207',  // Ambre — icône cloche
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────
export const radius = {
  sm:     '8px',    // Badges, tags
  md:     '12px',   // Boutons secondaires
  lg:     '16px',   // Cartes de contenu
  xl:     '20px',   // Modales, cartes principales
  xxl:    '24px',   // Grandes modales
  pill:   '9999px', // Pills, badges ronds
} as const;

// ─── OMBRES ──────────────────────────────────────────────────────────────────
export const shadows = {
  card:       '0 2px 8px rgba(0,0,0,0.06)',
  cardHover:  '0 4px 16px rgba(0,0,0,0.10)',
  modal:      '0 20px 60px rgba(0,0,0,0.15)',
  btn3d:      '0 4px 0 #CC2E2E',   // Effet 3D bouton rouge
  btn3dGreen: '0 4px 0 #46A302',   // Effet 3D bouton vert
  btnGold:    '0 4px 0 #A67C00',   // Effet 3D bouton doré
} as const;

// ─── TYPOGRAPHIE ─────────────────────────────────────────────────────────────
export const fonts = {
  body:   "'Outfit', sans-serif",
  gaming: "'Press Start 2P', monospace", // Uniquement pour XP, niveaux, scores
} as const;

// Tailles minimales Press Start 2P (illisible en dessous)
export const gamingFontSizes = {
  min: '11px', // Minimum absolu — filtres, labels
  sm:  '12px', // Labels XP header
  md:  '13px', // Scores, badges XP
  lg:  '16px', // Titres de section gaming
} as const;

// ─── ANIMATIONS ──────────────────────────────────────────────────────────────
export const transitions = {
  fast:         { duration: 0.15 },
  normal:       { duration: 0.25 },
  slow:         { duration: 0.4 },
  spring:       { type: 'spring' as const, stiffness: 400, damping: 28 },
  springGentle: { type: 'spring' as const, stiffness: 260, damping: 22 },
} as const;

// ─── ESPACEMENTS CLÉS ────────────────────────────────────────────────────────
export const spacing = {
  headerHeight: '72px', // Hauteur header fixe
  navHeight:    '80px', // Hauteur bottom nav
  pagePadding:  '16px', // Padding horizontal des pages
} as const;
