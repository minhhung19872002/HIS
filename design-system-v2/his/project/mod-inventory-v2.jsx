// =====================================================================
// HIS Terminal · Module: KHO TỔNG (Inventory v2)
// Quản lý nhập-xuất-kiểm kê thuốc & vật tư y tế
// =====================================================================

const IV_WAREHOUSES = [
  { v: "WH-MAIN",  l: "Kho Tổng",        type: "main",     loc: "Tầng B1 · Hậu cần",  manager: "DS. Nguyễn Thị Hoa" },
  { v: "WH-PHARM", l: "Kho Dược nội trú",type: "pharmacy", loc: "Tầng 1 · Nhà A",      manager: "DS. Trần Minh Hằng" },
  { v: "WH-OPD",   l: "Kho Dược ngoại trú", type: "pharmacy", loc: "Tầng 1 · Nhà B",   manager: "DS. Lê Văn Tú" },
  { v: "WH-OR",    l: "Kho Phẫu thuật",  type: "supply",   loc: "Tầng 4 · Khu PT",     manager: "ĐD. Vũ Thị Lan" },
  { v: "WH-LAB",   l: "Kho Hoá chất XN", type: "reagent",  loc: "Tầng 2 · Khoa XN",    manager: "KTV. Phạm Anh" },
  { v: "WH-ER",    l: "Kho Cấp cứu",     type: "supply",   loc: "Tầng 1 · Khoa CC",    manager: "ĐD. Đỗ Văn Hùng" },
];

const IV_CATS = [
  { v: "drug-anti", l: "Kháng sinh", g: "drug" },
  { v: "drug-pain", l: "Giảm đau",   g: "drug" },
  { v: "drug-cv",   l: "Tim mạch",   g: "drug" },
  { v: "drug-iv",   l: "Dịch truyền",g: "drug" },
  { v: "drug-vac",  l: "Vắc-xin",    g: "drug" },
  { v: "supply",    l: "Vật tư tiêu hao", g: "supply" },
  { v: "reagent",   l: "Hoá chất XN",g: "reagent" },
];

const IV_SUPPLIERS = [
  { v: "SUP-01", l: "Cty CP Dược Hậu Giang",      tax: "1800156801", phone: "0292 3891 433" },
  { v: "SUP-02", l: "Cty TNHH Dược phẩm Sanofi",  tax: "0301484060", phone: "028 3829 9000" },
  { v: "SUP-03", l: "Cty CP Traphaco",            tax: "0100108656", phone: "024 3854 8112" },
  { v: "SUP-04", l: "Cty CP Vimedimex",           tax: "0100109385", phone: "024 3826 8265" },
  { v: "SUP-05", l: "Cty TNHH B. Braun Việt Nam", tax: "0301519568", phone: "024 3633 7775" },
  { v: "SUP-06", l: "Cty CP Sao Thái Dương",      tax: "0102012343", phone: "024 6661 8666" },
];

const IV_KIND = {
  in:       { l: "Nhập kho",     tone: "ok",    ic: "download",    s: "NK" },
  out:      { l: "Xuất kho",     tone: "info",  ic: "upload",      s: "XK" },
  transfer: { l: "Chuyển kho",   tone: "info",  ic: "switch",      s: "CK" },
  adjust:   { l: "Điều chỉnh",   tone: "warn",  ic: "edit",        s: "ĐC" },
  count:    { l: "Kiểm kê",      tone: "info",  ic: "list",        s: "KK" },
  return:   { l: "Trả NCC",      tone: "warn",  ic: "back",        s: "TR" },
  destroy:  { l: "Tiêu huỷ",     tone: "crit",  ic: "trash",       s: "HT" },
};

const IV_STATUS = [
  { v: "draft",    l: "Nháp",       tone: "info" },
  { v: "pending",  l: "Chờ duyệt",  tone: "warn" },
  { v: "approved", l: "Đã duyệt",   tone: "info" },
  { v: "done",     l: "Hoàn tất",   tone: "ok" },
  { v: "rejected", l: "Từ chối",    tone: "crit" },
];

// ── Seed items ──
const IV_BRAND_RX = ["Augmentin 1g","Klamentin 875mg","Cefuroxim 500mg","Amoxicillin 500mg","Paracetamol 500mg","Efferalgan 500mg","Panadol Extra","Ibuprofen 400mg","Aspirin 81mg","Diclofenac 75mg",
  "Lisinopril 10mg","Amlodipin 5mg","Bisoprolol 5mg","Atorvastatin 20mg","Metformin 850mg","Losartan 50mg","Glucose 5% 500ml","NaCl 0.9% 500ml","Ringer Lactat 500ml","Glucose 10% 500ml",
  "Vắc-xin MMR","Vắc-xin DTP","Vắc-xin Viêm gan B","Vắc-xin Cúm mùa","Heparin 25000UI","Insulin Mixtard","Adrenalin 1mg","Atropin 0.25mg","Morphin 10mg","Diazepam 5mg"];
const IV_BRAND_SUP = ["Bơm tiêm 5ml","Bơm tiêm 10ml","Kim luồn 22G","Kim luồn 24G","Dây truyền dịch","Găng tay y tế (M)","Găng phẫu thuật","Khẩu trang y tế",
  "Bông gòn 100g","Băng gạc vô trùng","Cồn 70°","Povidine","Chỉ Vicryl","Chỉ Ethilon","Ống hút đờm","Catheter Foley"];
const IV_BRAND_REA = ["Glucose Test Strip","HbA1c Reagent","CRP Reagent","BUN/Creatinin","Troponin I","D-Dimer","HBsAg Rapid","HIV Combo Rapid"];
const IV_UNITS_DRUG = ["Viên","Lọ","Chai","Vỉ"];
const IV_UNITS_SUP = ["Cái","Hộp","Cuộn"];

// seedRand, todayIv, daysIv are provided by mod-v2-kit.jsx (loaded before this)
const __r = seedRand(20260503);

