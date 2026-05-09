// Serverless endpoint: admin login
// Expects POST { password }
// If password matches process.env.ADMIN_API_TOKEN, sets an HttpOnly cookie for subsequent admin requests.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { password } = req.body || {};
    const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;
    if (!ADMIN_TOKEN) return res.status(500).json({ error: 'Server not configured' });
    if (!password || password !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

    // Set HttpOnly cookie
    const maxAge = 60 * 60 * 8; // 8 hours
    const secure = process.env.VERCEL ? true : false;
    res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(ADMIN_TOKEN)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
