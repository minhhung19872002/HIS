import React, { useCallback, useState } from 'react';
import { Form, Input, Checkbox } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge, ModalShell, DrSec, DrField,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

interface CancelledService {
  id: string; serviceRequestId: string; requestCode: string; requestDate: string;
  serviceCode: string; serviceName: string; quantity: number; unitPrice: number;
  amount: number; patientAmount: number; insuranceAmount: number;
  note?: string; cancelledAt?: string;
}

interface MedicalRecord { id: string; code: string; patientName: string }

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const ServiceRequeueV2: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [mr, setMr] = useState<MedicalRecord | null>(null);
  const [services, setServices] = useState<CancelledService[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form] = Form.useForm();

  const search = useCallback(async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: r } = await apiClient.get<{ items?: any[] }>('/examination/medical-records/search', {
        params: { keyword, pageSize: 1 },
      }).catch(() => ({ data: { items: [] } }));
      const item = (r?.items || [])[0];
      if (!item) { tw('Không tìm thấy hồ sơ'); setServices([]); setMr(null); return; }
      setMr({ id: item.id, code: item.medicalRecordCode, patientName: item.patientName || item.patient?.fullName || '' });
      const { data } = await apiClient.get<CancelledService[]>(`/service-refund/cancelled-services/${item.id}`);
      setServices(data || []);
      setSelected(new Set());
    } catch { ti('Tải dữ liệu thất bại'); }
    finally { setLoading(false); }
  }, [keyword]);

  const submit = async () => {
    const v = await form.validateFields();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/service-refund/requeue', {
        serviceRequestDetailIds: Array.from(selected),
        reason: v.reason,
        keepAsPaid: v.keepAsPaid ?? true,
      });
      tk(`Đã cho lại ${data.requeued}/${data.total} chỉ định`);
      setConfirmOpen(false); form.resetFields(); search();
    } catch { tw('Xử lý thất bại'); }
  };

  const totalSelected = services.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.amount, 0);

  const cols: ColumnDef<CancelledService>[] = [
    { key: 'code', label: 'Phiếu', code: true, render: (r) => r.requestCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM/YYYY') },
    { key: 'sc', label: 'Mã DV', code: true, render: (r) => r.serviceCode },
    { key: 'name', label: 'Tên dịch vụ', render: (r) => r.serviceName },
    { key: 'qty', label: 'SL', mono: true, render: (r) => r.quantity },
    { key: 'price', label: 'Đơn giá', mono: true, render: (r) => fmt(r.unitPrice) },
    { key: 'pat', label: 'BN trả', mono: true, render: (r) => fmt(r.patientAmount) },
    { key: 'ins', label: 'BHYT', mono: true, render: (r) => fmt(r.insuranceAmount) },
    { key: 'cancelled', label: 'Hủy lúc', mono: true, render: (r) => r.cancelledAt ? dayjs(r.cancelledAt).format('DD/MM HH:mm') : '—' },
    { key: 'note', label: 'Ghi chú', render: (r) => r.note || '—' },
  ];

  const togglePending = (id: string) => {
    const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n);
  };
  const toggleAll = () => {
    if (services.every((s) => selected.has(s.id))) {
      const n = new Set(selected); services.forEach((s) => n.delete(s.id)); setSelected(n);
    } else {
      const n = new Set(selected); services.forEach((s) => n.add(s.id)); setSelected(n);
    }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'HSBA', val: mr ? mr.code : '—', sub: mr ? mr.patientName : 'Chưa tra cứu', tone: 'info' },
        { lbl: 'DV đã hủy', val: services.length, sub: 'có thể cho lại', tone: services.length > 0 ? 'warn' : 'ok' },
        { lbl: 'Đã chọn', val: selected.size, sub: 'sẽ cho lại', tone: selected.size > 0 ? 'crit' : 'ok' },
        { lbl: 'Tổng tiền', val: fmt(totalSelected), unit: 'đ', sub: 'của các DV chọn', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword}
          placeholder="Mã HSBA / mã BN / tên BN / SĐT…" minWidth={400} />
        <button className="ab-btn primary" type="button" onClick={search} disabled={loading}>
          <Ico name="search" size={12} /> Tìm HSBA
        </button>
        {mr && (
          <button className="ab-btn ghost" type="button" onClick={() => { setMr(null); setServices([]); setKeyword(''); setSelected(new Set()); }}>
            <Ico name="x" size={12} /> Tìm HSBA khác
          </button>
        )}
        <span className="spacer" />
        {selected.size > 0 && (
          <button className="ab-btn primary" type="button" onClick={() => setConfirmOpen(true)}>
            <Ico name="refresh" size={12} /> Cho lại {selected.size} DV — {fmt(totalSelected)}đ
          </button>
        )}
      </div>

      {!mr && !loading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
          <div style={{ fontSize: 14 }}>Tìm hồ sơ bệnh án để xem các CLS đã hủy</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Có thể cho lại các CLS sau khi hoàn hóa đơn</div>
        </div>
      )}

      {mr && services.length === 0 && !loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--t-2)' }}>
          <StatusBadge tone="ok" dot>Không có CLS đã hủy</StatusBadge>
          <div style={{ fontSize: 12, marginTop: 8 }}>Hồ sơ {mr.code} không có dịch vụ nào bị hủy</div>
        </div>
      )}

      {services.length > 0 && (
        <DataTable<CancelledService>
          columns={cols} data={services} rowKey={(r) => r.id}
          selected={selected} onToggle={togglePending} onToggleAll={toggleAll}
          empty={'Không có CLS đã hủy'}
        />
      )}

      <ModalShell
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="md"
        title="Cho lại chỉ định"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setConfirmOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submit}>
            <Ico name="check" size={12} /> Xác nhận cho lại
          </button>
        </>}
      >
        <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 12 }}>
          <div style={{ color: 'var(--a-or-text)', fontSize: 12, fontWeight: 600 }}>
            Dịch vụ sẽ được kích hoạt lại, trạng thái chuyển về "Chờ"
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <b>{selected.size}</b> dịch vụ · <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(totalSelected)} đ</b>
          </div>
        </div>
        <Form form={form} layout="vertical" initialValues={{ keepAsPaid: true }}>
          <Form.Item label="Lý do cho lại" name="reason" rules={[{ required: true, message: 'Bắt buộc nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="VD: BN muốn thực hiện lại sau…" />
          </Form.Item>
          <Form.Item name="keepAsPaid" valuePropName="checked">
            <Checkbox>Giữ trạng thái "đã thanh toán" (không cần thu lại)</Checkbox>
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default ServiceRequeueV2;
