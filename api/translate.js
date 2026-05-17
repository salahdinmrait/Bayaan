/**
 * POST /api/translate
 * Body: { text: string, direction: 'ar-to-nl' | 'nl-to-ar' }
 * Returns: { text: string }
 *
 * Uses Claude (claude-sonnet-4-6) via Anthropic API for translation.
 */

const Anthropic = require('@anthropic-ai/sdk');

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  const { text, direction } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided for translation.' });
  }

  const pair = LANGUAGE_PAIRS[direction] || LANGUAGE_PAIRS['ar-to-nl'];
  const { from, to } = pair;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a professional translator specialising in ${from} and ${to}. Translate the user's text from ${from} to ${to} accurately, preserving tone and meaning. Return only the translated text — no introductions, explanations, or quotation marks.`,
      messages: [
        { role: 'user', content: text.trim() },
      ],
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Claude translation failed.' });
  }

  const translated = message.content?.[0]?.text?.trim() || '';
  return res.status(200).json({ text: translated });
};
