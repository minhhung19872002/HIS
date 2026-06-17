/**
 * SurgeryCabinetIssueModal — Phiếu xuất thuốc/VTYT phòng mổ phân đối tượng
 *
 * Mở rộng từ CabinetIssueModal (G-10c):
 *  - Dùng trong context surgeryId (Ca mổ / PTTT)
 *  - Mỗi dòng thuốc/VTYT chọn RIÊNG đối tượng thanh toán:
 *      0 = Hao phí (không tính tiền bệnh nhân)
 *      1 = Thu phí (bệnh nhân tự trả)
 *      2 = BHYT không thanh toán (BN trả ngoài BHYT)
 *
 * API: POST /warehouse/issues/cabinet-issue (same as CabinetIssueModal)
 *      items[].paymentSource truyền đúng giá trị đã chọn
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AutoComplete, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { searchMedicines } from '../../api/examination';
import type { MedicineDto } from '../../api/examination';
import * as wh from '../../api/warehouse';
import type { StockIssueDto, WarehouseDto } from '../../api/warehouse';
import {
  ModalShell, Btn, DrSec, DrField,
  fmtDTg, tk, tw, te,
} from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';

// ── Constants ──────────────────────────────────────────────────────────────

const PAYMENT_SOURCE_OPTIONS = [
  { value: 0, label: 'Hao phí' },
  { value: 1, label: 'Thu phí' },
  { value: 2, label: 'BHYT KTC' },
] as const;

const PAYMENT_SOURCE_COLORS: Record<number, string> = {
  0: 'var(--t-2)',      // grey — hao phí
  1: 'var(--a-cy)',     // cyan — thu phí
  2: 'var(--a-pu)',     // purple — BHYT không thanh toán
};

// ── Types ──────────────────────────────────────────────────────────────────

interface SurgLineItem {
  _key: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  paymentSource: 0 | 1 | 2;
}

function emptyLine(): SurgLineItem {
  return {
    _key: Math.random().toString(36).slice(2),
    itemId: '',
    itemCode: '',
    itemName: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    paymentSource: 0,
  };
}

// ── ItemPicker ─────────────────────────────────────────────────────────────

interface ItemPickerProps {
  warehouseId: string;
  onSelect: (med: MedicineDto) => void;
  value: string;
  onChange: (v: string) => void;
}

const ItemPicker: React.FC<ItemPickerProps> = ({ warehouseId, onSelect, value, onChange }) => {
  const [options, setOptions] = useState<{ value: string; label: string; med: MedicineDto }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (kw: string) => {
    onChange(kw);
    if (timer.current) clearTimeout(timer.current);
    if (!kw.trim()) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await searchMedicines(kw.trim(), warehouseId || undefined, 20);
        const meds = (res.data as MedicineDto[]) || [];
        setOptions(meds.map((m) => ({
          value: m.name,
          label: `[${m.code}] ${m.name}${m.unit ? ` · ${m.unit}` : ''} (tồn: ${m.availableQuantity ?? '?'})`,
          med: m,
        })));
      } catch {
        setOptions([]);
      }
    }, 280);
  };

  return (
    <AutoComplete
      value={value}
      options={options}
      onChange={onChange}
      onSearch={handleSearch}
      onSelect={(_v, opt) => { onSelect((opt as typeof options[number]).med); }}
      placeholder="Tìm tên / mã thuốc, VTYT…"
      allowClear
      filterOption={false}
      style={{ width: '100%' }}
    />
  );
};

// ── Main component ──────────────────────────────────────────────────────────

export interface SurgeryCabinetIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  patientName?: string;
  patientCode?: string;
  surgeryId: string;
}

export const SurgeryCabinetIssueModal: React.FC<SurgeryCabinetIssueModalProps> = ({
  open,
  onClose,
  onSaved,
  patientName,
  patientCode,
  surgeryId,
}) => {
  const [cabinets, setCabinets] = useState<WarehouseDto[]>([]);
  const [cabinetId, setCabinetId] = useState<string>('');
  const [lines, setLines] = useState<SurgLineItem[]>([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [lastIssue, setLastIssue] = useState<StockIssueDto | null>(null);
  const [lineLabels, setLineLabels] = useState<Record<string, string>>({});

  const loadCabinets = useCallback(async () => {
    try {
      const res = await wh.getWarehouses(4); // WarehouseType=4 → Tủ trực
      const list = (res.data as WarehouseDto[]) || [];
      setCabinets(list);
      if (list.length === 1) setCabinetId(list[0].id);
    } catch {
      setCabinets([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadCabinets();
      setLines([emptyLine()]);
      setNotes('');
      setCabinetId('');
      setLastIssue(null);
      setLineLabels({});
    }
  }, [open, loadCabinets]);

  const updateLine = (key: string, patch: Partial<SurgLineItem>) =>
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) =>
    setLines((ls) => ls.filter((l) => l._key !== key));

  const handleSave = async () => {
    if (!cabinetId) { tw('Chọn tủ trực / kho phòng mổ trước'); return; }
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) { tw('Chưa có thuốc/VTYT nào'); return; }

    setSaving(true);
    try {
      const dto: wh.CreateCabinetIssueDto = {
        issueDate: dayjs().toISOString(),
        warehouseId: cabinetId,
        surgeryId,
        patientId: undefined,
        notes: notes || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          paymentSource: l.paymentSource,
        })),
      };
      const res = await wh.createCabinetIssue(dto);
      const issue = res.data as StockIssueDto;
      setLastIssue(issue);
      tk(`Đã xuất phòng mổ · ${issue.issueCode}`);
      onSaved?.();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể xuất kho phòng mổ');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!lastIssue) return;
    setPrinting(true);
    try {
      const res = await wh.printStockIssue(lastIssue.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      te('Không in được phiếu xuất phòng mổ');
    } finally {
      setPrinting(false);
    }
  };

  const subtitle = [patientName, patientCode, 'Ca mổ (PTTT)'].filter(Boolean).join(' · ');

  // Summary by paymentSource
  const summaryBySource = PAYMENT_SOURCE_OPTIONS.map(({ value, label }) => {
    const total = lines
      .filter((l) => l.paymentSource === value && l.itemId)
      .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    return { value, label, total };
  }).filter((s) => s.total > 0);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TermIcon name="package" size={14} />
          <span>Xuất thuốc/VTYT phòng mổ</span>
        </span>
      }
      sub={subtitle}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {lastIssue && (
            <Btn variant="ghost" size="sm" loading={printing} onClick={() => { void handlePrint(); }}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" size="sm" loading={saving} disabled={!cabinetId} onClick={() => { void handleSave(); }}>
            <TermIcon name="check" size={12} /> Xuất kho
          </Btn>
        </div>
      }
    >
      {/* Cabinet selector */}
      <DrSec title="Kho / Tủ trực phòng mổ">
        <DrField lbl="Kho tủ trực *">
          <Select
            value={cabinetId || undefined}
            onChange={setCabinetId}
            placeholder="Chọn tủ trực / kho phòng mổ…"
            style={{ width: '100%' }}
            options={cabinets.map((c) => ({ value: c.id, label: `${c.warehouseCode} · ${c.warehouseName}` }))}
            showSearch
            filterOption={(q, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(q.toLowerCase())
            }
            notFoundContent={cabinets.length === 0 ? 'Không có tủ trực nào' : 'Không tìm thấy'}
          />
        </DrField>
      </DrSec>

      {/* Line items with per-line paymentSource */}
      <DrSec
        title={`Thuốc / VTYT (${lines.length} dòng)`}
        action={
          <Btn variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            <TermIcon name="plus" size={11} /> Thêm
          </Btn>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--d-1)', borderBottom: '1px solid var(--line)' }}>
                {['Thuốc / Vật tư', 'ĐVT', 'SL', 'Đ.giá', 'Đối tượng TT', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '4px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      fontSize: 'var(--fs-xs)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l._key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '4px 4px', minWidth: 200 }}>
                    <ItemPicker
                      warehouseId={cabinetId}
                      value={lineLabels[l._key] ?? ''}
                      onChange={(v) => setLineLabels((m) => ({ ...m, [l._key]: v }))}
                      onSelect={(med) => {
                        setLineLabels((m) => ({ ...m, [l._key]: med.name }));
                        updateLine(l._key, {
                          itemId: med.id,
                          itemCode: med.code,
                          itemName: med.name,
                          unit: med.unit ?? '',
                          unitPrice: med.unitPrice ?? 0,
                        });
                      }}
                    />
                  </td>
                  <td style={{ padding: '4px 4px', width: 55, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>
                    {l.unit || '—'}
                  </td>
                  <td style={{ padding: '4px 4px', width: 80 }}>
                    <InputNumber
                      value={l.quantity}
                      min={0.1}
                      step={1}
                      size="small"
                      style={{ width: '100%' }}
                      onChange={(v) => updateLine(l._key, { quantity: v ?? 1 })}
                    />
                  </td>
                  <td style={{ padding: '4px 4px', width: 100, color: 'var(--t-2)', fontSize: 'var(--fs-xs)', textAlign: 'right' }}>
                    {l.unitPrice > 0 ? l.unitPrice.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={{ padding: '4px 4px', width: 120 }}>
                    <Select<0 | 1 | 2>
                      value={l.paymentSource}
                      onChange={(v) => updateLine(l._key, { paymentSource: v })}
                      size="small"
                      style={{ width: '100%', color: PAYMENT_SOURCE_COLORS[l.paymentSource] }}
                      options={PAYMENT_SOURCE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: (
                          <span style={{ color: PAYMENT_SOURCE_COLORS[o.value], fontWeight: 500 }}>
                            {o.label}
                          </span>
                        ),
                      }))}
                    />
                  </td>
                  <td style={{ padding: '4px 4px', width: 32 }}>
                    {lines.length > 1 && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(l._key)}
                        style={{ color: 'var(--s-crit)' }}
                      >
                        <TermIcon name="x" size={11} />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary totals by payment source */}
        {summaryBySource.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 16, justifyContent: 'flex-end', fontSize: 'var(--fs-sm)' }}>
            {summaryBySource.map(({ value, label, total }) => (
              <span key={value} style={{ color: PAYMENT_SOURCE_COLORS[value] }}>
                <b>{label}:</b> {total.toLocaleString('vi-VN')} ₫
              </span>
            ))}
          </div>
        )}
      </DrSec>

      {/* Notes */}
      <DrSec title="Ghi chú">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú thêm (thuốc bị vỡ, dùng cấp cứu…)…"
          style={{
            width: '100%',
            minHeight: 48,
            padding: 6,
            border: '1px solid var(--line)',
            borderRadius: 4,
            fontSize: 'var(--fs-sm)',
            background: 'var(--d-0)',
            color: 'var(--t-0)',
          }}
        />
      </DrSec>

      {/* Last created issue summary */}
      {lastIssue && (
        <DrSec title="Phiếu xuất vừa tạo">
          <div style={{ fontSize: 'var(--fs-sm)', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px 8px' }}>
            <span style={{ color: 'var(--t-2)' }}>Mã phiếu</span>
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{lastIssue.issueCode}</span>
            <span style={{ color: 'var(--t-2)' }}>Thời gian</span>
            <span>{fmtDTg(lastIssue.issueDate)}</span>
            <span style={{ color: 'var(--t-2)' }}>Số dòng</span>
            <span>{lastIssue.items?.length ?? 0} thuốc/VTYT</span>
            <span style={{ color: 'var(--t-2)' }}>Tổng tiền</span>
            <b>{(lastIssue.totalAmount ?? 0).toLocaleString('vi-VN')} ₫</b>
          </div>
        </DrSec>
      )}
    </ModalShell>
  );
};

export default SurgeryCabinetIssueModal;
