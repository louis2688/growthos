import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Site-wide share-card image (launch traffic is literally links on X/Reddit/PH — without this
// every share renders a bare grey card). Generated at build; satori supports flexbox only.
export const alt = "GrowthOS — type a goal, get a growth campaign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // The real brand mark (Dave's logo, purple colorway) — embedded as a data URI since satori
  // can't fetch relative URLs at build time.
  const mark = await readFile(join(process.cwd(), "public/brand/mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

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
              backgroundColor: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- satori requires plain img */}
            <img src={markSrc} alt="" width={44} height={44} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>GrowthOS</div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.6)" }}>
              by LaunchLift
            </div>
          </div>
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
