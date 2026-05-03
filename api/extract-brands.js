export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mimeType } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'Image required' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` }
              },
              {
                type: 'text',
                text: 'List all company names, brand names, or business names visible in this image. Return ONLY a JSON array of strings with the company names, nothing else. Example: ["Nike","Apple","Local Business"]. If none found, return [].'
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const brands = JSON.parse(clean)
    res.status(200).json({ brands })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Extraction failed', brands: [] })
  }
}
