import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: 'Missing image URL' });

    // Use a Vision model to analyze the map and find pits
    // We'll use Groq or OpenAI based on available keys
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI API key not configured on server' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this pit map image. Find all pit numbers and their approximate locations as normalized coordinates (x, y from 0.0 to 1.0, where 0,0 is top-left). Return ONLY a JSON array of objects like this: [{"team": 123, "x": 0.45, "y": 0.12}, ...]. Do not include any markdown or explanation.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: 'AI failed to analyze image' });

    const parsed = JSON.parse(content);
    // The AI might wrap the array in an object like { "pits": [...] }
    const pits = Array.isArray(parsed) ? parsed : (parsed.pits || []);
    
    return res.status(200).json({ pits });
  } catch (err) {
    console.error('Trace error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
