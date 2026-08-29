// ═══════════════════════════════════════════════════════
// config.js — App-wide constants
// To add a new question bank: add the filename to AVAILABLE_FILES
// and place the .txt file in the /data/ folder.
// ═══════════════════════════════════════════════════════

// List of question bank files (in /data/ folder).
// Add new filenames here to make them selectable in the app.
const AVAILABLE_FILES = [
  "data/GIT-Enhanced.json",
  "data/Cardio-1.json",
  "data/Cardio-2.json",
  "data/Psychiatry.json",
  "data/Psycho.json"
];

// localStorage key prefix — change this only if you want a fresh slate
const SK = "qna4_";

// ── Themes ──────────────────────────────────────────────
const THEMES = [
  { id:'dark',      label:'🌑 Dark',      icon:'🌑' },
  { id:'light',     label:'☀️ Light',     icon:'☀️' },
  { id:'sepia',     label:'📜 Sepia',     icon:'📜' },
  { id:'forest',    label:'🌿 Forest',    icon:'🌿' },
  { id:'ocean',     label:'🌊 Ocean',     icon:'🌊' },
  { id:'rose',      label:'🌸 Rose',      icon:'🌸' },
  { id:'slate',     label:'🪨 Slate',     icon:'🪨' },
  { id:'amber',     label:'🟡 Amber',     icon:'🟡' },
  { id:'aurora',    label:'🌌 Aurora',    icon:'🌌', live:true },
  { id:'synthwave', label:'🌆 Synthwave', icon:'🌆', live:true },
  { id:'galaxy',    label:'🔮 Galaxy',    icon:'🔮', live:true },
  { id:'candy',     label:'🍬 Candy',     icon:'🍬', live:true },
];

// CSS gradient previews for live themes (used in ThemePicker swatch)
const LIVE_PREVIEW = {
  aurora:    'linear-gradient(135deg,#012a0f,#0a0028,#001a30)',
  synthwave: 'linear-gradient(160deg,#0d0015,#1a0035,#200010)',
  galaxy:    'linear-gradient(135deg,#04010f,#0a0030,#04010f)',
  candy:     'linear-gradient(135deg,#1a0028,#28001a,#0a0028)',
};

// Background color previews for static themes
const STATIC_PREVIEW = {
  dark:'#0d0f14', light:'#f0f2f7', sepia:'#f5edd8', forest:'#0f1a12',
  ocean:'#040d1a', rose:'#1a0a0f', slate:'#f8fafc', amber:'#1c1400',
};

// Color palette for auto-generated system collections
const PALETTE = [
  '#5b8dee','#3ecf8e','#f5a623','#f06058','#a78bfa','#38bdf8','#fbbf24',
  '#34d399','#f472b6','#60a5fa','#4ade80','#fb923c','#e879f9','#22d3ee',
  '#a3e635','#facc15','#f87171','#c084fc','#818cf8','#2dd4bf'
];
