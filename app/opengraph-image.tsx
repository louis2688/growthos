import { ImageResponse } from "next/og";

// Site-wide share-card image (launch traffic is literally links on X/Reddit/PH — without this
// every share renders a bare grey card). Generated at build; satori supports flexbox only.
export const alt = "GrowthOS — type a goal, get a growth campaign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#14101f",
          backgroundImage:
            "radial-gradient(800px 500px at 85% -10%, rgba(124,58,237,0.45), transparent), radial-gradient(600px 400px at -5% 110%, rgba(236,72,153,0.35), transparent)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundImage: "linear-gradient(135deg, #7c3aed, #ec4899)",
            }}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>GrowthOS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            Type a goal. Get a growth campaign.
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.72)" }}>
            Live-researched channels · prioritized todos · community-safe copy
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.55)" }}>
          Free for indie hackers during early access
        </div>
      </div>
    ),
    { ...size },
  );
}
