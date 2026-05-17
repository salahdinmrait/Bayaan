/**
 * POST /api/transcribe
 * Accepts multipart form fields:
 *   audio     — the audio file
 *   direction — 'ar-to-nl' | 'nl-to-ar'
 *
 * Sends audio inline to Gemini and returns { text: string }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { formidable } = require('formidable');
const fs = require('fs');

const LANGUAGE_NAMES = {
  'ar-to-nl': 'Arabic',
  'nl-to-ar': 'Dutch',
};

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
  const model     = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  let audioData;
  try {
    audioData = fs.readFileSync(audioFile.filepath);
  } catch (err) {
    return res.status(500).json({ error: 'Could not read uploaded file.' });
  } finally {
    fs.unlink(audioFile.filepath, () => {});
  }

  const base64Audio = audioData.toString('base64');
  const genAI       = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const gemini      = genAI.getGenerativeModel({ model });

  let result;
  try {
    result = await gemini.generateContent([
      { inlineData: { mimeType, data: base64Audio } },
      { text: `Transcribe this audio recording. The speaker is speaking ${language}. Return only the transcription text — no labels, no explanations, no formatting markers.` },
    ]);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Gemini transcription failed.' });
  }

  const text = result.response.text().trim();
  return res.status(200).json({ text });
}

/* config must be on the exported function — do NOT overwrite module.exports after setting config */
handler.config = {
  api: {
    bodyParser: false,
    sizeLimit: '25mb',
  },
};

module.exports = handler;
