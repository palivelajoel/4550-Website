import { createClient } from '@supabase/supabase-js';
import { hashPassword } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
    const { data, error } = await supabase.from('members')
      .update({ password_hash: hashPassword(password) })
      .eq('username', username)
      .select();
      
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Member not found' });
    
    return res.status(200).json({ message: 'Password set successfully!' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
