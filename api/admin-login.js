import { createClient } from '@supabase/supabase-js'

// Admin login: validates the caller via Supabase access token and verifies the
// user has role='Admin' in members. No legacy ADMIN_API_TOKEN support and no
// HttpOnly cookie is set — clients should include their Supabase access token
// on subsequent admin requests (Authorization: Bearer <token>).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized: missing token' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid token' });
    const user = userData.user;

    const { data: member, error: memberErr } = await supabase.from('members').select('id,role,auth_id,username').or(`auth_id.eq.${user.id},username.eq.${user.email}`).maybeSingle();
    if (memberErr) return res.status(500).json({ error: memberErr.message });
    if (!member || member.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
