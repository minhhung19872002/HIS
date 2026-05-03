// =====================================================================
// HIS Terminal · Module: DỮ LIỆU DANH MỤC (MasterData v2)
// Quản lý ICD-10, danh mục thuốc, dịch vụ KCB, đơn vị tính, khoa-phòng
// =====================================================================

const MD_CATEGORIES = [
  { v: "icd",     l: "ICD-10",            ic: "list",   count: 1842 },
  { v: "service", l: "Dịch vụ KCB",       ic: "file",   count: 645 },
  { v: "drug",    l: "Danh mục thuốc",    ic: "pill",   count: 2340 },
  { v: "unit",    l: "Đơn vị tính",       ic: "list",   count: 28 },
  { v: "dept",    l: "Khoa - Phòng",      ic: "users",  count: 42 },
  { v: "lab",     l: "DM Xét nghiệm",     ic: "lab",    count: 312 },
  { v: "ris",     l: "DM CĐHA",           ic: "list",   count: 145 },
  { v: "room",    l: "Phòng khám/mổ",     ic: "list",   count: 56 },
];

const MD_SEED = {
  icd: [
    { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)", group: "Bệnh hệ tuần hoàn", parent: "I10-I15", active: true },
    { code: "I11", name: "Bệnh tim do tăng huyết áp", group: "Bệnh hệ tuần hoàn", parent: "I10-I15", active: true },
    { code: "I20", name: "Cơn đau thắt ngực", group: "Bệnh tim thiếu máu cục bộ", parent: "I20-I25", active: true },
    { code: "I21", name: "Nhồi máu cơ tim cấp", group: "Bệnh tim thiếu máu cục bộ", parent: "I20-I25", active: true },
    { code: "I25", name: "Bệnh tim thiếu máu cục bộ mạn", group: "Bệnh tim thiếu máu cục bộ", parent: "I20-I25", active: true },
    { code: "E10", name: "Đái tháo đường type 1", group: "Bệnh nội tiết", parent: "E10-E14", active: true },
    { code: "E11", name: "Đái tháo đường type 2", group: "Bệnh nội tiết", parent: "E10-E14", active: true },
    { code: "E14", name: "Đái tháo đường không xác định", group: "Bệnh nội tiết", parent: "E10-E14", active: true },
    { code: "J18", name: "Viêm phổi không xác định tác nhân", group: "Bệnh hệ hô hấp", parent: "J09-J18", active: true },
    { code: "J20", name: "Viêm phế quản cấp", group: "Bệnh hệ hô hấp", parent: "J20-J22", active: true },
    { code: "J44", name: "Bệnh phổi tắc nghẽn mạn tính (COPD)", group: "Bệnh hệ hô hấp", parent: "J40-J47", active: true },
    { code: "K29", name: "Viêm dạ dày và viêm tá tràng", group: "Bệnh hệ tiêu hoá", parent: "K20-K31", active: true },
    { code: "K35", name: "Viêm ruột thừa cấp", group: "Bệnh hệ tiêu hoá", parent: "K35-K38", active: true },
    { code: "M54", name: "Đau lưng", group: "Bệnh cơ xương khớp", parent: "M50-M54", active: true },
    { code: "N18", name: "Bệnh thận mạn", group: "Bệnh hệ tiết niệu", parent: "N17-N19", active: true },
    { code: "N39", name: "Nhiễm khuẩn đường tiết niệu", group: "Bệnh hệ tiết niệu", parent: "N30-N39", active: true },
    { code: "R51", name: "Đau đầu", group: "Triệu chứng và dấu hiệu", parent: "R50-R69", active: true },
    { code: "Z00", name: "Khám sức khoẻ tổng quát", group: "Yếu tố liên quan tới sức khoẻ", parent: "Z00-Z13", active: true },
  ],
  service: [
    { code: "DV.001", name: "Khám bệnh BS chuyên khoa", group: "Khám bệnh", price: 250000, bhyt: 80, active: true },
    { code: "DV.002", name: "Khám bệnh ThS.BS / BS.CKII", group: "Khám bệnh", price: 350000, bhyt: 80, active: true },
    { code: "DV.003", name: "Khám bệnh TS.BS chuyên khoa sâu", group: "Khám bệnh", price: 500000, bhyt: 80, active: true },
    { code: "DV.011", name: "Tư vấn dinh dưỡng", group: "Khám bệnh", price: 200000, bhyt: 0, active: true },
    { code: "DV.101", name: "Đo điện tim (ECG 12 chuyển đạo)", group: "Thủ thuật", price: 150000, bhyt: 80, active: true },
    { code: "DV.102", name: "Siêu âm tim", group: "Thủ thuật", price: 350000, bhyt: 80, active: true },
    { code: "DV.103", name: "Holter điện tim 24h", group: "Thủ thuật", price: 800000, bhyt: 80, active: true },
    { code: "DV.201", name: "Đặt nội khí quản", group: "Hồi sức cấp cứu", price: 1500000, bhyt: 100, active: true },
    { code: "DV.202", name: "Sốc điện chuyển nhịp", group: "Hồi sức cấp cứu", price: 2000000, bhyt: 100, active: true },
    { code: "DV.301", name: "Phẫu thuật cắt ruột thừa nội soi", group: "Phẫu thuật", price: 8500000, bhyt: 80, active: true },
    { code: "DV.302", name: "Phẫu thuật mổ lấy thai", group: "Phẫu thuật", price: 6500000, bhyt: 80, active: true },
    { code: "DV.401", name: "Sinh thường có gây tê", group: "Sản phụ khoa", price: 3500000, bhyt: 80, active: true },
  ],
  unit: [
    { code: "VIEN", name: "Viên" }, { code: "ONG", name: "Ống" }, { code: "GOI", name: "Gói" },
    { code: "CHAI", name: "Chai" }, { code: "LO", name: "Lọ" }, { code: "TUYP", name: "Tuýp" },
    { code: "VI", name: "Vỉ" }, { code: "HOP", name: "Hộp" }, { code: "LON", name: "Lon" },
    { code: "ML", name: "Mililít" }, { code: "G", name: "Gam" }, { code: "MG", name: "Miligam" },
    { code: "UI", name: "Đơn vị quốc tế (IU)" }, { code: "LAN", name: "Lần" }, { code: "BO", name: "Bộ" },
  ],
  dept: [
    { code: "NOI-TM", name: "Khoa Nội tim mạch", chief: "TS.BS Nguyễn Văn Hùng", staff: 24, beds: 35, active: true },
    { code: "NOI-TH", name: "Khoa Nội tổng hợp", chief: "BS.CKII Lê Văn Cường", staff: 18, beds: 28, active: true },
    { code: "NOI-TK", name: "Khoa Nội thần kinh", chief: "ThS.BS Phạm Thị Hương", staff: 16, beds: 22, active: true },
    { code: "NGOAI-TH", name: "Khoa Ngoại tổng quát", chief: "TS.BS Vũ Quốc An", staff: 22, beds: 30, active: true },
    { code: "NGOAI-CT", name: "Khoa Ngoại chấn thương", chief: "BS.CKII Đặng Minh Khoa", staff: 18, beds: 25, active: true },
    { code: "SAN", name: "Khoa Sản", chief: "BS.CKI Hoàng Thị Mai", staff: 28, beds: 40, active: true },
    { code: "NHI", name: "Khoa Nhi", chief: "ThS.BS Bùi Văn Tuấn", staff: 24, beds: 35, active: true },
    { code: "HSCC", name: "Hồi sức cấp cứu (ICU)", chief: "TS.BS Trần Quang Vinh", staff: 35, beds: 18, active: true },
    { code: "CC", name: "Khoa Cấp cứu", chief: "BS.CKII Mai Đức Trung", staff: 30, beds: 24, active: true },
    { code: "PT-GMHS", name: "Khoa Phẫu thuật - GMHS", chief: "TS.BS Lý Thanh Sơn", staff: 42, beds: 0, active: true },
    { code: "XN", name: "Khoa Xét nghiệm", chief: "BS.CKII Nguyễn Thị Hà", staff: 28, beds: 0, active: true },
    { code: "CDHA", name: "Khoa Chẩn đoán hình ảnh", chief: "TS.BS Đỗ Mạnh Linh", staff: 22, beds: 0, active: true },
  ],
  drug: [
    { code: "PA001", name: "Paracetamol 500mg", group: "Giảm đau, hạ sốt", form: "Viên nén", unit: "VIEN", price: 1200, active: true },
    { code: "AM001", name: "Amoxicillin 500mg", group: "Kháng sinh", form: "Viên nang", unit: "VIEN", price: 2500, active: true },
    { code: "AS001", name: "Atorvastatin 20mg", group: "Hạ mỡ máu", form: "Viên nén", unit: "VIEN", price: 3500, active: true },
    { code: "MT001", name: "Metformin 500mg", group: "Đái tháo đường", form: "Viên nén", unit: "VIEN", price: 1800, active: true },
    { code: "AM002", name: "Amlodipine 5mg", group: "Hạ huyết áp", form: "Viên nén", unit: "VIEN", price: 2200, active: true },
    { code: "OM001", name: "Omeprazole 20mg", group: "Ức chế bơm proton", form: "Viên nang", unit: "VIEN", price: 2800, active: true },
    { code: "EN001", name: "Enalapril 10mg", group: "Ức chế men chuyển", form: "Viên nén", unit: "VIEN", price: 1500, active: true },
    { code: "DI001", name: "Diclofenac 50mg", group: "Kháng viêm NSAID", form: "Viên nén", unit: "VIEN", price: 1800, active: true },
    { code: "IN001", name: "Insulin Mixtard 30 100IU/ml", group: "Đái tháo đường", form: "Bút tiêm 3ml", unit: "LO", price: 285000, active: true },
    { code: "NS001", name: "NaCl 0.9% 500ml", group: "Dịch truyền", form: "Chai", unit: "CHAI", price: 18000, active: true },
  ],
  lab: [
    { code: "XN.CTM", name: "Tổng phân tích tế bào máu (CBC)", group: "Huyết học", price: 65000, active: true },
    { code: "XN.GLU", name: "Glucose máu", group: "Sinh hoá", price: 25000, active: true },
    { code: "XN.HBA1C", name: "HbA1C", group: "Sinh hoá", price: 145000, active: true },
    { code: "XN.LIPID", name: "Bilan lipid (Cholesterol-TG-HDL-LDL)", group: "Sinh hoá", price: 145000, active: true },
    { code: "XN.URE", name: "Urea máu", group: "Sinh hoá", price: 22000, active: true },
    { code: "XN.CRE", name: "Creatinin máu", group: "Sinh hoá", price: 28000, active: true },
    { code: "XN.AST", name: "AST (SGOT)", group: "Sinh hoá", price: 28000, active: true },
    { code: "XN.ALT", name: "ALT (SGPT)", group: "Sinh hoá", price: 28000, active: true },
    { code: "XN.NUOC", name: "Tổng phân tích nước tiểu", group: "Sinh hoá nước tiểu", price: 35000, active: true },
    { code: "XN.HBSAG", name: "HBsAg test nhanh", group: "Vi sinh", price: 65000, active: true },
  ],
  ris: [
    { code: "CDHA.XQ.NGUC", name: "X-quang ngực thẳng", group: "X-quang", price: 65000, active: true },
    { code: "CDHA.XQ.CSCO", name: "X-quang cột sống cổ 2 tư thế", group: "X-quang", price: 85000, active: true },
    { code: "CDHA.SA.OB", name: "Siêu âm ổ bụng tổng quát", group: "Siêu âm", price: 145000, active: true },
    { code: "CDHA.SA.TIM", name: "Siêu âm tim qua thành ngực", group: "Siêu âm", price: 350000, active: true },
    { code: "CDHA.CT.SO", name: "CT-scan sọ não không thuốc", group: "CT", price: 850000, active: true },
    { code: "CDHA.CT.NGUC", name: "CT-scan ngực có thuốc", group: "CT", price: 1450000, active: true },
    { code: "CDHA.MRI.SO", name: "MRI sọ não 1.5T", group: "MRI", price: 2200000, active: true },
    { code: "CDHA.MRI.CSTL", name: "MRI cột sống thắt lưng", group: "MRI", price: 2400000, active: true },
  ],
  room: [
    { code: "P101", name: "Phòng khám 101", group: "Khu khám", capacity: 1, active: true },
    { code: "P102", name: "Phòng khám 102", group: "Khu khám", capacity: 1, active: true },
    { code: "P201", name: "Phòng siêu âm A", group: "CĐHA", capacity: 1, active: true },
    { code: "P202", name: "Phòng X-quang", group: "CĐHA", capacity: 1, active: true },
    { code: "P301", name: "Phòng mổ 1", group: "Phẫu thuật", capacity: 1, active: true },
    { code: "P302", name: "Phòng mổ 2", group: "Phẫu thuật", capacity: 1, active: true },
    { code: "P401", name: "Phòng cấp cứu", group: "Cấp cứu", capacity: 6, active: true },
  ],
};

