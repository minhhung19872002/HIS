// =====================================================================
// HIS Terminal · ĐỀ XUẤT – DỰ TRÙ – MUA SẮM — v2  (#108)
// Route: /v2/procurement
// Entity: AssetProcurementRequest (khác ProcurementRequest của warehouse)
// Trạng thái: DuThao(0) | ChoXetDuyet(1) | DaDuyet(2) | TuChoi(3) | HoanTat(4)
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, InputNumber, Select, Modal } from 'antd';
import {
  getAssetProcurementList,
  saveAssetProcurementRequest,
  deleteAssetProcurementRequest,
  submitAssetProcurementRequest,
  approveAssetProcurementRequest,
  rejectAssetProcurementRequest,
  completeAssetProcurementRequest,
  type AssetProcurementRequestDto,
  type SaveAssetProcurementRequestDto,
  type SaveAssetProcurementItemDto,
} from '../api/procurement';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  ActBtn, Btn, DrawerShell, DrSec, DrField, StatusBadge,
  tk, te, cf,
  type ColumnDef, type StatusTab, type TopTab,
} from './_v2kit';

// ── Constants ─────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'de-xuat' | 'du-tru' | 'mua-sam';
const TABS: TopTab<TabKey>[] = [
  { v: 'all',     l: 'Tất cả',     ic: 'list' },
  { v: 'de-xuat', l: 'Đề xuất',   ic: 'file-text' },
  { v: 'du-tru',  l: 'Dự trù',    ic: 'clipboard' },
  { v: 'mua-sam', l: 'Mua sắm',   ic: 'shopping-cart' },
];

type SKey = 'draft' | 'pending' | 'approved' | 'rejected' | 'done';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'draft',    l: 'Dự thảo',    tone: 'info' },
  { v: 'pending',  l: 'Chờ duyệt',  tone: 'warn' },
  { v: 'approved', l: 'Đã duyệt',   tone: 'ok' },
  { v: 'rejected', l: 'Từ chối',    tone: 'crit' },
  { v: 'done',     l: 'Hoàn tất',   tone: 'info' },
];

const STATUS_TONE: Record<SKey, 'ok' | 'warn' | 'crit' | 'info'> = {
  draft: 'info', pending: 'warn', approved: 'ok', rejected: 'crit', done: 'info',
};

const statusKey = (r: AssetProcurementRequestDto): SKey => {
  if (r.status === 1) return 'pending';
  if (r.status === 2) return 'approved';
  if (r.status === 3) return 'rejected';
  if (r.status === 4) return 'done';
  return 'draft';
};

const TYPE_OPTS = [
  { value: 1, label: 'Đề xuất' },
  { value: 2, label: 'Dự trù' },
  { value: 3, label: 'Mua sắm' },
];

const fmtMoney = (v?: number | null) =>
  v != null ? v.toLocaleString('vi-VN') + ' đ' : '—';
const fmtDate = (iso?: string | null) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');

const PER = 25;

// ── Empty form helpers ────────────────────────────────────────────────────────

const emptyItem = (): SaveAssetProcurementItemDto => ({
  itemName: '', quantity: 1, unit: '', unitPrice: undefined, specification: '',
});

const emptyForm = (): SaveAssetProcurementRequestDto => ({
  title: '', requestType: 1, departmentName: '', requesterName: '', reason: '', note: '', items: [emptyItem()],
});

// ── Component ─────────────────────────────────────────────────────────────────

const ProcurementRequestsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('all');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [rows, setRows] = useState<AssetProcurementRequestDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [detail, setDetail] = useState<AssetProcurementRequestDto | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<SaveAssetProcurementRequestDto>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<AssetProcurementRequestDto | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAssetProcurementList({
        pageIndex: 0, pageSize: 200,
        fromDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
      });
      setRows(result.data.items ?? []);
    } catch {
      te('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { setPage(0); }, [tab, stab, search]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return rows.filter((r) => {
      if (tab === 'de-xuat' && r.requestType !== 1) return false;
      if (tab === 'du-tru'  && r.requestType !== 2) return false;
      if (tab === 'mua-sam' && r.requestType !== 3) return false;
      if (stab !== 'all' && statusKey(r) !== stab) return false;
      if (kw && !`${r.requestNo} ${r.title} ${r.requesterName ?? ''} ${r.departmentName ?? ''}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, tab, stab, search]);

  const paged = filtered.slice(page * PER, (page + 1) * PER);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));

  // ── KPI ──────────────────────────────────────────────────────────────────

  const kpis = [
    { lbl: 'Tổng phiếu',  val: rows.length },
    { lbl: 'Dự thảo',     val: rows.filter(r => r.status === 0).length, tone: 'info'  as const },
    { lbl: 'Chờ duyệt',   val: rows.filter(r => r.status === 1).length, tone: 'warn'  as const },
    { lbl: 'Đã duyệt',    val: rows.filter(r => r.status === 2).length, tone: 'ok'    as const },
    { lbl: 'Từ chối',     val: rows.filter(r => r.status === 3).length, tone: 'crit'  as const },
  ];

  const stabCounts = useMemo(() => {
    const c: Record<string, number> = { all: filtered.length };
    STATUS_TABS.forEach(s => { c[s.v] = filtered.filter(r => statusKey(r) === s.v).length; });
    return c;
  }, [filtered]);

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<AssetProcurementRequestDto>[] = [
    { key: 'requestNo',     label: 'Số phiếu',     mono: true, code: true, width: 140,
      render: r => r.requestNo },
    { key: 'requestTypeName', label: 'Loại',        width: 85,
      render: r => r.requestTypeName },
    { key: 'title',         label: 'Tiêu đề',
      render: r => (
        <span style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.title}
        </span>
      ) },
    { key: 'departmentName', label: 'Phòng/Khoa',  width: 140,
      render: r => r.departmentName || '—' },
    { key: 'requesterName', label: 'Người đề xuất', width: 130,
      render: r => r.requesterName || '—' },
    { key: 'itemCount',     label: 'Mục',          mono: true, width: 55,
      render: r => r.itemCount },
    { key: 'totalAmount',   label: 'Tổng tiền',    mono: true, width: 130,
      render: r => fmtMoney(r.totalAmount) },
    { key: 'createdAt',     label: 'Ngày tạo',     mono: true, width: 95,
      render: r => fmtDate(r.createdAt) },
    { key: 'status',        label: 'Trạng thái',   width: 115,
      render: r => {
        const k = statusKey(r);
        const t = STATUS_TABS.find(s => s.v === k)!;
        return <StatusBadge tone={STATUS_TONE[k]} dot>{t.l}</StatusBadge>;
      } },
  ];

  // ── Row actions ───────────────────────────────────────────────────────────

  const rowActions = (r: AssetProcurementRequestDto) => (
    <>
      {r.status === 0 && <ActBtn ic="edit-2"      title="Sửa"          onClick={() => openEdit(r)} />}
      {r.status === 0 && <ActBtn ic="send"         title="Trình duyệt"  onClick={() => handleSubmit(r)} />}
      {r.status === 1 && <ActBtn ic="check"        title="Duyệt"        onClick={() => handleApprove(r)} />}
      {r.status === 1 && <ActBtn ic="x"            title="Từ chối"      tone="crit" onClick={() => { setRejectTarget(r); setRejectNote(''); }} />}
      {r.status === 2 && <ActBtn ic="check-circle" title="Hoàn tất"     onClick={() => handleComplete(r)} />}
      {r.status === 0 && <ActBtn ic="trash-2"      title="Xóa"          tone="crit" onClick={() => handleDelete(r)} />}
    </>
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openEdit = (r?: AssetProcurementRequestDto) => {
    if (r) {
      setEditForm({
        id: r.id, title: r.title, requestType: r.requestType,
        departmentId: r.departmentId, departmentName: r.departmentName,
        requesterName: r.requesterName, reason: r.reason, note: r.note,
        items: r.items.length > 0
          ? r.items.map(i => ({ id: i.id, itemName: i.itemName, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, specification: i.specification }))
          : [emptyItem()],
      });
    } else {
      setEditForm(emptyForm());
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) { te('Vui lòng nhập tiêu đề'); return; }
    if (editForm.items.some(i => !i.itemName.trim())) { te('Tên hàng mục không được để trống'); return; }
    setSaving(true);
    try {
      await saveAssetProcurementRequest(editForm);
      tk('Lưu thành công');
      setEditOpen(false);
      void reload();
    } catch { te('Lưu thất bại');
    } finally { setSaving(false); }
  };

  const handleDelete = (r: AssetProcurementRequestDto) => {
    cf(`Xóa phiếu "${r.requestNo}"?`, async () => {
      try {
        await deleteAssetProcurementRequest(r.id);
        tk('Đã xóa'); void reload();
      } catch { te('Xóa thất bại'); }
    });
  };

  const handleSubmit = (r: AssetProcurementRequestDto) => {
    cf(`Trình duyệt phiếu "${r.requestNo}"?`, async () => {
      try {
        await submitAssetProcurementRequest(r.id);
        tk('Đã trình duyệt'); void reload();
        if (detail?.id === r.id) setDetail(prev => prev ? { ...prev, status: 1, statusName: 'Chờ xét duyệt' } : prev);
      } catch { te('Trình duyệt thất bại'); }
    });
  };

  const handleApprove = (r: AssetProcurementRequestDto) => {
    cf(`Duyệt phiếu "${r.requestNo}"?`, async () => {
      try {
        await approveAssetProcurementRequest({ requestId: r.id });
        tk('Đã duyệt'); void reload();
        if (detail?.id === r.id) setDetail(prev => prev ? { ...prev, status: 2, statusName: 'Đã duyệt' } : prev);
      } catch { te('Duyệt thất bại'); }
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    try {
      await rejectAssetProcurementRequest({ requestId: rejectTarget.id, note: rejectNote });
      tk('Đã từ chối'); setRejectTarget(null); void reload();
    } catch { te('Từ chối thất bại'); }
  };

  const handleComplete = (r: AssetProcurementRequestDto) => {
    cf(`Hoàn tất phiếu "${r.requestNo}"?`, async () => {
      try {
        await completeAssetProcurementRequest(r.id);
        tk('Hoàn tất'); void reload();
      } catch { te('Thất bại'); }
    });
  };

  // ── Item form helpers ─────────────────────────────────────────────────────

  const setItems = (items: SaveAssetProcurementItemDto[]) =>
    setEditForm(f => ({ ...f, items }));

  const updateItem = (idx: number, patch: Partial<SaveAssetProcurementItemDto>) =>
    setItems(editForm.items.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const removeItem = (idx: number) =>
    setItems(editForm.items.filter((_, i) => i !== idx));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <TopTabs tab={tab} setTab={t => { setTab(t); setPage(0); }} tabs={TABS}
        actions={
          <Btn variant="primary" icon="plus" onClick={() => openEdit()}>Tạo phiếu</Btn>
        }
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / tiêu đề / phòng / người đề xuất…" />
      </div>

      <StatusTabs
        value={stab}
        onChange={v => setStab(v as SKey | 'all')}
        tabs={STATUS_TABS}
        counts={stabCounts}
      />

      <DataTable<AssetProcurementRequestDto>
        columns={columns}
        data={paged}
        rowKey={r => r.id}
        onRowClick={r => setDetail(r)}
        actions={rowActions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiếu nào'}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PER} />

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.requestNo ?? ''}
        sub={detail ? `${detail.requestTypeName} · ${fmtDate(detail.createdAt)}` : ''}
        footer={detail && (
          <>
            {detail.status === 0 && <Btn variant="primary" icon="send" onClick={() => handleSubmit(detail)}>Trình duyệt</Btn>}
            {detail.status === 1 && <Btn variant="ok"   icon="check" onClick={() => handleApprove(detail)}>Duyệt</Btn>}
            {detail.status === 1 && <Btn variant="crit" icon="x"     onClick={() => { setRejectTarget(detail); setRejectNote(''); }}>Từ chối</Btn>}
            {detail.status === 2 && <Btn variant="default" icon="check-circle" onClick={() => handleComplete(detail)}>Hoàn tất</Btn>}
            {detail.status === 0 && <Btn variant="default" icon="edit-2" onClick={() => openEdit(detail)}>Sửa</Btn>}
          </>
        )}
      >
        {detail && (
          <>
            <DrSec title="Thông tin phiếu">
              <DrField lbl="Số phiếu">{detail.requestNo}</DrField>
              <DrField lbl="Loại">{detail.requestTypeName}</DrField>
              <DrField lbl="Tiêu đề">{detail.title}</DrField>
              <DrField lbl="Phòng/Khoa">{detail.departmentName || '—'}</DrField>
              <DrField lbl="Người đề xuất">{detail.requesterName || '—'}</DrField>
              <DrField lbl="Lý do">{detail.reason || '—'}</DrField>
              <DrField lbl="Ngày tạo">{fmtDate(detail.createdAt)}</DrField>
              <DrField lbl="Tổng tiền">{fmtMoney(detail.totalAmount)}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={STATUS_TONE[statusKey(detail)]} dot>{detail.statusName}</StatusBadge>
              </DrField>
              {detail.approverName && <DrField lbl="Người duyệt">{detail.approverName}</DrField>}
              {detail.approvedAt  && <DrField lbl="Ngày duyệt">{fmtDate(detail.approvedAt)}</DrField>}
              {detail.note        && <DrField lbl="Ghi chú">{detail.note}</DrField>}
            </DrSec>

            <DrSec title={`Danh sách hàng mục (${detail.items.length})`}>
              <div style={{ fontSize: 12.5 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 60px 130px', gap: 4,
                  fontWeight: 600, color: 'var(--t-2)', padding: '0 0 6px',
                  borderBottom: '1px solid var(--line)',
                }}>
                  <span>Tên hàng mục</span><span>ĐVT</span><span>SL</span><span style={{ textAlign: 'right' }}>Thành tiền</span>
                </div>
                {detail.items.map(it => (
                  <div key={it.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 60px 130px', gap: 4,
                    borderBottom: '1px solid var(--line-soft)', padding: '7px 0', alignItems: 'start',
                  }}>
                    <div>
                      <div>{it.itemName}</div>
                      {it.specification && <div style={{ color: 'var(--t-2)', fontSize: 11.5 }}>{it.specification}</div>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{it.unit || '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{it.quantity}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtMoney(it.amount)}</span>
                  </div>
                ))}
                {detail.items.length === 0 && (
                  <div style={{ padding: '12px 0', color: 'var(--t-2)' }}>Chưa có hàng mục nào</div>
                )}
              </div>
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* ── Create / Edit drawer ──────────────────────────────────────── */}
      <DrawerShell
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editForm.id ? 'Sửa phiếu' : 'Tạo phiếu mới'}
        sub={editForm.id ? 'Chỉ sửa được phiếu Dự thảo' : 'Điền thông tin và danh sách hàng mục'}
        footer={<Btn variant="primary" loading={saving} onClick={handleSave}>Lưu phiếu</Btn>}
      >
        <DrSec title="Thông tin chung">
          <DrField lbl="Loại phiếu *">
            <Select
              options={TYPE_OPTS}
              value={editForm.requestType}
              onChange={v => setEditForm(f => ({ ...f, requestType: v }))}
              style={{ width: 200 }}
            />
          </DrField>
          <DrField lbl="Tiêu đề *">
            <Input
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Nhập tiêu đề phiếu…"
            />
          </DrField>
          <DrField lbl="Phòng/Khoa">
            <Input
              value={editForm.departmentName ?? ''}
              onChange={e => setEditForm(f => ({ ...f, departmentName: e.target.value }))}
              placeholder="Tên phòng / khoa đề xuất"
            />
          </DrField>
          <DrField lbl="Người đề xuất">
            <Input
              value={editForm.requesterName ?? ''}
              onChange={e => setEditForm(f => ({ ...f, requesterName: e.target.value }))}
              placeholder="Họ tên người đề xuất"
            />
          </DrField>
          <DrField lbl="Lý do / mục đích">
            <Input.TextArea
              rows={2}
              value={editForm.reason ?? ''}
              onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Mô tả lý do đề xuất mua sắm…"
            />
          </DrField>
          <DrField lbl="Ghi chú">
            <Input.TextArea
              rows={2}
              value={editForm.note ?? ''}
              onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
            />
          </DrField>
        </DrSec>

        <DrSec title="Danh sách hàng mục">
          {editForm.items.map((it, idx) => (
            <div key={idx} style={{
              border: '1px solid var(--line)', borderRadius: 6,
              padding: '10px 12px', marginBottom: 8, position: 'relative',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>Tên hàng mục *</div>
                  <Input
                    value={it.itemName}
                    onChange={e => updateItem(idx, { itemName: e.target.value })}
                    placeholder="Tên hàng mục / vật tư / tài sản"
                  />
                </div>
                <div style={{ flex: '0 0 85px' }}>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>ĐVT</div>
                  <Input
                    value={it.unit ?? ''}
                    onChange={e => updateItem(idx, { unit: e.target.value })}
                    placeholder="Cái, chiếc…"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>Số lượng *</div>
                  <InputNumber
                    min={0.001}
                    value={it.quantity}
                    onChange={v => updateItem(idx, { quantity: v ?? 1 })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>Đơn giá (đ)</div>
                  <InputNumber
                    min={0}
                    value={it.unitPrice}
                    onChange={v => updateItem(idx, { unitPrice: v ?? undefined })}
                    formatter={v => v != null ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    style={{ width: '100%' }}
                    placeholder="Tùy chọn"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-1)' }}>
                    = {fmtMoney(it.unitPrice && it.quantity ? it.quantity * it.unitPrice : undefined)}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>Quy cách / đặc tính kỹ thuật</div>
                <Input
                  value={it.specification ?? ''}
                  onChange={e => updateItem(idx, { specification: e.target.value })}
                  placeholder="Nhãn hiệu, xuất xứ, yêu cầu kỹ thuật…"
                />
              </div>
              {editForm.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--s-crit)', fontSize: 14, lineHeight: 1,
                  }}
                  title="Xóa mục này"
                >✕</button>
              )}
            </div>
          ))}
          <Btn variant="ghost" size="sm" icon="plus"
            onClick={() => setItems([...editForm.items, emptyItem()])}>
            Thêm hàng mục
          </Btn>
        </DrSec>
      </DrawerShell>

      {/* ── Reject modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!rejectTarget}
        title="Từ chối phiếu"
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
        destroyOnHidden
      >
        <p style={{ marginBottom: 8 }}>
          Từ chối phiếu <b>{rejectTarget?.requestNo}</b>?
        </p>
        <Input.TextArea
          rows={3}
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          placeholder="Lý do từ chối (tùy chọn)…"
        />
      </Modal>
    </div>
  );
};

export default ProcurementRequestsV2;