const IV_ITEMS = [];
let __idx = 1;
const buildItem = (brand, cat) => {
  const cb = IV_CATS.find(c => c.v === cat);
  const grp = cb.g;
  const code = grp === "drug" ? `T${String(__idx).padStart(4,"0")}` : grp === "supply" ? `VT${String(__idx).padStart(4,"0")}` : `HC${String(__idx).padStart(4,"0")}`;
  __idx++;
  const unit = grp === "drug" ? IV_UNITS_DRUG[Math.floor(__r()*4)] : grp === "supply" ? IV_UNITS_SUP[Math.floor(__r()*3)] : "Lọ";
  const minStock = Math.floor(__r()*200) + 50;
  const stock = __r() > 0.85 ? Math.floor(__r()*minStock*0.6) : Math.floor(__r()*1500) + minStock;
  const maxStock = Math.floor(minStock*8) + 200;
  const unitPrice = grp === "drug" ? Math.floor(__r()*8000)+1500 : grp === "supply" ? Math.floor(__r()*15000)+2000 : Math.floor(__r()*200000)+50000;
  const numLots = Math.floor(__r()*3) + 1;
  const lots = [];
  for (let i=0; i<numLots; i++) {
    const expDays = Math.floor(__r()*900) - 90;
    lots.push({
      lot: `L${String(2024 + Math.floor(__r()*2)).slice(2)}${String(Math.floor(__r()*99)+1).padStart(2,"0")}${String(Math.floor(__r()*99)+1).padStart(3,"0")}`,
      qty: Math.floor(stock/numLots) + (i === 0 ? stock % numLots : 0),
      exp: daysIv(expDays),
      sup: IV_SUPPLIERS[Math.floor(__r()*IV_SUPPLIERS.length)].v,
      received: daysIv(expDays - 540),
    });
  }
  return {
    id: code, name: brand, cat, group: grp, unit, unitPrice, stock, minStock, maxStock,
    bhytCode: grp === "drug" ? `BHYT-${String(__idx).padStart(5,"0")}` : null,
    activeIngr: grp === "drug" ? brand.split(" ")[0] : null,
    location: `Kệ ${String.fromCharCode(65 + __idx % 8)}-${(__idx % 12)+1}`,
    lots,
    warehouse: grp === "drug" ? (__r() > 0.5 ? "WH-PHARM" : "WH-OPD") : grp === "supply" ? (__r() > 0.7 ? "WH-OR" : "WH-MAIN") : "WH-LAB",
  };
};

IV_BRAND_RX.forEach((b, i) => {
  const cat = i < 4 ? "drug-anti" : i < 10 ? "drug-pain" : i < 16 ? "drug-cv" : i < 20 ? "drug-iv" : i < 24 ? "drug-vac" : "drug-pain";
  IV_ITEMS.push(buildItem(b, cat));
});
IV_BRAND_SUP.forEach((b) => IV_ITEMS.push(buildItem(b, "supply")));
IV_BRAND_REA.forEach((b) => IV_ITEMS.push(buildItem(b, "reagent")));

