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
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  PercentageOutlined,
  EditOutlined,
  CheckOutlined,
  GiftOutlined,
  MinusCircleOutlined,
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
  PharmacyCustomerDto,
  PharmacyShiftDto,
  PharmacyGppRecordDto,
  PharmacyCommissionDto,
} from '../api/hospitalPharmacy';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const PAYMENT_LABELS: Record<number, string> = {
  0: 'Tiền mặt',
  1: 'Thẻ',
  2: 'Chuyển khoản',
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

  // NangCap17 Module C: Enhanced Pharmacy state
  const [customers, setCustomers] = useState<PharmacyCustomerDto[]>([]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PharmacyCustomerDto | null>(null);
  const [customerForm] = Form.useForm();
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [pointsCustomer, setPointsCustomer] = useState<PharmacyCustomerDto | null>(null);
  const [pointsForm] = Form.useForm();

  const [shifts, setShifts] = useState<PharmacyShiftDto[]>([]);
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [closingShift, setClosingShift] = useState<PharmacyShiftDto | null>(null);
  const [shiftForm] = Form.useForm();
  const [closeShiftForm] = Form.useForm();

  const [gppRecords, setGppRecords] = useState<PharmacyGppRecordDto[]>([]);
  const [gppModalOpen, setGppModalOpen] = useState(false);
  const [gppForm] = Form.useForm();
  const [gppFilterType, setGppFilterType] = useState<number | undefined>(undefined);

  const [commissions, setCommissions] = useState<PharmacyCommissionDto[]>([]);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [commissionForm] = Form.useForm();
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);

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
      message.warning('Không thể tải dữ liệu nhà thuốc');
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
          label: `${m.medicineName} (${m.unit}) - ${m.unitPrice.toLocaleString()}đ - Tồn: ${m.stockQuantity}`,
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
      message.warning('Vui lòng thêm thuốc vào giỏ hàng');
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
      message.success('Đã tạo đơn bán lẻ thành công');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      fetchData();
    } catch {
      message.warning('Không thể tạo đơn bán lẻ');
    } finally {
      setSubmitting(false);
    }
  };

  // NangCap17: Fetch functions for new tabs
  const fetchCustomers = useCallback(async () => {
    try {
      const data = await pharmacyApi.getCustomers();
      setCustomers(data);
    } catch { /* silent */ }
  }, []);

  const fetchShifts = useCallback(async () => {
    try {
      const data = await pharmacyApi.getShifts({ fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), toDate: dayjs().format('YYYY-MM-DD') });
      setShifts(data);
    } catch { /* silent */ }
  }, []);

  const fetchGppRecords = useCallback(async () => {
    try {
      const data = await pharmacyApi.getGppRecords({ recordType: gppFilterType });
      setGppRecords(data);
    } catch { /* silent */ }
  }, [gppFilterType]);

  const fetchCommissions = useCallback(async () => {
    try {
      const data = await pharmacyApi.getCommissions();
      setCommissions(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'shifts') fetchShifts();
    if (activeTab === 'gpp') fetchGppRecords();
    if (activeTab === 'commission') fetchCommissions();
  }, [activeTab, fetchCustomers, fetchShifts, fetchGppRecords, fetchCommissions]);

  const handleSaveCustomer = async () => {
    try {
      const values = await customerForm.validateFields();
      await pharmacyApi.saveCustomer({
        id: editingCustomer?.id,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
        gender: values.gender,
        customerType: values.customerType ?? 1,
        cardNumber: values.cardNumber,
        notes: values.notes,
      });
      message.success(editingCustomer ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng mới');
      setCustomerModalOpen(false);
      setEditingCustomer(null);
      customerForm.resetFields();
      fetchCustomers();
    } catch {
      message.warning('Không thể lưu khách hàng');
    }
  };

  const handleAddRedeemPoints = async (type: 'add' | 'redeem') => {
    try {
      const values = await pointsForm.validateFields();
      if (type === 'add') {
        await pharmacyApi.addPoints({ customerId: pointsCustomer!.id, points: values.points, description: values.description });
        message.success(`Đã cộng ${values.points} điểm`);
      } else {
        await pharmacyApi.redeemPoints({ customerId: pointsCustomer!.id, points: values.points, description: values.description });
        message.success(`Đã trừ ${values.points} điểm`);
      }
      setPointsModalOpen(false);
      pointsForm.resetFields();
      fetchCustomers();
    } catch {
      message.warning('Không thể xử lý điểm');
    }
  };

  const handleOpenShift = async () => {
    try {
      const values = await shiftForm.validateFields();
      await pharmacyApi.openShift({ openingCash: values.openingCash, notes: values.notes });
      message.success('Đã mở ca làm việc');
      setOpenShiftModalOpen(false);
      shiftForm.resetFields();
      fetchShifts();
    } catch {
      message.warning('Không thể mở ca');
    }
  };

  const handleCloseShift = async () => {
    if (!closingShift) return;
    try {
      const values = await closeShiftForm.validateFields();
      await pharmacyApi.closeShift({ shiftId: closingShift.id, closingCash: values.closingCash, notes: values.notes });
      message.success('Đã đóng ca làm việc');
      setCloseShiftModalOpen(false);
      setClosingShift(null);
      closeShiftForm.resetFields();
      fetchShifts();
    } catch {
      message.warning('Không thể đóng ca');
    }
  };

  const handleSaveGppRecord = async () => {
    try {
      const values = await gppForm.validateFields();
      await pharmacyApi.saveGppRecord({
        recordType: values.recordType,
        recordDate: values.recordDate?.format('YYYY-MM-DD'),
        description: values.description,
        medicineName: values.medicineName,
        batchNumber: values.batchNumber,
        temperature: values.temperature,
        humidity: values.humidity,
        actionTaken: values.actionTaken,
      });
      message.success('Đã lưu bản ghi GPP');
      setGppModalOpen(false);
      gppForm.resetFields();
      fetchGppRecords();
    } catch {
      message.warning('Không thể lưu bản ghi GPP');
    }
  };

  const handleSaveCommission = async () => {
    try {
      const values = await commissionForm.validateFields();
      await pharmacyApi.saveCommission({
        doctorName: values.doctorName,
        saleDate: values.saleDate?.format('YYYY-MM-DD'),
        medicineName: values.medicineName,
        quantity: values.quantity,
        saleAmount: values.saleAmount,
        commissionRate: values.commissionRate,
      });
      message.success('Đã lưu hoa hồng');
      setCommissionModalOpen(false);
      commissionForm.resetFields();
      fetchCommissions();
    } catch {
      message.warning('Không thể lưu hoa hồng');
    }
  };

  const handlePayCommissions = async () => {
    if (selectedCommissionIds.length === 0) { message.warning('Vui lòng chọn hoa hồng cần thanh toán'); return; }
    try {
      await pharmacyApi.payCommissions(selectedCommissionIds);
      message.success(`Đã thanh toán ${selectedCommissionIds.length} khoản hoa hồng`);
      setSelectedCommissionIds([]);
      fetchCommissions();
    } catch {
      message.warning('Không thể thanh toán hoa hồng');
    }
  };

  // Cart columns
  const cartColumns: ColumnsType<CartItem> = [
    { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'medicineName', width: 250, ellipsis: true },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
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
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (v: number) => v.toLocaleString() + ' đ',
    },
    {
      title: 'Thành tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (v: number) => <strong>{v.toLocaleString()} đ</strong>,
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
    { title: 'Mã đơn', dataIndex: 'saleCode', key: 'saleCode', width: 130 },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName', width: 160, render: (v: string) => v || 'Khách lẻ' },
    { title: 'SĐT', dataIndex: 'customerPhone', key: 'customerPhone', width: 120, render: (v: string) => v || '-' },
    {
      title: 'Tổng tiền',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      width: 130,
      align: 'right',
      render: (v: number) => (v || 0).toLocaleString() + ' đ',
    },
    {
      title: 'PTTT',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 110,
      render: (v: number) => <Tag color={PAYMENT_COLORS[v]}>{PAYMENT_LABELS[v] || 'Khac'}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: number) =>
        s === 0 ? <Tag color="orange">Chờ</Tag> :
        s === 1 ? <Tag color="green">Hoàn thành</Tag> :
        <Tag color="red">Đã hủy</Tag>,
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
    { title: 'Mã thuốc', dataIndex: 'medicineCode', key: 'medicineCode', width: 120 },
    { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'medicineName', width: 250, ellipsis: true },
    { title: 'Hoạt chất', dataIndex: 'activeIngredient', key: 'activeIngredient', width: 200, ellipsis: true },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' đ' },
    {
      title: 'Tồn kho',
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
    { title: 'Số lô', dataIndex: 'batchNumber', key: 'batchNumber', width: 100 },
    {
      title: 'Hạn dùng',
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
    { title: 'Số đơn', dataIndex: 'totalSales', key: 'totalSales', width: 100, align: 'right' },
    { title: 'Doanh thu', dataIndex: 'totalAmount', key: 'totalAmount', width: 150, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' đ' },
    { title: 'Chiết khấu', dataIndex: 'totalDiscount', key: 'totalDiscount', width: 130, align: 'right', render: (v: number) => (v || 0).toLocaleString() + ' đ' },
    {
      title: 'Thực thu',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      width: 150,
      align: 'right',
      render: (v: number) => <strong>{(v || 0).toLocaleString()} đ</strong>,
    },
  ];

  const tabItems = [
    {
      key: 'retail',
      label: (
        <span>
          <ShoppingCartOutlined /> Bán lẻ
        </span>
      ),
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Card title="Tìm thuốc" size="small" style={{ marginBottom: 16 }}>
                <AutoComplete
                  style={{ width: '100%' }}
                  options={searchResults}
                  onSearch={handleMedicineSearch}
                  onSelect={handleAddToCart}
                  placeholder="Nhập tên thuốc để tìm kiếm..."
                />
              </Card>
              <Table
                dataSource={cart}
                columns={cartColumns}
                rowKey="medicineId"
                size="small"
                pagination={false}
                scroll={{ x: 730 }}
                locale={{ emptyText: 'Chưa có thuốc trong giỏ hàng' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Card title="Thông tin đơn" size="small">
                <Form layout="vertical">
                  <Form.Item label="Tên khách hàng">
                    <Input
                      placeholder="Tùy chọn"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="SĐT">
                    <Input
                      placeholder="Tùy chọn"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="Phương thức TT">
                    <Select
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      options={[
                        { label: 'Tiền mặt', value: 0 },
                        { label: 'Thẻ', value: 1 },
                        { label: 'Chuyển khoản', value: 2 },
                      ]}
                    />
                  </Form.Item>
                  <Divider />
                  <div style={{ marginBottom: 8 }}>
                    <Text>Tổng tiền: </Text>
                    <Text strong style={{ float: 'right' }}>{cartTotal.toLocaleString()} đ</Text>
                  </div>
                  <Form.Item label="Chiết khấu">
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
                    <Text strong>Thành tiền: </Text>
                    <Text strong style={{ float: 'right', color: '#1890ff', fontSize: 20 }}>
                      {finalAmount.toLocaleString()} đ
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
                    Thanh toán
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
      label: 'Lịch sử bán',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tìm đơn, khách hàng, SĐT..."
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
              showTotal: (total) => `Tổng ${total} đơn`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
          />
        </>
      ),
    },
    {
      key: 'stock',
      label: 'Tồn kho',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tìm thuốc, mã thuốc, hoạt chất..."
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
              showTotal: (total) => `Tổng ${total} mặt hàng`,
            }}
          />
        </>
      ),
    },
    {
      key: 'report',
      label: (
        <span>
          <BarChartOutlined /> Báo cáo
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Text>Thời gian:</Text>
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
              In báo cáo
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
                  <Table.Summary.Cell index={0}><strong>Tổng cộng</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><strong>{totalSales}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><strong>{totalAmount.toLocaleString()} đ</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><strong>{totalDiscount.toLocaleString()} đ</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><strong>{totalNet.toLocaleString()} đ</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </>
      ),
    },
    // ====== NangCap17 Module C: 4 new tabs ======
    {
      key: 'customers',
      label: (
        <span>
          <TeamOutlined /> Khách hàng
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Search
              placeholder="Tìm khách hàng, SĐT, thẻ..."
              onSearch={(val) => pharmacyApi.getCustomers({ keyword: val || undefined }).then(setCustomers)}
              allowClear
              style={{ width: 300 }}
            />
            <Select
              placeholder="Loai KH"
              allowClear
              style={{ width: 150 }}
              onChange={(val) => pharmacyApi.getCustomers({ customerType: val }).then(setCustomers)}
              options={[
                { label: 'Thuong', value: 1 },
                { label: 'VIP', value: 2 },
                { label: 'Nhan vien', value: 3 },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCustomer(null); customerForm.resetFields(); setCustomerModalOpen(true); }}>
              Thêm khách hàng
            </Button>
          </div>
          <Table
            dataSource={customers}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            columns={[
              { title: 'Mã KH', dataIndex: 'customerCode', key: 'customerCode', width: 100 },
              { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName', width: 180 },
              { title: 'SĐT', dataIndex: 'phone', key: 'phone', width: 120, render: (v: string) => v || '-' },
              {
                title: 'Loai',
                dataIndex: 'customerType',
                key: 'customerType',
                width: 100,
                render: (v: number) =>
                  v === 2 ? <Tag color="gold">VIP</Tag> :
                  v === 3 ? <Tag color="blue">NV</Tag> :
                  <Tag>Thường</Tag>,
              },
              { title: 'Số thẻ', dataIndex: 'cardNumber', key: 'cardNumber', width: 120, render: (v: string) => v || '-' },
              {
                title: 'Điểm',
                dataIndex: 'totalPoints',
                key: 'totalPoints',
                width: 80,
                align: 'right',
                render: (v: number) => <Tag color="green">{v}</Tag>,
              },
              {
                title: 'Tổng mua',
                dataIndex: 'totalPurchaseAmount',
                key: 'totalPurchaseAmount',
                width: 130,
                align: 'right',
                render: (v: number) => (v || 0).toLocaleString() + ' đ',
              },
              { title: 'Số đơn', dataIndex: 'totalPurchaseCount', key: 'totalPurchaseCount', width: 80, align: 'right' },
              {
                title: '',
                key: 'actions',
                width: 180,
                render: (_: unknown, record: PharmacyCustomerDto) => (
                  <Space>
                    <Tooltip title="Sửa">
                      <Button size="small" icon={<EditOutlined />} onClick={() => {
                        setEditingCustomer(record);
                        customerForm.setFieldsValue({
                          ...record,
                          dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
                        });
                        setCustomerModalOpen(true);
                      }} />
                    </Tooltip>
                    <Tooltip title="Điểm">
                      <Button size="small" icon={<GiftOutlined />} onClick={() => { setPointsCustomer(record); pointsForm.resetFields(); setPointsModalOpen(true); }} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
          {/* Customer Modal */}
          <Modal
            title={editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
            open={customerModalOpen}
            onOk={handleSaveCustomer}
            onCancel={() => { setCustomerModalOpen(false); setEditingCustomer(null); }}
            okText="Luu"
            cancelText="Huy"
          >
            <Form form={customerForm} layout="vertical">
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="phone" label="SĐT">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="Email">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="customerType" label="Loại KH" initialValue={1}>
                    <Select options={[{ label: 'Thường', value: 1 }, { label: 'VIP', value: 2 }, { label: 'Nhân viên', value: 3 }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cardNumber" label="Số thẻ">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="dateOfBirth" label="Ngày sinh">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="gender" label="Giới tính">
                    <Select allowClear options={[{ label: 'Nam', value: 1 }, { label: 'Nu', value: 0 }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="address" label="Địa chỉ">
                <Input />
              </Form.Item>
              <Form.Item name="notes" label="Ghi chu">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </Modal>
          {/* Points Modal */}
          <Modal
            title={`Quản lý điểm - ${pointsCustomer?.fullName || ''} (${pointsCustomer?.totalPoints || 0} điểm)`}
            open={pointsModalOpen}
            onCancel={() => setPointsModalOpen(false)}
            footer={[
              <Button key="cancel" onClick={() => setPointsModalOpen(false)}>Huy</Button>,
              <Button key="redeem" icon={<MinusCircleOutlined />} onClick={() => handleAddRedeemPoints('redeem')}>Đổi điểm</Button>,
              <Button key="add" type="primary" icon={<GiftOutlined />} onClick={() => handleAddRedeemPoints('add')}>Cộng điểm</Button>,
            ]}
          >
            <Form form={pointsForm} layout="vertical">
              <Form.Item name="points" label="Số điểm" rules={[{ required: true, message: 'Nhập số điểm' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="description" label="Mo ta">
                <Input />
              </Form.Item>
            </Form>
          </Modal>
        </>
      ),
    },
    {
      key: 'shifts',
      label: (
        <span>
          <ClockCircleOutlined /> Ca làm việc
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { shiftForm.resetFields(); setOpenShiftModalOpen(true); }}>
              Mo ca
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchShifts}>Lam moi</Button>
          </div>
          <Table
            dataSource={shifts}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            columns={[
              { title: 'Mã ca', dataIndex: 'shiftCode', key: 'shiftCode', width: 130 },
              { title: 'Thu ngân', dataIndex: 'cashierName', key: 'cashierName', width: 150, render: (v: string) => v || '-' },
              { title: 'Bắt đầu', dataIndex: 'startTime', key: 'startTime', width: 150, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-' },
              { title: 'Kết thúc', dataIndex: 'endTime', key: 'endTime', width: 150, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-' },
              {
                title: 'Tiền đầu ca',
                dataIndex: 'openingCash',
                key: 'openingCash',
                width: 130,
                align: 'right',
                render: (v: number) => (v || 0).toLocaleString() + ' đ',
              },
              {
                title: 'Tiền cuối ca',
                dataIndex: 'closingCash',
                key: 'closingCash',
                width: 130,
                align: 'right',
                render: (v: number) => (v || 0).toLocaleString() + ' đ',
              },
              {
                title: 'Doanh thu',
                dataIndex: 'totalSales',
                key: 'totalSales',
                width: 130,
                align: 'right',
                render: (v: number) => <strong>{(v || 0).toLocaleString()} đ</strong>,
              },
              {
                title: 'Trang thai',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                render: (v: number) => v === 1 ? <Tag color="green">Đang mở</Tag> : <Tag>Đã đóng</Tag>,
              },
              {
                title: '',
                key: 'actions',
                width: 100,
                render: (_: unknown, record: PharmacyShiftDto) =>
                  record.status === 1 ? (
                    <Button size="small" icon={<CheckOutlined />} onClick={() => { setClosingShift(record); closeShiftForm.resetFields(); setCloseShiftModalOpen(true); }}>
                      Đóng ca
                    </Button>
                  ) : null,
              },
            ]}
          />
          {/* Open Shift Modal */}
          <Modal
            title="Mở ca làm việc"
            open={openShiftModalOpen}
            onOk={handleOpenShift}
            onCancel={() => setOpenShiftModalOpen(false)}
            okText="Mo ca"
            cancelText="Huy"
          >
            <Form form={shiftForm} layout="vertical">
              <Form.Item name="openingCash" label="Tiền đầu ca" rules={[{ required: true, message: 'Nhập tiền đầu ca' }]}>
                <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="notes" label="Ghi chu">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </Modal>
          {/* Close Shift Modal */}
          <Modal
            title={`Đóng ca - ${closingShift?.shiftCode || ''}`}
            open={closeShiftModalOpen}
            onOk={handleCloseShift}
            onCancel={() => { setCloseShiftModalOpen(false); setClosingShift(null); }}
            okText="Dong ca"
            cancelText="Huy"
          >
            {closingShift && (
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={12}><Statistic title="Tiền đầu ca" value={closingShift.openingCash} suffix="đ" /></Col>
                  <Col span={12}><Statistic title="Doanh thu" value={closingShift.totalSales} suffix="đ" /></Col>
                </Row>
              </div>
            )}
            <Form form={closeShiftForm} layout="vertical">
              <Form.Item name="closingCash" label="Tiền cuối ca (kiểm đếm)" rules={[{ required: true, message: 'Nhập tiền cuối ca' }]}>
                <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="notes" label="Ghi chu">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </Modal>
        </>
      ),
    },
    {
      key: 'gpp',
      label: (
        <span>
          <SafetyOutlined /> Sổ GPP
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Select
              placeholder="Loai ban ghi"
              allowClear
              style={{ width: 200 }}
              value={gppFilterType}
              onChange={(val) => setGppFilterType(val)}
              options={[
                { label: 'ADR (Phản ứng thuốc)', value: 1 },
                { label: 'Đình chỉ thuốc', value: 2 },
                { label: 'Nhiệt độ', value: 3 },
                { label: 'Độ ẩm', value: 4 },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { gppForm.resetFields(); setGppModalOpen(true); }}>
              Thêm bản ghi
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchGppRecords}>Lam moi</Button>
          </div>
          <Table
            dataSource={gppRecords}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            columns={[
              {
                title: 'Loai',
                dataIndex: 'recordType',
                key: 'recordType',
                width: 140,
                render: (v: number) => {
                  const labels: Record<number, { text: string; color: string }> = {
                    1: { text: 'ADR', color: 'red' },
                    2: { text: 'Đình chỉ', color: 'orange' },
                    3: { text: 'Nhiệt độ', color: 'blue' },
                    4: { text: 'Độ ẩm', color: 'cyan' },
                  };
                  const l = labels[v] || { text: 'Khac', color: 'default' };
                  return <Tag color={l.color}>{l.text}</Tag>;
                },
              },
              { title: 'Ngay', dataIndex: 'recordDate', key: 'recordDate', width: 120, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'medicineName', width: 200, ellipsis: true, render: (v: string) => v || '-' },
              { title: 'Số lô', dataIndex: 'batchNumber', key: 'batchNumber', width: 100, render: (v: string) => v || '-' },
              { title: 'Nhiệt độ', dataIndex: 'temperature', key: 'temperature', width: 90, align: 'right', render: (v: number) => v != null ? `${v} C` : '-' },
              { title: 'Độ ẩm', dataIndex: 'humidity', key: 'humidity', width: 90, align: 'right', render: (v: number) => v != null ? `${v}%` : '-' },
              { title: 'Mo ta', dataIndex: 'description', key: 'description', width: 250, ellipsis: true },
              { title: 'Xử lý', dataIndex: 'actionTaken', key: 'actionTaken', width: 200, ellipsis: true, render: (v: string) => v || '-' },
              { title: 'Người ghi', dataIndex: 'recordedByName', key: 'recordedByName', width: 130, render: (v: string) => v || '-' },
            ]}
          />
          {/* GPP Record Modal */}
          <Modal
            title="Thêm bản ghi GPP"
            open={gppModalOpen}
            onOk={handleSaveGppRecord}
            onCancel={() => setGppModalOpen(false)}
            okText="Luu"
            cancelText="Huy"
            width={600}
          >
            <Form form={gppForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="recordType" label="Loại bản ghi" rules={[{ required: true, message: 'Chọn loại' }]}>
                    <Select options={[
                      { label: 'ADR (Phản ứng thuốc)', value: 1 },
                      { label: 'Đình chỉ thuốc', value: 2 },
                      { label: 'Nhiệt độ', value: 3 },
                      { label: 'Độ ẩm', value: 4 },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="recordDate" label="Ngay" rules={[{ required: true, message: 'Chon ngay' }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="medicineName" label="Tên thuốc">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="batchNumber" label="Số lô">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="temperature" label="Nhiệt độ (C)">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="humidity" label="Độ ẩm (%)">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Mo ta">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="actionTaken" label="Biện pháp xử lý">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </Modal>
        </>
      ),
    },
    {
      key: 'commission',
      label: (
        <span>
          <PercentageOutlined /> Hoa hồng
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Search
              placeholder="Tìm bác sĩ, thuốc..."
              onSearch={(val) => pharmacyApi.getCommissions({ keyword: val || undefined }).then(setCommissions)}
              allowClear
              style={{ width: 250 }}
            />
            <Select
              placeholder="Trang thai"
              allowClear
              style={{ width: 150 }}
              onChange={(val) => pharmacyApi.getCommissions({ status: val }).then(setCommissions)}
              options={[
                { label: 'Chờ thanh toán', value: 1 },
                { label: 'Đã thanh toán', value: 2 },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { commissionForm.resetFields(); setCommissionModalOpen(true); }}>
              Thêm hoa hồng
            </Button>
            <Button
              icon={<DollarOutlined />}
              disabled={selectedCommissionIds.length === 0}
              onClick={handlePayCommissions}
            >
              Thanh toán ({selectedCommissionIds.length})
            </Button>
          </div>
          <Table
            dataSource={commissions}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            rowSelection={{
              selectedRowKeys: selectedCommissionIds,
              onChange: (keys) => setSelectedCommissionIds(keys as string[]),
              getCheckboxProps: (record: PharmacyCommissionDto) => ({ disabled: record.status === 2 }),
            }}
            columns={[
              { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName', width: 160 },
              { title: 'Ngày bán', dataIndex: 'saleDate', key: 'saleDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Thuốc', dataIndex: 'medicineName', key: 'medicineName', width: 200, ellipsis: true },
              { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'right' },
              {
                title: 'Doanh số',
                dataIndex: 'saleAmount',
                key: 'saleAmount',
                width: 130,
                align: 'right',
                render: (v: number) => (v || 0).toLocaleString() + ' đ',
              },
              {
                title: 'Tỉ lệ',
                dataIndex: 'commissionRate',
                key: 'commissionRate',
                width: 80,
                align: 'right',
                render: (v: number) => `${v}%`,
              },
              {
                title: 'Hoa hồng',
                dataIndex: 'commissionAmount',
                key: 'commissionAmount',
                width: 130,
                align: 'right',
                render: (v: number) => <strong>{(v || 0).toLocaleString()} đ</strong>,
              },
              {
                title: 'Trang thai',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (v: number) => v === 2 ? <Tag color="green">Đã TT</Tag> : <Tag color="orange">Chờ TT</Tag>,
              },
              {
                title: 'Ngay TT',
                dataIndex: 'paidDate',
                key: 'paidDate',
                width: 110,
                render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
              },
            ]}
            summary={(data) => {
              const totalSale = data.reduce((s, r) => s + r.saleAmount, 0);
              const totalComm = data.reduce((s, r) => s + r.commissionAmount, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}><strong>Tổng cộng</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><strong>{totalSale.toLocaleString()} đ</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7} align="right"><strong>{totalComm.toLocaleString()} đ</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9} />
                </Table.Summary.Row>
              );
            }}
          />
          {/* Commission Modal */}
          <Modal
            title="Thêm hoa hồng"
            open={commissionModalOpen}
            onOk={handleSaveCommission}
            onCancel={() => setCommissionModalOpen(false)}
            okText="Luu"
            cancelText="Huy"
          >
            <Form form={commissionForm} layout="vertical">
              <Form.Item name="doctorName" label="Bác sĩ" rules={[{ required: true, message: 'Nhập tên bác sĩ' }]}>
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="medicineName" label="Thuốc" rules={[{ required: true, message: 'Nhập tên thuốc' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="saleDate" label="Ngày bán" rules={[{ required: true, message: 'Chọn ngày' }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="saleAmount" label="Doanh số (đ)" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="commissionRate" label="Tỉ lệ (%)" rules={[{ required: true }]}>
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
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
                Nhà thuốc bệnh viện
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
                title="Doanh thu hôm nay"
                value={dashboard.todayRevenue}
                suffix="đ"
                precision={0}
                prefix={<DollarOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Số đơn hôm nay"
                value={dashboard.todaySaleCount}
                prefix={<ShoppingCartOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Tồn kho cảnh báo"
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
