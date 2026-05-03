export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company } = req.body
  if (!company) return res.status(400).json({ error: 'Company name required' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant helping an FRC robotics team find sponsorship contact info for companies. Given a company name, provide their sponsorship, donations, or community outreach contact email and phone number. Respond ONLY with a valid JSON object with keys: email, phone, notes. No markdown, no backticks, just raw JSON.'
          },
          {
            role: 'user',
            content: `Find sponsorship contact info for: ${company}`
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.status(200).json(parsed)
  } catch (e) {
    res.status(500).json({ error: 'Lookup failed' })
  }
}
