import { ImageResponse } from "next/og";

// Icône de l'écran d'accueil sur iPhone (les iPhone n'acceptent pas l'icône SVG)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#15122a" }}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 75,
            border: "9px solid #f4b740",
            background: "repeating-radial-gradient(circle, #1a1730 0 4px, #29244c 4px 7px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 54, height: 54, borderRadius: 27, background: "#ff6a57", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: "#15122a" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
