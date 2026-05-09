import { createClient } from '@supabase/supabase-js'

// Generic proxy that accepts admin requests with HttpOnly cookie set by /api/admin-login
// For safety, this endpoint only supports a small set of operations on specific tables.

const ALLOWED_TABLES = ['sponsors', 'captains', 'site_config', 'members', 'hub_tasks', 'suggestions', 'hub_calendar'];

function parseCookie(header) {
  if (!header) return {};
  return header.split(';').map(p => p.split('=').map(s => s.trim())).reduce((acc, [k, v]) => { acc[k] = v; return acc }, {});
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookie(req.headers.cookie || '');
    const adminToken = cookies['admin_token'];
    if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

    const { table, action, payload } = req.body || {};
    if (!table || !ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    if (!['insert','update','delete'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

    if (action === 'insert') {
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (action === 'update') {
      const { id, updates } = payload || {};
      if (!id || !updates) return res.status(400).json({ error: 'Missing id or updates' });
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (action === 'delete') {
      const { id } = payload || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data, error } = await supabase.from(table).delete().eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(400).json({ error: 'Unsupported' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
