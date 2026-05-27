// HIS Inventory / Kho thuốc · vật tư — fully interactive
const { useState: invS, useMemo: invM, useEffect: invE } = React;

// ========= DATA =========
const INV_CATS = [
  { id: 'all',   nm: 'Tất cả',             ic: '▦', cnt: 2847, warn: 0,  crit: 0 },
  { id: 'drug',  nm: 'Thuốc',              ic: '℞', cnt: 1284, warn: 18, crit: 7 },
  { id: 'antib', nm: '  · Kháng sinh',     ic: '',  cnt: 234,  warn: 4,  crit: 2, sub: true },
  { id: 'pain',  nm: '  · Giảm đau',       ic: '',  cnt: 87,   warn: 3,  crit: 1, sub: true },
  { id: 'cv',    nm: '  · Tim mạch',       ic: '',  cnt: 156,  warn: 2,  crit: 0, sub: true },
  { id: 'insul', nm: '  · Nội tiết',       ic: '',  cnt: 42,   warn: 1,  crit: 1, sub: true },
  { id: 'psy',   nm: '  · Hướng thần (GPP)',ic: '', cnt: 28,   warn: 0,  crit: 0, sub: true, lock: true },
  { id: 'vac',   nm: 'Vắc-xin',            ic: '◉', cnt: 48,   warn: 2,  crit: 1 },
  { id: 'mat',   nm: 'Vật tư y tế',        ic: '▣', cnt: 892,  warn: 11, crit: 3 },
  { id: 'surg',  nm: '  · Phẫu thuật',     ic: '',  cnt: 214,  warn: 3,  crit: 1, sub: true },
  { id: 'sut',   nm: '  · Chỉ · gạc',      ic: '',  cnt: 178,  warn: 2,  crit: 0, sub: true },
  { id: 'iv',    nm: '  · Dịch truyền',    ic: '',  cnt: 124,  warn: 4,  crit: 1, sub: true },
  { id: 'lab',   nm: 'Hóa chất XN',        ic: '⬢', cnt: 312,  warn: 5,  crit: 2 },
  { id: 'img',   nm: 'Vật tư CĐHA',        ic: '◇', cnt: 89,   warn: 1,  crit: 0 },
  { id: 'oxy',   nm: 'Khí y tế · Oxy',     ic: '◯', cnt: 12,   warn: 0,  crit: 1 },
];

const INV_ITEMS = [
  { code: 'PARA500', nm: 'Paracetamol 500mg', form: 'Viên nén · vỉ 10×10', src: 'Stada VN', cat: 'pain',
    stk: 48200, min: 20000, max: 80000, unit: 'viên', price: 285, flag: 'ok',
    consume: [620,710,580,640,720,690,580,650,700,580,630,660,720,780],
    batches: [
      { lot: 'B240518A', exp: '2027-05', qty: 18400, rcvd: '2025-08-12' },
      { lot: 'B240902B', exp: '2027-09', qty: 29800, rcvd: '2025-09-28' },
    ]},
  { code: 'AMX625', nm: 'Amoxicillin + Clavulanic 625mg', form: 'Viên nén · vỉ 2×7', src: 'GSK', cat: 'antib',
    stk: 2840, min: 3500, max: 12000, unit: 'viên', price: 4800, flag: 'warn',
    consume: [180,220,240,190,210,260,280,250,290,310,280,260,290,340],
    batches: [
      { lot: 'G240211', exp: '2026-12', qty: 840, rcvd: '2025-07-02' },
      { lot: 'G240807', exp: '2027-06', qty: 2000, rcvd: '2025-10-05' },
    ]},
  { code: 'CEFTRI1', nm: 'Ceftriaxone 1g', form: 'Lọ bột pha tiêm', src: 'Imexpharm', cat: 'antib',
    stk: 186, min: 400, max: 1200, unit: 'lọ', price: 38500, flag: 'crit',
    consume: [22,18,24,28,26,22,30,32,28,26,24,28,30,34],
    batches: [
      { lot: 'IMX24095', exp: '2026-03', qty: 186, rcvd: '2025-05-18', near: true },
    ]},
  { code: 'INSUL-L', nm: 'Insulin glargine 100 U/mL', form: 'Bút tiêm 3mL', src: 'Sanofi', cat: 'insul',
    stk: 42, min: 60, max: 180, unit: 'bút', price: 286000, cold: true, flag: 'warn',
    consume: [4,3,5,4,6,5,4,5,6,5,4,6,5,7],
    batches: [
      { lot: 'SAN24-L08', exp: '2026-11', qty: 42, rcvd: '2025-09-14' },
    ]},
  { code: 'HEP5K', nm: 'Heparin 5000 UI/mL', form: 'Ống 1mL × 10', src: 'B.Braun', cat: 'drug',
    stk: 0, min: 120, max: 400, unit: 'ống', price: 48000, flag: 'crit',
    consume: [12,14,10,16,14,18,12,14,16,12,14,16,18,14],
    batches: []},
  { code: 'MORPH10', nm: 'Morphine HCl 10mg/mL', form: 'Ống 1mL × 10', src: 'Vidipha', cat: 'psy',
    stk: 124, min: 80, max: 200, unit: 'ống', price: 24000, ctrl: 'GPP', flag: 'ok',
    consume: [6,8,4,10,8,6,8,10,6,8,6,8,10,8],
    batches: [
      { lot: 'VDP24-M3', exp: '2027-02', qty: 124, rcvd: '2025-08-22' },
    ]},
  { code: 'ORS-K', nm: 'Oresol K · gói 4.1g', form: 'Gói bột', src: 'Mekophar', cat: 'drug',
    stk: 8420, min: 3000, max: 10000, unit: 'gói', price: 1200, flag: 'ok',
    consume: [180,220,280,340,420,380,260,220,190,240,280,320,380,410]},
  { code: 'VAC-HEPB', nm: 'Engerix-B 20mcg (HepB)', form: 'Lọ 1mL', src: 'GSK', cat: 'vac',
    stk: 48, min: 60, max: 200, unit: 'lọ', price: 142000, cold: true, flag: 'warn',
    consume: [6,4,8,6,8,10,8,6,8,6,4,8,10,12],
    batches: [
      { lot: 'GSK24V21', exp: '2026-07', qty: 48, rcvd: '2025-08-30', near: true },
    ]},
  { code: 'SUT-V30', nm: 'Chỉ Vicryl 3-0', form: 'Gói vô trùng', src: 'Ethicon', cat: 'sut',
    stk: 820, min: 500, max: 1500, unit: 'gói', price: 42000, flag: 'ok',
    consume: [28,32,30,38,34,32,36,40,38,34,32,38,42,40]},
  { code: 'GAUZE-S', nm: 'Gạc vô trùng 10×10cm', form: 'Gói 10 miếng', src: 'Bảo Thạch', cat: 'sut',
    stk: 4280, min: 2000, max: 8000, unit: 'gói', price: 3200, flag: 'ok',
    consume: [180,220,240,260,240,220,260,280,240,220,200,240,280,300]},
  { code: 'IV-NS500', nm: 'NaCl 0.9% 500mL', form: 'Chai nhựa', src: 'B.Braun', cat: 'iv',
    stk: 320, min: 800, max: 2500, unit: 'chai', price: 18500, flag: 'crit',
    consume: [58,62,68,72,66,58,62,70,76,80,74,68,72,78],
    batches: [
      { lot: 'BB24-NS09', exp: '2026-12', qty: 320, rcvd: '2025-10-01' },
    ]},
  { code: 'LAB-CBC', nm: 'Thuốc thử CBC · Sysmex', form: 'Chai 20L', src: 'Sysmex', cat: 'lab',
    stk: 4, min: 6, max: 18, unit: 'chai', price: 4200000, flag: 'warn',
    consume: [0.3,0.4,0.3,0.5,0.4,0.3,0.4,0.5,0.4,0.3,0.4,0.5,0.6,0.4]},
  { code: 'OXY-40L', nm: 'Oxy y tế · bình 40L', form: 'Bình nén', src: 'Sovigaz', cat: 'oxy',
    stk: 8, min: 12, max: 24, unit: 'bình', price: 680000, flag: 'crit',
    consume: [1.2,1.4,1.2,1.6,1.4,1.2,1.4,1.6,1.4,1.2,1.4,1.6,1.8,1.6]},
  { code: 'IMG-CONTR', nm: 'Thuốc cản quang iopamidol', form: 'Chai 100mL', src: 'Bracco', cat: 'img',
    stk: 68, min: 40, max: 120, unit: 'chai', price: 420000, flag: 'ok',
    consume: [4,3,5,4,6,5,4,5,6,5,4,5,6,5]},
];

