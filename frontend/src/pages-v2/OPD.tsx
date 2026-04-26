import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Drawer, App as AntdApp, Input } from 'antd';
import * as receptionApi from '../api/reception';
import type { AdmissionDto } from '../api/reception';
import './OPD.css';

type QueueRow = {
  pid: string;
  tok: string;
  arrived: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  bhytClass?: string;
  reason: string;
  status: 'waiting' | 'in-progress' | 'labs' | 'imaging' | 'done';
  priority: 'urgent' | 'routine';
  vitals: { bp: string; hr: number; spo2: number; temp: number };
  allergy: string[];
  bloodType: string;
  bhyt: string;
};

const INIT_LABS = [
  { code: '23.0501.1701', name: 'CTM 20 thông số', qty: 1 },
  { code: '23.0501.1830', name: 'CRP định lượng', qty: 1 },
  { code: '23.0501.1410', name: 'Glucose máu', qty: 1 },
  { code: '23.0501.2001', name: 'Chức năng gan (AST, ALT, Albumin)', qty: 1 },
];
const INIT_IMAGES = [
  { code: '24.0001.0001', name: 'Siêu âm ổ bụng tổng quát', qty: 1 },
];
const INIT_RX = [
  { code: 'VN-20145-15', name: 'Omeprazol 20mg',   dose: '1v × 1 sáng',  dur: '14 ngày', qty: 14 },
  { code: 'VN-19872-22', name: 'Domperidon 10mg',  dose: '1v × 3/ngày',  dur: '7 ngày',  qty: 21 },
  { code: 'VN-18442-08', name: 'Magnesi-Al hydroxyd 400/400', dose: '2v × 3/ngày', dur: '7 ngày', qty: 42 },
];

/* ==========================================================================
   OPD page
   ========================================================================== */

