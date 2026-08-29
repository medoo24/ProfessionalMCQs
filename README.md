# QnA Hub

A feature-rich, offline-first MCQ study app with spaced repetition, collections, TV mode, narration, and Firebase cloud sync.

**Live:** [GitHub Pages link here once deployed]

---

## Features

- 📚 **Multiple question banks** — load .txt (TSV) or .json files
- 🧠 **Practice & Exam modes** — timed MCQ practice with scoring
- 🔁 **Spaced Repetition (SM-2)** — smart review scheduling
- 📁 **Collections** — organize questions with smart queries
- 📺 **TV Mode** — auto-advancing fullscreen slideshow
- 🔊 **Narration** — text-to-speech playback
- 🗺️ **Knowledge Map** — visual progress by lesson/tag
- 📊 **Study Reports** — streak heatmap + lesson breakdown
- 📤 **Export** — PDF and DOCX export
- 🌙 **12 Themes** — including 4 animated live themes
- ☁️ **Firebase Sync** — sign in with Google/Email to sync across devices
- 👤 **Anonymous mode** — use without an account (local only)

---

## Quick Start

### Running Locally

> The app requires HTTP (not `file://`). Use one of these:

**VS Code Live Server** (recommended):
1. Install the *Live Server* extension
2. Right-click `index-new.html` → Open with Live Server

**Python:**
```bash
python -m http.server 8080
# Open http://localhost:8080/index-new.html
```

**Node:**
```bash
npx serve .
```

---

## Question Banks

| File | Format | Questions |
|------|--------|-----------|
| `data/Critical-Thinking.txt` | TSV | ~40 |
| `MCQs-main/GIT-Enhanced.json` | JSON | 1,208 |
| `MCQs-main/Psychiatry.json` | JSON | — |

To add a new bank → see [`data/QUESTION_BANK_GUIDE.md`](data/QUESTION_BANK_GUIDE.md)

To make it selectable in the app → add it to `AVAILABLE_FILES` in [`src/config.js`](src/config.js)

---

## Firebase Setup

See [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) for:
- Enabling Google/Email/Anonymous auth
- Setting up Firestore with security rules
- Deploying to GitHub Pages

---

## Project Structure

```
--main/
├── index.html                 ← Original monolithic app (preserved as backup)
├── index-new.html             ← New modular shell (use this one)
├── src/
│   ├── config.js              ← AVAILABLE_FILES, themes, constants
│   ├── parser.js              ← TSV + JSON question bank parser
│   ├── sm2.js                 ← SuperMemo SM-2 spaced repetition
│   ├── query.js               ← Smart collection query engine
│   ├── storage.js             ← localStorage + Firestore cloud sync
│   ├── firebase.js            ← Firebase init, Auth, sign-in functions
│   ├── styles/
│   │   └── main.css           ← All CSS (12 themes + components)
│   └── components/
│       ├── Icons.jsx
│       ├── ThemePicker.jsx
│       ├── ShortcutsPanel.jsx
│       ├── CollectionsModal.jsx
│       ├── PracticeMode.jsx
│       ├── ReportModal.jsx    ← Also: NoteModal, TagEditModal, StreakHeatmap, QuestionCard
│       ├── NarrationMode.jsx  ← Also: LessonFilterPanel, TagFilterPanel
│       ├── TVMode.jsx         ← KnowledgeMap, TVLauncher, TVPlayer
│       ├── ExamLauncher.jsx
│       ├── App.jsx            ← Main app component
│       └── Auth/
│           ├── LoginPage.jsx  ← Google + Email/Password + Anonymous sign-in
│           └── UserMenu.jsx   ← Header user avatar + sync status
├── data/
│   ├── Critical-Thinking.txt  ← Sample question bank
│   └── QUESTION_BANK_GUIDE.md ← How to create/format question banks
├── MCQs-main/                 ← Previous version + large JSON banks
├── FIREBASE_SETUP.md
├── .gitignore
└── README.md
```

---

## Tech Stack

- **React 18** — via CDN (no build step)
- **Babel Standalone** — JSX compiled in browser
- **Firebase v10** — compat SDK (Auth + Firestore)
- **jsPDF** — PDF export
- **docx.js** — DOCX export

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+F` | Focus search |
| `Ctrl+R` | Open report |
| `Ctrl+K` | Keyboard shortcuts panel |
| `J` / `K` | Navigate cards |
| `Space` | Toggle focused card |
| `F` | Toggle favorite |
| `D` | Toggle done |
| `N` | Open note |

---

## License

MIT — free to use, modify, and deploy.
