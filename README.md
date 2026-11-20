# Baatcheet — Real-Time Messaging

A WhatsApp-inspired 1-on-1 real-time messaging web app built with **pure HTML, CSS, and native ES Module JavaScript** (no TypeScript and **no compile/build step required**), powered by **Firebase Authentication** and **Cloud Firestore**.

## Zero-Compile Direct Hosting (GitHub Pages / Static Hosting)

You can deploy this repository **directly without running `npm install` or `npm run build`**:

1. Push the repository files to GitHub (`main` branch).
2. Open your repository **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`** (or `/docs`), then click **Save**.
5. Your app will go live immediately at `https://<your-github-username>.github.io/<repo-name>/` using:
   - Native `<script type="importmap">` loading official Firebase ESM modules from `gstatic.com`
   - Automatic Tailwind v4 browser runtime fallback when uncompiled
   - `fetch` loading `firebase-applet-config.json` with relative URLs
   - Root `.nojekyll`, `404.html`, and `ads.txt`

*(Optional)* If you prefer CI builds, **Settings → Pages → GitHub Actions** is also configured in `.github/workflows/deploy.yml`.

## Required Firebase Console Step (For GitHub Pages Domain)
1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Authentication → Settings → Authorized domains**.
2. Click **Add domain** and add `<your-github-username>.github.io` so Google Sign-In works on your GitHub Pages URL.
3. Ensure **Email/Password** and **Google** are enabled under **Authentication → Sign-in method**.
