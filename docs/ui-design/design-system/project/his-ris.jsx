// HIS RIS/PACS — Imaging
const { useState: useRS } = React;

const RISModule = () => {
  const studies = [
    {id:"IMG-2026-1188", pid:"BN-00201", type:"CR", modality:"XQ ngực thẳng", bodyPart:"THORAX PA", date:"hôm nay 08:45", status:"in-progress", thumb:"xray", series:1, images:2, priority:"STAT"},
    {id:"IMG-2026-1187", pid:"BN-00142", type:"CT", modality:"CT sọ não không cản quang", bodyPart:"BRAIN", date:"hôm nay 08:12", status:"read", thumb:"ct", series:4, images:128, priority:"URG"},
    {id:"IMG-2026-1186", pid:"BN-00256", type:"US", modality:"Siêu âm ổ bụng TQ", bodyPart:"ABDOMEN", date:"hôm nay 07:54", status:"read", thumb:"us", series:1, images:12, priority:""},
    {id:"IMG-2026-1185", pid:"BN-00278", type:"MRI", modality:"MRI cột sống TL", bodyPart:"L-SPINE", date:"hôm nay 07:30", status:"pending", thumb:"mri", series:6, images:240, priority:""},
    {id:"IMG-2026-1184", pid:"BN-00189", type:"CR", modality:"XQ cổ tay (P)", bodyPart:"WRIST R", date:"22/10 17:20", status:"read", thumb:"xray", series:2, images:2, priority:""},
    {id:"IMG-2026-1183", pid:"BN-00234", type:"CT", modality:"CT scan ngực có cản", bodyPart:"CHEST", date:"22/10 14:05", status:"read", thumb:"ct", series:3, images:92, priority:""},
    {id:"IMG-2026-1182", pid:"BN-00166", type:"US", modality:"Siêu âm tim 2D+Doppler", bodyPart:"HEART", date:"22/10 10:30", status:"read", thumb:"us", series:1, images:24, priority:""},
  ];

  const [sel, setSel] = useRS("IMG-2026-1188");
  const [tab, setTab] = useRS("report");
  const s = studies.find(x => x.id === sel);
  const p = HIS.patientById(s.pid);

  return (
    <div className="ris-wrap">
      <div className="ris-top">
        <div className="ris-pinfo">
          <b>{p.name}</b> · {s.modality}
          <div className="meta">
            <span>BN <span className="dark-val">{p.id}</span></span>
            <span>{p.age}t · {p.gender==="M"?"Nam":"Nữ"}</span>
            <span>Study <span className="dark-val">{s.id}</span></span>
            <span>Modality <span className="dark-val">{s.type}</span></span>
            <span>Body <span className="dark-val">{s.bodyPart}</span></span>
            <span>{s.series} series · {s.images} ảnh</span>
            <span>Chỉ định: BS. Linh (OPD-03)</span>
          </div>
        </div>
        <div className="ris-top-act">
          <button>⬇ Tải DICOM</button>
          <button>⎙ In phim</button>
          <button>📧 Gửi BS</button>
        </div>
        <div className="ris-top-act">
          <button className="p">✓ Lưu báo cáo</button>
        </div>
      </div>

      <div className="ris-body">
        {/* Worklist */}
        <div className="ris-studies">
          <div className="ris-studies-h">
            <span>Worklist · hôm nay</span>
            <span className="n">{studies.filter(x=>x.date.startsWith("hôm nay")).length} study</span>
          </div>
          <div className="ris-studies-list">
            {studies.map(x => {
              const xp = HIS.patientById(x.pid);
              return (
                <div key={x.id} className={"ris-study " + (sel===x.id?"sel":"")} onClick={()=>setSel(x.id)}>
                  <div className={"ris-study-thumb " + x.thumb}>{x.type}</div>
                  <div>
                    <div className="ris-study-title">{xp.name}</div>
                    <div className="ris-study-meta">
                      {x.modality}<br/>
                      {x.date} · {x.series}s · {x.images}i
                    </div>
                    <span className={"ris-study-stat " + x.status}>
                      {x.status==="read"?"✓ ĐÃ ĐỌC":x.status==="in-progress"?"● ĐANG ĐỌC":"○ CHỜ"}
                    </span>
                    {x.priority && <span className="ris-study-stat" style={{marginLeft:4, background:"#3d0a0a", color:"#f87171"}}>{x.priority}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Viewer */}
        <div className="ris-viewer">
          <div className="ris-viewer-tools">
            <div className="ris-tool-lbl">Dựng</div>
            <div className="ris-tool on" title="Pan">✥</div>
            <div className="ris-tool" title="Zoom">⌕</div>
            <div className="ris-tool" title="W/L">◐</div>
            <div className="ris-tool" title="Xoay">↻</div>
            <div className="ris-tool-sep"/>
            <div className="ris-tool-lbl">Đo</div>
            <div className="ris-tool" title="Đo dài">│─│</div>
            <div className="ris-tool" title="Góc">∠</div>
            <div className="ris-tool" title="ROI">◯</div>
            <div className="ris-tool" title="Ghi chú">A</div>
            <div className="ris-tool-sep"/>
            <div className="ris-tool-lbl">Layout</div>
            <div className="ris-tool on" title="1x1">▫</div>
            <div className="ris-tool" title="2x1">▫▫</div>
            <div className="ris-tool" title="2x2">⊞</div>
            <div style={{flex:1}}/>
            <div className="ris-tool-lbl">Series</div>
            <div style={{color:"#e8ecef",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:"0 8px"}}>1 / {s.series}</div>
            <div className="ris-tool-lbl">Ảnh</div>
            <div style={{color:"#e8ecef",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:"0 8px"}}>1 / {s.images}</div>
          </div>

          <div className="ris-canvas-wrap">
            <div className="ris-canvas">
              {/* HUD overlays */}
              <div className="ris-hud tl">
                <b>BVĐK HƯNG YÊN</b><br/>
                {p.name}<br/>
                {p.id} · {p.gender==="M"?"M":"F"} · {p.age}Y<br/>
                DOB {p.dob}
              </div>
              <div className="ris-hud tr">
                {s.modality}<br/>
                {s.bodyPart} · PA UPRIGHT<br/>
                {s.date}<br/>
                Acc# {s.id}
              </div>
              <div className="ris-hud bl">
                kV 110 · mAs 4<br/>
                FFD 180cm · GRID<br/>
                W/L 2048/1024
              </div>
              <div className="ris-hud br">
                1 / {s.images}<br/>
                Zoom 100% · Rot 0°<br/>
                <b>PhilipsCR</b>
              </div>
              <div className="ris-orient t">R</div>
              <div className="ris-orient b">L</div>

              {/* Chest X-ray */}
              <div className="xray-img"/>
            </div>
          </div>

          <div className="ris-viewer-foot">
            <span><span className="dot"/> <b>PACS SYNC</b> · DICOM store 10.42.0.8</span>
            <span>WADO-RS OK</span>
            <span>Latency 38ms</span>
            <span>MWL · {studies.length} pending</span>
            <span style={{marginLeft:"auto"}}>BVDK-HY · PACS v3.2.1</span>
          </div>
        </div>

        {/* Report */}
        <div className="ris-report">
          <div className="ris-report-tabs">
            <div className={"ris-report-tab " + (tab==="report"?"on":"")} onClick={()=>setTab("report")}>Báo cáo</div>
            <div className={"ris-report-tab " + (tab==="prior"?"on":"")} onClick={()=>setTab("prior")}>So sánh</div>
            <div className={"ris-report-tab " + (tab==="order"?"on":"")} onClick={()=>setTab("order")}>Chỉ định</div>
          </div>

          {tab==="report" && (
            <div className="ris-report-body">
              <div className="ris-report-sect">
                <div className="h">Kỹ thuật</div>
                <div className="b">X-quang ngực thẳng tư thế PA đứng · kV 110, mAs 4 · phim số CR.</div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Lâm sàng</div>
                <div className="b">Nam 67 tuổi, tiền sử THA, ĐTĐ type 2, đặt stent LAD 2024.
                Vào viện vì đau ngực trái, khó thở. Loại trừ phù phổi cấp, tràn dịch màng phổi.</div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Mô tả</div>
                <div className="b">
                  • Bóng tim to nhẹ, chỉ số tim ngực <b>0.54</b> (bình thường &lt;0.5).<br/>
                  • Cung động mạch chủ vồng, thành mạch calci hóa.<br/>
                  • Phổi 2 bên thông thoáng, không thấy tổn thương khu trú.<br/>
                  • Rốn phổi 2 bên không to bất thường. Khí phế quản trung tâm.<br/>
                  • Góc sườn hoành 2 bên nhọn, không tràn dịch màng phổi.<br/>
                  • Xương lồng ngực, cơ hoành bình thường.
                </div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Kết luận</div>
                <div className="b">
                  <b>1.</b> Tim to nhẹ, cung ĐM chủ calci hóa — phù hợp bối cảnh bệnh tim mạch mạn.<br/>
                  <b>2.</b> Không thấy tổn thương nhu mô phổi cấp.<br/>
                  <b>3.</b> Đề nghị siêu âm tim Doppler để đánh giá chức năng thất trái.
                </div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Mã chẩn đoán</div>
                <div className="b" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>
                  R91.8 · I51.7 · Z95.5
                </div>
              </div>
            </div>
          )}

          {tab==="prior" && (
            <div className="ris-report-body">
              <div style={{color:"#9aa4ad",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Study trước của BN</div>
              {[
                {id:"IMG-2025-0812",d:"15/05/2025",m:"XQ ngực thẳng",f:"CTR 0.52, không tổn thương cấp"},
                {id:"IMG-2024-0441",d:"28/02/2024",m:"Chụp mạch vành",f:"Hẹp LAD 90% → đặt stent DES"},
                {id:"IMG-2024-0198",d:"10/01/2024",m:"XQ ngực thẳng",f:"Tim to nhẹ, chưa tổn thương"},
              ].map(x => (
                <div key={x.id} style={{padding:"10px",background:"#0f1114",border:"1px solid #1f2328",borderRadius:"var(--r-2)",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:"#e8ecef",fontSize:"var(--fs-sm)",fontWeight:500}}>{x.m}</span>
                    <span style={{color:"#9aa4ad",fontFamily:"var(--font-mono)",fontSize:10}}>{x.d}</span>
                  </div>
                  <div style={{color:"#cfd4d8",fontSize:"var(--fs-xs)",lineHeight:1.5}}>{x.f}</div>
                  <div style={{color:"var(--a-cy)",fontFamily:"var(--font-mono)",fontSize:10,marginTop:4}}>{x.id}</div>
                </div>
              ))}
            </div>
          )}

          {tab==="order" && (
            <div className="ris-report-body">
              <div className="ris-report-sect">
                <div className="h">Bác sĩ chỉ định</div>
                <div className="b"><b>BS. Nguyễn Thị Linh</b> · Nội tổng quát · OPD-03</div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Thời gian</div>
                <div className="b">Chỉ định 08:15 · Chụp 08:45 · TAT dự kiến 45p</div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Lý do</div>
                <div className="b">Đau ngực trái dữ dội lan vai trái, khó thở. Cần loại trừ tràn khí/tràn dịch màng phổi, đánh giá bóng tim.</div>
              </div>
              <div className="ris-report-sect">
                <div className="h">Thanh toán</div>
                <div className="b">BHYT 100% hạng I · dịch vụ 48.000₫</div>
              </div>
            </div>
          )}

          <div className="ris-report-foot">
            <div className="ris-sign-row">
              <div className="ris-sign-ava">P</div>
              <div className="ris-sign-dr">
                <b>BS. Phạm Văn Minh</b>
                <span>Khoa CĐHA · ký 09:12 · ES-5544</span>
              </div>
            </div>
            <div className="ris-btn-row">
              <button>Lưu nháp</button>
              <button>Gửi BS</button>
              <button className="p">✓ Ký</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.RISModule = RISModule;
