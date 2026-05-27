// =====================================================================
// HIS Terminal · Module: Reception v2 — modals & drawer
// Sub-components dùng kèm mod-reception-v2.jsx
// =====================================================================

const RX2 = window.HIS;

// ────────────────────────────────────────────────────────────────────
// NEW VISIT WIZARD (4 bước)
// ────────────────────────────────────────────────────────────────────
function NewVisitWizard({ cx, prefill, onSubmit }) {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({
    pid: prefill?.id || null,
    patientName: prefill?.name || "",
    phone: prefill?.phone || "",
    cccd: prefill?.cccd || "",
    age: prefill?.age || "",
    gender: prefill?.gender || "M",
    address: prefill?.address?.new || prefill?.address || "",
    bhytNo: prefill?.bhyt || "",
    bhytClass: prefill?.bhytClass || "",
    bhytExp: prefill?.bhytExp || "",
    visitType: "kham-bhyt",
    fee: 0,
    dept: "",
    priority: "norm",
    reason: "",
  });
  const [errs, setErrs] = React.useState({});
  const [bhytChecked, setBhytChecked] = React.useState(!!prefill?.bhyt);
  const [bhytValid, setBhytValid] = React.useState(!!prefill?.bhyt);

  const set = (k, v) => setData(d => ({...d, [k]: v}));
  const validate1 = () => {
    const e = {};
    if (!data.patientName) e.patientName = "Bắt buộc";
    if (!data.phone || !/^0\d{9,10}$/.test(data.phone)) e.phone = "SĐT 10 số";
    if (!data.age || data.age < 0 || data.age > 130) e.age = "Tuổi không hợp lệ";
    if (!data.cccd || !/^\d{12}$/.test(data.cccd)) e.cccd = "CCCD 12 số";
    setErrs(e);
    return Object.keys(e).length === 0;
  };
  const validate2 = () => {
    if (data.visitType === "kham-bhyt" && !bhytValid) {
      setErrs({bhytNo: "Cần xác thực BHYT hợp lệ"});
      return false;
    }
    return true;
  };
  const validate3 = () => {
    const e = {};
    if (!data.dept) e.dept = "Chọn khoa";
    if (!data.reason) e.reason = "Nhập lý do khám";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const verifyBhyt = () => {
    if (!data.bhytNo) { HUI.toast("Nhập số thẻ BHYT", {tone:"warn"}); return; }
    setBhytChecked(true);
    const valid = data.bhytNo.replace(/\s/g,"").length >= 10;
    setBhytValid(valid);
    if (valid) {
      set("bhytClass", data.bhytNo.slice(0,3).toUpperCase().replace(" ",""));
      set("bhytExp", "31/12/2026");
      HUI.toast("Thẻ BHYT hợp lệ · còn hạn", {tone:"ok"});
    } else {
      HUI.toast("Thẻ BHYT không hợp lệ", {tone:"crit"});
    }
  };

  const next = () => {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !validate2()) return;
    if (step === 3 && !validate3()) return;
    setStep(s => Math.min(4, s+1));
  };
  const prev = () => setStep(s => Math.max(1, s-1));
  const submit = () => onSubmit(data);

  const visitType = VISIT_TYPES.find(t => t.v === data.visitType);
  React.useEffect(() => {
    if (visitType) set("fee", data.bhytNo && data.visitType === "kham-bhyt" ? 0 : visitType.fee);
  }, [data.visitType, data.bhytNo]);

  return (
    <HUI.Modal title="Đăng ký tiếp đón mới" sub={`Bước ${step}/4`} size="lg" onClose={cx}
      footer={
        <>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          {step > 1 && <HUI.Btn onClick={prev}>← Quay lại</HUI.Btn>}
          {step < 4 ? <HUI.Btn variant="primary" onClick={next}>Tiếp tục →</HUI.Btn> : <HUI.Btn variant="primary" icon="print" onClick={submit}>Đăng ký & In phiếu</HUI.Btn>}
        </>
      }>
      {/* Stepper */}
      <div className="ab-step">
        {["Bệnh nhân","BHYT & hình thức","Khoa & lý do","Xác nhận"].map((lbl, i) => (
          <div key={i} className={`ab-step-it ${step===i+1?"on":""} ${step>i+1?"done":""}`}>
            <span className="num">{step>i+1?"✓":i+1}</span>
            <span>{lbl}</span>
          </div>
        ))}
      </div>

      {step === 1 && <Step1Patient data={data} set={set} errs={errs} prefill={prefill}/>}
      {step === 2 && <Step2Bhyt data={data} set={set} errs={errs} verifyBhyt={verifyBhyt} bhytChecked={bhytChecked} bhytValid={bhytValid}/>}
      {step === 3 && <Step3Dept data={data} set={set} errs={errs}/>}
      {step === 4 && <Step4Confirm data={data}/>}
    </HUI.Modal>
  );
}

