import { useState, useEffect, useRef } from "react";
import { FONTS, C, sbFetch, isAuthed, uploadFile, HubHeader, toastStyle, inputStyle, selectStyle, overlayStyle, addBtnStyle, ghostBtn, dangerBtn } from "./hubUtils.jsx";

const CATEGORIES = ["All", "CAD & Design", "Programming", "Documentation", "Marketing", "Finance", "Competition", "Other"];
const catIcon = { "CAD & Design": "🔧", Programming: "💻", Documentation: "📄", Marketing: "📢", Finance: "💰", Competition: "🏆", Other: "📁" };

export default function HubResources() {
  const [authed] = useState(isAuthed());
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Documentation", url: "", file_name: "" });
  const [uploadMode, setUploadMode] = useState("url");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!authed) { window.location.href = "/member-hub"; return; }
    document.title = "Resources · Team 4550";
    load();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function load() {
    const r = await sbFetch("hub_resources?select=*&order=category.asc,created_at.desc");
    if (r) setItems(r);
  }

  async function submit() {
    if (!form.title) return showToast("Title required.");
    setUploading(true);
    let url = form.url;
    let file_name = form.file_name;
    if (uploadMode === "file" && file) {
      url = await uploadFile(file, "team-assets");
      if (!url) { showToast("Upload failed."); setUploading(false); return; }
      file_name = file.name;
    }
    if (!url) { showToast("Provide a URL or file."); setUploading(false); return; }
    await sbFetch("hub_resources", { method: "POST", body: JSON.stringify({ ...form, url, file_name }) });
    showToast("Resource added!");
    setModal(false);
    setFile(null);
    setForm({ title: "", description: "", category: "Documentation", url: "", file_name: "" });
    setUploading(false);
    load();
  }

  async function deleteItem(id) {
    if (!confirm("Delete this resource?")) return;
    await sbFetch(`hub_resources?id=eq.${id}`, { method: "DELETE" });
    showToast("Deleted.");
    load();
  }

  const filtered = items.filter(i => {
    if (filter !== "All" && i.category !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const groups = {};
  filtered.forEach(i => {
    if (!groups[i.category]) groups[i.category] = [];
    groups[i.category].push(i);
  });

  function getFileIcon(url, fname) {
    const ext = (fname || url || "").split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📊";
    if (["zip", "rar"].includes(ext)) return "🗜️";
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return "🖼️";
    if (url?.includes("drive.google.com")) return "📂";
    if (url?.includes("figma.com")) return "🎨";
    if (url?.includes("github.com")) return "💻";
    return catIcon[url] || "🔗";
  }

  if (!authed) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS}</style>
      {toast && <div style={toastStyle}>{toast}</div>}
      <HubHeader title="📁 Resources" />

      {/* Toolbar */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setModal(true)} style={addBtnStyle}>+ Add Resource</button>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 180 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              background: filter === cat ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter === cat ? "#ec4899" : C.border}`,
              color: filter === cat ? "#ec4899" : C.muted,
              borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontSize: 11, fontFamily: "monospace",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {Object.keys(groups).length === 0 && (
          <div style={{ textAlign: "center", color: C.dim, padding: "60px 0", fontFamily: "monospace" }}>
            No resources yet. Add links, Google Drive files, or upload documents.
          </div>
        )}
        {Object.entries(groups).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{catIcon[cat] || "📁"}</span>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 1 }}>{cat.toUpperCase()}</div>
              <div style={{ flex: 1, height: 1, background: C.border, marginLeft: 8 }} />
              <span style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>{catItems.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {catItems.map(item => (
                <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{getFileIcon(item.url, item.file_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13, color: C.text, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      onMouseEnter={e => e.target.style.color = "#ec4899"}
                      onMouseLeave={e => e.target.style.color = C.text}
                    >{item.title}</a>
                    {item.description && <div style={{ fontSize: 11, color: C.dim, marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>}
                    {item.file_name && <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginTop: 3 }}>{item.file_name}</div>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, flexShrink: 0, padding: "0 2px" }}
                    onMouseEnter={e => e.target.style.color = C.red}
                    onMouseLeave={e => e.target.style.color = "#475569"}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {modal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "#0d1117", border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 460 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>Add Resource</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                {["url", "file"].map(m => (
                  <button key={m} onClick={() => setUploadMode(m)} style={{ flex: 1, padding: "8px", background: uploadMode === m ? "rgba(236,72,153,0.2)" : "transparent", border: "none", color: uploadMode === m ? "#ec4899" : C.muted, cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                    {m === "url" ? "🔗 Link / URL" : "📁 Upload File"}
                  </button>
                ))}
              </div>
              {uploadMode === "url" ? (
                <input placeholder="https://drive.google.com/... or any URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={inputStyle} />
              ) : (
                <div>
                  <button onClick={() => fileRef.current?.click()} style={{ ...ghostBtn, width: "100%", padding: "10px" }}>
                    {file ? `✓ ${file.name}` : "Choose file"}
                  </button>
                  <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={submit} disabled={uploading} style={{ ...addBtnStyle, flex: 1, opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Add"}</button>
                <button onClick={() => setModal(false)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
