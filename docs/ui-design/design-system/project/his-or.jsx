// HIS OR Scheduling
const { useState: useOs } = React;

const ORModule = () => {
  const rooms = [
    {id:"OR-01", spec:"Tim mạch · Can thiệp", state:"live", util:78},
    {id:"OR-02", spec:"Tổng quát", state:"ready", util:62},
    {id:"OR-03", spec:"Sản khoa", state:"clean", util:54},
    {id:"OR-04", spec:"Chấn thương chỉnh hình", state:"ready", util:80},
    {id:"OR-05", spec:"Tiết niệu · Nội soi", state:"off", util:0},
    {id:"OR-06", spec:"Thần kinh · Cột sống", state:"clean", util:45},
  ];

  // 06:00–18:00, 12 hours
  // Slots: {room, start (fractional hour), dur, op, pid, stat, team}
  const slots = [
    // OR-01 (live)
    {room:"OR-01", s:6.5, dur:1.5, op:"Đặt stent LAD (PCI)", pt:"Lê Minh Khôi, 58M", surgeon:"BS. Hùng", stat:"done"},
    {room:"OR-01", s:8.0, dur:0.5, op:"Dọn vệ sinh", stat:"cleanup"},
    {room:"OR-01", s:8.5, dur:0.5, op:"Chuẩn bị", stat:"prep"},
    {room:"OR-01", s:9.0, dur:2.0, op:"Can thiệp ĐMV (PCI) LCx", pt:"Nguyễn Văn B, 63M", surgeon:"BS. Hùng", stat:"running"},
    {room:"OR-01", s:11.5, dur:1.5, op:"Chụp mạch vành + can thiệp", pt:"Trần T. Hoa, 71F", surgeon:"BS. Hùng", stat:"sched"},
    {room:"OR-01", s:14.0, dur:2.5, op:"Đặt máy tạo nhịp vĩnh viễn", pt:"Lê Văn C, 68M", surgeon:"BS. Hùng", stat:"sched"},

    // OR-02
    {room:"OR-02", s:7.0, dur:2.0, op:"Cắt túi mật nội soi", pt:"Phạm V. Quang, 42M", surgeon:"BS. Phong", stat:"done"},
    {room:"OR-02", s:9.0, dur:0.5, op:"Dọn", stat:"cleanup"},
    {room:"OR-02", s:9.5, dur:3.0, op:"Cắt tuyến giáp TP", pt:"Hoàng T. Lan, 47F", surgeon:"BS. Phong", stat:"running"},
    {room:"OR-02", s:13.0, dur:1.0, op:"Nghỉ trưa kíp", stat:"break"},
    {room:"OR-02", s:14.0, dur:2.5, op:"Mổ thoát vị bẹn 2 bên", pt:"Đỗ V. An, 35M", surgeon:"BS. Phong", stat:"sched"},
    {room:"OR-02", s:16.5, dur:1.5, op:"Cắt đoạn đại tràng", pt:"Nguyễn T. Mơ, 58F", surgeon:"BS. Hòa", stat:"sched"},

    // OR-03
    {room:"OR-03", s:6.5, dur:1.5, op:"Mổ lấy thai CT5 lần 2", pt:"Vũ T. Hồng, 31F", surgeon:"BS. Mai", stat:"done"},
    {room:"OR-03", s:8.0, dur:0.5, op:"Dọn", stat:"cleanup"},
    {room:"OR-03", s:8.5, dur:2.0, op:"Mổ lấy thai CT + thắt vòi", pt:"Trần T. Bảo, 38F", surgeon:"BS. Mai", stat:"done"},
    {room:"OR-03", s:10.5, dur:0.5, op:"Vệ sinh sâu", stat:"cleanup"},
    {room:"OR-03", s:11.5, dur:2.0, op:"U xơ tử cung · cắt TC", pt:"Lê T. Kim, 49F", surgeon:"BS. Mai", stat:"sched"},
    {room:"OR-03", s:14.5, dur:1.5, op:"Nội soi BPH u xơ", pt:"Ngô T. Quỳnh, 45F", surgeon:"BS. Mai", stat:"sched"},
    {room:"OR-03", s:16.5, dur:1.5, op:"Mổ lấy thai", pt:"Phạm T. Chi, 29F", surgeon:"BS. Trang", stat:"sched"},

    // OR-04
    {room:"OR-04", s:6.5, dur:2.5, op:"Kết hợp xương đùi (cdta)", pt:"Nguyễn V. Mạnh, 56M", surgeon:"BS. Tiến", stat:"done"},
    {room:"OR-04", s:9.0, dur:0.5, op:"Dọn", stat:"cleanup"},
    {room:"OR-04", s:9.5, dur:3.0, op:"Thay khớp háng toàn phần", pt:"Đinh V. Hùng, 72M", surgeon:"BS. Tiến", stat:"running"},
    {room:"OR-04", s:13.0, dur:0.5, op:"Dọn", stat:"cleanup"},
    {room:"OR-04", s:13.5, dur:1.5, op:"Nối gân Achilles", pt:"Trương Q. Tuấn, 28M", surgeon:"BS. Tiến", stat:"sched"},
    {room:"OR-04", s:15.5, dur:2.0, op:"Nội soi khớp gối", pt:"Bùi V. Lâm, 33M", surgeon:"BS. Dũng", stat:"sched"},

    // OR-06
    {room:"OR-06", s:8.5, dur:4.0, op:"Mổ vi phẫu đĩa đệm L4-L5", pt:"Phan T. Hưng, 52M", surgeon:"BS. Quốc", stat:"sched"},
    {room:"OR-06", s:13.5, dur:3.5, op:"Mổ u tủy cổ C5-C6", pt:"Nguyễn V. Tùng, 48M", surgeon:"BS. Quốc", stat:"sched"},
  ];

  const [selSlot, setSelSlot] = useOs(null);
  const START = 6, END = 18;
  const span = END - START;

  const pct = (h) => ((h - START) / span) * 100;

  const nowHour = 10 + 24/60; // 10:24
  const rooms_ = rooms.map(r => ({
    ...r,
    slots: slots.filter(s => s.room === r.id),
  }));

  const surgeonsOR = [
    {nm:"BS. Trần Quang Hùng", spec:"Tim mạch", stat:"or", room:"OR-01", next:"PCI LCx"},
    {nm:"BS. Lê Văn Phong", spec:"Tổng quát", stat:"or", room:"OR-02", next:"Cắt TG"},
    {nm:"BS. Vũ Thu Mai", spec:"Sản khoa", stat:"free", room:"—", next:"Cắt TC 11:30"},
    {nm:"BS. Nguyễn Tiến", spec:"CTCH", stat:"or", room:"OR-04", next:"Thay khớp háng"},
    {nm:"BS. Đặng Quốc", spec:"Thần kinh", stat:"free", room:"—", next:"Vi phẫu L4-L5"},
    {nm:"BS. Bùi Hòa", spec:"Tổng quát", stat:"opd", room:"OPD-06", next:"Cắt ĐT 16:30"},
  ];

  const gasologists = [
    {nm:"BS. Phạm T. An", spec:"Gây mê TQ", stat:"or", room:"OR-02"},
    {nm:"BS. Đỗ V. Bình", spec:"Gây mê tim", stat:"or", room:"OR-01"},
    {nm:"BS. Hoàng T. Chi", spec:"Gây mê Sản", stat:"break", room:"—"},
    {nm:"BS. Lê V. Dũng", spec:"Gây mê vùng", stat:"or", room:"OR-04"},
    {nm:"BS. Trần T. Em", spec:"Gây mê NS", stat:"free", room:"—"},
    {nm:"BS. Vũ Q. Phúc", spec:"Hồi sức sau mổ", stat:"free", room:"PACU"},
  ];

  return (
    <div className="or-wrap">
      <div className="or-top">
        <div className="or-kpi live"><div className="l">Đang mổ</div><div className="v"><span className="dot"/>2</div></div>
        <div className="or-kpi"><div className="l">Trong kế hoạch</div><div className="v">18</div></div>
        <div className="or-kpi ok"><div className="l">Đã xong</div><div className="v">5</div></div>
        <div className="or-kpi warn"><div className="l">Quá giờ</div><div className="v">1 <span style={{fontSize:11,fontWeight:400,color:"var(--t-3)"}}>+22p</span></div></div>
        <div className="or-kpi"><div className="l">Công suất TB</div><div className="v">63%</div></div>
        <div className="or-kpi"><div className="l">Kíp gây mê đủ</div><div className="v">6 / 6</div></div>
      </div>

      <div className="or-body">
        <div className="or-day-bar">
          <button>←</button>
          <div className="date">Thứ năm, 23/10/2026 <small>hôm nay</small></div>
          <button>→</button>
          <button>Hôm nay</button>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:14,fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--t-2)",letterSpacing:"0.04em"}}>
            <span><span style={{display:"inline-block",width:12,height:12,background:"#f0fdf4",border:"1px solid var(--s-ok)",borderLeft:"3px solid var(--s-ok)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Đã xong</span>
            <span><span style={{display:"inline-block",width:12,height:12,background:"var(--s-crit-bg)",border:"1px solid var(--s-crit)",borderLeft:"3px solid var(--s-crit)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Đang mổ</span>
            <span><span style={{display:"inline-block",width:12,height:12,background:"var(--a-cy-bg)",border:"1px solid var(--a-cy)",borderLeft:"3px solid var(--a-cy)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Lịch</span>
            <span><span style={{display:"inline-block",width:12,height:12,background:"var(--s-warn-bg)",border:"1px solid var(--s-warn)",borderLeft:"3px solid var(--s-warn)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Chuẩn bị</span>
            <span><span style={{display:"inline-block",width:12,height:12,background:"#eff6ff",border:"1px solid var(--a-cy)",borderLeft:"3px solid var(--a-cy)",borderRadius:2,marginRight:4,verticalAlign:"middle"}}/>Vệ sinh</span>
          </div>
          <button className="p">+ Đặt mổ mới</button>
        </div>

        <div className="or-gantt">
          <div className="or-rooms-col">
            <div className="or-col-h">Phòng mổ</div>
            {rooms_.map(r => (
              <div key={r.id} className="or-room-row">
                <div className="or-room-name">
                  <span className={"state " + r.state}/>
                  {r.id}
                </div>
                <div className="or-room-spec">{r.spec}</div>
                <div className="or-room-util">{r.state==="off" ? "Đóng · bảo trì" : `Sử dụng: ${r.util}%`}</div>
              </div>
            ))}
          </div>
          <div className="or-tl-wrap">
            <div className="or-tl-col-h">
              {Array.from({length:12}, (_,i) => (
                <div key={i} className={"or-tl-tick " + (i===4?"now":"")}>
                  {String(6+i).padStart(2,'0')}:00
                </div>
              ))}
            </div>
            {rooms_.map(r => (
              <div key={r.id} className="or-tl-row">
                {r.slots.map((s,i) => (
                  <div key={i}
                    className={"or-slot " + s.stat}
                    style={{ left: `${pct(s.s)}%`, width: `${(s.dur/span)*100}%` }}
                    onClick={()=>setSelSlot(i)}
                  >
                    <div className="t">{String(Math.floor(s.s)).padStart(2,'0')}:{String(Math.round((s.s%1)*60)).padStart(2,'0')}–{String(Math.floor(s.s+s.dur)).padStart(2,'0')}:{String(Math.round(((s.s+s.dur)%1)*60)).padStart(2,'0')} · {s.dur}h</div>
                    <div className="op">{s.op}</div>
                    {s.pt && <div className="pt">{s.pt} · {s.surgeon}</div>}
                  </div>
                ))}
              </div>
            ))}
            <div className="or-now-line" style={{ left: `${pct(nowHour)}%` }}/>
          </div>
        </div>

        <div className="or-surgeons">
          <div className="or-surgeon-col">
            <div className="or-surgeon-h">
              <span>Phẫu thuật viên</span>
              <span className="n">6 · ca ngày</span>
            </div>
            {surgeonsOR.map(s => (
              <div key={s.nm} className="or-surgeon-row">
                <div className="or-surgeon-avatar">{s.nm.split(" ").slice(-1)[0][0]}</div>
                <div>
                  <div className="or-surgeon-nm">{s.nm}</div>
                  <div className="or-surgeon-sub">{s.spec} · {s.next}</div>
                </div>
                <span className={"or-surgeon-stat " + s.stat}>{s.stat==="or"?"● "+s.room:s.stat==="opd"?s.room:"RẢNH"}</span>
              </div>
            ))}
          </div>
          <div className="or-surgeon-col">
            <div className="or-surgeon-h">
              <span>Bác sĩ gây mê</span>
              <span className="n">6 · ca ngày</span>
            </div>
            {gasologists.map(s => (
              <div key={s.nm} className="or-surgeon-row">
                <div className="or-surgeon-avatar" style={{background:"var(--s-mag-bg)",color:"var(--s-mag)"}}>{s.nm.split(" ").slice(-1)[0][0]}</div>
                <div>
                  <div className="or-surgeon-nm">{s.nm}</div>
                  <div className="or-surgeon-sub">{s.spec}</div>
                </div>
                <span className={"or-surgeon-stat " + s.stat}>{s.stat==="or"?"● "+s.room:s.stat==="break"?"NGHỈ":s.stat==="free"?"RẢNH":"—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.ORModule = ORModule;
