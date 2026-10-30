import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(path.join(process.cwd(), "public/stasis-logo-horizontal-v2.png"));
  const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: 12,
        background: "linear-gradient(135deg, #511420 0%, #af2b31 100%)",
      }}
    >
      {/* The source wordmark is cropped here so the favicon uses its Stasis symbol. */}
      <img
        src={logoDataUrl}
        alt=""
        width={258}
        height={71}
        style={{ position: "absolute", top: 2, left: -23 }}
      />
    </div>,
    size,
  );
}