// ── Seed movements ──
const seedMoves = () => {
  const r2 = seedRand(99999);
  const list = [];
  const kinds = Object.keys(IV_KIND);
  for (let i = 0; i < 80; i++) {
    const kind = kinds[Math.floor(r2() * kinds.length)];
    const dayOff = -Math.floor(r2() * 30);
    const numLines = Math.floor(r2() * 5) + 1;
    const lines = [];
    let total = 0;
    for (let j = 0; j < numLines; j++) {
      const it = IV_ITEMS[Math.floor(r2() * IV_ITEMS.length)];
      const q = Math.floor(r2() * 200) + 10;
      const lt = it.lots[0]?.lot || "L240101";
      lines.push({ id: it.id, name: it.name, unit: it.unit, qty: q, lot: lt, price: it.unitPrice });
      total += q * it.unitPrice;
    }
    const wh = IV_WAREHOUSES[Math.floor(r2() * IV_WAREHOUSES.length)].v;
    const wh2 = kind === "transfer" ? IV_WAREHOUSES[Math.floor(r2() * IV_WAREHOUSES.length)].v : null;
    const sup = (kind === "in" || kind === "return") ? IV_SUPPLIERS[Math.floor(r2() * IV_SUPPLIERS.length)].v : null;
    const status = i < 3 ? "pending" : i < 8 ? "approved" : i < 65 ? "done" : i < 75 ? "draft" : "rejected";
    const created = daysIv(dayOff);
    list.push({
      code: `${IV_KIND[kind].s}.${String(2026000 + i).padStart(7, "0")}`,
      kind, status,
      warehouse: wh, warehouseTo: wh2, supplier: sup,
      ref: kind === "in" ? `HD${String(Math.floor(r2()*10000)).padStart(5,"0")}/2026` : kind === "out" ? `YC${String(Math.floor(r2()*10000)).padStart(5,"0")}` : "",
      createdBy: ["DS. Hoa","DS. Hằng","DS. Tú","ĐD. Lan","KTV. Anh"][Math.floor(r2()*5)],
      createdAt: created,
      approvedBy: status === "approved" || status === "done" ? "BS. Linh" : null,
      approvedAt: status === "approved" || status === "done" ? daysIv(dayOff + 1) : null,
      lines, total,
      note: kind === "destroy" ? "Quá hạn sử dụng" : kind === "return" ? "Lỗi bao bì" : "",
      audit: [
        { t: created.getTime(), action: "Tạo phiếu", by: "Hệ thống", tone: "info" },
        ...(status !== "draft" ? [{ t: created.getTime()+3600000, action: "Trình duyệt", by: "DS. Hoa", tone: "info" }] : []),
        ...(status === "approved" || status === "done" ? [{ t: daysIv(dayOff+1).getTime(), action: "Duyệt phiếu", by: "BS. Linh", tone: "ok" }] : []),
        ...(status === "done" ? [{ t: daysIv(dayOff+1).getTime()+7200000, action: "Hoàn tất ghi nhận kho", by: "DS. Tú", tone: "ok" }] : []),
        ...(status === "rejected" ? [{ t: daysIv(dayOff).getTime()+3600000, action: "Từ chối: Sai mã sản phẩm", by: "BS. Linh", tone: "crit" }] : []),
      ],
    });
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
};

// ─── small helpers ───
const fmtNum = (n) => n.toLocaleString("vi-VN");
const shortVnd = (n) => n >= 1e9 ? (n/1e9).toFixed(1) + " tỷ" : n >= 1e6 ? (n/1e6).toFixed(0) + " tr" : fmtNum(n);
const whName = (id) => IV_WAREHOUSES.find(w => w.v === id)?.l || id;
const supName = (id) => IV_SUPPLIERS.find(s => s.v === id)?.l || id;
const catName = (id) => IV_CATS.find(c => c.v === id)?.l || id;

// ============ MAIN COMPONENT ============
function InventoryV2() {
  const [items, setItems] = uS(IV_ITEMS);
  const [moves, setMoves] = uS(seedMoves);
  const [tab, setTab] = uS("stock");
  const [stab, setStab] = uS("all");
  const [whFilter, setWhFilter] = uS("");
  const [catFilter, setCatFilter] = uS("");
  const [kindFilter, setKindFilter] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 14;

  // KPI
  const kpi = uM(() => {
    const totalValue = items.reduce((s, it) => s + it.stock * it.unitPrice, 0);
    const lowStock = items.filter(it => it.stock < it.minStock).length;
    const outOfStock = items.filter(it => it.stock === 0).length;
    const expiring = items.filter(it => it.lots.some(l => {
      const dd = (l.exp - todayIv) / 86400000;
      return dd > 0 && dd < 90;
    })).length;
    const expired = items.filter(it => it.lots.some(l => l.exp < todayIv)).length;
    const pending = moves.filter(m => m.status === "pending").length;
    const todayMoves = moves.filter(m => Math.abs((m.createdAt - todayIv)/86400000) < 1).length;
    return { totalValue, lowStock, outOfStock, expiring, expired, pending, todayMoves };
  }, [items, moves]);

  // FILTERS
  const filteredItems = uM(() => {
    let res = items;
    if (whFilter) res = res.filter(it => it.warehouse === whFilter);
    if (catFilter) res = res.filter(it => it.cat === catFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(it => it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q) || (it.bhytCode && it.bhytCode.toLowerCase().includes(q)));
    }
    if (tab === "low") res = res.filter(it => it.stock < it.minStock);
    if (tab === "expire") res = res.filter(it => it.lots.some(l => (l.exp - todayIv)/86400000 < 90));
    return res;
  }, [items, whFilter, catFilter, search, tab]);

  const filteredMoves = uM(() => {
    let res = moves;
    if (stab !== "all") res = res.filter(m => m.status === stab);
    if (kindFilter) res = res.filter(m => m.kind === kindFilter);
    if (whFilter) res = res.filter(m => m.warehouse === whFilter || m.warehouseTo === whFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(m => m.code.toLowerCase().includes(q) || m.ref.toLowerCase().includes(q) || m.lines.some(l => l.name.toLowerCase().includes(q)));
    }
    return res;
  }, [moves, stab, kindFilter, whFilter, search]);

  const moveCounts = { all: moves.length };
  IV_STATUS.forEach(s => moveCounts[s.v] = moves.filter(m => m.status === s.v).length);

  // Pagination per tab
  const isMoves = tab === "moves";
  const list = isMoves ? filteredMoves : filteredItems;
  const totalPages = Math.max(1, Math.ceil(list.length / PER));
  const paged = list.slice(page*PER, (page+1)*PER);
  uE(() => { setPage(0); }, [tab, stab, whFilter, catFilter, kindFilter, search]);

  // ACTIONS
  const upsertMove = (m) => setMoves(prev => {
    const i = prev.findIndex(x => x.code === m.code);
    if (i >= 0) { const c = [...prev]; c[i] = m; return c; }
    return [m, ...prev];
  });
  const approveMove = (code) => {
    setMoves(prev => prev.map(m => m.code === code ? {
      ...m, status: "approved", approvedBy: "BS. Linh", approvedAt: new Date(),
      audit: [...m.audit, { t: Date.now(), action: "Duyệt phiếu", by: "BS. Linh", tone: "ok" }],
    } : m));
    tk("Đã duyệt phiếu " + code);
  };
  const rejectMove = (code, reason) => {
    setMoves(prev => prev.map(m => m.code === code ? {
      ...m, status: "rejected",
      audit: [...m.audit, { t: Date.now(), action: "Từ chối: " + reason, by: "BS. Linh", tone: "crit" }],
    } : m));
    tw("Đã từ chối phiếu " + code);
  };
  const completeMove = (m) => {
    setMoves(prev => prev.map(x => x.code === m.code ? {
      ...x, status: "done",
      audit: [...x.audit, { t: Date.now(), action: "Hoàn tất " + IV_KIND[m.kind].l.toLowerCase(), by: "DS. Hoa", tone: "ok" }],
    } : x));
    setItems(prev => prev.map(it => {
      const line = m.lines.find(l => l.id === it.id);
      if (!line) return it;
      const delta = m.kind === "in" || m.kind === "transfer" ? line.qty : (m.kind === "out" || m.kind === "destroy" || m.kind === "return") ? -line.qty : 0;
      return { ...it, stock: Math.max(0, it.stock + delta) };
    }));
    tk("Đã ghi nhận tồn kho · " + m.code);
  };

  const openNewMove = (kind = "in") => HUI.open(cx => <NewMoveModal kind={kind} cx={cx} items={items} onSave={(m) => { upsertMove(m); cx(); tk("Đã lưu phiếu " + m.code); }} />);
  const openMoveDetail = (m) => HUI.drawer(cx => <MoveDrawer m={m} cx={cx} onApprove={() => { approveMove(m.code); cx(); }} onReject={(r) => { rejectMove(m.code, r); cx(); }} onComplete={() => { completeMove(m); cx(); }} />);
  const openItemDetail = (it) => HUI.drawer(cx => <ItemDrawer it={it} cx={cx} moves={moves} onAdjust={() => { cx(); openNewMove("adjust"); }} onTransfer={() => { cx(); openNewMove("transfer"); }} />);
  const openCount = () => HUI.open(cx => <CountModal cx={cx} items={items} onSave={(m) => { upsertMove(m); cx(); tk("Đã tạo phiếu kiểm kê " + m.code); }} />);

  // F2 = phiếu mới (nhập)
  uE(() => {
    const h = (e) => {
      if (e.key === "F2" && !e.target.closest("input,textarea,select,[contenteditable]")) {
        e.preventDefault();
        openNewMove("in");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [items]);

  // ── columns for each tab ──
  const stockCols = [
    { key: "id", label: "Mã", code: true, width: 110, render: r => r.id },
    { key: "name", label: "Tên hàng", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div>{r.activeIngr && <div style={{fontSize:11,color:"var(--t-2)"}}>{r.activeIngr} · {catName(r.cat)}</div>}</div> },
    { key: "wh", label: "Kho", width: 160, render: r => <span style={{fontSize:12,color:"var(--t-1)"}}>{whName(r.warehouse)}</span> },
    { key: "unit", label: "ĐV", width: 60, render: r => r.unit },
    { key: "stock", label: "Tồn", width: 90, mono: true, render: r => <b style={{color: r.stock === 0 ? "var(--s-crit)" : r.stock < r.minStock ? "var(--s-warn)" : "var(--t-0)"}}>{fmtNum(r.stock)}</b> },
    { key: "minmax", label: "Min/Max", width: 95, mono: true, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.minStock}/{r.maxStock}</span> },
    { key: "price", label: "Đơn giá", width: 110, mono: true, render: r => fmtNum(r.unitPrice) + " ₫" },
    { key: "status", label: "TT", width: 90, render: r => {
      if (r.stock === 0) return <StatusBadge tone="crit" dot>Hết</StatusBadge>;
      if (r.stock < r.minStock) return <StatusBadge tone="warn" dot>Sắp hết</StatusBadge>;
      if (r.stock > r.maxStock) return <StatusBadge tone="info">Vượt max</StatusBadge>;
      return <StatusBadge tone="ok">OK</StatusBadge>;
    }},
    { key: "exp", label: "HSD", width: 75, render: r => {
      const min = Math.min(...r.lots.map(l => (l.exp - todayIv)/86400000));
      if (min < 0) return <StatusBadge tone="crit">Quá hạn</StatusBadge>;
      if (min < 30) return <StatusBadge tone="crit">{Math.floor(min)}n</StatusBadge>;
      if (min < 90) return <StatusBadge tone="warn">{Math.floor(min)}n</StatusBadge>;
      return <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{Math.floor(min)}n</span>;
    }},
  ];

  const moveCols = [
    { key: "code", label: "Mã phiếu", code: true, width: 160, render: r => r.code },
    { key: "kind", label: "Loại", width: 110, render: r => <StatusBadge tone={IV_KIND[r.kind].tone}><Ico name={IV_KIND[r.kind].ic} size={11}/> <span style={{marginLeft:4}}>{IV_KIND[r.kind].l}</span></StatusBadge> },
    { key: "status", label: "TT", width: 100, render: r => { const s = IV_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
    { key: "wh", label: "Kho", render: r => <div><div>{whName(r.warehouse)}</div>{r.warehouseTo && <div style={{fontSize:11,color:"var(--t-2)"}}>→ {whName(r.warehouseTo)}</div>}</div> },
    { key: "lines", label: "Dòng", width: 60, mono: true, render: r => r.lines.length },
    { key: "total", label: "Tổng tiền", width: 130, mono: true, render: r => fmtNum(r.total) + " ₫" },
    { key: "ref", label: "Tham chiếu", width: 130, mono: true, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.ref || "—"}</span> },
    { key: "date", label: "Ngày", width: 95, mono: true, render: r => fmtDMYg(r.createdAt) },
    { key: "by", label: "Người tạo", width: 110, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.createdBy}</span> },
  ];

  const moveActions = (r) => (
    <div className="ab-row-act">
      {r.status === "pending" && (
        <>
          <ActBtn ic="check" title="Duyệt" onClick={() => approveMove(r.code)}/>
          <ActBtn ic="x" tone="crit" title="Từ chối" onClick={() => cf("Từ chối phiếu này?", () => rejectMove(r.code, "Sai số liệu"), { tone: "warn" })}/>
        </>
      )}
      {r.status === "approved" && <ActBtn ic="check" title="Hoàn tất" onClick={() => completeMove(r)}/>}
      <ActBtn ic="print" title="In phiếu" onClick={() => ti("Đang in " + r.code)}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Mã hàng", val: fmtNum(items.length), sub: "đang theo dõi" },
        { lbl: "Tổng giá trị tồn", val: shortVnd(kpi.totalValue), unit: " ₫", tone: "info" },
        { lbl: "Sắp hết", val: kpi.lowStock, sub: "< tồn min", tone: kpi.lowStock > 5 ? "warn" : null },
        { lbl: "Hết hàng", val: kpi.outOfStock, sub: "tồn = 0", tone: kpi.outOfStock > 0 ? "crit" : null },
        { lbl: "Sắp hết hạn", val: kpi.expiring, sub: "< 90 ngày", tone: "warn" },
        { lbl: "Phiếu chờ duyệt", val: kpi.pending, sub: `Hôm nay ${kpi.todayMoves}`, tone: kpi.pending > 0 ? "warn" : null },
      ]}/>

      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "stock",  l: "Tồn kho", ic: "package" },
        { v: "moves",  l: "Phiếu kho", ic: "list" },
        { v: "low",    l: `Sắp hết (${kpi.lowStock})`, ic: "alert" },
        { v: "expire", l: `Hạn dùng (${kpi.expiring})`, ic: "clock" },
      ]} actions={
        <>
          <button className="ab-btn ghost sm" onClick={() => openNewMove("in")}><Ico name="download" size={12}/> Nhập</button>
          <button className="ab-btn ghost sm" onClick={() => openNewMove("out")}><Ico name="upload" size={12}/> Xuất</button>
          <button className="ab-btn ghost sm" onClick={() => openNewMove("transfer")}><Ico name="switch" size={12}/> Chuyển kho</button>
          <button className="ab-btn ghost sm" onClick={openCount}><Ico name="list" size={12}/> Kiểm kê</button>
          <button className="ab-btn primary" onClick={() => openNewMove("in")}><Ico name="plus" size={12}/> Phiếu mới <kbd>F2</kbd></button>
        </>
      }/>

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={isMoves ? "Tìm mã phiếu / số HD / tên hàng…" : "Tìm mã / tên hàng / mã BHYT…"}/>
        <Filter value={whFilter} onChange={setWhFilter} options={IV_WAREHOUSES} placeholder="Tất cả kho"/>
        {!isMoves && <Filter value={catFilter} onChange={setCatFilter} options={IV_CATS} placeholder="Tất cả nhóm"/>}
        {isMoves && <Filter value={kindFilter} onChange={setKindFilter} options={Object.entries(IV_KIND).map(([k, v]) => ({ v: k, l: v.l }))} placeholder="Tất cả loại phiếu"/>}
      </div>

      {isMoves && <StatusTabs value={stab} onChange={setStab} tabs={IV_STATUS} counts={moveCounts}/>}

      <DataTable
        columns={isMoves ? moveCols : stockCols}
        data={paged}
        rowKey={r => isMoves ? r.code : r.id}
        onRowClick={isMoves ? openMoveDetail : openItemDetail}
        actions={isMoves ? moveActions : null}
      />

      <Pager page={page} setPage={setPage} totalPages={totalPages} total={list.length} perPage={PER}/>
    </div>
  );
}