const INV_SUPPLIERS = [
  { id: 'GSK',      nm: 'GlaxoSmithKline VN',  addr: 'Hà Nội',      contact: 'Nguyễn Văn Tú · 0912-334-556', leadTime: '5-7 ngày', rating: 4.8 },
  { id: 'STADA',    nm: 'Stada Việt Nam',      addr: 'TP. HCM',     contact: 'Trần Minh Hùng · 0913-221-556', leadTime: '3-5 ngày', rating: 4.9 },
  { id: 'IMEX',     nm: 'Imexpharm',           addr: 'Đồng Tháp',   contact: 'Lê Thị Hoa · 0914-552-334',    leadTime: '5-7 ngày', rating: 4.7 },
  { id: 'SANOFI',   nm: 'Sanofi Aventis VN',   addr: 'TP. HCM',     contact: 'Phạm Quang Vinh · 0915-778-220', leadTime: '7-10 ngày',rating: 4.6 },
  { id: 'BBRAUN',   nm: 'B.Braun Medical VN',  addr: 'Hà Nội',      contact: 'Vũ Đình Long · 0916-443-117',  leadTime: '5-7 ngày', rating: 4.8 },
  { id: 'VIDIPHA',  nm: 'Vidipha VN',          addr: 'TP. HCM',     contact: 'Hoàng Lan Phương · 0917-664-225', leadTime: '3-5 ngày',rating: 4.5 },
  { id: 'MEKO',     nm: 'Mekophar',            addr: 'TP. HCM',     contact: 'Nguyễn Thu Trang · 0918-553-114', leadTime: '3-5 ngày',rating: 4.7 },
  { id: 'ETHI',     nm: 'Ethicon (J&J)',       addr: 'Singapore',   contact: 'Dennis Wong · +65-9123-4455',  leadTime: '10-14 ngày', rating: 4.9 },
];

const INV_WAREHOUSES = [
  { id: 'KHO-TT', nm: 'Kho tổng (tầng hầm)',    pct: 62 },
  { id: 'KHO-NOI',nm: 'Kho Nội trú · tầng 3',   pct: 78 },
  { id: 'KHO-NGO',nm: 'Kho Ngoại trú · tầng 1', pct: 54 },
  { id: 'KHO-CC', nm: 'Kho Cấp cứu',            pct: 81 },
  { id: 'KHO-OR', nm: 'Kho Phòng mổ',           pct: 68 },
  { id: 'KHO-VAC',nm: 'Kho Vắc-xin (lạnh)',     pct: 45 },
];

const INV_HISTORY = (code, unit) => [
  { ts: '10:12', msg: `Xuất 24 ${unit} → Khoa Nội (ĐD Trang)`,  who: 'Hà ĐT.',  kind: 'out' },
  { ts: '09:48', msg: `Xuất 8 ${unit} → Cấp cứu (BS Khải)`,       who: 'Hà ĐT.',  kind: 'out' },
  { ts: '09:15', msg: `Kiểm kê định kỳ — OK (lô B240902B)`,      who: 'Hà ĐT.',  kind: 'audit' },
  { ts: '08:30', msg: `Xuất 16 ${unit} → OPD`,                    who: 'Tú NV.',  kind: 'out' },
  { ts: 'Hôm qua 16:20', msg: `Nhập 12.000 ${unit} từ NCC Stada VN (lô B240902B)`, who: 'Hà ĐT.', kind: 'in' },
  { ts: 'Hôm qua 14:05', msg: `Điều chuyển 500 ${unit} sang Kho Nội trú`,          who: 'Hà ĐT.', kind: 'transfer' },
  { ts: '14/10 09:00',   msg: `Chỉnh ngưỡng min ${unit === 'viên' ? '20.000' : '-'} (phê duyệt BYT)`, who: 'HA Nhung', kind: 'config' },
  { ts: '12/10 10:45',   msg: `Báo cáo sự cố: Lô B240417 hỏng (ẩm mốc) — huỷ 340 ${unit}`, who: 'Tú NV.', kind: 'incident' },
];

// ========= SMALL HELPERS =========
const fmtN = n => n.toLocaleString('vi-VN');
const fmtCur = n => (n >= 1e9 ? (n/1e9).toFixed(2)+' tỷ' : n >= 1e6 ? (n/1e6).toFixed(1)+' tr' : (n/1e3).toFixed(0)+'k') + ' ₫';

