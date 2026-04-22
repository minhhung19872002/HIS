import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Space, Select, DatePicker, Button, Input, Modal, Form,
  InputNumber, message, Tabs, Alert, Badge, Popconfirm, Drawer, Checkbox,
} from 'antd';
import { ReloadOutlined, CheckCircleOutlined, UndoOutlined, ExclamationCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { exportToExcel, formatVnd, formatDateTime } from '../utils/excelExport';
import type { Dayjs } from 'dayjs';
import {
  searchApprovals,
  approveApproval,
  revokeApproval,
  submitApproval,
  getApprovalById,
  getExpiringMedicines,
  deleteApprovalDraft,
  APPROVAL_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  type PharmacyApprovalDto,
  type PharmacyApprovalItemDto,
  type PharmacyApprovalSearchRequest,
  type ExpiringMedicineDto,
} from '../api/pharmacyApproval';

const { RangePicker } = DatePicker;

function useApprovalList(defaults: PharmacyApprovalSearchRequest) {
  const [items, setItems] = useState<PharmacyApprovalDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (req: PharmacyApprovalSearchRequest) => {
    setLoading(true);
    try {
      const res = await searchApprovals({ ...defaults, ...req });
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      console.warn(e);
      message.error('Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, total, load };
}

export default function PharmacyApproval() {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [keyword, setKeyword] = useState('');
  const [approvalType, setApprovalType] = useState<number | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<PharmacyApprovalDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveForm] = Form.useForm<{
    items: { itemId: string; approvedQuantity: number; isExcluded: boolean }[];
    note?: string;
  }>();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeForm] = Form.useForm<{ reason: string }>();
  const [expiring, setExpiring] = useState<ExpiringMedicineDto[]>([]);
  const [showExpiring, setShowExpiring] = useState(false);

  const status = useMemo(() => {
    if (activeTab === 'pending') return 2;
    if (activeTab === 'approved') return 3;
    if (activeTab === 'draft') return 0;
    if (activeTab === 'revoked') return 4;
    return undefined;
  }, [activeTab]);

  const { items, loading, total, load } = useApprovalList({ pageSize: 20 });

  const refresh = useCallback(() => {
    load({
      status,
      approvalType,
      keyword: keyword || undefined,
      fromDate: range?.[0]?.toISOString(),
      toDate: range?.[1]?.toISOString(),
      pageIndex: page,
      pageSize: 20,
    });
  }, [status, approvalType, keyword, range, page, load]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    getExpiringMedicines(60).then(setExpiring).catch(() => {});
  }, []);

  const expiringCritical = expiring.filter(e => e.severity === 'critical' || e.severity === 'expired');

  const handleViewDetail = async (id: string) => {
    const data = await getApprovalById(id);
    setDetail(data);
    setDetailOpen(true);
  };

  const handleOpenApprove = async (id: string) => {
    const data = await getApprovalById(id);
    setDetail(data);
    approveForm.setFieldsValue({
      items: data.items.map(i => ({
        itemId: i.id,
        approvedQuantity: i.requestedQuantity,
        isExcluded: false,
      })),
    });
    setApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      const values = await approveForm.validateFields();
      await approveApproval(detail.id, values.items, values.note);
      message.success('Đã duyệt phiếu');
      setApproveOpen(false);
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  const handleOpenRevoke = (row: PharmacyApprovalDto) => {
    setDetail(row);
    revokeForm.resetFields();
    setRevokeOpen(true);
  };

  const handleRevoke = async () => {
    if (!detail) return;
    try {
      const values = await revokeForm.validateFields();
      await revokeApproval(detail.id, values.reason);
      message.success('Đã thu hồi phiếu');
      setRevokeOpen(false);
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Thu hồi thất bại');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitApproval(id);
      message.success('Đã chuyển xuống kho chờ duyệt');
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Gửi thất bại');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteApprovalDraft(id);
      message.success('Đã xóa phiếu nháp');
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xóa thất bại');
    }
  };

  return (
    <div>
      {expiringCritical.length > 0 && (
        <Alert
          title={`Cảnh báo: ${expiringCritical.length} mặt hàng sắp hoặc đã hết hạn`}
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                {expiring.filter(e => e.severity === 'expired').length > 0 &&
                  <Tag color="red">{expiring.filter(e => e.severity === 'expired').length} đã hết hạn</Tag>}
                {expiring.filter(e => e.severity === 'critical').length > 0 &&
                  <Tag color="volcano">{expiring.filter(e => e.severity === 'critical').length} ≤7 ngày</Tag>}
                {expiring.filter(e => e.severity === 'warning').length > 0 &&
                  <Tag color="gold">{expiring.filter(e => e.severity === 'warning').length} ≤30 ngày</Tag>}
              </div>
              <Button size="small" onClick={() => setShowExpiring(true)}>Xem chi tiết</Button>
            </Space>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Card title="Phê duyệt cấp phát kho Dược" extra={
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => exportToExcel(
              items as unknown as Array<Record<string, unknown>>,
              [
                { header: 'Mã phiếu', key: 'approvalCode', width: 22 },
                { header: 'Loại', key: 'approvalTypeName', width: 26 },
                { header: 'Khoa/Phòng', key: 'fromDepartmentName', width: 20 },
                { header: 'Kho nhận', key: 'toWarehouseName', width: 20 },
                { header: 'BN', key: 'patientName' },
                { header: 'Tổng tiền', key: 'totalAmount', format: formatVnd, width: 15 },
                { header: 'Trạng thái', key: 'statusText', width: 14 },
                { header: 'Ngày', key: 'requestDate', format: formatDateTime, width: 20 },
              ],
              `duyet-cap-duoc-${new Date().toISOString().split('T')[0]}`,
              'Phê duyệt',
            )}
            disabled={items.length === 0}
          >
            Xuất Excel
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refresh}>Làm mới</Button>
        </Space>
      }>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Tìm theo mã phiếu, ghi chú, tên BN"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => { setPage(1); refresh(); }}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Loại phiếu"
            value={approvalType}
            onChange={setApprovalType}
            options={Object.entries(APPROVAL_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))}
            allowClear
            style={{ width: 240 }}
          />
          <RangePicker value={range ?? undefined} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
          <Button type="primary" onClick={() => { setPage(1); refresh(); }}>Tìm</Button>
          <Button onClick={() => { setKeyword(''); setApprovalType(undefined); setRange(null); setPage(1); }}>Xóa lọc</Button>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'pending', label: <Badge count={items.filter(i => i.status === 2).length} offset={[8, 0]}><span>Chờ duyệt</span></Badge> },
            { key: 'approved', label: 'Đã duyệt' },
            { key: 'draft', label: 'Đang nhập' },
            { key: 'revoked', label: 'Đã thu hồi' },
            { key: 'all', label: 'Tất cả' },
          ]}
        />

        <Table<PharmacyApprovalDto>
          rowKey="id"
          dataSource={items}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showTotal: (t) => `Tổng ${t} phiếu`,
          }}
          columns={[
            { title: 'Mã phiếu', dataIndex: 'approvalCode', width: 220 },
            { title: 'Loại', dataIndex: 'approvalTypeName', width: 200, render: (v: string, r) => <Tag color="blue">{v} ({APPROVAL_TYPE_LABELS[r.approvalType]})</Tag> },
            { title: 'Khoa/Phòng', dataIndex: 'fromDepartmentName' },
            { title: 'Kho nhận', dataIndex: 'toWarehouseName' },
            { title: 'BN', render: (_, r) => r.patientName ? `${r.patientCode || ''} ${r.patientName}` : '-' },
            {
              title: 'Tổng tiền',
              dataIndex: 'totalAmount',
              align: 'right',
              width: 130,
              render: (v: number) => v.toLocaleString('vi-VN'),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 120,
              render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
            },
            { title: 'Ngày', dataIndex: 'requestDate', width: 160, render: (v: string) => new Date(v).toLocaleString('vi-VN') },
            {
              title: 'Hành động',
              width: 280,
              render: (_, r) => (
                <Space size="small">
                  <Button size="small" onClick={() => handleViewDetail(r.id)}>Xem</Button>
                  {(r.status === 0 || r.status === 1) && (
                    <>
                      <Button size="small" type="primary" onClick={() => handleSubmit(r.id)}>Gửi xuống kho</Button>
                      <Popconfirm title="Xóa phiếu nháp?" onConfirm={() => handleDeleteDraft(r.id)}>
                        <Button size="small" danger>Xóa</Button>
                      </Popconfirm>
                    </>
                  )}
                  {r.status === 2 && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleOpenApprove(r.id)}>
                      Duyệt
                    </Button>
                  )}
                  {r.status === 3 && (
                    <Button size="small" danger icon={<UndoOutlined />} onClick={() => handleOpenRevoke(r)}>
                      Thu hồi
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer title={`Chi tiết: ${detail?.approvalCode || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} width={720}>
        {detail && <ApprovalDetail data={detail} />}
      </Drawer>

      <Modal
        title="Duyệt phiếu cấp phát"
        open={approveOpen}
        onCancel={() => setApproveOpen(false)}
        onOk={handleApprove}
        width={840}
        okText="Duyệt"
      >
        <Form form={approveForm} layout="vertical">
          <Alert
            title="Có thể chỉnh số lượng duyệt hoặc tick Bỏ để loại khỏi phiếu"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Form.List name="items">
            {(fields) => {
              type RowRender = PharmacyApprovalItemDto & { __fieldIndex: number };
              const rows: RowRender[] = fields.map(f => {
                const itemId = approveForm.getFieldValue(['items', f.name, 'itemId']);
                const item = detail?.items.find(i => i.id === itemId);
                return {
                  ...(item || {
                    id: itemId || `row-${f.name}`,
                    requestedQuantity: 0,
                    approvedQuantity: 0,
                    unitPrice: 0,
                    amount: 0,
                    isExcluded: false,
                  }),
                  __fieldIndex: f.name,
                } as RowRender;
              });
              return (
                <Table<RowRender>
                  dataSource={rows}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: 'Thuốc/VTYT', render: (_, row) => row.medicineName || row.supplyName },
                    { title: 'Yêu cầu', dataIndex: 'requestedQuantity', width: 100, align: 'right' },
                    { title: 'Lô', dataIndex: 'batchNumber', width: 120 },
                    { title: 'HSD', dataIndex: 'expiryDate', width: 110, render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '' },
                    {
                      title: 'Duyệt',
                      width: 120,
                      render: (_, row) => (
                        <Form.Item noStyle name={[row.__fieldIndex, 'approvedQuantity']}>
                          <InputNumber min={0} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: 'Bỏ',
                      width: 60,
                      render: (_, row) => (
                        <Form.Item noStyle name={[row.__fieldIndex, 'isExcluded']} valuePropName="checked">
                          <Checkbox />
                        </Form.Item>
                      ),
                    },
                  ]}
                />
              );
            }}
          </Form.List>
          <Form.Item name="note" label="Ghi chú" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thu hồi phiếu đã duyệt"
        open={revokeOpen}
        onOk={handleRevoke}
        onCancel={() => setRevokeOpen(false)}
        okText="Thu hồi"
        okButtonProps={{ danger: true }}
      >
        <Alert
          title="Thu hồi sẽ hoàn lại số lượng đã trừ vào kho"
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <Form form={revokeForm} layout="vertical">
          <Form.Item name="reason" label="Lý do thu hồi" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Thuốc sắp/đã hết hạn" open={showExpiring} onClose={() => setShowExpiring(false)} width={720}>
        <Table<ExpiringMedicineDto>
          rowKey="inventoryItemId"
          dataSource={expiring}
          pagination={{ pageSize: 30 }}
          columns={[
            { title: 'Mã', dataIndex: 'medicineCode', width: 100 },
            { title: 'Tên thuốc', dataIndex: 'medicineName' },
            { title: 'Lô', dataIndex: 'batchNumber', width: 100 },
            {
              title: 'HSD',
              dataIndex: 'expiryDate',
              width: 110,
              render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '',
            },
            {
              title: 'Còn lại',
              dataIndex: 'daysUntilExpiry',
              width: 100,
              render: (d: number, r) => {
                if (r.severity === 'expired') return <Tag color="red">Đã hết hạn</Tag>;
                if (d <= 7) return <Tag color="volcano">{d} ngày</Tag>;
                if (d <= 30) return <Tag color="gold">{d} ngày</Tag>;
                return <Tag>{d} ngày</Tag>;
              },
            },
            { title: 'SL tồn', dataIndex: 'quantity', width: 80, align: 'right' },
            { title: 'Kho', dataIndex: 'warehouseName' },
          ]}
        />
      </Drawer>
    </div>
  );
}

function ApprovalDetail({ data }: { data: PharmacyApprovalDto }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Tag color="blue">{data.approvalTypeName}</Tag>
        <Tag color={STATUS_COLORS[data.status]}>{STATUS_LABELS[data.status]}</Tag>
      </div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div><strong>Khoa:</strong> {data.fromDepartmentName || '-'}</div>
        <div><strong>Kho:</strong> {data.toWarehouseName || '-'}</div>
        {data.patientName && <div><strong>BN:</strong> {data.patientCode} — {data.patientName}</div>}
        {data.lockedObject && <div><strong>Đối tượng khóa:</strong> {data.lockedObject}</div>}
        {data.note && <div><strong>Ghi chú:</strong> {data.note}</div>}
        {data.revokeReason && <div><strong>Lý do thu hồi:</strong> {data.revokeReason}</div>}
      </Space>
      <Table<PharmacyApprovalItemDto>
        style={{ marginTop: 16 }}
        rowKey="id"
        dataSource={data.items}
        pagination={false}
        size="small"
        columns={[
          { title: 'Thuốc/VTYT', render: (_, r) => r.medicineName || r.supplyName },
          { title: 'Lô', dataIndex: 'batchNumber', width: 110 },
          { title: 'YC', dataIndex: 'requestedQuantity', align: 'right', width: 80 },
          { title: 'Duyệt', dataIndex: 'approvedQuantity', align: 'right', width: 80, render: (v: number, r) => r.isExcluded ? <Tag color="red">Bỏ</Tag> : v },
          { title: 'ĐVT', dataIndex: 'unit', width: 70 },
          { title: 'Đơn giá', dataIndex: 'unitPrice', align: 'right', width: 100, render: (v: number) => v.toLocaleString('vi-VN') },
          { title: 'Thành tiền', dataIndex: 'amount', align: 'right', width: 120, render: (v: number) => v.toLocaleString('vi-VN') },
        ]}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6} align="right"><strong>Tổng:</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{data.totalAmount.toLocaleString('vi-VN')}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
}