const Step1Patient = ({ data, set, errs, prefill }) => (
  <div className="rec-section" style={{padding:0}}>
    {!prefill && (
      <div style={{padding:"12px 14px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, marginBottom:14, display:"flex", alignItems:"center", gap:10, fontSize:12}}>
        <Ico name="search" size={14} style={{color:"var(--a-cy)"}}/>
        <span>Tìm BN cũ bằng SĐT để tự động điền · hoặc nhập mới bên dưới</span>
      </div>
    )}
    <div className="rec-grid-2">
      <HUI.Field label="Họ và tên" required error={errs.patientName}>
        <HUI.Input value={data.patientName} onChange={e=>set("patientName", e.target.value)} placeholder="Nguyễn Văn A"/>
      </HUI.Field>
      <HUI.Field label="Số điện thoại" required error={errs.phone}>
        <HUI.Input icon="phone" value={data.phone} onChange={e=>set("phone", e.target.value)} placeholder="0912 345 678"/>
      </HUI.Field>
    </div>
    <div className="rec-grid-3" style={{marginTop:10}}>
      <HUI.Field label="Tuổi" required error={errs.age}>
        <HUI.Input type="number" value={data.age} onChange={e=>set("age", parseInt(e.target.value)||0)}/>
      </HUI.Field>
      <HUI.Field label="Giới tính">
        <HUI.Select value={data.gender} onChange={e=>set("gender", e.target.value)} options={[{value:"M",label:"Nam"},{value:"F",label:"Nữ"}]}/>
      </HUI.Field>
      <HUI.Field label="CCCD/CMND" required error={errs.cccd}>
        <HUI.Input value={data.cccd} onChange={e=>set("cccd", e.target.value)} placeholder="012345678901"/>
      </HUI.Field>
    </div>
    <div style={{marginTop:10}}>
      <HUI.Field label="Địa chỉ thường trú">
        <HUI.Input value={data.address} onChange={e=>set("address", e.target.value)} placeholder="P. Lê Hồng Phong, TP. Hưng Yên"/>
      </HUI.Field>
    </div>
  </div>
);

const Step2Bhyt = ({ data, set, errs, verifyBhyt, bhytChecked, bhytValid }) => (
  <div className="rec-section" style={{padding:0}}>
    <div style={{fontSize:11, color:"var(--t-2)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, marginBottom:8}}>HÌNH THỨC KHÁM</div>
    <div className="rec-vtype">
      {VISIT_TYPES.map(t => (
        <label key={t.v} className={data.visitType===t.v?"on":""}>
          <input type="radio" name="vt" checked={data.visitType===t.v} onChange={()=>set("visitType", t.v)}/>
          <Ico name={t.ic} size={14} className="ico"/>
          <span>{t.l}</span>
        </label>
      ))}
    </div>
    {data.visitType === "kham-bhyt" && (
      <div style={{marginTop:18}}>
        <div style={{fontSize:11, color:"var(--t-2)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, marginBottom:8}}>THẺ BHYT</div>
        <div style={{display:"flex", gap:8, alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <HUI.Field label="Số thẻ BHYT" required error={errs.bhytNo}>
              <HUI.Input value={data.bhytNo} onChange={e=>{set("bhytNo", e.target.value);}} placeholder="HN4 5 08 1234567"/>
            </HUI.Field>
          </div>
          <HUI.Btn variant="primary" icon="shield" onClick={verifyBhyt}>Xác thực</HUI.Btn>
        </div>
        {bhytChecked && bhytValid && (
          <div className="rec-bhyt-card" style={{marginTop:10}}>
            <div className="rec-bhyt-icon"><Ico name="check" size={20}/></div>
            <div>
              <div className="rec-bhyt-num">{data.bhytNo}</div>
              <div className="rec-bhyt-meta">
                <span>Hạng: <b>{data.bhytClass}</b></span>
                <span>Hạn: <b>{data.bhytExp}</b></span>
                <span>Mức hưởng: <b>80%</b></span>
              </div>
            </div>
            <span className="chip ok">Hợp lệ</span>
          </div>
        )}
        {bhytChecked && !bhytValid && (
          <div className="rec-bhyt-card invalid" style={{marginTop:10}}>
            <div className="rec-bhyt-icon"><Ico name="x" size={20}/></div>
            <div>
              <div style={{fontSize:13, fontWeight:600, color:"var(--s-crit)"}}>Thẻ không hợp lệ hoặc đã hết hạn</div>
              <div style={{fontSize:11, color:"var(--t-2)", marginTop:2}}>Vui lòng đổi sang hình thức khám khác hoặc kiểm tra lại số thẻ</div>
            </div>
            <span className="chip crit">Lỗi</span>
          </div>
        )}
      </div>
    )}
    {data.visitType !== "kham-bhyt" && (
      <div style={{marginTop:18, padding:"12px 14px", background:"var(--d-1)", border:"1px solid var(--line)", borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span style={{fontSize:12, color:"var(--t-1)"}}>Phí khám {VISIT_TYPES.find(t=>t.v===data.visitType)?.l.toLowerCase()}</span>
        <b style={{fontFamily:"var(--font-mono)", fontSize:15, color:"var(--a-cy)"}}>{fmtVND(VISIT_TYPES.find(t=>t.v===data.visitType)?.fee)}</b>
      </div>
    )}
  </div>
);

const Step3Dept = ({ data, set, errs }) => (
  <div className="rec-section" style={{padding:0}}>
    <div style={{fontSize:11, color:"var(--t-2)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, marginBottom:8}}>CHỌN KHOA · PHÒNG KHÁM</div>
    <div className="rec-deptgrid">
      {DEPTS_REC.map(d => (
        <label key={d.code}>
          <input type="radio" name="dept" checked={data.dept===d.code} onChange={()=>set("dept", d.code)}/>
          <div className="di"><Ico name="stethoscope" size={14}/></div>
          <div>
            <b>{d.name}</b>
            <i>{d.room} · {d.staff} BS</i>
          </div>
          <span className="chip info">{d.staff}</span>
        </label>
      ))}
    </div>
    {errs.dept && <div style={{color:"var(--s-crit)", fontSize:11, marginTop:6}}>{errs.dept}</div>}
    <div style={{marginTop:14}}>
      <HUI.Field label="Lý do khám" required error={errs.reason}>
        <HUI.Textarea rows={3} value={data.reason} onChange={e=>set("reason", e.target.value)} placeholder="Triệu chứng chính, thời gian khởi phát…"/>
      </HUI.Field>
    </div>
    <div style={{marginTop:10, display:"grid", gridTemplateColumns:"1fr", gap:8}}>
      <HUI.Field label="Mức ưu tiên">
        <HUI.Radio value={data.priority} onChange={(v)=>set("priority", v)} name="prio" options={PRIORITY.map(p=>({value:p.v, label:p.l, sub:p.v==="crit"?"Cần xử lý ngay":p.v==="high"?"Người già/trẻ nhỏ/khuyết tật":"Thứ tự thường"}))}/>
      </HUI.Field>
    </div>
  </div>
);

const Step4Confirm = ({ data }) => {
  const dept = DEPTS_REC.find(d => d.code === data.dept);
  const visitType = VISIT_TYPES.find(t => t.v === data.visitType);
  return (
    <div className="rec-section" style={{padding:0}}>
      <div style={{fontSize:11, color:"var(--t-2)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, marginBottom:10}}>XÁC NHẬN ĐĂNG KÝ</div>
      <div style={{background:"var(--d-1)", border:"1px solid var(--line)", borderRadius:8, padding:14}}>
        <div style={{display:"grid", gridTemplateColumns:"120px 1fr", rowGap:8, fontSize:12.5}}>
          <span style={{color:"var(--t-2)"}}>Bệnh nhân</span><b>{data.patientName} · {data.gender==="F"?"Nữ":"Nam"} · {data.age}t</b>
          <span style={{color:"var(--t-2)"}}>SĐT</span><span className="mono">{data.phone}</span>
          <span style={{color:"var(--t-2)"}}>CCCD</span><span className="mono">{data.cccd}</span>
          {data.address && <><span style={{color:"var(--t-2)"}}>Địa chỉ</span><span>{data.address}</span></>}
          <span style={{color:"var(--t-2)"}}>Hình thức</span><span>{visitType?.l}</span>
          {data.bhytNo && <><span style={{color:"var(--t-2)"}}>Thẻ BHYT</span><span className="mono">{data.bhytNo} <span className="chip ok" style={{marginLeft:6}}>{data.bhytClass}</span></span></>}
          <span style={{color:"var(--t-2)"}}>Khoa khám</span><b>{dept?.name} · <span className="mono">{dept?.room}</span></b>
          <span style={{color:"var(--t-2)"}}>Lý do</span><span>{data.reason}</span>
          <span style={{color:"var(--t-2)"}}>Ưu tiên</span><span className={`chip ${prioOf(data.priority).tone}`}>{prioOf(data.priority).l}</span>
          <span style={{color:"var(--t-2)"}}>Phí khám</span><b style={{color:"var(--a-cy)", fontFamily:"var(--font-mono)"}}>{fmtVND(data.fee)}</b>
        </div>
      </div>
      <div style={{marginTop:12, padding:"10px 12px", background:"#fefce8", border:"1px solid #fde68a", borderRadius:6, fontSize:11.5, color:"#854d0e"}}>
        <Ico name="alert" size={12} style={{verticalAlign:-1, marginRight:4}}/>
        Sau khi đăng ký, hệ thống sẽ cấp số thứ tự và in phiếu hẹn. BN xuất trình phiếu tại phòng khám.
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// VISIT DRAWER (3 tabs)
// ────────────────────────────────────────────────────────────────────
function VisitDrawer({ v, cx, visits, onCheckin, onNoShow, onCancel, onPrint, onMoveDept, onPay }) {
  const [tab, setTab] = React.useState("info");
  const live = visits.find(x => x.code === v.code) || v;
  const related = visits.filter(x => x.code !== v.code && (x.phone === v.phone || x.pid === v.pid)).slice(0, 8);

  return (
    <HUI.Drawer
      title={
        <span style={{display:"inline-flex", alignItems:"center", gap:10}}>
          <span className="mono" style={{color:"var(--a-cy)", fontSize:13}}>{live.code}</span>
          <span style={{fontSize:14}}>{live.patientName}</span>
        </span>
      }
      sub={`${live.deptName} · ${live.room} · ${live.arrivedHM}`}
      width={580}
      onClose={cx}
      tabs={[
        {id:"info",   label:"Thông tin"},
        {id:"audit",  label:"Lịch sử thao tác", count: live.audit.length},
        {id:"related",label:"Phiên liên quan", count: related.length},
      ]}
      activeTab={tab}
      onTab={setTab}
      footer={
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          <HUI.Btn variant="ghost" onClick={cx}>Đóng</HUI.Btn>
          <span style={{flex:1}}/>
          <HUI.Btn icon="print" onClick={()=>onPrint(live)}>In phiếu</HUI.Btn>
          {(live.status==="registered" || live.status==="queued") && live.fee>0 && <HUI.Btn variant="primary" icon="dollar" onClick={()=>onPay(live)}>Thu phí</HUI.Btn>}
          {(live.status==="registered" || live.status==="queued") && live.fee===0 && <HUI.Btn variant="primary" icon="login" onClick={()=>onCheckin(live)}>Check-in</HUI.Btn>}
        </div>
      }>
      {tab === "info" && <DrawerInfoTab v={live} onMoveDept={onMoveDept}/>}
      {tab === "audit" && <DrawerAuditTab v={live}/>}
      {tab === "related" && <DrawerRelatedTab list={related}/>}
    </HUI.Drawer>
  );
}

const DrawerInfoTab = ({ v, onMoveDept }) => (
  <div style={{padding:"4px 0"}}>
    {/* Status banner */}
    <div className="rec-section">
      <h5><Ico name="check" size={11} className="ico"/>TRẠNG THÁI</h5>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background: statusOfRec(v.status).tone === "ok" ? "#f0fdf4" : statusOfRec(v.status).tone === "warn" ? "#fffbeb" : "#eff6ff", border:"1px solid var(--line)", borderRadius:6}}>
        <span className={`ab-stat ${statusOfRec(v.status).tone}`}><span className={`ab-dot ${statusOfRec(v.status).tone}`}/> {statusOfRec(v.status).l}</span>
        <span style={{fontSize:11, color:"var(--t-2)"}}>STT <span className={`rec-token ${v.priority==="crit"?"crit":v.priority==="high"?"high":"norm"}`} style={{marginLeft:4}}>{v.token}</span></span>
      </div>
    </div>

    {/* Patient */}
    <div className="rec-section">
      <h5><Ico name="reception" size={11} className="ico"/>BỆNH NHÂN</h5>
      <div style={{display:"grid", gridTemplateColumns:"100px 1fr", rowGap:6, fontSize:12}}>
        <span style={{color:"var(--t-2)"}}>Họ tên</span><b>{v.patientName}</b>
        <span style={{color:"var(--t-2)"}}>Mã BN</span><span className="mono" style={{color:"var(--a-cy)"}}>{v.pid}</span>
        <span style={{color:"var(--t-2)"}}>Giới · tuổi</span><span>{v.gender==="F"?"Nữ":"Nam"} · {v.age} tuổi</span>
        <span style={{color:"var(--t-2)"}}>SĐT</span><span className="mono">{v.phone}</span>
        <span style={{color:"var(--t-2)"}}>CCCD</span><span className="mono">{v.cccd}</span>
        <span style={{color:"var(--t-2)"}}>Địa chỉ</span><span>{v.address || "—"}</span>
      </div>
    </div>

    {/* Visit */}
    <div className="rec-section">
      <h5><Ico name="stethoscope" size={11} className="ico"/>THÔNG TIN KHÁM</h5>
      <div style={{display:"grid", gridTemplateColumns:"100px 1fr", rowGap:6, fontSize:12}}>
        <span style={{color:"var(--t-2)"}}>Hình thức</span><span>{v.visitTypeLabel}</span>
        <span style={{color:"var(--t-2)"}}>Khoa</span><b>{v.deptName} · <span className="mono" style={{color:"var(--a-cy)"}}>{v.room}</span></b>
        <span style={{color:"var(--t-2)"}}>Lý do</span><span>{v.reason}</span>
        <span style={{color:"var(--t-2)"}}>Ưu tiên</span><span className={`chip ${prioOf(v.priority).tone}`}>{prioOf(v.priority).l}</span>
        <span style={{color:"var(--t-2)"}}>Đến lúc</span><span className="mono">{v.arrivedHM}</span>
        <span style={{color:"var(--t-2)"}}>Phí khám</span><b style={{color:"var(--a-cy)", fontFamily:"var(--font-mono)"}}>{fmtVND(v.fee)}</b>
        {v.payment && <><span style={{color:"var(--t-2)"}}>Thu phí</span><span><span className="chip ok">{v.payment}</span> · {v.cashier}</span></>}
      </div>
    </div>

    {/* BHYT */}
    {v.hasBhyt && (
      <div className="rec-section">
        <h5><Ico name="shield" size={11} className="ico"/>THẺ BHYT</h5>
        <div className="rec-bhyt-card">
          <div className="rec-bhyt-icon"><Ico name="check" size={18}/></div>
          <div>
            <div className="rec-bhyt-num">{v.bhytNo}</div>
            <div className="rec-bhyt-meta">
              <span>Hạng: <b>{v.bhytClass}</b></span>
              <span>Hạn: <b>{v.bhytExp}</b></span>
              <span>Mức hưởng: <b>80%</b></span>
            </div>
          </div>
          <span className="chip ok">Hợp lệ</span>
        </div>
      </div>
    )}

    {/* Quick actions */}
    <div className="rec-section" style={{borderBottom:0}}>
      <h5><Ico name="activity" size={11} className="ico"/>HÀNH ĐỘNG NHANH</h5>
      <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
        <HUI.Btn icon="rotate" onClick={()=>onMoveDept(v)}>Chuyển khoa</HUI.Btn>
        <HUI.Btn icon="bell">Gọi loa</HUI.Btn>
        <HUI.Btn icon="phone">Gọi BN</HUI.Btn>
        <HUI.Btn icon="chat">SMS nhắc</HUI.Btn>
      </div>
    </div>
  </div>
);

const DrawerAuditTab = ({ v }) => (
  <div className="rec-tline" style={{padding:"4px 14px"}}>
    {[...v.audit].reverse().map((a, i) => (
      <div key={i} className="rec-tline-it">
        <span className="tm">{a.t.toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"})}</span>
        <span className={`dot ${a.tone}`}/>
        <div>
          <b>{a.action}</b>
          <i>{a.by}</i>
        </div>
      </div>
    ))}
  </div>
);

const DrawerRelatedTab = ({ list }) => (
  <div style={{padding:"4px 0"}}>
    {list.length === 0 && (
      <div className="ab-empty" style={{padding:"40px 14px"}}>
        <Ico name="search" size={20}/>
        <div>Không có phiên tiếp đón liên quan</div>
      </div>
    )}
    {list.map(v => (
      <div key={v.code} style={{padding:"10px 14px", borderBottom:"1px solid var(--line-hair)", display:"grid", gridTemplateColumns:"auto 1fr auto", gap:10, alignItems:"center"}}>
        <span className={`rec-token ${v.priority==="crit"?"crit":v.priority==="high"?"high":"norm"} ${v.status==="checked-in"?"done":""}`}>{v.token}</span>
        <div>
          <div style={{fontSize:12, fontWeight:600}}>{v.deptName} · <span className="mono" style={{color:"var(--t-2)"}}>{v.room}</span></div>
          <div style={{fontSize:11, color:"var(--t-2)"}}>{v.arrivedHM} · {v.visitTypeLabel}</div>
        </div>
        <span className={`ab-stat ${statusOfRec(v.status).tone}`}><span className={`ab-dot ${statusOfRec(v.status).tone}`}/> {statusOfRec(v.status).l}</span>
      </div>
    ))}
  </div>
);

// ────────────────────────────────────────────────────────────────────
// PRINT TICKET MODAL
// ────────────────────────────────────────────────────────────────────
function PrintTicketModal({ v, cx }) {
  const dept = DEPTS_REC.find(d => d.code === v.dept);
  const print = () => { window.print(); HUI.toast("Đã gửi tới máy in", {tone:"ok"}); };
  return (
    <HUI.Modal title="Phiếu hẹn khám" sub={v.patientName} size="md" onClose={cx}
      footer={
        <>
          <HUI.Btn variant="ghost" onClick={cx}>Đóng</HUI.Btn>
          <HUI.Btn icon="download">Tải PDF</HUI.Btn>
          <HUI.Btn variant="primary" icon="print" onClick={print}>In phiếu</HUI.Btn>
        </>
      }>
      <div className="rec-print">
        <h2>BỆNH VIỆN ĐA KHOA HƯNG YÊN</h2>
        <h3>PHIẾU HẸN KHÁM</h3>
        <div className="row"><span>Mã hẹn</span><b className="mono">{v.code}</b></div>
        <div className="row"><span>Họ tên</span><b>{v.patientName}</b></div>
        <div className="row"><span>Giới · tuổi</span><b>{v.gender==="F"?"Nữ":"Nam"} · {v.age}t</b></div>
        <div className="row"><span>SĐT</span><b className="mono">{v.phone}</b></div>
        <div className="row"><span>Số thứ tự</span><b style={{fontSize:18, color:"var(--a-cy)"}}>{v.token}</b></div>
        <div className="row"><span>Khoa khám</span><b>{v.deptName}</b></div>
        <div className="row"><span>Phòng</span><b className="mono">{v.room}</b></div>
        <div className="row"><span>Hình thức</span><b>{v.visitTypeLabel}</b></div>
        {v.bhytNo && <div className="row"><span>BHYT</span><b className="mono">{v.bhytNo}</b></div>}
        <div className="row"><span>Phí khám</span><b className="mono">{fmtVND(v.fee)}</b></div>
        <div className="row"><span>Đến lúc</span><b className="mono">{v.arrivedHM} · 22/10/2026</b></div>
        <div className="qr"/>
        <div style={{textAlign:"center", fontSize:11, color:"var(--t-2)", marginTop:14}}>Vui lòng giữ phiếu để vào phòng khám</div>
      </div>
    </HUI.Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// MOVE DEPT MODAL
// ────────────────────────────────────────────────────────────────────
function MoveDeptModal({ v, cx, onSubmit }) {
  const [newDept, setNewDept] = React.useState("");
  const [newRoom, setNewRoom] = React.useState("");
  const [reason, setReason] = React.useState("BS đề nghị chuyên khoa");
  return (
    <HUI.Modal title="Chuyển khoa khám" sub={`${v.patientName} · ${v.deptName}`} size="md" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
        <HUI.Btn variant="primary" icon="rotate" onClick={()=>{ if(!newDept){HUI.toast("Chọn khoa mới",{tone:"warn"});return;} onSubmit(newDept, newRoom, reason); }}>Xác nhận chuyển</HUI.Btn>
      </>}>
      <div style={{padding:"10px 12px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:6, marginBottom:14, fontSize:12}}>
        Hiện tại: <b>{v.deptName}</b> · <span className="mono">{v.room}</span> · STT <span className={`rec-token ${v.priority==="crit"?"crit":"norm"}`}>{v.token}</span>
      </div>
      <HUI.Field label="Chuyển sang khoa" required>
        <HUI.Select value={newDept} onChange={e=>{setNewDept(e.target.value); const d=DEPTS_REC.find(x=>x.code===e.target.value); setNewRoom(d?.room||"");}} options={[{value:"",label:"-- Chọn khoa --"}, ...DEPTS_REC.filter(d=>d.code!==v.dept).map(d=>({value:d.code, label:`${d.name} · ${d.room}`}))]}/>
      </HUI.Field>
      <HUI.Field label="Phòng (tùy chọn)">
        <HUI.Input value={newRoom} onChange={e=>setNewRoom(e.target.value)} placeholder="P.301"/>
      </HUI.Field>
      <HUI.Field label="Lý do chuyển" required>
        <HUI.Textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)}/>
      </HUI.Field>
    </HUI.Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAY MODAL
// ────────────────────────────────────────────────────────────────────
function PayModal({ v, cx, onSubmit }) {
  const [method, setMethod] = React.useState(v.hasBhyt ? "BHYT 80%" : "Tiền mặt");
  return (
    <HUI.Modal title="Thu phí khám" sub={v.patientName} size="sm" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
        <HUI.Btn variant="primary" icon="check" onClick={()=>onSubmit(method)}>Xác nhận thanh toán</HUI.Btn>
      </>}>
      <div style={{padding:"14px 16px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, marginBottom:14, textAlign:"center"}}>
        <div style={{fontSize:11, color:"var(--t-2)", textTransform:"uppercase", fontWeight:600, letterSpacing:0.4}}>SỐ TIỀN</div>
        <div style={{fontFamily:"var(--font-mono)", fontSize:28, fontWeight:700, color:"#16a34a", marginTop:4}}>{fmtVND(v.fee)}</div>
        {v.hasBhyt && <div style={{fontSize:11, color:"var(--t-2)", marginTop:2}}>BHYT chi trả 80% · BN đồng chi trả 20%</div>}
      </div>
      <HUI.Field label="Phương thức thanh toán">
        <HUI.Radio value={method} onChange={setMethod} name="pay" options={[
          {value:"Tiền mặt", label:"Tiền mặt", sub:"Thu tại quầy"},
          {value:"Chuyển khoản", label:"Chuyển khoản", sub:"QR Vietcombank"},
          {value:"Thẻ", label:"Thẻ ngân hàng", sub:"POS Visa/Master"},
          ...(v.hasBhyt ? [{value:"BHYT 80%", label:"BHYT 80% + đồng chi trả", sub:"Thẻ BHYT đã xác thực"}] : []),
        ]}/>
      </HUI.Field>
    </HUI.Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// LOOKUP BN MODAL
// ────────────────────────────────────────────────────────────────────
function LookupBNModal({ cx, onPick }) {
  const [q, setQ] = React.useState("");
  const matches = React.useMemo(() => {
    if (q.length < 2) return [];
    const lq = q.toLowerCase();
    return RX2.patients.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.id.toLowerCase().includes(lq) ||
      (p.phone && p.phone.replace(/\s/g,"").includes(q.replace(/\s/g,"")))
    ).slice(0, 12);
  }, [q]);

  return (
    <HUI.Modal title="Tìm bệnh nhân cũ" sub="Tra cứu theo SĐT / mã BN / tên" size="md" onClose={cx}
      footer={<HUI.Btn onClick={cx}>Đóng</HUI.Btn>}>
      <HUI.Field>
        <HUI.Input icon="search" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="0912 345 678 hoặc BN-00142 hoặc Nguyễn Văn A…"/>
      </HUI.Field>
      <div style={{maxHeight:340, overflow:"auto", marginTop:8, border:"1px solid var(--line)", borderRadius:6}}>
        {matches.length === 0 && q.length >= 2 && (
          <div className="ab-empty" style={{padding:"40px 14px"}}>
            <Ico name="search" size={20}/>
            <div>Không tìm thấy BN nào</div>
          </div>
        )}
        {matches.length === 0 && q.length < 2 && (
          <div style={{padding:"40px 14px", textAlign:"center", color:"var(--t-2)", fontSize:12}}>
            Nhập tối thiểu 2 ký tự
          </div>
        )}
        {matches.map(p => (
          <div key={p.id} onClick={()=>onPick(p)} style={{padding:"10px 12px", borderBottom:"1px solid var(--line-hair)", cursor:"pointer", display:"grid", gridTemplateColumns:"auto 1fr auto", gap:10, alignItems:"center"}} className="hover-row">
            <div className="rec-av">{p.name.charAt(0)}</div>
            <div>
              <div style={{fontSize:13, fontWeight:600}}>{p.name}</div>
              <div style={{fontSize:11, color:"var(--t-2)"}}>{p.gender==="F"?"Nữ":"Nam"} · {p.age}t · <span className="mono">{p.phone}</span> · <span className="mono" style={{color:"var(--a-cy)"}}>{p.id}</span></div>
            </div>
            {p.bhyt && <span className="chip ok mono">{p.bhytClass}</span>}
          </div>
        ))}
      </div>
    </HUI.Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// BHYT VERIFY MODAL (standalone tra cứu)
// ────────────────────────────────────────────────────────────────────
function BhytVerifyModal({ cx }) {
  const [num, setNum] = React.useState("");
  const [result, setResult] = React.useState(null);
  const verify = () => {
    if (!num) return;
    const valid = num.replace(/\s/g,"").length >= 10;
    setResult({
      valid,
      number: num,
      name: valid ? "Nguyễn Văn A" : "—",
      class: valid ? num.slice(0,3).toUpperCase() : "—",
      exp: valid ? "31/12/2026" : "—",
      issued: valid ? "BHYT TP.HN" : "—",
      coverage: valid ? "80%" : "—",
    });
  };
  return (
    <HUI.Modal title="Tra cứu BHYT" sub="Cổng giám định BHYT quốc gia" size="md" onClose={cx}
      footer={<HUI.Btn onClick={cx}>Đóng</HUI.Btn>}>
      <div style={{display:"flex", gap:8, alignItems:"flex-end"}}>
        <div style={{flex:1}}>
          <HUI.Field label="Số thẻ BHYT">
            <HUI.Input autoFocus value={num} onChange={e=>setNum(e.target.value)} placeholder="HN4 5 08 1234567"/>
          </HUI.Field>
        </div>
        <HUI.Btn variant="primary" icon="search" onClick={verify}>Tra cứu</HUI.Btn>
      </div>
      {result && result.valid && (
        <div className="rec-bhyt-card" style={{marginTop:14}}>
          <div className="rec-bhyt-icon"><Ico name="check" size={20}/></div>
          <div>
            <div className="rec-bhyt-num">{result.number}</div>
            <div style={{fontSize:13, fontWeight:600, color:"var(--t-0)", marginTop:2}}>{result.name}</div>
            <div className="rec-bhyt-meta">
              <span>Hạng: <b>{result.class}</b></span>
              <span>Hạn: <b>{result.exp}</b></span>
              <span>Nơi cấp: <b>{result.issued}</b></span>
              <span>Mức hưởng: <b>{result.coverage}</b></span>
            </div>
          </div>
          <span className="chip ok">Hợp lệ</span>
        </div>
      )}
      {result && !result.valid && (
        <div className="rec-bhyt-card invalid" style={{marginTop:14}}>
          <div className="rec-bhyt-icon"><Ico name="x" size={20}/></div>
          <div>
            <div style={{fontSize:13, fontWeight:600, color:"var(--s-crit)"}}>Thẻ không hợp lệ</div>
            <div style={{fontSize:11, color:"var(--t-2)", marginTop:2}}>Kiểm tra lại số thẻ hoặc liên hệ BHYT cấp tỉnh</div>
          </div>
          <span className="chip crit">Lỗi</span>
        </div>
      )}
    </HUI.Modal>
  );
}

// Export
Object.assign(window, {
  NewVisitWizard, VisitDrawer, PrintTicketModal,
  MoveDeptModal, PayModal, LookupBNModal, BhytVerifyModal
});
