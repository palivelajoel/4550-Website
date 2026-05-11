import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

  let logoUrl = '/logo.jpg';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('site_config').select('value').eq('key', 'logo_url').maybeSingle();
      if (data?.value) logoUrl = data.value;
    } catch {}
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).json({
    name: "Team 4550 Something's Bruin",
    short_name: "Team 4550",
    description: "FRC Team 4550 — Member Hub, Scouting, Inventory & Media",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#ef4444",
    background_color: "#080a0f",
    icons: [
      { src: logoUrl, sizes: "192x192", type: "image/jpeg" },
      { src: logoUrl, sizes: "512x512", type: "image/jpeg" },
    ],
  });
}
