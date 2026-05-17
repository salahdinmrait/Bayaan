/**
 * POST /api/translate
 * Body: { text: string, direction: 'ar-to-nl' | 'nl-to-ar' }
 * Returns: { text: string }
 *
 * Uses Groq LLaMA (llama-3.3-70b-versatile) — free, no billing required.
 */

const LANGUAGE_PAIRS = {
  'ar-to-nl': { from: 'Arabic', to: 'Dutch' },
  'nl-to-ar': { from: 'Dutch',  to: 'Arabic' },
};

module.exports = async function handler(req, res) {
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

  const { text, direction } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided for translation.' });
  }

  const pair       = LANGUAGE_PAIRS[direction] || LANGUAGE_PAIRS['ar-to-nl'];
  const { from, to } = pair;

  let apiRes;
  try {
    apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specialising in ${from} and ${to}. Translate the user's text from ${from} to ${to} accurately, preserving tone and meaning. Return only the translated text — no introductions, explanations, or quotation marks.`,
          },
          { role: 'user', content: text.trim() },
        ],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach Groq API: ' + err.message });
  }

  const data = await apiRes.json();

  if (!apiRes.ok) {
    const msg = data?.error?.message || `Groq error ${apiRes.status}`;
    return res.status(502).json({ error: msg });
  }

  const translated = data?.choices?.[0]?.message?.content?.trim() || '';
  return res.status(200).json({ text: translated });
};
