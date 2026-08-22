import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  getProcurementRequests, createProcurementRequest, approveProcurementRequest,
  getWarehouses, getAutoProcurementSuggestions,
} from '../api/warehouse';
import type {
  ProcurementRequestDto, WarehouseDto, AutoProcurementSuggestionDto,
} from '../api/warehouse';
import {
  SimpleV2Page, StatusBadge, DrSec, DrField, ModalShell, Btn, ActBtn, tk, te, tw, cf, Ico,
  type ColumnDef, type StatusTab, type KpiItem,
} from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

type SKey = 'new' | 'approved' | 'purchased' | 'cancelled';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'new',       l: 'Mới',       tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt',  tone: 'info' },
  { v: 'purchased', l: 'Đã mua',    tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',       tone: 'crit' },
];
const statusKey = (r: ProcurementRequestDto): SKey =>
  r.status === 1 ? 'approved' : r.status === 2 ? 'purchased' : r.status === 3 ? 'cancelled' : 'new';

interface CreateRow extends AutoProcurementSuggestionDto {
  checked: boolean;
  requestQty: number;
}

const CELL: React.CSSProperties = {
  border: '1px solid var(--line)', borderRadius: 4,
  padding: '4px 8px', fontSize: 13, background: 'var(--bg-1)',
  width: '100%', color: 'var(--t-0)',
};

