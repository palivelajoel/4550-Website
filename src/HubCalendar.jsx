import { useState, useEffect } from "react";
<<<<<<< Updated upstream
import { FONTS, C, sbFetch, isAuthed, HubHeader, toastStyle, inputStyle, selectStyle, overlayStyle, modalStyle, addBtnStyle, ghostBtn, dangerBtn } from "./hubUtils.jsx";
=======
import { FONTS, C, sbFetch, isAuthed, canEditHub } from "./hubUtils.js";
>>>>>>> Stashed changes

const EVENT_TYPES = [
  { value: "event", label: "Event", color: "#3b82f6" },
  { value: "deadline", label: "Deadline", color: "#ef4444" },
  { value: "meeting", label: "Meeting", color: "#22c55e" },
  { value: "competition", label: "Competition", color: "#f59e0b" },
  { value: "other", label: "Other", color: "#a855f7" },
];

const typeColor = t => EVENT_TYPES.find(e => e.value === t)?.color || "#64748b";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HubCalendar() {
  const [authed] = useState(isAuthed());
  const [canEdit] = useState(canEditHub());
  const [events, setEvents] = useState([]);
  const [today] = useState(new Date());
  const [view, setView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', event?, date? }
  const [form, setForm] = useState({ title: "", type: "event", date: "", end_date: "", time: "", description: "", all_day: true });
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!authed) { window.location.href = "/hub"; return; }
    document.title = "Calendar · Team 4550";
    loadEvents();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function loadEvents() {
    const r = await sbFetch("hub_calendar?select=*&order=date.asc");
    if (r) setEvents(r);
  }

  function openAdd(date) {
    if (!canEdit) return;
    const d = date ? `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}` : "";
    setForm({ title: "", type: "event", date: d, end_date: "", time: "", description: "", all_day: true });
    setModal({ mode: "add" });
  }

  function openEdit(ev) {
    setForm({ title: ev.title, type: ev.type, date: ev.date, end_date: ev.end_date || "", time: ev.time || "", description: ev.description || "", all_day: ev.all_day !== false });
    setModal({ mode: "edit", event: ev });
  }

  async function saveEvent() {
    if (!form.title || !form.date) return;
    setSaving(true);
    if (modal.mode === "add") {
      await sbFetch("hub_calendar", { method: "POST", body: JSON.stringify(form) });
      showToast("Event added!");
    } else {
      await sbFetch(`hub_calendar?id=eq.${modal.event.id}`, { method: "PATCH", body: JSON.stringify(form) });
      showToast("Event updated!");
    }
    setSaving(false);
    setModal(null);
    loadEvents();
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    await sbFetch(`hub_calendar?id=eq.${id}`, { method: "DELETE" });
    showToast("Deleted.");
    loadEvents();
    setSelectedDay(null);
  }

  // Calendar grid
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function eventsOnDay(day) {
    const dateStr = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr || (e.end_date && e.date <= dateStr && e.end_date >= dateStr));
  }

  function isToday(day) {
    return day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
  }

  const upcomingEvents = events.filter(e => e.date >= today.toISOString().split("T")[0]).slice(0, 8);
  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  if (!authed) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Exo 2', sans-serif" }}>
      <style>{FONTS}</style>
      {toast && <div style={toastStyle}>{toast}</div>}

      {/* Header */}
      <HubHeader title="📅 Team Calendar" />

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 20px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* Left: Calendar */}
        <div>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={navBtnStyle}>←</button>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>{MONTHS[view.month]} {view.year}</div>
            <button onClick={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={navBtnStyle}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11, color: C.dim, padding: "6px 0" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const dayEvs = eventsOnDay(day);
              const selected = selectedDay === day;
              const todayCell = isToday(day);
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  style={{
                    minHeight: 80,
                    background: selected ? "rgba(239,68,68,0.12)" : todayCell ? "rgba(59,130,246,0.1)" : C.surface,
                    border: `1px solid ${selected ? "rgba(239,68,68,0.5)" : todayCell ? "rgba(59,130,246,0.4)" : C.border}`,
                    borderRadius: 8,
                    padding: "6px 7px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onDoubleClick={() => openAdd({ year: view.year, month: view.month, day })}
                >
                  <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: todayCell ? 700 : 400, color: todayCell ? C.blue : C.muted, marginBottom: 4 }}>{day}</div>
                  {dayEvs.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{ fontSize: 10, background: `${typeColor(ev.type)}22`, color: typeColor(ev.type), borderRadius: 3, padding: "1px 5px", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvs.length > 3 && <div style={{ fontSize: 9, color: C.dim }}>+{dayEvs.length - 3} more</div>}
                </div>
              );
            })}
          </div>

          {/* Selected day panel */}
          {selectedDay && (
            <div style={{ marginTop: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: C.text }}>{MONTHS[view.month]} {selectedDay}, {view.year}</div>
                <button onClick={() => openAdd({ year: view.year, month: view.month, day: selectedDay })} style={addBtnStyle}>+ Add Event</button>
              </div>
              {selectedEvents.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>No events. Double-click any day to add.</div>}
              {selectedEvents.map(ev => (
                <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 4, minHeight: 40, borderRadius: 2, background: typeColor(ev.type), flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: typeColor(ev.type), fontFamily: "monospace", marginTop: 2 }}>{ev.type?.toUpperCase()}{ev.time ? ` · ${ev.time}` : ""}</div>
                    {ev.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ev.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {canEdit ? (
                      <>
                        <button onClick={() => openEdit(ev)} style={ghostBtn}>Edit</button>
                        <button onClick={() => deleteEvent(ev.id)} style={dangerBtn}>✕</button>
                      </>
                    ) : (
                      <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace" }}>View only</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {canEdit ? (
            <button onClick={() => openAdd(null)} style={{ ...addBtnStyle, width: "100%", padding: "12px", fontSize: 13, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>+ ADD EVENT</button>
          ) : (
            <div style={{ color: C.dim, fontSize: 12, fontFamily: "monospace", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>View only: captains and mentors can edit this calendar.</div>
          )}

          {/* Legend */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: C.dim, letterSpacing: 2, marginBottom: 12 }}>EVENT TYPES</div>
            {EVENT_TYPES.map(t => (
              <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />
                <span style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: C.dim, letterSpacing: 2, marginBottom: 12 }}>UPCOMING</div>
            {upcomingEvents.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>No upcoming events.</div>}
            {upcomingEvents.map(ev => (
              <div key={ev.id} onClick={() => openEdit(ev)} style={{ display: "flex", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <div style={{ width: 3, borderRadius: 2, background: typeColor(ev.type), flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ev.title}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>{ev.date}{ev.time ? ` · ${ev.time}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={modalStyle}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>
              {modal.mode === "add" ? "Add Event" : "Edit Event"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, fontFamily: "monospace" }}>Start Date *</div>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, fontFamily: "monospace" }}>End Date</div>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} />
                  All day
                </label>
                {!form.all_day && (
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                )}
              </div>
              <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={saveEvent} disabled={saving} style={{ ...addBtnStyle, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setModal(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
                {modal.mode === "edit" && <button onClick={() => { deleteEvent(modal.event.id); setModal(null); }} style={dangerBtn}>Delete</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = { background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 16, fontFamily: "monospace" };
