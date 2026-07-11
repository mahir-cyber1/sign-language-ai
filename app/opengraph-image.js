import { ImageResponse } from "next/og";

export const alt = "Gebärdensprache KI – Gebärden erkennen und trainieren";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: 64, background: "linear-gradient(135deg, #071526, #174b80)", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ width: 360, height: 360, borderRadius: 80, background: "linear-gradient(145deg, #fff, #dcecff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 230, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>🤟</div>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 64 }}>
        <div style={{ fontSize: 68, fontWeight: 800 }}>Gebärdensprache KI</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 38, marginTop: 24, lineHeight: 1.3 }}><span>Gebärden erkennen,</span><span>übersetzen und trainieren.</span></div>
        <div style={{ fontSize: 26, marginTop: 34, color: "#a9d1ff" }}>Live-Kamera · Training · Drei Sprachen</div>
      </div>
    </div>,
    size
  );
}
