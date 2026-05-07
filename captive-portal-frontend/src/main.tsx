import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const fallback = "00000000-0000-0000-0000-000000000000";
  return {
    venue_id: params.get("venue_id") ?? "22222222-2222-2222-2222-222222222222",
    device_id: params.get("device_id") ?? fallback,
    mac_hash: params.get("mac_hash") ?? "a".repeat(64),
  };
}

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App query={readQuery()} />
  </React.StrictMode>,
);
