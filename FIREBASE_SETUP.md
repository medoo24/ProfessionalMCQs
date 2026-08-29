# Firebase Setup Guide

This app uses the **mcqs-on-page** Firebase project (already configured).
You only need to complete the steps below once.

---

## Step 1 — Enable Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com) → **mcqs-on-page**
2. Click **Authentication** in the left sidebar
3. Click **Get started** (if not already enabled)
4. Under **Sign-in method**, enable:
   - ✅ **Google** — click Enable, add your support email
   - ✅ **Email/Password** — click Enable
   - ✅ **Anonymous** — click Enable

---

## Step 2 — Create Firestore Database

1. In Firebase Console → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for now)
4. Select a region (e.g. `europe-west1` if your users are in the Middle East)
5. Click **Done**

---

## Step 3 — Set Firestore Security Rules

After creating the database:

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId}/data/{fileKey} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

---

## Step 4 — Add Authorized Domains (for Google Sign-In)

1. Firebase Console → **Authentication** → **Settings** tab
2. Under **Authorized domains**, add:
   - `localhost` (for local dev — already there)
   - Your GitHub Pages domain: `YOUR_USERNAME.github.io`

---

## Step 5 — Test Locally

> **Important:** The app uses Firebase `<script>` tags (CDN) and requires HTTP — not `file://` protocol.

### Option A — VS Code Live Server (Recommended)
1. Install the **Live Server** extension in VS Code
2. Right-click `index-new.html` → **Open with Live Server**
3. The app opens at `http://127.0.0.1:5500`

### Option B — Python
```bash
cd "d:\my work\ANTI_1\--main"
python -m http.server 8080
# Open http://localhost:8080/index-new.html
```

### Option C — Node.js
```bash
npx serve "d:\my work\ANTI_1\--main"
```

---

## Step 6 — Publish to GitHub Pages

1. Push the project to a GitHub repository:
```bash
cd "d:\my work\ANTI_1\--main"
git init
git add .
git commit -m "Initial commit — QnA Hub v2 with Firebase auth"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

2. On GitHub → repository → **Settings** → **Pages**
3. Source: **Deploy from a branch** → **main** → **/ (root)**
4. After a minute, your app is live at `https://YOUR_USERNAME.github.io/YOUR_REPO/index-new.html`

5. Add the GitHub Pages URL to Firebase authorized domains (Step 4)

---

## Firestore Data Structure

```
users/
  {uid}/
    data/
      {fileKey}/          e.g. "Critical_Thinking"
        perFile:
          favs:           [qId, ...]
          done:           [qId, ...]
          pins:           [qId, ...]
          notes:          { qId: "note text" }
          ctags:          { qId: "custom tag" }
          sr:             { qId: { interval, easeFactor, ... } }
          wrong:          { qId: count }
          collectionSets: [...]
        global:
          theme:          "dark"
          sessions:       [...]
          streak:         5
          tvHistory:      [...]
        fileKey:          "Critical_Thinking"
        updatedAt:        1234567890
```

---

## Pricing

The app uses Firebase **Spark plan (free)**:
- Authentication: **Free** (unlimited)
- Firestore: **Free tier** — 1 GB storage, 50K reads/day, 20K writes/day
- This is more than enough for personal/small-group use

---

## Current Config (already set in `src/firebase.js`)

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyATJTqv2BM1da1PmJCR6KcSVFrTj0skIko",
  authDomain:        "mcqs-on-page.firebaseapp.com",
  projectId:         "mcqs-on-page",
  storageBucket:     "mcqs-on-page.firebasestorage.app",
  messagingSenderId: "150876967793",
  appId:             "1:150876967793:web:5cf7834f790f5f22d15cd0"
};
```
