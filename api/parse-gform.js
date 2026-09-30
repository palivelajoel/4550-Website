import { verifyToken, getTokenFromRequest } from './_shared.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const TYPE_MAP = { 0: 'text', 1: 'textarea', 2: 'radio', 3: 'select', 4: 'checkbox', 5: 'radio', 18: 'radio' };

function isValidFormsUrl(raw) {
  let target;
  try { target = new URL(raw); } catch { return false; }
  const host = target.hostname.replace(/^www\./, '');
  if (host === 'docs.google.com') return target.pathname.includes('/forms/');
  if (host === 'forms.gle') return true;
  return false;
}

function buildQuestions(data) {
  const list = data?.[1]?.[1];
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const q of list) {
    if (!Array.isArray(q)) continue;
    const label = typeof q[1] === 'string' ? q[1].trim() : '';
    if (!label) continue;
    const typeRaw = q[3];
    const field = Array.isArray(q[4]) && Array.isArray(q[4][0]) ? q[4][0] : null;
    const rawOptions = field && Array.isArray(field[1]) ? field[1] : null;
    const required = !!(field && field[2]);
    const type = TYPE_MAP[typeRaw] || 'text';
    let options = [];
    if (type === 'radio' || type === 'select' || type === 'checkbox') {
      if (Array.isArray(rawOptions)) {
        options = rawOptions.map(o => (Array.isArray(o) ? String(o[0] ?? '') : String(o ?? ''))).filter(Boolean);
      }
      if (type === 'radio' && options.length === 0 && (typeRaw === 5 || typeRaw === 18)) {
        // Linear scale / star rating — options usually live in the field block as a list of labels
        const scale = field[3];
        if (Array.isArray(scale)) options = scale.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean);
      }
    }
    out.push({
      type,
      label,
      required,
      placeholder: typeof q[2] === 'string' ? q[2] : '',
      options,
      googleType: typeRaw,
    });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || !['Captain', 'Admin'].includes(payload.role)) {
    return res.status(403).json({ error: 'Forbidden: captain or admin role required' });
  }

  const { url } = req.body || {};
  if (!url || !isValidFormsUrl(url)) {
    return res.status(400).json({ error: 'Must be a Google Forms link (docs.google.com/forms/… or forms.gle/…)' });
  }

  let target;
  try { target = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  // /edit links need rewriting to the public viewer to avoid a login wall
  let finalUrl = target.href;
  if (target.hostname.replace(/^www\./, '') === 'docs.google.com' && target.pathname.includes('/forms/') && target.pathname.endsWith('/edit')) {
    const u = new URL(target.href);
    u.pathname = u.pathname.replace(/\/edit$/, '/viewform');
    finalUrl = u.href;
  }

  let html = '';
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(finalUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: ctl.signal, redirect: 'follow' });
    clearTimeout(to);
    if (!r.ok) return res.status(502).json({ error: `Google Forms returned HTTP ${r.status}` });
    html = await r.text();
    if (html.length > 2_500_000) return res.status(502).json({ error: 'Form page too large to parse' });
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch form: ' + (e.name === 'AbortError' ? 'request timed out' : e.message) });
  }

  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);/s);
  if (!m) {
    return res.status(422).json({ error: "Couldn't read this form. Only published Google Forms open to 'Anyone with the link' can be imported." });
  }

  let data;
  try { data = JSON.parse(m[1]); } catch { return res.status(422).json({ error: 'Form data could not be parsed (unexpected format).' }); }

  const questions = buildQuestions(data);
  if (questions.length === 0) return res.status(422).json({ error: 'No questions found in this form.' });

  const title = typeof data?.[3] === 'string' && data[3] ? data[3] : 'Imported Form';
  const description = typeof data?.[1]?.[0] === 'string' && data[1][0] ? data[1][0] : '';

  return res.json({ ok: true, title, description, questions });
}