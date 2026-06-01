# ICanSpeakProfessionally

A local-first professional communication rewriter. It turns casual drafts into polished emails, work chat messages, and formal notes without external AI APIs.

## What was changed

- Added a real working rewrite interface.
- Added local intent detection for requests, apologies, payments, follow-ups, complaints, rescheduling, leave, and updates.
- Added local tone generation for polite, formal, concise, assertive, and warm outputs.
- Added subject generation for email mode.
- Added copy and download buttons for generated output.
- Added local rewrite history using browser localStorage.
- Added quick examples, privacy messaging, and a clean app UI.
- Removed fake stats and fake backend claims.
- Removed external font dependencies so the app can run offline after download.
- Removed claims about Clerk, Stripe, Claude AI, PostgreSQL, and external API-based infrastructure.

## Important honesty note

This is a browser-side local rewrite engine, not a large language model. It uses deterministic NLP-style rules, tone templates, and phrase upgrading to generate professional messages. It does not call OpenAI, Claude, Gemini, or any external API.

For a true local LLM later, you can add an optional Ollama or llama.cpp backend on your own machine. That would still avoid cloud APIs, but it would require a local model download and a small local server.

## Run locally

You can open `index.html` directly in a browser.

For a local development server on Windows PowerShell:

```powershell
cd path\to\icanspeakprofessionally-local
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Push to GitHub from Windows

See `PUSH_TO_GITHUB_WINDOWS.md` for exact commands.

## Deploy with GitHub Pages

After pushing to GitHub:

1. Open your repository on GitHub.
2. Go to Settings.
3. Go to Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Select branch `main` and folder `/root`.
6. Save.

## Files

```text
index.html                  Main app page
styles.css                  Full responsive UI styling
app.js                      Local rewrite engine and UI logic
assets/logo.svg             App logo
manifest.webmanifest        PWA metadata
service-worker.js           Optional offline cache when served over http/https
PUSH_TO_GITHUB_WINDOWS.md   Windows terminal push guide
scripts/push-to-github.ps1  Optional PowerShell helper
LICENSE                     MIT license
```

## License

MIT
