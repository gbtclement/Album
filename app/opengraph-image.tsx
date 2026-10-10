import { ImageResponse } from "next/og";

// Image d'aperçu quand un lien du site est partagé (réseaux sociaux, messageries).
// Les fiches album utilisent leur pochette à la place (voir app/album/[slug]/page.tsx).
export const alt = "Album : le jeu de cartes des albums de musique";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: "radial-gradient(circle at 50% 0%, #2a2160 0%, #15122a 65%)",
          color: "#efebfb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            border: "14px solid #f4b740",
            background: "repeating-radial-gradient(circle, #1a1730 0 6px, #29244c 6px 10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 110, height: 110, borderRadius: 55, background: "#ff6a57", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: "#15122a" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>Album</div>
          <div style={{ fontSize: 40, color: "#9a94c2", marginTop: 20, lineHeight: 1.25 }}>
            Ouvre des packs, collectionne les albums légendaires, échange avec tes amis.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
            {["#8f8aa8", "#4fc58a", "#4a9df0", "#b56cf2", "#f4b740"].map((color) => (
              <div key={color} style={{ width: 54, height: 72, borderRadius: 10, border: `5px solid ${color}`, background: "#252046" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