const OPDV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();

  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [sel, setSel]     = useState<string>('');
  const [tab, setTab]     = useState<'waiting' | 'in' | 'labs' | 'done'>('in');

  const [labs, setLabs]   = useState(INIT_LABS);
  const [imgs, setImgs]   = useState(INIT_IMAGES);
  const [rx, setRx]       = useState(INIT_RX);
  const [icd, setIcd]     = useState<string[]>(['K29.7', 'K21.9']);

  const [icdModal, setIcdModal]     = useState(false);
  const [labsDrawer, setLabsDrawer] = useState(false);
  const [imgModal, setImgModal]     = useState(false);
  const [rxModal, setRxModal]       = useState(false);
  const [transferModal, setTransferModal] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    receptionApi.getTodayAdmissions(undefined, dayjs().format('YYYY-MM-DD'))
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        const extended = data.map((a, i) => toQueueRow(a, i));
        setQueue(extended);
        if (extended.length > 0) setSel(extended[0].pid);
      })
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, []);

  const tabs = useMemo(() => ([
    { k: 'waiting', l: 'Chờ khám',  n: queue.filter((q) => q.status === 'waiting').length },
    { k: 'in',      l: 'Đang khám', n: queue.filter((q) => q.status === 'in-progress').length },
    { k: 'labs',    l: 'Chờ KQ',    n: queue.filter((q) => q.status === 'labs' || q.status === 'imaging').length },
    { k: 'done',    l: 'Đã xong',   n: queue.filter((q) => q.status === 'done').length },
  ] as const), [queue]);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'waiting': return queue.filter((q) => q.status === 'waiting');
      case 'in':      return queue.filter((q) => q.status === 'in-progress');
      case 'labs':    return queue.filter((q) => q.status === 'labs' || q.status === 'imaging');
      case 'done':    return queue.filter((q) => q.status === 'done');
      default:        return queue;
    }
  }, [queue, tab]);

  const q = queue.find((x) => x.pid === sel) || queue[0];

  const vitalsClass = (key: 'bp' | 'hr' | 'spo2') => {
    if (!q) return '';
    if (key === 'bp') {
      const sys = parseInt(q.vitals.bp.split('/')[0], 10);
      if (sys > 160) return 'crit';
      if (sys > 140) return 'warn';
    }
    if (key === 'hr' && q.vitals.hr > 100) return 'warn';
    if (key === 'spo2' && q.vitals.spo2 < 95) return 'crit';
    if (key === 'spo2' && q.vitals.spo2 < 97) return 'warn';
    return '';
  };

  if (!q) {
    return <div style={{ padding: 20, fontSize: 12, color: '#64748b' }}>Đang tải hàng đợi...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="opd-grid">
        {/* ============ LEFT QUEUE ============ */}
        <div className="opd-col">
          <div className="opd-col-h">
            <b>Hàng đợi khám</b>
            <span className="meta">{queue.length} lượt · P.201 Nội TQ</span>
          </div>
          <div className="opd-qtabs">
            {tabs.map((t) => (
              <div
                key={t.k}
                className={'opd-qtab ' + (tab === t.k ? 'active' : '')}
                onClick={() => setTab(t.k)}
              >
                {t.l}<span className="n">{t.n}</span>
              </div>
            ))}
          </div>
          <div className="opd-qlist">
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                {queue.length === 0
                  ? 'Chưa có bệnh nhân nào hôm nay'
                  : 'Không có bệnh nhân ở trạng thái này'}
              </div>
            ) : filtered.map((x) => {
              const chip = x.status === 'waiting' ? { bg: 'var(--d-3)',     c: 'var(--t-2)',    l: 'CHỜ'  }
                        : x.status === 'in-progress' ? { bg: 'var(--a-cy-bg)', c: 'var(--a-cy)',   l: 'KHÁM' }
                        : x.status === 'labs' ? { bg: 'var(--s-warn-bg)', c: 'var(--s-warn)', l: 'XN'   }
                        : x.status === 'imaging' ? { bg: 'var(--s-mag-bg)',  c: 'var(--s-mag)',  l: 'CĐHA' }
                        : { bg: 'var(--s-ok-bg)', c: 'var(--s-ok)', l: 'XONG' };
              return (
                <div
                  key={x.pid}
                  className={'opd-qrow ' + (sel === x.pid ? 'sel ' : '') + (x.priority === 'urgent' ? 'urgent' : '')}
                  onClick={() => setSel(x.pid)}
                >
                  <div className="tok">{x.tok}</div>
                  <div>
                    <div className="nm">{x.name}</div>
                    <div className="sub">{x.arrived} · {x.age}{x.gender === 'M' ? 'N' : 'Nữ'} · {x.bhytClass || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-1)', marginTop: 2 }}>{x.reason}</div>
                  </div>
                  <div className="stat" style={{ background: chip.bg, color: chip.c }}>
                    {x.priority === 'urgent' && (
                      <div style={{ color: 'var(--s-crit)', fontWeight: 600, fontSize: 9 }}>● KHẨN</div>
                    )}
                    {chip.l}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ RIGHT CONSULT ============ */}
        <div className="opd-col" style={{ padding: 0 }}>
          {q.allergy.length > 0 && (
            <div className="opd-banner">
              <span style={{ fontSize: 16 }}>⚠</span>
              DỊ ỨNG: {q.allergy.join(', ')} · Cân nhắc kỹ khi kê đơn kháng sinh
            </div>
          )}

          <div className="opd-patient-bar">
            <div className="opd-pb-main">
              <div className="opd-pb-avatar">{q.name.split(' ').slice(-1)[0][0]}</div>
              <div>
                <div className="opd-pb-name">
                  {q.name} · <span style={{ color: 'var(--t-2)', fontWeight: 400, fontSize: 14 }}>{q.pid}</span>
                </div>
                <div className="opd-pb-meta">
                  <span>{q.age} tuổi · {q.gender === 'M' ? 'Nam' : 'Nữ'}</span>
                  <span>BHYT <b>{q.bhyt}</b></span>
                  <span>Nhóm máu <b>{q.bloodType}</b></span>
                  <span>Khám lúc <b>{q.arrived}</b></span>
                </div>
              </div>
            </div>
            <div className="opd-pb-actions">
              <button className="opd-btn-sec" onClick={() => window.open('/v2/emr', '_blank')}>📁 EMR đầy đủ</button>
              <button className="opd-btn-sec" onClick={() => message.info('⎙ Đã gửi tóm tắt khám tới máy in P.201')}>⎙ In tóm tắt</button>
            </div>
          </div>

          <div className="opd-vitals">
            <div className={'opd-vital ' + vitalsClass('bp')}>
              <div className="lbl">Huyết áp</div>
              <div className="v">{q.vitals.bp}<small>mmHg</small></div>
            </div>
            <div className={'opd-vital ' + vitalsClass('hr')}>
              <div className="lbl">Mạch</div>
              <div className="v">{q.vitals.hr}<small>lần/p</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">Nhiệt độ</div>
              <div className="v">{q.vitals.temp}<small>°C</small></div>
            </div>
            <div className={'opd-vital ' + vitalsClass('spo2')}>
              <div className="lbl">SpO₂</div>
              <div className="v">{q.vitals.spo2}<small>%</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">Cân nặng</div>
              <div className="v">68<small>kg</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">BMI</div>
              <div className="v">23.5</div>
            </div>
          </div>

          <div className="opd-consult">
            {/* ------ LEFT: SOAP + orders ------ */}
            <div className="opd-left">
              <div className="opd-soap">
                <div className="opd-soap-sec">
                  <h3>S · Lý do khám / Hỏi bệnh <span className="hint">Chủ quan</span></h3>
                  <div className="opd-note-field">
                    {q.reason}. Bệnh nhân đau vùng thượng vị 3 ngày nay, xuất hiện sau ăn, kèm ợ chua, buồn nôn nhẹ. Không nôn ra máu. Không đi ngoài phân đen. Không sốt.
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>O · Thăm khám lâm sàng <span className="hint">Khách quan</span></h3>
                  <div className="opd-note-field">
                    Toàn trạng: Tỉnh, tiếp xúc tốt. Da, niêm mạc hồng.
                    Tim: Nhịp đều {q.vitals.hr} l/p, T1 T2 rõ, không tiếng thổi.
                    Phổi: Rì rào phế nang đều 2 bên.
                    Bụng: Mềm, ấn đau vùng thượng vị.
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>A · Chẩn đoán <span className="hint">ICD-10</span></h3>
                  <div className="opd-icd-row">
                    {icd.map((c) => (
                      <span key={c} className="opd-icd-chip">
                        <span>{c}</span>
                        <b>{icdName(c)}</b>
                        <span className="x" onClick={() => setIcd(icd.filter((x) => x !== c))}>×</span>
                      </span>
                    ))}
                    <span className="opd-icd-add" onClick={() => setIcdModal(true)}>+ Thêm ICD-10</span>
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>P · Kế hoạch điều trị <span className="hint">Chỉ định + Kê đơn</span></h3>
                  <div className="opd-orders">
                    <OrderCard
                      title="Xét nghiệm"
                      count={labs.length}
                      items={labs}
                      onAdd={() => setLabsDrawer(true)}
                      addLabel="+ Thêm XN · F6"
                    />
                    <OrderCard
                      title="Chẩn đoán hình ảnh"
                      count={imgs.length}
                      items={imgs}
                      onAdd={() => setImgModal(true)}
                      addLabel="+ Thêm CĐHA · F7"
                    />
                    <div className="opd-ord-card" style={{ gridColumn: 'span 2' }}>
                      <h4>
                        Đơn thuốc (Thông tư 52)
                        <span className="q">{rx.length} khoản · {rx.reduce((s, r) => s + r.qty, 0)} đơn vị</span>
                      </h4>
                      <div className="opd-ord-list">
                        {rx.map((r, i) => (
                          <div key={i} className="opd-ord-item" style={{ gridTemplateColumns: '1fr auto' }}>
                            <span>
                              <b>{i + 1}. {r.name}</b> · <span className="code">{r.code}</span><br />
                              <span style={{ fontSize: 11, color: 'var(--t-2)' }}>
                                {r.dose} · {r.dur}
                              </span>
                            </span>
                            <span className="code">SL: {r.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="opd-ord-add" onClick={() => setRxModal(true)}>+ Thêm thuốc · F8</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="opd-actions">
                <div style={{ display: 'flex', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>
                  <span>Đã nhập: S ✓  O ✓  A ✓  P ✓</span>
                  <span>·</span>
                  <span>Tự lưu 00:12</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="opd-btn-sec"
                    onClick={() => message.info('✓ Đã lưu nháp · tự động lưu mỗi 15s')}
                  >Lưu nháp</button>
                  <button
                    className="opd-btn-warn opd-btn-sec"
                    onClick={() => setTransferModal(true)}
                  >Chuyển khoa</button>
                  <button
                    className="opd-btn-primary"
                    onClick={() => {
                      modal.confirm({
                        title: 'Hoàn tất khám & gửi đơn?',
                        content: `Hệ thống sẽ khoá hồ sơ khám, gửi ${labs.length} XN sang LIS, ${imgs.length} CĐHA sang RIS, ${rx.length} thuốc sang Nhà thuốc, chuyển BN sang thu ngân.`,
                        okText: 'HOÀN TẤT & KÝ',
                        cancelText: 'Hủy',
                        onOk: () => message.success('✓ Đã hoàn tất khám · BN chuyển sang thu ngân'),
                      });
                    }}
                  >
                    HOÀN TẤT KHÁM &amp; GỬI ĐƠN
                    <span className="kbd">F2</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ------ RIGHT: summary / history ------ */}
            <div className="opd-right" style={{ borderLeft: '1px solid var(--line)' }}>
              <div className="opd-right-h">
                <b style={{ fontSize: 13 }}>Tóm tắt &amp; Lịch sử</b>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t-3)' }}>F4 mở rộng</span>
              </div>
              <div className="opd-right-body">
                {q.allergy.length > 0 && (
                  <div className="opd-alert">
                    <h5>⚠ Cảnh báo dị ứng</h5>
                    {q.allergy.map((a) => <div key={a} className="a-item">• {a}</div>)}
                  </div>
                )}

                <div className="opd-vitals-spark">
                  <h5>Huyết áp — 7 lần gần nhất</h5>
                  <svg viewBox="0 0 280 60" style={{ width: '100%', height: 50 }}>
                    {[30, 26, 32, 28, 22, 18, 15].map((y, i, a) =>
                      i < a.length - 1 ? (
                        <line
                          key={i}
                          x1={i * 40 + 8} y1={y}
                          x2={(i + 1) * 40 + 8} y2={a[i + 1]}
                          stroke="var(--a-cy)" strokeWidth={2}
                        />
                      ) : null
                    )}
                    {[30, 26, 32, 28, 22, 18, 15].map((y, i) => (
                      <circle key={i} cx={i * 40 + 8} cy={y} r="3" fill="var(--a-cy)" />
                    ))}
                  </svg>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--t-3)', marginTop: 2,
                  }}>
                    <span>12/10: 128/80</span>
                    <span>hôm nay: <b style={{ color: 'var(--s-warn)' }}>{q.vitals.bp}</b></span>
                  </div>
                </div>

                <div className="opd-hist">
                  <h5 style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--t-2)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: 6,
                  }}>3 lần khám gần nhất</h5>
                  <div className="opd-hist-row">
                    <div className="d">12/08/2026 · BS. Linh · Nội TQ</div>
                    <div className="r">THA độ 2 · Rối loạn lipid máu · Amlodipin 5mg + Atorvastatin 20mg × 30 ngày</div>
                  </div>
                  <div className="opd-hist-row">
                    <div className="d">02/06/2026 · BS. Linh · Nội TQ</div>
                    <div className="r">THA độ 2 · Theo dõi ĐTĐ type 2 · HbA1c 7.2% · Metformin 500mg × 30 ngày</div>
                  </div>
                  <div className="opd-hist-row">
                    <div className="d">15/03/2026 · BS. Thành · Tim mạch</div>
                    <div className="r">SA tim: EF 62%, không bệnh van tim · ECG: nhịp xoang</div>
                  </div>
                </div>

                <div>
                  <h5 style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--t-2)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: 6,
                  }}>Thuốc đang dùng</h5>
                  <div style={{
                    fontSize: 12, color: 'var(--t-1)',
                    padding: '6px 10px', background: 'var(--d-1)',
                    border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                    marginBottom: 4,
                  }}>Amlodipin 5mg · 1v sáng (hết ngày 11/11)</div>
                  <div style={{
                    fontSize: 12, color: 'var(--t-1)',
                    padding: '6px 10px', background: 'var(--d-1)',
                    border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                  }}>Atorvastatin 20mg · 1v tối (hết ngày 11/11)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MODALS ============ */}
      <IcdSearchModal
        open={icdModal}
        onClose={() => setIcdModal(false)}
        onAdd={(code) => {
          setIcd((prev) => prev.includes(code) ? prev : [...prev, code]);
          message.success(`Đã thêm ${code} vào chẩn đoán`);
          setIcdModal(false);
        }}
      />
      <LabOrderDrawer
        open={labsDrawer}
        onClose={() => setLabsDrawer(false)}
        onAdd={(added) => {
          setLabs((prev) => [...prev, ...added]);
          message.success(`Đã thêm ${added.length} XN vào đơn`);
          setLabsDrawer(false);
        }}
      />
      <ImagingOrderModal
        open={imgModal}
        onClose={() => setImgModal(false)}
        onAdd={() => {
          setImgs((prev) => [...prev, { code: '24.0001.0010', name: 'Nội soi dạ dày tá tràng', qty: 1 }]);
          message.success('Đã thêm CĐHA vào đơn');
          setImgModal(false);
        }}
      />
      <RxModal
        open={rxModal}
        onClose={() => setRxModal(false)}
        onAdd={() => {
          setRx((prev) => [...prev, { code: 'VN-30231-10', name: 'Esomeprazol 40mg', dose: '1v sáng', dur: '14 ngày', qty: 14 }]);
          message.success('Đã thêm thuốc vào đơn (đã kiểm tra tương tác)');
          setRxModal(false);
        }}
      />
      <TransferModal
        open={transferModal}
        patient={q.name}
        onClose={() => setTransferModal(false)}
        onConfirm={() => {
          message.success('Đã gửi yêu cầu chuyển khoa');
          setTransferModal(false);
        }}
      />
    </div>
  );
};

