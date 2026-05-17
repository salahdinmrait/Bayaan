/**
 * POST /api/transcribe
 * Accepts multipart form fields:
 *   audio     — the audio file
 *   direction — 'ar-to-nl' | 'nl-to-ar'
 *
 * Calls Gemini v1 REST API directly and returns { text: string }
 */

const { formidable } = require('formidable');
const fs = require('fs');

const LANGUAGE_NAMES = {
  'ar-to-nl': 'Arabic',
  'nl-to-ar': 'Dutch',
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const form = formidable({ maxFileSize: 25 * 1024 * 1024, keepExtensions: true });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse the uploaded file. ' + err.message });
  }

  const audioFile = files.audio?.[0];
  if (!audioFile) {
    return res.status(400).json({ error: 'No audio file received.' });
  }

  const direction = fields.direction?.[0] || 'ar-to-nl';
  const language  = LANGUAGE_NAMES[direction] || 'Arabic';
  const mimeType  = audioFile.mimetype || 'audio/mp4';

  let audioData;
  try {
    audioData = fs.readFileSync(audioFile.filepath);
  } catch (err) {
    return res.status(500).json({ error: 'Could not read uploaded file.' });
  } finally {
    fs.unlink(audioFile.filepath, () => {});
  }

  const base64Audio = audioData.toString('base64');

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  let apiRes;
  try {
    apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: `Transcribe this audio recording. The speaker is speaking ${language}. Return only the transcription text — no labels, no explanations, no formatting markers.` },
          ],
        }],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach Gemini API: ' + err.message });
  }

  const data = await apiRes.json();

  if (!apiRes.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    return res.status(502).json({ error: msg });
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return res.status(200).json({ text });
}

handler.config = {
  api: { bodyParser: false, sizeLimit: '25mb' },
};

module.exports = handler;
