import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../../../utils/format';
import { Form, Input, InputNumber, Modal, Select, Tabs } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../../services/apiClient';
import systemApi from '../../system/api/system';
import { getWarehouses } from '../api/warehouse';
import { unwrapList, type MaybePaged } from '../../../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, Btn, DrawerShell, ModalShell, DrSec, DrField,
  Ico, tk, ti, tw, cf, type ColumnDef,
} from '@/_v2kit';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

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
interface Department { id: string; departmentName: string; departmentCode?: string }
interface Warehouse { id: string; warehouseName: string; warehouseCode?: string }
interface CreateRequestResponse { approvalCode?: string; id?: string }
interface ApproveResponse { exportReceiptId?: string }
interface CreateItemForm { supplyId: string; requestedQuantity: number; note?: string }
interface ReturnResponse { id?: string; approvalCode?: string }

const STATUS_LABEL: Record<number, string> = {
  1: 'Nháp', 2: 'Chờ duyệt', 3: 'Đã duyệt', 4: 'Đã thu hồi (cũ)',
};

type SKey = 'draft' | 'pending' | 'approved' | 'revoked';
const STATUS_TABS = [
  { v: 'draft' as SKey,    l: 'Nháp / Thu hồi', tone: 'info' as const },
  { v: 'pending' as SKey,  l: 'Chờ duyệt',      tone: 'warn' as const },
  { v: 'approved' as SKey, l: 'Đã duyệt',        tone: 'ok' as const },
  { v: 'revoked' as SKey,  l: 'Đã thu hồi (cũ)', tone: 'crit' as const },
];

const tabToStatus = (s: SKey | 'all') => s === 'draft' ? 1 : s === 'pending' ? 2 : s === 'approved' ? 3 : s === 'revoked' ? 4 : 0;


