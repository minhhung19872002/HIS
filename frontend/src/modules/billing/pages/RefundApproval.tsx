import React, { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import { fmtVND } from '../../../utils/format';
import { searchRefunds, approveRefund, confirmRefund, cancelRefund } from '../api/billing';
import type { RefundDto } from '../api/billing';
import {
  SimpleV2Page, ActBtn, ModalShell, Btn, StatusBadge, tk, te, cf,
  type ColumnDef, type StatusTab,
} from '@/_v2kit';

/* ────────────────────────────────────────────────────────────
   #352 — Duyệt hoàn tiền (v1 pages/Billing.tsx:1344-1502).
   v2 CHƯA TỪNG có màn này: `approveRefund`/`confirmRefund`/`cancelRefund` nằm sẵn trong
   api/billing.ts nhưng KHÔNG trang v2 nào gọi (grep toàn repo = 0) → phiếu hoàn tiền tạo
   ra từ BillingEditor bị kẹt ở trạng thái chờ duyệt, không ai duyệt/chi được.
   BillingEditor chỉ xem theo TỪNG bệnh nhân; đây là danh sách liên-bệnh-nhân cho kế toán.

   Trạng thái (BillingCompleteService.Refunds.cs): 0-Chờ duyệt · 1-Đã duyệt · 2-Từ chối · 4-Đã chi.
   ──────────────────────────────────────────────────────────── */

type SKey = 'pending' | 'approved' | 'rejected' | 'done';

const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'pending',  l: 'Chờ duyệt', tone: 'warn' },
  { v: 'approved', l: 'Đã duyệt',  tone: 'info' },
  { v: 'done',     l: 'Đã chi',    tone: 'ok'   },
  { v: 'rejected', l: 'Từ chối',   tone: 'crit' },
];

const statusKey = (s: number): SKey =>
  s === 0 ? 'pending' : s === 1 ? 'approved' : s === 2 ? 'rejected' : 'done';

const REFUND_TYPE: Record<number, string> = { 1: 'Hoàn tạm ứng', 2: 'Hoàn thanh toán', 3: 'Hoàn BHYT' };

