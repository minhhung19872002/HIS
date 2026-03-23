import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  InputNumber,
  Tooltip,
  Divider,
  AutoComplete,
} from 'antd';
import {
  ShopOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as pharmacyApi from '../api/hospitalPharmacy';
import type {
  RetailSaleDto,
  MedicineSearchResultDto,
  PharmacyDashboardDto,
  PharmacyRevenueDto,
  RetailSaleCreateDto,
} from '../api/hospitalPharmacy';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const PAYMENT_LABELS: Record<number, string> = {
  0: 'Tien mat',
  1: 'The',
  2: 'Chuyen khoan',
};

const PAYMENT_COLORS: Record<number, string> = {
  0: 'green',
  1: 'blue',
  2: 'purple',
};

interface CartItem {
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const HospitalPharmacy: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<PharmacyDashboardDto>({
    todayRevenue: 0,
    todaySaleCount: 0,
    lowStockCount: 0,
  });
  const [sales, setSales] = useState<RetailSaleDto[]>([]);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [stock, setStock] = useState<MedicineSearchResultDto[]>([]);
  const [stockTotalCount, setStockTotalCount] = useState(0);
  const [revenue, setRevenue] = useState<PharmacyRevenueDto[]>([]);
  const [activeTab, setActiveTab] = useState('retail');
  const [keyword, setKeyword] = useState('');
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [stockKeyword, setStockKeyword] = useState('');
  const [reportDateRange, setReportDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Cart state for retail
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<{ value: string; label: string; medicine: MedicineSearchResultDto }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        pharmacyApi.getPharmacyDashboard(),
        pharmacyApi.getRetailSales({
          keyword: historyKeyword || undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        pharmacyApi.getPharmacyStock({ keyword: stockKeyword || undefined }),
        pharmacyApi.getPharmacyRevenue(
          reportDateRange[0].format('YYYY-MM-DD'),
          reportDateRange[1].format('YYYY-MM-DD'),
        ),
      ]);

      if (results[0].status === 'fulfilled') {
        setDashboard(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        const data = results[1].value;
        setSales(data.items || []);
        setSalesTotalCount(data.totalCount || 0);
      }
      if (results[2].status === 'fulfilled') {
        const data = results[2].value;
        setStock(data.items || []);
        setStockTotalCount(data.totalCount || 0);
      }
      if (results[3].status === 'fulfilled') {
        setRevenue(results[3].value || []);
      }
    } catch {
      message.warning('Khong the tai du lieu nha thuoc');
    } finally {
      setLoading(false);
    }
  }, [historyKeyword, stockKeyword, reportDateRange, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Medicine search for retail tab
  const handleMedicineSearch = async (value: string) => {
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await pharmacyApi.searchMedicines(value);
      setSearchResults(
        results.map((m) => ({
          value: m.id,
          label: `${m.medicineName} (${m.unit}) - ${m.unitPrice.toLocaleString()}d - Ton: ${m.stockQuantity}`,
          medicine: m,
        })),
      );
    } catch {
      // silent fail on search
    }
  };

  const handleAddToCart = (medicineId: string) => {
    const found = searchResults.find((r) => r.value === medicineId);
    if (!found) return;
    const med = found.medicine;

    // Check if already in cart
    const existing = cart.find((c) => c.medicineId === med.id);
    if (existing) {
      setCart(cart.map((c) =>
        c.medicineId === med.id
          ? { ...c, quantity: c.quantity + 1, amount: (c.quantity + 1) * c.unitPrice }
          : c,
      ));
    } else {
      setCart([
        ...cart,
        {
          medicineId: med.id,
          medicineName: med.medicineName,
          unit: med.unit,
          quantity: 1,
          unitPrice: med.unitPrice,
          amount: med.unitPrice,
        },
      ]);
    }
    setSearchResults([]);
  };

  const handleRemoveFromCart = (medicineId: string) => {
    setCart(cart.filter((c) => c.medicineId !== medicineId));
  };

  const handleQuantityChange = (medicineId: string, qty: number) => {
    setCart(cart.map((c) =>
      c.medicineId === medicineId
        ? { ...c, quantity: qty, amount: qty * c.unitPrice }
        : c,
    ));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.amount, 0);
  const finalAmount = Math.max(0, cartTotal - discount);

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      message.warning('Vui long them thuoc vao gio hang');
      return;
    }
    setSubmitting(true);
    try {
      const payload: RetailSaleCreateDto = {
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paymentMethod,
        discountAmount: discount || 0,
        items: cart.map((c) => ({
          medicineId: c.medicineId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      };
      await pharmacyApi.createRetailSale(payload);
      message.success('Da tao don ban le thanh cong');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      fetchData();
    } catch {
      message.warning('Khong the tao don ban le');
    } finally {
      setSubmitting(false);
    }
  };

  // Cart columns
  const cartColumns: ColumnsType<CartItem> = [
    { title: 'Ten thuoc', dataIndex: 'medicineName', key: 'medicineName', width: 250, ellipsis: true },
    { title: 'DVT', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty: number, record: CartItem) => (
        <InputNumber
          min={1}
          max={9999}
          value={qty}
          size="small"
          onChange={(val) => handleQuantityChange(record.medicineId, val || 1)}
        />
      ),
    },
    {
      title: 'Don gia',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (v: number) => v.toLocaleString() + ' d',
    },
    {
      title: 'Thanh tien',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (v: number) => <strong>{v.toLocaleString()} d</strong>,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: unknown, record: CartItem) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(record.medicineId)} />
      ),
    },
  ];

  // Sales history columns
  const salesColumns: ColumnsType<RetailSaleDto> = [
    { title: 'Ma don', dataIndex: 'saleCode', key: 'saleCode', width: 130 },
    { title: 'Khach hang', dataIndex: 'customerName', key: 'customerName', width: 160, render: (v: string) => v || 'Khach le' },
    { title: 'SDT', dataIndex: 'customerPhone', key: 'customerPhone', width: 120, render: (v: string) => v || '-' },
    {
      title: 'Tong tien',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      width: 130,
      align: 'right',
      render: (v: number) => (v || 0).toLocaleString() + ' d',
    },
    {
      title: 'PTTT',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 110,
      render: (v: number) => <Tag color={PAYMENT_COLORS[v]}>{PAYMENT_LABELS[v] || 'Khac'}</Tag>,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: number) =>
        s === 0 ? <Tag color="orange">Cho</Tag> :
        s === 1 ? <Tag color="green">Hoan thanh</Tag> :
        <Tag color="red">Da huy</Tag>,
    },
    {
      title: 'Ngay',
      dataIndex: 'saleDate',
      key: 'saleDate',
      width: 120,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
  ];

  // Stock columns
  const stockColumns: ColumnsType<MedicineSearchResultDto> = [
    { title: 'Ma thuoc', dataIndex: 'medicineCode', key: 'medicineCode', width: 120 },
    { title: 'Ten thuoc', dataIndex: 'medicineName', key: 'medicineName', width: 250, ellipsis: true },
    { title: 'Hoat chat', dataIndex: 'activeIngredient', key: 'activeIngredient', width: 200, ellipsis: true },
    { title: 'DVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Don gia', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' d' },
    {
      title: 'Ton kho',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <span style={{ color: v <= 10 ? '#ff4d4f' : undefined, fontWeight: v <= 10 ? 'bold' : undefined }}>
          {(v || 0).toLocaleString()}
        </span>
      ),
    },
    { title: 'So lo', dataIndex: 'batchNumber', key: 'batchNumber', width: 100 },
    {
      title: 'Han dung',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 110,
      render: (d: string) => {
        if (!d) return '-';
        const isExpired = dayjs(d).isBefore(dayjs());
        return <Tag color={isExpired ? 'red' : 'green'}>{dayjs(d).format('DD/MM/YYYY')}</Tag>;
      },
    },
  ];

  // Revenue columns
  const revenueColumns: ColumnsType<PharmacyRevenueDto> = [
    { title: 'Ngay', dataIndex: 'date', key: 'date', width: 120, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'So don', dataIndex: 'totalSales', key: 'totalSales', width: 100, align: 'right' },
    { title: 'Doanh thu', dataIndex: 'totalAmount', key: 'totalAmount', width: 150, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' d' },
    { title: 'Chiet khau', dataIndex: 'totalDiscount', key: 'totalDiscount', width: 130, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' d' },
    {
      title: 'Thuc thu',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      width: 150,
      align: 'right',
      render: (v: number) => <strong>{(v || 0).toLocaleString()} d</strong>,
    },
  ];

  const tabItems = [
    {
      key: 'retail',
      label: (
        <span>
          <ShoppingCartOutlined /> Ban le
        </span>
      ),
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Card title="Tim thuoc" size="small" style={{ marginBottom: 16 }}>
                <AutoComplete
                  style={{ width: '100%' }}
                  options={searchResults}
                  onSearch={handleMedicineSearch}
                  onSelect={handleAddToCart}
                  placeholder="Nhap ten thuoc de tim kiem..."
                />
              </Card>
              <Table
                dataSource={cart}
                columns={cartColumns}
                rowKey="medicineId"
                size="small"
                pagination={false}
                scroll={{ x: 730 }}
                locale={{ emptyText: 'Chua co thuoc trong gio hang' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Card title="Thong tin don" size="small">
                <Form layout="vertical">
                  <Form.Item label="Ten khach hang">
                    <Input
                      placeholder="Tuy chon"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="SDT">
                    <Input
                      placeholder="Tuy chon"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="Phuong thuc TT">
                    <Select
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      options={[
                        { label: 'Tien mat', value: 0 },
                        { label: 'The', value: 1 },
                        { label: 'Chuyen khoan', value: 2 },
                      ]}
                    />
                  </Form.Item>
                  <Divider />
                  <div style={{ marginBottom: 8 }}>
                    <Text>Tong tien: </Text>
                    <Text strong style={{ float: 'right' }}>{cartTotal.toLocaleString()} d</Text>
                  </div>
                  <Form.Item label="Chiet khau">
                    <InputNumber
                      min={0}
                      max={cartTotal}
                      value={discount}
                      onChange={(v) => setDiscount(v || 0)}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                  <div style={{ marginBottom: 16, fontSize: 18 }}>
                    <Text strong>Thanh tien: </Text>
                    <Text strong style={{ float: 'right', color: '#1890ff', fontSize: 20 }}>
                      {finalAmount.toLocaleString()} d
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={handleSubmitSale}
                    loading={submitting}
                    disabled={cart.length === 0}
                  >
                    Thanh toan
                  </Button>
                </Form>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'history',
      label: 'Lich su ban',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim don, khach hang, SDT..."
              onSearch={setHistoryKeyword}
              allowClear
              style={{ width: 300 }}
            />
          </div>
          <Table
            dataSource={sales}
            columns={salesColumns}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: salesTotalCount,
              showSizeChanger: true,
              showTotal: (total) => `Tong ${total} don`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
          />
        </>
      ),
    },
    {
      key: 'stock',
      label: 'Ton kho',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim thuoc, ma thuoc, hoat chat..."
              onSearch={setStockKeyword}
              allowClear
              style={{ width: 300 }}
            />
          </div>
          <Table
            dataSource={stock}
            columns={stockColumns}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{
              total: stockTotalCount,
              showSizeChanger: true,
              showTotal: (total) => `Tong ${total} mat hang`,
            }}
          />
        </>
      ),
    },
    {
      key: 'report',
      label: (
        <span>
          <BarChartOutlined /> Bao cao
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Text>Thoi gian:</Text>
            <RangePicker
              value={reportDateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setReportDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
            />
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              In bao cao
            </Button>
          </div>
          <Table
            dataSource={revenue}
            columns={revenueColumns}
            rowKey="date"
            size="small"
            loading={loading}
            pagination={false}
            scroll={{ x: 650 }}
            summary={(data) => {
              const totalSales = data.reduce((s, r) => s + r.totalSales, 0);
              const totalAmount = data.reduce((s, r) => s + r.totalAmount, 0);
              const totalDiscount = data.reduce((s, r) => s + r.totalDiscount, 0);
              const totalNet = data.reduce((s, r) => s + r.netRevenue, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>Tong cong</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><strong>{totalSales}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><strong>{totalAmount.toLocaleString()} d</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><strong>{totalDiscount.toLocaleString()} d</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><strong>{totalNet.toLocaleString()} d</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </>
      ),
    },
  ];

  return (
    <Spin spinning={loading && sales.length === 0 && stock.length === 0}>
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <ShopOutlined style={{ marginRight: 8 }} />
                Nha thuoc benh vien
              </Title>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Lam moi
              </Button>
            </Col>
          </Row>
        </Card>

        {/* KPI Cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Doanh thu hom nay"
                value={dashboard.todayRevenue}
                suffix="d"
                precision={0}
                prefix={<DollarOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="So don hom nay"
                value={dashboard.todaySaleCount}
                prefix={<ShoppingCartOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Ton kho canh bao"
                value={dashboard.lowStockCount}
                prefix={<ExclamationCircleOutlined />}
                styles={{ content: { color: dashboard.lowStockCount > 0 ? '#ff4d4f' : '#52c41a' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Tabs */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>
      </div>
    </Spin>
  );
};

export default HospitalPharmacy;