/* ==========================================================================
   Sub-components
   ========================================================================== */

const OrderCard: React.FC<{
  title: string;
  count: number;
  items: { code: string; name: string; qty: number }[];
  onAdd: () => void;
  addLabel: string;
}> = ({ title, count, items, onAdd, addLabel }) => (
  <div className="opd-ord-card">
    <h4>{title} <span className="q">{count} chỉ định</span></h4>
    <div className="opd-ord-list">
      {items.map((o, i) => (
        <div key={i} className="opd-ord-item">
          <span><b>{o.name}</b> · <span className="code">{o.code}</span></span>
          <span className="code">×{o.qty}</span>
        </div>
      ))}
    </div>
    <div className="opd-ord-add" onClick={onAdd}>{addLabel}</div>
  </div>
);

const ICD_LIST = [
  { c: 'K29.7', n: 'Viêm dạ dày cấp, không xác định' },
  { c: 'K21.9', n: 'Bệnh trào ngược dạ dày thực quản, không kèm viêm thực quản' },
  { c: 'K25.9', n: 'Loét dạ dày cấp tính, không chảy máu, không thủng' },
  { c: 'K30',   n: 'Khó tiêu chức năng' },
  { c: 'B98.0', n: 'Helicobacter pylori là nguyên nhân' },
  { c: 'R10.1', n: 'Đau khu trú phần bụng trên' },
  { c: 'I10',   n: 'Tăng huyết áp nguyên phát' },
  { c: 'E11',   n: 'Đái tháo đường type 2' },
];

