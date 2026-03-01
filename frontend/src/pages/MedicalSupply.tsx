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
  Modal,
  Form,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Badge,
  Tooltip,
  Progress,
  Spin,
  InputNumber,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
  ExportOutlined,
  ImportOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as warehouseApi from '../api/warehouse';

const { Title, Text } = Typography;
const { Search } = Input;

const MedicalSupply: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<warehouseApi.StockDto[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [receipts, setReceipts] = useState<warehouseApi.StockReceiptDto[]>([]);
  const [issues, setIssues] = useState<warehouseApi.StockIssueDto[]>([]);
  const [reusableSupplies, setReusableSupplies] = useState<warehouseApi.ReusableSupplyDto[]>([]);
  const [procurements, setProcurements] = useState<warehouseApi.ProcurementRequestDto[]>([]);
  const [warehouses, setWarehouses] = useState<warehouseApi.WarehouseDto[]>([]);
  const [warnings, setWarnings] = useState<warehouseApi.StockDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>();
  const [activeTab, setActiveTab] = useState('inventory');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isSterilizeModalOpen, setIsSterilizeModalOpen] = useState(false);
  const [selectedReusable, setSelectedReusable] = useState<warehouseApi.ReusableSupplyDto | null>(null);
  const [receiptForm] = Form.useForm();
  const [issueForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        warehouseApi.getStock({
          warehouseId: selectedWarehouse,
          itemType: 2, // Supply type
          keyword,
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        warehouseApi.getWarehouses(),
        warehouseApi.getStockReceipts({
          warehouseId: selectedWarehouse,
          receiptType: undefined,
          status: undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          page: 1,
          pageSize: 50,
        }),
        warehouseApi.getStockIssues({
          warehouseId: selectedWarehouse,
          issueType: undefined,
          status: undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          page: 1,
          pageSize: 50,
        }),
        warehouseApi.getReusableSupplies(selectedWarehouse),
        warehouseApi.getProcurementRequests(
          selectedWarehouse,
          undefined,
          dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
          dayjs().format('YYYY-MM-DD'),
        ),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.data) {
        const data = results[0].value.data;
        setStockData(data.items || []);
        setStockTotal(data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled' && results[1].value.data) {
        // Filter to supply warehouses (type 2, 3)
        const allWarehouses = results[1].value.data;
        setWarehouses(allWarehouses);
        // Auto-select first supply warehouse
        if (!selectedWarehouse) {
          const supplyWh = allWarehouses.find((w: warehouseApi.WarehouseDto) => w.warehouseType === 2 || w.warehouseType === 3);
          if (supplyWh) setSelectedWarehouse(supplyWh.id);
        }
      }
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        // Filter receipts for supply items
        const allReceipts = results[2].value.data?.items || results[2].value.data || [];
        setReceipts(Array.isArray(allReceipts) ? allReceipts : []);
      }
      if (results[3].status === 'fulfilled' && results[3].value.data) {
        const allIssues = results[3].value.data?.items || results[3].value.data || [];
        setIssues(Array.isArray(allIssues) ? allIssues : []);
      }
      if (results[4].status === 'fulfilled' && results[4].value.data) {
        setReusableSupplies(results[4].value.data || []);
      }
      if (results[5].status === 'fulfilled' && results[5].value.data) {
        const allProcurements = (results[5].value.data as any)?.items || results[5].value.data || [];
        setProcurements(Array.isArray(allProcurements) ? allProcurements : []);
      }

      // Fetch warnings
      if (selectedWarehouse) {
        try {
          const warnRes = await warehouseApi.getStockWarnings(selectedWarehouse);
          if (warnRes.data) {
            setWarnings((warnRes.data || []).filter((w: warehouseApi.StockDto) => w.itemType === 2));
          }
        } catch {
          // Warnings are optional
        }
      }
    } catch {
      message.warning('Không thể tải dữ liệu vật tư');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, keyword, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics
  const totalItems = stockData.length;
  const lowStockCount = stockData.filter(s => s.isBelowMinimum).length;
  const expiringCount = stockData.filter(s => s.isExpiringSoon).length;
  const expiredCount = stockData.filter(s => s.isExpired).length;
  const totalValue = stockData.reduce((sum, s) => sum + s.totalValue, 0);

  // Inventory columns
  const inventoryColumns: ColumnsType<warehouseApi.StockDto> = [
    {
      title: 'Mã VT',
      dataIndex: 'itemCode',
      key: 'itemCode',
      width: 120,
      sorter: (a, b) => a.itemCode.localeCompare(b.itemCode),
    },
    {
      title: 'Tên vật tư',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Số lô',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 100,
    },
    {
      title: 'Hạn dùng',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 110,
      render: (date, record) => {
        if (!date) return '-';
        const color = record.isExpired ? 'red' : record.isExpiringSoon ? 'orange' : 'green';
        return <Tag color={color}>{dayjs(date).format('DD/MM/YYYY')}</Tag>;
      },
      sorter: (a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty, record) => (
        <span style={{ color: record.isBelowMinimum ? '#ff4d4f' : undefined, fontWeight: record.isBelowMinimum ? 'bold' : undefined }}>
          {qty.toLocaleString()}
        </span>
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Khả dụng',
      dataIndex: 'availableQuantity',
      key: 'availableQuantity',
      width: 100,
      align: 'right',
      render: (qty) => qty.toLocaleString(),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (price) => price.toLocaleString() + ' đ',
    },
    {
      title: 'Giá trị',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 120,
      align: 'right',
      render: (val) => val.toLocaleString() + ' đ',
      sorter: (a, b) => a.totalValue - b.totalValue,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.isExpired) return <Tag color="red">Hết hạn</Tag>;
        if (record.isExpiringSoon) return <Tag color="orange">Sắp hết hạn</Tag>;
        if (record.isBelowMinimum) return <Tag color="volcano">Dưới tồn tối thiểu</Tag>;
        return <Tag color="green">Bình thường</Tag>;
      },
    },
  ];

  // Receipt columns
  const receiptColumns: ColumnsType<warehouseApi.StockReceiptDto> = [
    { title: 'Mã phiếu', dataIndex: 'receiptCode', key: 'receiptCode', width: 140 },
    { title: 'Ngày nhập', dataIndex: 'receiptDate', key: 'receiptDate', width: 110, render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 150 },
    { title: 'Nhà cung cấp', dataIndex: 'supplierName', key: 'supplierName', width: 200, ellipsis: true },
    { title: 'Số HĐ', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 120 },
    { title: 'Số mặt hàng', key: 'itemCount', width: 100, align: 'right', render: (_, r) => r.items?.length || 0 },
    { title: 'Tổng tiền', dataIndex: 'finalAmount', key: 'finalAmount', width: 130, align: 'right', render: (v) => (v || 0).toLocaleString() + ' đ' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => s === 0 ? <Tag color="orange">Chờ duyệt</Tag> : s === 1 ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Đã hủy</Tag>,
    },
  ];

  // Issue columns
  const issueColumns: ColumnsType<warehouseApi.StockIssueDto> = [
    { title: 'Mã phiếu', dataIndex: 'issueCode', key: 'issueCode', width: 140 },
    { title: 'Ngày xuất', dataIndex: 'issueDate', key: 'issueDate', width: 110, render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 150 },
    { title: 'Loại xuất', dataIndex: 'issueTypeName', key: 'issueTypeName', width: 140 },
    { title: 'Khoa nhận', dataIndex: 'departmentName', key: 'departmentName', width: 180, ellipsis: true },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', width: 130, align: 'right', render: (v) => (v || 0).toLocaleString() + ' đ' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => s === 0 ? <Tag color="orange">Chờ duyệt</Tag> : s === 1 ? <Tag color="green">Đã xuất</Tag> : <Tag color="red">Đã hủy</Tag>,
    },
  ];

  // Reusable supply columns
  const reusableColumns: ColumnsType<warehouseApi.ReusableSupplyDto> = [
    { title: 'Mã VT', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
    { title: 'Tên vật tư', dataIndex: 'itemName', key: 'itemName', width: 250, ellipsis: true },
    { title: 'Số lần tái sử dụng tối đa', dataIndex: 'maxReuseCount', key: 'maxReuseCount', width: 160, align: 'center' },
    { title: 'Đã sử dụng', dataIndex: 'currentReuseCount', key: 'currentReuseCount', width: 120, align: 'center' },
    {
      title: 'Còn lại', dataIndex: 'remainingUses', key: 'remainingUses', width: 100, align: 'center',
      render: (val, record) => {
        const pct = record.maxReuseCount > 0 ? (val / record.maxReuseCount) * 100 : 0;
        return <Progress percent={pct} size="small" steps={5} format={() => val} />;
      },
    },
    {
      title: 'Tiệt khuẩn lần cuối', dataIndex: 'lastSterilizationDate', key: 'lastSterilizationDate', width: 150,
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Tiệt khuẩn tiếp theo', dataIndex: 'nextSterilizationDue', key: 'nextSterilizationDue', width: 160,
      render: (d) => {
        if (!d) return '-';
        const isOverdue = dayjs(d).isBefore(dayjs());
        return <Tag color={isOverdue ? 'red' : 'blue'}>{dayjs(d).format('DD/MM/YYYY HH:mm')}</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => s === 0 ? <Tag color="green">Sẵn sàng</Tag> : s === 1 ? <Tag color="blue">Đang dùng</Tag> : s === 2 ? <Tag color="orange">Chờ tiệt khuẩn</Tag> : <Tag color="red">Hỏng</Tag>,
    },
    {
      title: 'Thao tác', key: 'action', width: 120,
      render: (_, record) => (
        <Tooltip title="Ghi nhận tiệt khuẩn">
          <Button size="small" icon={<ToolOutlined />} onClick={() => { setSelectedReusable(record); setIsSterilizeModalOpen(true); }}>
            Tiệt khuẩn
          </Button>
        </Tooltip>
      ),
    },
  ];

  // Procurement columns
  const procurementColumns: ColumnsType<warehouseApi.ProcurementRequestDto> = [
    { title: 'Mã yêu cầu', dataIndex: 'requestCode', key: 'requestCode', width: 140 },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'requestDate', width: 120, render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 150 },
    { title: 'Người tạo', dataIndex: 'createdByName', key: 'createdByName', width: 150 },
    { title: 'Số mặt hàng', key: 'itemCount', width: 100, align: 'right', render: (_, r) => r.items?.length || 0 },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130,
      render: (s) => s === 0 ? <Tag color="orange">Chờ duyệt</Tag> : s === 1 ? <Tag color="green">Đã duyệt</Tag> : s === 2 ? <Tag color="red">Từ chối</Tag> : <Tag>Đã đặt hàng</Tag>,
    },
  ];

  const handleSterilize = async () => {
    if (!selectedReusable) return;
    try {
      await warehouseApi.recordSterilization(selectedReusable.id, dayjs().toISOString());
      message.success('Đã ghi nhận tiệt khuẩn');
      setIsSterilizeModalOpen(false);
      setSelectedReusable(null);
      fetchData();
    } catch {
      message.warning('Không thể ghi nhận tiệt khuẩn');
    }
  };

  const tabItems = [
    {
      key: 'inventory',
      label: (
        <span>
          <Badge count={lowStockCount + expiringCount} size="small" offset={[8, -2]}>
            Tồn kho vật tư
          </Badge>
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Statistic title="Tổng mặt hàng" value={totalItems} prefix={<CheckCircleOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Dưới tồn tối thiểu" value={lowStockCount} styles={{ content: { color: lowStockCount > 0 ? '#ff4d4f' : '#52c41a' } }} prefix={<WarningOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Sắp hết hạn" value={expiringCount} styles={{ content: { color: expiringCount > 0 ? '#fa8c16' : '#52c41a' } }} prefix={<ClockCircleOutlined />} />
            </Col>
            <Col span={4}>
              <Statistic title="Đã hết hạn" value={expiredCount} styles={{ content: { color: expiredCount > 0 ? '#ff4d4f' : '#52c41a' } }} prefix={<ExclamationCircleOutlined />} />
            </Col>
            <Col span={8}>
              <Statistic title="Tổng giá trị tồn kho" value={totalValue} suffix="đ" precision={0} />
            </Col>
          </Row>
          {warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`${warnings.length} vật tư cần chú ý (tồn thấp hoặc sắp hết hạn)`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Table
            columns={inventoryColumns}
            dataSource={stockData}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: stockTotal,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} mặt hàng`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
          />
        </>
      ),
    },
    {
      key: 'receipts',
      label: 'Nhập kho',
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Phiếu nhập kho vật tư 30 ngày gần nhất</Text>
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setIsReceiptModalOpen(true)}>
              Tạo phiếu nhập
            </Button>
          </div>
          <Table
            columns={receiptColumns}
            dataSource={receipts}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} phiếu` }}
          />
        </>
      ),
    },
    {
      key: 'issues',
      label: 'Xuất kho',
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Phiếu xuất kho vật tư 30 ngày gần nhất</Text>
            <Button type="primary" icon={<ExportOutlined />} onClick={() => setIsIssueModalOpen(true)}>
              Tạo phiếu xuất
            </Button>
          </div>
          <Table
            columns={issueColumns}
            dataSource={issues}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} phiếu` }}
          />
        </>
      ),
    },
    {
      key: 'reusable',
      label: (
        <span>
          <Badge count={reusableSupplies.filter(r => r.status === 2).length} size="small" offset={[8, -2]}>
            VT tái sử dụng
          </Badge>
        </span>
      ),
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic title="Tổng VT tái sử dụng" value={reusableSupplies.length} />
            </Col>
            <Col span={6}>
              <Statistic title="Sẵn sàng" value={reusableSupplies.filter(r => r.status === 0).length} styles={{ content: { color: '#52c41a' } }} />
            </Col>
            <Col span={6}>
              <Statistic title="Đang dùng" value={reusableSupplies.filter(r => r.status === 1).length} styles={{ content: { color: '#1890ff' } }} />
            </Col>
            <Col span={6}>
              <Statistic title="Chờ tiệt khuẩn" value={reusableSupplies.filter(r => r.status === 2).length} styles={{ content: { color: '#fa8c16' } }} />
            </Col>
          </Row>
          <Table
            columns={reusableColumns}
            dataSource={reusableSupplies}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 20 }}
          />
        </>
      ),
    },
    {
      key: 'procurement',
      label: 'Đề xuất mua sắm',
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Yêu cầu mua sắm vật tư 90 ngày gần nhất</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('Tính năng tạo đề xuất mua sắm')}>
              Tạo đề xuất
            </Button>
          </div>
          <Table
            columns={procurementColumns}
            dataSource={procurements}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} đề xuất` }}
          />
        </>
      ),
    },
  ];

  return (
    <Spin spinning={loading && stockData.length === 0}>
      <div style={{ padding: 0 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Quản lý Vật tư Y tế (VTYT)</Title>
            <Space>
              <Select
                placeholder="Chọn kho"
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                style={{ width: 200 }}
                allowClear
                options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))}
              />
              <Search
                placeholder="Tìm vật tư..."
                onSearch={setKeyword}
                allowClear
                style={{ width: 250 }}
              />
              <Tooltip title="Làm mới">
                <Button icon={<ReloadOutlined />} onClick={fetchData} />
              </Tooltip>
            </Space>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>

        {/* Receipt Modal */}
        <Modal
          title="Tạo phiếu nhập kho vật tư"
          open={isReceiptModalOpen}
          onCancel={() => setIsReceiptModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsReceiptModalOpen(false)}>Hủy</Button>,
            <Button key="submit" type="primary" icon={<ImportOutlined />} onClick={() => {
              receiptForm.validateFields().then(() => {
                message.success('Đã tạo phiếu nhập (demo)');
                setIsReceiptModalOpen(false);
                receiptForm.resetFields();
              });
            }}>Tạo phiếu</Button>,
          ]}
          width={700}
        >
          <Form form={receiptForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Kho nhập" name="warehouseId" rules={[{ required: true, message: 'Chọn kho' }]}>
                  <Select placeholder="Chọn kho" options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Ngày nhập" name="receiptDate" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Nhà cung cấp" name="supplierName">
                  <Input placeholder="Tên nhà cung cấp" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Số hóa đơn" name="invoiceNumber">
                  <Input placeholder="Số hóa đơn" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Ghi chú" name="notes">
              <Input.TextArea rows={2} placeholder="Ghi chú phiếu nhập" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Issue Modal */}
        <Modal
          title="Tạo phiếu xuất kho vật tư"
          open={isIssueModalOpen}
          onCancel={() => setIsIssueModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsIssueModalOpen(false)}>Hủy</Button>,
            <Button key="submit" type="primary" icon={<ExportOutlined />} onClick={() => {
              issueForm.validateFields().then(() => {
                message.success('Đã tạo phiếu xuất (demo)');
                setIsIssueModalOpen(false);
                issueForm.resetFields();
              });
            }}>Tạo phiếu</Button>,
          ]}
          width={700}
        >
          <Form form={issueForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Kho xuất" name="warehouseId" rules={[{ required: true, message: 'Chọn kho' }]}>
                  <Select placeholder="Chọn kho" options={warehouses.map(w => ({ label: w.warehouseName, value: w.id }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Loại xuất" name="issueType" rules={[{ required: true }]}>
                  <Select placeholder="Chọn loại" options={[
                    { label: 'Xuất cho khoa', value: 1 },
                    { label: 'Chuyển kho', value: 2 },
                    { label: 'Xuất trả NCC', value: 3 },
                    { label: 'Xuất hủy', value: 4 },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Khoa nhận" name="departmentName">
                  <Input placeholder="Tên khoa nhận" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Ngày xuất" name="issueDate" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Ghi chú" name="notes">
              <Input.TextArea rows={2} placeholder="Ghi chú phiếu xuất" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Sterilize Modal */}
        <Modal
          title="Ghi nhận tiệt khuẩn"
          open={isSterilizeModalOpen}
          onCancel={() => { setIsSterilizeModalOpen(false); setSelectedReusable(null); }}
          onOk={handleSterilize}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          {selectedReusable && (
            <div>
              <p><strong>Vật tư:</strong> {selectedReusable.itemName} ({selectedReusable.itemCode})</p>
              <p><strong>Số lần đã sử dụng:</strong> {selectedReusable.currentReuseCount}/{selectedReusable.maxReuseCount}</p>
              <p><strong>Tiệt khuẩn lần cuối:</strong> {selectedReusable.lastSterilizationDate ? dayjs(selectedReusable.lastSterilizationDate).format('DD/MM/YYYY HH:mm') : 'Chưa có'}</p>
              <p>Xác nhận ghi nhận tiệt khuẩn lúc <strong>{dayjs().format('DD/MM/YYYY HH:mm')}</strong>?</p>
            </div>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default MedicalSupply;
