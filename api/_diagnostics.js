// Lightweight diagnostics endpoint to confirm presence of server runtime env vars
// Returns booleans only; does NOT expose secret values.

export default async function handler(req, res) {
  try {
    const env = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
      ADMIN_API_TOKEN: !!process.env.ADMIN_API_TOKEN,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      TBA_API_KEY: !!process.env.TBA_API_KEY,
    };

    // Include a quick build/runtime hint (vercel sets VERCEL env var)
    const runtime = {
      onVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV || null,
    };

    return res.status(200).json({ ok: true, env, runtime });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