function icdName(code: string): string {
  return ICD_LIST.find((i) => i.c === code)?.n || code;
}

const IcdSearchModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: (code: string) => void;
}> = ({ open, onClose, onAdd }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const filtered = ICD_LIST.filter((i) => (i.c + ' ' + i.n).toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { if (open) { setQ(''); setSelected(null); } }, [open]);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={560}
      title="Thêm chẩn đoán ICD-10"
      footer={[
        <button key="c" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
        <button
          key="a" type="button" className="btn primary"
          disabled={!selected}
          onClick={() => selected && onAdd(selected)}
        >Thêm ICD</button>,
      ]}
    >
      <Input placeholder="Tìm theo mã hoặc tên chẩn đoán..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ marginTop: 10, maxHeight: 300, overflow: 'auto', border: '1px solid #e4e9f0', borderRadius: 6 }}>
        {filtered.map((i) => (
          <div
            key={i.c}
            onClick={() => setSelected(i.c)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f3f4f6',
              cursor: 'pointer',
              background: selected === i.c ? '#eff5ff' : '#fff',
              display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: '#0891b2' }}>
              {i.c}
            </span>
            <span style={{ fontSize: 12 }}>{i.n}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};

const LAB_CATALOG = [
  { id: 'hp',    name: 'Helicobacter pylori test hơi thở (UBT)', price: '320.000', code: '23.0501.1900' },
  { id: 'cbc',   name: 'Công thức máu toàn phần (CBC)',           price: '48.000',  code: '23.0501.1701' },
  { id: 'lft',   name: 'Sinh hóa gan (AST, ALT, GGT, ALP)',       price: '145.000', code: '23.0501.2001' },
  { id: 'kft',   name: 'Sinh hóa thận (Ure, Creatinin)',          price: '72.000',  code: '23.0501.2102' },
  { id: 'amyl',  name: 'Amylase máu',                              price: '48.000',  code: '23.0501.2201' },
  { id: 'stool', name: 'Tổng phân tích phân',                      price: '38.000',  code: '23.0501.2303' },
];

const LabOrderDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: (items: { code: string; name: string; qty: number }[]) => void;
}> = ({ open, onClose, onAdd }) => {
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) setSel(new Set()); }, [open]);
  const toggle = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSel(n);
  };
  const add = () => {
    const items = LAB_CATALOG
      .filter((i) => sel.has(i.id))
      .map((i) => ({ code: i.code, name: i.name, qty: 1 }));
    onAdd(items);
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Thêm chỉ định XN</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>Chọn từ danh mục TT-BYT</div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="btn primary" onClick={add}>Thêm ({sel.size})</button>
        </div>
      }
    >
      <div style={{ padding: '6px 0' }}>
        {LAB_CATALOG.map((i) => (
          <label
            key={i.id}
            style={{
              display: 'grid', gridTemplateColumns: '22px 1fr auto',
              alignItems: 'center', gap: 10,
              padding: '10px 12px',
              border: `1px solid ${sel.has(i.id) ? '#2563eb' : '#e4e9f0'}`,
              borderRadius: 6, marginBottom: 6,
              cursor: 'pointer',
              background: sel.has(i.id) ? '#eff5ff' : '#fff',
            }}
          >
            <input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} />
            <span style={{ fontSize: 13 }}>{i.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b' }}>{i.price} ₫</span>
          </label>
        ))}
      </div>
    </Drawer>
  );
};

const ImagingOrderModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}> = ({ open, onClose, onAdd }) => (
  <Modal
    open={open} onCancel={onClose} width={460} title="Thêm chỉ định CĐHA"
    footer={[
      <button key="c" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
      <button key="a" type="button" className="btn primary" onClick={onAdd}>Thêm</button>,
    ]}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Kỹ thuật *</div>
        <select className="select" defaultValue="Nội soi dạ dày tá tràng">
          <option>Nội soi dạ dày tá tràng</option>
          <option>Siêu âm ổ bụng tổng quát</option>
          <option>X-quang bụng không chuẩn bị</option>
          <option>CT bụng chậu có tiêm thuốc</option>
          <option>MRI bụng chậu</option>
        </select>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Mức ưu tiên</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ fontSize: 12 }}><input type="radio" name="prio" /> Khẩn</label>
          <label style={{ fontSize: 12 }}><input type="radio" name="prio" defaultChecked /> Thường</label>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Yêu cầu</div>
        <Input.TextArea rows={2} defaultValue="Đánh giá viêm dạ dày, H.pylori, loét" />
      </div>
    </div>
  </Modal>
);

const RxModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}> = ({ open, onClose, onAdd }) => (
  <Modal
    open={open} onCancel={onClose} width={640}
    title={
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Thêm thuốc</div>
        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>DMT bệnh viện · Thông tư 52</div>
      </div>
    }
    footer={[
      <button key="c" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
      <button key="a" type="button" className="btn primary" onClick={onAdd}>Thêm vào đơn</button>,
    ]}
  >
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Tên thuốc *</div>
        <Input placeholder="Tìm theo tên biệt dược / hoạt chất..." defaultValue="Esomeprazol 40mg" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Dạng bào chế</div>
        <select className="select"><option>Viên nén bao phim</option><option>Viên nang</option><option>Dung dịch tiêm</option></select>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Đường dùng</div>
        <select className="select"><option>PO</option><option>IV</option><option>IM</option><option>SC</option></select>
      </div>
      <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Liều</div><Input defaultValue="40mg" /></div>
      <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Số lần/ngày</div><Input defaultValue="1" /></div>
      <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Số ngày</div><Input defaultValue="14" /></div>
      <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Tổng SL</div><Input defaultValue="14 viên" /></div>
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Cách dùng</div>
        <Input defaultValue="Uống 1 viên vào buổi sáng trước ăn 30 phút" />
      </div>
    </div>
    <div style={{
      marginTop: 10, padding: '8px 10px',
      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6,
      fontSize: 12, color: '#059669',
    }}>
      ✓ Không có tương tác nghiêm trọng với đơn hiện tại
    </div>
  </Modal>
);

