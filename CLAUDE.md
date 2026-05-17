# CLAUDE.md — Bayaan

Guidance for Claude Code when working in this repository.

## Project Overview

**Bayaan** (بيان) is a browser-based audio transcription and translation app that extends the Al-Bayaan Vertalingen service (`albayaanvertalingen.nl`). It transcribes audio memos with OpenAI Whisper and translates the result with GPT-4o-mini, supporting two directions:

- Arabic → Dutch (`ar-to-nl`)
- Dutch → Arabic (`nl-to-ar`)

The design system (colours, fonts, spacing tokens, dark/light theme) is intentionally identical to the parent Vertaler project so both tools feel like one product family.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (no framework) |
| Transcription | OpenAI Whisper API (`whisper-1`) |
| Translation | OpenAI GPT-4o-mini (`gpt-4o-mini`) |
| Backend | Vercel Serverless Functions (`api/`) — Node.js 20 ESM |
| Multipart parsing | `formidable` v3 |
| Fonts | Poppins, Lora, Kufam, Mirza (local TTF, same as Vertaler) |
| Hosting | Vercel (auto-deploy on push to main) |

## Local Development

```bash
# Install dependencies
npm install

# Copy .env.example → .env and fill in your OpenAI key
cp .env.example .env

# Start Vercel dev server (serves frontend + API routes)
npx vercel dev
```

Then open `http://localhost:3000`.

> A plain `python -m http.server` will serve the HTML/CSS/JS but the API routes won't work — use `vercel dev` for the full experience.

## Project Structure

```
/
├── index.html            # Single-page app
├── css/
│   ├── fonts.css         # @font-face declarations (Poppins, Lora, Kufam, Mirza)
│   └── style.css         # All styles — design tokens + Bayaan-specific components
├── js/
│   └── main.js           # App logic (theme, recording, upload, process flow, results)
├── api/
│   ├── transcribe.js     # POST — receives audio, calls Whisper, returns transcription
│   └── translate.js      # POST — receives text + direction, calls GPT-4o-mini
├── Poppins/ Lora/ Kufam/ Mirza/  # Local font TTF files
├── vercel.json           # Function timeout config
├── package.json          # openai + formidable dependencies
├── .env.example          # Required env vars
└── CLAUDE.md             # This file
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Used by both `/api/transcribe` and `/api/translate` |

Set in Vercel dashboard → Project → Settings → Environment Variables for production.

## API Endpoints

### `POST /api/transcribe`
- **Body**: `multipart/form-data` with fields `audio` (file) + `direction` (`ar-to-nl` | `nl-to-ar`)
- **Returns**: `{ text: string }` — the Whisper transcription
- **Model**: `whisper-1`, language hint set from direction
- **Limit**: 25 MB file, 60 s function timeout

### `POST /api/translate`
- **Body**: `{ text: string, direction: string }`
- **Returns**: `{ text: string }` — the GPT-4o-mini translation
- **Model**: `gpt-4o-mini`, temperature 0.2
- **Limit**: 30 s function timeout

## Design System

Inherited from **Vertaler** (`albayaanvertalingen.nl`). CSS variables are in `css/style.css` under `:root` and `[data-theme="dark"]`. Do not change the core tokens — they must stay in sync with the parent project's feel.

Key tokens:
- Accent: `#d4a800` (light) / `#FFD700` (dark)
- Background: `#ffffff` (light) / `#000000` (dark)
- Card: `#ffffff` (light) / `#1a1a1a` (dark)
- Border: `#e5e7eb` (light) / `#2a2a2a` (dark)
- Fonts: Poppins (headings/UI), Lora (body), Kufam (Arabic headings), Mirza (Arabic body)

Theme is stored in `localStorage` under key `theme` (`'light'` | `'dark'`).

## Working Conventions (from Vertaler CLAUDE.md)

### Pre-Commit Checks
Before committing, check that no workflow file triggers an unnecessary full build. Keep CI/CD lean.

### Parallel Agents
Partition by file boundary — no two agents should edit the same file simultaneously.
- Safe to parallelise: investigation (read-only), edits to disjoint file sets
- Serialise: anything touching overlapping files

### End-to-End Verification
After touching the API routes or the process flow in `main.js`, verify the golden path manually:
1. Record a short Arabic clip in the browser
2. Click "Transcribe & Translate"
3. Confirm transcription and translation both appear in the result cards

### Deployment
Push to `main` — Vercel auto-deploys. Check the Vercel dashboard for function logs if the API returns errors.

## Known Constraints

- **Whisper file limit**: 25 MB max. `webm/opus` recordings from the browser are very efficient (~200 KB/min), so this is unlikely to be hit in practice.
- **Vercel function body limit**: overridden via `export const config = { api: { bodyParser: false, sizeLimit: '25mb' } }` in `api/transcribe.js`.
- **Arabic text direction**: result text areas use `dir="auto"` set dynamically in `main.js` based on direction. The Arabic font (Mirza) is applied via CSS `[dir="rtl"]` selector.
