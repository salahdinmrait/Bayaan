/**
 * POST /api/translate
 * Body: { text: string, direction: 'ar-to-nl' | 'nl-to-ar' }
 * Returns: { text: string }
 *
 * Uses OpenAI GPT-4o-mini for high-quality Arabic ↔ Dutch translation.
 */

import { OpenAI } from 'openai';

const LANGUAGE_PAIRS = {
  'ar-to-nl': { from: 'Arabic', to: 'Dutch' },
  'nl-to-ar': { from: 'Dutch',  to: 'Arabic' },
};

export default async function handler(req, res) {
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

  const { text, direction } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided for translation.' });
  }

  const pair = LANGUAGE_PAIRS[direction] || LANGUAGE_PAIRS['ar-to-nl'];
  const { from, to } = pair;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: [
            `You are a professional translator specialising in ${from} and ${to}.`,
            `Translate the user's text from ${from} to ${to} accurately, preserving tone, meaning, and any formal register.`,
            'Return only the translated text — no introductions, explanations, or quotation marks.',
          ].join(' '),
        },
        {
          role: 'user',
          content: text.trim(),
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    });
  } catch (apiErr) {
    const msg = apiErr?.message || 'Translation request failed.';
    return res.status(502).json({ error: msg });
  }

  const translated = completion.choices?.[0]?.message?.content?.trim() || '';
  return res.status(200).json({ text: translated });
}
