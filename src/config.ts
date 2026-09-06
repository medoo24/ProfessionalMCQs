// ═══════════════════════════════════════════════════════
// config.ts — App-wide constants
// To add a new question bank: add the filename to AVAILABLE_FILES
// and place the .txt / .json file in the /data/ folder.
// ═══════════════════════════════════════════════════════

import { Theme } from './types';

// List of question bank files (in /data/ folder).
// Add new filenames here to make them selectable in the app.
export const AVAILABLE_FILES: string[] = [
  "data/GIT-Enhanced.json",
  "data/Cardio-1.json",
  "data/Cardio-2.json",
  "data/Nephro_Academic-1.json",
  "data/Nephro_IM-1.json",
  "data/Nephro_Mixes-1.json",
  "data/Nephro_PED-1.json",
  "data/Nephro_Sur-1.json",
  "data/Nephrology_PRO_527_MCQs.json",
  "data/CardioThoracic_Organized_26_Topics_CONTENT_ONLY.json",
  "data/Cardiology_pulmonology_424_mcqs.json",
  "data/CardioPeds_mcqs_134.json",
  "data/Psychiatry.json",
  "data/Psycho.json"
];

// localStorage key prefix — change this only if you want a fresh slate
export const SK = "qna4_";

// ── Themes ──────────────────────────────────────────────
export const THEMES: Theme[] = [
  // Static Themes
  { id: 'dark',       label: '🌑 Dark',           icon: '🌑' },
  { id: 'light',      label: '☀️ Light',          icon: '☀️' },
  { id: 'sepia',      label: '📜 Sepia',          icon: '📜' },
  { id: 'forest',     label: '🌿 Forest',         icon: '🌿' },
  { id: 'ocean',      label: '🌊 Ocean',          icon: '🌊' },
  { id: 'rose',       label: '🌸 Rose',           icon: '🌸' },
  { id: 'slate',      label: '🪨 Slate',          icon: '🪨' },
  { id: 'amber',      label: '🟡 Amber',          icon: '🟡' },

  // Live Animated Cinematic & Flow Themes
  { id: 'mariana',    label: '🌊 Mariana Abyss',  icon: '🌊', live: true },
  { id: 'sunset',     label: '🌅 Sunset Horizon', icon: '🌅', live: true },
  { id: 'emerald',    label: '🌲 Mystic Canopy',  icon: '🌲', live: true },
  { id: 'cyberstorm', label: '⚡ Cyber Storm',    icon: '⚡', live: true },
  { id: 'sakura',     label: '🌸 Sakura Twilight',icon: '🌸', live: true },
  { id: 'ember',      label: '☕ Warm Hearth',    icon: '☕', live: true },
  { id: 'aurora',     label: '🌌 Aurora Borealis',icon: '🌌', live: true },
  { id: 'synthwave',  label: '🌆 Synthwave Glow', icon: '🌆', live: true },
  { id: 'galaxy',     label: '🔮 Cosmic Nebula',  icon: '🔮', live: true },
  { id: 'candy',      label: '🍬 Pastel Aura',    icon: '🍬', live: true },
];

// CSS gradient previews for live themes (used in ThemePicker swatch)
export const LIVE_PREVIEW: Record<string, string> = {
  mariana:    'linear-gradient(135deg,#020b18,#002838,#00d2ff,#051428)',
  sunset:     'linear-gradient(135deg,#120514,#2d120a,#f97316,#260d2b)',
  emerald:    'linear-gradient(135deg,#041209,#0d2617,#10b981,#081c10)',
  cyberstorm: 'linear-gradient(135deg,#060612,#181b3b,#00f0ff,#b026ff)',
  sakura:     'linear-gradient(135deg,#120713,#261229,#f472b6,#301734)',
  ember:      'linear-gradient(135deg,#120703,#30160b,#f97316,#261108)',
  aurora:     'linear-gradient(135deg,#012a0f,#0a0028,#001a30,#013020)',
  synthwave:  'linear-gradient(160deg,#0d0015,#1a0035,#200010,#f000ff)',
  galaxy:     'linear-gradient(135deg,#04010f,#0a0030,#a78bfa,#04010f)',
  candy:      'linear-gradient(135deg,#1a0028,#28001a,#ff6edb,#0a0028)',
};

// Background color previews for static themes
export const STATIC_PREVIEW: Record<string, string> = {
  dark: '#0d0f14', light: '#f0f2f7', sepia: '#f5edd8', forest: '#0f1a12',
  ocean: '#040d1a', rose: '#1a0a0f', slate: '#f8fafc', amber: '#1c1400',
};

// Color palette for auto-generated system collections
export const PALETTE: string[] = [
  '#5b8dee','#3ecf8e','#f5a623','#f06058','#a78bfa','#38bdf8','#fbbf24',
  '#34d399','#f472b6','#60a5fa','#4ade80','#fb923c','#e879f9','#22d3ee',
  '#a3e635','#facc15','#f87171','#c084fc','#818cf8','#2dd4bf'
];
