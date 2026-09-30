const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  baseURL: process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY || ''
});

async function verify() {
  console.log('[Bstudio Test] Probing Nebius Token Factory with Nemotron 3 Nano...');
  const t0 = Date.now();
  try {
    const res = await client.chat.completions.create({
      model: 'nvidia/nemotron-3-nano-30b',
      messages: [
        { role: 'system', content: 'You are a diagnostic probe.' },
        { role: 'user', content: 'Respond strictly with: "HEALTH_OK"' }
      ],
      temperature: 0.0,
      max_tokens: 10
    });
    console.log(`[Success] Received response in ${Date.now() - t0}ms:`, res.choices[0].message.content.trim());
  } catch (err) {
    console.error('[Failure] Nebius Token Factory probe failed:', err.message);
  }
}

verify();
