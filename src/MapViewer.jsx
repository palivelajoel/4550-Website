import { useState, useEffect } from "react";
import { sbFetch } from "./hubUtils.jsx";

export default function MapViewer() {
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompetitions() {
      setLoading(true);
      try {
        const data = await sbFetch("competitions?select=*&order=start_date.asc");
        if (data) setCompetitions(data);
      } catch (err) {
        console.error("Failed to load competitions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCompetitions();
  }, []);

  if (loading) return <p>Loading competitions...</p>;
  if (!competitions || competitions.length === 0) return <p>No competitions found.</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "'Exo 2', sans-serif" }}>
      <h2 style={{ color: "#f1f5f9", marginBottom: "20px" }}>Competition Maps</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <label 
          htmlFor="competition-select" 
          style={{ display: "block", marginBottom: "5px", color: "#94a3b8" }}
        >
          Select Competition:
        </label>
        <select
          id="competition-select"
          value={selectedCompetition || ""}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "10px",
            color: "#fff",
            fontSize: "13px",
            fontFamily: "monospace",
            width: "100%",
            maxWidth: "400px"
          }}
        >
          <option value="">-- Select a competition --</option>
          {competitions.map(comp => (
            <option key={comp.id} value={comp.id}>
              {comp.name} ({comp.start_date})
            </option>
          ))}
        </select>
      </div>

      {selectedCompetition && (
        <div>
          <h3 style={{ color: "#f1f5f9", marginBottom: "15px" }}>
            {competitions.find(c => c.id === selectedCompetition)?.name || "Selected Competition"}
          </h3>
          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
            
            {/* Pit Map */}
            <div style={{ flex: "1 1 300px", minWidth: "280px" }}>
              <h4 style={{ color: "#94a3b8", marginBottom: "10px" }}>Pit Map</h4>
              {competitions.find(c => c.id === selectedCompetition)?.pit_map_url ? (
                <div style={{ 
                  position: "relative", 
                  border: "1px solid #444",
                  background: "#000"
                }}>
                  <img 
                    src={competitions.find(c => c.id === selectedCompetition)?.pit_map_url} 
                    alt="Pit Map" 
                    style={{ 
                      width: "100%", 
                      display: "block",
                      opacity: "0.7"
                    }}
                  />
                  {/* Pit overlays would go here if we had schematic data to display */}
                  {/* For now, just show the map image */}
                </div>
              ) : (
                <p style={{ 
                  textAlign: "center", 
                  color: "#64748b", 
                  padding: "40px 20px",
                  fontStyle: "italic"
                }}>
                  No pit map available
                </p>
              )}
            </div>

            {/* Venue Map */}
            <div style={{ flex: "1 1 300px", minWidth: "280px" }}>
              <h4 style={{ color: "#94a3b8", marginBottom: "10px" }}>Venue Map</h4>
              {competitions.find(c => c.id === selectedCompetition)?.venue_map_url ? (
                <div style={{ 
                  position: "relative", 
                  border: "1px solid #444",
                  background: "#000"
                }}>
                  <img 
                    src={competitions.find(c => c.id === selectedCompetition)?.venue_map_url} 
                    alt="Venue Map" 
                    style={{ 
                      width: "100%", 
                      display: "block",
                      opacity: "0.7"
                    }}
                  />
                </div>
              ) : (
                <p style={{ 
                  textAlign: "center", 
                  color: "#64748b", 
                  padding: "40px 20px",
                  fontStyle: "italic"
                }}>
                  No venue map available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}