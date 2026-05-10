import { verifyToken, getTokenFromRequest } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized: missing token' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
    if (!['Captain', 'Admin'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden' });

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return res.status(500).json({ error: 'Discord webhook not configured' });

    const { title, body, tag, author } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

    const color =
      tag === 'Urgent' ? 0xef4444 :
      tag === 'Competition' ? 0xef4444 :
      tag === 'Build' ? 0xf59e0b :
      tag === 'Programming' ? 0x3b82f6 :
      tag === 'Marketing & Outreach' ? 0x22c55e :
      tag === 'Reminder' ? 0xa855f7 :
      0x64748b;

    const discordPayload = {
      embeds: [{
        title: title,
        description: body,
        color: color,
        footer: { text: author ? `Posted by ${author}` : 'Member Hub Announcement' },
        timestamp: new Date().toISOString(),
      }],
    };

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(500).json({ error: `Discord webhook error: ${resp.status} ${text}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
