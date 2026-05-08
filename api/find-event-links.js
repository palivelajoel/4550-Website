function webcastUrl(webcast) {
  if (!webcast) return "";
  const channel = webcast.channel || "";
  if (!channel) return "";
  if (webcast.type === "youtube") return `https://www.youtube.com/watch?v=${channel}`;
  if (webcast.type === "twitch") return `https://www.twitch.tv/${channel}`;
  if (webcast.type === "ustream") return `https://video.ibm.com/channel/${channel}`;
  if (webcast.type === "iframe" || webcast.type === "html5") return channel.startsWith("http") ? channel : "";
  return channel.startsWith("http") ? channel : "";
}

function searchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { event, tbaKey } = req.body || {};
  if (!event?.event_key && !event?.key) return res.status(400).json({ error: "Event is required" });

  const key = event.event_key || event.key;
  const year = (event.start_date || "").slice(0, 4) || new Date().getFullYear();
  let tbaEvent = null;
  let webcasts = [];

  if (tbaKey) {
    try {
      const [eventRes, webcastRes] = await Promise.all([
        fetch(`https://www.thebluealliance.com/api/v3/event/${key}`, { headers: { "X-TBA-Auth-Key": tbaKey } }),
        fetch(`https://www.thebluealliance.com/api/v3/event/${key}/webcasts`, { headers: { "X-TBA-Auth-Key": tbaKey } }),
      ]);
      if (eventRes.ok) tbaEvent = await eventRes.json();
      if (webcastRes.ok) webcasts = await webcastRes.json();
    } catch {}
  }

  const name = tbaEvent?.name || event.name || key;
  const location = [tbaEvent?.address, tbaEvent?.city || event.city, tbaEvent?.state_prov || event.state_prov]
    .filter(Boolean)
    .join(", ") || event.location || "";
  const stream = webcastUrl(webcasts?.[0]);

  const deterministic = {
    venue_map_url: location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location}`)}` : "",
    pit_map_url: searchUrl(`${name} ${year} FRC pit map ${key}`),
    stream_url: stream || searchUrl(`${name} ${year} FRC webcast stream ${key}`),
    map_status: stream
      ? "AI assist checked TBA webcasts. Pit map may not be posted until shortly before the event."
      : "AI assist checked likely sources. Add the exact pit map once the event publishes it.",
  };

  if (!process.env.GROQ_API_KEY) return res.status(200).json(deterministic);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: "You help an FRC team choose practical event links. Return only valid JSON with keys venue_map_url, pit_map_url, stream_url, map_status. Prefer official/TBA/webcast links when provided. Do not invent exact pit map URLs; use a focused search URL if the exact URL is unknown.",
          },
          {
            role: "user",
            content: JSON.stringify({ event, tbaEvent, webcasts, fallback: deterministic }),
          },
        ],
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.status(200).json({ ...deterministic, ...parsed });
  } catch {
    res.status(200).json(deterministic);
  }
}
