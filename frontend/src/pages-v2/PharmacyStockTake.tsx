/**
 * PharmacyStockTake — Kiểm kê kho Dược (v2 native ab-* design).
 *
 * Single-session flow (no list endpoint exists):
 *   1. User picks warehouse + period → "Tạo phiếu kiểm kê" → createStockTake()
 *      → server returns StockTakeDto with items pre-populated from current stock
 *   2. User edits actualQuantity per row (differenceQuantity auto-computed)
 *   3. "Lưu kết quả đếm" → updateStockTakeResults()  → status 1
 *   4. "Hoàn tất kiểm kê" → completeStockTake()      → status 2 (gate: status < 2)
 *   5. "Điều chỉnh tồn kho" → adjustStockAfterTake() → DESTRUCTIVE (gate: status 2, confirm dialog)
 *   6. "In biên bản"       → printStockTakeReport()  → blob → new tab
 *
 * Status values (verified from WarehouseCompleteService.Inventory.cs):
 *   0 = Mới tạo (after create)
 *   1 = Đã lưu kết quả (after updateStockTakeResults)
 *   2 = Hoàn tất (after completeStockTake)
 *   Adjust only enabled at status === 2.
 */
import React, { useState, useCallback } from 'react';
import { App as AntdApp, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import * as wh from '../api/warehouse';
import type { StockTakeDto, StockTakeItemDto, WarehouseDto } from '../api/warehouse';
import {
  KpiStrip,
  DataTable,
  Btn,
  ActBtn,
  AbSelect,
  StatusBadge,
  cf,
  type ColumnDef,
  type StatusTone,
} from './_v2kit';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_NEW = 0;       // after createStockTake
const STATUS_SAVED = 1;     // after updateStockTakeResults
const STATUS_COMPLETED = 2; // after completeStockTake

function statusTone(s: number): StatusTone {
  if (s === STATUS_COMPLETED) return 'ok';
  if (s === STATUS_SAVED) return 'info';
  return 'warn';
}

const fmtDate = (iso?: string | null) =>
  iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const fmtVND = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString('vi-VN')} ₫` : '—';

// ─── Local edited-items state ────────────────────────────────────────────────

/** Map from item.id → edited actualQuantity (user override). */
type EditMap = Record<string, number>;

/** Merge DTO items with user edits to produce display items. */
function mergeItems(items: StockTakeItemDto[], edits: EditMap): StockTakeItemDto[] {
  return items.map((it) => {
    const actual = edits[it.id] ?? it.actualQuantity;
    const diff = actual - it.bookQuantity;
    return {
      ...it,
      actualQuantity: actual,
      differenceQuantity: diff,
      differenceValue: diff * it.unitPrice,
    };
  });
}

// ─── Inline editable InputNumber (plain input to avoid Antd re-render jitter) ─

interface NumCellProps {
  value: number;
  readOnly?: boolean;
  onChange: (v: number) => void;
}

const NumCell: React.FC<NumCellProps> = ({ value, readOnly, onChange }) => {
  const [local, setLocal] = React.useState(String(value));

  // Sync when external value changes (e.g. after save refreshes DTO)
  React.useEffect(() => { setLocal(String(value)); }, [value]);

  if (readOnly) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
        {value.toLocaleString('vi-VN')}
      </span>
    );
  }

  return (
    <input
      type="number"
      min={0}
      step={1}
      value={local}
      style={{
        width: 80, padding: '2px 6px', border: '1px solid var(--line)',
        borderRadius: 4, fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-mono)',
        background: 'var(--bg-0)', color: 'var(--t-0)',
      }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local);
        if (!isNaN(n) && n >= 0) { onChange(n); }
        else { setLocal(String(value)); }
      }}
    />
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PharmacyStockTake: React.FC = () => {
  const { message } = AntdApp.useApp();

  // ── Reference data ───────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [warehousesLoaded, setWarehousesLoaded] = React.useState(false);

  React.useEffect(() => {
    wh.getWarehouses()
      .then((r) => setWarehouses((r.data as WarehouseDto[]) || []))
      .catch(() => {})
      .finally(() => setWarehousesLoaded(true));
  }, []);

  // ── Create-form state ────────────────────────────────────────────────────
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [period, setPeriod] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [creating, setCreating] = useState(false);

  // ── Session state: hold the single active stock-take ─────────────────────
  const [stockTake, setStockTake] = useState<StockTakeDto | null>(null);
  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [printing, setPrinting] = useState(false);

  // ── Derived display items (merge DTO + edits) ─────────────────────────────
  const displayItems = React.useMemo(
    () => (stockTake ? mergeItems(stockTake.items ?? [], edits) : []),
    [stockTake, edits],
  );

  // ── KPI computations ───────────────────────────────────────────────────────
  const totalItems = displayItems.length;
  const counted = displayItems.filter((it) => it.actualQuantity > 0).length;
  const diffRows = displayItems.filter((it) => it.differenceQuantity !== 0).length;
  const totalDiffValue = displayItems.reduce((s, it) => s + Math.abs(it.differenceValue), 0);

  // ── Create stock-take ──────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!selectedWarehouseId) { message.warning('Chọn kho cần kiểm kê'); return; }
    if (!period[0] || !period[1]) { message.warning('Chọn kỳ kiểm kê (từ ngày - đến ngày)'); return; }

    setCreating(true);
    try {
      const res = await wh.createStockTake(
        selectedWarehouseId,
        period[0].format('YYYY-MM-DD'),
        period[1].format('YYYY-MM-DD'),
      );
      const dto = res.data as StockTakeDto;
      setStockTake(dto);
      setEdits({});
      message.success(`Đã tạo phiếu kiểm kê ${dto.stockTakeCode} — ${dto.items?.length ?? 0} mặt hàng`);
    } catch {
      message.error('Tạo phiếu kiểm kê thất bại');
    } finally {
      setCreating(false);
    }
  }, [selectedWarehouseId, period, message]);

  // ── Edit actual quantity for one item ────────────────────────────────────
  const handleEditActual = useCallback((itemId: string, value: number) => {
    setEdits((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  // ── Save results ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!stockTake) return;

    const payload: StockTakeItemDto[] = displayItems.map((it) => ({
      ...it,
      actualQuantity: edits[it.id] ?? it.actualQuantity,
    }));

    setSaving(true);
    try {
      const res = await wh.updateStockTakeResults(stockTake.id, payload);
      const updated = res.data as StockTakeDto;
      // Re-seed items from server response; reset edits (server is now source of truth)
      setStockTake(updated);
      setEdits({});
      message.success('Đã lưu kết quả đếm');
    } catch {
      message.error('Lưu kết quả thất bại');
    } finally {
      setSaving(false);
    }
  }, [stockTake, displayItems, edits, message]);

  // ── Complete stock-take ────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!stockTake) return;
    if (stockTake.status >= STATUS_COMPLETED) return;

    setCompleting(true);
    try {
      const res = await wh.completeStockTake(stockTake.id);
      const updated = res.data as StockTakeDto;
      setStockTake(updated);
      setEdits({});
      message.success('Hoàn tất kiểm kê');
    } catch {
      message.error('Hoàn tất kiểm kê thất bại');
    } finally {
      setCompleting(false);
    }
  }, [stockTake, message]);

  // ── Adjust stock (DESTRUCTIVE — requires confirm + status === 2) ──────────
  const handleAdjust = useCallback(() => {
    if (!stockTake || stockTake.status !== STATUS_COMPLETED) return;

    cf(
      'Thao tác này sẽ điều chỉnh số lượng tồn kho thực tế theo kết quả kiểm kê. Không thể hoàn tác. Tiếp tục?',
      async () => {
        setAdjusting(true);
        try {
          await wh.adjustStockAfterTake(stockTake.id);
          message.success('Đã điều chỉnh tồn kho theo kết quả kiểm kê');
        } catch {
          message.error('Điều chỉnh tồn kho thất bại');
        } finally {
          setAdjusting(false);
        }
      },
      { title: 'Điều chỉnh tồn kho thật', tone: 'crit', confirm: 'Xác nhận điều chỉnh' },
    );
  }, [stockTake, message]);

  // ── Print (blob → new tab — Billing.tsx pattern) ─────────────────────────
  const handlePrint = useCallback(async () => {
    if (!stockTake) return;
    setPrinting(true);
    try {
      const res = await wh.printStockTakeReport(stockTake.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('In biên bản thất bại');
    } finally {
      setPrinting(false);
    }
  }, [stockTake, message]);

  // ── Reset to start a new stock-take ──────────────────────────────────────
  const handleReset = useCallback(() => {
    setStockTake(null);
    setEdits({});
    setSelectedWarehouseId('');
    setPeriod([null, null]);
  }, []);

  // ── Column defs for the items table ──────────────────────────────────────
  const isReadOnly = stockTake ? stockTake.status >= STATUS_COMPLETED : true;

  const columns: ColumnDef<StockTakeItemDto>[] = [
    {
      key: 'itemCode', label: 'Mã hàng', mono: true, code: true, width: 110,
      render: (r) => r.itemCode || '—',
    },
    {
      key: 'itemName', label: 'Tên hàng / thuốc',
      render: (r) => r.itemName,
    },
    {
      key: 'unit', label: 'ĐVT', width: 60,
      render: (r) => r.unit,
    },
    {
      key: 'batchNumber', label: 'Số lô', mono: true, width: 90,
      render: (r) => r.batchNumber || '—',
    },
    {
      key: 'expiryDate', label: 'HSD', mono: true, width: 100,
      render: (r) => fmtDate(r.expiryDate),
    },
    {
      key: 'bookQuantity', label: 'Tồn sổ sách', width: 100,
      render: (r) => (
        <NumCell value={r.bookQuantity} readOnly onChange={() => {}} />
      ),
    },
    {
      key: 'actualQuantity', label: 'Thực đếm', width: 100,
      render: (r) => (
        <NumCell
          value={r.actualQuantity}
          readOnly={isReadOnly}
          onChange={(v) => handleEditActual(r.id, v)}
        />
      ),
    },
    {
      key: 'differenceQuantity', label: 'Chênh lệch', width: 100,
      render: (r) => {
        const diff = r.differenceQuantity;
        const color = diff === 0 ? 'var(--t-2)' : diff < 0 ? 'var(--s-crit)' : 'var(--s-ok)';
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color, fontWeight: diff !== 0 ? 600 : 400 }}>
            {diff > 0 ? '+' : ''}{diff.toLocaleString('vi-VN')}
          </span>
        );
      },
    },
    {
      key: 'differenceValue', label: 'Giá trị lệch', width: 120,
      render: (r) => {
        const v = r.differenceValue;
        const color = v === 0 ? 'var(--t-2)' : 'var(--s-warn)';
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color }}>
            {v !== 0 ? fmtVND(Math.abs(v)) : '—'}
          </span>
        );
      },
    },
  ];

  const warehouseOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab">

      {/* ── KPI strip — shows data only after stock-take created ── */}
      <KpiStrip items={[
        { lbl: 'Tổng mặt hàng', val: totalItems, tone: totalItems > 0 ? 'info' : undefined },
        { lbl: 'Đã đếm', val: counted, tone: counted === totalItems && totalItems > 0 ? 'ok' : 'warn' },
        { lbl: 'Số dòng lệch', val: diffRows, tone: diffRows > 0 ? 'crit' : 'ok' },
        { lbl: 'Tổng giá trị lệch', val: Math.round(totalDiffValue / 1_000), unit: 'nghìn₫', tone: diffRows > 0 ? 'warn' : undefined },
      ]} />

      {/* ── Top toolbar ── */}
      <div className="ab-toolbar">

        {/* Create-form controls (always visible until stockTake is active) */}
        {!stockTake && (
          <>
            <AbSelect
              value={selectedWarehouseId}
              onChange={setSelectedWarehouseId}
              options={warehouseOpts}
              placeholder={warehousesLoaded ? '— Chọn kho kiểm kê —' : 'Đang tải kho…'}
              style={{ minWidth: 220 }}
            />
            <DatePicker.RangePicker
              size="small"
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              value={period}
              onChange={(v) => setPeriod(v ? [v[0], v[1]] : [null, null])}
            />
            <Btn
              variant="primary"
              icon="plus"
              loading={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? 'Đang tạo…' : 'Tạo phiếu kiểm kê'}
            </Btn>
          </>
        )}

        {/* Action buttons — only after stock-take is created */}
        {stockTake && (
          <>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              Phiếu:{' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>
                {stockTake.stockTakeCode}
              </strong>
            </span>
            <StatusBadge tone={statusTone(stockTake.status)} dot>
              {stockTake.statusName || (
                stockTake.status === STATUS_COMPLETED ? 'Hoàn tất'
                  : stockTake.status === STATUS_SAVED ? 'Đã lưu'
                  : 'Mới tạo'
              )}
            </StatusBadge>
            <span className="spacer" />

            {/* Save — enabled while status < COMPLETED */}
            {stockTake.status < STATUS_COMPLETED && (
              <Btn
                variant="ok"
                icon="check"
                loading={saving}
                disabled={saving || completing}
                onClick={() => void handleSave()}
              >
                {saving ? 'Đang lưu…' : 'Lưu kết quả đếm'}
              </Btn>
            )}

            {/* Complete — enabled only before completed */}
            {stockTake.status < STATUS_COMPLETED && (
              <Btn
                variant="primary"
                icon="check"
                loading={completing}
                disabled={saving || completing}
                onClick={() => void handleComplete()}
              >
                {completing ? 'Đang hoàn tất…' : 'Hoàn tất kiểm kê'}
              </Btn>
            )}

            {/* Adjust — DESTRUCTIVE — only after completed */}
            {stockTake.status === STATUS_COMPLETED && (
              <Btn
                variant="crit"
                loading={adjusting}
                disabled={adjusting}
                onClick={handleAdjust}
              >
                {adjusting ? 'Đang điều chỉnh…' : 'Điều chỉnh tồn kho'}
              </Btn>
            )}

            {/* Print — always available once stock-take exists */}
            <Btn
              variant="ghost"
              icon="printer"
              loading={printing}
              disabled={printing}
              onClick={() => void handlePrint()}
            >
              In biên bản
            </Btn>

            {/* New stock-take */}
            <Btn variant="ghost" icon="x" onClick={handleReset} title="Kết thúc phiên / Tạo phiếu mới">
              Kết thúc phiên
            </Btn>
          </>
        )}
      </div>

      {/* ── Header info row — shown after stock-take created ── */}
      {stockTake && (
        <div style={{
          display: 'flex', gap: 'var(--space-24)', padding: '8px 14px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--bg-1)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)',
          flexWrap: 'wrap',
        }}>
          <span>Kho: <strong style={{ color: 'var(--t-0)' }}>{stockTake.warehouseName}</strong></span>
          <span>Kỳ: <strong style={{ color: 'var(--t-0)' }}>
            {fmtDate(stockTake.periodFrom)} → {fmtDate(stockTake.periodTo)}
          </strong></span>
          <span>Ngày tạo: <strong style={{ color: 'var(--t-0)' }}>{fmtDate(stockTake.stockTakeDate)}</strong></span>
          <span>Người tạo: <strong style={{ color: 'var(--t-0)' }}>{stockTake.createdByName}</strong></span>
        </div>
      )}

      {/* ── Empty state — before stock-take created ── */}
      {!stockTake && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--t-2)', padding: 48, gap: 'var(--space-12)',
        }}>
          <div style={{ fontSize: 40 }}>🗂️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-1)' }}>
            Chưa có phiếu kiểm kê
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', textAlign: 'center', maxWidth: 360 }}>
            Chọn kho và kỳ kiểm kê, sau đó bấm{' '}
            <strong>"Tạo phiếu kiểm kê"</strong> để bắt đầu.
            Hệ thống sẽ tự động nạp danh sách tồn kho theo sổ sách.
          </div>
        </div>
      )}

      {/* ── Items table — editable when status < COMPLETED ── */}
      {stockTake && (
        <>
          {displayItems.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>
              Phiếu kiểm kê chưa có mặt hàng nào (kho có thể đang trống)
            </div>
          )}

          {displayItems.length > 0 && (
            <DataTable<StockTakeItemDto>
              columns={columns}
              data={displayItems}
              rowKey={(r) => r.id}
              empty="Không có mặt hàng"
              actions={isReadOnly ? undefined : (r) => (
                <ActBtn
                  ic="refresh"
                  title="Khôi phục về số sách"
                  onClick={() => {
                    setEdits((prev) => {
                      const next = { ...prev };
                      delete next[r.id];
                      return next;
                    });
                  }}
                />
              )}
            />
          )}

          {/* Summary row */}
          {displayItems.length > 0 && (
            <div style={{
              display: 'flex', gap: 'var(--space-20)', padding: '8px 14px',
              borderTop: '1px solid var(--line)',
              background: 'var(--bg-1)', fontSize: 'var(--fs-sm)', flexWrap: 'wrap',
            }}>
              <span>
                Tổng: <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalItems}</strong> dòng
              </span>
              <span>
                Đã đếm: <strong style={{ fontFamily: 'var(--font-mono)', color: counted === totalItems ? 'var(--s-ok)' : 'var(--s-warn)' }}>
                  {counted}
                </strong>
              </span>
              <span>
                Lệch: <strong style={{ fontFamily: 'var(--font-mono)', color: diffRows > 0 ? 'var(--s-crit)' : 'var(--t-2)' }}>
                  {diffRows}
                </strong> dòng
              </span>
              <span>
                Tổng giá trị lệch:{' '}
                <strong style={{ fontFamily: 'var(--font-mono)', color: diffRows > 0 ? 'var(--s-warn)' : 'var(--t-2)' }}>
                  {fmtVND(totalDiffValue)}
                </strong>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PharmacyStockTake;
