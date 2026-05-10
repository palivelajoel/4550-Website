const CATEGORIES = [
  "structural", "drivetrain", "electronics", "pneumatics",
  "fastener", "tool", "consumable", "cable", "bearing",
  "motor", "sensor", "other"
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: 'Missing image URL' });

    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI API key not configured' });

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
              { type: 'text', text: `You are an FRC inventory assistant. Identify the item in this image.

Return ONLY valid JSON (no markdown, no code fences):
{
  "name": "specific item name",
  "category": one of [${CATEGORIES.map(c=>`"${c}"`).join(", ")}],
  "description": "brief description including material, size, usage",
  "estimated_quantity": number,
  "tags": ["array", "of", "relevant", "tags"],
  "manufacturer": "or empty string",
  "part_number": "or empty string"
}

Be specific about types: e.g. "1/4-20 x 1in Hex Bolt" not just "screw", "CIM Motor" not just "motor", "3/8in Hex Shaft 12in" not just "shaft". Include estimated quantity (how many visible). If unknown, use 1.` },
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

    const item = JSON.parse(content);
    return res.status(200).json(item);
  } catch (err) {
    console.error('Identify error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
