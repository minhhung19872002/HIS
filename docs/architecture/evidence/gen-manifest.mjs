/* ============================================================================
   Tái sinh manifest.js — quét mọi ảnh trong các thư mục con của evidence/
   (bỏ qua data/ và assets/). Chạy:  node gen-manifest.mjs
   ============================================================================ */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
const SKIP = new Set(["data", "assets"]);
const out = [];

function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (rel === "" && SKIP.has(e.name)) continue;
      walk(path.join(dir, e.name), rel ? rel + "/" + e.name : e.name);
    } else if (EXTS.has(path.extname(e.name).toLowerCase()) && rel) {
      out.push(rel + "/" + e.name);
    }
  }
}
walk(root, "");
out.sort();

const body = out.map((p) => '  "' + p + '"').join(",\n");
fs.writeFileSync(
  path.join(root, "manifest.js"),
  "/* AUTO-GENERATED bằng gen-manifest.mjs — KHÔNG sửa tay */\nwindow.TP_IMAGES = [\n" + body + "\n];\n",
  "utf8"
);
console.log("manifest.js:", out.length, "ảnh");