const ProcurementV2: React.FC = () => {
  const load = useCallback(async () => {
    const r = await getProcurementRequests(undefined, undefined,
      dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'));
    return Array.isArray(r.data) ? (r.data as ProcurementRequestDto[]) : [];
  }, []);

  const columns: ColumnDef<ProcurementRequestDto>[] = [
    { key: 'requestCode',   label: 'Mã',        mono: true, code: true, render: (r) => r.requestCode },
    { key: 'warehouseName', label: 'Kho',        render: (r) => r.warehouseName },
    { key: 'description',   label: 'Mô tả',
      render: (r) => (
        <span style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.description || '—'}
        </span>
      ) },
    { key: 'items', label: 'Số mục', mono: true, render: (r) => r.items?.length || 0 },
    { key: 'createdByName', label: 'Người tạo', render: (r) => r.createdByName },
    { key: 'requestDate',   label: 'Ngày YC',   mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM/YYYY') },
    { key: 'status', label: 'Trạng thái',
      render: (r) => {
        const k = statusKey(r);
        const m = STATUS_TABS.find((s) => s.v === k)!;
        return <StatusBadge tone={m.tone as 'ok' | 'warn' | 'crit' | 'info'}>{m.l}</StatusBadge>;
      } },
  ];

  const kpis = (rows: ProcurementRequestDto[]): KpiItem[] => [
    { lbl: 'Tổng dự trù', val: rows.length },
    { lbl: 'Chờ duyệt',   val: rows.filter((r) => r.status === 0).length, tone: 'warn' },
    { lbl: 'Đã duyệt',    val: rows.filter((r) => r.status === 1).length, tone: 'info' },
    { lbl: 'Đã mua',      val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
  ];

  // ── Create modal state ──────────────────────────────────────────────────────
  const reloadRef = useRef<() => void>(() => {});
  const [createOpen, setCreateOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [whId, setWhId] = useState('');
  const [desc, setDesc] = useState('');
  const [createRows, setCreateRows] = useState<CreateRow[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useModalForm({ whId: { required: true, message: 'Chọn kho trước' } }, createOpen);

  const openCreate = async () => {
    setCreateOpen(true);
    setDesc('');
    if (warehouses.length === 0) {
      try {
        const r = await getWarehouses();
        const wh: WarehouseDto[] = Array.isArray(r) ? r : (r as any).data ?? [];
        setWarehouses(wh);
        if (wh.length > 0 && !whId) setWhId(wh[0].id);
      } catch { te('Không tải được danh sách kho'); }
    }
  };

  useEffect(() => {
    if (!whId || !createOpen) return;
    setSugLoading(true);
    setCreateRows([]);
    const fetch = getAutoProcurementSuggestions(whId);
    (fetch as unknown as Promise<AutoProcurementSuggestionDto[]>)
      .then((data: AutoProcurementSuggestionDto[]) => {
        const arr: AutoProcurementSuggestionDto[] = Array.isArray(data)
          ? data
          : (data as any).data ?? [];
        setCreateRows(arr.map((s) => ({
          ...s,
          requestQty: Math.max(1, (s.maximumStock || 0) - (s.currentStock || 0)),
          checked: (s.currentStock || 0) <= (s.minimumStock || 0),
        })));
      })
      .catch((e) => { tw(friendlyErrorMessage(e, 'Không tải được gợi ý dự trù tự động')); setCreateRows([]); })
      .finally(() => setSugLoading(false));
  }, [whId, createOpen]);

  const toggleRow = (idx: number) =>
    setCreateRows((p) => p.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r));
  const setQty = (idx: number, v: number) =>
    setCreateRows((p) => p.map((r, i) => i === idx ? { ...r, requestQty: v } : r));

  const submitCreate = async () => {
    if (!form.validate({ whId })) return;
    const items = createRows.filter((r) => r.checked && r.requestQty > 0);
    if (items.length === 0) { te('Chọn ít nhất 1 mặt hàng'); return; }
    setSubmitting(true);
    try {
      await createProcurementRequest({
        warehouseId: whId,
        description: desc.trim() || undefined,
        items: items.map((r) => ({ itemId: r.itemId, requestedQuantity: r.requestQty })),
      });
      tk('Đã tạo phiếu dự trù');
      setCreateOpen(false);
      reloadRef.current();
    } catch { te('Tạo dự trù thất bại'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = (r: ProcurementRequestDto, reload: () => void) => {
    cf(`Duyệt phiếu dự trù "${r.requestCode}"?`, async () => {
      try {
        await approveProcurementRequest(r.id);
        tk('Đã duyệt phiếu dự trù');
        reload();
      } catch { te('Duyệt thất bại'); }
    }, { tone: 'warn', confirm: 'Duyệt' });
  };

  const SEL: React.CSSProperties = {
    ...CELL, padding: '5px 8px', height: 32,
  };

  return (
    <>
      <SimpleV2Page<ProcurementRequestDto>
        title="Dự trù mua sắm"
        load={load}
        rowKey={(r) => r.id}
        columns={columns}
        searchPlaceholder="Tìm theo mã / kho / mô tả…"
        searchOf={(r) => `${r.requestCode} ${r.warehouseName} ${r.description || ''}`}
        statusTabs={STATUS_TABS}
        statusOf={statusKey}
        kpis={kpis}
        pageSize={20}
        emptyMessage="Chưa có dự trù"
        headerActions={(reload) => {
          reloadRef.current = reload;
          return (
            <Btn variant="primary" onClick={openCreate}>
              <Ico name="plus" size={12} /> Tạo dự trù
            </Btn>
          );
        }}
        rowActions={(r, reload) => r.status === 0 ? (
          <ActBtn ic="check" title="Duyệt" onClick={() => handleApprove(r, reload)} />
        ) : null}
        drawerTitle={(r) => r.requestCode}
        drawerSub={(r) => `${r.warehouseName} · ${dayjs(r.requestDate).format('DD/MM/YYYY')}`}
        drawer={(r) => (
          <>
            <DrSec title="Thông tin">
              <DrField lbl="Mã">{r.requestCode}</DrField>
              <DrField lbl="Kho">{r.warehouseName}</DrField>
              <DrField lbl="Mô tả">{r.description || '—'}</DrField>
              <DrField lbl="Người tạo">{r.createdByName}</DrField>
              <DrField lbl="Ngày YC">{dayjs(r.requestDate).format('DD/MM/YYYY')}</DrField>
              <DrField lbl="Trạng thái">{r.statusName}</DrField>
            </DrSec>
            <DrSec title={`Danh sách mặt hàng (${r.items?.length || 0})`}>
              <div style={{ fontSize: 12.5 }}>
                {(r.items || []).slice(0, 50).map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--line-soft)', padding: '6px 0' }}>
                    <span>{it.itemName} <span style={{ color: 'var(--t-3)', fontSize: 11 }}>{it.unit}</span></span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {it.requestedQuantity}
                      {it.approvedQuantity > 0 && it.approvedQuantity !== it.requestedQuantity && (
                        <span style={{ color: 'var(--s-ok)', marginLeft: 6 }}>→ {it.approvedQuantity}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </DrSec>
          </>
        )}
      />

      {/* ── Modal tạo dự trù ── */}
      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo phiếu dự trù mua sắm"
        size="lg"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Huỷ</Btn>
          <Btn variant="primary" onClick={submitCreate} loading={submitting}>
            <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Tạo phiếu'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', padding: 'var(--space-4) 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <Field label="Kho" required error={form.errors.whId}>
              <select style={SEL} value={whId} onChange={(e) => { setWhId(e.target.value); form.clear('whId'); }}>
                <option value="">— Chọn kho —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.warehouseName}</option>
                ))}
              </select>
            </Field>
            <Field label="Mô tả">
              <input style={CELL} value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Ghi chú dự trù (tuỳ chọn)" />
            </Field>
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 8 }}>
              Danh sách mặt hàng đề nghị
              {sugLoading && <span style={{ fontWeight: 400, color: 'var(--t-3)', marginLeft: 8 }}>Đang tải gợi ý…</span>}
              {!sugLoading && !whId && <span style={{ fontWeight: 400, color: 'var(--t-3)', marginLeft: 8 }}>Chọn kho để xem gợi ý</span>}
              {!sugLoading && whId && createRows.length === 0 && <span style={{ fontWeight: 400, color: 'var(--s-ok)', marginLeft: 8 }}>Kho đủ hàng</span>}
            </div>
            {createRows.length > 0 && (
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--d-1)', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: 36 }}>
                        <input type="checkbox"
                          checked={createRows.every((r) => r.checked)}
                          onChange={(e) => setCreateRows((p) => p.map((r) => ({ ...r, checked: e.target.checked })))} />
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tên mặt hàng</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Tồn kho</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: 100 }}>Số lượng YC</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: 60 }}>ĐVT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createRows.map((row, idx) => (
                      <tr key={row.itemId} style={{ borderTop: '1px solid var(--line)', background: row.checked ? 'var(--bg-0)' : undefined }}>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.checked} onChange={() => toggleRow(idx)} />
                        </td>
                        <td style={{ padding: '5px 8px' }}>
                          <div style={{ fontWeight: 500 }}>{row.itemName}</div>
                          <div style={{ fontSize: 11, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{row.itemCode}</div>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)',
                          color: (row.currentStock || 0) <= (row.minimumStock || 0) ? 'var(--s-crit)' : 'var(--t-1)' }}>
                          {row.currentStock}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          <input type="number" min={1} value={row.requestQty}
                            onChange={(e) => setQty(idx, parseInt(e.target.value) || 1)}
                            disabled={!row.checked}
                            style={{ width: 80, textAlign: 'right', border: '1px solid var(--line)', borderRadius: 3, padding: '3px 6px', fontSize: 12.5 }} />
                        </td>
                        <td style={{ padding: '5px 8px', color: 'var(--t-2)' }}>{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--t-3)' }}>
              Đỏ = dưới mức tồn tối thiểu · Tích để đưa vào phiếu dự trù
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default ProcurementV2;
