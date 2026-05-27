// HIS LIS — Laboratory Information System
const { useState: useLS } = React;

const LISModule = () => {
  const labs = HIS.labs;
  const [sel, setSel] = useLS("XN-2026-4419");
  const [tab, setTab] = useLS("all");

  const counts = {
    all: labs.length,
    pending: labs.filter(l => l.status==="pending").length,
    running: labs.filter(l => l.status==="running").length,
    verified: labs.filter(l => l.status==="verified").length,
    stat: labs.filter(l => l.priority==="STAT").length,
  };
  const filtered = tab==="all" ? labs
                  : tab==="stat" ? labs.filter(l => l.priority==="STAT")
                  : labs.filter(l => l.status===tab);

  const l = labs.find(x => x.id===sel);
  const p = HIS.patientById(l.pid);
  const rows = HIS.labRows[l.id] || HIS.labRows["XN-2026-4419"];

  return (
    <div className="lis-wrap">
      <div className="lis-strip">
        <div className="lis-strip-cell"><span className="lbl">Tổng XN hôm nay</span><span className="val">142</span></div>
        <div className="lis-strip-cell warn"><span className="lbl">Đang chạy</span><span className="val">{counts.running}</span></div>
        <div className="lis-strip-cell crit"><span className="lbl">STAT chờ duyệt</span><span className="val">{counts.stat}</span></div>
        <div className="lis-strip-cell"><span className="lbl">Đã duyệt</span><span className="val">{counts.verified}</span></div>
        <div className="lis-strip-cell"><span className="lbl">TAT trung bình</span><span className="val">42<span style={{fontSize:12,color:"var(--t-3)"}}>p</span></span></div>
        <div className="lis-strip-cell"><span className="lbl">Kết quả bất thường</span><span className="val" style={{color:"var(--s-warn)"}}>18 <span style={{fontSize:12,color:"var(--t-3)",fontWeight:400}}>12.6%</span></span></div>
      </div>

      <div className="lis-grid">
        <div className="lis-list">
          <div className="lis-toolbar">
            <div className="lis-tabs">
              <div className={"lis-tab " + (tab==="all"?"on":"")} onClick={()=>setTab("all")}>Tất cả <span className="n">{counts.all}</span></div>
              <div className={"lis-tab " + (tab==="pending"?"on":"")} onClick={()=>setTab("pending")}>Chờ <span className="n">{counts.pending}</span></div>
              <div className={"lis-tab " + (tab==="running"?"on":"")} onClick={()=>setTab("running")}>Chạy <span className="n">{counts.running}</span></div>
              <div className={"lis-tab " + (tab==="verified"?"on":"")} onClick={()=>setTab("verified")}>Duyệt <span className="n">{counts.verified}</span></div>
              <div className={"lis-tab " + (tab==="stat"?"on":"")} onClick={()=>setTab("stat")}>STAT <span className="n">{counts.stat}</span></div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="opd-btn-sec" style={{height:28,padding:"0 10px"}}>⎌ Interface máy XN</button>
              <button className="opd-btn-primary" style={{height:28,padding:"0 14px",fontSize:"var(--fs-xs)"}}>+ Nhận mẫu</button>
            </div>
          </div>

          <div className="lis-tbl-wrap">
            <table className="lis-tbl">
              <thead>
                <tr>
                  <th>Mã XN</th>
                  <th>Bệnh nhân</th>
                  <th>Panel</th>
                  <th>Khoa</th>
                  <th>Lấy mẫu</th>
                  <th>Máy</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>TAT</th>
                  <th>BT</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(x => {
                  const xp = HIS.patientById(x.pid);
                  return (
                    <tr key={x.id} className={sel===x.id?"sel":""} onClick={()=>setSel(x.id)}>
                      <td className="id">{x.id}</td>
                      <td>
                        <div style={{fontWeight:500}}>{xp.name}</div>
                        <div style={{fontSize:"var(--fs-xs)",color:"var(--t-3)",fontFamily:"var(--font-mono)"}}>{x.pid}</div>
                      </td>
                      <td>{x.panel}</td>
                      <td>{x.ward}</td>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>{x.collected}</td>
                      <td style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>{x.analyzer}</td>
                      <td><span className={"prio-stat prio-" + x.priority}>{x.priority}</span></td>
                      <td><span className={"prio-stat stat-" + x.status}>{x.status === "running" ? "● CHẠY" : x.status === "verified" ? "✓ DUYỆT" : "○ CHỜ"}</span></td>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>{x.tat}</td>
                      <td>
                        {x.abnormal > 0 ? (
                          <span style={{color:x.abnormal >= 2?"var(--s-crit)":"var(--s-warn)"}}>
                            <span className="ab" style={{background:x.abnormal >= 2?"var(--s-crit)":"var(--s-warn)"}}/>
                            {x.abnormal}
                          </span>
                        ) : <span style={{color:"var(--t-3)"}}>0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        <div className="lis-detail">
          <div className="lis-detail-h">
            <div className="lis-detail-t">{l.panel}</div>
            <div className="lis-detail-m">
              <span><b>{l.id}</b></span>
              <span>{p.name} · <b>{p.id}</b></span>
              <span>{p.age}t · {p.gender==="M"?"Nam":"Nữ"}</span>
              <span>Ưu tiên <b>{l.priority}</b></span>
              <span>Máy <b>{l.analyzer}</b></span>
            </div>
          </div>

          <div className="lis-status-bar">
            <span className="dot"/>
            <b>Nhận mẫu 08:20</b> · <span>Chạy 08:28</span> · <b>Xong 08:52</b> · <b>Đã duyệt bởi KTV. Đỗ Quang Tuấn lúc 08:54</b>
          </div>

          <div className="lis-detail-body">
            <div className="lis-res-head">
              <span>Chỉ số</span>
              <span style={{textAlign:"right"}}>Kết quả</span>
              <span>Tham chiếu</span>
              <span style={{textAlign:"center"}}>Cờ</span>
            </div>
            {rows.map(r => {
              const cls = r.flag === "HH" ? "crit" : r.flag === "H" || r.flag === "L" ? "warn" : "";
              return (
                <div key={r.name} className={"lis-res-row " + cls}>
                  <span>{r.name}</span>
                  <span className="v">{r.value} <span style={{fontSize:"var(--fs-xs)",fontWeight:400,color:"var(--t-2)"}}>{r.unit}</span></span>
                  <span className="ref">{r.ref}</span>
                  <span style={{textAlign:"center"}}>
                    {r.flag && <span className={"flag flag-" + r.flag}>{r.flag}</span>}
                  </span>
                </div>
              );
            })}

            <div style={{padding:"14px",borderTop:"1px solid var(--line)"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Bình luận KTV</div>
              <div style={{fontSize:"var(--fs-sm)",padding:"10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:"var(--r-2)",lineHeight:1.55}}>
                Troponin I và CK-MB tăng đáng kể, phù hợp với tổn thương cơ tim cấp.
                Đề nghị lặp lại sau 3h để đánh giá diễn tiến, kết hợp ECG 12 đạo trình và
                siêu âm tim. Cảnh báo đã gửi đến khoa Nội.
              </div>
            </div>
          </div>

          <div className="lis-detail-foot">
            <div className="lis-sign">
              <div className="lis-sign-dr">
                <b>KTV. Đỗ Quang Tuấn</b>
                <span>XN-2026-4419 · 08:54 · chữ ký số</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="opd-btn-sec">⎙ In kết quả</button>
              <button className="opd-btn-sec">📧 Gửi BS</button>
              <button className="opd-btn-primary" style={{padding:"0 14px"}}>✓ Duyệt lại</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.LISModule = LISModule;