const sparkPath = (data, w, h) => {
  const mx = Math.max(...data), mn = Math.min(...data), rng = mx - mn || 1;
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 8) + 4;
    const y = h - 6 - ((v - mn) / rng) * (h - 12);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
};
const sparkArea = (data, w, h) => sparkPath(data, w, h) + ` L${w-4},${h-4} L4,${h-4} Z`;

// ========= POPUPS =========

// --- 1. Đặt hàng (Purchase Order) ---
function OrderModalContent({ item, cx }) {
  const [step, setStep] = invS(1);
  const [supplier, setSupplier] = invS(INV_SUPPLIERS.find(s => item.src.includes(s.id.slice(0,3))) || INV_SUPPLIERS[0]);
  const [qty, setQty] = invS(item.max - item.stk);
  const [priority, setPriority] = invS('normal');
  const [etd, setEtd] = invS('25/10/2026');
  const [notes, setNotes] = invS('');
  const approver = 'TS.BS Nguyễn Hoài Linh (Trưởng Dược)';
  const total = qty * item.price;
  const submit = () => {
    HUI.toast(`Đã tạo PO-2026-${Math.floor(Math.random()*900+100)} cho ${item.nm} · ${fmtN(qty)} ${item.unit}`, { tone: 'ok' });
    cx();
  };
  return (
      <HUI.Modal title="Tạo đơn đặt hàng" sub={`${item.code} · ${item.nm}`} size="lg" onClose={cx}
        footer={<>
          <span style={{flex:1, fontSize:12, color:'var(--t-2)'}}>Tổng giá trị: <b style={{color:'var(--t-0)', fontSize:14}}>{fmtCur(total)}</b></span>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          {step > 1 && <HUI.Btn variant="ghost" onClick={() => setStep(step-1)}>← Quay lại</HUI.Btn>}
          {step < 3 && <HUI.Btn variant="primary" onClick={() => setStep(step+1)}>Tiếp tục →</HUI.Btn>}
          {step === 3 && <HUI.Btn variant="primary" icon="check" onClick={submit}>Xác nhận & gửi PO</HUI.Btn>}
        </>}>
        <div className="hui-stepper">
          <div className={`step ${step===1?'on':step>1?'done':''}`}><span className="n">{step>1?'✓':'1'}</span> Nhà cung cấp</div>
          <span className="sep"/>
          <div className={`step ${step===2?'on':step>2?'done':''}`}><span className="n">{step>2?'✓':'2'}</span> Số lượng & giao hàng</div>
          <span className="sep"/>
          <div className={`step ${step===3?'on':''}`}><span className="n">3</span> Xác nhận</div>
        </div>

        {step === 1 && <>
          <div className="hui-callout info" style={{marginBottom:14}}>
            <Ico name="info" size={14}/>
            <div>Tồn kho hiện tại <b>{fmtN(item.stk)} {item.unit}</b> · Min <b>{fmtN(item.min)}</b> · Max <b>{fmtN(item.max)}</b> · Tiêu thụ TB <b>{(item.consume.reduce((a,b)=>a+b,0)/item.consume.length).toFixed(0)}/ngày</b></div>
          </div>
          <HUI.Field label="Chọn nhà cung cấp" required>
            <div className="hui-list-sel">
              {INV_SUPPLIERS.map(s => (
                <div key={s.id} className={'row ' + (supplier.id===s.id?'on':'')} onClick={() => setSupplier(s)}>
                  <div style={{width:18}}>{supplier.id===s.id && <Ico name="check" size={14}/>}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600, color:'var(--t-0)'}}>{s.nm}</div>
                    <div style={{fontSize:11, color:'var(--t-2)', marginTop:2}}>{s.contact} · {s.addr}</div>
                  </div>
                  <div className="meta">
                    <div>Lead: <b>{s.leadTime}</b></div>
                    <div style={{color:'var(--s-warn)'}}>★ {s.rating}</div>
                  </div>
                </div>
              ))}
            </div>
          </HUI.Field>
        </>}

        {step === 2 && <>
          <HUI.Row cols={2}>
            <HUI.Field label="Số lượng đặt" required hint={`Gợi ý: ${fmtN(item.max - item.stk)} ${item.unit} (đầy max)`}>
              <HUI.Input type="number" value={qty} onChange={e => setQty(+e.target.value)} suffix={item.unit}/>
            </HUI.Field>
            <HUI.Field label="Đơn giá dự kiến">
              <HUI.Input value={fmtN(item.price)} suffix="₫" readOnly/>
            </HUI.Field>
            <HUI.Field label="Mức độ ưu tiên" required>
              <HUI.Radio name="pri" value={priority} onChange={setPriority} options={[
                { value: 'urgent', label: 'Khẩn cấp', sub: 'Giao trong 24h · +5% phí' },
                { value: 'normal', label: 'Thường',   sub: `Theo lead-time: ${supplier.leadTime}` },
                { value: 'saving', label: 'Tiết kiệm',sub: '-3% nếu đợi 14 ngày' },
              ]}/>
            </HUI.Field>
            <div>
              <HUI.Field label="Ngày giao dự kiến" required>
                <HUI.Input type="text" value={etd} onChange={e => setEtd(e.target.value)} icon="calendar"/>
              </HUI.Field>
              <HUI.Field label="Kho nhận">
                <HUI.Select options={INV_WAREHOUSES.map(w => ({value: w.id, label: w.nm}))}/>
              </HUI.Field>
            </div>
            <HUI.Field span={2} label="Ghi chú nội bộ">
              <HUI.Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Ưu tiên lô có HSD dài; kiểm soát nhiệt độ…"/>
            </HUI.Field>
          </HUI.Row>
        </>}

        {step === 3 && <>
          <div className="hui-callout ok" style={{marginBottom:14}}>
            <Ico name="check" size={14}/>
            <div>Xem lại thông tin đơn hàng trước khi gửi. Đơn sẽ chuyển qua phê duyệt của <b>{approver}</b>.</div>
          </div>
          <div className="hui-kv">
            <div className="k">Mặt hàng</div><div className="v">{item.code} · {item.nm}</div>
            <div className="k">NCC</div><div className="v">{supplier.nm}</div>
            <div className="k">Liên hệ</div><div className="v">{supplier.contact}</div>
            <div className="k">Số lượng</div><div className="v">{fmtN(qty)} {item.unit}</div>
            <div className="k">Đơn giá</div><div className="v">{fmtN(item.price)} ₫</div>
            <div className="k">Thành tiền</div><div className="v" style={{color:'var(--a-cy)', fontSize:15}}>{fmtCur(total)}</div>
            <div className="k">Ưu tiên</div><div className="v">{priority === 'urgent' ? 'Khẩn cấp' : priority === 'normal' ? 'Thường' : 'Tiết kiệm'}</div>
            <div className="k">Giao dự kiến</div><div className="v">{etd}</div>
            <div className="k">Người duyệt</div><div className="v">{approver}</div>
            {notes && <><div className="k">Ghi chú</div><div className="v" style={{fontStyle:'italic', color:'var(--t-1)'}}>{notes}</div></>}
          </div>
        </>}
      </HUI.Modal>
    );
}
}

