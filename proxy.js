// api/proxy.js — Vercel serverless function
export default async function handler(request, response) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token');
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Token gate
  const token = request.headers['x-token'] || new URL(request.url, 'http://localhost').searchParams.get('k');
  if (!process.env.ACCESS_TOKEN || token !== process.env.ACCESS_TOKEN) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.DEEPSEEK_KEY) {
    return response.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const { messages, temperature = 0.2 } = request.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return response.status(400).json({ error: 'messages required' });
    }
    if (messages.length > 20) {
      return response.status(400).json({ error: 'Too many messages' });
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
    response.setHeader('Access-Control-Allow-Origin', '*');
    return response.status(upstream.status).json(data);
  } catch (err) {
    console.error(err);
    return response.status(502).json({ error: 'Upstream error' });
  }
}
