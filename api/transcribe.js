/**
 * POST /api/transcribe
 * Accepts multipart form fields:
 *   audio     — the audio file
 *   direction — 'ar-to-nl' | 'nl-to-ar'
 *
 * Uses Groq Whisper (whisper-large-v3) — free, no billing required.
 * Returns { text: string }
 */

const { formidable } = require('formidable');
const fs = require('fs');

const LANGUAGE_CODES = {
  'ar-to-nl': 'ar',
  'nl-to-ar': 'nl',
};

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
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
  const language  = LANGUAGE_CODES[direction] || 'ar';
  const filename  = audioFile.originalFilename || `audio.${audioFile.mimetype?.split('/')[1] || 'mp4'}`;

  let audioData;
  try {
    audioData = fs.readFileSync(audioFile.filepath);
  } catch (err) {
    return res.status(500).json({ error: 'Could not read uploaded file.' });
  } finally {
    fs.unlink(audioFile.filepath, () => {});
  }

  /* Build multipart form for Groq Whisper API (OpenAI-compatible) */
  const boundary = '----BayaanBoundary' + Date.now();
  const mimeType = audioFile.mimetype || 'audio/mp4';

  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3`,
    `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}`,
    `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
  ];

  const header  = Buffer.from(parts.join('\r\n') + '\r\n');
  const footer  = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body    = Buffer.concat([header, audioData, footer]);

  let apiRes;
  try {
    apiRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach Groq API: ' + err.message });
  }

  if (!apiRes.ok) {
    const errData = await apiRes.json().catch(() => ({}));
    const msg = errData?.error?.message || `Groq error ${apiRes.status}`;
    return res.status(502).json({ error: msg });
  }

  /* response_format=text returns plain text, not JSON */
  const text = (await apiRes.text()).trim();
  return res.status(200).json({ text });
}

handler.config = {
  api: { bodyParser: false, sizeLimit: '25mb' },
};

module.exports = handler;
