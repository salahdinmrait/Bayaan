/**
 * POST /api/translate
 * Body: { text: string, direction: 'ar-to-nl' | 'nl-to-ar' }
 * Returns: { text: string }
 *
 * Calls Gemini v1 REST API directly.
 */

const LANGUAGE_PAIRS = {
  'ar-to-nl': { from: 'Arabic', to: 'Dutch' },
  'nl-to-ar': { from: 'Dutch',  to: 'Arabic' },
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

module.exports = async function handler(req, res) {
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

  const { text, direction } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided for translation.' });
  }

  const pair       = LANGUAGE_PAIRS[direction] || LANGUAGE_PAIRS['ar-to-nl'];
  const { from, to } = pair;

  const prompt = `You are a professional translator specialising in ${from} and ${to}. Translate the following text from ${from} to ${to} accurately, preserving tone and meaning. Return only the translated text — no introductions, explanations, or quotation marks.\n\n${text.trim()}`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  let apiRes;
  try {
    apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

  const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return res.status(200).json({ text: translated });
};
