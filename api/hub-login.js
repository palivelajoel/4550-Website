import { createClient } from '@supabase/supabase-js';
import { createToken, verifyPassword } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
    console.log("DEBUG: Hub login attempt for username:", username);
    const { data: member, error } = await supabase.from('members').select('id,username,password_hash,role,full_name,subteam').eq('username', username).maybeSingle();
    
    if (error) {
      console.error("DEBUG: DB error:", error);
      return res.status(500).json({ error: error.message });
    }
    if (!member) {
      console.log("DEBUG: No member found with username:", username);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (!member.password_hash) {
      console.log("DEBUG: Member found but no password_hash set for:", username);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!verifyPassword(password, member.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = createToken({ userId: member.id, role: member.role, username: member.username });
    return res.status(200).json({
      token,
      user: { id: member.id, username: member.username, role: member.role, full_name: member.full_name, subteam: member.subteam },
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
