# Baatcheet — Real-Time Messaging

A WhatsApp-inspired 1-on-1 real-time messaging web app built with **HTML, CSS (Tailwind), and modular JavaScript** (no TypeScript in app source), powered by **Firebase Authentication** and **Cloud Firestore**.

## Direct GitHub Pages Hosting

This repository is pre-configured with relative asset paths (`base: './'`), `.nojekyll`, `404.html`, hash-based navigation (`#guide`, `#about`, `#privacy`, `#terms`, `#contact`), a ready-to-serve `docs/` build folder, and an automated GitHub Actions workflow.

### Option 1: Instant Branch Hosting (No Build Setup Required)
1. Push this repository to GitHub (make sure `docs/` is included).
2. Open your repository **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/docs`**, then click **Save**.
5. Your site will be live at `https://<your-github-username>.github.io/<repo-name>/`.

### Option 2: Automatic Build via GitHub Actions
1. Push this repository to GitHub on the `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Every push to `main` automatically runs `npm run build` via `.github/workflows/deploy.yml` and publishes `dist/`.

## Required Firebase Console Step (For GitHub Pages Domain)
1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Authentication → Settings → Authorized domains**.
2. Click **Add domain** and add `<your-github-username>.github.io` so Google Sign-In works on your GitHub Pages URL.
3. Ensure **Email/Password** and **Google** are enabled under **Authentication → Sign-in method**.

## Local Development
```bash
npm install
npm run dev
```

To rebuild both `dist/` and `docs/`:
```bash
npm run build
npm run build:docs
```
