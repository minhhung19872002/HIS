/**
 * 7 báo cáo thanh toán — N1.03.
 * Mirror MQ Solutions KTM reports section.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, Tabs, DatePicker, Button, Space, Table, Tag, Select, Statistic, Row, Col, message } from 'antd';
import { FileExcelOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import { exportToExcel, formatVnd, formatDateTime, formatDate } from '../utils/excelExport';

const { RangePicker } = DatePicker;

export default function PaymentReports() {
  return (
    <Card title={<Space><DollarOutlined /> Báo cáo thanh toán (7 loại MQ chuẩn)</Space>}>
      <Tabs
        items={[
          { key: 'bc1', label: 'Tạm ứng qua cổng', children: <DepositGatewayReport /> },
          { key: 'bc2', label: 'Thu theo ngày - Tổng hợp', children: <DailySummaryReport /> },
          { key: 'bc3', label: 'Thu theo ngày - Chi tiết', children: <DailyDetailReport /> },
          { key: 'bc4', label: 'HDDT sự nghiệp (BHYT)', children: <EInvoiceReport type="budget" /> },
          { key: 'bc5', label: 'HDDT dịch vụ (thu phí)', children: <EInvoiceReport type="service" /> },
          { key: 'bc6', label: 'Viện phí chi tiết', children: <BillingDetailReport /> },
          { key: 'bc7', label: 'Hoàn trả qua cổng', children: <RefundGatewayReport /> },
        ]}
      />
    </Card>
  );
}

interface TxnRow {
  txnRef: string;
  gatewayTxnRef?: string;
  patientName?: string;
  patientCode?: string;
  amount: number;
  provider: string;
  bankCode?: string;
  completedAt?: string;
}

function DepositGatewayReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [provider, setProvider] = useState<string | undefined>();
  const [data, setData] = useState<{ items: TxnRow[]; totalCount: number; totalAmount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/payment-reports/deposit-gateway', {
        params: {
          fromDate: range[0].toISOString(),
          toDate: range[1].toISOString(),
          provider,
        },
      });
      setData(res as typeof data);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range, provider]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Select
          placeholder="Cổng thanh toán"
          allowClear
          value={provider}
          onChange={setProvider}
          style={{ width: 150 }}
          options={[
            { value: 'vnpay', label: 'VNPay' },
            { value: 'momo', label: 'MoMo' },
            { value: 'zalopay', label: 'ZaloPay' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={!data || data.items.length === 0}
          onClick={() => exportToExcel(
            (data?.items ?? []) as unknown as Array<Record<string, unknown>>,
            [
              { header: 'Mã GD', key: 'txnRef', width: 22 },
              { header: 'Mã cổng', key: 'gatewayTxnRef', width: 18 },
              { header: 'Mã BN', key: 'patientCode', width: 12 },
              { header: 'Họ tên', key: 'patientName' },
              { header: 'Số tiền', key: 'amount', format: formatVnd, width: 14 },
              { header: 'Cổng', key: 'provider', width: 10 },
              { header: 'Ngân hàng', key: 'bankCode', width: 12 },
              { header: 'Thời gian', key: 'completedAt', format: formatDateTime, width: 20 },
            ],
            `BC1-TamUng-VNPay-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={8}><Statistic title="Số giao dịch" value={data?.totalCount ?? 0} /></Col>
        <Col span={8}>
          <Statistic title="Tổng tạm ứng" value={data?.totalAmount ?? 0} suffix="đ" precision={0} />
        </Col>
      </Row>
      <Table
        rowKey="txnRef"
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Mã GD', dataIndex: 'txnRef', width: 180 },
          { title: 'Mã cổng', dataIndex: 'gatewayTxnRef', width: 150 },
          { title: 'BN', render: (_, r: TxnRow) => `${r.patientCode || ''} ${r.patientName || ''}` },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: formatVnd },
          { title: 'Cổng', dataIndex: 'provider', render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
          { title: 'NH', dataIndex: 'bankCode' },
          { title: 'Thời gian', dataIndex: 'completedAt', render: formatDateTime },
        ]}
      />
    </>
  );
}

interface DailySummaryRow {
  date: string;
  receipts: number;
  deposit: number;
  payment: number;
  refund: number;
  net: number;
  cash: number;
  transfer: number;
  card: number;
  eWallet: number;
}

function DailySummaryReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [data, setData] = useState<{ byDay: DailySummaryRow[]; totalNet: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/payment-reports/daily-summary', {
        params: { fromDate: range[0].toISOString(), toDate: range[1].toISOString() },
      });
      setData(res as typeof data);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={!data?.byDay?.length}
          onClick={() => exportToExcel(
            (data?.byDay ?? []) as unknown as Array<Record<string, unknown>>,
            [
              { header: 'Ngày', key: 'date', format: formatDate, width: 12 },
              { header: 'Số phiếu', key: 'receipts', width: 10 },
              { header: 'Tạm ứng', key: 'deposit', format: formatVnd, width: 14 },
              { header: 'Viện phí', key: 'payment', format: formatVnd, width: 14 },
              { header: 'Hoàn trả', key: 'refund', format: formatVnd, width: 14 },
              { header: 'Net', key: 'net', format: formatVnd, width: 14 },
              { header: 'Tiền mặt', key: 'cash', format: formatVnd, width: 14 },
              { header: 'Chuyển khoản', key: 'transfer', format: formatVnd, width: 14 },
              { header: 'Thẻ', key: 'card', format: formatVnd, width: 14 },
              { header: 'Ví điện tử', key: 'eWallet', format: formatVnd, width: 14 },
            ],
            `BC2-ThuTheoNgay-TongHop-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Statistic title="Tổng thu ròng (net)" value={data?.totalNet ?? 0} suffix="đ" precision={0} style={{ marginBottom: 12 }} />
      <Table
        rowKey="date"
        dataSource={data?.byDay ?? []}
        loading={loading}
        pagination={false}
        columns={[
          { title: 'Ngày', dataIndex: 'date', render: formatDate, width: 110 },
          { title: 'Phiếu', dataIndex: 'receipts', width: 70 },
          { title: 'Tạm ứng', dataIndex: 'deposit', align: 'right', render: formatVnd },
          { title: 'Viện phí', dataIndex: 'payment', align: 'right', render: formatVnd },
          { title: 'Hoàn trả', dataIndex: 'refund', align: 'right', render: formatVnd },
          { title: 'Net', dataIndex: 'net', align: 'right', render: formatVnd },
          { title: 'Tiền mặt', dataIndex: 'cash', align: 'right', render: formatVnd },
          { title: 'CK', dataIndex: 'transfer', align: 'right', render: formatVnd },
          { title: 'Thẻ', dataIndex: 'card', align: 'right', render: formatVnd },
          { title: 'Ví', dataIndex: 'eWallet', align: 'right', render: formatVnd },
        ]}
      />
    </>
  );
}

interface DailyDetailRow {
  receiptCode: string;
  receiptDate: string;
  patientCode?: string;
  patientName?: string;
  receiptType: number;
  receiptTypeName: string;
  paymentMethod: number;
  paymentMethodName: string;
  amount: number;
  finalAmount: number;
  cashierName?: string;
}

function DailyDetailReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [data, setData] = useState<DailyDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get<DailyDetailRow[]>('/payment-reports/daily-detail', {
        params: { fromDate: range[0].toISOString(), toDate: range[1].toISOString() },
      });
      setData(res);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={data.length === 0}
          onClick={() => exportToExcel(
            data as unknown as Array<Record<string, unknown>>,
            [
              { header: 'Mã phiếu', key: 'receiptCode', width: 18 },
              { header: 'Ngày', key: 'receiptDate', format: formatDateTime, width: 18 },
              { header: 'Mã BN', key: 'patientCode', width: 12 },
              { header: 'Họ tên', key: 'patientName' },
              { header: 'Loại', key: 'receiptTypeName', width: 12 },
              { header: 'PT', key: 'paymentMethodName', width: 14 },
              { header: 'Thành tiền', key: 'finalAmount', format: formatVnd, width: 14 },
              { header: 'Thu ngân', key: 'cashierName' },
            ],
            `BC3-ThuTheoNgay-ChiTiet-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Table
        rowKey="receiptCode"
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'receiptCode', width: 160 },
          { title: 'Ngày', dataIndex: 'receiptDate', render: formatDateTime, width: 160 },
          { title: 'BN', render: (_, r: DailyDetailRow) => `${r.patientCode || ''} ${r.patientName || ''}` },
          { title: 'Loại', dataIndex: 'receiptTypeName', width: 110, render: (v: string) => <Tag>{v}</Tag> },
          { title: 'PT', dataIndex: 'paymentMethodName', width: 130 },
          { title: 'Thành tiền', dataIndex: 'finalAmount', align: 'right', render: formatVnd },
          { title: 'Thu ngân', dataIndex: 'cashierName' },
        ]}
      />
    </>
  );
}

interface EInvoiceRow {
  invoiceSeries: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientName: string;
  subTotal?: number;
  vatAmount?: number;
  totalAmount: number;
  status: number;
}

function EInvoiceReport({ type }: { type: 'budget' | 'service' }) {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [data, setData] = useState<{ items: EInvoiceRow[]; totalAmount: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = type === 'budget' ? '/payment-reports/einvoice-budget' : '/payment-reports/einvoice-service';
  const label = type === 'budget' ? 'HDDT sự nghiệp (BHYT)' : 'HDDT dịch vụ';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(endpoint, {
        params: { fromDate: range[0].toISOString(), toDate: range[1].toISOString() },
      });
      setData(res as typeof data);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range, endpoint]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={!data?.items?.length}
          onClick={() => exportToExcel(
            (data?.items ?? []) as unknown as Array<Record<string, unknown>>,
            [
              { header: 'Ký hiệu', key: 'invoiceSeries', width: 12 },
              { header: 'Số HĐ', key: 'invoiceNumber', width: 12 },
              { header: 'Ngày', key: 'invoiceDate', format: formatDate, width: 12 },
              { header: 'Họ tên', key: 'patientName' },
              { header: 'Trước thuế', key: 'subTotal', format: formatVnd, width: 14 },
              { header: 'VAT', key: 'vatAmount', format: formatVnd, width: 14 },
              { header: 'Tổng', key: 'totalAmount', format: formatVnd, width: 14 },
            ],
            `${type === 'budget' ? 'BC4-HDDT-SuNghiep' : 'BC5-HDDT-DichVu'}-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={8}><Statistic title={label} value={data?.count ?? 0} suffix="HĐ" /></Col>
        <Col span={8}><Statistic title="Tổng tiền" value={data?.totalAmount ?? 0} suffix="đ" precision={0} /></Col>
      </Row>
      <Table
        rowKey={(r: EInvoiceRow) => `${r.invoiceSeries}-${r.invoiceNumber}`}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Ký hiệu', dataIndex: 'invoiceSeries', width: 100 },
          { title: 'Số HĐ', dataIndex: 'invoiceNumber', width: 100 },
          { title: 'Ngày', dataIndex: 'invoiceDate', render: formatDate, width: 110 },
          { title: 'Họ tên', dataIndex: 'patientName' },
          { title: 'Trước thuế', dataIndex: 'subTotal', align: 'right', render: formatVnd },
          { title: 'VAT', dataIndex: 'vatAmount', align: 'right', render: formatVnd },
          { title: 'Tổng', dataIndex: 'totalAmount', align: 'right', render: formatVnd },
        ]}
      />
    </>
  );
}

function BillingDetailReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get<Array<Record<string, unknown>>>('/payment-reports/billing-detail', {
        params: { fromDate: range[0].toISOString(), toDate: range[1].toISOString() },
      });
      setData(res);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={data.length === 0}
          onClick={() => exportToExcel(
            data,
            [
              { header: 'Mã phiếu', key: 'receiptCode', width: 18 },
              { header: 'Ngày', key: 'receiptDate', format: formatDateTime, width: 18 },
              { header: 'BN', key: 'patientName' },
              { header: 'Mã DV', key: 'itemCode', width: 12 },
              { header: 'Tên DV', key: 'itemName' },
              { header: 'SL', key: 'quantity', width: 8 },
              { header: 'Đơn giá', key: 'unitPrice', format: formatVnd, width: 12 },
              { header: 'Thành tiền', key: 'finalAmount', format: formatVnd, width: 14 },
            ],
            `BC6-VienPhi-ChiTiet-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Table
        rowKey={(_, idx) => String(idx)}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Phiếu', dataIndex: 'receiptCode', width: 150 },
          { title: 'Ngày', dataIndex: 'receiptDate', render: formatDateTime, width: 150 },
          { title: 'BN', dataIndex: 'patientName' },
          { title: 'Mã DV', dataIndex: 'itemCode', width: 100 },
          { title: 'Tên DV', dataIndex: 'itemName' },
          { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' },
          { title: 'Thành tiền', dataIndex: 'finalAmount', align: 'right', render: (v) => formatVnd(v as unknown) },
        ]}
      />
    </>
  );
}

function RefundGatewayReport() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [data, setData] = useState<{ items: Array<Record<string, unknown>>; count: number; totalRefunded: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/payment-reports/refund-gateway', {
        params: { fromDate: range[0].toISOString(), toDate: range[1].toISOString() },
      });
      setData(res as typeof data);
    } catch { message.error('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button
          icon={<FileExcelOutlined />}
          disabled={!data?.items?.length}
          onClick={() => exportToExcel(
            data?.items ?? [],
            [
              { header: 'Mã GD', key: 'txnRef', width: 22 },
              { header: 'Cổng', key: 'provider', width: 10 },
              { header: 'Họ tên', key: 'patientName' },
              { header: 'Tiền gốc', key: 'originalAmount', format: formatVnd },
              { header: 'Đã hoàn', key: 'refundedAmount', format: formatVnd },
              { header: 'Ngày hoàn', key: 'refundedAt', format: formatDateTime },
              { header: 'Lý do', key: 'refundReason' },
            ],
            `BC7-HoanTra-VNPay-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
          )}
        >
          Xuất Excel
        </Button>
      </Space>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={8}><Statistic title="Số giao dịch hoàn" value={data?.count ?? 0} /></Col>
        <Col span={8}><Statistic title="Tổng hoàn" value={data?.totalRefunded ?? 0} suffix="đ" precision={0} /></Col>
      </Row>
      <Table
        rowKey={(r: Record<string, unknown>) => String(r.txnRef)}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Mã GD', dataIndex: 'txnRef', width: 180 },
          { title: 'Cổng', dataIndex: 'provider', render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
          { title: 'BN', dataIndex: 'patientName' },
          { title: 'Gốc', dataIndex: 'originalAmount', align: 'right', render: (v) => formatVnd(v as unknown) },
          { title: 'Đã hoàn', dataIndex: 'refundedAmount', align: 'right', render: (v) => formatVnd(v as unknown) },
          { title: 'Ngày', dataIndex: 'refundedAt', render: formatDateTime, width: 150 },
          { title: 'Lý do', dataIndex: 'refundReason' },
        ]}
      />
    </>
  );
}
