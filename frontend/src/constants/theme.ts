export const COLORS = {
  // Primary colors
  background: '#0a0a1a',
  surface: '#12122a',
  surfaceLight: '#1a1a3a',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#606070',
  
  // Suit colors (The Strata System)
  hearts: '#E0115F',    // Ruby Red - Represents Heat
  spades: '#00FFFF',    // Electric Blue - Represents Atmosphere
  diamonds: '#FFD700',  // Golden Yellow - Represents Wealth
  clubs: '#228B22',     // Forest Green - Represents Life
  
  // UI colors
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // Game elements
  cardBorder: '#2a2a4a',
  highlight: '#ffd700',
  disabled: '#404060',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const CARD_DIMENSIONS = {
  width: 70,
  height: 100,
  borderWidth: 3,
  borderRadius: 8,
};

export const RANK_LABELS: Record<string, string> = {
  'K': 'Deep Space',
  'Q': 'Orbit',
  'J': '20km',
  '10': '10km',
  '9': '1km',
  '8': '100m',
  '7': 'Surface',
  '6': '-10m',
  '5': '-1km',
  '4': '-5km',
  '3': 'Mantle',
  '2': 'Outer Core',
  'A': 'Center of Earth',
};

export const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  spades: '♠',
  diamonds: '♦',
  clubs: '♣',
};