// --- 2. Điều chuyển ---
function TransferModalContent({ item, cx }) {
  const [from, setFrom] = invS('KHO-TT');
    const [to, setTo] = invS('KHO-NOI');
    const [qty, setQty] = invS(Math.min(100, item.stk));
    const [lot, setLot] = invS(item.batches?.[0]?.lot || '');
    const [reason, setReason] = invS('');

    return (
      <HUI.Modal title="Điều chuyển kho" sub={`${item.code} · ${item.nm}`} size="md" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="primary" icon="check" onClick={() => { HUI.toast(`Đã chuyển ${fmtN(qty)} ${item.unit} từ ${from} → ${to}`, {tone:'ok'}); cx(); }}>Xác nhận chuyển</HUI.Btn>
        </>}>
        <HUI.Row cols={2}>
          <HUI.Field label="Từ kho" required>
            <HUI.Select value={from} onChange={e => setFrom(e.target.value)}
              options={INV_WAREHOUSES.map(w => ({value: w.id, label: `${w.nm} (${w.pct}%)`}))}/>
          </HUI.Field>
          <HUI.Field label="Đến kho" required>
            <HUI.Select value={to} onChange={e => setTo(e.target.value)}
              options={INV_WAREHOUSES.filter(w => w.id !== from).map(w => ({value: w.id, label: `${w.nm} (${w.pct}%)`}))}/>
          </HUI.Field>
          <HUI.Field label="Chọn lô hàng" required>
            <HUI.Select value={lot} onChange={e => setLot(e.target.value)}
              options={(item.batches || []).map(b => ({value: b.lot, label: `${b.lot} · HSD ${b.exp} · ${fmtN(b.qty)} ${item.unit}`}))}/>
          </HUI.Field>
          <HUI.Field label="Số lượng chuyển" required hint={`Tối đa: ${fmtN(item.stk)} ${item.unit}`}>
            <HUI.Input type="number" value={qty} onChange={e => setQty(+e.target.value)} max={item.stk} suffix={item.unit}/>
          </HUI.Field>
          <HUI.Field span={2} label="Lý do / Ghi chú">
            <HUI.Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="VD: Bù hàng cho Kho Nội trú sau ca trực đêm…"/>
          </HUI.Field>
        </HUI.Row>
        <div className="hui-callout warn" style={{marginTop:14}}>
          <Ico name="alert" size={14}/>
          <div>Phiếu điều chuyển sẽ được tạo và cần <b>chữ ký thủ kho hai bên</b> khi giao nhận.</div>
        </div>
      </HUI.Modal>
    );
}
}

// --- 3. Sửa ngưỡng ---
function ThresholdModalContent({ item, cx }) {
  const [min, setMin] = invS(item.min);
    const [max, setMax] = invS(item.max);
    const [reason, setReason] = invS('');

    return (
      <HUI.Modal title="Chỉnh ngưỡng tồn kho" sub={`${item.code} · ${item.nm}`} size="md" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="primary" onClick={() => { HUI.toast(`Đã cập nhật ngưỡng: MIN ${fmtN(min)} / MAX ${fmtN(max)}`, {tone:'ok'}); cx(); }}>Lưu & gửi duyệt</HUI.Btn>
        </>}>
        <div className="hui-callout info" style={{marginBottom:14}}>
          <Ico name="info" size={14}/>
          <div>Công thức gợi ý: <b>MIN = tiêu thụ TB × lead-time × 1.5</b>. Với mức tiêu thụ {(item.consume.reduce((a,b)=>a+b,0)/item.consume.length).toFixed(0)} {item.unit}/ngày và lead-time 5 ngày → MIN ≈ {Math.round(item.consume.reduce((a,b)=>a+b,0)/item.consume.length * 5 * 1.5)}.</div>
        </div>
        <HUI.Row cols={2}>
          <HUI.Field label="Ngưỡng tối thiểu (MIN)" required hint="Hệ thống cảnh báo khi dưới mức này">
            <HUI.Input type="number" value={min} onChange={e => setMin(+e.target.value)} suffix={item.unit}/>
          </HUI.Field>
          <HUI.Field label="Ngưỡng tối đa (MAX)" required hint="Tránh ứ đọng vốn">
            <HUI.Input type="number" value={max} onChange={e => setMax(+e.target.value)} suffix={item.unit}/>
          </HUI.Field>
          <HUI.Field span={2} label="Lý do thay đổi" required>
            <HUI.Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="VD: Nhu cầu tăng do mùa cúm…"/>
          </HUI.Field>
        </HUI.Row>
      </HUI.Modal>
    );
}
}

