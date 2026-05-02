import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Modal } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import { getWarehouses } from '../api/warehouse';
import {
  KpiStrip, Filter, StatusBadge, Ico, tk, ti, tw,
} from './_v2kit';

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDepartments(((d as any)?.data?.items || (d as any)?.data || []) as Department[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setWarehouses(((w as any)?.data?.items || (w as any)?.data || []) as Warehouse[]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/inpatient-dispensing/batch', {
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
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${printData.receiptCode}</title>
<style>body{font-family:"Times New Roman",serif;padding:24px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #333;padding:4px 8px;font-size:13px}th{background:#eee}</style></head><body>
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
    w.document.write(html); w.document.close(); w.focus(); w.print();
  };

  const deptOpts = departments.map((d) => ({ v: d.id, l: d.departmentName }));
  const whOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  return (
    <div className="ab">
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
        <button className="ab-btn ghost" type="button" onClick={() => { setFilterDept(''); setWarehouseId(''); setNote(''); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
      </div>

      {groups.length === 0 && !loading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <div style={{ fontSize: 14 }}>Không có đơn thuốc nội trú chờ phát</div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        {groups.map((g) => {
          const sel = selectedIds[g.departmentId] || new Set();
          const expanded = expandedDepts.has(g.departmentId);
          return (
            <div key={g.departmentId} className="panel" style={{ padding: 0, marginBottom: 12 }}>
              <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <button
                  className="ab-btn primary"
                  type="button"
                  disabled={!warehouseId || sel.size === 0 || submitting}
                  onClick={() => submitBatch(g)}
                  style={{ marginLeft: 8 }}
                >
                  <Ico name="check" size={12} /> Xuất ({sel.size})
                </button>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ab-btn ghost" onClick={() => setPrintData(null)}>Đóng</button>
            <button type="button" className="ab-btn primary" onClick={handlePrint}>
              <Ico name="print" size={12} /> In phiếu
            </button>
          </div>
        }
      >
        {printData && (
          <div>
            <div style={{ marginBottom: 8 }}><b style={{ fontFamily: 'var(--font-mono)' }}>{printData.receiptCode}</b></div>
            <div style={{ fontSize: 12, color: 'var(--t-2)' }}>
              Kho xuất: {printData.warehouseName} → Khoa nhận: {printData.departmentName}
            </div>
            {printData.note && <div style={{ fontSize: 12, marginTop: 4 }}>{printData.note}</div>}
            <table className="ab-tbl" style={{ marginTop: 12 }}>
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
            <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
              Tổng: <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(printData.totalAmount || 0)} đ</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InpatientDispensingV2;
