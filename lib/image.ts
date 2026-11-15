/**
 * Browser-side photo preparation.
 * Phone photos are 3-10 MB; Vercel rejects request bodies over 4.5 MB, and the
 * vision model gains nothing past ~1568 px on the long edge. So downscale and
 * re-encode as JPEG before upload. This also normalises HEIC from iPhones
 * (Safari decodes it) and applies EXIF rotation.
 */
export type PreparedImage = {
  /** Base64 JPEG without the data: prefix, sent to /api/extract. */
  base64: string;
  mediaType: "image/jpeg";
  /** Full downscaled image as a data URL, kept in memory for verification. */
  dataUrl: string;
  /** Small preview for lists. */
  thumbUrl: string;
};

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img> decoding.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(source: ImageBitmap | HTMLImageElement, maxEdge: number, quality: number): string {
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const source = await decode(file);
  if (!source.width || !source.height) throw new Error("Empty image");
  const dataUrl = draw(source, 1568, 0.85);
  const thumbUrl = draw(source, 360, 0.7);
  if ("close" in source) source.close();
  return {
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    mediaType: "image/jpeg",
    dataUrl,
    thumbUrl,
  };
}