// --- 4. Báo cáo sự cố ---
function IncidentModalContent({ item, cx }) {
  const [kind, setKind] = invS('damaged');
    const [qty, setQty] = invS(1);
    const [lot, setLot] = invS(item.batches?.[0]?.lot || '');
    const [desc, setDesc] = invS('');

    return (
      <HUI.Modal title="Báo cáo sự cố kho" sub={`${item.code} · ${item.nm}`} size="md" tone="danger" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="danger" onClick={() => { HUI.toast(`Đã gửi báo cáo sự cố · mã INC-${Math.floor(Math.random()*9000+1000)}`, {tone:'warn'}); cx(); }}>Gửi báo cáo</HUI.Btn>
        </>}>
        <HUI.Field label="Loại sự cố" required>
          <HUI.Radio name="kind" value={kind} onChange={setKind} options={[
            { value: 'damaged', label: 'Hỏng / Hết hạn',       sub: 'Vỏ méo, ẩm mốc, quá HSD' },
            { value: 'missing', label: 'Mất mát / Thiếu',      sub: 'Không khớp với sổ sách' },
            { value: 'cold',    label: 'Lỗi bảo quản nhiệt độ',sub: 'Tủ lạnh mất điện, vượt ngưỡng' },
            { value: 'recall',  label: 'Thu hồi từ NSX/BYT',   sub: 'Yêu cầu chính thức' },
          ]}/>
        </HUI.Field>
        <div style={{height:12}}/>
        <HUI.Row cols={2}>
          <HUI.Field label="Lô hàng liên quan">
            <HUI.Select value={lot} onChange={e => setLot(e.target.value)}
              options={[{value:'', label:'— Không xác định —'}, ...(item.batches || []).map(b => ({value: b.lot, label: `${b.lot} · HSD ${b.exp}`}))]}/>
          </HUI.Field>
          <HUI.Field label="Số lượng ảnh hưởng" required>
            <HUI.Input type="number" value={qty} onChange={e => setQty(+e.target.value)} suffix={item.unit}/>
          </HUI.Field>
          <HUI.Field span={2} label="Mô tả chi tiết" required>
            <HUI.Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả tình trạng, nguyên nhân, ảnh đính kèm nếu có…" style={{minHeight:100}}/>
          </HUI.Field>
        </HUI.Row>
        <div className="hui-callout crit" style={{marginTop:14}}>
          <Ico name="alert" size={14}/>
          <div>Báo cáo sẽ được chuyển tới <b>Trưởng khoa Dược · Kiểm soát chất lượng · BYT (nếu thu hồi)</b>. Hàng sẽ bị khóa ngay khỏi kho khả dụng.</div>
        </div>
      </HUI.Modal>
    );
}
}

// --- 5. Chi tiết lô hàng ---
function OpenBatchModal(item, batch) {
  HUI.open((cx) => (
    <HUI.Modal title={`Lô ${batch.lot}`} sub={`${item.code} · ${item.nm}`} size="md" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Đóng</HUI.Btn>
        <HUI.Btn variant="ghost" icon="printer">In tem QR</HUI.Btn>
        <HUI.Btn variant="primary" icon="shield">Truy xuất nguồn gốc</HUI.Btn>
      </>}>
      <div className="hui-kv" style={{marginBottom:16}}>
        <div className="k">Số lô</div><div className="v" style={{fontFamily:'var(--font-mono)'}}>{batch.lot}</div>
        <div className="k">Hạn sử dụng</div><div className="v">{batch.exp} {batch.near && <span className="hui-badge warn" style={{marginLeft:6}}>Cận hạn</span>}</div>
        <div className="k">Ngày nhập</div><div className="v">{batch.rcvd}</div>
        <div className="k">Số lượng còn</div><div className="v">{fmtN(batch.qty)} {item.unit}</div>
        <div className="k">Nhà sản xuất</div><div className="v">{item.src}</div>
        <div className="k">Giá trị</div><div className="v">{fmtCur(batch.qty * item.price)}</div>
        <div className="k">Kho lưu</div><div className="v">Kho tổng (tầng hầm)</div>
        <div className="k">Vị trí</div><div className="v" style={{fontFamily:'var(--font-mono)'}}>A-07-R12 (Kệ A, tầng 7, ngăn 12)</div>
      </div>
      <div className="hui-section-t" style={{padding:'0 2px'}}>Phân bổ xuất kho</div>
      <table className="hui-tbl">
        <thead><tr><th>Ngày</th><th>Xuất đi</th><th style={{textAlign:'right'}}>Số lượng</th><th>Người xuất</th></tr></thead>
        <tbody>
          <tr><td>18/10 10:12</td><td>Khoa Nội A</td><td style={{textAlign:'right'}}>24 {item.unit}</td><td>Hà ĐT.</td></tr>
          <tr><td>18/10 09:48</td><td>Cấp cứu</td><td style={{textAlign:'right'}}>8 {item.unit}</td><td>Hà ĐT.</td></tr>
          <tr><td>17/10 16:30</td><td>Phòng mổ</td><td style={{textAlign:'right'}}>12 {item.unit}</td><td>Tú NV.</td></tr>
          <tr><td>17/10 08:00</td><td>OPD</td><td style={{textAlign:'right'}}>32 {item.unit}</td><td>Hà ĐT.</td></tr>
          <tr><td>16/10 14:15</td><td>Khoa Ngoại</td><td style={{textAlign:'right'}}>18 {item.unit}</td><td>Tú NV.</td></tr>
        </tbody>
      </table>
    </HUI.Modal>
  ));
}

// --- 6. Nhập kho (goods receipt) ---
function GoodsReceiptModalContent({ cx }) {
  const [supplier, setSupplier] = invS(INV_SUPPLIERS[0]);
    const [po, setPo] = invS('PO-2026-4712');
    const [rows, setRows] = invS([
      { code: 'PARA500', nm: 'Paracetamol 500mg', lot: '', exp: '', qty: 10000, unit: 'viên' },
      { code: 'AMX625',  nm: 'Amoxicillin 625mg', lot: '', exp: '', qty: 3000,  unit: 'viên' },
    ]);
    const update = (i, k, v) => { const n = [...rows]; n[i] = {...n[i], [k]: v}; setRows(n); };

    return (
      <HUI.Modal title="Phiếu nhập kho" sub={`${po} · ${supplier.nm}`} size="xl" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="ghost" icon="printer">In phiếu</HUI.Btn>
          <HUI.Btn variant="primary" icon="check" onClick={() => { HUI.toast(`Đã nhập ${rows.length} mặt hàng vào kho`, {tone:'ok'}); cx(); }}>Xác nhận nhập</HUI.Btn>
        </>}>
        <HUI.Row cols={3}>
          <HUI.Field label="Đơn đặt hàng">
            <HUI.Input value={po} onChange={e => setPo(e.target.value)} icon="file"/>
          </HUI.Field>
          <HUI.Field label="Nhà cung cấp">
            <HUI.Select value={supplier.id} onChange={e => setSupplier(INV_SUPPLIERS.find(s => s.id === e.target.value))}
              options={INV_SUPPLIERS.map(s => ({value: s.id, label: s.nm}))}/>
          </HUI.Field>
          <HUI.Field label="Ngày nhập">
            <HUI.Input type="text" defaultValue="18/10/2026 10:30" icon="calendar"/>
          </HUI.Field>
        </HUI.Row>
        <div style={{height:14}}/>
        <div className="hui-section-t" style={{padding:'0 2px'}}>Danh sách hàng nhập</div>
        <table className="hui-tbl">
          <thead><tr><th>Mặt hàng</th><th>Số lô</th><th>HSD</th><th style={{textAlign:'right'}}>Số lượng</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><div style={{fontWeight:500}}>{r.nm}</div><div style={{fontSize:11, color:'var(--t-2)', fontFamily:'var(--font-mono)'}}>{r.code}</div></td>
                <td><HUI.Input value={r.lot} onChange={e => update(i, 'lot', e.target.value)} placeholder="VD: B240902B"/></td>
                <td><HUI.Input value={r.exp} onChange={e => update(i, 'exp', e.target.value)} placeholder="YYYY-MM"/></td>
                <td style={{textAlign:'right'}}><HUI.Input type="number" value={r.qty} onChange={e => update(i, 'qty', +e.target.value)} suffix={r.unit}/></td>
                <td><button className="hui-x" onClick={() => setRows(rows.filter((_,k) => k !== i))}><Ico name="x" size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:10}}>
          <HUI.Btn variant="soft" icon="plus" onClick={() => setRows([...rows, {code:'', nm:'Mặt hàng mới', lot:'', exp:'', qty:0, unit:'viên'}])}>+ Thêm dòng</HUI.Btn>
        </div>
        <div className="hui-callout warn" style={{marginTop:14}}>
          <Ico name="alert" size={14}/>
          <div>Cần chữ ký <b>Thủ kho</b>, <b>Kiểm tra chất lượng</b>, <b>Kế toán kho</b> trước khi đóng phiếu. Phiếu sẽ in 3 liên.</div>
        </div>
      </HUI.Modal>
    );
}
}

