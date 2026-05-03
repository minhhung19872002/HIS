// HIS Reception — check-in / đăng ký khám
const { useState: useRS, useMemo: useRM } = React;

const ReceptionModule = () => {
  const pts = HIS.patients;
  const today = [
    { pid: "BN-00142", token: "A012", arrived: "07:42", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00189", token: "A013", arrived: "07:55", status: "in",      dept: "Sản PK" },
    { pid: "BN-00201", token: "A014", arrived: "08:02", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00223", token: "A015", arrived: "08:10", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00256", token: "A016", arrived: "08:18", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00278", token: "A017", arrived: "08:25", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00301", token: "A018", arrived: "08:33", status: "ready",   dept: "Nội TQ" },
    { pid: "BN-00312", token: "A019", arrived: "08:40", status: "paying",  dept: "Ngoại CT" },
  ];
  const [sel, setSel] = useRS("BN-00142");
  const [q, setQ] = useRS("");
  const [filter, setFilter] = useRS("today"); // all | today | walk
  const [dept, setDept] = useRS("Nội TQ");

  const patient = HIS.patientById(sel);
  const appt = today.find(t => t.pid === sel);

  const filtered = useRM(() => {
    const src = filter === "today" ? today.map(t => ({...HIS.patientById(t.pid), ...t})) : pts;
    if (!q) return src;
    const Q = q.toLowerCase();
    return src.filter(p => p.name.toLowerCase().includes(Q) || p.id.toLowerCase().includes(Q) || (p.phone||"").includes(Q));
  }, [q, filter]);

  const addrMerged = patient.address.new !== patient.address.old;
  const bhytCovers = patient.bhyt !== "—";

  const depts = [
    { k: "Nội TQ",  q: 5 }, { k: "Ngoại CT", q: 3 }, { k: "Sản PK",  q: 2 },
    { k: "Mắt",     q: 1 }, { k: "Tai mũi họng", q: 1 }, { k: "Da liễu", q: 0 },
    { k: "Răng hàm mặt", q: 2 }, { k: "YHCT",   q: 1 },
  ];
  const feeKham = 42100;
  const bhytPct = bhytCovers ? 80 : 0;
  const chiTra = Math.round(feeKham * bhytPct / 100);
  const benNhanTra = feeKham - chiTra;

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1, minHeight:0}}>
      <div className="rcp-strip">
        <div className="rcp-strip-cell">
          <span className="lbl">Tiếp đón hôm nay</span>
          <span className="val">187</span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">Đang chờ khám</span>
          <span className="val">8 <small>lượt</small></span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">BHYT hợp lệ</span>
          <span className="val">184/187 <small>98.4%</small></span>
        </div>
        <div className="rcp-strip-cell">
          <span className="lbl">Thời gian chờ TB</span>
          <span className="val">4' <small>phút</small></span>
        </div>
      </div>

      <div className="rcp-grid">
        {/* LEFT: today's list */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Danh sách hôm nay</b>
            <span className="meta">{filtered.length} BN</span>
          </div>
          <div className="rcp-search">
            <input placeholder="Tìm BN (mã, tên, SĐT)..." value={q} onChange={e => setQ(e.target.value)}/>
            <div className="rcp-search-row">
              <div className={"rcp-filter " + (filter==="today"?"on":"")} onClick={() => setFilter("today")}>HÔM NAY · 8</div>
              <div className={"rcp-filter " + (filter==="all"?"on":"")} onClick={() => setFilter("all")}>TẤT CẢ</div>
              <div className={"rcp-filter " + (filter==="walk"?"on":"")} onClick={() => setFilter("walk")}>VÃNG LAI</div>
            </div>
          </div>
          <div className="rcp-list">
            {filtered.map((p, i) => (
              <div key={p.id} className={"rcp-row " + (sel === p.id ? "sel" : "")} onClick={() => setSel(p.id)}>
                <div className="tok">{p.token || String(i+1).padStart(3,"0")}</div>
                <div>
                  <div className="nm">{p.name}</div>
                  <div className="sub">{p.id} · {p.age}{p.gender==="M"?"Nam":"Nữ"} · {p.bhytClass || "—"}</div>
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--t-2)", textAlign:"right"}}>
                  {p.arrived || "—"}<br/>
                  <span style={{color: p.status === "ready" ? "var(--s-ok)" : p.status === "in" ? "var(--a-cy)" : "var(--s-warn)"}}>
                    {p.status === "ready" ? "● CHỜ" : p.status === "in" ? "● KHÁM" : p.status === "paying" ? "● THU" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE: patient form */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Thông tin bệnh nhân</b>
            <span className="meta">F2 lưu · F3 thêm BN mới · F5 quét CCCD</span>
          </div>
          <div className="rcp-form">
            <div className="rcp-form-head">
              <div className="rcp-h-main">
                <div className="rcp-avatar">{patient.name.split(" ").slice(-1)[0][0]}</div>
                <div>
                  <div className="rcp-h-name">{patient.name}</div>
                  <div className="rcp-h-meta">
                    <span><b>{patient.id}</b></span>
                    <span>{patient.age} tuổi · {patient.gender === "M" ? "Nam" : "Nữ"}</span>
                    <span>Nhóm máu <b>{patient.bloodType}</b></span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <div style={{fontSize:"var(--fs-xxs)",fontFamily:"var(--font-mono)",color:"var(--t-2)",letterSpacing:"0.06em"}}>MÃ TIẾP ĐÓN</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:20,fontWeight:600,color:"var(--a-cy)"}}>{appt?.token || "—"}</div>
                <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{appt?.arrived || "—"}</div>
              </div>
            </div>

            <div className="rcp-form-grid">
              <div className="rcp-sec-h">Thông tin cá nhân</div>
              <div className="rcp-fld rcp-c-6 req"><div className="rcp-fld-lbl">Họ và tên</div><div className="rcp-fld-val">{patient.name}</div></div>
              <div className="rcp-fld rcp-c-3"><div className="rcp-fld-lbl">Ngày sinh</div><div className="rcp-fld-val">{patient.dob}</div></div>
              <div className="rcp-fld rcp-c-3"><div className="rcp-fld-lbl">Giới tính</div><div className="rcp-fld-val">{patient.gender === "M" ? "Nam" : "Nữ"}</div></div>
              <div className="rcp-fld rcp-c-4"><div className="rcp-fld-lbl">Nghề nghiệp</div><div className="rcp-fld-val">{patient.job}</div></div>
              <div className="rcp-fld rcp-c-4"><div className="rcp-fld-lbl">SĐT</div><div className="rcp-fld-val">{patient.phone}</div></div>
              <div className="rcp-fld rcp-c-4"><div className="rcp-fld-lbl">Nhóm máu / Dị ứng</div>
                <div className="rcp-fld-val">
                  {patient.bloodType} {patient.allergy.length > 0 && (
                    <span style={{marginLeft:8, color:"var(--s-crit)", fontWeight:600}}>⚠ {patient.allergy.join(", ")}</span>
                  )}
                </div>
              </div>

              <div className="rcp-sec-h">Địa chỉ (Sau sáp nhập đơn vị hành chính)</div>
              <div className="rcp-fld rcp-c-12"><div className="rcp-fld-lbl">Địa chỉ mới (37-ĐVHC-2026)</div><div className="rcp-fld-val">{patient.address.new}</div></div>
              {addrMerged && (
                <div className="rcp-addr-merge">
                  <span className="tag">SÁP NHẬP</span>
                  <span><b>Địa chỉ cũ:</b> {patient.address.old} → đã được đồng bộ sang đơn vị hành chính mới theo NQ 1211/NQ-UBTVQH15.</span>
                </div>
              )}

              <div className="rcp-sec-h">Bảo hiểm y tế</div>
              {bhytCovers ? (
                <div className="rcp-bhyt-card">
                  <div className="rcp-bhyt-cls">{patient.bhytClass}</div>
                  <div>
                    <div className="rcp-bhyt-num">{patient.bhyt}</div>
                    <div className="rcp-bhyt-meta">
                      Nơi đăng ký KCB ban đầu: <b>BVĐK Hưng Yên</b> ·
                      HSD: <b>{patient.bhytExp}</b> ·
                      Đối tượng: <b>{patient.insuredBy === "HT" ? "Hưu trí" : "Thường"}</b> ·
                      Mức hưởng: <b>{bhytPct}%</b>
                    </div>
                  </div>
                  <div className="rcp-bhyt-stat">✓ HỢP LỆ</div>
                </div>
              ) : (
                <div style={{gridColumn:"span 12", padding:"10px 12px", border:"1px dashed var(--line)", borderRadius:"var(--r-2)", color:"var(--t-2)", fontSize:"var(--fs-sm)", background:"var(--d-1)"}}>
                  Không có BHYT · Thu phí dịch vụ 100%
                </div>
              )}

              <div className="rcp-sec-h">Tiền sử chính</div>
              <div className="rcp-fld rcp-c-12">
                <div className="rcp-fld-lbl">ICD-10 đã ghi nhận</div>
                <div className="rcp-fld-val" style={{gap:8, flexWrap:"wrap"}}>
                  {patient.icdHist.length === 0 ? <span style={{color:"var(--t-3)"}}>— Chưa có —</span> :
                    patient.icdHist.map(c => (
                      <span key={c} style={{padding:"2px 8px", background:"var(--d-3)", border:"1px solid var(--line)", borderRadius:"var(--r-2)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)"}}>{c}</span>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: dispatch */}
        <div className="rcp-col">
          <div className="rcp-col-h">
            <b>Chỉ định khoa khám</b>
            <span className="meta">bước 2/2</span>
          </div>
          <div className="rcp-disp">
            <h4>Chọn khoa / phòng</h4>
            <div className="rcp-dept-grid">
              {depts.map(d => (
                <div key={d.k} className={"rcp-dept " + (dept === d.k ? "sel" : "")} onClick={() => setDept(d.k)}>
                  <span>{d.k}</span>
                  <span className="q">chờ {d.q}</span>
                </div>
              ))}
            </div>

            <h4>Lý do khám</h4>
            <textarea
              style={{
                width:"100%", minHeight:60, padding:"8px 10px",
                border:"1px solid var(--line)", borderRadius:"var(--r-2)",
                fontSize:"var(--fs-sm)", resize:"vertical", background:"#fff"
              }}
              defaultValue="Đau thượng vị 3 ngày, ăn khó tiêu, ợ chua"
            />

            <h4>Phí khám dự kiến</h4>
            <div className="rcp-fee">
              <div className="rcp-fee-row">
                <span>Công khám BS chuyên khoa (Hạng I) <span className="sub">17.0120.0001</span></span>
                <span className="v">{HIS_UTIL.money(feeKham)} ₫</span>
              </div>
              <div className="rcp-fee-row">
                <span>BHYT chi trả {bhytPct}%</span>
                <span className="v" style={{color:"var(--s-ok)"}}>−{HIS_UTIL.money(chiTra)} ₫</span>
              </div>
              <div className="rcp-fee-row total">
                <span>BN đồng chi trả</span>
                <span className="v">{HIS_UTIL.money(benNhanTra)} ₫</span>
              </div>
            </div>

            <div className="rcp-actions">
              <button className="rcp-btn-primary">
                IN SỐ THỨ TỰ & ĐƯA VÀO HÀNG ĐỢI
                <span className="kbd">F2</span>
              </button>
              <button className="rcp-btn-sec">⎙ In phiếu tiếp đón</button>
              <button className="rcp-btn-sec">⎙ In hóa đơn công khám</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ReceptionModule = ReceptionModule;
