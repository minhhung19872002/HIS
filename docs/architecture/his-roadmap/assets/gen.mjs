/* ============================================================================
   Generator: đọc data.js → sinh toàn bộ HTML stub (hub/layer/role/flow/module).
   Chạy: node assets/gen.mjs   (từ thư mục his-roadmap)
   ============================================================================ */
import fs from "fs";

const here = new URL("./", import.meta.url);
const out  = new URL("../", import.meta.url);
const src  = fs.readFileSync(new URL("data.js", here), "utf8");

// Nạp data.js trong sandbox Node (data.js không đụng DOM) để lấy các const.
const get = new Function(src + "\nreturn {BANDS, ROLEFLOWS, FLOWS, LAYER_REL};");
const { BANDS, ROLEFLOWS, FLOWS, LAYER_REL } = get();

const ROLE_SLUG = ["bacsi","dieuduong","ktv-cls","duocsi","thuky","thungan","giamdinh-bhyt","ql-khoaphong","bgd-khth"];

function stub(type, id, title){
  const page = type === "hub" ? `{type:"hub"}` : `{type:"${type}",id:"${id}"}`;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link rel="stylesheet" href="assets/style.css" />
<script>window.PAGE=${page}</script>
</head>
<body>
<div id="app"></div>
<div class="dw-backdrop" id="dwBack" hidden></div>
<aside class="dw" id="dw" aria-hidden="true">
  <header class="dw-h"><div class="dw-t" id="dwTitle"></div><button class="dw-x" id="dwClose" title="Đóng (Esc)">✕</button></header>
  <div class="dw-b" id="dwBody"></div>
</aside>
<script src="assets/data.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
`;
}

const pages = [];
pages.push(["index.html", stub("hub", "", "HIS — Bản đồ tri thức hệ thống")]);
LAYER_REL.nodes.forEach(n => pages.push([`layer-${n.id}.html`, stub("layer", n.id, `${n.t} — HIS Roadmap`)]));
ROLEFLOWS.forEach((r,i) => pages.push([`role-${ROLE_SLUG[i]}.html`, stub("role", ROLE_SLUG[i], `Vai trò: ${r.nm} — HIS Roadmap`)]));
FLOWS.forEach(f => pages.push([`flow-${f.id}.html`, stub("flow", f.id, `Luồng: ${f.name} — HIS Roadmap`)]));
BANDS.forEach(b => b.modules.forEach(m => pages.push([`module-${m.id}.html`, stub("module", m.id, `${m.nm} — HIS Roadmap`)])));

let n = 0;
for (const [name, html] of pages){ fs.writeFileSync(new URL(name, out), html, "utf8"); n++; }
console.log(`Generated ${n} pages (hub + ${LAYER_REL.nodes.length} layer + ${ROLEFLOWS.length} role + ${FLOWS.length} flow + modules).`);
