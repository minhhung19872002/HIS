import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import { getWarehouses } from '../api/warehouse';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, DrawerShell, ModalShell, DrSec, DrField,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

interface Supply {
  id: string; supplyCode: string; supplyName: string; supplyType: number;
  unit?: string; unitPrice: number; manufacturer?: string;
}
interface RequestItem {
  id: string; supplyId: string; supplyCode?: string; supplyName?: string;
  requestedQuantity: number; approvedQuantity: number;
  unit?: string; unitPrice: number; amount: number; note?: string;
}
interface ApprovalRequest {
  id: string; approvalCode: string; requestDate: string;
  departmentName?: string; warehouseName?: string;
  status: number; note?: string;
  totalItems: number; totalAmount: number;
  items: RequestItem[];
}

const STATUS_LABEL: Record<number, string> = {
  1: 'Chưa nhập', 2: 'Chờ duyệt', 3: 'Đã duyệt', 4: 'Đã thu hồi',
};

type SKey = 'pending' | 'approved' | 'revoked';
const STATUS_TABS = [
  { v: 'pending' as SKey,  l: 'Chờ duyệt',  tone: 'warn' as const },
  { v: 'approved' as SKey, l: 'Đã duyệt',   tone: 'ok' as const },
  { v: 'revoked' as SKey,  l: 'Đã thu hồi', tone: 'crit' as const },
];

