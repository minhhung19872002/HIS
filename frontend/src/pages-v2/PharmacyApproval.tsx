import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Checkbox, DatePicker, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  searchApprovals, approveApproval, revokeApproval, submitApproval,
  getApprovalById, getExpiringMedicines, deleteApprovalDraft,
  APPROVAL_TYPE_LABELS, STATUS_LABELS,
  type PharmacyApprovalDto, type PharmacyApprovalItemDto,
  type PharmacyApprovalSearchRequest, type ExpiringMedicineDto,
} from '../api/pharmacyApproval';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, tw, cf, Ico,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

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

const PharmacyApprovalV2: React.FC = () => {
  const [stab, setStab] = useState<SKey | 'all'>('pending');
  const [items, setItems] = useState<PharmacyApprovalDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<PharmacyApprovalDto | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [approveForm] = Form.useForm<{ items: { itemId: string; approvedQuantity: number; isExcluded: boolean }[]; note?: string }>();
  const [revokeForm] = Form.useForm<{ reason: string }>();
  const [expiring, setExpiring] = useState<ExpiringMedicineDto[]>([]);
  const [showExpiring, setShowExpiring] = useState(false);

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
  useEffect(() => { getExpiringMedicines(60).then(setExpiring).catch(() => {}); }, []);

  const expiredCount = useMemo(() => expiring.filter((e) => e.severity === 'expired').length, [expiring]);
  const criticalCount = useMemo(() => expiring.filter((e) => e.severity === 'critical').length, [expiring]);
  const warningCount = useMemo(() => expiring.filter((e) => e.severity === 'warning').length, [expiring]);

  const counts = useMemo(() => ({ all: total }) as Record<string, number>, [total]);

  const typeOpts = Object.entries(APPROVAL_TYPE_LABELS).map(([k, v]) => ({ v: k, l: v as string }));

  const cols: ColumnDef<PharmacyApprovalDto>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.approvalCode },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{APPROVAL_TYPE_LABELS[r.approvalType] || r.approvalTypeName}</StatusBadge>
    ) },
    { key: 'dept', label: 'Khoa/Phòng', render: (r) => r.fromDepartmentName || '—' },
    { key: 'wh', label: 'Kho nhận', render: (r) => r.toWarehouseName || '—' },
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

  const handleSubmit = (id: string) => cf('Gửi phiếu xuống kho?', async () => {
    try { await submitApproval(id); tk('Đã gửi'); refresh(); } catch { tw('Gửi thất bại'); }
  });

  const handleDelete = (id: string) => cf('Xóa phiếu nháp?', async () => {
    try { await deleteApprovalDraft(id); tk('Đã xóa'); refresh(); } catch { tw('Xóa thất bại'); }
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
      tk('Đã duyệt phiếu'); setApproveOpen(false); refresh();
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
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: total, sub: 'kỳ này' },
        { lbl: 'Chờ duyệt', val: items.filter((i) => i.status === 2).length, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Sắp/đã hết hạn', val: expiredCount + criticalCount, sub: `${expiredCount} hết hạn · ${criticalCount} ≤7 ngày`, tone: expiredCount > 0 ? 'crit' : 'warn' },
        { lbl: 'Cảnh báo HSD', val: warningCount, sub: '≤30 ngày', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã phiếu / ghi chú / BN…" />
        <Filter value={fType} onChange={(v) => { setFType(v); setPage(0); }} options={typeOpts} placeholder="▾ Loại phiếu" />
        <RangePicker value={range as [Dayjs, Dayjs] | null} onChange={(v) => { setRange(v as [Dayjs, Dayjs] | null); setPage(0); }} />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setRange(null); setStab('all'); setPage(0); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={refresh}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        {expiring.length > 0 && (
          <button className="ab-btn ghost" type="button" onClick={() => setShowExpiring(true)}>
            <Ico name="alert" size={12} /> Cảnh báo HSD ({expiring.length})
          </button>
        )}
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<PharmacyApprovalDto>
        columns={cols} data={items} rowKey={(r) => r.id}
        onRowClick={async (r) => setDetail(await getApprovalById(r.id))}
        actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiếu phê duyệt'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={total} perPage={20} />

      <DrawerShell
        open={!!detail && !approveOpen && !revokeOpen}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail ? `Phiếu ${detail.approvalCode}` : ''}
        sub={detail ? `${detail.approvalTypeName} · ${STATUS_LABELS[detail.status]}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          {detail && detail.status === 2 && (
            <button type="button" className="ab-btn primary" onClick={() => openApprove(detail.id)}>
              <Ico name="check" size={12} /> Duyệt
            </button>
          )}
          {detail && detail.status === 3 && (
            <button type="button" className="ab-btn" onClick={() => openRevoke(detail)}>
              <Ico name="refresh" size={12} /> Thu hồi
            </button>
          )}
        </>}
      >
        {detail && <>
          <DrSec title="Thông tin phiếu">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.approvalCode}</span></DrField>
            <DrField lbl="Loại"><StatusBadge tone="info">{detail.approvalTypeName}</StatusBadge></DrField>
            <DrField lbl="Khoa">{detail.fromDepartmentName || '—'}</DrField>
            <DrField lbl="Kho nhận">{detail.toWarehouseName || '—'}</DrField>
            {detail.patientName && <DrField lbl="BN">{detail.patientCode} · {detail.patientName}</DrField>}
            {detail.lockedObject && <DrField lbl="Đối tượng khóa">{detail.lockedObject}</DrField>}
            {detail.note && <DrField lbl="Ghi chú">{detail.note}</DrField>}
            {detail.revokeReason && <DrField lbl="Lý do thu hồi">
              <span style={{ color: 'var(--a-rd-text)' }}>{detail.revokeReason}</span>
            </DrField>}
          </DrSec>
          <DrSec title={`Mặt hàng (${detail.items.length})`}>
            <table className="ab-tbl">
              <thead>
                <tr><th>Thuốc/VTYT</th><th>Lô</th><th>YC</th><th>Duyệt</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.medicineName || it.supplyName}</td>
                    <td className="mono">{it.batchNumber || '—'}</td>
                    <td className="mono">{it.requestedQuantity}</td>
                    <td className="mono">{it.isExcluded ? <StatusBadge tone="crit">Bỏ</StatusBadge> : it.approvedQuantity}</td>
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

      <ModalShell
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        size="lg"
        title="Duyệt phiếu cấp phát"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setApproveOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={handleApprove}>
            <Ico name="check" size={12} /> Duyệt
          </button>
        </>}
      >
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
                        <td className="mono">{it?.expiryDate ? dayjs(it.expiryDate).format('DD/MM/YYYY') : '—'}</td>
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

      <ModalShell
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        size="md"
        title="Thu hồi phiếu đã duyệt"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setRevokeOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={handleRevoke} style={{ color: 'var(--a-rd-text)' }}>
            <Ico name="refresh" size={12} /> Thu hồi
          </button>
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

      <Modal
        title="Thuốc sắp/đã hết hạn"
        open={showExpiring}
        onCancel={() => setShowExpiring(false)}
        footer={null}
        width={720}
      >
        <table className="ab-tbl">
          <thead>
            <tr><th>Mã</th><th>Tên thuốc</th><th>Lô</th><th>HSD</th><th>Còn lại</th><th>SL tồn</th><th>Kho</th></tr>
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
                    if (d <= 7) return <StatusBadge tone="crit" dot>{d}d</StatusBadge>;
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
