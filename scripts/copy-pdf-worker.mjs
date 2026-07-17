import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(rootDir, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const targetDir = join(rootDir, "public");
const target = join(targetDir, "pdf.worker.min.mjs");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

console.log(`Copied pdf.js worker to ${target}`);
