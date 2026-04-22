/**
 * VPP / TTB VP — Phê duyệt văn phòng phẩm (N1.12).
 * Chỉ dùng cho vật tư IsMedical=false.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Select, InputNumber, Input, Space, message, Tag, Descriptions,
  Divider, Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, CheckCircleOutlined, ShopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import { getWarehouses } from '../api/warehouse';

const { Text } = Typography;

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

const STATUS_TAGS: Record<number, { color: string; label: string }> = {
  1: { color: 'default', label: 'Chưa nhập' },
  2: { color: 'blue', label: 'Đã chuyển' },
  3: { color: 'green', label: 'Đã duyệt' },
  4: { color: 'red', label: 'Đã thu hồi' },
};

const SUPPLY_TYPE_LABELS: Record<number, string> = {
  1: 'Vật tư tiêu hao',
  2: 'Vật tư thay thế',
  3: 'Hóa chất',
  4: 'VPP',
  5: 'TTB VPP',
};

export default function OfficeSupplyApproval() {
  const [tab, setTab] = useState('2');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [approveRequest, setApproveRequest] = useState<ApprovalRequest | null>(null);
  const [approveQuantities, setApproveQuantities] = useState<Record<string, number>>({});
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ApprovalRequest[]>('/office-supply/requests',
        { params: { status: Number(tab) } });
      setRequests(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await apiClient.get<Supply[]>('/office-supply/catalog');
        setSupplies(s || []);
      } catch { /* empty */ }
      try {
        const d = await systemApi.catalog.getDepartments();
        setDepartments((d as any)?.data || []);
      } catch { /* empty */ }
      try {
        const w = await getWarehouses(1);
        setWarehouses((w as any)?.data?.items || (w as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  const submitCreate = async () => {
    const v = await form.validateFields();
    if (!v.items || v.items.length === 0) return message.warning('Chưa có vật tư');
    try {
      const { data } = await apiClient.post('/office-supply/requests', {
        departmentId: v.departmentId,
        warehouseId: v.warehouseId,
        note: v.note,
        items: v.items.map((it: any) => {
          const sup = supplies.find(s => s.id === it.supplyId);
          return {
            supplyId: it.supplyId,
            requestedQuantity: it.requestedQuantity,
            unit: sup?.unit,
            unitPrice: sup?.unitPrice || 0,
            note: it.note,
          };
        }),
      });
      message.success(`Đã tạo phiếu ${data.approvalCode}`);
      setCreateOpen(false);
      form.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo phiếu thất bại');
    }
  };

  const submitApprove = async () => {
    if (!approveRequest) return;
    try {
      const { data } = await apiClient.post('/office-supply/requests/approve', {
        id: approveRequest.id,
        approvedQuantities: approveQuantities,
      });
      message.success(`Đã duyệt phiếu — phiếu xuất ${data.exportReceiptId}`);
      setApproveRequest(null);
      setApproveQuantities({});
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  const columns: any[] = [
    { title: 'Mã', dataIndex: 'approvalCode', width: 160 },
    { title: 'Ngày', dataIndex: 'requestDate', width: 130,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Khoa', dataIndex: 'departmentName' },
    { title: 'Kho', dataIndex: 'warehouseName' },
    { title: 'Số VT', dataIndex: 'totalItems', width: 80, align: 'right' },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', width: 140, align: 'right',
      render: (v: number) => v?.toLocaleString('vi-VN') },
    { title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (s: number) => {
        const t = STATUS_TAGS[s] || { color: 'default', label: String(s) };
        return <Tag color={t.color}>{t.label}</Tag>;
      } },
    { title: 'Thao tác', width: 130,
      render: (_: any, r: ApprovalRequest) => r.status === 2 ? (
        <Button size="small" type="primary" icon={<CheckCircleOutlined />}
          onClick={() => { setApproveRequest(r); setApproveQuantities({}); }}>
          Duyệt
        </Button>
      ) : <Button size="small" onClick={() => setApproveRequest(r)}>Xem</Button> },
  ];

  return (
    <div>
      <Card title={<Space><ShopOutlined /> VPP / TTB văn phòng — Phê duyệt (N1.12)</Space>}
        extra={<Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo phiếu yêu cầu
          </Button>
        </Space>}
      >
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: '2', label: 'Chờ duyệt' },
            { key: '3', label: 'Đã duyệt' },
            { key: '4', label: 'Đã thu hồi' },
          ]}
        />
        <Table size="small" rowKey="id" dataSource={requests} columns={columns}
          loading={loading} pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (r: ApprovalRequest) => (
              <Table
                size="small"
                rowKey="id"
                dataSource={r.items}
                pagination={false}
                columns={[
                  { title: 'Mã VT', dataIndex: 'supplyCode', width: 120 },
                  { title: 'Tên VT', dataIndex: 'supplyName' },
                  { title: 'SL yêu cầu', dataIndex: 'requestedQuantity', width: 100, align: 'right' },
                  { title: 'SL duyệt', dataIndex: 'approvedQuantity', width: 100, align: 'right' },
                  { title: 'ĐV', dataIndex: 'unit', width: 70 },
                  { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, align: 'right',
                    render: (v: number) => v?.toLocaleString('vi-VN') },
                  { title: 'Thành tiền', dataIndex: 'amount', width: 120, align: 'right',
                    render: (v: number) => v?.toLocaleString('vi-VN') },
                ]}
              />
            ),
          }}
        />
      </Card>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title="Tạo phiếu yêu cầu VPP / TTB VP"
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        okText="Gửi phiếu"
        width={900}
      >
        <Form form={form} layout="vertical">
          <Space wrap>
            <Form.Item label="Khoa yêu cầu" name="departmentId" rules={[{ required: true }]} style={{ minWidth: 240 }}>
              <Select showSearch optionFilterProp="label"
                options={departments.map(d => ({ label: d.departmentName, value: d.id }))} />
            </Form.Item>
            <Form.Item label="Kho xuất" name="warehouseId" rules={[{ required: true }]} style={{ minWidth: 240 }}>
              <Select showSearch optionFilterProp="label"
                options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))} />
            </Form.Item>
          </Space>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Divider>Danh sách vật tư</Divider>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[name, 'supplyId']} rules={[{ required: true }]} style={{ minWidth: 300 }}>
                      <Select showSearch placeholder="Chọn vật tư" optionFilterProp="label"
                        options={supplies.map(s => ({
                          label: `${s.supplyCode} - ${s.supplyName} (${SUPPLY_TYPE_LABELS[s.supplyType] || ''}) - ${s.unitPrice?.toLocaleString('vi-VN')}đ`,
                          value: s.id,
                        }))} />
                    </Form.Item>
                    <Form.Item name={[name, 'requestedQuantity']} rules={[{ required: true }]}>
                      <InputNumber placeholder="SL" min={1} />
                    </Form.Item>
                    <Form.Item name={[name, 'note']} style={{ minWidth: 200 }}>
                      <Input placeholder="Ghi chú" />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)}>Xóa</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>Thêm dòng</Button>
              </>
            )}
          </Form.List>
          <Form.Item label="Ghi chú phiếu" name="note" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Approve/view modal */}
      <Modal
        open={!!approveRequest}
        title={approveRequest ? `Phiếu ${approveRequest.approvalCode}` : ''}
        onCancel={() => { setApproveRequest(null); setApproveQuantities({}); }}
        width={900}
        footer={approveRequest?.status === 2 ? [
          <Button key="cancel" onClick={() => setApproveRequest(null)}>Hủy</Button>,
          <Button key="approve" type="primary" icon={<CheckCircleOutlined />} onClick={submitApprove}>
            Duyệt + xuất kho
          </Button>,
        ] : <Button onClick={() => setApproveRequest(null)}>Đóng</Button>}
      >
        {approveRequest && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Khoa">{approveRequest.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Kho">{approveRequest.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="Ngày">{dayjs(approveRequest.requestDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{approveRequest.note || '-'}</Descriptions.Item>
            </Descriptions>
            <Divider>Vật tư</Divider>
            <Table
              size="small"
              rowKey="id"
              dataSource={approveRequest.items}
              pagination={false}
              columns={[
                { title: 'Mã', dataIndex: 'supplyCode', width: 120 },
                { title: 'Tên VT', dataIndex: 'supplyName' },
                { title: 'Yêu cầu', dataIndex: 'requestedQuantity', width: 90, align: 'right' },
                {
                  title: 'SL duyệt',
                  width: 120,
                  align: 'right',
                  render: (_: any, item: RequestItem) => approveRequest.status === 2 ? (
                    <InputNumber
                      min={0}
                      max={item.requestedQuantity}
                      defaultValue={item.requestedQuantity}
                      onChange={v => setApproveQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))}
                    />
                  ) : item.approvedQuantity,
                },
                { title: 'ĐV', dataIndex: 'unit', width: 70 },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, align: 'right',
                  render: (v: number) => v?.toLocaleString('vi-VN') },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={6}>
                    <Text strong>Tổng: {approveRequest.totalAmount?.toLocaleString('vi-VN')}đ</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
