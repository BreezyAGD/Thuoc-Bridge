/**
 * Run Step A (extraction) on one photo from the command line:
 *
 *   npm run extract -- path/to/photo.jpg
 *
 * Uses the same extractLabel() as the API route, and the same downscale
 * (1568 px long edge, JPEG) as the browser, so results match the app.
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { extractLabel } from "../lib/extract";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run extract -- <photo>");
    process.exit(2);
  }
  const jpeg = await sharp(await readFile(path))
    .rotate() // apply EXIF orientation
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const result = await extractLabel({
    image: jpeg.toString("base64"),
    mediaType: "image/jpeg",
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
