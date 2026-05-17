/**
 * POST /api/transcribe
 * Accepts a multipart form upload with fields:
 *   audio    — the audio file (blob or file)
 *   direction — 'ar-to-nl' | 'nl-to-ar'
 *
 * Forwards to OpenAI Whisper and returns { text: string }
 */

import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,   // let formidable handle multipart
    sizeLimit: '25mb',
  },
};

const LANGUAGE_MAP = {
  'ar-to-nl': 'ar',
  'nl-to-ar': 'nl',
};

export default async function handler(req, res) {
  /* CORS headers for local dev */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  /* Parse multipart form */
  const form = formidable({
    maxFileSize: 25 * 1024 * 1024,
    keepExtensions: true,
  });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (parseErr) {
    return res.status(400).json({ error: 'Could not parse the uploaded file. ' + parseErr.message });
  }

  const audioFile = files.audio?.[0];
  if (!audioFile) {
    return res.status(400).json({ error: 'No audio file received.' });
  }

  const direction = fields.direction?.[0] || 'ar-to-nl';
  const language  = LANGUAGE_MAP[direction] || 'ar';

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let transcription;
  try {
    transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: 'whisper-1',
      language,
      response_format: 'text',
    });
  } catch (whisperErr) {
    const msg = whisperErr?.message || 'Whisper transcription failed.';
    return res.status(502).json({ error: msg });
  } finally {
    /* Clean up temp file */
    fs.unlink(audioFile.filepath, () => {});
  }

  return res.status(200).json({ text: transcription });
}
