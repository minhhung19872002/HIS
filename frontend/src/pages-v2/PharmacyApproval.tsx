/**
 * PharmacyApproval — Phê duyệt cấp phát + Dự trù nội bộ (v2 ab-* design).
 *
 * Tabs chính:
 *   - Status tabs: Đang nhập / Chờ duyệt / Đã duyệt / Đã thu hồi
 *   - Filter "Loại phiếu": 1=Dự trù, 2=Nội trú, 3=Tủ trực, 4=Hao phí, 5=Hoàn trả
 *
 * Dự trù (ApprovalType=1) flow:
 *   1. Khoa/kho con lập phiếu: chọn kho nguồn (FromWarehouse) + kho nhận (ToWarehouse)
 *      + thêm mặt hàng (search thuốc + SL yêu cầu) → Tạo nháp → Gửi
 *   2. Kho chính duyệt → BE tự sinh phiếu xuất chuyển kho (ExportType=4)
 *      → linkedExportReceiptId lưu vào record → FE hiển thị nút "In phiếu xuất"
 *
 * Endpoints:
 *   createApproval / updateApproval / submitApproval / approveApproval / revokeApproval
 *   In phiếu xuất: GET /api/warehouse/issues/{linkedExportReceiptId}/print (blob)
 *
 * Cảnh báo HSD: getExpiringMedicines(60) → ExpiringMedicineDto[]
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoComplete, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  createApproval, searchApprovals, approveApproval, revokeApproval,
  submitApproval, getApprovalById, getExpiringMedicines, deleteApprovalDraft,
  APPROVAL_TYPE_LABELS, STATUS_LABELS,
  type PharmacyApprovalDto,
  type PharmacyApprovalItemDto,
  type CreatePharmacyApprovalRequest,
  type PharmacyApprovalSearchRequest,
  type ExpiringMedicineDto,
} from '../api/pharmacyApproval';
import { searchMedicines, type MedicineDto } from '../api/examination';
import * as wh from '../api/warehouse';
import type { WarehouseDto } from '../api/warehouse';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge,
  ActBtn, Btn, DrawerShell, ModalShell, DrSec, DrField,
  tk, ti, tw, cf, Ico,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;
const { Option } = Select;

// ─── Status helpers ────────────────────────────────────────────────────────────

type SKey = 'draft' | 'pending' | 'approved' | 'revoked';
const STATUS_TABS = [
  { v: 'draft' as SKey,    l: 'Đang nhập',  tone: 'warn' as const },
  { v: 'pending' as SKey,  l: 'Chờ duyệt',  tone: 'info' as const },
  { v: 'approved' as SKey, l: 'Đã duyệt',   tone: 'ok' as const },
  { v: 'revoked' as SKey,  l: 'Đã thu hồi', tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 2 ? 'pending' : n === 3 ? 'approved' : n === 4 ? 'revoked' : 'draft';

const sStatusFromTab = (s: SKey): number =>
  s === 'pending' ? 2 : s === 'approved' ? 3 : s === 'revoked' ? 4 : 0;

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

// ─── Requisition item (local state in create modal) ────────────────────────────

interface ReqItem {
  key: number;
  medicine?: MedicineDto;
  medicineId?: string;
  medicineName: string;
  unit: string;
  requestedQuantity: number;
  unitPrice: number;
}

let itemKey = 0;
const newReqItem = (): ReqItem => ({
  key: ++itemKey,
  medicineName: '',
  unit: '',
  requestedQuantity: 1,
  unitPrice: 0,
});

// ─── Main component ────────────────────────────────────────────────────────────

const PharmacyApprovalV2: React.FC = () => {
  // List state
  const [stab, setStab] = useState<SKey | 'all'>('pending');
  const [items, setItems] = useState<PharmacyApprovalDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(0);

  // Detail drawer
  const [detail, setDetail] = useState<PharmacyApprovalDto | null>(null);

  // Approve modal
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveForm] = Form.useForm<{
    items: { itemId: string; approvedQuantity: number; isExcluded: boolean }[];
    note?: string;
  }>();

  // Revoke modal
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeForm] = Form.useForm<{ reason: string }>();

  // Create requisition modal (ApprovalType=1)
  const [createOpen, setCreateOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [reqFromWh, setReqFromWh] = useState<string>('');
  const [reqToWh, setReqToWh] = useState<string>('');
  const [reqNote, setReqNote] = useState('');
  const [reqItems, setReqItems] = useState<ReqItem[]>([newReqItem()]);
  const [medSuggestions, setMedSuggestions] = useState<Record<number, MedicineDto[]>>({});
  const [creating, setCreating] = useState(false);

  // Expiring medicines warning
  const [expiring, setExpiring] = useState<ExpiringMedicineDto[]>([]);
  const [showExpiring, setShowExpiring] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const req: PharmacyApprovalSearchRequest = {
        status: stab !== 'all' ? sStatusFromTab(stab) : undefined,
        approvalType: fType ? Number(fType) : undefined,
        keyword: search || undefined,
        fromDate: range?.[0]?.toISOString(),
        toDate: range?.[1]?.toISOString(),
        pageIndex: page + 1,
        pageSize: 20,
      };
      const res = await searchApprovals(req);
      setItems(res.items);
      setTotal(res.totalCount);
    } catch { ti('Không tải được danh sách'); }
    finally { setLoading(false); }
  }, [stab, fType, search, range, page]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    getExpiringMedicines(60).then(setExpiring).catch(() => {});
    // Load warehouses for create form
    wh.getWarehouses().then((r) => setWarehouses((r.data as WarehouseDto[]) || [])).catch(() => {});
  }, []);

  const expiredCount = useMemo(() => expiring.filter((e) => e.severity === 'expired').length, [expiring]);
  const criticalCount = useMemo(() => expiring.filter((e) => e.severity === 'critical').length, [expiring]);
  const warningCount  = useMemo(() => expiring.filter((e) => e.severity === 'warning').length, [expiring]);
  const counts = useMemo(() => ({ all: total }) as Record<string, number>, [total]);
  const typeOpts = Object.entries(APPROVAL_TYPE_LABELS).map(([k, v]) => ({ v: k, l: v as string }));

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleSubmit = (id: string) => cf('Gửi phiếu xuống kho?', async () => {
    try { await submitApproval(id); tk('Đã gửi'); refresh(); } catch { tw('Gửi thất bại'); }
  });

  const handleDelete = (id: string) => cf('Xóa phiếu nháp?', async () => {
    try { await deleteApprovalDraft(id); tk('Đã xóa'); refresh(); }
    catch { tw('Xóa thất bại'); }
  }, { tone: 'crit', confirm: 'Xóa' });

  const openApprove = async (id: string) => {
    const data = await getApprovalById(id);
    setDetail(data);
    approveForm.setFieldsValue({
      items: data.items.map((i) => ({ itemId: i.id, approvedQuantity: i.requestedQuantity, isExcluded: false })),
    });
    setApproveOpen(true);
  };

  const openRevoke = (row: PharmacyApprovalDto) => {
    setDetail(row); revokeForm.resetFields(); setRevokeOpen(true);
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      const v = await approveForm.validateFields();
      await approveApproval(detail.id, v.items, v.note);
      tk('Đã duyệt phiếu'); setApproveOpen(false);
      // Refresh and re-open drawer to show linked export receipt
      const updated = await getApprovalById(detail.id);
      setDetail(updated);
      refresh();
    } catch { tw('Duyệt thất bại'); }
  };

  const handleRevoke = async () => {
    if (!detail) return;
    try {
      const v = await revokeForm.validateFields();
      await revokeApproval(detail.id, v.reason);
      tk('Đã thu hồi'); setRevokeOpen(false); refresh();
    } catch { tw('Thu hồi thất bại'); }
  };

  // Print transfer issue: opens export receipt PDF in new tab
  const printTransferIssue = (exportReceiptId: string) => {
    window.open(`/api/warehouse/issues/${exportReceiptId}/print`, '_blank');
  };

  // ── Create requisition (ApprovalType=1) ──────────────────────────────────────

  const openCreate = () => {
    setReqFromWh('');
    setReqToWh('');
    setReqNote('');
    setReqItems([newReqItem()]);
    setMedSuggestions({});
    setCreateOpen(true);
  };

  const searchMeds = async (itemKey: number, kw: string) => {
    if (!kw || kw.length < 2) return;
    try {
      const res = await searchMedicines(kw, undefined, 20);
      const meds = (res.data as MedicineDto[]) || [];
      setMedSuggestions((prev) => ({ ...prev, [itemKey]: meds }));
    } catch { /* silent */ }
  };

  const selectMed = (itemKey: number, med: MedicineDto) => {
    setReqItems((prev) =>
      prev.map((it) =>
        it.key === itemKey
          ? { ...it, medicine: med, medicineId: med.id, medicineName: med.name ?? '', unit: med.unit ?? '', unitPrice: med.unitPrice ?? 0 }
          : it,
      ),
    );
  };

  const updateItem = (key: number, patch: Partial<ReqItem>) =>
    setReqItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const removeItem = (key: number) =>
    setReqItems((prev) => prev.filter((it) => it.key !== key));

  const addItem = () => setReqItems((prev) => [...prev, newReqItem()]);

  const handleCreate = async () => {
    if (!reqFromWh) { tw('Chọn kho xuất (kho nguồn)'); return; }
    if (!reqToWh)   { tw('Chọn kho nhận'); return; }
    if (reqFromWh === reqToWh) { tw('Kho xuất và kho nhận phải khác nhau'); return; }
    const validItems = reqItems.filter((it) => it.medicineId && it.requestedQuantity > 0);
    if (validItems.length === 0) { tw('Thêm ít nhất 1 mặt hàng hợp lệ'); return; }

    const req: CreatePharmacyApprovalRequest = {
      approvalType: 1, // Dự trù nội bộ
      fromWarehouseId: reqFromWh,
      toWarehouseId: reqToWh,
      note: reqNote || undefined,
      items: validItems.map((it) => ({
        medicineId: it.medicineId,
        requestedQuantity: it.requestedQuantity,
        unit: it.unit || undefined,
        unitPrice: it.unitPrice,
      })),
    };

    setCreating(true);
    try {
      await createApproval(req);
      tk('Đã tạo phiếu dự trù — nhớ "Gửi" để kho duyệt');
      setCreateOpen(false);
      setStab('draft');
      setFType('1');
      refresh();
    } catch { tw('Tạo phiếu thất bại'); }
    finally { setCreating(false); }
  };

  // ── Columns ───────────────────────────────────────────────────────────────────

  const cols: ColumnDef<PharmacyApprovalDto>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.approvalCode },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone={r.approvalType === 1 ? 'warn' : 'info'}>
        {APPROVAL_TYPE_LABELS[r.approvalType] || r.approvalTypeName}
      </StatusBadge>
    ) },
    { key: 'from', label: 'Kho/Khoa nguồn', render: (r) =>
      r.fromWarehouseName || r.fromDepartmentName || '—'
    },
    { key: 'to', label: 'Kho nhận', render: (r) => r.toWarehouseName || '—' },
    { key: 'pt', label: 'BN', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 500 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'amt', label: 'Tổng tiền', mono: true, render: (r) => fmt(r.totalAmount) },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM HH:mm') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABELS[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: PharmacyApprovalDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={async () => setDetail(await getApprovalById(r.id))} />
      {(r.status === 0 || r.status === 1) && (
        <>
          <ActBtn ic="send" title="Gửi xuống kho" onClick={() => handleSubmit(r.id)} />
          <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => handleDelete(r.id)} />
        </>
      )}
      {r.status === 2 && <ActBtn ic="check" title="Duyệt" onClick={() => openApprove(r.id)} />}
      {r.status === 3 && <ActBtn ic="refresh" title="Thu hồi" tone="warn" onClick={() => openRevoke(r)} />}
      {r.status === 3 && r.linkedExportReceiptId && (
        <ActBtn ic="print" title="In phiếu xuất" onClick={() => printTransferIssue(r.linkedExportReceiptId!)} />
      )}
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(total / 20));

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: total, sub: 'kỳ này' },
        { lbl: 'Chờ duyệt', val: items.filter((i) => i.status === 2).length, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Sắp/đã hết hạn', val: expiredCount + criticalCount,
          sub: `${expiredCount} hết hạn · ${criticalCount} ≤7 ngày`,
          tone: expiredCount > 0 ? 'crit' : 'warn' },
        { lbl: 'Cảnh báo HSD', val: warningCount, sub: '≤30 ngày', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã phiếu / ghi chú / BN…" />
        <Filter value={fType} onChange={(v) => { setFType(v); setPage(0); }}
          options={typeOpts} placeholder="▾ Loại phiếu" />
        <RangePicker value={range as [Dayjs, Dayjs] | null}
          onChange={(v) => { setRange(v as [Dayjs, Dayjs] | null); setPage(0); }} />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setRange(null); setStab('all'); setPage(0); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={refresh}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        {expiring.length > 0 && (
          <Btn variant="ghost" onClick={() => setShowExpiring(true)}>
            <Ico name="alert" size={12} /> Cảnh báo HSD ({expiring.length})
          </Btn>
        )}
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Lập phiếu dự trù
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS} counts={counts} />

      <DataTable<PharmacyApprovalDto>
        columns={cols} data={items} rowKey={(r) => r.id}
        onRowClick={async (r) => setDetail(await getApprovalById(r.id))}
        actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiếu phê duyệt'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={total} perPage={20} />

      {/* ── Detail drawer ────────────────────────────────────────────────────── */}
      <DrawerShell
        open={!!detail && !approveOpen && !revokeOpen}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail ? `Phiếu ${detail.approvalCode}` : ''}
        sub={detail ? `${detail.approvalTypeName} · ${STATUS_LABELS[detail.status]}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
          {detail?.status === 2 && (
            <Btn variant="primary" onClick={() => openApprove(detail.id)}>
              <Ico name="check" size={12} /> Duyệt
            </Btn>
          )}
          {detail?.status === 3 && (
            <Btn onClick={() => openRevoke(detail)}>
              <Ico name="refresh" size={12} /> Thu hồi
            </Btn>
          )}
          {detail?.status === 3 && detail.linkedExportReceiptId && (
            <Btn variant="primary" onClick={() => printTransferIssue(detail.linkedExportReceiptId!)}>
              <Ico name="print" size={12} /> In phiếu xuất chuyển kho
            </Btn>
          )}
        </>}
      >
        {detail && <>
          <DrSec title="Thông tin phiếu">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.approvalCode}</span></DrField>
            <DrField lbl="Loại"><StatusBadge tone={detail.approvalType === 1 ? 'warn' : 'info'}>{detail.approvalTypeName}</StatusBadge></DrField>
            <DrField lbl="Kho/Khoa nguồn">{detail.fromWarehouseName || detail.fromDepartmentName || '—'}</DrField>
            <DrField lbl="Kho nhận">{detail.toWarehouseName || '—'}</DrField>
            {detail.patientName && <DrField lbl="BN">{detail.patientCode} · {detail.patientName}</DrField>}
            {detail.lockedObject && <DrField lbl="Đối tượng khóa">{detail.lockedObject}</DrField>}
            {detail.note && <DrField lbl="Ghi chú">{detail.note}</DrField>}
            {detail.revokeReason && (
              <DrField lbl="Lý do thu hồi">
                <span style={{ color: 'var(--a-rd-text)' }}>{detail.revokeReason}</span>
              </DrField>
            )}
            {detail.linkedExportReceiptId && (
              <DrField lbl="Phiếu xuất chuyển kho">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>
                  {detail.linkedExportReceiptId}
                </span>
              </DrField>
            )}
          </DrSec>
          <DrSec title={`Mặt hàng (${detail.items.length})`}>
            <table className="ab-tbl">
              <thead>
                <tr>
                  <th>Thuốc/VTYT</th><th>Lô</th><th>YC</th><th>Duyệt</th>
                  <th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it: PharmacyApprovalItemDto) => (
                  <tr key={it.id}>
                    <td>{it.medicineName || it.supplyName}</td>
                    <td className="mono">{it.batchNumber || '—'}</td>
                    <td className="mono">{it.requestedQuantity}</td>
                    <td className="mono">
                      {it.isExcluded ? <StatusBadge tone="crit">Bỏ</StatusBadge> : it.approvedQuantity}
                    </td>
                    <td>{it.unit}</td>
                    <td className="mono">{fmt(it.unitPrice)}</td>
                    <td className="mono">{fmt(it.amount)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 600, background: 'var(--d-1)' }}>
                  <td colSpan={6} style={{ textAlign: 'right' }}>Tổng:</td>
                  <td className="mono">{fmt(detail.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </DrSec>
        </>}
      </DrawerShell>

      {/* ── Approve modal ────────────────────────────────────────────────────── */}
      <ModalShell
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        size="lg"
        title="Duyệt phiếu cấp phát"
        footer={<>
          <Btn variant="ghost" onClick={() => setApproveOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={handleApprove}>
            <Ico name="check" size={12} /> Duyệt
          </Btn>
        </>}
      >
        {detail?.approvalType === 1 && (
          <div style={{ fontSize: 12, color: 'var(--a-gn-text)', marginBottom: 12 }}>
            Duyệt cấp theo dự trù — hệ thống sẽ tự sinh phiếu xuất chuyển kho sau khi duyệt.
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--a-cy-text)', marginBottom: 12 }}>
          Có thể chỉnh số lượng duyệt hoặc tick "Bỏ" để loại khỏi phiếu
        </div>
        <Form form={approveForm} layout="vertical">
          <Form.List name="items">
            {(fields) => (
              <table className="ab-tbl">
                <thead>
                  <tr><th>Thuốc/VTYT</th><th>YC</th><th>Lô</th><th>HSD</th><th>Duyệt</th><th>Bỏ</th></tr>
                </thead>
                <tbody>
                  {fields.map((f) => {
                    const itemId = approveForm.getFieldValue(['items', f.name, 'itemId']);
                    const it = detail?.items.find((x) => x.id === itemId);
                    return (
                      <tr key={f.key}>
                        <td>{it?.medicineName || it?.supplyName}</td>
                        <td className="mono">{it?.requestedQuantity}</td>
                        <td className="mono">{it?.batchNumber || '—'}</td>
                        <td className="mono">
                          {it?.expiryDate ? dayjs(it.expiryDate).format('DD/MM/YYYY') : '—'}
                        </td>
                        <td>
                          <Form.Item noStyle name={[f.name, 'approvedQuantity']}>
                            <InputNumber min={0} size="small" />
                          </Form.Item>
                        </td>
                        <td>
                          <Form.Item noStyle name={[f.name, 'isExcluded']} valuePropName="checked">
                            <Checkbox />
                          </Form.Item>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Form.List>
          <Form.Item name="note" label="Ghi chú" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ── Revoke modal ─────────────────────────────────────────────────────── */}
      <ModalShell
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        size="md"
        title="Thu hồi phiếu đã duyệt"
        footer={<>
          <Btn variant="ghost" onClick={() => setRevokeOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={handleRevoke} style={{ color: 'var(--a-rd-text)' }}>
            <Ico name="refresh" size={12} /> Thu hồi
          </Btn>
        </>}
      >
        <div style={{ fontSize: 12, color: 'var(--a-or-text)', marginBottom: 12 }}>
          Thu hồi sẽ hoàn lại số lượng đã trừ vào kho.
        </div>
        <Form form={revokeForm} layout="vertical">
          <Form.Item name="reason" label="Lý do thu hồi" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ── Create requisition modal ──────────────────────────────────────────── */}
      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="xl"
        title="Lập phiếu dự trù nội bộ"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={handleCreate} disabled={creating}>
            <Ico name="plus" size={12} /> {creating ? 'Đang tạo…' : 'Tạo phiếu nháp'}
          </Btn>
        </>}
      >
        <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 12 }}>
          Sau khi tạo nháp, nhấn "Gửi xuống kho" để kho chính xem xét duyệt.
          Khi duyệt, hệ thống tự sinh phiếu xuất chuyển kho.
        </div>

        {/* Kho nguồn / kho nhận */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Kho xuất (nguồn) *</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn kho xuất…"
              value={reqFromWh || undefined}
              onChange={(v) => setReqFromWh(v)}
              showSearch
              optionFilterProp="children"
            >
              {warehouses.map((w) => (
                <Option key={w.id} value={w.id}>{w.warehouseName}</Option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Kho nhận (đích) *</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn kho nhận…"
              value={reqToWh || undefined}
              onChange={(v) => setReqToWh(v)}
              showSearch
              optionFilterProp="children"
            >
              {warehouses
                .filter((w) => w.id !== reqFromWh)
                .map((w) => (
                  <Option key={w.id} value={w.id}>{w.warehouseName}</Option>
                ))}
            </Select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ghi chú</div>
          <Input.TextArea
            rows={2}
            placeholder="Lý do dự trù, ghi chú…"
            value={reqNote}
            onChange={(e) => setReqNote(e.target.value)}
          />
        </div>

        {/* Item table */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Danh sách mặt hàng dự trù *
        </div>
        <table className="ab-tbl" style={{ marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Thuốc/VTYT</th>
              <th style={{ width: 70 }}>ĐVT</th>
              <th style={{ width: 100 }}>SL yêu cầu</th>
              <th style={{ width: 110 }}>Đơn giá (ước)</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {reqItems.map((it) => (
              <tr key={it.key}>
                <td>
                  <AutoComplete
                    style={{ width: '100%' }}
                    value={it.medicineName}
                    options={(medSuggestions[it.key] || []).map((m) => ({
                      value: m.name ?? '',
                      label: `${m.code} — ${m.name} (${m.unit ?? ''})`,
                      med: m,
                    }))}
                    onSearch={(kw) => {
                      updateItem(it.key, { medicineName: kw, medicineId: undefined });
                      searchMeds(it.key, kw);
                    }}
                    onSelect={(_, opt: { med?: MedicineDto }) => {
                      if (opt.med) selectMed(it.key, opt.med);
                    }}
                    placeholder="Tìm tên/mã thuốc…"
                    size="small"
                  />
                </td>
                <td>
                  <Input
                    size="small"
                    value={it.unit}
                    onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                    placeholder="ĐVT"
                  />
                </td>
                <td>
                  <InputNumber
                    size="small"
                    min={1}
                    value={it.requestedQuantity}
                    onChange={(v) => updateItem(it.key, { requestedQuantity: v ?? 1 })}
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <InputNumber
                    size="small"
                    min={0}
                    value={it.unitPrice}
                    onChange={(v) => updateItem(it.key, { unitPrice: v ?? 0 })}
                    style={{ width: '100%' }}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </td>
                <td>
                  <Btn variant="ghost" onClick={() => removeItem(it.key)}
                    style={{ padding: '2px 6px', color: 'var(--a-rd-text)' }}>
                    <Ico name="trash" size={12} />
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Btn variant="ghost" onClick={addItem} style={{ fontSize: 12 }}>
          <Ico name="plus" size={12} /> Thêm dòng
        </Btn>
      </ModalShell>

      {/* ── Expiring medicines modal ──────────────────────────────────────────── */}
      <Modal
        title="Thuốc sắp/đã hết hạn"
        open={showExpiring}
        onCancel={() => setShowExpiring(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <table className="ab-tbl">
          <thead>
            <tr>
              <th>Mã</th><th>Tên thuốc</th><th>Lô</th><th>HSD</th>
              <th>Còn lại</th><th>SL tồn</th><th>Kho</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((e) => (
              <tr key={e.inventoryItemId}>
                <td className="mono">{e.medicineCode}</td>
                <td>{e.medicineName}</td>
                <td className="mono">{e.batchNumber}</td>
                <td className="mono">{e.expiryDate ? dayjs(e.expiryDate).format('DD/MM/YYYY') : '—'}</td>
                <td>
                  {(() => {
                    const d = e.daysUntilExpiry ?? 0;
                    if (e.severity === 'expired') return <StatusBadge tone="crit" dot>Đã hết hạn</StatusBadge>;
                    if (d <= 7)  return <StatusBadge tone="crit" dot>{d}d</StatusBadge>;
                    if (d <= 30) return <StatusBadge tone="warn" dot>{d}d</StatusBadge>;
                    return <span>{d}d</span>;
                  })()}
                </td>
                <td className="mono">{e.quantity}</td>
                <td>{e.warehouseName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
};

export default PharmacyApprovalV2;