const tabToStatus = (s: SKey | 'all') => s === 'pending' ? 2 : s === 'approved' ? 3 : s === 'revoked' ? 4 : 0;

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const OfficeSupplyApprovalV2: React.FC = () => {
  const [stab, setStab] = useState<SKey | 'all'>('pending');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [approveReq, setApproveReq] = useState<ApprovalRequest | null>(null);
  const [approveQty, setApproveQty] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<ApprovalRequest | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [departments, setDepartments] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ApprovalRequest[]>('/office-supply/requests', {
        params: { status: tabToStatus(stab) },
      });
      setRequests(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [stab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await apiClient.get<Supply[]>('/office-supply/catalog');
        setSupplies(s || []);
      } catch { /* empty */ }
      try {
        const d = await systemApi.catalog.getDepartments();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDepartments((d as any)?.data || []);
      } catch { /* empty */ }
      try {
        const w = await getWarehouses(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setWarehouses(((w as any)?.data?.items || (w as any)?.data || []) as any[]);
      } catch { /* empty */ }
    })();
  }, []);

  const submitCreate = async () => {
    const v = await form.validateFields();
    if (!v.items || v.items.length === 0) { tw('Chưa có vật tư'); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/office-supply/requests', {
        departmentId: v.departmentId, warehouseId: v.warehouseId, note: v.note,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: v.items.map((it: any) => {
          const sup = supplies.find((s) => s.id === it.supplyId);
          return {
            supplyId: it.supplyId, requestedQuantity: it.requestedQuantity,
            unit: sup?.unit, unitPrice: sup?.unitPrice || 0, note: it.note,
          };
        }),
      });
      tk(`Đã tạo phiếu ${data.approvalCode}`);
      setCreateOpen(false); form.resetFields(); load();
    } catch { tw('Tạo phiếu thất bại'); }
  };

  const submitApprove = async () => {
    if (!approveReq) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/office-supply/requests/approve', {
        id: approveReq.id, approvedQuantities: approveQty,
      });
      tk(`Đã duyệt — phiếu xuất ${data.exportReceiptId}`);
      setApproveReq(null); setApproveQty({}); load();
    } catch { tw('Duyệt thất bại'); }
  };

  const counts = useMemo(() => ({ all: requests.length }) as Record<string, number>, [requests]);

  const cols: ColumnDef<ApprovalRequest>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.approvalCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM HH:mm') },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'wh', label: 'Kho', render: (r) => r.warehouseName || '—' },
    { key: 'cnt', label: 'Số VT', mono: true, render: (r) => r.totalItems },
    { key: 'amt', label: 'Tổng tiền', mono: true, render: (r) => fmt(r.totalAmount) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const tone = r.status === 3 ? 'ok' : r.status === 4 ? 'crit' : r.status === 2 ? 'warn' : 'info';
      return <StatusBadge tone={tone} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const totalAmt = requests.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: requests.length, sub: STATUS_LABEL[tabToStatus(stab)] },
        { lbl: 'Tổng vật tư', val: requests.reduce((s, r) => s + r.totalItems, 0), sub: 'mặt hàng', tone: 'info' },
        { lbl: 'Tổng tiền', val: Math.round(totalAmt / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
        { lbl: 'Cần duyệt', val: requests.filter((r) => r.status === 2).length, sub: 'cần xử lý', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>VPP / TTB văn phòng (vật tư không phải y tế)</span>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Tạo phiếu yêu cầu
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ApprovalRequest>
        columns={cols} data={requests} rowKey={(r) => r.id}
        onRowClick={setDetail}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
            {r.status === 2 && (
              <ActBtn ic="check" title="Duyệt" onClick={() => { setApproveReq(r); setApproveQty({}); }} />
            )}
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Không có phiếu yêu cầu'}
      />

      <DrawerShell
        open={!!detail && !approveReq}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `Phiếu ${detail.approvalCode}` : ''}
        sub={detail ? `${detail.departmentName} → ${detail.warehouseName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          {detail && detail.status === 2 && (
            <button type="button" className="ab-btn primary" onClick={() => { setApproveReq(detail); setApproveQty({}); }}>
              <Ico name="check" size={12} /> Duyệt
            </button>
          )}
        </>}
      >
        {detail && <>
          <DrSec title="Phiếu yêu cầu">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.approvalCode}</span></DrField>
            <DrField lbl="Ngày">{dayjs(detail.requestDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Khoa">{detail.departmentName || '—'}</DrField>
            <DrField lbl="Kho">{detail.warehouseName || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={detail.status === 3 ? 'ok' : detail.status === 4 ? 'crit' : 'warn'} dot>
                {STATUS_LABEL[detail.status]}
              </StatusBadge>
            </DrField>
            {detail.note && <DrField lbl="Ghi chú">{detail.note}</DrField>}
          </DrSec>
          <DrSec title={`Vật tư (${detail.items.length})`}>
            <table className="ab-tbl">
              <thead><tr><th>Mã</th><th>Tên</th><th>YC</th><th>Duyệt</th><th>ĐV</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td className="mono">{it.supplyCode}</td>
                    <td>{it.supplyName}</td>
                    <td className="mono">{it.requestedQuantity}</td>
                    <td className="mono">{it.approvedQuantity}</td>
                    <td>{it.unit || '—'}</td>
                    <td className="mono">{fmt(it.unitPrice)}</td>
                    <td className="mono">{fmt(it.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--d-1)', fontWeight: 600 }}>
                  <td colSpan={6} style={{ textAlign: 'right' }}>Tổng:</td>
                  <td className="mono">{fmt(detail.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell
        open={!!approveReq}
        onClose={() => setApproveReq(null)}
        size="lg"
        title={`Duyệt phiếu ${approveReq?.approvalCode || ''}`}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setApproveReq(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitApprove}>
            <Ico name="check" size={12} /> Duyệt
          </button>
        </>}
      >
        {approveReq && (
          <table className="ab-tbl">
            <thead><tr><th>Vật tư</th><th>YC</th><th>SL duyệt</th><th>ĐV</th><th>Đơn giá</th></tr></thead>
            <tbody>
              {approveReq.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.supplyName} <span style={{ fontSize: 11, color: 'var(--t-2)' }}>({it.supplyCode})</span></td>
                  <td className="mono">{it.requestedQuantity}</td>
                  <td>
                    <InputNumber
                      size="small" min={0} max={it.requestedQuantity}
                      defaultValue={it.requestedQuantity}
                      onChange={(v) => setApproveQty((p) => ({ ...p, [it.id]: Number(v) || 0 }))}
                    />
                  </td>
                  <td>{it.unit || '—'}</td>
                  <td className="mono">{fmt(it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModalShell>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="Tạo phiếu yêu cầu VPP / TTB"
        onOk={submitCreate}
        okText="Tạo phiếu"
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="departmentId" label="Khoa yêu cầu" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              options={departments.map((d: any) => ({ value: d.id, label: d.departmentName }))} />
          </Form.Item>
          <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              options={warehouses.map((w: any) => ({ value: w.id, label: w.warehouseName }))} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item name={[f.name, 'supplyId']} rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
                      <Select showSearch placeholder="Vật tư" optionFilterProp="label"
                        options={supplies.map((s) => ({ value: s.id, label: `${s.supplyName} (${s.supplyCode})` }))} />
                    </Form.Item>
                    <Form.Item name={[f.name, 'requestedQuantity']} rules={[{ required: true }]} style={{ width: 100, marginBottom: 0 }}>
                      <InputNumber min={1} placeholder="SL" />
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
        </Form>
      </Modal>
    </div>
  );
};

export default OfficeSupplyApprovalV2;
