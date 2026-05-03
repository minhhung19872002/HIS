// HIS Patients — Hồ sơ bệnh nhân
const { useState: usePS, useMemo: usePM } = React;

const PatientsModule = () => {
  const pts = HIS.patients;
  const [sel, setSel] = usePS(pts[0].id);
  const [q, setQ] = usePS("");
  const [filter, setFilter] = usePS("all");

  const filtered = usePM(() => {
    let src = pts;
    if (filter === "bhyt") src = src.filter(p => p.bhyt !== "—");
    if (filter === "active") src = src.slice(0, 8);
    if (q) {
      const Q = q.toLowerCase();
      src = src.filter(p => p.name.toLowerCase().includes(Q) || p.id.toLowerCase().includes(Q) || p.phone.includes(Q));
    }
    return src;
  }, [q, filter]);

  const p = HIS.patientById(sel);

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1, minHeight:0}}>
      <div className="pts-strip">
        <div className="pts-strip-cell">
          <div className="lbl">Tổng hồ sơ</div>
          <div className="val">28,412 <span className="delta">+142 tháng này</span></div>
        </div>
        <div className="pts-strip-cell">
          <div className="lbl">Đang điều trị</div>
          <div className="val">47 <small>nội trú</small></div>
        </div>
        <div className="pts-strip-cell">
          <div className="lbl">BHYT hợp lệ</div>
          <div className="val">96.2<small>%</small></div>
        </div>
        <div className="pts-strip-cell">
          <div className="lbl">Dị ứng ghi nhận</div>
          <div className="val">2,184</div>
        </div>
        <div className="pts-strip-cell">
          <div className="lbl">Chờ đồng bộ ĐVHC</div>
          <div className="val" style={{color:"var(--s-warn)"}}>38</div>
        </div>
      </div>

      <div className="pts-grid">
        <div className="pts-main">
          <div className="pts-filter">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm theo mã BN, tên, SĐT, CCCD, BHYT..."/>
            <div className={"chip " + (filter==="all"?"on":"")} onClick={()=>setFilter("all")}>Tất cả · {pts.length}</div>
            <div className={"chip " + (filter==="active"?"on":"")} onClick={()=>setFilter("active")}>Đang điều trị · 8</div>
            <div className={"chip " + (filter==="bhyt"?"on":"")} onClick={()=>setFilter("bhyt")}>Có BHYT · {pts.filter(p=>p.bhyt!=="—").length}</div>
            <div className="chip">Cần cập nhật</div>
            <div className="chip" style={{background:"var(--a-cy)",color:"#fff",borderColor:"var(--a-cy)"}}>+ Thêm BN</div>
          </div>

          <div className="pts-tbl-wrap">
            <table className="pts-tbl">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Họ tên</th>
                  <th>Ngày sinh</th>
                  <th>Giới</th>
                  <th>SĐT</th>
                  <th>Nhóm máu</th>
                  <th>BHYT</th>
                  <th>Địa chỉ (mới)</th>
                  <th>Tiền sử</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(x => (
                  <tr key={x.id} className={sel===x.id?"sel":""} onClick={()=>setSel(x.id)}>
                    <td className="id">{x.id}</td>
                    <td>
                      <div className="nm">{x.name}</div>
                      <div style={{fontSize:"var(--fs-xs)",color:"var(--t-3)"}}>{x.age} tuổi · {x.job}</div>
                    </td>
                    <td className="bhyt">{x.dob}</td>
                    <td>{x.gender === "M" ? "Nam" : "Nữ"}</td>
                    <td className="bhyt">{x.phone}</td>
                    <td style={{fontFamily:"var(--font-mono)"}}>{x.bloodType}</td>
                    <td>
                      {x.bhyt !== "—" ? (
                        <div>
                          <span className="chip-bhyt">{x.bhytClass}</span>
                          <div className="bhyt" style={{marginTop:2}}>{x.bhyt}</div>
                        </div>
                      ) : <span className="chip-bhyt none">—</span>}
                    </td>
                    <td style={{fontSize:"var(--fs-xs)",color:"var(--t-1)",maxWidth:220}}>{x.address.new}</td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>
                      {x.icdHist.length === 0 ? <span style={{color:"var(--t-3)"}}>—</span> : x.icdHist.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pts-side">
          <div className="pts-side-h">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div className="pts-side-name">{p.name}</div>
                <div className="pts-side-meta">{p.id} · {p.age} tuổi · {p.gender==="M"?"Nam":"Nữ"}</div>
              </div>
              <a href={"EMR.html"} className="rcp-btn-sec" style={{padding:"6px 10px",background:"var(--a-cy)",color:"#fff",borderColor:"var(--a-cy)",borderRadius:"var(--r-2)",fontSize:"var(--fs-xs)",border:"0"}}>Mở EMR →</a>
            </div>
          </div>
          <div className="pts-side-body">
            <div className="pts-side-sec">
              <h5>Thông tin cá nhân</h5>
              <div className="pts-kv"><span className="k">Ngày sinh</span><span className="v">{p.dob}</span></div>
              <div className="pts-kv"><span className="k">Nghề nghiệp</span><span className="v">{p.job}</span></div>
              <div className="pts-kv"><span className="k">Điện thoại</span><span className="v">{p.phone}</span></div>
              <div className="pts-kv"><span className="k">Nhóm máu</span><span className="v">{p.bloodType}</span></div>
            </div>

            <div className="pts-side-sec">
              <h5>Bảo hiểm y tế</h5>
              {p.bhyt !== "—" ? (
                <>
                  <div className="pts-kv"><span className="k">Mã BHYT</span><span className="v" style={{fontFamily:"var(--font-mono)"}}>{p.bhyt}</span></div>
                  <div className="pts-kv"><span className="k">Nhóm</span><span className="v">{p.bhytClass}</span></div>
                  <div className="pts-kv"><span className="k">Hạn dùng</span><span className="v">{p.bhytExp}</span></div>
                  <div className="pts-kv"><span className="k">Nơi KCB</span><span className="v">BVĐK Hưng Yên</span></div>
                </>
              ) : (
                <div style={{color:"var(--t-3)",fontSize:"var(--fs-sm)",padding:"6px 0"}}>Không có BHYT · Dịch vụ 100%</div>
              )}
            </div>

            <div className="pts-side-sec">
              <h5>Địa chỉ</h5>
              <div style={{padding:"8px 10px",background:"var(--d-1)",borderRadius:"var(--r-2)",border:"1px solid var(--line)",fontSize:"var(--fs-sm)"}}>
                <div style={{fontWeight:500,color:"var(--t-0)"}}>{p.address.new}</div>
                {p.address.new !== p.address.old && (
                  <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)",marginTop:4,paddingTop:4,borderTop:"1px dashed var(--line)"}}>
                    <b>Cũ (pre-2026):</b> {p.address.old}
                  </div>
                )}
              </div>
            </div>

            {p.allergy.length > 0 && (
              <div className="pts-side-sec">
                <h5>⚠ Dị ứng</h5>
                <div style={{padding:"8px 10px",background:"var(--s-crit-bg)",borderRadius:"var(--r-2)",border:"1px solid #fca5a5",fontSize:"var(--fs-sm)",color:"var(--s-crit)",fontWeight:500}}>
                  {p.allergy.map(a => <div key={a}>• {a}</div>)}
                </div>
              </div>
            )}

            <div className="pts-side-sec">
              <h5>Tiền sử ICD-10</h5>
              {p.icdHist.length > 0 ? (
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {p.icdHist.map(c => <span key={c} style={{padding:"3px 8px",background:"var(--d-3)",border:"1px solid var(--line)",borderRadius:"var(--r-2)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>{c}</span>)}
                </div>
              ) : <div style={{color:"var(--t-3)",fontSize:"var(--fs-sm)"}}>Chưa ghi nhận</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.PatientsModule = PatientsModule;
