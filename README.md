# Bayaan — بيان

**Bayaan** is een gratis web-app waarmee je spraakopnames in het **Arabisch** of **Nederlands** kunt transcriberen en direct vertalen.

🌐 **[bayaan-eight.vercel.app](https://bayaan-eight.vercel.app)**

---

## Wat doet het?

- 🎤 **Opnemen** via de microfoon in je browser, of een audiobestand uploaden (mp3, m4a, wav, ogg, webm, flac)
- 🔁 **Twee richtingen**: Arabisch → Nederlands of Nederlands → Arabisch
- 📝 **Transcriptie** van het gesproken woord via Groq Whisper (hetzelfde model als ChatGPT)
- 🌍 **Vertaling** via Groq LLaMA
- 🌙 Donker/licht thema
- 📋 Resultaten kopiëren met één klik

---

## Onderdeel van Al-Bayaan

Bayaan is een extra functionaliteit naast de [Al-Bayaan Vertalingen](https://albayaanvertalingen.nl) website — een beëdigd vertaalbureau Arabisch-Nederlands. Waar de hoofdsite geschreven documenten verwerkt, richt Bayaan zich op gesproken memo's.

---

## Tech stack

| Laag | Keuze |
|------|-------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Transcriptie | Groq `whisper-large-v3` |
| Vertaling | Groq `llama-3.3-70b-versatile` |
| Backend | Vercel Serverless Functions |
| Hosting | Vercel (auto-deploy via GitHub) |

---

## Lokaal draaien

```bash
git clone https://github.com/salahdinmrait/Bayaan.git
cd Bayaan
npm install
cp .env.example .env   # Vul je Groq API key in (gratis via console.groq.com)
npm run dev            # Start op http://localhost:3000
```

---

## Gerelateerd

- [Al-Bayaan Vertalingen](https://albayaanvertalingen.nl) — de hoofdsite
- [Vertaler broncode](https://github.com/Affiliat0r/Vertaler) — het originele project van mijn collega
