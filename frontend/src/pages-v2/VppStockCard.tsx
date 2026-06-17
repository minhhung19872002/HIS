/**
 * G-43 TTB/VPP nhập kho + thẻ kho — REUSE WarehouseComplete endpoints.
 * - Catalog: /api/office-supply/catalog (MedicalSupply.IsMedical=false)
 * - Kho VPP: /api/warehouse/warehouses?warehouseType=2 (kho vật tư)
 * - Thẻ kho: /api/warehouse/stock-card?warehouseId=&itemId=&fromDate=&toDate=
 * - Tồn kho: /api/warehouse/stock?warehouseId=
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, DataTable, ActBtn, Btn, tw, type ColumnDef,
} from './_v2kit';

// ── Types ──────────────────────────────────────────────────────────────────

interface WarehouseDto { id: string; warehouseName: string; warehouseCode: string; }
interface StockDto {
  itemId: string; supplyCode: string; supplyName: string; unit: string;
  currentStock: number; minStock: number; maxStock: number;
}
interface StockCardEntry {
  date: string; description: string; receiptQty: number; issueQty: number;
  balance: number; reference: string;
}
interface StockCardDto {
  supplyName: string; unit: string; warehouseName: string;
  openingBalance: number; entries: StockCardEntry[];
  closingBalance: number;
}

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

// ── Component ───────────────────────────────────────────────────────────────

const VppStockCardV2: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [stock, setStock] = useState<StockDto[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');

  const [cardOpen, setCardOpen] = useState(false);
  const [card, setCard] = useState<StockCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'), dayjs(),
  ]);

  // ── Load ────────────────────────────────────────────────────────────────

  useEffect(() => {
    apiClient.get<WarehouseDto[]>('/warehouse/warehouses', { params: { warehouseType: 2 } })
      .then(({ data }) => setWarehouses(data || [])).catch(() => {});
  }, []);

  const loadStock = useCallback(async () => {
    if (!selectedWarehouse) return;
    setStockLoading(true);
    try {
      const { data } = await apiClient.get<StockDto[]>('/warehouse/stock', {
        params: { warehouseId: selectedWarehouse },
      });
      setStock(data || []);
    } catch { tw('Tải tồn kho thất bại'); }
    finally { setStockLoading(false); }
  }, [selectedWarehouse]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const openCard = async (itemId: string) => {
    if (!selectedWarehouse) { tw('Chọn kho trước'); return; }
    setCardLoading(true); setCard(null); setCardOpen(true);
    try {
      const { data } = await apiClient.get<StockCardDto>('/warehouse/stock-card', {
        params: {
          warehouseId: selectedWarehouse, itemId,
          fromDate: dateRange[0].toISOString(),
          toDate: dateRange[1].toISOString(),
        },
      });
      setCard(data);
    } catch { tw('Tải thẻ kho thất bại'); setCardOpen(false); }
    finally { setCardLoading(false); }
  };

  // ── Filtered data ────────────────────────────────────────────────────────

  const filtered = stock.filter((r) =>
    !keyword || r.supplyName.toLowerCase().includes(keyword.toLowerCase()) || r.supplyCode?.includes(keyword));

  // ── Columns ──────────────────────────────────────────────────────────────

  const stockCols: ColumnDef<StockDto>[] = [
    { key: 'code',  label: 'Mã VPP',    code: true, render: (r) => r.supplyCode },
    { key: 'name',  label: 'Tên VPP',               render: (r) => r.supplyName },
    { key: 'unit',  label: 'ĐVT',       mono: true, render: (r) => r.unit },
    { key: 'stock', label: 'Tồn kho',   mono: true, render: (r) => {
      const tone = r.currentStock <= r.minStock ? 'var(--a-rd-text)' : undefined;
      return <strong style={{ color: tone }}>{fmt(r.currentStock)}</strong>;
    } },
    { key: 'min',   label: 'Tối thiểu', mono: true, render: (r) => fmt(r.minStock) },
  ];

  const cardCols: ColumnDef<StockCardEntry>[] = [
    { key: 'date', label: 'Ngày',      mono: true, render: (r) => new Date(r.date).toLocaleDateString('vi-VN') },
    { key: 'desc', label: 'Diễn giải',             render: (r) => r.description },
    { key: 'ref',  label: 'Chứng từ',  code: true, render: (r) => r.reference || '—' },
    { key: 'in',   label: 'Nhập',      mono: true, render: (r) => r.receiptQty > 0 ? fmt(r.receiptQty) : '—' },
    { key: 'out',  label: 'Xuất',      mono: true, render: (r) => r.issueQty > 0 ? fmt(r.issueQty) : '—' },
    { key: 'bal',  label: 'Tồn',       mono: true, render: (r) => <strong>{fmt(r.balance)}</strong> },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Mặt hàng VPP', val: stock.length, sub: 'đang quản lý' },
        { lbl: 'Dưới mức tối thiểu', val: stock.filter((r) => r.currentStock <= r.minStock).length,
          sub: 'cần nhập thêm', tone: 'crit' },
        { lbl: 'Kho đang chọn',
          val: warehouses.find((w) => w.id === selectedWarehouse)?.warehouseName || '—',
          sub: 'kho vật tư' },
      ]} />

      <div className="ab-toolbar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            style={{ width: 220 }}
            placeholder="Chọn kho VPP"
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            options={warehouses.map((w) => ({ value: w.id, label: `${w.warehouseCode} — ${w.warehouseName}` }))}
          />
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm tên VPP, mã…" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
            format="DD/MM/YYYY"
            style={{ width: 240 }}
          />
          <Btn variant="ghost" icon="refresh" onClick={loadStock}>Làm mới</Btn>
        </div>
      </div>

      <DataTable<StockDto>
        columns={stockCols}
        data={filtered}
        rowKey={(r) => r.itemId}
        onRowClick={(r) => openCard(r.itemId)}
        actions={(r) => (
          <ActBtn ic="book" title="Xem thẻ kho" onClick={(e) => { e.stopPropagation(); openCard(r.itemId); }} />
        )}
        empty={stockLoading ? 'Đang tải…' : selectedWarehouse ? 'Không có hàng trong kho' : 'Chọn kho để xem tồn kho'}
      />

      {/* Stock card panel */}
      {cardOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={(e) => { if (e.target === e.currentTarget) setCardOpen(false); }}>
          <div style={{ background: 'var(--d-2)', borderRadius: 'var(--r-3)', padding: 24, width: 780, maxHeight: '80vh', overflow: 'auto' }}>
            {cardLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Đang tải thẻ kho…</div>
            ) : card ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Thẻ kho — {card.supplyName}</h3>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginTop: 4 }}>
                      Kho: {card.warehouseName} · ĐVT: {card.unit} ·
                      Tồn đầu: <strong>{fmt(card.openingBalance)}</strong> ·
                      Tồn cuối: <strong>{fmt(card.closingBalance)}</strong>
                    </div>
                  </div>
                  <Btn variant="ghost" onClick={() => setCardOpen(false)}>Đóng</Btn>
                </div>
                <DataTable<StockCardEntry>
                  columns={cardCols}
                  data={card.entries}
                  rowKey={(r) => `${r.date}-${r.reference}`}
                  empty="Không có phát sinh trong kỳ"
                />
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default VppStockCardV2;
