// Remaining modules: Reception, IPD, Surgery, Billing, RIS, LIS
const { useState: useS3 } = React;

// ============== RECEPTION ==============
const ReceptionModule = () => {
  const [tab, setTab] = useS3("intake");
  const [form, setForm] = useS3({ name: "", dob: "", phone: "", gender: "M", insurance: "" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-1)" }}>
        <div className="tabs">
          <div className={"tab " + (tab === "intake" ? "active" : "")} onClick={() => setTab("intake")}>ĐĂNG KÝ MỚI</div>
          <div className={"tab " + (tab === "today" ? "active" : "")} onClick={() => setTab("today")}>BN ĐĂNG KÝ HÔM NAY <span className="n">24</span></div>
          <div className={"tab " + (tab === "appt" ? "active" : "")} onClick={() => setTab("appt")}>LỊCH HẸN</div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {tab === "intake" && (
            <div style={{ maxWidth: 720 }}>
              <div className="serif" style={{ fontSize: 20, color: "var(--t-0)" }}>Tiếp nhận bệnh nhân</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginTop: 4 }}>
                Mã BN sẽ được cấp tự động · Quầy 03 · 08:42
              </div>

              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label className="label">HỌ VÀ TÊN *</label><input className="input" placeholder="Nguyễn Văn A" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div><label className="label">NGÀY SINH *</label><input className="input mono" placeholder="DD/MM/YYYY"/></div>
                <div><label className="label">GIỚI TÍNH</label>
                  <div className="seg" style={{ width: "100%" }}>
                    <button className={form.gender==="M"?"active":""} onClick={()=>setForm({...form,gender:"M"})} style={{flex:1}}>Nam</button>
                    <button className={form.gender==="F"?"active":""} onClick={()=>setForm({...form,gender:"F"})} style={{flex:1}}>Nữ</button>
                    <button style={{flex:1}}>Khác</button>
                  </div>
                </div>
                <div><label className="label">SỐ ĐIỆN THOẠI *</label><input className="input mono" placeholder="09xx xxx xxx"/></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="label">ĐỊA CHỈ</label><input className="input" placeholder="Số nhà, xã/phường, quận/huyện, tỉnh/TP"/></div>
                <div><label className="label">SỐ BHYT</label><input className="input mono" placeholder="HN4-..."/></div>
                <div><label className="label">LOẠI HÌNH KHÁM</label>
                  <select className="select">
                    <option>BHYT - Khám thường</option>
                    <option>BHYT - Khám theo yêu cầu</option>
                    <option>Dịch vụ</option>
                    <option>Cấp cứu</option>
                  </select>
                </div>
                <div><label className="label">CHUYÊN KHOA</label>
                  <select className="select">
                    <option>Nội tổng quát</option><option>Tim mạch</option><option>Sản phụ khoa</option><option>Ngoại chấn thương</option>
                  </select>
                </div>
                <div><label className="label">BÁC SĨ CHỈ ĐỊNH</label>
                  <select className="select">
                    <option>— Tự động phân —</option><option>TS.BS Nguyễn Hoài Linh (P.201)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 14, border: "1px solid var(--a-cy-line)", borderRadius: 6, background: "var(--a-cy-bg)", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="check" size={14} className="mono"/>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--a-cy)" }}>SẴN SÀNG CẤP SỐ</div>
                  <div style={{ fontSize: 13, color: "var(--t-0)", marginTop: 2 }}>Số thứ tự kế tiếp: <b className="mono" style={{ color: "var(--a-cy)" }}>A-020</b> · Phòng khám 201 · ước tính 15 phút</div>
                </div>
                <div className="spacer" style={{ flex: 1 }}/>
                <button className="btn">Huỷ</button>
                <button className="btn primary">Cấp số & In phiếu →</button>
              </div>
            </div>
          )}

          {tab === "today" && (
            <table className="tbl">
              <thead><tr><th>SỐ</th><th>MÃ BN</th><th>HỌ TÊN</th><th>TUỔI</th><th>GIỚI</th><th>LOẠI HÌNH</th><th>CHUYÊN KHOA</th><th>ĐẾN LÚC</th><th>TRẠNG THÁI</th></tr></thead>
              <tbody>
                {HIS_DATA.queue.map(q => { const p = HIS_DATA.patientById(q.pid); return (
                  <tr key={q.pid}>
                    <td className="mono"><span className="chip cy">{q.token}</span></td>
                    <td className="mono">{p.id}</td>
                    <td>{p.name}</td>
                    <td className="num">{p.age}</td>
                    <td>{p.gender === "M" ? "Nam" : "Nữ"}</td>
                    <td className="muted">{p.insurance.startsWith("BHYT") ? "BHYT" : "Dịch vụ"}</td>
                    <td>Nội tổng quát</td>
                    <td className="mono">{q.arrived}</td>
                    <td><span className={`chip ${statusToChip(q.status)}`}>{statusLabel(q.status)}</span></td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}

          {tab === "appt" && <div className="ph" style={{ minHeight: 200 }}>APPOINTMENTS · calendar grid</div>}
        </div>
      </div>

      <div style={{ borderLeft: "1px solid var(--line)", padding: 18, overflow: "auto", background: "var(--d-2)" }}>
        <div className="label">QUẦY TIẾP NHẬN · 03</div>
        <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>Hôm nay</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <QuickStat label="ĐÃ ĐĂNG KÝ" v="24" />
          <QuickStat label="CHỜ KHÁM" v="8" />
          <QuickStat label="TRUNG BÌNH" v="4 p" sub="xử lý / BN"/>
          <QuickStat label="DOANH THU" v="14.2" sub="triệu ₫"/>
        </div>
        <div className="hline" style={{ margin: "16px 0" }}/>
        <div className="label">LỊCH HẸN SẮP TỚI</div>
        <div className="stack-sm">
          {[
            { t: "09:00", n: "Đỗ Thị Mai", r: "Khám thai 32w" },
            { t: "09:30", n: "Nguyễn Văn Thành", r: "Tái khám THA" },
            { t: "10:00", n: "Lê Thị Hồng", r: "Xét nghiệm định kỳ" },
            { t: "10:30", n: "Phạm Gia Bảo", r: "Tiêm chủng" },
          ].map((a,i) => (
            <div key={i} style={{ padding: "8px 10px", background: "var(--d-1)", border: "1px solid var(--line)", borderRadius: 4, display: "flex", gap: 10 }}>
              <span className="mono" style={{ color: "var(--a-cy)", fontSize: 12 }}>{a.t}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12 }}>{a.n}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>{a.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickStat = ({ label, v, sub }) => (
  <div style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 4, background: "var(--d-1)" }}>
    <div className="mono" style={{ fontSize: 9, color: "var(--t-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    <div className="mono" style={{ fontSize: 20, color: "var(--t-0)", marginTop: 2 }}>{v}</div>
    {sub && <div className="mono" style={{ fontSize: 9, color: "var(--t-3)" }}>{sub}</div>}
  </div>
);

// ============== IPD (BED MAP) ==============
const IPDModule = () => {
  const [wardId, setWardId] = useS3(HIS_DATA.wards[0].id);
  const [bedSel, setBedSel] = useS3(null);
  const ward = HIS_DATA.wards.find(w => w.id === wardId);
  const totalBeds = ward.rooms.reduce((s, r) => s + r.beds.length, 0);
  const occupied = ward.rooms.reduce((s, r) => s + r.beds.filter(b => b.status === "occupied").length, 0);
  const occ = Math.round(occupied / totalBeds * 100);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 340px", height: "100%", minHeight: 0 }}>
      {/* Ward list */}
      <div style={{ borderRight: "1px solid var(--line)", background: "var(--d-2)", padding: 8 }}>
        <div className="label" style={{ padding: "6px 6px 8px" }}>KHOA</div>
        {HIS_DATA.wards.map(w => {
          const wt = w.rooms.reduce((s,r)=>s+r.beds.length,0);
          const wo = w.rooms.reduce((s,r)=>s+r.beds.filter(b=>b.status==="occupied").length,0);
          const sel = w.id === wardId;
          return (
            <div key={w.id} onClick={()=>setWardId(w.id)} style={{
              padding: "8px 10px", borderLeft: sel?"2px solid var(--a-cy)":"2px solid transparent",
              background: sel?"var(--a-cy-bg)":"transparent", borderRadius: 4, cursor: "pointer", marginBottom: 2,
            }}>
              <div style={{ fontSize: 12, color: sel?"var(--t-0)":"var(--t-1)" }}>{w.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{wo}/{wt} giường · {Math.round(wo/wt*100)}%</div>
            </div>
          );
        })}
      </div>

      {/* Bed map */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "var(--d-1)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div className="serif" style={{ fontSize: 18 }}>{ward.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginTop: 2 }}>
              {ward.rooms.length} phòng · {totalBeds} giường
            </div>
          </div>
          <div className="spacer" style={{ flex: 1 }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", textAlign: "right" }}>CÔNG SUẤT</div>
              <div style={{ width: 180, height: 8, background: "var(--d-3)", borderRadius: 2, overflow: "hidden", marginTop: 4, position: "relative" }}>
                <div style={{ height: "100%", width: `${occ}%`, background: occ > 85 ? "var(--s-warn)" : "var(--s-ok)" }}/>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--t-0)", marginTop: 2, textAlign: "right" }}>{occupied}/{totalBeds} · {occ}%</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }} className="mono" style={{fontSize:10}}>
              <span className="row" style={{gap:4}}><span className="dot ok"/>Ổn định</span>
              <span className="row" style={{gap:4}}><span className="dot warn"/>Theo dõi</span>
              <span className="row" style={{gap:4}}><span className="dot crit"/>Nguy kịch</span>
            </div>
            <button className="btn primary"><Icon name="user-plus" size={12}/> Nhập viện</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {ward.rooms.map(room => (
              <div key={room.id} style={{ border: "1px solid var(--line)", borderRadius: 6, background: "var(--d-2)", overflow: "hidden" }}>
                <div style={{ padding: "8px 10px", background: "var(--d-0)", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--t-0)" }}>{room.id}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>
                    {room.beds.filter(b=>b.status==="occupied").length}/{room.beds.length}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)" }}>
                  {room.beds.map(b => (
                    <div key={b.n} onClick={()=>b.patient && setBedSel(b)} style={{
                      padding: 10, background: "var(--d-2)", cursor: b.patient ? "pointer" : "default",
                      minHeight: 84,
                      borderTop: b.severity ? `2px solid ${sevColor(b.severity)}` : "2px solid transparent",
                    }}>
                      <div className="row" style={{justifyContent:"space-between"}}>
                        <span className="mono" style={{fontSize:10,color:"var(--t-3)"}}>{b.n}</span>
                        {b.status === "free" && <span className="chip ok" style={{height:16}}>Trống</span>}
                        {b.status === "cleaning" && <span className="chip warn" style={{height:16}}>VS</span>}
                        {b.status === "reserved" && <span className="chip info" style={{height:16}}>Giữ</span>}
                        {b.status === "occupied" && b.severity && <span className={`chip ${sevChip(b.severity)}`} style={{height:16}}>{sevLabel(b.severity)}</span>}
                      </div>
                      {b.patient ? (
                        <>
                          <div style={{fontSize:12,color:"var(--t-0)",marginTop:6}}>{b.patient.name}</div>
                          <div className="mono" style={{fontSize:9,color:"var(--t-3)",marginTop:2}}>{b.patient.id} · {b.los}d</div>
                          <div style={{fontSize:10,color:"var(--t-2)",marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.patient.dx}</div>
                        </>
                      ) : (
                        <div style={{marginTop:18,textAlign:"center",color:"var(--t-4)",fontFamily:"var(--font-mono)",fontSize:10}}>— {b.status === "cleaning" ? "Đang vệ sinh" : b.status === "reserved" ? "Đã giữ" : "Sẵn sàng"} —</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bed detail */}
      <div style={{ borderLeft: "1px solid var(--line)", background: "var(--d-2)", padding: 16, overflow: "auto" }}>
        {bedSel && bedSel.patient ? (
          <>
            <div className="label">GIƯỜNG {bedSel.n}</div>
            <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>{bedSel.patient.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--t-2)", marginTop: 2 }}>{bedSel.patient.id} · Ngày thứ {bedSel.los}</div>
            <div style={{ marginTop: 10 }}><span className={`chip ${sevChip(bedSel.severity)}`}>{sevLabel(bedSel.severity)}</span></div>
            <div className="hline" style={{ margin: "14px 0" }}/>
            <div className="label">CHẨN ĐOÁN</div>
            <div style={{ fontSize: 13 }}>{bedSel.patient.dx}</div>
            <div className="hline" style={{ margin: "14px 0" }}/>
            <div className="label">SINH HIỆU MỚI NHẤT · 08:00</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
              <MiniStat label="HA" value="128/82" unit="mmHg"/>
              <MiniStat label="HR" value="78" unit="bpm"/>
              <MiniStat label="T°" value="36.9" unit="°C"/>
              <MiniStat label="SpO₂" value="97" unit="%"/>
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
              <button className="btn primary">Mở hồ sơ bệnh án →</button>
              <button className="btn">Ghi y lệnh</button>
              <button className="btn">Chỉ định CLS</button>
              <button className="btn danger">Cho xuất viện</button>
            </div>
          </>
        ) : (
          <div className="ph" style={{minHeight:200,marginTop:20}}>CHỌN MỘT GIƯỜNG<br/>để xem thông tin</div>
        )}
      </div>
    </div>
  );
};
const sevColor = (s) => ({ stable: "var(--s-ok)", monitoring: "var(--s-warn)", critical: "var(--s-crit)" }[s] || "var(--t-4)");
const sevChip = (s) => ({ stable: "ok", monitoring: "warn", critical: "crit" }[s]);
const sevLabel = (s) => ({ stable: "ỔN ĐỊNH", monitoring: "THEO DÕI", critical: "NGUY KỊCH" }[s]);

// ============== SURGERY ==============
const SurgeryModule = () => {
  const HOURS = Array.from({length: 11}, (_, i) => 7 + i); // 7h-17h
  const hrToX = (hm) => { const [h, m] = hm.split(":").map(Number); return ((h - 7) * 60 + m) / (60 * 10) * 100; };

  return (
    <div style={{ padding: 14, height: "100%", overflow: "auto", background: "var(--d-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <div className="serif" style={{ fontSize: 20 }}>Lịch mổ · Thứ Bảy 18/04/2026</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginTop: 2 }}>
            9 ca mổ · 4 phòng hoạt động · 2 đang thực hiện
          </div>
        </div>
        <div className="spacer" style={{ flex: 1 }}/>
        <div className="seg"><button className="active">NGÀY</button><button>TUẦN</button><button>THÁNG</button></div>
        <button className="btn"><Icon name="chevron-left" size={12}/></button>
        <button className="btn">Hôm nay</button>
        <button className="btn"><Icon name="chevron-right" size={12}/></button>
        <button className="btn primary"><Icon name="plus" size={12}/> Lên lịch</button>
      </div>

      <div style={{ background: "var(--d-2)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
        {/* Hour ruler */}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", borderBottom: "1px solid var(--line)" }}>
          <div style={{ padding: "8px 10px", background: "var(--d-0)", borderRight: "1px solid var(--line)" }}>
            <span className="mono up" style={{ fontSize: 9, color: "var(--t-3)" }}>OR</span>
          </div>
          <div style={{ position: "relative", height: 28, background: "var(--d-0)" }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: "absolute", left: `${(h - 7) * 10}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--line)", paddingLeft: 4 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>{String(h).padStart(2,"0")}:00</span>
              </div>
            ))}
          </div>
        </div>

        {HIS_DATA.orRooms.map(or => {
          const cases = HIS_DATA.orSchedule.filter(s => s.or === or);
          return (
            <div key={or} style={{ display: "grid", gridTemplateColumns: "80px 1fr", borderBottom: "1px solid var(--line)", minHeight: 76 }}>
              <div style={{ padding: "10px 12px", borderRight: "1px solid var(--line)", background: "var(--d-0)" }}>
                <div className="mono" style={{ fontSize: 13, color: "var(--a-cy)" }}>{or}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{cases.length} ca</div>
              </div>
              <div style={{ position: "relative", background: "linear-gradient(90deg, var(--line-soft) 1px, transparent 1px) 0 0 / 10% 100%" }}>
                {cases.map((c, i) => {
                  const x1 = hrToX(c.start);
                  const x2 = hrToX(c.end);
                  const w = x2 - x1;
                  const bg = c.status === "done" ? "var(--s-ok-bg)" : c.status === "in-progress" ? "var(--a-cy-bg)" : "var(--s-mag-bg)";
                  const bd = c.status === "done" ? "var(--s-ok)" : c.status === "in-progress" ? "var(--a-cy)" : "var(--s-mag)";
                  return (
                    <div key={i} style={{
                      position: "absolute", left: `${x1}%`, width: `${w}%`,
                      top: 8, bottom: 8, background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`,
                      borderRadius: 3, padding: "4px 8px", overflow: "hidden", cursor: "pointer",
                    }}>
                      <div className="row" style={{ gap: 6, justifyContent: "space-between" }}>
                        <span className="mono" style={{ fontSize: 10, color: "var(--t-0)" }}>{c.start}–{c.end}</span>
                        {c.status === "in-progress" && <span className="chip cy" style={{height:14}}><span className="dot cy"/>LIVE</span>}
                        {c.status === "done" && <span className="chip ok" style={{height:14}}>XONG</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t-0)", marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.proc}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.pt} · {c.surgeon}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============== BILLING ==============
const BillingModule = () => {
  const [filter, setFilter] = useS3("all");
  const [selected, setSelected] = useS3(HIS_DATA.invoices[0]);
  const list = filter === "all" ? HIS_DATA.invoices : HIS_DATA.invoices.filter(i => i.status === filter);
  const totals = HIS_DATA.invoices.reduce((a, i) => {
    a.total += i.total; a.paid += i.paid; a.outstanding += (i.total - i.paid); return a;
  }, { total: 0, paid: 0, outstanding: 0 });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-1)" }}>
        <div style={{ padding: 14, borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <BigStat label="TỔNG DOANH THU HÔM NAY" v={(totals.total/1_000_000).toFixed(2)} unit="TRIỆU ₫"/>
          <BigStat label="ĐÃ THU" v={(totals.paid/1_000_000).toFixed(2)} unit="TRIỆU ₫" c="ok"/>
          <BigStat label="CÒN LẠI" v={(totals.outstanding/1_000_000).toFixed(2)} unit="TRIỆU ₫" c="warn"/>
          <BigStat label="HOÁ ĐƠN CHƯA THU" v={HIS_DATA.invoices.filter(i=>i.status!=="paid").length} unit="HĐ" c="crit"/>
        </div>

        <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center" }}>
          <div className="seg">
            {[{k:"all",l:"TẤT CẢ"},{k:"unpaid",l:"CHƯA THU"},{k:"partial",l:"MỘT PHẦN"},{k:"paid",l:"ĐÃ THU"}].map(f => (
              <button key={f.k} className={filter===f.k?"active":""} onClick={()=>setFilter(f.k)}>{f.l}</button>
            ))}
          </div>
          <input className="input mono" placeholder="Tìm HĐ, BN, SĐT…" style={{ maxWidth: 300 }}/>
          <div className="spacer" style={{ flex: 1 }}/>
          <button className="btn"><Icon name="download" size={12}/> Xuất Excel</button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <table className="tbl">
            <thead><tr><th>MÃ HĐ</th><th>BỆNH NHÂN</th><th>LOẠI</th><th>NGÀY</th><th className="num">MỤC</th><th className="num">TỔNG (₫)</th><th className="num">ĐÃ THU (₫)</th><th>TRẠNG THÁI</th></tr></thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id} className={selected?.id === inv.id ? "sel" : ""} onClick={()=>setSelected(inv)}>
                  <td className="mono">{inv.id}</td>
                  <td>{inv.pt} <span className="dim mono" style={{fontSize:10}}>· {inv.pid}</span></td>
                  <td><span className={`chip ${inv.kind==="Surgery"?"mag":inv.kind==="IPD"?"info":"ghost"}`}>{inv.kind}</span></td>
                  <td className="mono dim">{inv.date}</td>
                  <td className="num">{inv.items}</td>
                  <td className="num" style={{color:"var(--t-0)"}}>{inv.total.toLocaleString()}</td>
                  <td className="num" style={{color:inv.paid===inv.total?"var(--s-ok)":inv.paid>0?"var(--s-warn)":"var(--t-3)"}}>{inv.paid.toLocaleString()}</td>
                  <td><span className={`chip ${inv.status==="paid"?"ok":inv.status==="partial"?"warn":"crit"}`}>{inv.status==="paid"?"ĐÃ THU":inv.status==="partial"?"MỘT PHẦN":"CHƯA THU"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail */}
      <div style={{ borderLeft: "1px solid var(--line)", padding: 18, overflow: "auto", background: "var(--d-2)" }}>
        {selected && (
          <>
            <div className="label">HOÁ ĐƠN</div>
            <div className="mono" style={{ fontSize: 18, color: "var(--t-0)", marginTop: 2 }}>{selected.id}</div>
            <div style={{ fontSize: 13, color: "var(--t-1)", marginTop: 8 }}>{selected.pt}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>{selected.pid} · {selected.date}</div>
            <div className="hline" style={{ margin: "14px 0" }}/>
            <div className="label">CHI TIẾT</div>
            <div style={{ fontSize: 12, color: "var(--t-1)" }}>
              <LineRow k="Khám bệnh (1)" v="150,000"/>
              <LineRow k="Xét nghiệm (3)" v="620,000"/>
              <LineRow k="CĐHA (1)" v="450,000"/>
              <LineRow k="Thuốc (3)" v="1,120,000"/>
            </div>
            <div className="hline" style={{ margin: "14px 0" }}/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, fontSize: 13 }}>
              <span className="muted">Tổng tiền</span>
              <span className="mono" style={{ textAlign: "right" }}>{selected.total.toLocaleString()} ₫</span>
              <span className="muted">Đã thu</span>
              <span className="mono" style={{ textAlign: "right", color: "var(--s-ok)" }}>{selected.paid.toLocaleString()} ₫</span>
              <span style={{ color: "var(--t-0)", fontWeight: 500 }}>Còn lại</span>
              <span className="mono" style={{ textAlign: "right", color: "var(--s-crit)", fontSize: 18 }}>{(selected.total - selected.paid).toLocaleString()} ₫</span>
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
              <button className="btn primary">Thu tiền →</button>
              <button className="btn"><Icon name="printer" size={12}/> In hoá đơn</button>
              <button className="btn">Gửi SMS nhắc</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const LineRow = ({k,v}) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px dashed var(--line-soft)" }}>
    <span style={{ color: "var(--t-2)" }}>{k}</span>
    <span className="mono" style={{ color: "var(--t-0)" }}>{v} ₫</span>
  </div>
);

const BigStat = ({ label, v, unit, c }) => (
  <div style={{ padding: 12, background: "var(--d-2)", border: "1px solid var(--line)", borderRadius: 4 }}>
    <div className="mono up" style={{ fontSize: 9, color: "var(--t-3)" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
      <span className="mono" style={{ fontSize: 24, color: c === "ok" ? "var(--s-ok)" : c === "warn" ? "var(--s-warn)" : c === "crit" ? "var(--s-crit)" : "var(--t-0)" }}>{v}</span>
      <span className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>{unit}</span>
    </div>
  </div>
);

// ============== RIS/PACS ==============
const RISModule = () => {
  const [sel, setSel] = useS3(HIS_DATA.studies[0]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", height: "100%", minHeight: 0 }}>
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-2)" }}>
        <div className="panel-h" style={{ borderRadius: 0 }}>
          <span className="title">WORKLIST · <b>{HIS_DATA.studies.length}</b></span>
          <span className="actions"><button className="btn sm"><Icon name="filter" size={10}/> Lọc</button></span>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {HIS_DATA.studies.map(s => (
            <div key={s.id} onClick={()=>setSel(s)} style={{
              padding: "10px 12px", borderBottom: "1px solid var(--line-hair)",
              borderLeft: sel?.id===s.id?"2px solid var(--a-cy)":"2px solid transparent",
              background: sel?.id===s.id?"var(--a-cy-bg)":"transparent", cursor: "pointer",
            }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="chip mag">{s.modality}</span>
                {s.priority === "STAT" && <span className="chip crit">STAT</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--t-0)", marginTop: 6 }}>{s.pt}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{s.id} · {s.ordered} · {s.refDr}</div>
              <div style={{ fontSize: 11, color: "var(--t-2)", marginTop: 4 }}>{s.body}</div>
              <div style={{ marginTop: 6 }}>
                {s.status === "in-progress" && <span className="chip cy"><span className="dot cy"/>ĐANG CHỤP</span>}
                {s.status === "completed" && <span className="chip warn">CHỜ ĐỌC</span>}
                {s.status === "reported" && <span className="chip ok">ĐÃ CÓ KQ</span>}
                {s.status === "scheduled" && <span className="chip ghost">ĐÃ LÊN LỊCH</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Viewer */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#000" }}>
        <div style={{ padding: "10px 14px", background: "var(--d-0)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--a-cy)" }}>{sel?.id}</span>
          <span style={{ fontSize: 13, color: "var(--t-0)" }}>{sel?.pt}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>· {sel?.body}</span>
          <div className="spacer" style={{ flex: 1 }}/>
          <div className="seg" style={{ height: 24 }}><button className="active">W/L</button><button>ZOOM</button><button>PAN</button><button>MEASURE</button></div>
          <button className="btn sm"><Icon name="download" size={10}/> DICOM</button>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)", overflow: "hidden" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: "#000", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${30 + i * 15}% ${50 + (i%2)*20}%, #3a3f4a 0%, #1a1d22 35%, #000 80%)` }}>
                <div style={{ position: "absolute", left: "35%", top: "20%", width: "30%", height: "55%", background: "radial-gradient(ellipse, rgba(180,180,200,0.4) 0%, rgba(120,120,140,0.2) 50%, transparent 80%)", borderRadius: "50%" }}/>
                <div style={{ position: "absolute", left: "40%", top: "35%", width: "20%", height: "30%", background: "radial-gradient(circle, rgba(200,200,220,0.3) 0%, transparent 70%)" }}/>
              </div>
              <div className="mono" style={{ position: "absolute", top: 6, left: 6, fontSize: 10, color: "#aaf" }}>IM: {i + 1}/{248}</div>
              <div className="mono" style={{ position: "absolute", top: 6, right: 6, fontSize: 10, color: "#aaf" }}>{sel?.modality} · 512×512</div>
              <div className="mono" style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, color: "#aaf" }}>W 400  L 40</div>
              <div className="mono" style={{ position: "absolute", bottom: 6, right: 6, fontSize: 10, color: "#aaf" }}>0.5 mm</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 12, background: "var(--d-2)", borderTop: "1px solid var(--line)", maxHeight: 180 }}>
          <div className="label">KẾT LUẬN CỦA BÁC SĨ</div>
          <textarea className="input mono" style={{ height: 110, padding: 10, resize: "none", marginTop: 4, fontSize: 12 }}
            defaultValue="- Nhu mô phổi hai bên sáng. Không thấy tổn thương khu trú.
- Trung thất không giãn rộng. Bóng tim không to.
- Không tràn dịch, tràn khí màng phổi.
=> Kết luận: X-quang ngực PA trong giới hạn bình thường."/>
          <div className="row" style={{ marginTop: 8, justifyContent: "flex-end", gap: 6 }}>
            <button className="btn">Lưu nháp</button>
            <button className="btn primary">Ký số & Phát hành</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== LIS ==============
const LISModule = () => {
  const [sel, setSel] = useS3(HIS_DATA.labs[0]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-1)" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
          <div className="serif" style={{ fontSize: 18 }}>Xét nghiệm · Worklist</div>
          <span className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginLeft: 10 }}>{HIS_DATA.labs.length} mẫu</span>
          <div className="spacer" style={{ flex: 1 }}/>
          <div className="seg"><button className="active">HÔM NAY</button><button>CHỜ DUYỆT</button><button>BẤT THƯỜNG</button></div>
          <button className="btn primary"><Icon name="plus" size={12}/> Nhận mẫu</button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <table className="tbl">
            <thead><tr><th>MÃ</th><th>BỆNH NHÂN</th><th>PANEL</th><th>MỨC</th><th>GIỜ LẤY</th><th>TRẠNG THÁI</th><th className="num">ABN</th><th>TAT</th></tr></thead>
            <tbody>
              {HIS_DATA.labs.map(l => (
                <tr key={l.id} className={sel?.id===l.id?"sel":""} onClick={()=>setSel(l)}>
                  <td className="mono">{l.id}</td>
                  <td>{l.pt} <span className="dim mono" style={{fontSize:10}}>· {l.pid}</span></td>
                  <td className="muted">{l.panel}</td>
                  <td>{l.priority === "STAT" ? <span className="chip crit">STAT</span> : <span className="chip ghost">Routine</span>}</td>
                  <td className="mono">{l.collected}</td>
                  <td>
                    {l.status === "running" && <span className="chip cy"><span className="dot cy"/>CHẠY</span>}
                    {l.status === "verified" && <span className="chip ok">DUYỆT</span>}
                    {l.status === "pending" && <span className="chip ghost">CHỜ</span>}
                  </td>
                  <td className="num" style={{color:l.abnormal>0?"var(--s-warn)":"var(--t-3)"}}>{l.abnormal || "—"}</td>
                  <td className="mono dim">{l.tat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result detail */}
      <div style={{ borderLeft: "1px solid var(--line)", padding: 18, overflow: "auto", background: "var(--d-2)" }}>
        {sel && (
          <>
            <div className="label">KẾT QUẢ</div>
            <div className="mono" style={{ fontSize: 16, color: "var(--t-0)", marginTop: 2 }}>{sel.id}</div>
            <div style={{ fontSize: 13, color: "var(--t-1)", marginTop: 6 }}>{sel.pt}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>{sel.pid} · Lấy mẫu {sel.collected}</div>
            <div className="hline" style={{ margin: "14px 0" }}/>
            <div className="label">SINH HOÁ MÁU</div>
            <LabRow name="Glucose" v="7.8" unit="mmol/L" ref="3.9 – 6.1" flag="H"/>
            <LabRow name="Ure" v="5.2" unit="mmol/L" ref="2.5 – 7.5"/>
            <LabRow name="Creatinine" v="88" unit="µmol/L" ref="64 – 104"/>
            <LabRow name="AST (SGOT)" v="42" unit="U/L" ref="5 – 34" flag="H"/>
            <LabRow name="ALT (SGPT)" v="28" unit="U/L" ref="0 – 55"/>
            <LabRow name="Cholesterol TP" v="5.1" unit="mmol/L" ref="< 5.2"/>
            <LabRow name="HDL-C" v="1.2" unit="mmol/L" ref="> 1.03"/>
            <LabRow name="LDL-C" v="3.4" unit="mmol/L" ref="< 3.34" flag="H"/>
            <LabRow name="Triglyceride" v="2.1" unit="mmol/L" ref="< 1.7" flag="H"/>
            <LabRow name="Troponin I" v="< 0.01" unit="ng/mL" ref="< 0.04"/>
            <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
              <button className="btn primary">Duyệt kết quả</button>
              <button className="btn"><Icon name="printer" size={12}/> In phiếu KQ</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const LabRow = ({ name, v, unit, ref, flag }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 28px 90px", gap: 6, padding: "4px 0", borderBottom: "1px dashed var(--line-soft)", fontSize: 11, alignItems: "center" }}>
    <span style={{ color: "var(--t-1)" }}>{name}</span>
    <span className="mono" style={{ textAlign: "right", color: flag ? (flag === "H" ? "var(--s-warn)" : "var(--s-info)") : "var(--t-0)", fontWeight: flag ? 600 : 400 }}>{v}</span>
    <span className="mono" style={{ color: flag ? (flag === "H" ? "var(--s-warn)" : "var(--s-info)") : "transparent", fontSize: 10 }}>{flag || "·"}</span>
    <span className="mono dim" style={{ fontSize: 10 }}>{unit}  <span style={{color:"var(--t-4)"}}>· {ref}</span></span>
  </div>
);

Object.assign(window, { ReceptionModule, IPDModule, SurgeryModule, BillingModule, RISModule, LISModule });
