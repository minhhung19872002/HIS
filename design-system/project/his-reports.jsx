// HIS Reports / Báo cáo
const { useState: useRPs } = React;

const ReportsModule = () => {
  const [period, setPeriod] = useRPs("Tháng");

  // ============= HERO KPIs =============
  const kpis = [
    {l:"Lượt khám ngoại trú", v:"4.832", small:"lượt", delta:"+8.4%", dCls:"up", vs:"T9: 4.458", spark:"up", cls:""},
    {l:"Nhập viện", v:"612", small:"BN", delta:"+3.2%", dCls:"up", vs:"T9: 593", spark:"up", cls:"ok"},
    {l:"Ca phẫu thuật", v:"184", small:"ca", delta:"−2.1%", dCls:"dn", vs:"T9: 188", spark:"dn", cls:""},
    {l:"Doanh thu", v:"18.47", small:"tỷ ₫", delta:"+12.3%", dCls:"up", vs:"T9: 16.45 tỷ", spark:"up", cls:"ok"},
    {l:"Tử vong trong BV", v:"4", small:"ca", delta:"+1", dCls:"dn", vs:"T9: 3 ca", spark:"fl", cls:"crit"},
    {l:"Hài lòng BN", v:"4.6", small:"/5", delta:"+0.2", dCls:"up", vs:"T9: 4.4", spark:"up", cls:"ok"},
  ];

  // Revenue 12-month trend — 3 streams: BHYT, TC (tự chi), DV (dịch vụ)
  const months = ["T11/25","T12/25","T1/26","T2/26","T3/26","T4/26","T5/26","T6/26","T7/26","T8/26","T9/26","T10/26"];
  const bhytRev = [10.2, 11.1, 10.8, 9.4, 11.5, 12.1, 11.8, 12.4, 13.2, 13.0, 12.6, 14.1];
  const tcRev   = [2.1,  2.4,  2.6, 2.3, 2.9, 3.1, 3.0, 3.3, 3.4, 3.6, 3.5, 3.8];
  const dvRev   = [0.35, 0.42, 0.38, 0.31, 0.45, 0.51, 0.49, 0.55, 0.58, 0.60, 0.58, 0.67];

  const maxV = 16;
  const W = 760, H = 220, PX = 36, PY = 20;
  const xStep = (W-PX*2) / (months.length-1);
  const yFor = (v) => H - PY - (v/maxV) * (H-PY*2);
  const xFor = (i) => PX + i * xStep;
  const linePath = (arr) => arr.map((v,i) => `${i?'L':'M'} ${xFor(i)} ${yFor(v)}`).join(" ");
  const areaPath = (arr) => linePath(arr) + ` L ${xFor(arr.length-1)} ${H-PY} L ${xFor(0)} ${H-PY} Z`;

  // Top diagnoses
  const topDx = [
    {icd:"I10",  nm:"Tăng huyết áp nguyên phát", cnt:412, pct:8.5, rev:1.24, trend:"up"},
    {icd:"E11",  nm:"Đái tháo đường type 2", cnt:324, pct:6.7, rev:1.05, trend:"up"},
    {icd:"J44",  nm:"Bệnh phổi tắc nghẽn mạn (COPD)", cnt:198, pct:4.1, rev:0.82, trend:"fl"},
    {icd:"K29",  nm:"Viêm dạ dày & tá tràng", cnt:176, pct:3.6, rev:0.41, trend:"up"},
    {icd:"I25",  nm:"Thiếu máu cơ tim mạn", cnt:154, pct:3.2, rev:1.38, trend:"up"},
    {icd:"N40",  nm:"Phì đại lành tuyến tiền liệt", cnt:142, pct:2.9, rev:0.56, trend:"fl"},
    {icd:"M54",  nm:"Đau lưng", cnt:138, pct:2.9, rev:0.22, trend:"up"},
    {icd:"O80",  nm:"Đẻ thường", cnt:128, pct:2.6, rev:0.74, trend:"fl"},
  ];
  const maxDx = topDx[0].cnt;

  // Payment mix (donut)
  const payMix = [
    {nm:"BHYT chi trả 80%", sub:"12.84 tỷ · 69.5%", v:69.5, c:"var(--a-cy)"},
    {nm:"Bệnh nhân tự chi", sub:"3.82 tỷ · 20.7%", v:20.7, c:"var(--s-mag)"},
    {nm:"Dịch vụ khám theo yêu cầu", sub:"1.12 tỷ · 6.1%", v:6.1, c:"var(--s-warn)"},
    {nm:"Bảo hiểm tư nhân", sub:"0.68 tỷ · 3.7%", v:3.7, c:"var(--s-ok)"},
  ];

  // Donut math
  let accAng = -90;
  const donut = payMix.map(p => {
    const ang = (p.v/100) * 360;
    const start = accAng, end = accAng + ang;
    accAng = end;
    const r = 50, rIn = 32;
    const a1 = start * Math.PI/180, a2 = end * Math.PI/180;
    const x1 = 70 + r*Math.cos(a1), y1 = 70 + r*Math.sin(a1);
    const x2 = 70 + r*Math.cos(a2), y2 = 70 + r*Math.sin(a2);
    const xi1 = 70 + rIn*Math.cos(a2), yi1 = 70 + rIn*Math.sin(a2);
    const xi2 = 70 + rIn*Math.cos(a1), yi2 = 70 + rIn*Math.sin(a1);
    const large = ang > 180 ? 1 : 0;
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${rIn} ${rIn} 0 ${large} 0 ${xi2} ${yi2} Z`,
      c: p.c
    };
  });

  // OPD hourly heatmap (7 days × 24 hours)
  const heatDays = ["T2","T3","T4","T5","T6","T7","CN"];
  const heatData = heatDays.map(() =>
    Array.from({length:24}, (_,h) => {
      if (h<6) return 0.05 + Math.random()*0.1;
      if (h<7) return 0.2 + Math.random()*0.1;
      if (h<12) return 0.55 + Math.random()*0.45; // morning peak
      if (h<14) return 0.35 + Math.random()*0.15;
      if (h<17) return 0.5 + Math.random()*0.4; // afternoon peak
      if (h<20) return 0.2 + Math.random()*0.15;
      return 0.08 + Math.random()*0.1;
    })
  );
  // Make weekend lower
  heatData[5] = heatData[5].map(v => v*0.7);
  heatData[6] = heatData[6].map(v => v*0.4);

  const heatColor = (v) => {
    const o = Math.round(v * 255).toString(16).padStart(2,'0');
    // Interpolate from #eff5ff to #2563eb
    const r = Math.round(239 + (37-239)*v);
    const g = Math.round(245 + (99-245)*v);
    const b = Math.round(255 + (235-255)*v);
    return `rgb(${r},${g},${b})`;
  };

  // OR/Bed utilization
  const orUtil = [
    {nm:"OR-01", use:78, idle:12, down:10, sub:"Tim mạch"},
    {nm:"OR-02", use:62, idle:28, down:10, sub:"Tổng quát"},
    {nm:"OR-03", use:54, idle:36, down:10, sub:"Sản khoa"},
    {nm:"OR-04", use:80, idle:15, down:5, sub:"CTCH"},
    {nm:"OR-05", use:0, idle:0, down:100, sub:"Tiết niệu · đóng"},
    {nm:"OR-06", use:45, idle:45, down:10, sub:"Thần kinh"},
  ];

  const wardUtil = [
    {nm:"Nội TQ", use:87, idle:13, sub:"40/46 giường"},
    {nm:"Ngoại TQ", use:92, idle:8, sub:"46/50"},
    {nm:"Sản khoa", use:76, idle:24, sub:"30/40"},
    {nm:"Nhi khoa", use:68, idle:32, sub:"17/25"},
    {nm:"ICU", use:83, idle:17, sub:"10/12"},
    {nm:"Tim mạch", use:94, idle:6, sub:"30/32"},
  ];

  // Quality indicators (Bộ Y tế 83 chỉ số chất lượng bệnh viện)
  const qi = [
    {ind:"Tỷ lệ nhiễm khuẩn vết mổ", sub:"Mẫu 184 ca PT", v:"1.63%", target:"≤ 2%", flag:"ok"},
    {ind:"Tỷ lệ tử vong nội trú", sub:"Mẫu 612 nhập viện", v:"0.65%", target:"≤ 0.8%", flag:"ok"},
    {ind:"Thời gian chờ khám TB", sub:"OPD", v:"18 ph", target:"≤ 20 ph", flag:"ok"},
    {ind:"Tỷ lệ tái nhập viện 30 ngày", sub:"Điểm cảnh báo sớm", v:"6.2%", target:"≤ 5%", flag:"warn"},
    {ind:"Thời gian chờ cấp cứu → BS", sub:"ER triage", v:"4.1 ph", target:"≤ 5 ph", flag:"ok"},
    {ind:"Tỷ lệ dùng KS dự phòng đúng", sub:"Ngoại khoa", v:"83%", target:"≥ 90%", flag:"warn"},
    {ind:"Tỷ lệ chuyển tuyến không cần", sub:"Kiểm tra hồ sơ", v:"2.1%", target:"≤ 3%", flag:"ok"},
    {ind:"Tỷ lệ sai sót kê đơn", sub:"Rà soát bởi DS LS", v:"4.8%", target:"≤ 3%", flag:"crit"},
  ];

  const comply = [
    {nm:"Báo cáo Thông tư 27/BYT · T10", due:"Hạn 05/11/2026", st:"ok", stT:"ĐÃ NỘP"},
    {nm:"Báo cáo KCB BHXH · T10", due:"Hạn 10/11/2026", st:"wait", stT:"ĐANG RÀ SOÁT"},
    {nm:"Thống kê bệnh viện 83 chỉ số", due:"Hạn 30/10/2026", st:"ok", stT:"ĐÃ NỘP"},
    {nm:"Báo cáo bệnh truyền nhiễm", due:"Hạn tuần · 20/10", st:"ok", stT:"ĐÃ NỘP"},
    {nm:"Báo cáo CLBV A4.1", due:"Hạn quý · 31/12", st:"wait", stT:"CHUẨN BỊ"},
    {nm:"Khai báo HC cấp phép PT", due:"Hạn 15/10", st:"fail", stT:"QUÁ HẠN"},
  ];

  return (
    <div className="rp-wrap">
      <div className="rp-top">
        <div className="title">
          Báo cáo quản trị
          <small>Tháng 10/2026 · cập nhật 10:24 · BVĐK Hưng Yên</small>
        </div>
        <div style={{flex:1}}/>
        <div className="rp-period">
          {["Ngày","Tuần","Tháng","Quý","Năm"].map(p => (
            <button key={p} className={p===period?"a":""} onClick={()=>setPeriod(p)}>{p}</button>
          ))}
        </div>
        <button className="btn">📆 01–23/10/2026</button>
        <button className="btn">🖨 In</button>
        <button className="btn primary">📊 Xuất Excel</button>
      </div>

      <div className="rp-body">
        {/* Hero KPIs */}
        <div className="rp-hero">
          {kpis.map(k => (
            <div key={k.l} className={"rp-k " + k.cls}>
              <div className="l">{k.l}</div>
              <div className="v">{k.v}<small>{k.small}</small></div>
              <div>
                <span className={"delta " + k.dCls}>{k.delta}</span>
                <span className="vs">{k.vs}</span>
              </div>
              <svg className="spark" viewBox="0 0 64 24">
                {k.spark==="up" && <path d="M0 20 Q 10 18, 14 15 T 28 12 T 42 8 T 64 4" fill="none" stroke={k.cls==="crit"?"#dc2626":"#16a34a"} strokeWidth="1.5"/>}
                {k.spark==="dn" && <path d="M0 4 Q 10 6, 14 9 T 28 12 T 42 16 T 64 20" fill="none" stroke="#dc2626" strokeWidth="1.5"/>}
                {k.spark==="fl" && <path d="M0 12 L 16 11 L 30 13 L 46 10 L 64 12" fill="none" stroke="#64748b" strokeWidth="1.5"/>}
              </svg>
            </div>
          ))}
        </div>

        {/* Revenue + Payment mix */}
        <div className="rp-card sp-8">
          <div className="rp-card-h">
            <div className="t">Doanh thu 12 tháng</div>
            <div className="s">Đơn vị: tỷ ₫</div>
            <div className="actions">
              <button className="a">Doanh thu</button>
              <button>Lượt KCB</button>
              <button>BN nội trú</button>
            </div>
          </div>
          <div className="rp-card-body" style={{padding:0}}>
            <svg className="rp-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
              {[0,4,8,12,16].map(v => (
                <g key={v}>
                  <line x1={PX} y1={yFor(v)} x2={W-PX} y2={yFor(v)} className="grid-l"/>
                  <text x={PX-6} y={yFor(v)+3} className="axis-t" textAnchor="end">{v}</text>
                </g>
              ))}
              {months.map((m,i) => (
                <text key={m} x={xFor(i)} y={H-6} className="axis-t" textAnchor="middle">{m}</text>
              ))}
              <path d={areaPath(bhytRev)} className="area-bhyt"/>
              <path d={linePath(bhytRev)} className="line-bhyt"/>
              <path d={linePath(tcRev)} className="line-tc"/>
              <path d={linePath(dvRev)} className="line-dv"/>
              {bhytRev.map((v,i) => <circle key={i} cx={xFor(i)} cy={yFor(v)} r="3" className="dot bhyt"/>)}
              {tcRev.map((v,i) => <circle key={i} cx={xFor(i)} cy={yFor(v)} r="3" className="dot tc"/>)}
              {/* Annotate last month */}
              <g>
                <line x1={xFor(11)} y1={yFor(bhytRev[11])-10} x2={xFor(11)+40} y2={yFor(bhytRev[11])-30} stroke="var(--a-cy)" strokeWidth="1"/>
                <rect x={xFor(11)+30} y={yFor(bhytRev[11])-44} width="74" height="18" rx="2" fill="var(--a-cy)"/>
                <text x={xFor(11)+67} y={yFor(bhytRev[11])-32} className="axis-t" style={{fill:"#fff",fontWeight:700}} textAnchor="middle">14.1 tỷ · +12%</text>
              </g>
            </svg>
            <div className="rp-legend">
              <div className="it"><div className="sw" style={{background:"var(--a-cy)"}}/>BHYT</div>
              <div className="it"><div className="sw" style={{background:"var(--s-mag)"}}/>BN tự chi</div>
              <div className="it"><div className="sw" style={{background:"var(--s-warn)",borderBottom:"1px dashed var(--s-warn)",height:"0",width:"14px"}}/>Dịch vụ theo yêu cầu</div>
              <div style={{marginLeft:"auto",color:"var(--t-2)",fontFamily:"var(--font-mono)",fontSize:11}}>Cộng dồn 12T: 159.6 tỷ ₫ · +7.8% YoY</div>
            </div>
          </div>
        </div>

        <div className="rp-card sp-4">
          <div className="rp-card-h">
            <div className="t">Cơ cấu nguồn thu</div>
            <div className="s">T10/2026</div>
          </div>
          <div className="rp-card-body">
            <div className="rp-donut">
              <svg viewBox="0 0 140 140">
                {donut.map((d,i) => <path key={i} d={d.d} fill={d.c}/>)}
                <text x="70" y="68" className="donut-label">Tổng</text>
                <text x="70" y="86" className="donut-value">18.47</text>
                <text x="70" y="100" className="donut-label">tỷ ₫</text>
              </svg>
              <div className="rp-donut-legend">
                {payMix.map((p,i) => (
                  <div className="row" key={p.nm}>
                    <span className="sw" style={{background:p.c}}/>
                    <span className="nm">{p.nm}<br/><small>{p.sub}</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top diagnoses */}
        <div className="rp-card sp-7">
          <div className="rp-card-h">
            <div className="t">Nhóm bệnh hàng đầu · ICD-10</div>
            <div className="s">T10/2026 · sắp xếp theo lượt KCB</div>
            <div className="actions">
              <button className="a">Lượt</button>
              <button>Doanh thu</button>
              <button>Nội trú</button>
            </div>
          </div>
          <div className="rp-card-body">
            <div className="rp-bars">
              {topDx.map((d,i) => {
                const pct = (d.cnt/maxDx)*100;
                const col = i<3 ? "var(--a-cy)" : "var(--t-3)";
                return (
                  <div key={d.icd}>
                    <div className="rp-bar-row" style={{gridTemplateColumns:"30px 1fr 120px"}}>
                      <span className="rk">{String(i+1).padStart(2,'0')}</span>
                      <span className="nm">
                        <b style={{fontFamily:"var(--font-mono)",color:i<3?"var(--a-cy)":"var(--t-2)"}}>{d.icd}</b> {d.nm}
                        <small>{d.pct}% tổng</small>
                      </span>
                      <span className="v">{d.cnt}<small>ca</small> <span style={{color: d.trend==="up"?"var(--s-ok)":"var(--t-3)",marginLeft:4}}>{d.trend==="up"?"▲":"—"}</span></span>
                    </div>
                    <div className="bar" style={{marginTop:3, marginLeft:40, marginRight:124}}>
                      <div className="f" style={{width:pct+"%", background: col, height:"100%", borderRadius:3}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* OR + Ward util */}
        <div className="rp-card sp-5">
          <div className="rp-card-h">
            <div className="t">Công suất sử dụng</div>
            <div className="s">7 ngày gần nhất</div>
          </div>
          <div className="rp-card-body" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,fontWeight:600}}>Phòng mổ</div>
              <div className="rp-util-grid">
                {orUtil.map(r => (
                  <React.Fragment key={r.nm}>
                    <div>
                      <div className="rm">{r.nm}</div>
                      <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.sub}</div>
                    </div>
                    <div className="b">
                      {r.use>0 && <div className="f" style={{width: r.use+"%"}}>{r.use}%</div>}
                      <div className="f idle" style={{width: r.idle+"%",color:"#713f12"}}>{r.idle>10?r.idle+"%":""}</div>
                      {r.down>0 && <div className="f down" style={{width: r.down+"%",color:"#fff"}}>{r.down>10?r.down+"%":""}</div>}
                    </div>
                    <div className="v">{r.use}%</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,fontWeight:600}}>Giường bệnh · theo khoa</div>
              <div className="rp-util-grid">
                {wardUtil.map(r => (
                  <React.Fragment key={r.nm}>
                    <div>
                      <div className="rm">{r.nm}</div>
                      <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.sub}</div>
                    </div>
                    <div className="b">
                      <div className="f" style={{width: r.use+"%",background: r.use>=90?"var(--s-crit)":r.use>=80?"var(--s-warn)":"var(--a-cy)"}}>{r.use}%</div>
                    </div>
                    <div className="v">{r.use}%</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <div style={{padding:"8px 14px",background:"var(--d-1)",borderTop:"1px solid var(--line-hair)",fontSize:11,fontFamily:"var(--font-mono)",color:"var(--t-2)",display:"flex",gap:14}}>
            <span><span style={{display:"inline-block",width:12,height:10,background:"var(--a-cy)",verticalAlign:"middle",marginRight:4,borderRadius:2}}/>Đang dùng</span>
            <span><span style={{display:"inline-block",width:12,height:10,background:"var(--s-warn)",opacity:0.5,verticalAlign:"middle",marginRight:4,borderRadius:2}}/>Chờ/Dọn</span>
            <span><span style={{display:"inline-block",width:12,height:10,background:"var(--t-3)",verticalAlign:"middle",marginRight:4,borderRadius:2}}/>Đóng</span>
          </div>
        </div>

        {/* Quality indicators */}
        <div className="rp-card sp-7">
          <div className="rp-card-h">
            <div className="t">Chỉ số chất lượng bệnh viện</div>
            <div className="s">83 chỉ số · Bộ Y tế · T10/2026</div>
            <div className="actions">
              <button>Xem đầy đủ</button>
            </div>
          </div>
          <table className="rp-qi-tbl">
            <thead>
              <tr>
                <th>Chỉ số</th>
                <th className="num">Giá trị</th>
                <th className="num">Mục tiêu</th>
                <th className="num">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {qi.map(q => (
                <tr key={q.ind}>
                  <td>
                    <div className="ind">{q.ind}</div>
                    <div className="sub">{q.sub}</div>
                  </td>
                  <td className="num">{q.v}</td>
                  <td className="num" style={{color:"var(--t-2)"}}>{q.target}</td>
                  <td className="num"><span className={"flag " + q.flag}>{q.flag==="ok"?"ĐẠT":q.flag==="warn"?"CẢNH BÁO":"KHÔNG ĐẠT"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compliance */}
        <div className="rp-card sp-5">
          <div className="rp-card-h">
            <div className="t">Báo cáo Bộ Y tế & BHXH</div>
            <div className="s">6 báo cáo định kỳ</div>
          </div>
          <div className="rp-card-body">
            <div className="rp-comply">
              {comply.map(c => (
                <div key={c.nm} className="it">
                  <div className={"ic " + c.st}>{c.st==="ok"?"✓":c.st==="wait"?"⏱":"!"}</div>
                  <div>
                    <div className="nm">{c.nm}</div>
                    <div className="due">{c.due}</div>
                  </div>
                  <span className={"st " + c.st}>{c.stT}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OPD heatmap */}
        <div className="rp-card sp-12">
          <div className="rp-card-h">
            <div className="t">Mật độ lượt khám ngoại trú · Ngày × Giờ</div>
            <div className="s">Trung bình 4 tuần · T10/2026</div>
            <div className="actions">
              <button className="a">Lượt KCB</button>
              <button>Thời gian chờ</button>
              <button>Doanh thu</button>
            </div>
          </div>
          <div className="rp-card-body">
            <div className="rp-heat">
              <div className="lbl"></div>
              {Array.from({length:24}, (_,h) => (
                <div key={h} className="lbl" style={{fontSize:9, justifyContent:"center"}}>{h%3===0?h:""}</div>
              ))}
              {heatDays.map((d,di) => (
                <React.Fragment key={d}>
                  <div className="lbl" style={{fontWeight:600,color:di>=5?"var(--s-crit)":"var(--t-1)"}}>{d}</div>
                  {heatData[di].map((v,hi) => (
                    <div key={hi} className="cell" style={{background: heatColor(v)}} title={`${d} ${hi}h: ${Math.round(v*180)} lượt`}/>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="rp-heat-scale">
              <span>Ít</span>
              <div className="grad"/>
              <span>Nhiều</span>
              <span style={{marginLeft:"auto"}}>Cao điểm: <b style={{color:"var(--t-0)"}}>T2–T5 · 09:00–11:00</b> và <b style={{color:"var(--t-0)"}}>T3–T5 · 14:00–16:00</b></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

window.ReportsModule = ReportsModule;