const OfficeSupplyApprovalV2: React.FC = () => {
  const [moduleTab, setModuleTab] = useState<'requests' | 'returns'>('requests');
  const [stab, setStab] = useState<SKey | 'all'>('pending');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [returns, setReturns] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [approveReq, setApproveReq] = useState<ApprovalRequest | null>(null);
  const [approveQty, setApproveQty] = useState<Record<string, number>>({});
  const [approveReturn, setApproveReturn] = useState<ApprovalRequest | null>(null);
  const [approveReturnQty, setApproveReturnQty] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<ApprovalRequest | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvingReturn, setApprovingReturn] = useState(false);
  const [recalling, setRecalling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, retRes] = await Promise.all([
        apiClient.get<ApprovalRequest[]>('/office-supply/requests', { params: { status: tabToStatus(stab) } }),
        apiClient.get<ApprovalRequest[]>('/office-supply/returns', { params: { status: tabToStatus(stab) } }),
      ]);
      setRequests(reqRes.data || []);
      setReturns(retRes.data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [stab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await apiClient.get<Supply[]>('/office-supply/catalog');
        setSupplies(s || []);
      } catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh mục vật tư')); }
      try {
        const d = await systemApi.catalog.getDepartments();
        const dBody = (d as { data?: MaybePaged<Department> }).data;
        setDepartments(unwrapList<Department>(dBody));
      } catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh mục khoa')); }
      try {
        const w = await getWarehouses(1);
        const wBody = (w as { data?: MaybePaged<Warehouse> }).data;
        setWarehouses(unwrapList<Warehouse>(wBody));
      } catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh mục kho')); }
    })();
  }, []);

  const submitCreate = async () => {
    if (creating) return;
    const v = await form.validateFields();
    if (!v.items || v.items.length === 0) { tw('Chưa có vật tư'); return; }
    setCreating(true);
    try {
      const { data }: { data: CreateRequestResponse } = await apiClient.post('/office-supply/requests', {
        departmentId: v.departmentId, warehouseId: v.warehouseId, note: v.note,
        items: (v.items as CreateItemForm[]).map((it) => {
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
    finally { setCreating(false); }
  };

  const submitApprove = async () => {
    if (!approveReq || approving) return;
    setApproving(true);
    try {
      const { data }: { data: ApproveResponse } = await apiClient.post('/office-supply/requests/approve', {
        id: approveReq.id, approvedQuantities: approveQty,
      });
      tk(`Đã duyệt — phiếu xuất ${data.exportReceiptId}`);
      setApproveReq(null); setApproveQty({}); load();
    } catch { tw('Duyệt thất bại'); }
    finally { setApproving(false); }
  };

  const submitRecall = async (req: ApprovalRequest) => {
    if (recalling) return;
    setRecalling(true);
    try {
      await apiClient.post(`/office-supply/requests/${req.id}/recall`);
      tk(`Đã thu hồi phiếu ${req.approvalCode} — phiếu về Nháp để chỉnh sửa lại`);
      load();
    } catch { tw('Thu hồi thất bại'); }
    finally { setRecalling(false); }
  };

  const submitCreateReturn = async () => {
    if (creatingReturn) return;
    const v = await returnForm.validateFields();
    if (!v.items || v.items.length === 0) { tw('Chưa có vật tư hoàn trả'); return; }
    setCreatingReturn(true);
    try {
      const { data }: { data: ReturnResponse } = await apiClient.post('/office-supply/returns', {
        departmentId: v.departmentId, warehouseId: v.warehouseId, note: v.note,
        items: (v.items as CreateItemForm[]).map((it) => {
          const sup = supplies.find((s) => s.id === it.supplyId);
          return {
            supplyId: it.supplyId, requestedQuantity: it.requestedQuantity,
            unit: sup?.unit, unitPrice: sup?.unitPrice || 0, note: it.note,
          };
        }),
      });
      tk(`Đã tạo phiếu hoàn trả ${data.approvalCode}`);
      setReturnOpen(false); returnForm.resetFields(); load();
    } catch { tw('Tạo phiếu hoàn trả thất bại'); }
    finally { setCreatingReturn(false); }
  };

  const submitApproveReturn = async () => {
    if (!approveReturn || approvingReturn) return;
    setApprovingReturn(true);
    try {
      await apiClient.post('/office-supply/returns/approve', {
        id: approveReturn.id, approvedQuantities: approveReturnQty,
      });
      tk('Đã duyệt hoàn trả — tồn kho đã được cộng lại');
      setApproveReturn(null); setApproveReturnQty({}); load();
    } catch { tw('Duyệt hoàn trả thất bại'); }
    finally { setApprovingReturn(false); }
  };

  const activeList = moduleTab === 'requests' ? requests : returns;
  const counts = useMemo(() => ({ all: activeList.length }) as Record<string, number>, [activeList]);

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

  const totalAmt = activeList.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: activeList.length, sub: STATUS_LABEL[tabToStatus(stab)] },
        { lbl: 'Tổng vật tư', val: activeList.reduce((s, r) => s + r.totalItems, 0), sub: 'mặt hàng', tone: 'info' },
        { lbl: 'Tổng tiền', val: Math.round(totalAmt / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
        { lbl: 'Cần duyệt', val: activeList.filter((r) => r.status === 2).length, sub: 'cần xử lý', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Tabs
          activeKey={moduleTab}
          onChange={(k) => setModuleTab(k as 'requests' | 'returns')}
          size="small"
          style={{ marginBottom: 0 }}
          items={[
            { key: 'requests', label: 'Phiếu yêu cầu cấp' },
            { key: 'returns',  label: 'Phiếu hoàn trả' },
          ]}
        />
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        {moduleTab === 'requests' ? (
          <Btn variant="primary" onClick={() => setCreateOpen(true)}>
            <Ico name="plus" size={12} /> Tạo phiếu yêu cầu
          </Btn>
        ) : (
          <Btn variant="primary" onClick={() => setReturnOpen(true)}>
            <Ico name="plus" size={12} /> Tạo phiếu hoàn trả
          </Btn>
        )}
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ApprovalRequest>
        columns={cols} data={activeList} rowKey={(r) => r.id}
        onRowClick={setDetail}
        actions={(r) => (
          <RowActions actions={[
            { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setDetail(r) },
            {
              key: 'approve', icon: 'check', label: 'Duyệt', primary: true,
              hidden: !(r.status === 2 && moduleTab === 'requests'),
              onClick: () => { setApproveReq(r); setApproveQty({}); },
            },
            {
              key: 'recall', icon: 'x', label: 'Thu hồi', tone: 'danger',
              hidden: !(r.status === 2 && moduleTab === 'requests'),
              confirm: `Thu hồi phiếu ${r.approvalCode}? Phiếu sẽ về trạng thái Nháp để chỉnh sửa lại.`,
              disabled: recalling,
              onClick: () => submitRecall(r),
            },
            {
              key: 'approveReturn', icon: 'check', label: 'Duyệt hoàn trả',
              hidden: !(r.status === 2 && moduleTab === 'returns'),
              onClick: () => { setApproveReturn(r); setApproveReturnQty({}); },
            },
          ]} />
        )}
        empty={loading ? 'Đang tải…' : moduleTab === 'requests' ? 'Không có phiếu yêu cầu' : 'Không có phiếu hoàn trả'}
      />

      <DrawerShell
        open={!!detail && !approveReq && !approveReturn}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `Phiếu ${detail.approvalCode}` : ''}
        sub={detail ? `${detail.departmentName} → ${detail.warehouseName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
          {detail && detail.status === 2 && moduleTab === 'requests' && (
            <Btn
              variant="ghost"
              disabled={recalling}
              onClick={() => cf(
                `Thu hồi phiếu ${detail.approvalCode}? Phiếu sẽ về trạng thái Nháp để chỉnh sửa lại.`,
                () => { submitRecall(detail); setDetail(null); },
                { tone: 'crit', confirm: 'Thu hồi' },
              )}
            >
              <Ico name="x" size={12} /> Thu hồi
            </Btn>
          )}
          {detail && detail.status === 2 && moduleTab === 'requests' && (
            <Btn variant="primary" onClick={() => { setApproveReq(detail); setApproveQty({}); }}>
              <Ico name="check" size={12} /> Duyệt
            </Btn>
          )}
          {detail && detail.status === 2 && moduleTab === 'returns' && (
            <Btn variant="primary" onClick={() => { setApproveReturn(detail); setApproveReturnQty({}); }}>
              <Ico name="check" size={12} /> Duyệt hoàn trả
            </Btn>
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
              <StatusBadge tone={detail.status === 3 ? 'ok' : detail.status === 4 ? 'crit' : detail.status === 1 ? 'info' : 'warn'} dot>
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
          <Btn variant="ghost" disabled={approving} onClick={() => setApproveReq(null)}>Hủy</Btn>
          <Btn variant="primary" loading={approving} disabled={approving} onClick={submitApprove}>
            <Ico name="check" size={12} /> {approving ? 'Đang duyệt…' : 'Duyệt'}
          </Btn>
        </>}
      >
        {approveReq && (
          <table className="ab-tbl">
            <thead><tr><th>Vật tư</th><th>YC</th><th>SL duyệt</th><th>ĐV</th><th>Đơn giá</th></tr></thead>
            <tbody>
              {approveReq.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.supplyName} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>({it.supplyCode})</span></td>
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
        confirmLoading={creating}
        okText="Tạo phiếu"
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="departmentId" label="Khoa yêu cầu" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={departments.map((d) => ({ value: d.id, label: d.departmentName }))} />
          </Form.Item>
          <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
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
                    <Btn variant="ghost" onClick={() => remove(f.name)}>
                      <Ico name="trash" size={12} />
                    </Btn>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => add()}>
                  <Ico name="plus" size={12} /> Thêm dòng
                </Btn>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Tạo phiếu hoàn trả */}
      <Modal
        open={returnOpen}
        onCancel={() => setReturnOpen(false)}
        title="Tạo phiếu hoàn trả VPP"
        onOk={submitCreateReturn}
        confirmLoading={creatingReturn}
        okText="Tạo phiếu hoàn trả"
        cancelText="Hủy"
        width={800}
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item name="departmentId" label="Khoa hoàn trả" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={departments.map((d) => ({ value: d.id, label: d.departmentName }))} />
          </Form.Item>
          <Form.Item name="warehouseId" label="Kho nhập lại" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={warehouses.map((w) => ({ value: w.id, label: w.warehouseName }))} />
          </Form.Item>
          <Form.Item name="note" label="Lý do hoàn trả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                    <Form.Item name={[f.name, 'supplyId']} rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
                      <Select showSearch placeholder="Vật tư hoàn trả" optionFilterProp="label"
                        options={supplies.map((s) => ({ value: s.id, label: `${s.supplyName} (${s.supplyCode})` }))} />
                    </Form.Item>
                    <Form.Item name={[f.name, 'requestedQuantity']} rules={[{ required: true }]} style={{ width: 100, marginBottom: 0 }}>
                      <InputNumber min={1} placeholder="SL" />
                    </Form.Item>
                    <Form.Item name={[f.name, 'note']} style={{ flex: 1, marginBottom: 0 }}>
                      <Input placeholder="Ghi chú" />
                    </Form.Item>
                    <Btn variant="ghost" onClick={() => remove(f.name)}>
                      <Ico name="trash" size={12} />
                    </Btn>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => add()}>
                  <Ico name="plus" size={12} /> Thêm dòng
                </Btn>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Duyệt hoàn trả */}
      <ModalShell
        open={!!approveReturn}
        onClose={() => setApproveReturn(null)}
        size="lg"
        title={`Duyệt hoàn trả ${approveReturn?.approvalCode || ''}`}
        footer={<>
          <Btn variant="ghost" disabled={approvingReturn} onClick={() => setApproveReturn(null)}>Hủy</Btn>
          <Btn variant="primary" loading={approvingReturn} disabled={approvingReturn} onClick={submitApproveReturn}>
            <Ico name="check" size={12} /> {approvingReturn ? 'Đang duyệt…' : 'Duyệt hoàn trả'}
          </Btn>
        </>}
      >
        {approveReturn && (
          <table className="ab-tbl">
            <thead><tr><th>Vật tư</th><th>SL hoàn trả</th><th>SL duyệt</th><th>ĐV</th><th>Đơn giá</th></tr></thead>
            <tbody>
              {approveReturn.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.supplyName} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>({it.supplyCode})</span></td>
                  <td className="mono">{it.requestedQuantity}</td>
                  <td>
                    <InputNumber
                      size="small" min={0} max={it.requestedQuantity}
                      defaultValue={it.requestedQuantity}
                      onChange={(v) => setApproveReturnQty((p) => ({ ...p, [it.id]: Number(v) || 0 }))}
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
    </div>
  );
};

export default OfficeSupplyApprovalV2;
