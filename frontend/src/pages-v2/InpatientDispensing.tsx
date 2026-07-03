import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Modal } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { openPrintWindow } from '../utils/printWindow';
import systemApi from '../api/system';
import { getWarehouses } from '../api/warehouse';
import { PharmacyExpiryBanner } from '../components/PharmacyExpiryBanner';
import { unwrapList, type MaybePaged } from '../utils/apiNormalize';
import {
  KpiStrip, Filter, StatusBadge, Btn, Ico, tk, ti, tw,
} from './_v2kit';

interface BatchDispenseResponse {
  receiptCode?: string;
  exportReceiptId?: string;
  totalAmount?: number;
}

interface PendingItem {
  id: string; medicineId: string; medicineName: string; medicineCode: string;
  quantity: number; unit?: string; unitPrice: number;
}
interface PendingPrescription {
  id: string; prescriptionCode: string; prescriptionDate: string;
  patientCode: string; patientName: string; medicalRecordCode: string;
  warehouseId?: string; items: PendingItem[];
}
interface PendingGroup {
  departmentId: string; departmentName: string;
  totalPrescriptions: number; totalItems: number; totalAmount: number;
  prescriptions: PendingPrescription[];
}
interface Department { id: string; departmentName: string }
interface Warehouse { id: string; warehouseName: string }

