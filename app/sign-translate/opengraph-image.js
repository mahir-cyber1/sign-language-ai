import { ImageResponse } from "next/og";

export const alt = "Gebärdensprache KI";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          position: "relative",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #08110f 0%, #10161d 48%, #13241d 100%)",
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle at 78% 18%, rgba(120, 212, 189, 0.22), transparent 28%), radial-gradient(circle at 10% 88%, rgba(31, 184, 149, 0.18), transparent 30%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 26,
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#78d4bd",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            Webcam KI · Training · Live Text
          </div>
          <div
            style={{
              maxWidth: 670,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            Gebärdensprache KI
          </div>
          <div
            style={{
              maxWidth: 650,
              color: "#d5dde8",
              fontSize: 34,
              lineHeight: 1.25,
            }}
          >
            Gebärden aufnehmen, korrigieren und live als Text anzeigen.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#0b1412",
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            <span
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: 999,
                background: "#94f0cf",
              }}
            >
              DGS Training
            </span>
            <span
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: 999,
                background: "#f8fafc",
              }}
            >
              Für 5-10 Tester
            </span>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            width: 360,
            height: 360,
            borderRadius: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 23, 19, 0.92)",
            border: "10px solid #78d4bd",
            boxShadow: "0 36px 90px rgba(0, 0, 0, 0.35)",
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 36,
              top: 38,
              width: 116,
              height: 88,
              borderRadius: 28,
              background: "#f8fafc",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 76,
              top: 112,
              width: 34,
              height: 34,
              transform: "rotate(45deg)",
              background: "#f8fafc",
            }}
          />
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: 88 + index * 42,
                top: 58 + Math.abs(index - 1) * 12,
                width: 34,
                height: 150 - Math.abs(index - 1) * 10,
                borderRadius: 20,
                background: "#94f0cf",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 101,
              top: 171,
              width: 154,
              height: 132,
              borderRadius: "44px 44px 58px 58px",
              background: "#94f0cf",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 58,
              top: 189,
              width: 96,
              height: 36,
              borderRadius: 20,
              transform: "rotate(35deg)",
              background: "#94f0cf",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 122,
              bottom: 30,
              color: "#07100d",
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            KI
          </div>
        </div>
      </div>
    ),
    size
  );
}