// --- 7. Xuất Excel ---
function ExportModalContent({ cx }) {
  const [scope, setScope] = invS('all');
  const [fmt, setFmt] = invS('xlsx');
    return (
      <HUI.Modal title="Xuất dữ liệu kho" size="md" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="primary" icon="download" onClick={() => { HUI.toast(`Đang xuất file inventory-${Date.now()}.${fmt}…`, {tone:'info'}); cx(); }}>Tải xuống</HUI.Btn>
        </>}>
        <HUI.Field label="Phạm vi dữ liệu">
          <HUI.Radio name="scope" value={scope} onChange={setScope} options={[
            { value: 'all',  label: 'Toàn bộ kho',     sub: '2.847 SKU · ~1.2 MB' },
            { value: 'low',  label: 'Hàng thấp / hết', sub: '51 SKU' },
            { value: 'exp',  label: 'Cận hạn ≤ 90 ngày', sub: '23 lô' },
            { value: 'mvt',  label: 'Nhập xuất 30 ngày', sub: '3.240 giao dịch' },
          ]}/>
        </HUI.Field>
        <div style={{height:12}}/>
        <HUI.Field label="Định dạng">
          <HUI.Radio name="fmt" value={fmt} onChange={setFmt} options={[
            { value: 'xlsx', label: 'Excel (.xlsx)',   sub: 'Có định dạng, biểu đồ' },
            { value: 'csv',  label: 'CSV (.csv)',      sub: 'Dữ liệu thô, nhẹ' },
            { value: 'pdf',  label: 'PDF báo cáo',     sub: 'Có header/footer BV' },
          ]}/>
        </HUI.Field>
      </HUI.Modal>
    );
}
}

// --- 8. Drawer: lịch sử đầy đủ ---
function HistoryDrawerContent({ item, cx }) {
  const [tab, setTab] = invS('all');
    const hist = INV_HISTORY(item.code, item.unit);
    const filtered = tab === 'all' ? hist : hist.filter(h => h.kind === tab);
    return (
      <HUI.Drawer title={`Lịch sử · ${item.code}`} sub={item.nm} width={520} onClose={cx}
        tabs={[
          { id: 'all', label: 'Tất cả', count: hist.length },
          { id: 'in',  label: 'Nhập',   count: hist.filter(h=>h.kind==='in').length },
          { id: 'out', label: 'Xuất',   count: hist.filter(h=>h.kind==='out').length },
          { id: 'audit', label: 'Kiểm kê', count: hist.filter(h=>h.kind==='audit').length },
          { id: 'incident', label: 'Sự cố', count: hist.filter(h=>h.kind==='incident').length },
        ]}
        activeTab={tab} onTab={setTab}
        footer={<><HUI.Btn variant="ghost" icon="download">Xuất lịch sử</HUI.Btn><HUI.Btn variant="primary" onClick={cx}>Đóng</HUI.Btn></>}>
        <div className="hui-timeline">
          {filtered.map((h, i) => (
            <div key={i} className={`ev ${h.kind === 'incident' ? 'crit' : h.kind === 'in' ? 'ok' : h.kind === 'audit' ? 'warn' : ''}`}>
              <div className="ts">{h.ts}</div>
              <div className="msg">{h.msg}</div>
              <div className="who">Bởi: {h.who}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{padding:20, textAlign:'center', color:'var(--t-3)', fontSize:12}}>Không có giao dịch</div>}
        </div>
      </HUI.Drawer>
    );
}
}

// ========= MODAL OPENERS =========
const OpenOrderModal = (item) => HUI.open((cx) => <OrderModalContent item={item} cx={cx}/>);
const OpenTransferModal = (item) => HUI.open((cx) => <TransferModalContent item={item} cx={cx}/>);
const OpenThresholdModal = (item) => HUI.open((cx) => <ThresholdModalContent item={item} cx={cx}/>);
const OpenIncidentModal = (item) => HUI.open((cx) => <IncidentModalContent item={item} cx={cx}/>);
const OpenGoodsReceiptModal = () => HUI.open((cx) => <GoodsReceiptModalContent cx={cx}/>);
const OpenExportModal = () => HUI.open((cx) => <ExportModalContent cx={cx}/>);
const OpenHistoryDrawer = (item) => HUI.drawer((cx) => <HistoryDrawerContent item={item} cx={cx}/>);

