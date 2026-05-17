/**
 * POST /api/translate
 * Body: { text: string, direction: 'ar-to-nl' | 'nl-to-ar' }
 * Returns: { text: string }
 *
 * Uses Google Gemini for Arabic ↔ Dutch translation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { text, direction } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided for translation.' });
  }

  const pair       = LANGUAGE_PAIRS[direction] || LANGUAGE_PAIRS['ar-to-nl'];
  const { from, to } = pair;
  const model      = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const genAI      = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const gemini     = genAI.getGenerativeModel({
    model,
    systemInstruction: `You are a professional translator specialising in ${from} and ${to}. Translate the user's text from ${from} to ${to} accurately, preserving tone and meaning. Return only the translated text — no introductions, explanations, or quotation marks.`,
  });

  let result;
  try {
    result = await gemini.generateContent(text.trim());
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Gemini translation failed.' });
  }

  const translated = result.response.text().trim();
  return res.status(200).json({ text: translated });
}
