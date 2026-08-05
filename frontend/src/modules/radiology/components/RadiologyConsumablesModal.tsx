/**
 * Phiếu kê thuốc cản quang / vật tư thực dùng cho một ca chụp CĐHA.
 * Kê tay hoặc sinh nhanh từ định mức của dịch vụ (khai ở Quản trị RIS › Định mức vật tư).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Input, InputNumber, Select } from 'antd';
import {
  ModalShell, DataTable, StatusBadge, ActBtn, Btn, Ico, SearchBox,
  tk, tw, cf, fmtVNDg, fmtDMYg, type ColumnDef,
} from '@/_v2kit';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import {
  getRadiologyPrescriptions, createRadiologyPrescription, updateRadiologyPrescription,
  deleteRadiologyPrescription, createPrescriptionFromNorm, searchItems,
  type RadiologyPrescriptionDto, type RadiologyPrescriptionItemDto, type ItemSearchResultDto,
} from '../api/ris/prescription';
import { getWarehouses, type WarehouseDto } from '../../pharmacy/api/warehouse';

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderCode?: string;
  patientName?: string;
  serviceName?: string;
}

/** Dòng đang soạn — `id` rỗng nghĩa là dòng mới thêm, chưa lưu. */
interface DraftLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit?: string;
  quantity: number;
  price: number;
  note?: string;
}

const toDraft = (i: RadiologyPrescriptionItemDto): DraftLine => ({
  itemId: i.itemId,
  itemCode: i.itemCode,
  itemName: i.itemName,
  unit: i.unit,
  quantity: i.quantity,
  price: i.price,
  note: i.note,
});

