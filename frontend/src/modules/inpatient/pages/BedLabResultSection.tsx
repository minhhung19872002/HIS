/**
 * BedLabResultSection — Trả kết quả XN tại giường (G-01)
 * Nghiệp vụ: điều dưỡng/BS nhập KQ từng chỉ số → Lưu → Duyệt sơ bộ → Duyệt chính thức → In
 * - Nút In CHỈ enable khi order.status >= 4 (đã duyệt sơ bộ)
 * - Reuse hoàn toàn endpoint LIS: enter-result / preliminary-approve / final-approve / print
 * - abbrExpand scope LAB (3) trong ô ghi chú
 */
import React, { useEffect, useState, useCallback } from 'react';
import { App as AntdApp, Input, Select, Spin, Tag } from 'antd';
import {
  getLabOrdersByAdmission,
  saveTestResults,
  preliminaryApprove,
  finalApprove,
  printTestResultReport,
  type BedLabOrder,
} from '../../laboratory/api/laboratory';
import { adminApi } from '../../system/api/system';
import apiClient from '../../../services/apiClient';
import { useAbbrExpansion } from '../../../utils/abbrExpand';
import { ModalShell, Btn } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAB_SCOPE = [3] as const; // scope LAB = 3

const STATUS_COLOR: Record<number, string> = {
  0: 'default',
  1: 'blue',
  2: 'processing',
  3: 'orange',
  4: 'cyan',
  5: 'green',
  6: 'red',
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ---------------------------------------------------------------------------
// Inline field helper (keeps consistent style with TreatmentMonitorSection)
// ---------------------------------------------------------------------------

const IpFld: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// EnterResultModal — nhập KQ từng chỉ số cho 1 phiếu XN
// ---------------------------------------------------------------------------

interface ResultEntry {
  itemId: string;
  value: string;
  notes: string;
}

const EnterResultModal: React.FC<{
  open: boolean;
  order: BedLabOrder | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, order, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const expand = useAbbrExpansion(LAB_SCOPE);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset khi mở modal / đổi order
  useEffect(() => {
    if (!open || !order) return;
    setEntries(
      order.tests.map((t) => ({
        itemId: t.id,
        value: t.result ?? '',
        notes: t.notes ?? '',
      }))
    );
  }, [open, order]);

  const setEntry = useCallback(
    (idx: number, field: keyof ResultEntry, val: string) => {
      setEntries((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: val };
        return next;
      });
    },
    []
  );

  const submit = async () => {
    if (!order) return;
    // Validate: phải có ít nhất 1 chỉ số được nhập giá trị
    const filled = entries.filter((e) => e.value.trim() !== '');
    if (filled.length === 0) {
      message.warning('Nhập ít nhất 1 kết quả trước khi lưu');
      return;
    }
    setBusy(true);
    try {
      await saveTestResults(order.id, {
        parameters: filled.map((e) => ({
          id: e.itemId,
          name: '',
          value: e.value,
          unit: '',
          referenceRange: '',
          status: null,
          inputType: 'text',
        })),
        notes: '',
      });
      message.success('Đã lưu kết quả XN');
      onDone();
    } catch {
      message.error('Lưu kết quả thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (!order) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={`Nhập KQ XN — ${order.orderCode}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu kết quả'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)' }}>
        {/* Order header */}
        <div style={{ marginBottom: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          <span>BS chỉ định: <b style={{ color: 'var(--t-1)' }}>{order.orderDoctorName || '—'}</b></span>
          {order.diagnosis && (
            <span style={{ marginLeft: 'var(--space-16)' }}>CĐ: <b style={{ color: 'var(--t-1)' }}>{order.icdCode ? `${order.icdCode} - ` : ''}{order.diagnosis}</b></span>
          )}
          <span style={{ marginLeft: 'var(--space-16)' }}>Ngày: {fmtDate(order.orderedAt)}</span>
        </div>

        {/* Test items grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          {order.tests.map((test, idx) => (
            <div
              key={test.id}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--r-2)',
                border: '1px solid var(--line-soft)',
                background: 'var(--d-1)',
              }}
            >
              {/* Test header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                <span style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--t-1)' }}>{test.testName}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{test.testCode}</span>
                {test.referenceRange && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    Tham chiếu: {test.referenceRange} {test.unit}
                  </span>
                )}
                <Tag color={STATUS_COLOR[test.status] ?? 'default'} style={{ marginLeft: 'auto', fontSize: 'var(--fs-xxs)' }}>
                  {test.statusName}
                </Tag>
              </div>

              {/* Input row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 'var(--space-10)', alignItems: 'flex-start' }}>
                <IpFld label={`Kết quả${test.unit ? ` (${test.unit})` : ''} *`}>
                  <Input
                    value={entries[idx]?.value ?? ''}
                    onChange={(e) => setEntry(idx, 'value', e.target.value)}
                    placeholder="Nhập giá trị…"
                    style={{
                      borderColor: entries[idx]?.value
                        ? ((test.abnormalFlag ?? 0) > 0 ? 'var(--warn)' : undefined)
                        : undefined,
                    }}
                  />
                </IpFld>
                <div style={{ paddingTop: 'var(--space-20)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)', textAlign: 'center' }}>
                  {test.unit || ''}
                </div>
                <IpFld label="Ghi chú (bung viết tắt: gõ + space)">
                  <Input.TextArea
                    value={entries[idx]?.notes ?? ''}
                    onChange={(e) => {
                      const expanded = expand(e.target.value);
                      setEntry(idx, 'notes', expanded);
                    }}
                    rows={1}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    placeholder="Ghi chú kỹ thuật viên…"
                  />
                </IpFld>
              </div>
            </div>
          ))}

          {order.tests.length === 0 && (
            <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
              Phiếu XN không có chỉ số nào.
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// ApproveModal — duyệt sơ bộ hoặc chính thức
// ---------------------------------------------------------------------------

interface ApproverUser { id: string; fullName: string; username: string; }

const ApproveModal: React.FC<{
  open: boolean;
  order: BedLabOrder | null;
  mode: 'preliminary' | 'final';
  onClose: () => void;
  onDone: () => void;
}> = ({ open, order, mode, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Người duyệt + mật khẩu xác thực
  const [approverUsers, setApproverUsers] = useState<ApproverUser[]>([]);
  const [approverUserId, setApproverUserId] = useState<string>('');
  const [approverPassword, setApproverPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setApproverUserId('');
    setApproverPassword('');
    // Load danh sách user active — filter role phù hợp (KTV/BS) ở phía user
    adminApi.getUsers(undefined, undefined, true).then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setApproverUsers(list.map((u) => ({ id: u.id ?? '', fullName: u.fullName, username: u.username })));
    }).catch(() => { /* non-critical */ });
  }, [open]);

  const submit = async () => {
    if (!order) return;
    if (!approverUserId) { message.warning('Chọn người duyệt'); return; }
    if (!approverPassword.trim()) { message.warning('Nhập mật khẩu xác thực'); return; }

    setVerifying(true);
    let valid = false;
    try {
      const vr = await apiClient.post<boolean>('/auth/verify-password', {
        userId: approverUserId,
        password: approverPassword,
      });
      valid = vr.data === true;
    } catch {
      message.error('Xác thực thất bại — kiểm tra kết nối');
      setVerifying(false);
      return;
    }
    setVerifying(false);

    if (!valid) { message.error('Mật khẩu không đúng'); return; }

    setBusy(true);
    try {
      if (mode === 'preliminary') {
        await preliminaryApprove(order.id, note);
        message.success('Duyệt sơ bộ thành công');
      } else {
        await finalApprove(order.id, note);
        message.success('Duyệt chính thức thành công');
      }
      onDone();
    } catch {
      message.error('Duyệt thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (!order) return null;

  const isLoading = busy || verifying;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={mode === 'preliminary' ? `Duyệt sơ bộ — ${order.orderCode}` : `Duyệt chính thức — ${order.orderCode}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={isLoading}>Hủy</Btn>
          <Btn variant="primary" disabled={isLoading} onClick={submit}>
            <TermIcon name="check" size={12} /> {isLoading ? 'Đang xử lý…' : mode === 'preliminary' ? 'Duyệt sơ bộ' : 'Duyệt chính thức'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <IpFld label="Người duyệt *" full>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn người duyệt…"
            value={approverUserId || undefined}
            onChange={setApproverUserId}
            showSearch
            optionFilterProp="label"
            options={approverUsers.map((u) => ({
              value: u.id,
              label: `${u.fullName} (${u.username})`,
            }))}
          />
        </IpFld>
        <IpFld label="Mật khẩu xác thực *" full>
          <Input.Password
            value={approverPassword}
            onChange={(e) => setApproverPassword(e.target.value)}
            placeholder="Nhập mật khẩu của người duyệt…"
            autoComplete="new-password"
          />
        </IpFld>
        <IpFld label={mode === 'preliminary' ? 'Ghi chú kỹ thuật viên' : 'Ghi chú bác sĩ'} full>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ghi chú khi duyệt (tùy chọn)…"
          />
        </IpFld>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Main section component
// ---------------------------------------------------------------------------

export interface BedLabResultSectionProps {
  admissionId: string;
}

const BedLabResultSection: React.FC<BedLabResultSectionProps> = ({ admissionId }) => {
  const { message } = AntdApp.useApp();
  const [orders, setOrders] = useState<BedLabOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [enterTarget, setEnterTarget] = useState<BedLabOrder | null>(null);
  const [approveTarget, setApproveTarget] = useState<BedLabOrder | null>(null);
  const [approveMode, setApproveMode] = useState<'preliminary' | 'final'>('preliminary');
  const [printing, setPrinting] = useState<string | null>(null); // orderId being printed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLabOrdersByAdmission(admissionId);
      setOrders(data);
    } catch {
      message.error('Không tải được danh sách XN');
    } finally {
      setLoading(false);
    }
  }, [admissionId, message]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = async (order: BedLabOrder) => {
    setPrinting(order.id);
    try {
      const blob = await printTestResultReport(order.id);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) w.onload = () => URL.revokeObjectURL(url);
    } catch {
      message.error('In phiếu kết quả thất bại');
    } finally {
      setPrinting(null);
    }
  };

  const openApprove = (order: BedLabOrder, mode: 'preliminary' | 'final') => {
    setApproveMode(mode);
    setApproveTarget(order);
  };

  const done = () => {
    setEnterTarget(null);
    setApproveTarget(null);
    load();
  };

  // Determine available actions per order
  const canEnter = (o: BedLabOrder) => o.status < 4; // chưa duyệt chính thức → còn nhập được
  const canPreliminaryApprove = (o: BedLabOrder) => o.status === 3; // Chờ duyệt → duyệt sơ bộ
  const canFinalApprove = (o: BedLabOrder) => o.status === 4; // Đã duyệt sơ bộ → duyệt chính thức
  const canPrint = (o: BedLabOrder) => o.status >= 4; // chỉ in khi đã duyệt sơ bộ/chính thức

  return (
    <div className="rec-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
        <h5 style={{ margin: 0 }}>
          <TermIcon name="flask" size={11} /> TRA KQ XET NGHIEM TAI GIUONG
        </h5>
        <Btn variant="ghost" onClick={load} style={{ marginLeft: 'auto', padding: '2px 8px' }}>
          <TermIcon name="refresh" size={11} />
        </Btn>
      </div>

      {loading && (
        <div style={{ padding: 'var(--space-20)', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', border: '1px dashed var(--line-soft)', borderRadius: 'var(--r-2)' }}>
          Chưa có phiếu XN nào trong lượt nhập viện này.
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--r-2)',
                border: '1px solid var(--line-soft)',
                background: 'var(--d-2)',
              }}
            >
              {/* Order header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--t-1)' }}>
                  <TermIcon name="file-text" size={11} /> {order.orderCode}
                </span>
                <Tag color={STATUS_COLOR[order.status] ?? 'default'} style={{ fontSize: 'var(--fs-xxs)' }}>
                  {order.statusName}
                </Tag>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                  {order.orderDoctorName || '—'} · {fmtDate(order.orderedAt)}
                </span>
                {order.approvedAt && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    · Duyệt: {fmtDate(order.approvedAt)}
                  </span>
                )}
              </div>

              {/* Test items summary */}
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-8)' }}>
                {order.tests.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      display: 'inline-block',
                      marginRight: 'var(--space-6)',
                      marginBottom: 'var(--space-4)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--line-soft)',
                      background: t.result ? 'var(--s-ok-bg)' : 'transparent',
                      color: t.result ? 'var(--t-1)' : 'var(--t-2)',
                    }}
                  >
                    {t.testName}
                    {t.result ? `: ${t.result}${t.unit ? ` ${t.unit}` : ''}` : ''}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                {canEnter(order) && (
                  <Btn variant="ghost" onClick={() => setEnterTarget(order)}>
                    <TermIcon name="edit" size={11} /> Nhap KQ
                  </Btn>
                )}
                {canPreliminaryApprove(order) && (
                  <Btn variant="ghost" onClick={() => openApprove(order, 'preliminary')}>
                    <TermIcon name="check" size={11} /> Duyet so bo
                  </Btn>
                )}
                {canFinalApprove(order) && (
                  <Btn variant="primary" onClick={() => openApprove(order, 'final')}>
                    <TermIcon name="check" size={11} /> Duyet chinh thuc
                  </Btn>
                )}
                <Btn
                  variant="ghost"
                  disabled={!canPrint(order) || printing === order.id}
                  onClick={() => canPrint(order) && handlePrint(order)}
                  style={{ opacity: canPrint(order) ? 1 : 0.4, cursor: canPrint(order) ? 'pointer' : 'not-allowed' }}
                >
                  <TermIcon name="printer" size={11} />
                  {printing === order.id ? ' Dang in...' : ' In KQ'}
                  {!canPrint(order) && <span style={{ fontSize: 'var(--fs-xxs)', marginLeft: 'var(--space-4)' }}>(can duyet)</span>}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <EnterResultModal
        open={!!enterTarget}
        order={enterTarget}
        onClose={() => setEnterTarget(null)}
        onDone={done}
      />
      <ApproveModal
        open={!!approveTarget}
        order={approveTarget}
        mode={approveMode}
        onClose={() => setApproveTarget(null)}
        onDone={done}
      />
    </div>
  );
};

export default BedLabResultSection;
