import { useState, useEffect, useRef } from "react";
import { FONTS, C, sbFetch, isAuthed, canEditHub, HubHeader, toastStyle, inputStyle, selectStyle, overlayStyle, modalStyle, addBtnStyle, ghostBtn, dangerBtn, hubProxy, getTokenUserId } from "./hubUtils.jsx";
import Starfield from "./Starfield.jsx";

export default function HubInventory() {
  const [authed] = useState(isAuthed());
  const [canEdit] = useState(canEditHub());
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", quantity: 1, location: "", category: "part", image_url: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!authed) { window.location.href = "/member-hub"; return; }
    document.title = "Inventory · Team 4550";
    loadItems();
  }, []);

  async function loadItems() {
    const data = await sbFetch("inventory_items?select=*&order=created_at.desc");
    if (data) setItems(data);
  }

  function showToast(msg, color = "#22c55e") { setToast({ msg, color }); setTimeout(() => setToast(""), 3000); }

  function openAdd() {
    setForm({ name: "", description: "", quantity: 1, location: "", category: "part", image_url: "" });
    setModal("add");
  }

  function openEdit(item) {
    setForm({ ...item });
    setModal("edit");
  }

  async function handleIdentify() {
    const file = fileRef.current?.files?.[0];
    if (!file) return showToast("Select an image first.", "#ef4444");
    setUploading(true);
    // Upload to Supabase storage
    const safeName = `${Date.now()}-${file.name}`.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/inventory-images/${safeName}`, {
      method: "POST",
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
      body: file,
    });
    if (!uploadRes.ok) { setUploading(false); showToast("Upload failed.", "#ef4444"); return; }
    const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/inventory-images/${safeName}`;
    setForm({ ...form, image_url: imageUrl });
    // AI identify
    try {
      const res = await fetch("/api/identify-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl }) });
      if (res.ok) {
        const ai = await res.json();
        setForm(prev => ({ ...prev, name: ai.name || prev.name, description: ai.description || prev.description, category: ai.category || prev.category, quantity: ai.estimated_quantity || prev.quantity }));
        showToast("AI identified item!");
      } else {
        showToast("AI identification failed, fill in manually.", "#f59e0b");
      }
    } catch { showToast("AI service unavailable.", "#ef4444"); }
    setUploading(false);
  }

  async function save() {
    if (!form.name.trim()) return showToast("Name is required.", "#ef4444");
    setSaving(true);
    try {
      const userId = getTokenUserId();
      const payload = { ...form, added_by: userId };
      if (modal === "add") {
        await hubProxy("inventory_items", "insert", payload);
        showToast("✅ Item added.");
      } else {
        const { id, created_at, ...updates } = form;
        await hubProxy("inventory_items", "update", { id, updates });
        showToast("✅ Item updated.");
      }
      setModal(null);
      loadItems();
    } catch (err) { showToast("Save failed: " + err.message, "#ef4444"); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await hubProxy("inventory_items", "delete", { id });
    showToast("🗑️ Deleted.", "#ef4444");
    loadItems();
  }

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  if (!authed) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2',sans-serif", position: "relative" }}>
      <Starfield density={11000} opacity={0.28} />
      <style>{FONTS}</style>
      <HubHeader title="Inventory" subtitle="Parts & Tools" />
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.color, color: "#fff", padding: "12px 20px", borderRadius: 8, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toast.msg}</div>}

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px", position: "relative", zIndex: 1 }}>
        {/* Filters + Add */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 200, fontSize: 13 }} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
              <option value="all">All</option>
              <option value="part">Parts</option>
              <option value="tool">Tools</option>
              <option value="consumable">Consumables</option>
            </select>
          </div>
          {canEdit && <button onClick={openAdd} style={addBtnStyle}>+ Add Item</button>}
        </div>

        {/* Inventory list */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{item.category}</div>
                  {item.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{item.description}</div>}
                  <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: C.dim, fontFamily: "monospace" }}>
                    <span>Qty: {item.quantity}</span>
                    {item.location && <span>📍 {item.location}</span>}
                  </div>
                </div>
              </div>
              {canEdit && (
                <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
                  <button onClick={() => openEdit(item)} style={ghostBtn}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} style={dangerBtn}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.dim, marginTop: 40, fontFamily: "monospace", fontSize: 13 }}>No items found.</div>}
      </main>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={overlayStyle} onClick={() => setModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 16, letterSpacing: 2 }}>{modal === "add" ? "ADD ITEM" : "EDIT ITEM"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Item name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                <input type="number" placeholder="Qty" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, width: 70 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Location (e.g., Shelf A2)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...selectStyle, width: 120 }}>
                  <option value="part">Part</option>
                  <option value="tool">Tool</option>
                  <option value="consumable">Consumable</option>
                </select>
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => fileRef.current?.click()} style={ghostBtn}>{uploading ? "Uploading..." : "📷 Upload & AI Identify"}</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIdentify} />
                {form.image_url && <span style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>✅ Image set</span>}
              </div>
              {form.image_url && <img src={form.image_url} alt="Preview" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={save} disabled={saving} style={{ ...addBtnStyle, flex: 1 }}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setModal(null)} style={dangerBtn}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
