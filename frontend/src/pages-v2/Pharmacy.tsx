import React, { useEffect, useMemo, useState } from 'react';
import { Modal, App as AntdApp, Input } from 'antd';
import * as pharmacyApi from '../api/pharmacy';
import type { PendingPrescription, MedicationItem } from '../api/pharmacy';
import './Pharmacy.css';

type RxStat = 'pending' | 'accepted' | 'dispensing' | 'completed' | 'rejected';

const STAT_LABEL: Record<RxStat, string> = {
  pending: 'CHỜ',
  accepted: 'NHẬN',
  dispensing: 'KIỂM',
  completed: 'XONG',
  rejected: 'HOÀN',
};

const PharmacyV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [tab, setTab]   = useState<'all' | RxStat>('all');
  const [queue, setQueue] = useState<PendingPrescription[]>([]);
  const [sel, setSel]   = useState<string>('');
  const [items, setItems]       = useState<MedicationItem[]>([]);
  const [warnings, setWarnings] = useState<{ critical: number; expiring: number }>({ critical: 0, expiring: 0 });
  const [loading, setLoading]   = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [search, setSearch] = useState('');

  // Load queue + warnings once
  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      pharmacyApi.getPendingPrescriptions(),
      pharmacyApi.getInventoryWarnings(),
    ]).then(([rx, wn]) => {
      if (rx.status === 'fulfilled') {
        const data = Array.isArray(rx.value.data) ? rx.value.data : [];
        setQueue(data);
        if (data.length > 0 && !sel) setSel(data[0].id);
      }
      if (wn.status === 'fulfilled') {
        const w = wn.value.data as { critical?: number; expiring?: number } | undefined;
        setWarnings({ critical: w?.critical ?? 0, expiring: w?.expiring ?? 0 });
      }
      setLoading(false);
    });
  };
  useEffect(reload, []);

  // Load medication items when selection changes
  useEffect(() => {
    if (!sel) { setItems([]); return; }
    setItemsLoading(true);
    pharmacyApi.getMedicationItems(sel)
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [sel]);

  const counts = useMemo(() => ({
    all: queue.length,
    pending:    queue.filter((x) => x.status === 'pending').length,
    accepted:   queue.filter((x) => x.status === 'accepted').length,
    dispensing: queue.filter((x) => x.status === 'dispensing').length,
    completed:  queue.filter((x) => x.status === 'completed').length,
    rejected:   queue.filter((x) => x.status === 'rejected').length,
  }), [queue]);

  const filtered = useMemo(() => {
    let src = tab === 'all' ? queue : queue.filter((x) => x.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter((r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.patientCode.toLowerCase().includes(q) ||
        r.prescriptionCode.toLowerCase().includes(q),
      );
    }
    return src;
  }, [queue, tab, search]);

  const sRx = useMemo(() => queue.find((x) => x.id === sel) || queue[0], [queue, sel]);
  const subtotal = items.reduce((s, i) => {
    // item price not in MedicationItem DTO — use 0 fallback
    const anyItem = i as MedicationItem & { unitPrice?: number; price?: number };
    const p = (anyItem.unitPrice ?? anyItem.price ?? 0) * (i.quantity || 0);
    return s + p;
  }, 0);
  // BHYT % unknown from DTO — show subtotal only
  const totalAmount = sRx?.totalAmount ?? subtotal;

  const dispense = async () => {
    if (!sRx) return;
    try {
      await pharmacyApi.completeDispensing(sRx.id);
      message.success(`✓ Đã giao đơn ${sRx.prescriptionCode}`);
      reload();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Không thể giao thuốc');
    }
  };

  const accept = async (id: string) => {
    try {
      await pharmacyApi.acceptPrescription(id);
      reload();
    } catch {
      message.error('Không thể nhận đơn');
    }
  };

  const todayCompleted = counts.completed;
  const totalPending = counts.pending + counts.accepted + counts.dispensing;
  const urgentCount = queue.filter((x) => x.priority === 'urgent').length;

  return (
    <div className="rx-wrap">
      {/* ===== TOP KPIs ===== */}
      <div className="rx-top">
        <Kpi l="Hàng chờ"        v={totalPending} />
        <Kpi l="Khẩn · ưu tiên"  v={urgentCount} cls="crit" />
        <Kpi l="Đang lấy"        v={counts.accepted} cls="warn" />
        <Kpi l="Đang kiểm"       v={counts.dispensing} />
        <Kpi l="Đã giao hôm nay" v={todayCompleted} cls="ok" />
        <Kpi l="Đã hoàn"         v={counts.rejected} />
        <Kpi l="Thuốc sắp hết"   v={warnings.expiring} cls="warn" />
        <Kpi l="Hết hàng"        v={warnings.critical} cls="crit" />
      </div>

      <div className="rx-body">
        {/* ===== QUEUE ===== */}
        <div className="rx-queue">
          <div className="rx-toolbar">
            <div className="rx-seg">
              {(['all', 'pending', 'accepted', 'dispensing', 'completed'] as const).map((k) => {
                const label = { all: 'Tất cả', pending: 'Chờ', accepted: 'Lấy', dispensing: 'Kiểm', completed: 'Xong' }[k];
                const count = k === 'all' ? counts.all : counts[k];
                return (
                  <div
                    key={k}
                    className={'rx-seg-i ' + (tab === k ? 'on' : '')}
                    onClick={() => setTab(k)}
                  >{label}<span className="n">{count}</span></div>
                );
              })}
            </div>
            <div style={{ flex: 1 }} />
            <input
              type="text" placeholder="Tìm mã đơn / BN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: 28, border: '1px solid var(--line)',
                borderRadius: 'var(--r-2)', padding: '0 10px',
                fontSize: 12, width: 200,
              }}
            />
            <button
              className="opd-btn-sec"
              style={{ height: 28, padding: '0 10px' }}
              onClick={reload}
            >⟳ Làm mới</button>
          </div>

          {sRx?.priority === 'urgent' && (
            <div className="rx-alert-row">
              ⚠ <b>Đơn khẩn</b> — {sRx.department} · ưu tiên phát ngay
            </div>
          )}

          <div className="rx-list">
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                {queue.length === 0 ? 'Không có đơn thuốc' : 'Không có đơn ở trạng thái này'}
              </div>
            ) : filtered.map((r, i) => (
              <div
                key={r.id}
                className={'rx-row ' + (sel === r.id ? 'sel' : '')}
                onClick={() => setSel(r.id)}
              >
                <div className="num">{String(i + 1).padStart(3, '0')}</div>
                <div>
                  <div className="pname">
                    {r.priority === 'urgent' && <span className="rx-badge urg">KHẨN</span>}
                    <span className={'rx-badge ' + r.status}>{STAT_LABEL[r.status as RxStat] || r.status}</span>
                    {' '}{r.patientName}
                  </div>
                  <div className="pmeta">
                    <span>BN <b>{r.patientCode}</b></span>
                    <span>· {r.department || '—'}</span>
                    <span>· BS {r.doctorName || '—'}</span>
                    <span>· {r.itemsCount} thuốc</span>
                    <span>· {r.prescriptionCode}</span>
                  </div>
                </div>
                <div className="rx-end">
                  <div className="amt">
                    {(r.totalAmount || 0).toLocaleString('vi-VN')}<span className="cc"> ₫</span>
                  </div>
                  <div className="bhyt">{new Date(r.createdDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== DETAIL ===== */}
        <div className="rx-detail">
          {!sRx ? (
            <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Chọn một đơn thuốc trong danh sách
            </div>
          ) : (
            <>
              <div className="rx-detail-h">
                <div className="rx-detail-num">
                  <div className="big">{sRx.prescriptionCode}</div>
                  <div style={{ flex: 1 }} />
                  <span className="rx-badge" style={{
                    padding: '3px 8px', fontSize: 11,
                    borderRadius: 'var(--r-1)', background: 'var(--a-cy-bg)',
                    color: 'var(--a-cy)', fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                  }}>● {STAT_LABEL[sRx.status as RxStat] || sRx.status}</span>
                </div>
                <div className="rx-detail-pt">{sRx.patientName}</div>
                <div className="rx-detail-meta">
                  <span><b>{sRx.patientCode}</b></span>
                  <span>· {sRx.department || '—'}</span>
                  <span>· BS {sRx.doctorName || '—'}</span>
                  <span>· {new Date(sRx.createdDate).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="rx-detail-body">
                {itemsLoading ? (
                  <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    Đang tải danh mục thuốc...
                  </div>
                ) : items.length === 0 ? (
                  <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    Đơn thuốc không có mặt hàng
                  </div>
                ) : items.map((it, i) => {
                  const done = (it.dispensedQuantity || 0) >= (it.quantity || 0);
                  const fefo = it.batches?.find((b) => b.recommendedFEFO);
                  return (
                    <div key={it.id} className={'rx-item ' + (done ? 'done' : '')}>
                      <div className="idx">{i + 1}</div>
                      <div>
                        <div className="rx-item-nm">{it.medicationName}</div>
                        <div className="rx-item-sub">
                          <span className="code">{it.medicationCode}</span> · {it.dosage || ''}
                          {it.instruction && <> · {it.instruction}</>}
                          {fefo && <><br /><span className="alert">📦 FEFO:</span> Lô {fefo.batchNumber} · HSD {new Date(fefo.expiryDate).toLocaleDateString('vi-VN')} · còn {fefo.availableQuantity}</>}
                        </div>
                      </div>
                      <div className="rx-item-qty">
                        {it.quantity}<br />
                        <small>{it.unit}</small>
                      </div>
                      <div className="rx-item-price">
                        {it.dispensedQuantity}/{it.quantity}
                      </div>
                      <div className="rx-item-check">{done ? '✓' : ''}</div>
                    </div>
                  );
                })}
              </div>

              <div className="rx-sum">
                <div className="rx-sum-row tot">
                  <span className="lbl">Tổng tiền đơn</span>
                  <span className="val">{totalAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              <div className="rx-actions">
                <button onClick={() => message.info(`⎙ In đơn ${sRx.prescriptionCode}`)}>In đơn</button>
                <button onClick={() => setRejectModal(true)}>Hoàn</button>
                {sRx.status === 'pending' && (
                  <button onClick={() => accept(sRx.id)}>Nhận đơn</button>
                )}
                <button
                  className="p"
                  onClick={() => {
                    modal.confirm({
                      title: 'Giao thuốc cho BN?',
                      content: `${sRx.prescriptionCode} · ${sRx.patientName} · ${items.length} thuốc. Tổng ${totalAmount.toLocaleString('vi-VN')}₫. Kho sẽ tự trừ hàng.`,
                      okText: 'GIAO THUỐC',
                      cancelText: 'Hủy',
                      onOk: dispense,
                    });
                  }}
                >✓ Giao thuốc (F10)</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      <RejectModal
        open={rejectModal}
        code={sRx?.prescriptionCode || ''}
        name={sRx?.patientName || ''}
        onClose={() => setRejectModal(false)}
        onSubmit={async (reason) => {
          if (!sRx) return;
          try {
            await pharmacyApi.rejectPrescription(sRx.id, reason);
            message.success('✓ Đã gửi phản hồi cho BS');
            setRejectModal(false);
            reload();
          } catch {
            message.error('Không thể hoàn đơn');
          }
        }}
      />
    </div>
  );
};

const Kpi: React.FC<{ l: string; v: number | string; small?: string; cls?: string }> = ({ l, v, small, cls }) => (
  <div className={'rx-kpi ' + (cls || '')}>
    <div className="l">{l}</div>
    <div className="v">
      {v}
      {small && <small style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 400 }}> {small}</small>}
    </div>
  </div>
);

const RejectModal: React.FC<{
  open: boolean;
  code: string;
  name: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}> = ({ open, code, name, onClose, onSubmit }) => {
  const [reason, setReason] = useState('allergy');
  const [note, setNote]     = useState('');
  const REASONS = [
    { v: 'allergy',    l: 'BN dị ứng',           sub: 'Aspirin / Sulfa (ghi nhận trong EMR)' },
    { v: 'interact',   l: 'Tương tác thuốc',      sub: 'Cần đổi thuốc thay thế' },
    { v: 'oos',        l: 'Hết thuốc',             sub: 'Không có trong kho, không có lô thay thế' },
    { v: 'wrong-dose', l: 'Liều không phù hợp',   sub: 'Yêu cầu BS xem lại' },
    { v: 'other',      l: 'Khác' },
  ];
  return (
    <Modal
      open={open} onCancel={onClose} width={560}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Hoàn / từ chối đơn thuốc</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{code} · {name}</div>
        </div>
      }
      footer={[
        <button key="c" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        <button key="s" type="button" className="btn danger" onClick={() => {
          const label = REASONS.find((o) => o.v === reason)?.l || reason;
          onSubmit(`${label}${note ? ' — ' + note : ''}`);
        }}>Gửi phản hồi</button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 500 }}>Lý do *</div>
          {REASONS.map((o) => (
            <label key={o.v} style={{ display: 'block', padding: '6px 0', fontSize: 12 }}>
              <input
                type="radio" name="rej"
                checked={reason === o.v}
                onChange={() => setReason(o.v)}
              /> <b>{o.l}</b>
              {o.sub && <div style={{ marginLeft: 22, fontSize: 11, color: '#64748b' }}>{o.sub}</div>}
            </label>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Ghi chú cho BS</div>
          <Input.TextArea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: BN dị ứng Aspirin, đề nghị thay Clopidogrel 75mg..."
          />
        </div>
      </div>
    </Modal>
  );
};

export default PharmacyV2;