// ============ Move Drawer ============
const MoveDrawer = ({ m, cx, onApprove, onReject, onComplete }) => {
  const [tab, setTab] = uS("info");
  const k = IV_KIND[m.kind];
  const s = IV_STATUS.find(x => x.v === m.status);
  return (
    <HUI.Drawer
      title={m.code}
      sub={<><span className={`ab-stat ${k.tone}`} style={{height:18,padding:"0 6px",fontSize:10,marginRight:6}}>{k.l}</span><span className={`ab-stat ${s.tone}`} style={{height:18,padding:"0 6px",fontSize:10}}>{s.l}</span></>}
      width={780}
      onClose={cx}
      tabs={[{ id: "info", label: "Thông tin" }, { id: "lines", label: `Chi tiết (${m.lines.length})` }, { id: "audit", label: `Lịch sử (${m.audit.length})` }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={() => ti("Đang in " + m.code)}><Ico name="print" size={12}/> In phiếu</button>
        {m.status === "pending" && <>
          <button className="ab-btn" onClick={() => cf("Từ chối phiếu này?", () => onReject("Sai số liệu"), { tone: "warn" })}><Ico name="x" size={12}/> Từ chối</button>
          <button className="ab-btn primary" onClick={onApprove}><Ico name="check" size={12}/> Duyệt phiếu</button>
        </>}
        {m.status === "approved" && <button className="ab-btn primary" onClick={onComplete}><Ico name="check" size={12}/> Hoàn tất</button>}
      </>}>
      {tab === "info" && (
        <DrSec title="Thông tin phiếu">
          <DrField lbl="Mã phiếu"><b style={{fontFamily:"var(--font-mono)"}}>{m.code}</b></DrField>
          <DrField lbl="Loại phiếu">{k.l}</DrField>
          <DrField lbl="Trạng thái">{s.l}</DrField>
          <DrField lbl="Tổng tiền"><b style={{fontFamily:"var(--font-mono)"}}>{fmtNum(m.total)} ₫</b></DrField>
          <DrField lbl="Kho">{whName(m.warehouse)}</DrField>
          {m.warehouseTo && <DrField lbl="Kho đích">{whName(m.warehouseTo)}</DrField>}
          {m.supplier && <DrField lbl="Nhà cung cấp">{supName(m.supplier)}</DrField>}
          {m.ref && <DrField lbl="Tham chiếu"><span style={{fontFamily:"var(--font-mono)"}}>{m.ref}</span></DrField>}
          <DrField lbl="Người tạo">{m.createdBy}</DrField>
          <DrField lbl="Ngày tạo">{fmtDTg(m.createdAt)}</DrField>
          {m.approvedBy && <DrField lbl="Người duyệt">{m.approvedBy}</DrField>}
          {m.approvedAt && <DrField lbl="Ngày duyệt">{fmtDTg(m.approvedAt)}</DrField>}
          {m.note && <DrField lbl="Ghi chú">{m.note}</DrField>}
        </DrSec>
      )}
      {tab === "lines" && (
        <div style={{padding:"14px 20px"}}>
          <table className="ab-tbl" style={{width:"100%"}}>
            <thead><tr>
              <th style={{width:90}}>Mã</th><th>Tên</th>
              <th style={{width:110}}>Lô</th>
              <th style={{width:60}}>ĐV</th>
              <th style={{width:80}} className="num">SL</th>
              <th style={{width:110}} className="num">Đơn giá</th>
              <th style={{width:120}} className="num">Thành tiền</th>
            </tr></thead>
            <tbody>
              {m.lines.map((l, i) => (
                <tr key={i}>
                  <td className="code">{l.id}</td>
                  <td>{l.name}</td>
                  <td className="mono" style={{fontSize:11}}>{l.lot}</td>
                  <td>{l.unit}</td>
                  <td className="mono" style={{textAlign:"right"}}>{l.qty}</td>
                  <td className="mono" style={{textAlign:"right"}}>{fmtNum(l.price)}</td>
                  <td className="mono" style={{textAlign:"right",fontWeight:600}}>{fmtNum(l.qty * l.price)}</td>
                </tr>
              ))}
              <tr style={{borderTop:"2px solid var(--line)",background:"var(--d-1)"}}>
                <td colSpan="6" style={{textAlign:"right",fontWeight:600}}>Tổng</td>
                <td className="mono" style={{textAlign:"right",fontWeight:700}}>{fmtNum(m.total)} ₫</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {tab === "audit" && (
        <DrSec title={`Nhật ký · ${m.audit.length} sự kiện`}>
          {m.audit.map((a, i) => <AuditLine key={i} entry={a}/>)}
        </DrSec>
      )}
    </HUI.Drawer>
  );
};

// ============ Item Drawer ============
const ItemDrawer = ({ it, cx, moves, onAdjust, onTransfer }) => {
  const [tab, setTab] = uS("info");
  const itMoves = moves.filter(m => m.lines.some(l => l.id === it.id)).slice(0, 30);
  const stockPct = Math.min(100, (it.stock / it.maxStock) * 100);
  const minPct = (it.minStock / it.maxStock) * 100;
  return (
    <HUI.Drawer
      title={it.name}
      sub={`${it.id} · ${catName(it.cat)} · ${it.unit}`}
      width={680}
      onClose={cx}
      tabs={[{ id: "info", label: "Thông tin" }, { id: "lots", label: `Lô · HSD (${it.lots.length})` }, { id: "moves", label: `Lịch sử (${itMoves.length})` }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={onAdjust}><Ico name="edit" size={12}/> Điều chỉnh</button>
        <button className="ab-btn" onClick={onTransfer}><Ico name="switch" size={12}/> Chuyển kho</button>
        <button className="ab-btn primary" onClick={() => ti("Đã in nhãn vạch")}><Ico name="qrcode" size={12}/> In nhãn</button>
      </>}>
      {tab === "info" && <>
        <DrSec title="Thông tin sản phẩm">
          <DrField lbl="Mã hàng"><b style={{fontFamily:"var(--font-mono)"}}>{it.id}</b></DrField>
          {it.bhytCode && <DrField lbl="Mã BHYT"><span style={{fontFamily:"var(--font-mono)"}}>{it.bhytCode}</span></DrField>}
          {it.activeIngr && <DrField lbl="Hoạt chất">{it.activeIngr}</DrField>}
          <DrField lbl="Đơn vị">{it.unit}</DrField>
          <DrField lbl="Đơn giá"><b style={{fontFamily:"var(--font-mono)"}}>{fmtNum(it.unitPrice)} ₫</b></DrField>
          <DrField lbl="Nhóm">{catName(it.cat)}</DrField>
          <DrField lbl="Kho">{whName(it.warehouse)}</DrField>
          <DrField lbl="Vị trí"><span style={{fontFamily:"var(--font-mono)"}}>{it.location}</span></DrField>
        </DrSec>
        <DrSec title="Tồn kho">
          <DrField lbl="Tồn hiện tại"><b style={{fontFamily:"var(--font-mono)",color: it.stock === 0 ? "var(--s-crit)" : it.stock < it.minStock ? "var(--s-warn)" : "var(--t-0)"}}>{fmtNum(it.stock)} {it.unit}</b></DrField>
          <DrField lbl="Min / Max"><span style={{fontFamily:"var(--font-mono)"}}>{it.minStock} / {it.maxStock}</span></DrField>
          <DrField lbl="Giá trị tồn"><b style={{fontFamily:"var(--font-mono)"}}>{fmtNum(it.stock * it.unitPrice)} ₫</b></DrField>
          <div style={{marginTop:10,padding:"6px 0"}}>
            <div style={{position:"relative",height:8,background:"var(--d-2)",borderRadius:4,overflow:"hidden"}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${stockPct}%`,background: it.stock < it.minStock ? "var(--s-warn)" : "var(--s-ok)"}}/>
              <div style={{position:"absolute",left:`${minPct}%`,top:-2,bottom:-2,width:1,background:"var(--s-crit)"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t-2)",marginTop:4,fontFamily:"var(--font-mono)"}}>
              <span>0</span><span>min: {it.minStock}</span><span>max: {it.maxStock}</span>
            </div>
          </div>
        </DrSec>
      </>}
      {tab === "lots" && (
        <div style={{padding:"14px 20px"}}>
          <table className="ab-tbl" style={{width:"100%"}}>
            <thead><tr>
              <th style={{width:120}}>Lô</th>
              <th style={{width:80}} className="num">SL</th>
              <th style={{width:100}}>Hạn dùng</th>
              <th style={{width:80}}>Còn (n)</th>
              <th>Nhà cung cấp</th>
              <th style={{width:100}}>Ngày nhập</th>
            </tr></thead>
            <tbody>
              {it.lots.map((l, i) => {
                const days = Math.floor((l.exp - todayIv) / 86400000);
                return (
                  <tr key={i}>
                    <td className="code">{l.lot}</td>
                    <td className="mono" style={{textAlign:"right"}}>{l.qty}</td>
                    <td className="mono">{fmtDMYg(l.exp)}</td>
                    <td><StatusBadge tone={days < 0 ? "crit" : days < 30 ? "crit" : days < 90 ? "warn" : "info"}>{days}n</StatusBadge></td>
                    <td style={{fontSize:12}}>{supName(l.sup)}</td>
                    <td className="mono" style={{fontSize:11}}>{fmtDMYg(l.received)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tab === "moves" && (
        <div style={{padding:"14px 20px"}}>
          {itMoves.length === 0 ? <div style={{color:"var(--t-2)",textAlign:"center",padding:"30px 0",fontSize:13}}>Chưa có lịch sử</div> :
          <table className="ab-tbl" style={{width:"100%"}}>
            <thead><tr>
              <th style={{width:160}}>Mã phiếu</th>
              <th style={{width:110}}>Loại</th>
              <th style={{width:70}} className="num">SL</th>
              <th style={{width:100}}>Ngày</th>
              <th>Người</th>
            </tr></thead>
            <tbody>
              {itMoves.map(m => {
                const line = m.lines.find(l => l.id === it.id);
                const k = IV_KIND[m.kind];
                return (
                  <tr key={m.code}>
                    <td className="code">{m.code}</td>
                    <td><StatusBadge tone={k.tone}>{k.l}</StatusBadge></td>
                    <td className="mono" style={{textAlign:"right"}}>{line?.qty || 0}</td>
                    <td className="mono" style={{fontSize:11}}>{fmtDMYg(m.createdAt)}</td>
                    <td style={{fontSize:12}}>{m.createdBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
        </div>
      )}
    </HUI.Drawer>
  );
};

// ============ New Move Modal ============
const NewMoveModal = ({ kind: initKind, cx, items, onSave }) => {
  const [kind, setKind] = uS(initKind);
  const [warehouse, setWarehouse] = uS("WH-MAIN");
  const [warehouseTo, setWarehouseTo] = uS("WH-PHARM");
  const [supplier, setSupplier] = uS("SUP-01");
  const [ref, setRef] = uS("");
  const [note, setNote] = uS("");
  const [lines, setLines] = uS([]);
  const [picker, setPicker] = uS("");
  const [errors, setErrors] = uS({});

  const filteredPick = uM(() => {
    if (!picker) return [];
    const q = picker.toLowerCase();
    return items.filter(it => it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q)).slice(0, 8);
  }, [picker, items]);

  const addLine = (it) => {
    if (lines.find(l => l.id === it.id)) { tw("Đã có mã " + it.id); return; }
    setLines(prev => [...prev, { id: it.id, name: it.name, unit: it.unit, qty: 1, lot: it.lots[0]?.lot || "", price: it.unitPrice }]);
    setPicker("");
  };
  const updLine = (i, patch) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const delLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const save = (status) => {
    const err = {};
    if (lines.length === 0) err.lines = "Phải có ít nhất 1 dòng";
    if ((kind === "in" || kind === "return") && !supplier) err.supplier = "Chọn NCC";
    if (kind === "transfer" && warehouse === warehouseTo) err.warehouseTo = "Kho đích phải khác kho nguồn";
    setErrors(err);
    if (Object.keys(err).length > 0) { tw("Vui lòng kiểm tra lại"); return; }
    const code = `${IV_KIND[kind].s}.${String(2026100 + Math.floor(Math.random()*900)).padStart(7,"0")}`;
    onSave({
      code, kind, status,
      warehouse, warehouseTo: kind === "transfer" ? warehouseTo : null,
      supplier: (kind === "in" || kind === "return") ? supplier : null,
      ref, note, lines, total,
      createdBy: "DS. Hoa", createdAt: new Date(),
      approvedBy: null, approvedAt: null,
      audit: [{ t: Date.now(), action: "Tạo phiếu" + (status === "pending" ? " và trình duyệt" : ""), by: "DS. Hoa", tone: "info" }],
    });
  };

  return (
    <HUI.Modal title={"Phiếu " + IV_KIND[kind].l.toLowerCase()} size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn" onClick={() => save("draft")}>Lưu nháp</button>
        <button className="ab-btn primary" onClick={() => save("pending")}><Ico name="check" size={12}/> Trình duyệt</button>
      </>}>
      <HUI.Row cols={2}>
        <HUI.Field label="Loại phiếu" required>
          <HUI.Select value={kind} onChange={e => setKind(e.target.value)} options={Object.entries(IV_KIND).map(([k, v]) => ({ value: k, label: v.l }))}/>
        </HUI.Field>
        <HUI.Field label={`Kho ${kind === "transfer" ? "nguồn" : ""}`}>
          <HUI.Select value={warehouse} onChange={e => setWarehouse(e.target.value)} options={IV_WAREHOUSES.map(w => ({ value: w.v, label: w.l }))}/>
        </HUI.Field>
        {kind === "transfer" && <HUI.Field label="Kho đích" required error={errors.warehouseTo}>
          <HUI.Select value={warehouseTo} onChange={e => setWarehouseTo(e.target.value)} options={IV_WAREHOUSES.map(w => ({ value: w.v, label: w.l }))}/>
        </HUI.Field>}
        {(kind === "in" || kind === "return") && <HUI.Field label="Nhà cung cấp" required error={errors.supplier}>
          <HUI.Select value={supplier} onChange={e => setSupplier(e.target.value)} options={IV_SUPPLIERS.map(s => ({ value: s.v, label: s.l }))}/>
        </HUI.Field>}
        <HUI.Field label="Số tham chiếu (HD/PT)">
          <HUI.Input value={ref} onChange={e => setRef(e.target.value)} placeholder="VD: HD12345/2026"/>
        </HUI.Field>
        <HUI.Field label="Ghi chú" span={2}>
          <HUI.Input value={note} onChange={e => setNote(e.target.value)} placeholder={kind === "destroy" ? "Lý do tiêu huỷ" : "Tuỳ chọn"}/>
        </HUI.Field>
      </HUI.Row>

      <div style={{marginTop: 18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <h4 style={{margin:0,fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Danh mục hàng {errors.lines && <em style={{color:"var(--s-crit)",fontStyle:"normal",marginLeft:6}}>· {errors.lines}</em>}</h4>
          <span style={{fontSize:12,color:"var(--t-2)"}}>Tổng: <b style={{color:"var(--t-0)",fontFamily:"var(--font-mono)"}}>{fmtNum(total)} ₫</b></span>
        </div>
        <div style={{position:"relative",marginBottom:8}}>
          <HUI.Input icon="search" placeholder="Tìm và thêm mã/tên hàng…" value={picker} onChange={e => setPicker(e.target.value)}/>
          {filteredPick.length > 0 && (
            <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 4px)",background:"#fff",border:"1px solid var(--line)",borderRadius:6,boxShadow:"0 8px 24px rgba(0,0,0,0.08)",zIndex:5,maxHeight:280,overflowY:"auto"}}>
              {filteredPick.map(it => (
                <div key={it.id} onClick={() => addLine(it)} style={{padding:"8px 10px",display:"grid",gridTemplateColumns:"90px 1fr 100px 110px",gap:10,alignItems:"center",cursor:"pointer",borderBottom:"1px solid var(--line-soft)",fontSize:12.5}}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--d-1)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:600}}>{it.id}</span>
                  <span>{it.name}</span>
                  <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>Tồn {fmtNum(it.stock)} {it.unit}</span>
                  <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",textAlign:"right"}}>{fmtNum(it.unitPrice)} ₫</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <table className="ab-tbl" style={{width:"100%"}}>
          <thead><tr>
            <th style={{width:90}}>Mã</th>
            <th>Tên</th>
            <th style={{width:110}}>Lô</th>
            <th style={{width:60}}>ĐV</th>
            <th style={{width:80}} className="num">SL</th>
            <th style={{width:110}} className="num">Đơn giá</th>
            <th style={{width:120}} className="num">Thành tiền</th>
            <th style={{width:40}}></th>
          </tr></thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan="8" style={{padding:"24px 12px",textAlign:"center",color:"var(--t-2)",fontSize:13}}>Chưa có dòng nào. Tìm và thêm hàng ở ô bên trên.</td></tr>
            ) : lines.map((l, i) => (
              <tr key={i}>
                <td className="code">{l.id}</td>
                <td>{l.name}</td>
                <td><input className="hui-inp" style={{height:26,fontSize:11,fontFamily:"var(--font-mono)"}} value={l.lot} onChange={e => updLine(i, { lot: e.target.value })}/></td>
                <td>{l.unit}</td>
                <td><input className="hui-inp" style={{height:26,textAlign:"right",fontFamily:"var(--font-mono)"}} type="number" value={l.qty} onChange={e => updLine(i, { qty: +e.target.value || 0 })}/></td>
                <td><input className="hui-inp" style={{height:26,textAlign:"right",fontFamily:"var(--font-mono)"}} type="number" value={l.price} onChange={e => updLine(i, { price: +e.target.value || 0 })}/></td>
                <td className="mono" style={{textAlign:"right",fontWeight:600}}>{fmtNum(l.qty * l.price)}</td>
                <td><button className="ab-iconbtn" onClick={() => delLine(i)}><Ico name="x" size={11}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HUI.Modal>
  );
};

// ============ Count Modal ============
const CountModal = ({ cx, items, onSave }) => {
  const [warehouse, setWarehouse] = uS("WH-MAIN");
  const [counted, setCounted] = uS({});
  const whItems = items.filter(it => it.warehouse === warehouse);
  const diff = (it) => (counted[it.id] ?? it.stock) - it.stock;

  const save = () => {
    const lines = whItems.filter(it => it.id in counted && counted[it.id] !== it.stock).map(it => ({
      id: it.id, name: it.name, unit: it.unit,
      qty: Math.abs(diff(it)), lot: it.lots[0]?.lot || "", price: it.unitPrice,
    }));
    if (lines.length === 0) { tw("Chưa có chênh lệch nào"); return; }
    const code = `KK.${String(2026100 + Math.floor(Math.random()*900)).padStart(7,"0")}`;
    onSave({
      code, kind: "count", status: "pending",
      warehouse, warehouseTo: null, supplier: null,
      ref: "", note: `Kiểm kê kho ${whName(warehouse)}`,
      lines, total: lines.reduce((s, l) => s + l.qty * l.price, 0),
      createdBy: "DS. Hoa", createdAt: new Date(),
      approvedBy: null, approvedAt: null,
      audit: [{ t: Date.now(), action: "Tạo phiếu kiểm kê", by: "DS. Hoa", tone: "info" }],
    });
  };

  return (
    <HUI.Modal title="Phiếu kiểm kê kho" size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={save}><Ico name="check" size={12}/> Tạo phiếu kiểm kê</button>
      </>}>
      <HUI.Field label="Kho cần kiểm" required>
        <HUI.Select value={warehouse} onChange={e => { setWarehouse(e.target.value); setCounted({}); }} options={IV_WAREHOUSES.map(w => ({ value: w.v, label: w.l }))}/>
      </HUI.Field>
      <div style={{marginTop:14,maxHeight:480,overflow:"auto",border:"1px solid var(--line)",borderRadius:6}}>
        <table className="ab-tbl" style={{width:"100%",margin:0}}>
          <thead style={{position:"sticky",top:0,background:"var(--d-1)",zIndex:1}}>
            <tr>
              <th style={{width:90}}>Mã</th>
              <th>Tên</th>
              <th style={{width:60}}>ĐV</th>
              <th style={{width:80}} className="num">Tồn sổ</th>
              <th style={{width:110}} className="num">Tồn thực tế</th>
              <th style={{width:100}} className="num">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {whItems.slice(0, 80).map(it => {
              const d = diff(it);
              return (
                <tr key={it.id}>
                  <td className="code">{it.id}</td>
                  <td>{it.name}</td>
                  <td>{it.unit}</td>
                  <td className="mono" style={{textAlign:"right"}}>{it.stock}</td>
                  <td><input className="hui-inp" style={{height:26,textAlign:"right",fontFamily:"var(--font-mono)"}} type="number" placeholder={String(it.stock)}
                    value={counted[it.id] ?? ""}
                    onChange={e => setCounted(prev => ({ ...prev, [it.id]: e.target.value === "" ? undefined : +e.target.value }))}/></td>
                  <td className="mono" style={{textAlign:"right",color: d > 0 ? "var(--s-ok)" : d < 0 ? "var(--s-crit)" : "var(--t-2)"}}>
                    {it.id in counted ? (d > 0 ? `+${d}` : d) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HUI.Modal>
  );
};

window.InventoryV2 = InventoryV2;
