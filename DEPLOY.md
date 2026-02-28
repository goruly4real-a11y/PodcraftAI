# Deployment Guide

This application is configured to be "Static-Ready", meaning it can be hosted on GitHub Pages, Vercel, or Netlify without a backend server.

## 1. Build the Application

Run the build command to generate the static files:

```bash
npm run build
```

This will create a `dist` folder containing your website.

## 2. Deploy to GitHub Pages

### Option A: Manual Upload (Easiest)
1. Create a new repository on GitHub.
2. Upload the contents of the `dist` folder to the repository (or a `gh-pages` branch).
3. Go to **Settings > Pages**.
4. Select the branch where you uploaded the files.
5. Save.

### Option B: Using `gh-pages` package (Recommended for Developers)
1. Install the package:
   ```bash
   npm install gh-pages --save-dev
   ```
2. Add this script to `package.json`:
   ```json
   "scripts": {
     "deploy": "gh-pages -d dist"
   }
   ```
3. Run `npm run deploy`.

## 3. Important Notes for Static Hosting

- **Backend Features:** The PDF extraction feature relies on a server. In this static version, it will gracefully fail and ask you to copy-paste text instead.
- **Data Persistence:** Custom speakers are saved to your browser's `localStorage` since there is no database.
- **API Keys:** You must provide your Gemini API key. In a production environment, you should restrict your API key in Google AI Studio to your specific domain (e.g., `yourname.github.io`) to prevent misuse.

## 4. Environment Variables

If using Vercel or Netlify, add your `GEMINI_API_KEY` in the project settings.
For GitHub Pages, you might need to bake it into the build (not recommended for public repos) or use a proxy. 

**Security Warning:** If you deploy this to a public GitHub repository, **DO NOT** commit your `.env` file.