const RefundApprovalV2: React.FC = () => {
  const reloadRef = useRef<(() => void) | null>(null);
  const [rejectFor, setRejectFor] = useState<RefundDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmFor, setConfirmFor] = useState<RefundDto | null>(null);
  const [txnNo, setTxnNo] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => reloadRef.current?.();

  const doApprove = (r: RefundDto) =>
    cf(`Duyệt hoàn ${fmtVND(r.refundAmount)} cho ${r.patientName}?`, async () => {
      try {
        await approveRefund({ refundId: r.id, isApproved: true });
        tk('Đã duyệt phiếu hoàn tiền');
        reload();
      } catch { te('Lỗi duyệt hoàn tiền'); }
    }, { tone: 'warn', confirm: 'Duyệt' });

  const doReject = async () => {
    if (!rejectFor) return;
    if (!rejectReason.trim()) { te('Cần nhập lý do từ chối'); return; }
    setBusy(true);
    try {
      await approveRefund({ refundId: rejectFor.id, isApproved: false, rejectReason: rejectReason.trim() });
      tk('Đã từ chối phiếu hoàn tiền');
      setRejectFor(null); setRejectReason('');
      reload();
    } catch { te('Lỗi từ chối hoàn tiền'); }
    finally { setBusy(false); }
  };

  const doConfirm = async () => {
    if (!confirmFor) return;
    setBusy(true);
    try {
      await confirmRefund({ refundId: confirmFor.id, transactionNumber: txnNo.trim() || undefined, notes: confirmNote.trim() || undefined });
      tk('Đã xác nhận chi tiền hoàn');
      setConfirmFor(null); setTxnNo(''); setConfirmNote('');
      reload();
    } catch { te('Lỗi xác nhận chi tiền'); }
    finally { setBusy(false); }
  };

  const doCancel = (r: RefundDto) =>
    cf(`Hủy phiếu hoàn ${r.refundCode}?`, async () => {
      try {
        await cancelRefund(r.id, 'Hủy từ màn duyệt hoàn tiền');
        tk('Đã hủy phiếu hoàn tiền');
        reload();
      } catch { te('Lỗi hủy phiếu hoàn tiền'); }
    }, { tone: 'crit', confirm: 'Hủy phiếu' });

  const columns: ColumnDef<RefundDto>[] = [
    { key: 'code', label: 'Mã phiếu', mono: true, code: true, render: (r) => r.refundCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patientName}</div>
          <div style={{ fontSize: 11, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
        </div>
    )},
    { key: 'type', label: 'Loại', render: (r) => r.refundTypeName || REFUND_TYPE[r.refundType] || '—' },
    { key: 'amount', label: 'Số tiền', mono: true, render: (r) => (
        <span style={{ fontWeight: 700, color: 'var(--s-warn)' }}>{fmtVND(r.refundAmount)}</span>
    )},
    { key: 'reason', label: 'Lý do', render: (r) => (
        <span style={{ fontSize: 11.5, color: 'var(--t-2)' }}>{r.reason || '—'}</span>
    )},
    { key: 'cashier', label: 'Người lập', render: (r) => r.cashierName || '—' },
    { key: 'created', label: 'Ngày lập', mono: true, render: (r) => r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'TT', render: (r) => {
        const k = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === k)?.tone} dot>
          {r.statusName || STATUS_TABS.find((t) => t.v === k)?.l}
        </StatusBadge>;
    }},
  ];

  return (
    <>
      <SimpleV2Page<RefundDto>
        title="Duyệt hoàn tiền"
        load={async () => {
          // RefundSearchDto dùng `page` (1-based), không phải pageIndex
          const r = await searchRefunds({ page: 1, pageSize: 200 });
          return r.data?.items || [];
        }}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Tìm BN / mã phiếu hoàn…"
        searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.refundCode}`}
        statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
        statusOf={(r) => statusKey(r.status)}
        pageSize={18}
        kpis={(rows) => {
          const pending = rows.filter((r) => r.status === 0);
          const pendingAmt = pending.reduce((s, r) => s + r.refundAmount, 0);
          const doneAmt = rows.filter((r) => r.status === 4).reduce((s, r) => s + r.refundAmount, 0);
          return [
            { lbl: 'Chờ duyệt', val: pending.length, sub: 'phiếu', tone: 'warn' as const },
            { lbl: 'Tiền chờ duyệt', val: Math.round(pendingAmt / 1_000_000), unit: 'tr', sub: 'VND', tone: 'warn' as const },
            { lbl: 'Đã duyệt', val: rows.filter((r) => r.status === 1).length, sub: 'chờ chi', tone: 'info' as const },
            { lbl: 'Đã chi', val: rows.filter((r) => r.status === 4).length, sub: `${Math.round(doneAmt / 1_000_000)}tr`, tone: 'ok' as const },
            { lbl: 'Từ chối', val: rows.filter((r) => r.status === 2).length, sub: 'phiếu', tone: 'crit' as const },
          ];
        }}
        rowActions={(r, reloadFn) => {
          reloadRef.current = reloadFn;
          return (
            <div className="ab-actions">
              {r.status === 0 && <ActBtn ic="check" title="Duyệt hoàn tiền" onClick={() => doApprove(r)} />}
              {r.status === 0 && <ActBtn ic="x" title="Từ chối" tone="crit" onClick={() => { setRejectReason(''); setRejectFor(r); }} />}
              {r.status === 1 && <ActBtn ic="dollar" title="Xác nhận đã chi" onClick={() => { setTxnNo(''); setConfirmNote(''); setConfirmFor(r); }} />}
              {(r.status === 0 || r.status === 1) && <ActBtn ic="trash" title="Hủy phiếu" tone="crit" onClick={() => doCancel(r)} />}
            </div>
          );
        }}
      />

      <ModalShell open={!!rejectFor} onClose={() => setRejectFor(null)} size="sm"
        title={`Từ chối hoàn tiền ${rejectFor?.refundCode ?? ''}`}
        sub={rejectFor ? `${rejectFor.patientName} · ${fmtVND(rejectFor.refundAmount)}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setRejectFor(null)}>Hủy</Btn>
          <Btn variant="primary" loading={busy} onClick={doReject}>Xác nhận từ chối</Btn>
        </>}
      >
        <div style={{ fontSize: 12.5, marginBottom: 6, fontWeight: 600 }}>Lý do từ chối *</div>
        <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nêu rõ lý do để kế toán và bệnh nhân đối chiếu…" />
      </ModalShell>

      <ModalShell open={!!confirmFor} onClose={() => setConfirmFor(null)} size="sm"
        title={`Xác nhận đã chi tiền hoàn ${confirmFor?.refundCode ?? ''}`}
        sub={confirmFor ? `${confirmFor.patientName} · ${fmtVND(confirmFor.refundAmount)}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirmFor(null)}>Hủy</Btn>
          <Btn variant="primary" loading={busy} onClick={doConfirm}>Xác nhận đã chi</Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12.5 }}>Mã giao dịch / số phiếu chi
            <Input value={txnNo} onChange={(e) => setTxnNo(e.target.value)} style={{ marginTop: 4 }}
              placeholder="Để trống nếu chi tiền mặt" />
          </label>
          <label style={{ fontSize: 12.5 }}>Ghi chú
            <Input.TextArea rows={2} value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} style={{ marginTop: 4 }} />
          </label>
        </div>
      </ModalShell>
    </>
  );
};

export default RefundApprovalV2;
