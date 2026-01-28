/**
 * Converts the first page of "Brosur Umum Web.pdf" to brosur-umum-web.jpg.
 * Run: npm run convert-brosur
 * Requires: pdf-to-img (devDep), sharp (dep).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pdf } from "pdf-to-img";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const pdfPath = path.join(projectRoot, "public", "assets", "Brosur Umum Web.pdf");
const outPath = path.join(projectRoot, "public", "assets", "brosur-umum-web.jpg");

async function main() {
  const doc = await pdf(pdfPath, { scale: 2 });
  const page1 = await doc.getPage(1);
  const jpg = await sharp(page1).jpeg({ quality: 90 }).toBuffer();
  await fs.writeFile(outPath, jpg);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
