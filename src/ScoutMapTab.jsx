import { useState } from "react";
import HubScouting from "./HubScouting.jsx";
import MapViewer from "./MapViewer.jsx";

export default function ScoutMapTab() {
  const [tab, setTab] = useState("scouting"); // scouting or map

  return (
    <div style={{ padding: "20px", fontFamily: "'Exo 2', sans-serif", minHeight: "100vh" }}>
      <div style={{ 
        display: "flex", 
        borderBottom: "1px solid rgba(255,255,255,0.1)", 
        marginBottom: "24px"
      }}>
        <button
          onClick={() => setTab("scouting")}
          style={{ 
            flex: 1,
            padding: "12px 16px",
            background: tab === "scouting" ? "rgba(239,68,68,0.15)" : "transparent",
            border: "none",
            borderBottom: tab === "scouting" ? "3px solid #ef4444" : "3px solid transparent",
            color: tab === "scouting" ? "#ef4444" : "#94a3b8",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Exo 2', sans-serif"
          }}
        >
          Scouting
        </button>
        <button
          onClick={() => setTab("map")}
          style={{ 
            flex: 1,
            padding: "12px 16px",
            background: tab === "map" ? "rgba(239,68,68,0.15)" : "transparent",
            border: "none",
            borderBottom: tab === "map" ? "3px solid #ef4444" : "3px solid transparent",
            color: tab === "map" ? "#ef4444" : "#94a3b8",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Exo 2', sans-serif"
          }}
        >
          Maps
        </button>
      </div>

      {tab === "scouting" ? (
        <HubScouting />
      ) : (
        <MapViewer />
      )}
    </div>
  );
}