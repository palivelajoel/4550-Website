import { useState, useEffect, useRef } from "react";
import { FONTS, C, sbFetch, isAuthed, uploadFile, HubHeader, toastStyle, inputStyle, selectStyle, overlayStyle, addBtnStyle, ghostBtn, dangerBtn } from "./hubUtils.jsx";

const CATEGORIES = ["All", "Competition", "Build Season", "Outreach", "Team", "Other"];

export default function HubMedia() {
  const [authed] = useState(isAuthed());
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Competition", description: "", year: new Date().getFullYear(), url: "" });
  const [uploadMode, setUploadMode] = useState("file"); // "file" | "url"
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!authed) { window.location.href = "/hub"; return; }
    document.title = "Media · Team 4550";
    load();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function load() {
    const r = await sbFetch("hub_media?select=*&order=created_at.desc");
    if (r) setItems(r);
  }

  async function submit() {
    if (!form.title) return showToast("Title required.");
    setUploading(true);
    let url = form.url;
    if (uploadMode === "file" && file) {
      url = await uploadFile(file, "team-media");
      if (!url) { showToast("Upload failed."); setUploading(false); return; }
    }
    if (!url) { showToast("Provide a file or URL."); setUploading(false); return; }

    const isVideo = url.includes("youtube") || url.includes("youtu.be") || url.includes("vimeo") || (file && file.type.startsWith("video"));
    await sbFetch("hub_media", { method: "POST", body: JSON.stringify({ ...form, url, type: isVideo ? "video" : "image" }) });
    showToast("Added!");
    setAddModal(false);
    setFile(null);
    setForm({ title: "", category: "Competition", description: "", year: new Date().getFullYear(), url: "" });
    setUploading(false);
    load();
  }

  async function deleteItem(id) {
    if (!confirm("Delete this item?")) return;
    await sbFetch(`hub_media?id=eq.${id}`, { method: "DELETE" });
    showToast("Deleted.");
    setLightbox(null);
    load();
  }

  function getYoutubeId(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return m ? m[1] : null;
  }

  function getThumbnail(item) {
    if (item.type === "video") {
      const ytId = getYoutubeId(item.url);
      if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      return null;
    }
    return item.url;
  }

  const filtered = items.filter(i => {
    if (filter !== "All" && i.category !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!authed) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS + `
        .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        @media(max-width:600px){ .media-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
      `}</style>
      {toast && <div style={toastStyle}>{toast}</div>}
      <HubHeader title="📸 Media Gallery" />

      {/* Toolbar */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "rgba(13,17,23,0.8)" }}>
        <button onClick={() => setAddModal(true)} style={addBtnStyle}>+ Add Media</button>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 180 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              background: filter === cat ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter === cat ? "rgba(239,68,68,0.5)" : C.border}`,
              color: filter === cat ? C.red : C.muted,
              borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "monospace",
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.dim, fontFamily: "monospace" }}>{filtered.length} items</div>
      </div>

      {/* Gallery */}
      <div style={{ padding: "20px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.dim, padding: "60px 0", fontFamily: "monospace" }}>
            No media yet. Click "Add Media" to upload photos or link videos.
          </div>
        )}
        <div className="media-grid">
          {filtered.map(item => {
            const thumb = getThumbnail(item);
            return (
              <div key={item.id} onClick={() => setLightbox(item)} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", transition: "transform 0.15s, border-color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ width: "100%", aspectRatio: "16/10", background: "#0d1117", overflow: "hidden", position: "relative" }}>
                  {thumb ? (
                    <img src={thumb} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🎬</div>
                  )}
                  {item.type === "video" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                      <div style={{ width: 36, height: 36, background: "rgba(239,68,68,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>▶</div>
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#aaa", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "monospace" }}>{item.category}</div>
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>{item.year}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ ...overlayStyle, background: "rgba(0,0,0,0.92)" }} onClick={e => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div style={{ maxWidth: 860, width: "100%", padding: "0 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>{lightbox.title}</div>
                <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>{lightbox.category} · {lightbox.year}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => deleteItem(lightbox.id)} style={dangerBtn}>Delete</button>
                <button onClick={() => setLightbox(null)} style={ghostBtn}>✕ Close</button>
              </div>
            </div>
            {lightbox.type === "video" ? (
              (() => {
                const ytId = getYoutubeId(lightbox.url);
                return ytId ? (
                  <iframe style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 }}
                    src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen />
                ) : (
                  <video src={lightbox.url} controls style={{ width: "100%", borderRadius: 8 }} />
                );
              })()
            ) : (
              <img src={lightbox.url} alt={lightbox.title} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />
            )}
            {lightbox.description && <div style={{ marginTop: 12, color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{lightbox.description}</div>}
          </div>
        </div>
      )}

      {/* Add modal */}
      {addModal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setAddModal(false); }}>
          <div style={{ background: "#0d1117", border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 460 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>Add Media</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={inputStyle} />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />

              {/* Upload mode toggle */}
              <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                {["file", "url"].map(m => (
                  <button key={m} onClick={() => setUploadMode(m)} style={{ flex: 1, padding: "8px", background: uploadMode === m ? "rgba(239,68,68,0.2)" : "transparent", border: "none", color: uploadMode === m ? C.red : C.muted, cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                    {m === "file" ? "📁 Upload File" : "🔗 URL / YouTube"}
                  </button>
                ))}
              </div>

              {uploadMode === "file" ? (
                <div>
                  <button onClick={() => fileRef.current?.click()} style={{ ...ghostBtn, width: "100%", padding: "10px" }}>
                    {file ? `✓ ${file.name}` : "Choose image or video"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
                </div>
              ) : (
                <input placeholder="https://youtube.com/watch?v=... or image URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={inputStyle} />
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={submit} disabled={uploading} style={{ ...addBtnStyle, flex: 1, opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Add"}</button>
                <button onClick={() => setAddModal(false)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