function MasterDataV2() {
  const [cat, setCat] = uS("icd");
  const [search, setSearch] = uS("");
  const [data, setData] = uS(MD_SEED);
  const [page, setPage] = uS(0);
  const PER = 20;

  const items = data[cat] || [];
  const filtered = uM(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
  }, [items, search]);

  uE(() => { setPage(0); setSearch(""); }, [cat]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);

  const colsByCategory = {
    icd: [
      { key: "code", label: "Mã ICD", code: true, width: 90 },
      { key: "name", label: "Tên bệnh" },
      { key: "group", label: "Nhóm bệnh", width: 220 },
      { key: "parent", label: "Khoảng mã", width: 100, mono: true },
      { key: "active", label: "Hoạt động", width: 100, render: r => <StatusBadge tone={r.active?"ok":"warn"} dot>{r.active?"Active":"Disabled"}</StatusBadge> },
    ],
    service: [
      { key: "code", label: "Mã DV", code: true, width: 90 },
      { key: "name", label: "Tên dịch vụ" },
      { key: "group", label: "Nhóm", width: 160 },
      { key: "price", label: "Giá", width: 120, mono: true, render: r => fmtVNDg(r.price) },
      { key: "bhyt", label: "BHYT", width: 80, mono: true, render: r => `${r.bhyt}%` },
      { key: "active", label: "Hoạt động", width: 100, render: r => <StatusBadge tone={r.active?"ok":"warn"} dot>{r.active?"Active":"Disabled"}</StatusBadge> },
    ],
    drug: [
      { key: "code", label: "Mã thuốc", code: true, width: 100 },
      { key: "name", label: "Tên thuốc" },
      { key: "group", label: "Nhóm dược lý", width: 180 },
      { key: "form", label: "Dạng bào chế", width: 130 },
      { key: "unit", label: "ĐVT", width: 70, mono: true },
      { key: "price", label: "Giá/ĐV", width: 110, mono: true, render: r => fmtVNDg(r.price) },
    ],
    unit: [
      { key: "code", label: "Mã ĐV", code: true, width: 100 },
      { key: "name", label: "Tên đơn vị tính" },
    ],
    dept: [
      { key: "code", label: "Mã khoa", code: true, width: 110 },
      { key: "name", label: "Tên khoa - phòng" },
      { key: "chief", label: "Trưởng khoa", width: 240 },
      { key: "staff", label: "Nhân sự", width: 90, mono: true },
      { key: "beds", label: "Giường", width: 90, mono: true },
      { key: "active", label: "Hoạt động", width: 100, render: r => <StatusBadge tone={r.active?"ok":"warn"} dot>{r.active?"Active":"Disabled"}</StatusBadge> },
    ],
    lab: [
      { key: "code", label: "Mã XN", code: true, width: 110 },
      { key: "name", label: "Tên xét nghiệm" },
      { key: "group", label: "Nhóm", width: 200 },
      { key: "price", label: "Giá", width: 110, mono: true, render: r => fmtVNDg(r.price) },
    ],
    ris: [
      { key: "code", label: "Mã CĐHA", code: true, width: 140 },
      { key: "name", label: "Tên dịch vụ CĐHA" },
      { key: "group", label: "Nhóm", width: 130 },
      { key: "price", label: "Giá", width: 130, mono: true, render: r => fmtVNDg(r.price) },
    ],
    room: [
      { key: "code", label: "Mã phòng", code: true, width: 100 },
      { key: "name", label: "Tên phòng" },
      { key: "group", label: "Khu vực", width: 160 },
      { key: "capacity", label: "Sức chứa", width: 110, mono: true },
    ],
  };

  const cols = colsByCategory[cat];

  const openEdit = (item) => HUI.open(cx => <MdEditModal cx={cx} item={item} cat={cat} onSave={(v) => { setData(p => ({ ...p, [cat]: p[cat].map(x => x.code === item.code ? v : x) })); cx(); tk("Đã cập nhật " + v.code); }}/>);
  const openNew = () => HUI.open(cx => <MdEditModal cx={cx} cat={cat} onSave={(v) => { setData(p => ({ ...p, [cat]: [v, ...p[cat]] })); cx(); tk("Đã thêm " + v.code); }}/>);

  return (
    <div className="ab">
      <KpiStrip items={MD_CATEGORIES.slice(0,6).map(c => ({ lbl: c.l, val: (data[c.v]||[]).length || c.count, sub: "mục" }))}/>

      <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:14,padding:"0 18px 14px"}}>
        <aside style={{border:"1px solid var(--line)",background:"var(--d-1)",borderRadius:8,padding:8,height:"fit-content"}}>
          <div style={{padding:"8px 12px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)",borderBottom:"1px solid var(--line)",marginBottom:6}}>Danh mục</div>
          {MD_CATEGORIES.map(c => (
            <button key={c.v} className={"ab-side-link" + (cat===c.v?" act":"")} onClick={() => setCat(c.v)}>
              <Ico name={c.ic} size={14}/>
              <span style={{flex:1,textAlign:"left"}}>{c.l}</span>
              <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--t-2)"}}>{(data[c.v]||[]).length || c.count}</span>
            </button>
          ))}
        </aside>

        <div>
          <TopTabs tab="data" setTab={()=>{}} tabs={[{ v: "data", l: MD_CATEGORIES.find(c=>c.v===cat)?.l, ic: MD_CATEGORIES.find(c=>c.v===cat)?.ic }]} actions={
            <>
              <button className="ab-btn ghost sm"><Ico name="upload" size={12}/> Import Excel</button>
              <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
              <button className="ab-btn primary" onClick={openNew}><Ico name="plus" size={12}/> Thêm mới</button>
            </>
          }/>
          <div className="ab-toolbar">
            <SearchBox value={search} onChange={setSearch} placeholder={`Tìm trong ${MD_CATEGORIES.find(c=>c.v===cat)?.l}...`}/>
          </div>
          <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={openEdit}/>
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
        </div>
      </div>
    </div>
  );
}

