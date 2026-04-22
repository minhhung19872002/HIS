import { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Space, Input, Select, DatePicker, Button, Statistic,
  Row, Col, Modal, Form, InputNumber, message,
} from 'antd';
import { ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import {
  searchTransactions,
  refundPayment,
  getPaymentStats,
  paymentStatusColor,
  type PaymentTransactionDto,
  type PaymentSearchRequest,
  type PaymentStatsDto,
} from '../api/paymentGateway';

const { RangePicker } = DatePicker;

const statusOptions = [
  { value: 0, label: 'Chờ thanh toán' },
  { value: 1, label: 'Đã thanh toán' },
  { value: 2, label: 'Thất bại' },
  { value: 3, label: 'Đã hoàn tiền' },
  { value: 4, label: 'Hết hạn' },
];

const providerOptions = [
  { value: 'vnpay', label: 'VNPay' },
  { value: 'momo', label: 'MoMo' },
  { value: 'zalopay', label: 'ZaloPay' },
];

export default function PaymentTransactions() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PaymentTransactionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<PaymentStatsDto | null>(null);
  const [keyword, setKeyword] = useState('');
  const [provider, setProvider] = useState<string | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [refundModal, setRefundModal] = useState<{ open: boolean; txn?: PaymentTransactionDto }>({ open: false });
  const [refundForm] = Form.useForm<{ amount: number; reason: string }>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const req: PaymentSearchRequest = {
        keyword: keyword || undefined,
        provider,
        status,
        fromDate: range?.[0]?.toISOString(),
        toDate: range?.[1]?.toISOString(),
        pageIndex: page,
        pageSize,
      };
      const res = await searchTransactions(req);
      setItems(res.items);
      setTotal(res.totalCount);

      const statsFrom = range?.[0]?.toISOString() ?? new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
      const statsTo = range?.[1]?.toISOString() ?? new Date().toISOString();
      const s = await getPaymentStats(statsFrom, statsTo, provider);
      setStats(s);
    } catch (e: unknown) {
      console.warn('Load payment transactions failed', e);
      message.error('Không tải được danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize]);

  const handleSearch = () => { setPage(1); fetchData(); };

  const handleReset = () => {
    setKeyword(''); setProvider(undefined); setStatus(undefined); setRange(null);
    setPage(1);
    setTimeout(fetchData, 0);
  };

  const handleRefund = async () => {
    const txn = refundModal.txn;
    if (!txn) return;
    const values = await refundForm.validateFields();
    try {
      await refundPayment(txn.id, values.amount, values.reason);
      message.success('Đã hoàn tiền');
      setRefundModal({ open: false });
      refundForm.resetFields();
      fetchData();
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || 'Hoàn tiền thất bại');
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="Tổng giao dịch" value={stats?.totalTransactions ?? 0} loading={loading} />
          </Col>
          <Col span={6}>
            <Statistic title="Thành công" value={stats?.successTransactions ?? 0} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Tổng thu" value={stats?.totalSuccessAmount ?? 0} suffix="đ" />
          </Col>
          <Col span={6}>
            <Statistic title="Đã hoàn" value={stats?.totalRefundedAmount ?? 0} suffix="đ" valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>
      </Card>

      <Card
        title="Quản lý giao dịch thanh toán"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Tìm theo mã GD, tên BN, mã cổng"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 260 }}
          />
          <Select
            placeholder="Cổng thanh toán"
            value={provider}
            onChange={setProvider}
            options={providerOptions}
            allowClear
            style={{ width: 150 }}
          />
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={setStatus}
            options={statusOptions}
            allowClear
            style={{ width: 150 }}
          />
          <RangePicker value={range ?? undefined} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
          <Button type="primary" onClick={handleSearch}>Tìm kiếm</Button>
          <Button onClick={handleReset}>Xóa lọc</Button>
        </Space>

        <Table<PaymentTransactionDto>
          rowKey="id"
          dataSource={items}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, s) => { setPage(p); setPageSize(s); },
            showTotal: (t) => `Tổng ${t} giao dịch`,
          }}
          columns={[
            { title: 'Mã GD', dataIndex: 'txnRef', width: 180 },
            { title: 'Cổng', dataIndex: 'provider', width: 80, render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
            { title: 'BN', render: (_, r) => `${r.patientCode || ''} ${r.patientName || ''}`.trim() },
            {
              title: 'Nội dung',
              dataIndex: 'orderInfo',
              ellipsis: true,
            },
            {
              title: 'Số tiền',
              dataIndex: 'amount',
              align: 'right',
              width: 140,
              render: (v: number) => v?.toLocaleString('vi-VN'),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'statusText',
              width: 150,
              render: (t: string, r) => <Tag color={paymentStatusColor(r.status)}>{t}</Tag>,
            },
            { title: 'Ngân hàng', dataIndex: 'bankCode', width: 100 },
            {
              title: 'Thời gian',
              dataIndex: 'createdAt',
              width: 170,
              render: (v: string) => new Date(v).toLocaleString('vi-VN'),
            },
            {
              title: 'Hành động',
              width: 130,
              render: (_, r) => r.status === 1 && r.refundedAmount < r.amount ? (
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => {
                    refundForm.setFieldsValue({ amount: r.amount - r.refundedAmount, reason: '' });
                    setRefundModal({ open: true, txn: r });
                  }}
                >
                  Hoàn tiền
                </Button>
              ) : null,
            },
          ]}
        />
      </Card>

      <Modal
        title="Hoàn tiền giao dịch"
        open={refundModal.open}
        onOk={handleRefund}
        onCancel={() => { setRefundModal({ open: false }); refundForm.resetFields(); }}
        okText="Hoàn tiền"
      >
        <Form form={refundForm} layout="vertical">
          <Form.Item
            name="amount"
            label={`Số tiền (tối đa ${((refundModal.txn?.amount ?? 0) - (refundModal.txn?.refundedAmount ?? 0)).toLocaleString('vi-VN')}đ)`}
            rules={[{ required: true, message: 'Nhập số tiền cần hoàn' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do hoàn tiền' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
