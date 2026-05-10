import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers['x-discord-shared-secret'] || req.headers['authorization'] || '';
    const secret = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!secret || secret !== process.env.DISCORD_BOT_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, author } = req.body || {};
    if (!content) return res.status(400).json({ error: 'Missing content' });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    const title = content.split('\n')[0].slice(0, 100) || 'Discord Announcement';
    const body = content;

    const { error } = await supabase.from('hub_announcements').insert({
      title,
      body,
      tag: 'General',
      pinned: false,
      author: author || 'Discord',
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
