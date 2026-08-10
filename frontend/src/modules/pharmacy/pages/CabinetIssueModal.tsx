/**
 * CabinetIssueModal — Shared modal for emergency cabinet (tủ trực) dispensing.
 *
 * Used in 3 contexts:
 *  - OpdEditor  (G-10a): examinationId is set; OPD doctor dispenses directly
 *  - TreatmentMonitorSection (G-10b): admissionId is set; inpatient ward nurse/doctor
 *  - Surgery    (G-10c): surgeryId is set; OR nurse records PTTT supply usage
 *
 * Flow:
 *  1. Caller opens modal with one context ID + patient display name.
 *  2. User selects cabinet warehouse (WarehouseType=4 from GET /warehouse/warehouses?warehouseType=4).
 *  3. User adds medicine/supply line-items via autocomplete search.
 *  4. Submit → POST /warehouse/issues/cabinet-issue → returns StockIssueDto.
 *  5. Optional print → GET /warehouse/issues/{id}/print (blob → new tab).
 *  6. Lists prior issues for the same context entity (filtered from issues list by notes tag).
 *
 * Props:
 *  open          — visibility
 *  onClose       — close without side-effects
 *  onSaved?      — callback after successful create
 *  patientName   — display label
 *  patientCode   — display label
 *  examinationId — OPD context (mutually exclusive with the others)
 *  admissionId   — inpatient context
 *  surgeryId     — surgery context
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AutoComplete, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { searchMedicines } from '../../opd/api/examination';
import type { MedicineDto } from '../../opd/api/examination';
import * as wh from '../api/warehouse';
import type { StockIssueDto, WarehouseDto } from '../api/warehouse';
import {
  ModalShell, Btn, DrSec, DrField,
  fmtDTg, tk, tw, te,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  _key: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

function emptyLine(): LineItem {
  return {
    _key: Math.random().toString(36).slice(2),
    itemId: '',
    itemCode: '',
    itemName: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
  };
}

// ── ItemPicker (debounced autocomplete) ────────────────────────────────────

export interface ItemPickerProps {
  warehouseId: string;
  onSelect: (med: MedicineDto) => void;
  value: string;
  onChange: (v: string) => void;
}

// Reusable medicine/supply autocomplete (debounced searchMedicines theo kho).
// Dùng lại ở G-07 toa về (TreatmentMonitorSection) — reuse > duplicate.
export const ItemPicker: React.FC<ItemPickerProps> = ({ warehouseId, onSelect, value, onChange }) => {
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
      placeholder="Tìm tên / mã thuốc…"
      allowClear
      filterOption={false}
      style={{ width: '100%' }}
    />
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface CabinetIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  patientName?: string;
  patientCode?: string;
  /** Exactly one context ID must be provided */
  examinationId?: string | null;
  admissionId?: string | null;
  surgeryId?: string | null;
}

export const CabinetIssueModal: React.FC<CabinetIssueModalProps> = ({
  open,
  onClose,
  onSaved,
  patientName,
  patientCode,
  examinationId,
  admissionId,
  surgeryId,
}) => {
  const [cabinets, setCabinets] = useState<WarehouseDto[]>([]);
  const [cabinetId, setCabinetId] = useState<string>('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [lastIssue, setLastIssue] = useState<StockIssueDto | null>(null);

  // Pick display names for line-item search placeholders
  const [lineLabels, setLineLabels] = useState<Record<string, string>>({});

  const loadCabinets = useCallback(async () => {
    try {
      // WarehouseType=4 → Tủ trực
      const res = await wh.getWarehouses(4);
      const list = (res.data as WarehouseDto[]) || [];
      setCabinets(list);
      if (list.length === 1) setCabinetId(list[0].id);
    } catch (e) {
      tw(friendlyErrorMessage(e, 'Không tải được danh sách tủ trực'));
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

  const updateLine = (key: string, patch: Partial<LineItem>) =>
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) =>
    setLines((ls) => ls.filter((l) => l._key !== key));

  const handleSave = async () => {
    if (!cabinetId) { tw('Chọn tủ trực trước'); return; }
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) { tw('Chưa có thuốc/vật tư nào'); return; }

    setSaving(true);
    try {
      const dto: wh.CreateCabinetIssueDto = {
        issueDate: dayjs().toISOString(),
        warehouseId: cabinetId,
        examinationId: examinationId ?? undefined,
        admissionId: admissionId ?? undefined,
        surgeryId: surgeryId ?? undefined,
        patientId: undefined, // resolved server-side from context
        notes: notes || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          paymentSource: 0,
        })),
      };
      const res = await wh.createCabinetIssue(dto);
      const issue = res.data as StockIssueDto;
      setLastIssue(issue);
      tk(`Đã xuất tủ trực · ${issue.issueCode}`);
      onSaved?.();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể xuất tủ trực');
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
      te('Không in được phiếu xuất tủ trực');
    } finally {
      setPrinting(false);
    }
  };

  const contextLabel = examinationId
    ? 'OPD (phòng khám)'
    : admissionId
      ? 'Nội trú'
      : surgeryId
        ? 'Ca mổ (PTTT)'
        : '—';

  const subtitle = [patientName, patientCode, contextLabel].filter(Boolean).join(' · ');
  const totalEst = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="package" size={14} />
          <span>Xuất tủ trực</span>
        </span>
      }
      sub={subtitle}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
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
      <DrSec title="Tủ trực">
        <DrField lbl="Kho tủ trực *">
          <Select
            value={cabinetId || undefined}
            onChange={setCabinetId}
            placeholder="Chọn tủ trực…"
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

      {/* Line items */}
      <DrSec title={`Thuốc / Vật tư (${lines.length} dòng)`} action={
        <Btn variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
          <TermIcon name="plus" size={11} /> Thêm
        </Btn>
      }>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--d-1)', borderBottom: '1px solid var(--line)' }}>
                {['Thuốc / Vật tư', 'ĐVT', 'Số lượng', 'Đ.giá (TK)', ''].map((h) => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l._key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '4px 4px', minWidth: 220 }}>
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
                  <td style={{ padding: '4px 4px', width: 60, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>{l.unit || '—'}</td>
                  <td style={{ padding: '4px 4px', width: 90 }}>
                    <InputNumber
                      value={l.quantity}
                      min={0.1}
                      step={1}
                      size="small"
                      style={{ width: '100%' }}
                      onChange={(v) => updateLine(l._key, { quantity: v ?? 1 })}
                    />
                  </td>
                  <td style={{ padding: '4px 4px', width: 110, color: 'var(--t-2)', fontSize: 'var(--fs-xs)', textAlign: 'right' }}>
                    {l.unitPrice > 0 ? l.unitPrice.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={{ padding: '4px 4px', width: 32 }}>
                    {lines.length > 1 && (
                      <RowActions actions={[
                        { key: 'del', icon: 'trash', label: 'Xóa dòng thuốc', tone: 'danger', confirm: false, onClick: () => removeLine(l._key) },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalEst > 0 && (
          <div style={{ textAlign: 'right', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-6)', color: 'var(--t-1)' }}>
            Tổng dự tính: <b>{totalEst.toLocaleString('vi-VN')} ₫</b>
          </div>
        )}
      </DrSec>

      {/* Notes */}
      <DrSec title="Ghi chú">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú thêm…"
          style={{ width: '100%', minHeight: 48, padding: 'var(--space-6)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }}
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

export default CabinetIssueModal;
