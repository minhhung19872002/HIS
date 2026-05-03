import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Checkbox } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { getWarehouses } from '../api/warehouse';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, StatusBadge,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

interface Request {
  id: string; requestCode: string; patientCode: string; patientName: string;
  serviceName: string; bodyPart?: string; status: number; requestDate: string;
  medicalRecordId?: string; patientId: string; contrast?: boolean; priority?: number;
}
interface Service { id: string; serviceCode: string; serviceName: string; unitPrice: number }
interface Medicine { id: string; medicineCode: string; medicineName: string; unit?: string; unitPrice: number }
interface Supply { id: string; supplyCode: string; supplyName: string; unit?: string; unitPrice: number }
interface Warehouse { id: string; warehouseName: string }

type Tab = 'add-on' | 'dispense';
const TABS = [
  { v: 'add-on' as Tab,   l: 'Chỉ định thêm (N1.14)',     ic: 'plus' },
  { v: 'dispense' as Tab, l: 'Xuất thuốc tại phòng (N1.15)', ic: 'medicine' },
];

const RadiologyOpsV2: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [selected, setSelected] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('add-on');

  const [services, setServices] = useState<Service[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [addOnForm] = Form.useForm();
  const [dispenseForm] = Form.useForm();

  const search = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get('/radiology/requests/search', { params: { keyword, pageSize: 20 } })
        .catch(async () => {
          const { data } = await apiClient.get('/radiology/orders', { params: { keyword, pageSize: 20 } });
          return { data };
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (data as any)?.items || data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRequests(items.map((r: any) => ({
        id: r.id,
        requestCode: r.requestCode || r.orderCode || r.code,
        patientCode: r.patientCode || r.patient?.patientCode,
        patientName: r.patientName || r.patient?.fullName || '',
        serviceName: r.serviceName || r.service?.serviceName || '',
        bodyPart: r.bodyPart, status: r.status,
        requestDate: r.requestDate || r.createdAt,
        medicalRecordId: r.medicalRecordId, patientId: r.patientId,
        contrast: r.contrast, priority: r.priority,
      })));
    } catch { ti('Tìm kiếm thất bại'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => {
    (async () => {
      try { const { data: s } = await apiClient.get('/catalog/paraclinical-services', { params: { serviceType: 3, isActive: true, pageSize: 500 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setServices(Array.isArray(s) ? (s as Service[]) : ((s as any)?.items ?? [])); } catch { /* empty */ }
      try { const { data: m } = await apiClient.get('/catalog/medicines', { params: { isActive: true, pageSize: 500 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMedicines(Array.isArray(m) ? (m as Medicine[]) : ((m as any)?.items ?? [])); } catch { /* empty */ }
      try { const { data: sp } = await apiClient.get('/catalog/medical-supplies', { params: { isActive: true, pageSize: 500 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSupplies(Array.isArray(sp) ? (sp as Supply[]) : ((sp as any)?.items ?? [])); } catch { /* empty */ }
      try { const w = await getWarehouses(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setWarehouses(((w as any)?.data?.items || (w as any)?.data || []) as Warehouse[]); } catch { /* empty */ }
    })();
  }, []);

  const submitAddOn = async () => {
    if (!selected) { tw('Chọn 1 phiếu CĐHA trước'); return; }
    const v = await addOnForm.validateFields();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/radiology-ops/add-on', {
        parentRequestId: selected.id, serviceIds: v.serviceIds, reason: v.reason, withContrast: v.withContrast ?? false,
      });
      tk(`Đã tạo ${data.created?.length || 0} phiếu CĐHA mới`);
      addOnForm.resetFields(); search();
    } catch { tw('Tạo phiếu thất bại'); }
  };

  const submitDispense = async () => {
    if (!selected) { tw('Chọn 1 phiếu CĐHA trước'); return; }
    const v = await dispenseForm.validateFields();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/radiology-ops/dispense', {
        warehouseId: v.warehouseId, patientId: selected.patientId,
        radiologyRequestId: selected.id, medicalRecordId: selected.medicalRecordId, note: v.note,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (v.items || []).map((it: any) => {
          const med = medicines.find((m) => m.id === it.itemId);
          const sup = supplies.find((s) => s.id === it.itemId);
          return {
            medicineId: med ? it.itemId : undefined,
            supplyId: sup ? it.itemId : undefined,
            quantity: it.quantity, unit: med?.unit || sup?.unit, note: it.note,
          };
        }),
      });
      tk(`Đã xuất kho ${data.receiptCode} — ${(data.totalAmount || 0).toLocaleString('vi-VN')}đ`);
      dispenseForm.resetFields();
    } catch { tw('Xuất kho thất bại'); }
  };

  const cols: ColumnDef<Request>[] = [
    { key: 'code', label: 'Phiếu', code: true, render: (r) => r.requestCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'svc', label: 'DV CĐHA', render: (r) => r.serviceName },
    { key: 'bp', label: 'Vị trí', render: (r) => r.bodyPart || '—' },
    { key: 'contrast', label: 'Cản quang', render: (r) => r.contrast ? <StatusBadge tone="warn">Có</StatusBadge> : '—' },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM HH:mm') },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Phiếu tìm thấy', val: requests.length, sub: 'kết quả' },
        { lbl: 'Đã chọn', val: selected ? selected.requestCode : '—', sub: selected?.patientName || 'chưa chọn', tone: selected ? 'ok' : 'warn' },
        { lbl: 'Dịch vụ CĐHA', val: services.length, sub: 'có thể chọn', tone: 'info' },
        { lbl: 'Kho xuất', val: warehouses.length, sub: 'có sẵn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword}
          placeholder="Tìm mã phiếu CĐHA / mã BN / tên BN…" minWidth={400} />
        <button className="ab-btn primary" type="button" onClick={search} disabled={loading}>
          <Ico name="search" size={12} /> Tìm phiếu
        </button>
        {selected && (
          <button className="ab-btn ghost" type="button" onClick={() => setSelected(null)}>
            <Ico name="x" size={12} /> Bỏ chọn
          </button>
        )}
      </div>

      {requests.length > 0 && !selected && (
        <DataTable<Request>
          columns={cols} data={requests} rowKey={(r) => r.id}
          onRowClick={setSelected}
          empty="Không tìm thấy phiếu nào"
        />
      )}

      {selected && (
        <>
          <div style={{ padding: 16, background: 'var(--d-1)', border: '1px solid var(--line)', margin: 12, borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--t-2)' }}>Phiếu đang chọn:</div>
            <div style={{ marginTop: 4, fontSize: 14 }}>
              <b style={{ fontFamily: 'var(--font-mono)' }}>{selected.requestCode}</b> ·{' '}
              <b>{selected.patientName}</b> · {selected.serviceName}
            </div>
          </div>

          <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} />

          {tab === 'add-on' && (
            <div style={{ padding: 24, maxWidth: 720 }}>
              <Form form={addOnForm} layout="vertical">
                <Form.Item label="Dịch vụ chỉ định thêm" name="serviceIds" rules={[{ required: true }]}>
                  <Select mode="multiple" showSearch optionFilterProp="label"
                    options={services.map((s) => ({
                      label: `${s.serviceCode} — ${s.serviceName} — ${s.unitPrice?.toLocaleString('vi-VN')}đ`,
                      value: s.id,
                    }))} />
                </Form.Item>
                <Form.Item name="withContrast" valuePropName="checked">
                  <Checkbox>Dùng thuốc cản quang</Checkbox>
                </Form.Item>
                <Form.Item label="Lý do chỉ định thêm" name="reason" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} placeholder="VD: cần chụp thêm tư thế nghiêng để đánh giá…" />
                </Form.Item>
                <button className="ab-btn primary" type="button" onClick={submitAddOn}>
                  <Ico name="plus" size={12} /> Tạo phiếu chỉ định thêm
                </button>
              </Form>
            </div>
          )}

          {tab === 'dispense' && (
            <div style={{ padding: 24, maxWidth: 820 }}>
              <Form form={dispenseForm} layout="vertical">
                <Form.Item label="Kho xuất" name="warehouseId" rules={[{ required: true }]}>
                  <Select showSearch optionFilterProp="label"
                    options={warehouses.map((w) => ({ label: w.warehouseName, value: w.id }))} />
                </Form.Item>
                <div style={{ fontSize: 12, color: 'var(--t-2)', margin: '12px 0 6px' }}>Thuốc / vật tư</div>
                <Form.List name="items">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((f) => (
                        <div key={f.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <Form.Item name={[f.name, 'itemId']} rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
                            <Select showSearch optionFilterProp="label" placeholder="Thuốc hoặc vật tư"
                              options={[
                                ...medicines.map((m) => ({ label: `[Thuốc] ${m.medicineCode} — ${m.medicineName}`, value: m.id })),
                                ...supplies.map((s) => ({ label: `[VT] ${s.supplyCode} — ${s.supplyName}`, value: s.id })),
                              ]} />
                          </Form.Item>
                          <Form.Item name={[f.name, 'quantity']} rules={[{ required: true }]} style={{ width: 100, marginBottom: 0 }}>
                            <InputNumber placeholder="SL" min={0.01} step={0.01} />
                          </Form.Item>
                          <Form.Item name={[f.name, 'note']} style={{ flex: 1, marginBottom: 0 }}>
                            <Input placeholder="Ghi chú" />
                          </Form.Item>
                          <button type="button" className="ab-btn ghost" onClick={() => remove(f.name)}>
                            <Ico name="trash" size={12} />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="ab-btn ghost" onClick={() => add()}>
                        <Ico name="plus" size={12} /> Thêm dòng
                      </button>
                    </>
                  )}
                </Form.List>
                <Form.Item label="Ghi chú phiếu" name="note" style={{ marginTop: 16 }}>
                  <Input.TextArea rows={2} />
                </Form.Item>
                <button className="ab-btn primary" type="button" onClick={submitDispense}>
                  <Ico name="medicine" size={12} /> Xuất kho cho BN
                </button>
              </Form>
            </div>
          )}
        </>
      )}

      {!selected && requests.length === 0 && !loading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <div style={{ fontSize: 14 }}>Tìm phiếu CĐHA để thực hiện chỉ định thêm hoặc xuất thuốc</div>
        </div>
      )}
    </div>
  );
};

export default RadiologyOpsV2;