interface PrintData {
  receiptCode: string; receiptDate: string; warehouseName?: string;
  departmentName?: string; note?: string; totalAmount?: number;
  items: Array<{ id: string; medicineName: string; medicineCode: string; batchNumber?: string;
    expiryDate?: string; quantity: number; unit?: string; unitPrice?: number; amount?: number }>;
}

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const InpatientDispensingV2: React.FC = () => {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, Set<string>>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDept) params.departmentId = filterDept;
      if (warehouseId) params.warehouseId = warehouseId;
      const { data } = await apiClient.get<PendingGroup[]>('/inpatient-dispensing/pending', { params });
      setGroups(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [filterDept, warehouseId]);

  useEffect(() => {
    (async () => {
      try {
        const [d, w] = await Promise.all([systemApi.catalog.getDepartments(), getWarehouses(1)]);
        setDepartments(unwrapList<Department>((d as { data?: MaybePaged<Department> }).data));
        setWarehouses(unwrapList<Warehouse>((w as { data?: MaybePaged<Warehouse> }).data));
      } catch { /* empty */ }
    })();
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalAmount = useMemo(() => groups.reduce((s, g) => s + g.totalAmount, 0), [groups]);
  const totalPres = useMemo(() => groups.reduce((s, g) => s + g.totalPrescriptions, 0), [groups]);

  const toggleSelect = (deptId: string, prId: string) => {
    setSelectedIds((prev) => {
      const cur = new Set(prev[deptId] || []);
      if (cur.has(prId)) cur.delete(prId); else cur.add(prId);
      return { ...prev, [deptId]: cur };
    });
  };

  const toggleAll = (g: PendingGroup) => {
    setSelectedIds((prev) => {
      const cur = new Set(prev[g.departmentId] || []);
      if (g.prescriptions.every((p) => cur.has(p.id))) {
        g.prescriptions.forEach((p) => cur.delete(p.id));
      } else {
        g.prescriptions.forEach((p) => cur.add(p.id));
      }
      return { ...prev, [g.departmentId]: cur };
    });
  };

  const submitBatch = async (g: PendingGroup) => {
    const ids = Array.from(selectedIds[g.departmentId] || []);
    if (ids.length === 0) { tw('Chưa chọn đơn thuốc'); return; }
    if (!warehouseId) { tw('Chọn kho xuất trước'); return; }
    setSubmitting(true);
    try {
      const { data }: { data: BatchDispenseResponse } = await apiClient.post('/inpatient-dispensing/batch', {
        warehouseId, departmentId: g.departmentId, prescriptionIds: ids, note,
      });
      tk(`Đã tạo phiếu ${data.receiptCode} (${ids.length} đơn, ${fmt(data.totalAmount || 0)}đ)`);
      setSelectedIds((prev) => ({ ...prev, [g.departmentId]: new Set() }));
      const { data: detail } = await apiClient.get<PrintData>(`/inpatient-dispensing/receipt/${data.exportReceiptId}`);
      setPrintData(detail);
      load();
    } catch { tw('Tạo phiếu thất bại'); }
    finally { setSubmitting(false); }
  };

  const handlePrint = () => {
    if (!printData) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${printData.receiptCode}</title>
<style>body{font-family:"Times New Roman",serif;padding:'var(--space-24)'px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #333;padding:'var(--space-4)'px 8px;font-size:13px}th{background:#eee}</style></head><body>
<h2>PHIẾU LĨNH THUỐC NỘI TRÚ</h2>
<p>Số: <b>${printData.receiptCode}</b> &nbsp; Ngày: ${dayjs(printData.receiptDate).format('DD/MM/YYYY HH:mm')}</p>
<p>Kho xuất: <b>${printData.warehouseName || ''}</b> &nbsp; Khoa nhận: <b>${printData.departmentName || ''}</b></p>
<p>${printData.note || ''}</p>
<table><thead><tr><th>STT</th><th>Tên thuốc</th><th>Mã</th><th>Lô</th><th>HSD</th><th>SL</th><th>ĐV</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>
${(printData.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${it.medicineName}</td><td>${it.medicineCode}</td><td>${it.batchNumber || ''}</td><td>${it.expiryDate ? dayjs(it.expiryDate).format('DD/MM/YYYY') : ''}</td><td style="text-align:right">${it.quantity}</td><td>${it.unit || ''}</td><td style="text-align:right">${fmt(it.unitPrice || 0)}</td><td style="text-align:right">${fmt(it.amount || 0)}</td></tr>`).join('')}
</tbody></table>
<p style="text-align:right;margin-top:12px"><b>Tổng cộng: ${fmt(printData.totalAmount || 0)}đ</b></p>
<div style="display:flex;justify-content:space-around;margin-top:60px"><div>Người lập</div><div>Trưởng khoa</div><div>Thủ kho</div><div>Người nhận</div></div>
</body></html>`;
    openPrintWindow(html, { focus: true, print: 'immediate' });
  };

  const deptOpts = departments.map((d) => ({ v: d.id, l: d.departmentName }));
  const whOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  return (
    <div className="ab">
      {/* #352 P4: parity v1 — cảnh báo HSD thuốc (safety-notice) */}
      <PharmacyExpiryBanner asModalOnFirstVisit sessionKey="pharmacy-module-expiry-shown" />
      <KpiStrip items={[
        { lbl: 'Khoa chờ phát', val: groups.length, sub: 'tất cả khoa', tone: 'info' },
        { lbl: 'Tổng đơn thuốc', val: totalPres, sub: 'cần xuất', tone: 'warn' },
        { lbl: 'Tổng dòng thuốc', val: groups.reduce((s, g) => s + g.totalItems, 0), sub: 'mặt hàng', tone: 'ok' },
        { lbl: 'Tổng tiền', val: Math.round(totalAmount / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Filter value={warehouseId} onChange={setWarehouseId} options={whOpts} placeholder="▾ Kho xuất" />
        <Filter value={filterDept} onChange={setFilterDept} options={deptOpts} placeholder="▾ Lọc khoa" />
        <Input placeholder="Ghi chú phiếu" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 240 }} />
        <Btn variant="ghost" icon="x" onClick={() => { setFilterDept(''); setWarehouseId(''); setNote(''); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
      </div>

      {groups.length === 0 && !loading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <div style={{ fontSize: 14 }}>Không có đơn thuốc nội trú chờ phát</div>
        </div>
      )}

      <div style={{ padding: 'var(--space-16)' }}>
        {groups.map((g) => {
          const sel = selectedIds[g.departmentId] || new Set();
          const expanded = expandedDepts.has(g.departmentId);
          return (
            <div key={g.departmentId} className="panel" style={{ padding: 0, marginBottom: 'var(--space-12)' }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                <button className="ab-iconbtn" type="button" onClick={() => {
                  const n = new Set(expandedDepts);
                  if (n.has(g.departmentId)) n.delete(g.departmentId); else n.add(g.departmentId);
                  setExpandedDepts(n);
                }}>
                  <Ico name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
                </button>
                <b style={{ flex: 1 }}>{g.departmentName}</b>
                <StatusBadge tone="info">{g.totalPrescriptions} đơn</StatusBadge>
                <StatusBadge tone="ok">{g.totalItems} dòng</StatusBadge>
                <span style={{ color: 'var(--a-em-text)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {fmt(g.totalAmount)} đ
                </span>
                <Btn
                  variant="primary"
                  icon="check"
                  disabled={!warehouseId || sel.size === 0 || submitting}
                  onClick={() => submitBatch(g)}
                  style={{ marginLeft: 'var(--space-8)' }}
                >Xuất ({sel.size})</Btn>
              </div>
              {expanded && (
                <table className="ab-tbl">
                  <thead>
                    <tr>
                      <th className="ck">
                        <input type="checkbox"
                          checked={g.prescriptions.length > 0 && g.prescriptions.every((p) => sel.has(p.id))}
                          onChange={() => toggleAll(g)} />
                      </th>
                      <th>Mã đơn</th><th>Ngày</th><th>Mã BN</th><th>Họ tên</th><th>HSBA</th><th>SL thuốc</th><th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.prescriptions.map((p) => {
                      const total = p.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
                      return (
                        <tr key={p.id} className={sel.has(p.id) ? 'on' : ''}>
                          <td className="ck">
                            <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleSelect(g.departmentId, p.id)} />
                          </td>
                          <td className="mono">{p.prescriptionCode}</td>
                          <td className="mono">{dayjs(p.prescriptionDate).format('DD/MM/YYYY')}</td>
                          <td className="mono">{p.patientCode}</td>
                          <td>{p.patientName}</td>
                          <td className="mono">{p.medicalRecordCode}</td>
                          <td className="mono">{p.items.length}</td>
                          <td className="mono">{fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!printData}
        title="Phiếu xuất tổng hợp"
        onCancel={() => setPrintData(null)}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
            <Btn variant="ghost" onClick={() => setPrintData(null)}>Đóng</Btn>
            <Btn variant="primary" icon="print" onClick={handlePrint}>In phiếu</Btn>
          </div>
        }
      >
        {printData && (
          <div>
            <div style={{ marginBottom: 'var(--space-8)' }}><b style={{ fontFamily: 'var(--font-mono)' }}>{printData.receiptCode}</b></div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              Kho xuất: {printData.warehouseName} → Khoa nhận: {printData.departmentName}
            </div>
            {printData.note && <div style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-4)' }}>{printData.note}</div>}
            <table className="ab-tbl" style={{ marginTop: 'var(--space-12)' }}>
              <thead><tr><th>Thuốc</th><th>Lô</th><th>HSD</th><th>SL</th><th>ĐV</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {(printData.items || []).map((it) => (
                  <tr key={it.id}>
                    <td>{it.medicineName}</td>
                    <td className="mono">{it.batchNumber || '—'}</td>
                    <td className="mono">{it.expiryDate ? dayjs(it.expiryDate).format('DD/MM/YYYY') : '—'}</td>
                    <td className="mono">{it.quantity}</td>
                    <td>{it.unit || ''}</td>
                    <td className="mono">{fmt(it.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 'var(--space-12)', fontWeight: 600 }}>
              Tổng: <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(printData.totalAmount || 0)} đ</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InpatientDispensingV2;
