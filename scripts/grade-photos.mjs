// Étalonnage commun des photographies éditoriales : saturation retenue, noirs
// légèrement relevés, dominante chaude discrète. Donne au fonds Unsplash une
// seule lumière au lieu d'un assemblage de banques d'images.
//
//   node scripts/grade-photos.mjs <dossier-source> <dossier-cible>
//
// À relancer sur les originaux (jamais deux fois sur une image déjà étalonnée).
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [src, dest] = process.argv.slice(2);
if (!src || !dest) throw new Error("usage: grade-photos.mjs <source> <cible>");
mkdirSync(dest, { recursive: true });

for (const file of readdirSync(src).filter((f) => f.endsWith(".jpg"))) {
  await sharp(join(src, file))
    .resize({ width: 1800, withoutEnlargement: true })
    .modulate({ saturation: 0.72, brightness: 1.02 })
    .linear(0.94, 10)
    .recomb([
      [1.04, 0.02, 0],
      [0.01, 1.0, 0.0],
      [0, 0.02, 0.92],
    ])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(dest, file));
  console.log("graded", file);
}