// ========= MAIN MODULE =========
function InvModule() {
  const [cat, setCat] = invS('all');
  const [sel, setSel] = invS('PARA500');
  const [viewMode, setViewMode] = invS('all');
  const [kpiFilter, setKpiFilter] = invS(null);
  const [search, setSearch] = invS('');

  const current = INV_ITEMS.find(x => x.code === sel) || INV_ITEMS[0];

  let filtered = INV_ITEMS;
  if (cat !== 'all') filtered = filtered.filter(x => x.cat === cat
    || (cat === 'drug' && ['antib','pain','cv','insul','psy'].includes(x.cat))
    || (cat === 'mat' && ['surg','sut','iv'].includes(x.cat)));
  if (viewMode === 'low') filtered = filtered.filter(x => x.flag === 'warn' || x.flag === 'crit');
  if (viewMode === 'exp') filtered = filtered.filter(x => x.batches?.some(b => b.near));
  if (kpiFilter === 'low') filtered = filtered.filter(x => x.flag === 'warn');
  if (kpiFilter === 'out') filtered = filtered.filter(x => x.stk === 0);
  if (search) filtered = filtered.filter(x => (x.nm + ' ' + x.code + ' ' + x.src).toLowerCase().includes(search.toLowerCase()));

  const kpis = [
    { id: 'val',  l: 'Giá trị tồn kho',     v: '12,84', u: 'tỷ ₫', s: 'theo giá vốn',    flag: 'ok' },
    { id: 'sku',  l: 'Số SKU',              v: '2.847', u: 'loại', s: '18 danh mục',     flag: 'ok' },
    { id: 'low',  l: 'Dưới ngưỡng',         v: '37',    u: 'SKU',  s: 'cần bổ sung',     flag: 'warn' },
    { id: 'out',  l: 'Hết hàng',            v: '14',    u: 'SKU',  s: 'cần đặt gấp',     flag: 'crit' },
    { id: 'exp',  l: 'Cận hạn ≤ 90 ngày',   v: '23',    u: 'lô',   s: '486 tr ₫',        flag: 'warn' },
    { id: 'turn', l: 'Vòng quay (TB)',      v: '6,4',   u: '×/năm',s: 'mục tiêu 6–8',    flag: 'ok' },
  ];

  const daysOfStock = current.stk > 0 && current.consume
    ? Math.round(current.stk / (current.consume.reduce((a,b) => a+b, 0) / current.consume.length))
    : 0;

  return (
    <div className="iv-wrap">
      <div className="iv-top">
        <div className="title">Quản lý kho<small>Cập nhật 10:24 · BVĐK Hưng Yên · Thủ kho: ĐT. Nguyễn T. Hà</small></div>
        <div style={{flex:1}}/>
        <button className="btn" onClick={OpenExportModal}><Ico name="download" size={13}/> Xuất Excel</button>
        <button className="btn" onClick={() => HUI.toast('Đang gửi báo cáo tới máy in HP LJ-401 · khay 1', {tone:'info'})}><Ico name="printer" size={13}/> In báo cáo</button>
        <button className="btn primary" onClick={OpenGoodsReceiptModal}><Ico name="plus" size={13}/> Nhập kho</button>
      </div>

      <div className="iv-kpis">
        {kpis.map(k => (
          <div key={k.id} className={`iv-kpi ${k.flag} ${kpiFilter === k.id ? 'active' : ''}`}
               onClick={() => setKpiFilter(kpiFilter === k.id ? null : k.id)}>
            <div className="l">{k.l}</div>
            <div className="v">{k.v}<small>{k.u}</small></div>
            <div className="s">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="iv-body">
        {/* LEFT: categories */}
        <div className="iv-cats">
          <div className="iv-cat-h">Danh mục</div>
          {INV_CATS.map(c => (
            <div key={c.id} className={`iv-cat ${cat === c.id ? 'a' : ''}`} onClick={() => setCat(c.id)}>
              {!c.sub && <div className="ic">{c.ic}</div>}
              {c.sub && <div style={{width:22}}/>}
              <div className="nm">{c.nm}{c.lock && <span style={{marginLeft:6, color:'var(--s-mag)', fontSize:10}}>🔒</span>}</div>
              {c.crit > 0 && <div className="dot crit" title={`${c.crit} hết hàng`}/>}
              {c.crit === 0 && c.warn > 0 && <div className="dot warn" title={`${c.warn} thấp`}/>}
              <div className="cnt">{c.cnt}</div>
            </div>
          ))}
        </div>

        {/* CENTER: items table */}
        <div className="iv-main">
          <div className="iv-filters">
            <input className="iv-search" placeholder="Tìm theo tên, mã, hoạt chất, NSX…" value={search} onChange={e => setSearch(e.target.value)}/>
            <div className="seg">
              <button className={viewMode==='all'?'a':''} onClick={() => setViewMode('all')}>Tất cả</button>
              <button className={viewMode==='low'?'a':''} onClick={() => setViewMode('low')}>Thấp · hết</button>
              <button className={viewMode==='exp'?'a':''} onClick={() => setViewMode('exp')}>Cận hạn</button>
            </div>
            <button className="btn" onClick={() => HUI.toast('Tính năng cấu hình cột đang phát triển', {tone:'info'})}>⚙ Cột</button>
          </div>
          <div className="iv-tbl-wrap">
            <table className="iv-tbl">
              <thead><tr><th>Tên · mã</th><th>Dạng · NSX</th><th className="num">Tồn kho</th><th className="num">Ngưỡng</th><th className="num">Đơn giá</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {filtered.map(it => {
                  const ratio = Math.min(it.stk / it.max, 1);
                  return (
                    <tr key={it.code} className={sel === it.code ? 'sel' : ''} onClick={() => setSel(it.code)}>
                      <td>
                        <div className="code">{it.code}{it.ctrl && <span style={{color:'var(--s-mag)', marginLeft:6}}>• {it.ctrl}</span>}{it.cold && <span style={{color:'var(--a-cy)', marginLeft:6}}>❄ Lạnh</span>}</div>
                        <div className="nm">{it.nm}</div>
                      </td>
                      <td>
                        <div style={{fontSize:12, color:'var(--t-1)'}}>{it.form}</div>
                        <div className="sub">{it.src}</div>
                      </td>
                      <td className="num">
                        <div className={`stk ${it.flag}`}>
                          <div className="stk-bar"><div className="f" style={{width: (ratio*100).toFixed(0)+'%'}}/></div>
                          <div className="val">{fmtN(it.stk)}</div>
                        </div>
                        <div style={{fontSize:10, color:'var(--t-2)', marginTop:2}}>{it.unit}</div>
                      </td>
                      <td className="num" style={{color:'var(--t-2)', fontSize:11}}>{fmtN(it.min)} / {fmtN(it.max)}</td>
                      <td className="num">{fmtN(it.price)}<span style={{color:'var(--t-2)', fontWeight:400}}> ₫</span></td>
                      <td>
                        {it.flag === 'ok' && <span className="iv-flag ok">● ĐỦ</span>}
                        {it.flag === 'warn' && <span className="iv-flag warn">▲ THẤP</span>}
                        {it.flag === 'crit' && it.stk > 0 && <span className="iv-flag crit">◉ RẤT THẤP</span>}
                        {it.flag === 'crit' && it.stk === 0 && <span className="iv-flag crit">✕ HẾT</span>}
                        {it.batches?.some(b=>b.near) && <span className="iv-flag exp" style={{marginLeft:4}}>⏱ CẬN HẠN</span>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:30, color:'var(--t-3)'}}>Không có mặt hàng nào khớp bộ lọc</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <div className="iv-det">
          <div className="iv-det-h">
            <div className="code">{current.code} · {current.cat.toUpperCase()}</div>
            <div className="nm">{current.nm}</div>
            <div className="sub">{current.form} · {current.src}</div>
          </div>

          <div className="iv-det-sec">
            <div className="hh">Mức tồn</div>
            <div className="iv-gauge">
              <div className="row"><span>{fmtN(current.stk)} {current.unit}</span><span>/ {fmtN(current.max)} max</span></div>
              <div className="bar" style={{position:'relative'}}>
                <div className="f" style={{width: Math.min(current.stk/current.max*100, 100)+'%',
                  background: current.flag === 'crit' ? 'var(--s-crit)' : current.flag === 'warn' ? 'var(--s-warn)' : 'var(--s-ok)'}}/>
                <div className="thr warn" style={{left: (current.min*0.6/current.max*100)+'%'}}/>
                <div className="thr" style={{left: (current.min/current.max*100)+'%'}}/>
              </div>
              <div className="bar-labels"><span>0</span><span style={{color:'var(--s-crit)'}}>MIN {fmtN(current.min)}</span><span>MAX {fmtN(current.max)}</span></div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
              <div style={{padding:8, background:'var(--d-1)', borderRadius:'var(--r-2)'}}>
                <div style={{fontSize:10, color:'var(--t-2)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.05em'}}>Đủ dùng</div>
                <div style={{fontSize:18, fontWeight:700, color: daysOfStock < 7 ? 'var(--s-crit)' : daysOfStock < 14 ? 'var(--s-warn)' : 'var(--s-ok)', fontFamily:'var(--font-mono)'}}>{daysOfStock} <small style={{fontSize:11, fontWeight:400, color:'var(--t-2)'}}>ngày</small></div>
              </div>
              <div style={{padding:8, background:'var(--d-1)', borderRadius:'var(--r-2)'}}>
                <div style={{fontSize:10, color:'var(--t-2)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.05em'}}>Giá trị</div>
                <div style={{fontSize:18, fontWeight:700, color:'var(--t-0)', fontFamily:'var(--font-mono)'}}>{(current.stk*current.price/1e6).toFixed(1)}<small style={{fontSize:11, fontWeight:400, color:'var(--t-2)'}}> tr ₫</small></div>
              </div>
            </div>
          </div>

          <div className="iv-det-sec">
            <div className="hh">Tiêu thụ 14 ngày</div>
            <svg className="iv-consume-chart" viewBox="0 0 320 60" preserveAspectRatio="none">
              <path className="area" d={sparkArea(current.consume, 320, 60)}/>
              <path className="line" d={sparkPath(current.consume, 320, 60)}/>
              {current.consume.map((v, i) => {
                const mx = Math.max(...current.consume), mn = Math.min(...current.consume), rng = mx - mn || 1;
                const x = (i / (current.consume.length - 1)) * 312 + 4;
                const y = 54 - ((v - mn) / rng) * 48;
                return <circle key={i} className="dot" cx={x} cy={y} r="1.8"/>;
              })}
            </svg>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--t-2)', fontFamily:'var(--font-mono)', marginTop:4}}>
              <span>TB: {(current.consume.reduce((a,b)=>a+b,0)/current.consume.length).toFixed(1)} {current.unit}/ngày</span>
              <span>Max: {Math.max(...current.consume)}</span>
            </div>
          </div>

          <div className="iv-det-sec">
            <div className="hh">Lô hàng · click để xem chi tiết</div>
            {current.batches && current.batches.length > 0 ? current.batches.map((b, i) => (
              <div key={i} className={`iv-batch ${b.near ? 'near' : ''}`} style={{cursor:'pointer'}} onClick={() => OpenBatchModal(current, b)}>
                <div>
                  <div className="b-lot">{b.lot}</div>
                  <div className="b-dt">HSD: {b.exp} · NK: {b.rcvd}{b.near && ' · ⚠ CẬN HẠN'}</div>
                </div>
                <div className="b-qty">{fmtN(b.qty)}<span className="sub">{current.unit}</span></div>
              </div>
            )) : (
              <div style={{padding:12, textAlign:'center', color:'var(--s-crit)', fontFamily:'var(--font-mono)', fontSize:11, background:'var(--s-crit-bg)', borderRadius:'var(--r-2)', fontWeight:600}}>✕ KHÔNG CÓ LÔ NÀO TRONG KHO</div>
            )}
          </div>

          <div className="iv-det-sec">
            <div className="hh">Thao tác</div>
            <div className="iv-actions">
              <button className="p" onClick={() => OpenOrderModal(current)}>
                <span><span className="ic">+</span> Đặt hàng</span>
                <span className="k">⌘ N</span>
              </button>
              <button onClick={() => OpenTransferModal(current)}>
                <span><span className="ic">↔</span> Điều chuyển</span>
                <span className="k">⌘ T</span>
              </button>
              <button onClick={() => OpenThresholdModal(current)}>
                <span><span className="ic">✎</span> Sửa ngưỡng</span>
                <span className="k">⌘ E</span>
              </button>
              <button className={current.flag === 'crit' ? 'crit' : ''} onClick={() => OpenIncidentModal(current)}>
                <span><span className="ic">⚠</span> Báo cáo sự cố</span>
                <span className="k">⌘ ⇧ R</span>
              </button>
            </div>
          </div>

          <div className="iv-det-sec" style={{background:'var(--d-1)'}}>
            <div className="hh" style={{display:'flex', alignItems:'center'}}>
              <span>Lịch sử gần đây</span>
              <button style={{marginLeft:'auto', fontSize:11, color:'var(--a-cy)', fontWeight:500}} onClick={() => OpenHistoryDrawer(current)}>Xem tất cả →</button>
            </div>
            <div style={{fontSize:11, color:'var(--t-1)', lineHeight:1.6, fontFamily:'var(--font-mono)'}}>
              {INV_HISTORY(current.code, current.unit).slice(0, 4).map((h, i) => (
                <div key={i} style={{color: i < 2 ? 'var(--t-1)' : 'var(--t-2)'}}>{h.ts.split(' ')[0]} · {h.msg.slice(0, 44)}{h.msg.length > 44 ? '…' : ''}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.InvModule = InvModule;