const TransferModal: React.FC<{
  open: boolean;
  patient: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ open, patient, onClose, onConfirm }) => (
  <Modal
    open={open} onCancel={onClose} width={480}
    title={
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Chuyển khoa khám</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{patient}</div>
      </div>
    }
    footer={[
      <button key="c" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
      <button key="a" type="button" className="btn primary" onClick={onConfirm}>Chuyển</button>,
    ]}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Khoa nhận *</div>
        <select className="select">
          <option>Tiêu hoá</option>
          <option>Tim mạch</option>
          <option>Hô hấp</option>
          <option>Nội tiết</option>
          <option>Thận - Tiết niệu</option>
          <option>Ngoại tổng quát</option>
        </select>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Lý do chuyển</div>
        <Input.TextArea rows={3} defaultValue="Cần hội chẩn chuyên khoa tiêu hoá, đánh giá nội soi" />
      </div>
    </div>
  </Modal>
);

/* ==========================================================================
   Helpers
   ========================================================================== */

function toQueueRow(a: AdmissionDto, _i: number): QueueRow {
  const t = dayjs(a.admissionDate);
  const statusMap: Record<number, QueueRow['status']> = {
    0: 'waiting', 1: 'in-progress', 2: 'labs', 3: 'done',
  };
  return {
    pid: a.patientCode,
    tok: a.queueCode || `A${String(a.queueNumber).padStart(3, '0')}`,
    arrived: t.format('HH:mm'),
    name: a.patientName,
    age: a.age,
    gender: a.gender === 1 ? 'M' : 'F',
    bhytClass: a.isInsuranceValid ? 'TN' : '—',
    reason: a.chiefComplaint || a.priorityName || '—',
    status: statusMap[a.status] || 'waiting',
    priority: a.isEmergency || a.priority >= 2 ? 'urgent' : 'routine',
    vitals: { bp: '120/76', hr: 78, spo2: 98, temp: 36.8 },
    allergy: [],
    bloodType: 'O+',
    bhyt: a.insuranceNumber || '—',
  };
}

export default OPDV2;
