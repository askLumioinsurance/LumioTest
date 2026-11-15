// api/proxy.js
export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DEEPSEEK_KEY) {
    return response.status(500).json({ error: 'DEEPSEEK_KEY missing' });
  }

  try {
    const body = request.body || {};

    // Log feedback to Vercel logs
    if (body.feedback) {
      console.log('FEEDBACK:', JSON.stringify(body.feedback));
      return response.status(200).json({ ok: true });
    }

    // Chat completion
    const { messages, temperature = 0.2 } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return response.status(400).json({ error: 'messages required' });
    }

    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.DEEPSEEK_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: Math.min(1, Math.max(0, Number(temperature) || 0.2))
      })
    });

    const data = await upstream.json();
    return response.status(upstream.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return response.status(502).json({ error: 'Upstream error' });
  }
}
