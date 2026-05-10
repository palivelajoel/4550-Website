import { useState } from "react";
import HubScouting from "./HubScouting.jsx";
import MapViewer from "./MapViewer.jsx";

export default function ScoutMapTab() {
  return (
    <div style={{ padding: "20px", fontFamily: "'Exo 2', sans-serif", minHeight: "100vh" }}>
      <HubScouting />
    </div>
  );
}