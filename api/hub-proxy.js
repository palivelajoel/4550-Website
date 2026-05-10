import { createClient } from '@supabase/supabase-js';
import { verifyToken, getTokenFromRequest } from './_shared.js';

const ALLOWED_TABLES = ['hub_tasks', 'inventory_items', 'inventory_transactions'];

export default async function handler(req, res) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized: missing token' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
    if (!['Captain', 'Admin'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden: captain or admin role required' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

    const { table, action, payload: bodyPayload } = req.body || {};
    if (!table || !ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    if (!['insert', 'update', 'delete'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    if (action === 'insert') {
      const data = { ...bodyPayload, added_by: bodyPayload.added_by || payload.userId };
      const { data: result, error } = await supabase.from(table).insert(data).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: result });
    }

    if (action === 'update') {
      const { id, updates } = bodyPayload || {};
      if (!id || !updates) return res.status(400).json({ error: 'Missing id or updates' });
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (action === 'delete') {
      const { id } = bodyPayload || {};
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
