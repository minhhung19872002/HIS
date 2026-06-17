/* ============================================================================
   HIS Knowledge Roadmap — ENGINE chung (đa trang).
   Mỗi trang stub set window.PAGE = {type, id}; file này render đúng view.
   Phụ thuộc: data.js (BANDS, LAYERC, LAYER_REL, ROLEFLOWS, FLOWS, RELATED_X, NOTES, CLUSTERS).
   Không thư viện ngoài.
   ============================================================================ */
(function(){
"use strict";
const PAGE = window.PAGE || {type:"hub"};
const $ = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> [...(r||document).querySelectorAll(s)];

/* ---- Index dữ liệu ---- */
const BANDBY={}; BANDS.forEach(b=>BANDBY[b.id]=b);
const MOD={};    BANDS.forEach(b=>b.modules.forEach(m=>MOD[m.id]={band:b,m}));
const LAYMETA={};LAYER_REL.nodes.forEach(n=>LAYMETA[n.id]=n);
const TBL={};    BANDS.forEach(b=>b.modules.forEach(m=>m.tables.forEach(t=>TBL[t[0]]={mod:m,band:b,vn:t[1]})));
const ROLE_SLUG=["bacsi","dieuduong","ktv-cls","duocsi","thuky","thungan","giamdinh-bhyt","ql-khoaphong","bgd-khth"];
const ROLEBY={}; ROLEFLOWS.forEach((r,i)=>{r._id=ROLE_SLUG[i]; ROLEBY[ROLE_SLUG[i]]=r;});
const FLOWBY={}; FLOWS.forEach(f=>FLOWBY[f.id]=f);
const TOTAL = Object.keys(MOD).length;

const C   = id => LAYERC[id] || "#64748b";
const modId = ref => String(ref).split("-").pop();
const href = (type,id)=> type==="hub" ? "index.html" : `${type}-${id}.html`;
const esc = s => String(s);

/* ---- Tiến độ "đã nắm" (localStorage, dùng chung mọi trang) ---- */
let DONE=new Set(); try{DONE=new Set(JSON.parse(localStorage.getItem("his_done")||"[]"));}catch(e){}
const saveDone=()=>{try{localStorage.setItem("his_done",JSON.stringify([...DONE]));}catch(e){}};
function applyDone(){
  $$("[data-mod]").forEach(el=>{ const id=el.getAttribute("data-mod"); if(id) el.classList.toggle("done",DONE.has(id)); });
  const n=[...DONE].filter(x=>MOD[x]).length, p=$("#prog");
  if(p) p.innerHTML=`✓ Đã nắm <b>${n}/${TOTAL}</b> phân hệ <span class="bar"><i style="width:${Math.round(n/TOTAL*100)}%"></i></span>`;
  const b=$("#modDone"); if(b){ b.classList.toggle("on",DONE.has(PAGE.id)); b.textContent=DONE.has(PAGE.id)?"✓ Đã nắm phân hệ này":"Đánh dấu đã nắm"; }
}
function toggleDone(id){ DONE.has(id)?DONE.delete(id):DONE.add(id); saveDone(); applyDone(); }

/* ---- Quan hệ liên quan (cross-link + cùng lớp) ---- */
function relatedMods(id){
  const e=MOD[id]; if(!e) return [];
  const sib=e.band.modules.map(x=>x.id).filter(x=>x!==id);
  return [...new Set([...(RELATED_X[id]||[]), ...sib])].filter(k=>MOD[k]).slice(0,9);
}
function notesOf(id){
  if(NOTES[id]) return NOTES[id];
  const lay = MOD[id] ? MOD[id].band.id : "clin";
  const g={ found:["Cung cấp danh mục/phân quyền/hạ tầng cho toàn hệ thống.","Giữ AuditLog + CreatedBy là user thật."],
    clin:["Tuân thủ an toàn người bệnh; mọi y lệnh/kết quả ghi nhận & audit.","Phân quyền theo vai trò lâm sàng."],
    oper:["Truy vết tồn kho/tài sản/nhân lực; cảnh báo ngưỡng.","Đồng bộ với viện phí khi phát sinh chi phí."],
    fin:["Đối soát chặt; HĐĐT & BHYT theo quy định; audit truy cập.","Không sửa số liệu đã chốt."],
    spec:["Theo chương trình/biểu mẫu chuyên ngành; liên thông cổng QG khi cần."] };
  return g[lay]||g.clin;
}

/* ---- Chrome ---- */
function header(){ return `<header class="hero2"><div class="bar">
   <a class="logo" href="index.html">🏥 HIS Roadmap</a>
   <span class="sp"></span><span class="prog" id="prog"></span></div></header>`; }
function crumb(items){ return `<nav class="crumb">${items.map(c=>c.href?`<a href="${c.href}">${esc(c.t)}</a>`:`<span>${esc(c.t)}</span>`).join('<i>›</i>')}</nav>`; }
function footer(){ return `<footer>Sinh từ mã nguồn HIS (Clean Architecture · SQL Server) — <b>${TOTAL} phân hệ · 485 bảng</b> (HISDbContext).
   Tên bảng (mã xanh) là tên thật; nhãn tiếng Việt mang tính mô tả. Không lấy từ tài liệu nghiệp vụ (có thể đã cũ).</footer>`; }

/* ---- Mảnh dùng lại ---- */
function navcards(list){ return `<div class="cards">${list.map(c=>
  `<a class="navcard${c.mod?'':' nomod'}" ${c.mod?`data-mod="${c.mod}"`:''} href="${c.href}" style="--nc:${c.color}">
     <span class="ic">${c.ic}</span><span class="t">${esc(c.t)}</span><span class="s">${esc(c.s||'')}</span></a>`).join("")}</div>`; }

function chain(steps){ return `<div class="rf-chain">${steps.map((s,i)=>{
  const mid=modId(s[1]), col=C(MOD[mid]?MOD[mid].band.id:"clin");
  return `<a class="rf-step" href="${href('module',mid)}" style="--rc:${col}"><span class="n">${i+1}</span>${esc(s[0])}</a>`
    + (i<steps.length-1?'<span class="rf-arrow">›</span>':''); }).join("")}</div>`; }

function relatedBlock(ids, flows){
  let h=`<h2 class="secthead">🔗 Liên kết liên quan</h2><div class="relwrap">`;
  h+= ids.map(k=>`<a class="relchip" data-mod="${k}" href="${href('module',k)}" style="--rc:${C(MOD[k].band.id)}">${MOD[k].m.ic} ${MOD[k].m.nm}</a>`).join("");
  if(flows&&flows.length) h+= flows.map(f=>`<a class="relchip flow" href="${href('flow',f.id)}">${f.ic} ${f.name}</a>`).join("");
  return h+`</div>`;
}
function notesBlock(id){ return `<h2 class="secthead">📌 Ghi chú nghiệp vụ &amp; lưu ý</h2>
  <ul class="notes">${notesOf(id).map(n=>`<li>${n}</li>`).join("")}</ul>`; }

/* ---- Sơ đồ quan hệ 5 lớp (hub) — port từ bản cũ ---- */
function overviewHTML(){ return `<div class="ov"><svg class="ov-svg"></svg><div class="ov-grid">
  ${LAYER_REL.nodes.map(n=>`<a class="ov-node" href="${href('layer',n.id)}" data-id="${n.id}" style="grid-area:${n.area};--nc:${C(n.id)}">
     <div class="ic">${n.ic}</div><div class="t">${n.t}</div><div class="d">${n.d}</div></a>`).join("")}
  </div></div>`; }
function drawOverview(){
  const ov=$("#ovhost .ov"); if(!ov) return; const svg=ov.querySelector(".ov-svg");
  svg.setAttribute("viewBox",`0 0 ${ov.clientWidth} ${ov.clientHeight}`);
  const b=ov.getBoundingClientRect();
  const R=el=>{const r=el.getBoundingClientRect();return{cx:r.left-b.left+r.width/2,cy:r.top-b.top+r.height/2,hw:r.width/2,hh:r.height/2};};
  const ep=(s,tx,ty)=>{const dx=tx-s.cx,dy=ty-s.cy,k=Math.min(s.hw/Math.max(Math.abs(dx),1e-3),s.hh/Math.max(Math.abs(dy),1e-3));return{x:s.cx+dx*k,y:s.cy+dy*k};};
  let out=`<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#94a3b8"/></marker></defs>`;
  LAYER_REL.edges.forEach(e=>{const ea=ov.querySelector(`.ov-node[data-id="${e.a}"]`),eb=ov.querySelector(`.ov-node[data-id="${e.b}"]`); if(!ea||!eb)return;
    const A=R(ea),B=R(eb),p1=ep(A,B.cx,B.cy),p2=ep(B,A.cx,A.cy),mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,w=Math.min(e.l.length*5.7+14,230);
    out+=`<path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" marker-end="url(#ah)"/>`;
    out+=`<rect class="elabel-bg" x="${mx-w/2}" y="${my-9}" width="${w}" height="18" rx="5"/><text class="elabel" x="${mx}" y="${my+3.6}" text-anchor="middle">${e.l}</text>`;});
  svg.innerHTML=out;
}

/* ---- Sơ đồ quan hệ của 1 phân hệ (module map: hub–spoke) ---- */
function moduleMapHTML(id){
  const e=MOD[id], rel=relatedMods(id);
  return `<div class="mmap" id="mmap"><svg class="mmap-svg"></svg>
    <div class="mmap-center"><span class="rm-node" data-id="${id}" style="--nc:${C(e.band.id)}"><span class="ic">${e.m.ic}</span><span class="ttl">${e.m.nm}</span></span></div>
    <div class="mmap-rel">${rel.map(k=>`<a class="rmchip" data-mod="${k}" href="${href('module',k)}" style="--rc:${C(MOD[k].band.id)}">${MOD[k].m.ic} ${MOD[k].m.nm}</a>`).join("")}</div></div>`;
}
function drawMmap(){
  const wrap=$("#mmap"); if(!wrap) return; const svg=wrap.querySelector(".mmap-svg");
  svg.setAttribute("viewBox",`0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
  const b=wrap.getBoundingClientRect(), ctr=$(".mmap-center .rm-node",wrap); if(!ctr)return;
  const P=el=>{const r=el.getBoundingClientRect();return{cx:r.left-b.left+r.width/2,cy:r.top-b.top+r.height/2,t:r.top-b.top,bo:r.bottom-b.top};};
  const c=P(ctr); let out="";
  $$(".mmap-rel .rmchip",wrap).forEach(ch=>{const p=P(ch);const my=(c.bo+p.t)/2;
    out+=`<path d="M ${c.cx} ${c.bo} C ${c.cx} ${my}, ${p.cx} ${my}, ${p.cx} ${p.t}"/>`;});
  svg.innerHTML=out;
}

/* ---- Drawer (chi tiết 1 bảng) ---- */
function openDw(){ const d=$("#dw"); d.classList.add("open"); d.setAttribute("aria-hidden","false");
  const bk=$("#dwBack"); bk.hidden=false; requestAnimationFrame(()=>bk.classList.add("show")); }
function closeDw(){ const d=$("#dw"); d.classList.remove("open"); d.setAttribute("aria-hidden","true");
  const bk=$("#dwBack"); bk.classList.remove("show"); setTimeout(()=>{bk.hidden=true;},230); }
function openTable(name){ const e=TBL[name]; if(!e)return;
  $("#dwTitle").innerHTML=`<span style="font-size:20px">🗃️</span><span>${e.vn}</span>`;
  $("#dwBody").innerHTML=`<div class="tn" style="font-size:13px;color:#0d9488;font-family:Consolas,monospace;margin-bottom:10px">${name}</div>
    <div class="desc" style="font-size:12.5px">Thuộc phân hệ <a href="${href('module',e.mod.id)}"><b>${e.mod.nm}</b></a> · Lớp <b>${LAYMETA[e.band.id].t}</b></div>
    <div class="rel" style="margin-top:12px">Bảng SQL Server thật trong <b>HISDbContext</b>. Mở trang phân hệ để xem toàn bộ bảng & quan hệ.</div>`;
  openDw();
}

/* ---- View headers ---- */
function topicH(ic,layer,title,sub,withDone){ return `<div class="topic-h" style="--nc:${C(layer)}">
   <div class="th-ic">${ic}</div><div class="th-t"><h1>${esc(title)}</h1><p>${sub}</p></div>
   ${withDone?'<button class="dw-done" id="modDone">Đánh dấu đã nắm</button>':''}</div>`; }

/* ---- Renderers ---- */
function renderHub(){
  const layCards = LAYER_REL.nodes.map(n=>({ic:n.ic,t:n.t,s:`${BANDBY[n.id].modules.length} phân hệ`,href:href('layer',n.id),color:C(n.id)}));
  const roleCards= ROLEFLOWS.map(r=>({ic:r.ic,t:r.nm,s:r.d,href:href('role',r._id),color:C(r.layer)}));
  const flowCards= FLOWS.map(f=>({ic:f.ic,t:f.name,s:`${f.steps.length} bước`,href:href('flow',f.id),color:C(f.layer)}));
  let modSections=""; BANDS.forEach(b=>{ modSections+=`<h3 class="grp" style="color:${C(b.id)}">${b.title}</h3>`+
     navcards(b.modules.map(m=>({ic:m.ic,t:m.nm,s:`${m.tables.length} bảng`,href:href('module',m.id),color:C(b.id),mod:m.id}))); });
  $("#app").innerHTML = header()+`<div class="wrap">
    <section class="hero3"><h1>🏥 HIS — Bản đồ tri thức hệ thống</h1>
      <p>Khám phá cơ chế hoạt động & cấu trúc dữ liệu của Hệ thống thông tin bệnh viện theo kiểu roadmap:
         chọn một <b>lớp</b>, <b>vai trò</b>, <b>luồng nghiệp vụ</b> hoặc <b>phân hệ</b> để đi vào trang chi tiết.</p>
      <input id="q" placeholder="🔎 Lọc nhanh thẻ bên dưới…" autocomplete="off"/></section>
    <h2 class="secthead">🗺️ Quan hệ tổng thể giữa 5 lớp</h2>
    <div id="ovhost">${overviewHTML()}</div>
    <h2 class="secthead">🏛️ Theo lớp kiến trúc</h2>${navcards(layCards)}
    <h2 class="secthead">👥 Theo vai trò</h2>${navcards(roleCards)}
    <h2 class="secthead">🔀 Theo luồng nghiệp vụ</h2>${navcards(flowCards)}
    <h2 class="secthead">🗂️ Theo phân hệ (${TOTAL})</h2>${modSections}
    ${footer()}</div>`;
  // search filter
  const q=$("#q"); if(q) q.addEventListener("input",()=>{const v=q.value.trim().toLowerCase();
    $$(".navcard").forEach(c=>{const hit=!v||c.textContent.toLowerCase().includes(v); c.classList.toggle("hidden",!hit);});});
}
function renderLayer(){
  const b=BANDBY[PAGE.id], n=LAYMETA[PAGE.id];
  const tcount=b.modules.reduce((a,m)=>a+m.tables.length,0);
  const flows=FLOWS.filter(f=>f.layer===PAGE.id);
  const otherLayers=LAYER_REL.nodes.filter(x=>x.id!==PAGE.id);
  $("#app").innerHTML=header()+`<div class="wrap">
    ${crumb([{t:"Hub",href:"index.html"},{t:n.t}])}
    ${topicH(n.ic,PAGE.id,n.t,`${n.d} · <b>${b.modules.length} phân hệ · ${tcount} bảng</b>`,false)}
    <h2 class="secthead">🗂️ Phân hệ trong lớp</h2>
    ${navcards(b.modules.map(m=>({ic:m.ic,t:m.nm,s:`${m.tables.length} bảng`,href:href('module',m.id),color:C(b.id),mod:m.id})))}
    <h2 class="secthead">🔗 Liên kết liên quan</h2><div class="relwrap">
      ${otherLayers.map(x=>`<a class="relchip" href="${href('layer',x.id)}" style="--rc:${C(x.id)}">${x.ic} ${x.t}</a>`).join("")}
      ${flows.map(f=>`<a class="relchip flow" href="${href('flow',f.id)}">${f.ic} ${f.name}</a>`).join("")}
    </div>${footer()}</div>`;
}
function renderRole(){
  const r=ROLEBY[PAGE.id]; if(!r){renderHub();return;}
  const others=ROLEFLOWS.filter(x=>x._id!==PAGE.id);
  $("#app").innerHTML=header()+`<div class="wrap">
    ${crumb([{t:"Hub",href:"index.html"},{t:"Vai trò"},{t:r.nm}])}
    ${topicH(r.ic,r.layer,r.nm,`Luồng nghiệp vụ: ${r.d} · <b>${r.steps.length} bước</b>`,false)}
    <h2 class="secthead">🧭 Luồng công việc</h2><p class="secsub">Bấm một bước để mở phân hệ tương ứng.</p>
    ${chain(r.steps)}
    <h2 class="secthead">👥 Vai trò khác</h2><div class="relwrap">
      ${others.map(x=>`<a class="relchip" href="${href('role',x._id)}" style="--rc:${C(x.layer)}">${x.ic} ${x.nm}</a>`).join("")}
    </div>${footer()}</div>`;
}
function renderFlow(){
  const f=FLOWBY[PAGE.id]; if(!f){renderHub();return;}
  const mods=[...new Set(f.steps.map(s=>modId(s[1])))].filter(k=>MOD[k]);
  const relHTML=(f.related||[]).map(id=>{
    if(FLOWBY[id]) return `<a class="relchip flow" href="${href('flow',id)}">${FLOWBY[id].ic} ${FLOWBY[id].name}</a>`;
    if(MOD[id])    return `<a class="relchip" data-mod="${id}" href="${href('module',id)}" style="--rc:${C(MOD[id].band.id)}">${MOD[id].m.ic} ${MOD[id].m.nm}</a>`;
    return "";
  }).join("");
  $("#app").innerHTML=header()+`<div class="wrap">
    ${crumb([{t:"Hub",href:"index.html"},{t:"Luồng nghiệp vụ"},{t:f.name}])}
    ${topicH(f.ic,f.layer,f.name,`${f.desc} · <b>${f.steps.length} bước</b>`,false)}
    <h2 class="secthead">🧭 Hành trình</h2><p class="secsub">Bấm một bước để mở phân hệ tương ứng.</p>
    ${chain(f.steps)}
    <h2 class="secthead">🗂️ Phân hệ tham gia</h2>
    ${navcards(mods.map(k=>({ic:MOD[k].m.ic,t:MOD[k].m.nm,s:`${MOD[k].m.tables.length} bảng`,href:href('module',k),color:C(MOD[k].band.id),mod:k})))}
    <h2 class="secthead">🔗 Liên kết liên quan</h2><div class="relwrap">${relHTML}</div>
    ${footer()}</div>`;
}
function renderModule(){
  const e=MOD[PAGE.id]; if(!e){renderHub();return;} const {band,m}=e;
  const rel=relatedMods(PAGE.id);
  const flows=FLOWS.filter(f=>f.steps.some(s=>modId(s[1])===PAGE.id));
  $("#app").innerHTML=header()+`<div class="wrap">
    ${crumb([{t:"Hub",href:"index.html"},{t:band.title.split('—')[0].trim(),href:href('layer',band.id)},{t:m.nm}])}
    ${topicH(m.ic,band.id,m.nm,`${m.desc} · <b>${m.tables.length} bảng</b> · Lớp ${LAYMETA[band.id].t}`,true)}
    <h2 class="secthead">🗺️ Quan hệ với phân hệ khác</h2>
    ${moduleMapHTML(PAGE.id)}
    ${m.rel?`<div class="rel">🔗 <b>Quan hệ chính:</b> ${m.rel}</div>`:''}
    <h2 class="secthead">🗃️ Bảng dữ liệu (${m.tables.length})</h2><p class="secsub">Bấm một bảng để xem chi tiết.</p>
    <div class="tbl-grid">${m.tables.map(t=>`<div class="trow" data-tbl="${t[0]}"><span class="vn">${t[1]}</span><span class="tn">${t[0]}</span></div>`).join("")}</div>
    ${notesBlock(PAGE.id)}
    ${relatedBlock(rel, flows)}
    ${footer()}</div>`;
}

/* ---- Boot ---- */
const RENDER={hub:renderHub,layer:renderLayer,role:renderRole,flow:renderFlow,module:renderModule};
(RENDER[PAGE.type]||renderHub)();

function redraw(){ drawOverview(); drawMmap(); }
requestAnimationFrame(redraw);
window.addEventListener("load",redraw);
window.addEventListener("resize",()=>{clearTimeout(window.__t);window.__t=setTimeout(redraw,150);});
applyDone();

document.body.addEventListener("click",e=>{
  if(e.target.closest("#dwClose")||e.target===$("#dwBack")){closeDw();return;}
  if(e.target.closest("#modDone")){toggleDone(PAGE.id);return;}
  const tr=e.target.closest("[data-tbl]"); if(tr){ e.preventDefault(); openTable(tr.getAttribute("data-tbl")); }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeDw(); });
})();
