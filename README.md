# MCU — Watch Tracker

A installable PWA to track your Marvel Cinematic Universe watch history: 38 films (Iron Man → Avengers: Doomsday), release-order timeline, ratings, notes, light/dark mode, and English/German/Russian support.

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `mcu-tracker`).
2. Upload **all files in this folder** to the repo root (keep the folder structure: `icons/`, `assets/`, etc.).
3. In the repo: **Settings → Pages → Source → Deploy from a branch → `main` / root**.
4. Wait ~1 minute, then open the URL GitHub gives you (e.g. `https://yourusername.github.io/mcu-tracker/`).

## Install on iPhone Home Screen

1. Open the GitHub Pages URL in **Safari** (must be Safari, not Chrome, for iOS install).
2. Tap the **Share** button (square with an arrow).
3. Tap **Add to Home Screen**.
4. Open it from your Home Screen — it now runs full-screen like a native app, and works offline.

## Adding real posters (optional)

Drop image files into `assets/posters/` named by film ID, e.g. `assets/posters/1.jpg` for Iron Man (see `data.js` for the id → title mapping). If a file exists, it's shown; otherwise a generated color placeholder card is used automatically. Recommended size: at least 500×750px, JPG or PNG.

## Notes

- All your watch progress, ratings, and notes are stored locally in the browser (`localStorage`) — nothing is sent anywhere.
- Switching devices/browsers starts fresh, since there's no account/server. This is intentional to keep it simple, zero-cost, and fully private.
- Language and theme switch live from the Settings tab.
