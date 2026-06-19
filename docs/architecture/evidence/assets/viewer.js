/* ============================================================================
   HIS — Evidence Viewer : LOGIC (vanilla JS, chạy file:// hoặc qua web)
   Đọc window.TP (data/*.js) + window.TP_IMAGES (manifest.js). Không phụ thuộc thư viện.
   ============================================================================ */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TP = window.TP || { meta: {}, layers: [], roles: [], candidateIssues: [], modules: [], flows: [], cross: [] };
  const IMAGES = (window.TP_IMAGES || []).slice();
  const CATS = ["happy", "negative", "edge", "validation", "permission", "state", "data-consistency", "ui", "integration", "security"];

  if (!window.TP) {
    $("#main").innerHTML = '<div class="empty-main"><h3>Chưa có dữ liệu test-plan</h3>' +
      '<p>File <code>data/00-bootstrap.js</code> chưa được sinh. Chạy workflow <code>his-testplan-evidence</code> để tạo dữ liệu.</p></div>';
  }

  /* ---------- INDEX ẢNH ---------- */
  const base = (p) => p.split("/").pop().replace(/\.(png|jpe?g|webp|gif|bmp)$/i, "");
  const byBasename = {}, byBasenameLC = {}, byTaskPrefix = {};
  IMAGES.forEach((p) => {
    const bn = base(p);
    byBasename[bn] = p; byBasenameLC[bn.toLowerCase()] = p;
    const tid = bn.split("__")[0];
    (byTaskPrefix[tid] = byTaskPrefix[tid] || []).push(p);
  });
  const resolveImg = (name) => byBasename[name] || byBasenameLC[String(name).toLowerCase()] || null;
  const guessState = (bn) => { const parts = bn.split("__"); return parts.length ? parts[parts.length - 1] : ""; };

  function slotImages(task) {
    const out = [], defined = new Set();
    (task.evidence || []).forEach((sl) => {
      defined.add(sl.name);
      const p = resolveImg(sl.name);
      out.push({ key: sl.name, path: p, caption: sl.caption || "", uiState: sl.uiState || guessState(sl.name), missing: !p, defined: true });
    });
    (byTaskPrefix[task.id] || []).forEach((p) => {
      const bn = base(p);
      if (!defined.has(bn)) out.push({ key: bn, path: p, caption: "(evidence bổ sung)", uiState: guessState(bn), missing: false, defined: false, extra: true });
    });
    return out;
  }

  /* ---------- STATUS (localStorage) ---------- */
  const ST_KEY = (id) => "tp:status:" + id;
  const getStatus = (id) => { try { return localStorage.getItem(ST_KEY(id)) || ""; } catch (e) { return ""; } };
  const setStatus = (id, v) => { try { v ? localStorage.setItem(ST_KEY(id), v) : localStorage.removeItem(ST_KEY(id)); } catch (e) {} };

  /* ---------- COVERAGE ---------- */
  function moduleCoverage(m) {
    let slots = 0, shot = 0, tasks = (m.tasks || []).length;
    (m.tasks || []).forEach((t) => (t.evidence || []).forEach((sl) => { slots++; if (resolveImg(sl.name)) shot++; }));
    return { tasks, slots, shot, pct: slots ? Math.round((shot / slots) * 100) : 0 };
  }
  const allItems = () => TP.modules.concat(TP.flows.map((f) => Object.assign({ _flow: true }, f)))
    .concat(TP.cross.map((c) => Object.assign({ _cross: true }, c)));

  /* ---------- FILTER ---------- */
  const F = { q: "", cat: "", pri: "", ev: "" };
  function matchTask(t) {
    if (F.cat && t.category !== F.cat) return false;
    if (F.pri && t.priority !== F.pri) return false;
    if (F.ev) {
      const has = (t.evidence || []).some((sl) => resolveImg(sl.name)) || (byTaskPrefix[t.id] || []).length > 0;
      if (F.ev === "has" && !has) return false;
      if (F.ev === "none" && has) return false;
    }
    if (F.q) {
      const hay = (t.id + " " + t.title + " " + (t.steps || []).join(" ") + " " + (t.expected || "") + " " + (t.role || "")).toLowerCase();
      if (!hay.includes(F.q)) return false;
    }
    return true;
  }
  const filteredTasks = (it) => (it.tasks || []).filter(matchTask);

  /* ---------- SIDEBAR ---------- */
  function buildNav() {
    const nav = $("#nav");
    let h = "";
    h += '<div class="nav-item home" data-go="overview"><span class="ic">📊</span><span class="nm">Tổng quan coverage</span></div>';
    TP.layers.forEach((L) => {
      const mods = TP.modules.filter((m) => m.layer === L.id);
      if (!mods.length) return;
      h += `<div class="nav-layer"><i style="background:${L.color}"></i>${esc(L.nm)}</div>`;
      mods.forEach((m) => {
        const cv = moduleCoverage(m), fc = filteredTasks(m).length;
        const show = !anyFilter() || fc > 0 || m.nm.toLowerCase().includes(F.q);
        if (!show) return;
        h += `<div class="nav-item" data-go="module" data-id="${m.id}">
          <span class="ic">${m.ic || "📦"}</span>
          <span class="nm">${esc(m.nm)} ${m.gap ? '<span class="gapdot" title="chưa có issue test riêng">●</span>' : ""}</span>
          <span class="badge">${anyFilter() ? fc + "/" : ""}${cv.tasks}</span>
        </div><div class="mini" title="evidence ${cv.shot}/${cv.slots}"><i style="width:${cv.pct}%"></i></div>`;
      });
    });
    if (TP.flows.length) {
      h += '<div class="nav-sec">🔗 Luồng hành trình bệnh nhân</div>';
      TP.flows.forEach((f) => {
        const fc = filteredTasks(f).length;
        if (anyFilter() && fc === 0 && !f.nm.toLowerCase().includes(F.q)) return;
        h += `<div class="nav-item" data-go="flow" data-id="${f.id}"><span class="ic">${f.ic || "🔁"}</span>
          <span class="nm">${esc(f.nm)}</span><span class="badge">${anyFilter() ? fc + "/" : ""}${(f.tasks || []).length}</span></div>`;
      });
    }
    if (TP.cross.length) {
      h += '<div class="nav-sec">🧩 Cross-cutting & bù coverage</div>';
      TP.cross.forEach((c) => {
        const fc = filteredTasks(c).length;
        if (anyFilter() && fc === 0 && !((c.title || "").toLowerCase().includes(F.q))) return;
        h += `<div class="nav-item" data-go="cross" data-id="${c.id}"><span class="ic">🧩</span>
          <span class="nm">${esc(c.title || c.id)}</span><span class="badge">${anyFilter() ? fc + "/" : ""}${(c.tasks || []).length}</span></div>`;
      });
    }
    if ((TP.candidateIssues || []).length)
      h += '<div class="nav-item" data-go="candidates"><span class="ic">🆕</span><span class="nm">Đề xuất issue mới</span><span class="badge">' + TP.candidateIssues.length + '</span></div>';
    nav.innerHTML = h;
  }
  const anyFilter = () => F.q || F.cat || F.pri || F.ev;

  /* ---------- KPI ---------- */
  function buildKpi() {
    let slots = 0, shot = 0, tasks = 0;
    allItems().forEach((it) => (it.tasks || []).forEach((t) => { tasks++; (t.evidence || []).forEach((sl) => { slots++; if (resolveImg(sl.name)) shot++; }); }));
    const k = [
      ["Phân hệ", TP.modules.length], ["Luồng", TP.flows.length], ["Task", tasks],
      ["Evidence", shot + "/" + slots], ["Issue mới?", (TP.candidateIssues || []).length],
    ];
    $("#kpis").innerHTML = k.map((x) => `<div class="kpi"><b>${x[1]}</b>${x[0]}</div>`).join("");
  }

  /* ---------- RENDER TASK ---------- */
  function taskCard(t) {
    const imgs = slotImages(t);
    const st = getStatus(t.id) || "todo";
    const stLabel = { todo: "chưa test", pass: "PASS", fail: "FAIL", blocked: "BLOCKED", skip: "SKIP" }[st];
    let ev = imgs.map((im, i) => {
      const thumb = im.path
        ? `<div class="thumb" data-lb="${esc(t.id)}" data-i="${i}"><img loading="lazy" src="${esc(im.path)}" alt="${esc(im.key)}"></div>`
        : `<div class="thumb empty"><span class="big">📷</span>chưa chụp</div>`;
      return `<div class="ev ${im.extra ? "extra" : ""}">${thumb}
        <div class="meta"><span class="st ${im.missing ? "missing" : ""}">${esc(im.uiState || "—")}</span>
        <div class="cap">${esc(im.caption)}</div><div class="fn">${esc(im.key)}.png</div></div></div>`;
    }).join("");
    if (!imgs.length) ev = '<div class="notes">— Task không gắn evidence slot —</div>';
    return `<div class="task" id="t-${esc(t.id)}">
      <div class="task-h">
        <span class="tid">${esc(t.id)}</span>
        <span class="cat ${esc(t.category)}">${esc(t.category)}</span>
        <span class="pri ${esc(t.priority)}">${esc(t.priority)}</span>
        <span class="tt">${esc(t.title)}</span>
        ${t.role ? `<span class="role">👤 ${esc(t.role)}</span>` : ""}
        ${(t.refIssues && t.refIssues.length) ? `<span class="refs">↪ ${esc(t.refIssues.join(" "))}</span>` : ""}
      </div>
      <div class="task-body">
        ${t.preconditions ? `<div class="fld"><span class="lbl">Tiền điều kiện</span>${esc(t.preconditions)}</div>` : ""}
        ${(t.steps && t.steps.length) ? `<div class="fld"><span class="lbl">Các bước</span><ol class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
        <div class="fld"><span class="lbl">Kết quả mong đợi</span><div class="expected">${esc(t.expected)}</div></div>
        ${t.notes ? `<div class="notes">📝 ${esc(t.notes)}</div>` : ""}
      </div>
      <div class="statusbar">
        <span class="st-pill ${st}">${stLabel}</span>
        <select data-status="${esc(t.id)}">
          <option value="">— đặt trạng thái —</option>
          <option value="pass"${st === "pass" ? " selected" : ""}>PASS</option>
          <option value="fail"${st === "fail" ? " selected" : ""}>FAIL</option>
          <option value="blocked"${st === "blocked" ? " selected" : ""}>BLOCKED</option>
          <option value="skip"${st === "skip" ? " selected" : ""}>SKIP</option>
        </select>
      </div>
      <div class="ev-strip">${ev}</div>
    </div>`;
  }

  function tasksBlock(it) {
    const ts = filteredTasks(it);
    if (!ts.length) return '<div class="empty-main">Không có task khớp bộ lọc.</div>';
    const groups = {};
    ts.forEach((t) => (groups[t.category] = groups[t.category] || []).push(t));
    let h = "";
    CATS.forEach((c) => { if (groups[c]) { h += `<div class="secthead">${c} · ${groups[c].length} task</div>` + groups[c].map(taskCard).join(""); } });
    return h;
  }

  /* ---------- VIEWS ---------- */
  function viewOverview() {
    let h = '<div class="crumbs"><b>Tổng quan coverage</b></div>';
    h += '<div class="secthead">Tiến độ evidence theo phân hệ</div><div class="ov-grid">';
    TP.layers.forEach((L) => {
      TP.modules.filter((m) => m.layer === L.id).forEach((m) => {
        const cv = moduleCoverage(m);
        h += `<div class="ov-card" data-go="module" data-id="${m.id}" style="border-top-color:${L.color}">
          <div class="ovh"><span class="ic">${m.ic || "📦"}</span><span class="nm">${esc(m.nm)}</span><span class="cnt">${cv.tasks} task</span></div>
          <div class="bar"><i style="width:${cv.pct}%;background:${cv.pct === 100 ? "var(--ok)" : cv.pct ? "var(--warn)" : "var(--line)"}"></i></div>
          <div class="ovm"><span>evidence ${cv.shot}/${cv.slots}</span><span>${cv.pct}%${m.gap ? " · ⚠ gap" : ""}</span></div></div>`;
      });
    });
    h += "</div>";
    if (TP.flows.length) {
      h += '<div class="secthead">🔗 Luồng hành trình bệnh nhân</div><div class="ov-grid">';
      TP.flows.forEach((f) => {
        h += `<div class="ov-card" data-go="flow" data-id="${f.id}"><div class="ovh"><span class="ic">${f.ic || "🔁"}</span>
          <span class="nm">${esc(f.nm)}</span><span class="cnt">${(f.tasks || []).length} task</span></div></div>`;
      });
      h += "</div>";
    }
    if ((TP.candidateIssues || []).length) {
      h += '<div class="secthead">🆕 Phân hệ/chiều test CHƯA có issue — đề xuất tạo mới (cần duyệt)</div>';
      h += renderCandidates();
    }
    return h;
  }

  function renderCandidates() {
    return '<div class="cand"><h4>⚠ ' + (TP.candidateIssues || []).length + ' đề xuất issue mới (KHÔNG tự tạo — chờ duyệt)</h4>' +
      (TP.candidateIssues || []).map((c) => `<div class="ci"><b>${esc(c.title)}</b> — ${esc(c.reason)} ${c.suggestedLabels ? `<code>${esc((c.suggestedLabels || []).join(", "))}</code>` : ""}</div>`).join("") + "</div>";
  }

  function viewModule(id) {
    const m = TP.modules.find((x) => x.id === id);
    if (!m) return '<div class="empty-main">Không tìm thấy phân hệ.</div>';
    const L = TP.layers.find((x) => x.id === m.layer) || { color: "#475569", nm: m.layer };
    const cv = moduleCoverage(m);
    let h = `<div class="crumbs">Phân hệ · ${esc(L.nm)} · <b>${esc(m.nm)}</b></div>`;
    h += `<div class="mhead" style="border-left-color:${L.color}">
      <span class="ic">${m.ic || "📦"}</span>
      <div><h2>${esc(m.nm)}</h2><div class="sub">${esc(m.summary || "")}</div>
        <div class="tagrow">
          <span class="tag layer" style="background:${L.color}">${esc(L.nm)}</span>
          ${(m.gh && m.gh.length) ? m.gh.map((g) => `<span class="tag gh">GitHub ${esc(g)}</span>`).join("") : ""}
          ${m.gap ? '<span class="tag gap">⚠ chưa có issue test — candidate</span>' : ""}
        </div></div>
      <div class="prog"><div class="pl">evidence</div><div class="pv">${cv.pct}%</div><div class="pl">${cv.shot}/${cv.slots} ảnh · ${cv.tasks} task</div></div></div>`;
    if (m.screens && m.screens.length) {
      h += '<div class="secthead">🖥️ Màn hình</div><div class="screens">';
      h += m.screens.map((s) => `<div class="scr"><div class="sn">${esc(s.name)}</div>
        ${s.route_guess ? `<div class="sr">${esc(s.route_guess)}</div>` : ""}
        <div class="sd">${esc(s.desc || "")}</div>
        ${(s.elements && s.elements.length) ? `<div class="els">${s.elements.map((e) => `<span>${esc(e)}</span>`).join("")}</div>` : ""}</div>`).join("");
      h += "</div>";
    }
    if (m.ui_state_checklist && m.ui_state_checklist.length)
      h += `<div class="secthead">✅ Checklist trạng thái UI (mỗi trạng thái cần evidence)</div><div class="scr" style="margin-bottom:14px">${m.ui_state_checklist.map((x) => `• ${esc(x)}`).join("<br>")}</div>`;
    h += '<div class="secthead" style="margin-top:14px">🧪 Test-task & evidence</div>' + tasksBlock(m);
    if (m.gaps && m.gaps.length)
      h += `<div class="secthead">🔍 Gap đã ghi nhận</div><div class="cand"><h4>Góc nhìn còn thiếu</h4>${m.gaps.map((g) => `<div class="ci">${esc(g)}</div>`).join("")}</div>`;
    return h;
  }

  function viewFlow(id) {
    const f = TP.flows.find((x) => x.id === id);
    if (!f) return '<div class="empty-main">Không tìm thấy luồng.</div>';
    let h = `<div class="crumbs">Luồng · <b>${esc(f.nm)}</b></div>`;
    h += `<div class="mhead" style="border-left-color:#0d9488"><span class="ic">${f.ic || "🔁"}</span>
      <div><h2>${esc(f.nm)}</h2><div class="sub">${esc(f.summary || "")}</div>
      <div class="tagrow">${(f.gh || []).map((g) => `<span class="tag gh">GitHub ${esc(g)}</span>`).join("")}</div></div></div>`;
    h += tasksBlock(f);
    if (f.gaps && f.gaps.length) h += `<div class="cand"><h4>Gap</h4>${f.gaps.map((g) => `<div class="ci">${esc(g)}</div>`).join("")}</div>`;
    return h;
  }

  function viewCross(id) {
    const c = TP.cross.find((x) => x.id === id);
    if (!c) return '<div class="empty-main">Không tìm thấy.</div>';
    let h = `<div class="crumbs">Cross-cutting · <b>${esc(c.title || c.id)}</b></div>`;
    h += `<div class="mhead" style="border-left-color:#7c3aed"><span class="ic">🧩</span>
      <div><h2>${esc(c.title || c.id)}</h2><div class="sub">${esc(c.summary || "")}</div></div></div>`;
    h += tasksBlock(c);
    if (c.candidate_issues && c.candidate_issues.length) h += renderCandidatesList(c.candidate_issues);
    return h;
  }
  function renderCandidatesList(list) {
    return '<div class="cand"><h4>🆕 Đề xuất issue mới</h4>' + list.map((x) => `<div class="ci"><b>${esc(x.title)}</b> — ${esc(x.reason)}</div>`).join("") + "</div>";
  }

  /* ---------- ROUTER ---------- */
  function render() {
    const m = $("#main");
    const [type, id] = (location.hash.replace(/^#/, "").split("/"));
    let html;
    if (type === "module") html = viewModule(id);
    else if (type === "flow") html = viewFlow(id);
    else if (type === "cross") html = viewCross(id);
    else if (type === "candidates") html = '<div class="crumbs"><b>Đề xuất issue mới</b></div>' + renderCandidates();
    else html = viewOverview();
    m.innerHTML = html;
    m.scrollTop = 0;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active",
      n.getAttribute("data-go") === (type || "overview") && (n.getAttribute("data-id") || "") === (id || "")));
  }

  /* ---------- LIGHTBOX ---------- */
  let lbList = [], lbIdx = 0, lbTitle = "";
  function openLb(taskId, i) {
    const t = allItems().flatMap((it) => it.tasks || []).find((x) => x.id === taskId);
    if (!t) return;
    lbTitle = t.id + " — " + t.title;
    lbList = slotImages(t).filter((x) => x.path);
    lbIdx = Math.max(0, Math.min(i, lbList.length - 1));
    // map clicked slot index (incl missing) to lbList index
    const clicked = slotImages(t)[i];
    if (clicked && clicked.path) lbIdx = lbList.findIndex((x) => x.key === clicked.key);
    if (lbIdx < 0) lbIdx = 0;
    $("#lb").hidden = false; paintLb();
  }
  function paintLb() {
    const im = lbList[lbIdx]; if (!im) { $("#lb").hidden = true; return; }
    $("#lbImg").src = im.path; $("#lbImg").alt = im.key;
    $("#lbCap").innerHTML = `<div class="ttl">${esc(lbTitle)}</div><div class="sub">[${esc(im.uiState)}] ${esc(im.caption)} · ${esc(im.key)}.png</div>`;
    $("#lbCount").textContent = (lbIdx + 1) + " / " + lbList.length;
    $("#lbPrev").disabled = lbIdx <= 0; $("#lbNext").disabled = lbIdx >= lbList.length - 1;
  }
  const closeLb = () => { $("#lb").hidden = true; $("#lbImg").src = ""; };
  const stepLb = (d) => { lbIdx = Math.max(0, Math.min(lbList.length - 1, lbIdx + d)); paintLb(); };

  /* ---------- WIRING ---------- */
  function wire() {
    document.body.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]");
      if (go) { const t = go.getAttribute("data-go"), id = go.getAttribute("data-id"); location.hash = id ? t + "/" + id : t; return; }
      const lb = e.target.closest("[data-lb]");
      if (lb) { openLb(lb.getAttribute("data-lb"), parseInt(lb.getAttribute("data-i"), 10)); return; }
    });
    document.body.addEventListener("change", (e) => {
      const s = e.target.closest("[data-status]");
      if (s) { setStatus(s.getAttribute("data-status"), s.value); render(); buildNav(); }
    });
    $("#lbX").onclick = closeLb; $("#lbPrev").onclick = () => stepLb(-1); $("#lbNext").onclick = () => stepLb(1);
    $("#lb").addEventListener("click", (e) => { if (e.target.id === "lb") closeLb(); });
    document.addEventListener("keydown", (e) => {
      if ($("#lb").hidden) return;
      if (e.key === "Escape") closeLb(); else if (e.key === "ArrowLeft") stepLb(-1); else if (e.key === "ArrowRight") stepLb(1);
    });
    const reflt = () => { buildNav(); render(); };
    $("#q").addEventListener("input", (e) => { F.q = e.target.value.trim().toLowerCase(); reflt(); });
    $("#fCat").addEventListener("change", (e) => { F.cat = e.target.value; reflt(); });
    $("#fPri").addEventListener("change", (e) => { F.pri = e.target.value; reflt(); });
    $("#fEv").addEventListener("change", (e) => { F.ev = e.target.value; reflt(); });
    window.addEventListener("hashchange", render);
    $("#themeBtn").onclick = () => {
      const b = document.body, dark = b.getAttribute("data-theme") === "dark";
      b.setAttribute("data-theme", dark ? "light" : "dark"); $("#themeBtn").textContent = dark ? "🌙" : "☀️";
      try { localStorage.setItem("tp:theme", dark ? "light" : "dark"); } catch (e) {}
    };
    try { const th = localStorage.getItem("tp:theme"); if (th) { document.body.setAttribute("data-theme", th); $("#themeBtn").textContent = th === "dark" ? "☀️" : "🌙"; } } catch (e) {}
  }

  /* ---------- BOOT ---------- */
  if (window.TP) { const bn = $("#bootNote"); if (bn) bn.remove(); buildKpi(); buildNav(); wire(); render(); }
})();
