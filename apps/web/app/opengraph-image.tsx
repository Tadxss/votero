import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rebuilt from plain flex/border/radius shapes rather than embedding logo.svg — Satori (which
// next/og's ImageResponse runs on) doesn't reliably render arbitrary nested <svg> as an <img>
// source. The checkmark itself is two rotated bars, not a "✓" glyph — Satori tries to fetch a
// Google Fonts subset for any text it renders, and that fetch has no guarantee of succeeding in
// every deploy environment (it failed outright in this one), silently dropping the glyph.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "#FFF9F6",
        }}
      >
        <div style={{ position: "relative", width: 168, height: 168, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 42,
              border: "15px solid #D41F44",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 48,
              width: 72,
              height: 72,
              borderRadius: 22,
              background: "#D41F44",
              display: "flex",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 38,
                left: 16,
                width: 22,
                height: 7,
                borderRadius: 4,
                background: "#FFF9F6",
                transform: "rotate(48deg)",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 26,
                width: 40,
                height: 7,
                borderRadius: 4,
                background: "#FFF9F6",
                transform: "rotate(-48deg)",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#FFB627",
              display: "flex",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#22132B", display: "flex" }}>
            Votero
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#FFB627", display: "flex" }}>.</div>
        </div>
        <div style={{ fontSize: 28, color: "#6B5B73", display: "flex" }}>
          QR-code group voting
        </div>
      </div>
    ),
    { ...size },
  );
}
