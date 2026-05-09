import { createClient } from '@supabase/supabase-js'

// Generic proxy that accepts admin requests. Authorization is either:
// 1) admin_token cookie matching ADMIN_API_TOKEN (legacy)
// 2) Authorization: Bearer <access_token> (Supabase Auth access token)

const ALLOWED_TABLES = ['sponsors', 'captains', 'site_config', 'members', 'hub_tasks', 'suggestions', 'hub_calendar', 'inventory_items'];

function parseCookie(header) {
  if (!header) return {};
  return header.split(';').map(p => p.split('=').map(s => s.trim())).reduce((acc, [k, v]) => { acc[k] = v; return acc }, {});
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

    // Require Authorization: Bearer <access_token> (Supabase Auth)
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized: missing token' });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid token' });
    const user = userData.user;

    // Check members table for a matching auth_id or username (email) and admin role
    const { data: member, error: memberErr } = await supabase.from('members').select('id,role,auth_id,username').or(`auth_id.eq.${user.id},username.eq.${user.email}`).maybeSingle();
    if (memberErr) return res.status(500).json({ error: memberErr.message });
    if (!member || member.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const { table, action, payload } = req.body || {};
    if (!table || !ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    // Special member flows that use the Supabase Admin API
    if (table === 'members' && action === 'create_user') {
      const { email, password, full_name, role, subteam, username } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

      // Create auth user via Admin API
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (createErr) return res.status(500).json({ error: createErr.message });

      const auth_id = created?.user?.id || created?.id;
      const memberPayload = { auth_id, username: username || email, full_name, role, subteam };
      const { data: memberData, error: memberErr } = await supabase.from('members').insert(memberPayload).select();
      if (memberErr) return res.status(500).json({ error: memberErr.message });
      return res.status(200).json({ data: { created, member: memberData } });
    }

    if (table === 'members' && action === 'update_member') {
      const { id, updates, password } = payload || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { data: memberRow, error: mErr } = await supabase.from('members').select('auth_id').eq('id', id).maybeSingle();
      if (mErr) return res.status(500).json({ error: mErr.message });

      const auth_id = memberRow?.auth_id;
      if (password) {
        if (!auth_id) return res.status(400).json({ error: 'No auth_id for member; cannot update password' });
        const { data: pwdData, error: pwdErr } = await supabase.auth.admin.updateUserById(auth_id, { password });
        if (pwdErr) return res.status(500).json({ error: pwdErr.message });
      }

      const updatesCopy = { ...(updates || {}) };
      // Do not store passwords in members table
      delete updatesCopy.password;
      const { data: upData, error: upErr } = await supabase.from('members').update(updatesCopy).eq('id', id).select();
      if (upErr) return res.status(500).json({ error: upErr.message });
      return res.status(200).json({ data: upData });
    }

    if (!['insert','update','delete'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

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