const RadiologyConsumablesModal: React.FC<Props> = ({
  open, onClose, orderId, orderCode, patientName, serviceName,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [prescriptions, setPrescriptions] = useState<RadiologyPrescriptionDto[]>([]);
  const [editing, setEditing] = useState<RadiologyPrescriptionDto | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [found, setFound] = useState<ItemSearchResultDto[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data } = await getRadiologyPrescriptions(orderId);
      const list = normalizeArrayResponse<RadiologyPrescriptionDto>(data);
      setPrescriptions(list);
      const draft = list.find((p) => p.status === 'Nháp') || null;
      setEditing(draft);
      setLines(draft ? draft.items.map(toDraft) : []);
    } catch { setPrescriptions([]); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => {
    if (!open) return;
    getWarehouses()
      .then(({ data }) => {
        const list = normalizeArrayResponse<WarehouseDto>(data);
        setWarehouses(list);
        setWarehouseId((prev) => prev || list[0]?.id || '');
      })
      .catch(() => setWarehouses([]));
    load();
  }, [open, load]);

  const runSearch = useCallback(async () => {
    if (!warehouseId) { tw('Chọn kho xuất trước'); return; }
    setSearching(true);
    try {
      const { data } = await searchItems(keyword, warehouseId);
      setFound(normalizeArrayResponse<ItemSearchResultDto>(data));
    } catch { setFound([]); tw('Tìm thuốc/vật tư thất bại'); }
    finally { setSearching(false); }
  }, [keyword, warehouseId]);

  const addLine = (it: ItemSearchResultDto) => {
    if (lines.some((l) => l.itemId === it.id)) { tw('Đã có trong phiếu'); return; }
    setLines((prev) => [...prev, {
      itemId: it.id, itemCode: it.code, itemName: it.name,
      unit: it.unit, quantity: 1, price: it.price,
    }]);
    setPicker(false);
  };

  const patchLine = (itemId: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!warehouseId) { tw('Chọn kho xuất'); return; }
    if (lines.length === 0) { tw('Phiếu kê phải có ít nhất một dòng'); return; }
    const invalid = lines.find((l) => !(l.quantity > 0));
    if (invalid) { tw(`Số lượng của "${invalid.itemName}" phải lớn hơn 0`); return; }

    setSaving(true);
    try {
      const items = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, note: l.note }));
      if (editing) await updateRadiologyPrescription(editing.id, { items });
      else await createRadiologyPrescription({ orderItemId: orderId, warehouseId, items });
      tk('Đã lưu phiếu kê vật tư');
      load();
    } catch (e) {
      tw((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Lưu phiếu kê thất bại');
    } finally { setSaving(false); }
  };

  const fromNorm = async () => {
    if (!warehouseId) { tw('Chọn kho xuất trước'); return; }
    setSaving(true);
    try {
      await createPrescriptionFromNorm(orderId, warehouseId);
      tk('Đã sinh phiếu kê từ định mức');
      load();
    } catch (e) {
      tw((e as { response?: { data?: { message?: string } } }).response?.data?.message
        || 'Dịch vụ này chưa khai định mức tiêu hao');
    } finally { setSaving(false); }
  };

  const removePrescription = (p: RadiologyPrescriptionDto) =>
    cf(`Xóa phiếu kê ${fmtDMYg(p.prescriptionDate)} (${fmtVNDg(p.totalAmount)})?`, async () => {
      try { await deleteRadiologyPrescription(p.id); tk('Đã xóa phiếu kê'); load(); }
      catch { tw('Không xóa được phiếu kê'); }
    }, { tone: 'crit', confirm: 'Xóa' });

  const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);

  const lineCols: ColumnDef<DraftLine>[] = [
    { key: 'code', label: 'Mã', code: true, width: 120, render: (l) => l.itemCode || '—' },
    { key: 'name', label: 'Thuốc / vật tư', render: (l) => <b>{l.itemName}</b> },
    { key: 'unit', label: 'ĐVT', width: 80, render: (l) => l.unit || '—' },
    {
      key: 'qty', label: 'Số lượng', width: 130,
      render: (l) => (
        <InputNumber size="small" min={0} step={0.5} value={l.quantity} style={{ width: 100 }}
          onChange={(v) => patchLine(l.itemId, { quantity: Number(v) || 0 })} />
      ),
    },
    { key: 'price', label: 'Đơn giá', width: 120, render: (l) => fmtVNDg(l.price) },
    { key: 'amount', label: 'Thành tiền', width: 130, render: (l) => fmtVNDg(l.quantity * l.price) },
    {
      key: 'note', label: 'Ghi chú',
      render: (l) => (
        <Input size="small" value={l.note} placeholder="—"
          onChange={(e) => patchLine(l.itemId, { note: e.target.value })} />
      ),
    },
  ];

  const foundCols: ColumnDef<ItemSearchResultDto>[] = [
    { key: 'code', label: 'Mã', code: true, width: 120, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'unit', label: 'ĐVT', width: 80, render: (r) => r.unit || '—' },
    { key: 'price', label: 'Đơn giá', width: 120, render: (r) => fmtVNDg(r.price) },
    { key: 'stock', label: 'Tồn khả dụng', width: 130, render: (r) => r.stockQuantity },
    { key: 'lot', label: 'Lô gần hết hạn', width: 150, mono: true, render: (r) => r.lotNumber || '—' },
  ];

  const savedCols: ColumnDef<RadiologyPrescriptionDto>[] = [
    { key: 'date', label: 'Ngày kê', width: 120, render: (p) => fmtDMYg(p.prescriptionDate) },
    { key: 'lines', label: 'Số dòng', width: 100, render: (p) => p.items.length },
    { key: 'total', label: 'Tổng tiền', width: 140, render: (p) => fmtVNDg(p.totalAmount) },
    { key: 'by', label: 'Người kê', render: (p) => p.doctorName || '—' },
    {
      key: 'st', label: 'Trạng thái', width: 120,
      render: (p) => (p.status === 'Đã chốt'
        ? <StatusBadge tone="ok" dot>{p.status}</StatusBadge>
        : <StatusBadge tone="warn" dot>{p.status}</StatusBadge>),
    },
  ];

  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        size="lg"
        title={`Vật tư ca chụp · ${orderCode || ''}`}
        sub={[patientName, serviceName].filter(Boolean).join(' · ')}
        footer={<>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" onClick={save} disabled={saving || loading}>
            <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : editing ? 'Cập nhật phiếu' : 'Lưu phiếu kê'}
          </Btn>
        </>}
      >
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Select style={{ minWidth: 240 }} placeholder="— Kho xuất —"
            value={warehouseId || undefined} onChange={setWarehouseId} showSearch optionFilterProp="label"
            options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))} />
          <Btn onClick={() => { setFound([]); setKeyword(''); setPicker(true); }} disabled={!warehouseId}>
            <Ico name="plus" size={12} /> Thêm dòng
          </Btn>
          <Btn onClick={fromNorm} disabled={!warehouseId || saving}>
            <Ico name="medicine" size={12} /> Sinh từ định mức
          </Btn>
          <span className="spacer" />
          <span style={{ fontWeight: 600 }}>Tổng: {fmtVNDg(total)}</span>
        </div>

        <DataTable<DraftLine> columns={lineCols} data={lines} rowKey={(l) => l.itemId}
          actions={(l) => (
            <div className="ab-actions">
              <ActBtn ic="trash" title="Bỏ dòng" tone="crit"
                onClick={() => setLines((prev) => prev.filter((x) => x.itemId !== l.itemId))} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa kê thuốc/vật tư nào cho ca chụp này'} />

        {prescriptions.length > 0 && (
          <>
            <div className="ab-toolbar">
              <span style={{ fontWeight: 600 }}>Phiếu kê đã lưu</span>
            </div>
            <DataTable<RadiologyPrescriptionDto> columns={savedCols} data={prescriptions} rowKey={(p) => p.id}
              actions={(p) => (
                <div className="ab-actions">
                  {p.status !== 'Đã chốt' && (
                    <ActBtn ic="edit" title="Sửa phiếu này"
                      onClick={() => { setEditing(p); setLines(p.items.map(toDraft)); }} />
                  )}
                  {p.status !== 'Đã chốt' && (
                    <ActBtn ic="trash" title="Xóa phiếu" tone="crit" onClick={() => removePrescription(p)} />
                  )}
                </div>
              )}
              empty="—" />
          </>
        )}
      </ModalShell>

      <ModalShell open={picker} onClose={() => setPicker(false)} size="lg"
        title="Chọn thuốc / vật tư"
        sub={warehouses.find((w) => w.id === warehouseId)?.warehouseName || ''}
        footer={<Btn variant="ghost" onClick={() => setPicker(false)}>Đóng</Btn>}>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo mã hoặc tên…" minWidth={280} />
          <Btn onClick={runSearch} disabled={searching}>
            <Ico name="search" size={12} /> {searching ? 'Đang tìm…' : 'Tìm'}
          </Btn>
        </div>
        <DataTable<ItemSearchResultDto> columns={foundCols} data={found} rowKey={(r) => r.id}
          onRowClick={addLine}
          empty={searching ? 'Đang tìm…' : 'Nhập từ khoá rồi bấm Tìm'} />
      </ModalShell>
    </>
  );
};

export default RadiologyConsumablesModal;