const MdEditModal = ({ cx, item, cat, onSave }) => {
  const [form, setForm] = uS(item || { code: "", name: "", active: true });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!form.code?.trim() || !form.name?.trim()) { tw("Mã và tên là bắt buộc"); return; }
    onSave(form);
  };
  const catLabel = MD_CATEGORIES.find(c => c.v === cat)?.l;
  return (
    <HUI.Modal title={(item?"Sửa ":"Thêm ") + catLabel} size="md" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={save}><Ico name="check" size={12}/> Lưu</button>
      </>}>
      <HUI.Row cols={2}>
        <HUI.Field label="Mã" required><HUI.Input value={form.code||""} onChange={e=>set("code", e.target.value)} disabled={!!item}/></HUI.Field>
        <HUI.Field label="Tên" required span={cat==="unit"?1:2}><HUI.Input value={form.name||""} onChange={e=>set("name", e.target.value)}/></HUI.Field>
        {["icd","service","drug","lab","ris","room"].includes(cat) && <HUI.Field label="Nhóm" span={2}><HUI.Input value={form.group||""} onChange={e=>set("group", e.target.value)}/></HUI.Field>}
        {["service","drug","lab","ris"].includes(cat) && <HUI.Field label="Giá (VND)"><HUI.Input type="number" value={form.price||0} onChange={e=>set("price", +e.target.value)}/></HUI.Field>}
        {cat==="service" && <HUI.Field label="BHYT (%)"><HUI.Input type="number" value={form.bhyt||0} onChange={e=>set("bhyt", +e.target.value)}/></HUI.Field>}
        {cat==="drug" && <>
          <HUI.Field label="Dạng bào chế"><HUI.Input value={form.form||""} onChange={e=>set("form", e.target.value)}/></HUI.Field>
          <HUI.Field label="ĐVT"><HUI.Input value={form.unit||""} onChange={e=>set("unit", e.target.value)}/></HUI.Field>
        </>}
        {cat==="dept" && <>
          <HUI.Field label="Trưởng khoa"><HUI.Input value={form.chief||""} onChange={e=>set("chief", e.target.value)}/></HUI.Field>
          <HUI.Field label="Nhân sự"><HUI.Input type="number" value={form.staff||0} onChange={e=>set("staff", +e.target.value)}/></HUI.Field>
          <HUI.Field label="Số giường"><HUI.Input type="number" value={form.beds||0} onChange={e=>set("beds", +e.target.value)}/></HUI.Field>
        </>}
        {cat==="room" && <HUI.Field label="Sức chứa"><HUI.Input type="number" value={form.capacity||1} onChange={e=>set("capacity", +e.target.value)}/></HUI.Field>}
      </HUI.Row>
    </HUI.Modal>
  );
};

window.MasterDataV2 = MasterDataV2;
