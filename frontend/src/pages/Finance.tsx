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
  Typography,
  message,
  Tabs,
  DatePicker,
  Statistic,
  Progress,
  Select,
  Modal,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  FilterOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { financeApi } from '../api/system';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

// Interfaces
interface RevenueRecord {
  id: string;
  date: string;
  department: string;
  serviceType: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  transactionCount: number;
}

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  supplier?: string;
  invoiceNumber?: string;
  status: number; // 0: Pending, 1: Approved, 2: Paid
}

interface DepartmentRevenue {
  department: string;
  totalRevenue: number;
  insuranceRevenue: number;
  selfPayRevenue: number;
  serviceRevenue: number;
  patientCount: number;
  growth: number;
}

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>([]);
  const [filteredRevenueRecords, setFilteredRevenueRecords] = useState<RevenueRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [filteredExpenseRecords, setFilteredExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [departmentRevenue, setDepartmentRevenue] = useState<DepartmentRevenue[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [revenueSearchText, setRevenueSearchText] = useState('');
  const [expenseSearchText, setExpenseSearchText] = useState('');
  const [revenueDeptFilter, setRevenueDeptFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [financeDetailVisible, setFinanceDetailVisible] = useState(false);
  const [selectedFinanceRecord, setSelectedFinanceRecord] = useState<any>(null);
  const [financeDetailType, setFinanceDetailType] = useState<'revenue' | 'expense' | 'department'>('revenue');

  // Apply revenue filters
  const applyRevenueFilters = useCallback((records: RevenueRecord[], search: string, dept: string) => {
    let filtered = [...records];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.department.toLowerCase().includes(lower) ||
        r.serviceType.toLowerCase().includes(lower)
      );
    }
    if (dept !== 'all') {
      const deptMap: Record<string, string> = {
        noi: 'Khoa Nội', ngoai: 'Khoa Ngoại', san: 'Khoa Sản',
        xn: 'Khoa Xét nghiệm', cdha: 'Khoa CĐHA',
      };
      const deptName = deptMap[dept] || '';
      filtered = filtered.filter(r => r.department.includes(deptName));
    }
    setFilteredRevenueRecords(filtered);
  }, []);

  // Apply expense filters
  const applyExpenseFilters = useCallback((records: ExpenseRecord[], search: string, category: string) => {
    let filtered = [...records];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.description.toLowerCase().includes(lower) ||
        (r.supplier || '').toLowerCase().includes(lower) ||
        (r.invoiceNumber || '').toLowerCase().includes(lower)
      );
    }
    if (category !== 'all') {
      const catMap: Record<string, string> = {
        thuoc: 'Thuốc', vattu: 'Vật tư y tế', thietbi: 'Thiết bị', khac: 'Khác',
      };
      const catName = catMap[category] || '';
      filtered = filtered.filter(r => r.category.includes(catName));
    }
    setFilteredExpenseRecords(filtered);
  }, []);

  // Fetch data
  const loadData = useCallback(async (from?: dayjs.Dayjs, to?: dayjs.Dayjs) => {
    const fromDate = (from || dateRange[0]).format('YYYY-MM-DD');
    const toDate = (to || dateRange[1]).format('YYYY-MM-DD');
    setLoading(true);
    try {
      const [revenueByDeptRes, costByDeptRes, revenueByServiceRes] = await Promise.all([
        financeApi.getRevenueByExecutingDept(fromDate, toDate),
        financeApi.getCostByDepartment(fromDate, toDate),
        financeApi.getRevenueByService(fromDate, toDate),
      ]);

      // Map department revenue
      const deptData: DepartmentRevenue[] = ((revenueByDeptRes as any).data || []).map((d: any, idx: number) => ({
        key: d.departmentId || `dept-${idx}`,
        department: d.departmentName || d.departmentCode,
        totalRevenue: d.totalRevenue || 0,
        insuranceRevenue: d.insuranceRevenue || 0,
        selfPayRevenue: d.patientRevenue || 0,
        serviceRevenue: d.serviceRevenue || 0,
        patientCount: d.patientCount || 0,
        growth: 0,
      }));
      setDepartmentRevenue(deptData);

      // Map revenue records from service data
      const revData: RevenueRecord[] = ((revenueByServiceRes as any).data || []).map((s: any, idx: number) => ({
        id: s.serviceId || `rev-${idx}`,
        date: fromDate,
        department: s.serviceGroupName || '',
        serviceType: s.serviceName || '',
        totalAmount: s.totalRevenue || 0,
        insuranceAmount: s.insuranceRevenue || 0,
        patientAmount: s.patientRevenue || 0,
        transactionCount: s.quantity || 0,
      }));
      setRevenueRecords(revData);
      applyRevenueFilters(revData, revenueSearchText, revenueDeptFilter);

      // Map expense records from cost data
      const expData: ExpenseRecord[] = ((costByDeptRes as any).data || []).map((c: any, idx: number) => ({
        id: c.departmentId || `exp-${idx}`,
        date: fromDate,
        category: c.departmentName || '',
        description: `Chi phí ${c.departmentName || ''}`,
        amount: c.totalCost || 0,
        supplier: undefined,
        invoiceNumber: undefined,
        status: 2,
      }));
      setExpenseRecords(expData);
      applyExpenseFilters(expData, expenseSearchText, expenseCategoryFilter);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu tài chính');
      console.warn('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, revenueSearchText, revenueDeptFilter, expenseSearchText, expenseCategoryFilter, applyRevenueFilters, applyExpenseFilters]);

  // Fetch data on mount
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Get expense status tag
  const getExpenseStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Chờ duyệt</Tag>;
      case 1:
        return <Tag color="blue">Đã duyệt</Tag>;
      case 2:
        return <Tag color="green">Đã thanh toán</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle "Lọc" button
  const handleFilter = () => {
    loadData(dateRange[0], dateRange[1]);
  };

  // Handle "Xuất Excel" button
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const fromDate = dateRange[0].format('YYYY-MM-DD');
      const toDate = dateRange[1].format('YYYY-MM-DD');
      const response = await financeApi.exportFinancialReport({
        reportType: activeTab === 'revenue' ? 'revenue' : activeTab === 'expense' ? 'expense' : 'summary',
        fromDate,
        toDate,
        outputFormat: 'excel',
      });
      const blob = new Blob([(response as any).data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-tai-chinh-${fromDate}-${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Xuất Excel thành công');
    } catch (error) {
      message.error('Lỗi khi xuất Excel');
      console.warn('Error exporting Excel:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle print expense invoice
  const handlePrintExpense = (record: ExpenseRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Hóa đơn chi phí - ${record.id}</title>
      <style>body{font-family:'Times New Roman',serif;padding:20px}
      .title{text-align:center;font-size:18px;font-weight:bold;margin:20px 0}
      table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:8px}
      </style></head><body>
      <div class="title">HÓA ĐƠN CHI PHÍ</div>
      <table>
        <tr><th>Ngày</th><td>${dayjs(record.date).format('DD/MM/YYYY')}</td></tr>
        <tr><th>Danh mục</th><td>${record.category}</td></tr>
        <tr><th>Mô tả</th><td>${record.description}</td></tr>
        <tr><th>Nhà cung cấp</th><td>${record.supplier || '-'}</td></tr>
        <tr><th>Số hóa đơn</th><td>${record.invoiceNumber || '-'}</td></tr>
        <tr><th>Số tiền</th><td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.amount)}</td></tr>
      </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // Handle report card clicks - call real API and download
  const handleReportClick = async (reportType: string, reportName: string) => {
    setReportLoading(reportType);
    try {
      const fromDate = dateRange[0].format('YYYY-MM-DD');
      const toDate = dateRange[1].format('YYYY-MM-DD');
      let response: any;

      switch (reportType) {
        case 'revenue_dept':
          response = await financeApi.getRevenueByOrderingDept(fromDate, toDate);
          break;
        case 'revenue_service':
          response = await financeApi.getRevenueByService(fromDate, toDate);
          break;
        case 'expense':
          response = await financeApi.getCostByDepartment(fromDate, toDate);
          break;
        case 'insurance':
          response = await financeApi.getInsuranceReconciliation(fromDate, toDate);
          break;
        case 'surgery_profit':
          response = await financeApi.getSurgeryProfitReport(fromDate, toDate);
          break;
        case 'summary':
          response = await financeApi.getFinancialSummary(fromDate, toDate);
          break;
        default:
          response = await financeApi.getFinancialSummary(fromDate, toDate);
      }

      // Try to export as file
      try {
        const exportRes = await financeApi.exportFinancialReport({
          reportType,
          fromDate,
          toDate,
          outputFormat: 'excel',
        });
        const blob = new Blob([(exportRes as any).data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-${fromDate}-${toDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        message.success(`Đã xuất ${reportName}`);
      } catch {
        // If export fails, just show data was loaded
        message.success(`Đã tải dữ liệu ${reportName} (${((response as any)?.data || []).length || 1} bản ghi)`);
      }
    } catch (error) {
      message.error(`Lỗi khi tải ${reportName}`);
      console.warn(`Error loading report ${reportType}:`, error);
    } finally {
      setReportLoading(null);
    }
  };

  // Calculate totals
  const totalRevenue = departmentRevenue.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalInsurance = departmentRevenue.reduce((sum, d) => sum + d.insuranceRevenue, 0);
  const totalSelfPay = departmentRevenue.reduce((sum, d) => sum + d.selfPayRevenue, 0);
  const totalService = departmentRevenue.reduce((sum, d) => sum + d.serviceRevenue, 0);
  const totalExpense = expenseRecords.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpense;

  // Safe percentage calculation to avoid NaN from division by zero
  const safePercent = (part: number, whole: number) => whole > 0 ? Math.round((part / whole) * 100) : 0;

  // Revenue columns
  const revenueColumns: ColumnsType<RevenueRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'department',
      key: 'department',
      width: 150,
    },
    {
      title: 'Loại dịch vụ',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 150,
    },
    {
      title: 'Số giao dịch',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 150,
      align: 'right',
      render: (amount) => <Text type="success">{formatCurrency(amount)}</Text>,
    },
    {
      title: 'BN chi trả',
      dataIndex: 'patientAmount',
      key: 'patientAmount',
      width: 150,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tổng cộng',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 150,
      align: 'right',
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
  ];

  // Expense columns
  const expenseColumns: ColumnsType<ExpenseRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 250,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 180,
    },
    {
      title: 'Số hóa đơn',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 130,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount) => <Text type="danger">{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getExpenseStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintExpense(record)}>
          In
        </Button>
      ),
    },
  ];

  // Department revenue columns
  const departmentColumns: ColumnsType<DepartmentRevenue> = [
    {
      title: 'Khoa/Phòng',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      fixed: 'left',
    },
    {
      title: 'Số BN',
      dataIndex: 'patientCount',
      key: 'patientCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'BHYT',
      dataIndex: 'insuranceRevenue',
      key: 'insuranceRevenue',
      width: 150,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Viện phí',
      dataIndex: 'selfPayRevenue',
      key: 'selfPayRevenue',
      width: 150,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceRevenue',
      key: 'serviceRevenue',
      width: 150,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tổng doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 180,
      align: 'right',
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Tăng trưởng',
      dataIndex: 'growth',
      key: 'growth',
      width: 130,
      align: 'right',
      render: (growth) => (
        <Space>
          {growth >= 0 ? (
            <RiseOutlined style={{ color: '#52c41a' }} />
          ) : (
            <FallOutlined style={{ color: '#ff4d4f' }} />
          )}
          <Text style={{ color: growth >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {growth >= 0 ? '+' : ''}{growth}%
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.growth - b.growth,
    },
  ];

  return (
    <div>
      <Title level={4}>Quản lý Tài chính</Title>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={totalRevenue}
              precision={0}
              styles={{ content: { color: '#3f8600' } }}
              prefix={<DollarOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress percent={100} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="BHYT chi trả"
              value={totalInsurance}
              precision={0}
              styles={{ content: { color: '#1890ff' } }}
              prefix={<DollarOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={safePercent(totalInsurance, totalRevenue)}
              showInfo={false}
              strokeColor="#1890ff"
            />
            <Text type="secondary">{safePercent(totalInsurance, totalRevenue)}% tổng DT</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng chi phí"
              value={totalExpense}
              precision={0}
              styles={{ content: { color: '#cf1322' } }}
              prefix={<DollarOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={safePercent(totalExpense, totalRevenue)}
              showInfo={false}
              strokeColor="#ff4d4f"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Lợi nhuận"
              value={profit}
              precision={0}
              styles={{ content: { color: profit >= 0 ? '#3f8600' : '#cf1322' } }}
              prefix={profit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={safePercent(Math.abs(profit), totalRevenue)}
              showInfo={false}
              strokeColor={profit >= 0 ? '#52c41a' : '#ff4d4f'}
            />
            <Text type="secondary">{safePercent(profit, totalRevenue)}% biên lợi nhuận</Text>
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <RangePicker
                format="DD/MM/YYYY"
                value={dateRange}
                onChange={(dates) => {
                  if (dates) {
                    setDateRange([dates[0]!, dates[1]!]);
                  }
                }}
              />
              <Button icon={<FilterOutlined />} onClick={handleFilter} loading={loading}>Lọc</Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} loading={exportLoading}>
                Xuất Excel
              </Button>
            </Space>
          }
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined />
                  Tổng quan
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Card title="Cơ cấu doanh thu">
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text>BHYT</Text>
                            <Progress
                              percent={safePercent(totalInsurance, totalRevenue)}
                              strokeColor="#1890ff"
                            />
                          </div>
                          <div>
                            <Text>Viện phí</Text>
                            <Progress
                              percent={safePercent(totalSelfPay, totalRevenue)}
                              strokeColor="#52c41a"
                            />
                          </div>
                          <div>
                            <Text>Dịch vụ</Text>
                            <Progress
                              percent={safePercent(totalService, totalRevenue)}
                              strokeColor="#faad14"
                            />
                          </div>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={16}>
                      <Card title="Doanh thu theo khoa/phòng">
                        <Table
                          columns={departmentColumns}
                          dataSource={departmentRevenue}
                          rowKey="key"
                          size="small"
                          loading={loading}
                          pagination={false}
                          scroll={{ x: 1100 }}
                          onRow={(record) => ({
                            onDoubleClick: () => {
                              setSelectedFinanceRecord(record);
                              setFinanceDetailType('department');
                              setFinanceDetailVisible(true);
                            },
                            style: { cursor: 'pointer' },
                          })}
                        />
                      </Card>
                    </Col>
                  </Row>
                </>
              ),
            },
            {
              key: 'revenue',
              label: (
                <span>
                  <RiseOutlined />
                  Doanh thu
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo khoa/phòng, loại dịch vụ..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={revenueSearchText}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRevenueSearchText(value);
                          applyRevenueFilters(revenueRecords, value, revenueDeptFilter);
                        }}
                        onSearch={(value) => {
                          setRevenueSearchText(value);
                          applyRevenueFilters(revenueRecords, value, revenueDeptFilter);
                        }}
                      />
                    </Col>
                    <Col>
                      <Select
                        value={revenueDeptFilter}
                        style={{ width: 150 }}
                        onChange={(value) => {
                          setRevenueDeptFilter(value);
                          applyRevenueFilters(revenueRecords, revenueSearchText, value);
                        }}
                      >
                        <Select.Option value="all">Tất cả khoa</Select.Option>
                        <Select.Option value="noi">Khoa Nội</Select.Option>
                        <Select.Option value="ngoai">Khoa Ngoại</Select.Option>
                        <Select.Option value="san">Khoa Sản</Select.Option>
                        <Select.Option value="xn">Khoa Xét nghiệm</Select.Option>
                        <Select.Option value="cdha">Khoa CĐHA</Select.Option>
                      </Select>
                    </Col>
                  </Row>

                  <Table
                    columns={revenueColumns}
                    dataSource={filteredRevenueRecords}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedFinanceRecord(record);
                        setFinanceDetailType('revenue');
                        setFinanceDetailVisible(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                    summary={(pageData) => {
                      const totalInsur = pageData.reduce((sum, r) => sum + r.insuranceAmount, 0);
                      const totalPatient = pageData.reduce((sum, r) => sum + r.patientAmount, 0);
                      const total = pageData.reduce((sum, r) => sum + r.totalAmount, 0);
                      const totalTrans = pageData.reduce((sum, r) => sum + r.transactionCount, 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={3}>
                            <Text strong>Tổng cộng</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong>{totalTrans}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong type="success">{formatCurrency(totalInsur)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Text strong>{formatCurrency(totalPatient)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <Text strong>{formatCurrency(total)}</Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'expense',
              label: (
                <span>
                  <FallOutlined />
                  Chi phí
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo mô tả, nhà cung cấp, số hóa đơn..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        value={expenseSearchText}
                        onChange={(e) => {
                          const value = e.target.value;
                          setExpenseSearchText(value);
                          applyExpenseFilters(expenseRecords, value, expenseCategoryFilter);
                        }}
                        onSearch={(value) => {
                          setExpenseSearchText(value);
                          applyExpenseFilters(expenseRecords, value, expenseCategoryFilter);
                        }}
                      />
                    </Col>
                    <Col>
                      <Select
                        value={expenseCategoryFilter}
                        style={{ width: 150 }}
                        onChange={(value) => {
                          setExpenseCategoryFilter(value);
                          applyExpenseFilters(expenseRecords, expenseSearchText, value);
                        }}
                      >
                        <Select.Option value="all">Tất cả danh mục</Select.Option>
                        <Select.Option value="thuoc">Thuốc</Select.Option>
                        <Select.Option value="vattu">Vật tư y tế</Select.Option>
                        <Select.Option value="thietbi">Thiết bị</Select.Option>
                        <Select.Option value="khac">Khác</Select.Option>
                      </Select>
                    </Col>
                  </Row>

                  <Table
                    columns={expenseColumns}
                    dataSource={filteredExpenseRecords}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedFinanceRecord(record);
                        setFinanceDetailType('expense');
                        setFinanceDetailVisible(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                    summary={(pageData) => {
                      const total = pageData.reduce((sum, r) => sum + r.amount, 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={5}>
                            <Text strong>Tổng chi phí</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Text strong type="danger">{formatCurrency(total)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} colSpan={2} />
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'reports',
              label: (
                <span>
                  <PrinterOutlined />
                  Báo cáo
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'revenue_dept'}
                      onClick={() => handleReportClick('revenue_dept', 'Báo cáo doanh thu theo khoa')}
                    >
                      <Space>
                        {reportLoading === 'revenue_dept' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                        <div>
                          <Text strong>Báo cáo doanh thu theo khoa</Text>
                          <br />
                          <Text type="secondary">Thống kê doanh thu chi tiết theo từng khoa/phòng</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'revenue_service'}
                      onClick={() => handleReportClick('revenue_service', 'Báo cáo doanh thu theo dịch vụ')}
                    >
                      <Space>
                        {reportLoading === 'revenue_service' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <BarChartOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                        <div>
                          <Text strong>Báo cáo doanh thu theo dịch vụ</Text>
                          <br />
                          <Text type="secondary">Thống kê doanh thu theo nhóm dịch vụ</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'expense'}
                      onClick={() => handleReportClick('expense', 'Báo cáo chi phí')}
                    >
                      <Space>
                        {reportLoading === 'expense' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <BarChartOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />}
                        <div>
                          <Text strong>Báo cáo chi phí</Text>
                          <br />
                          <Text type="secondary">Thống kê chi phí theo danh mục</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'insurance'}
                      onClick={() => handleReportClick('insurance', 'Báo cáo thanh toán BHYT')}
                    >
                      <Space>
                        {reportLoading === 'insurance' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <BarChartOutlined style={{ fontSize: 24, color: '#722ed1' }} />}
                        <div>
                          <Text strong>Báo cáo thanh toán BHYT</Text>
                          <br />
                          <Text type="secondary">Báo cáo theo QĐ 6556/BYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'surgery_profit'}
                      onClick={() => handleReportClick('surgery_profit', 'Báo cáo lợi nhuận PTTT')}
                    >
                      <Space>
                        {reportLoading === 'surgery_profit' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <BarChartOutlined style={{ fontSize: 24, color: '#faad14' }} />}
                        <div>
                          <Text strong>Báo cáo lợi nhuận PTTT</Text>
                          <br />
                          <Text type="secondary">Tính toán lợi nhuận phẫu thuật thủ thuật</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'summary'}
                      onClick={() => handleReportClick('summary', 'Báo cáo tổng hợp')}
                    >
                      <Space>
                        {reportLoading === 'summary' ? <LoadingOutlined style={{ fontSize: 24 }} /> : <FileExcelOutlined style={{ fontSize: 24, color: '#13c2c2' }} />}
                        <div>
                          <Text strong>Báo cáo tổng hợp</Text>
                          <br />
                          <Text type="secondary">Báo cáo tổng hợp tài chính theo kỳ</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Finance Detail Modal */}
      <Modal
        title={financeDetailType === 'revenue' ? 'Chi tiết doanh thu' : financeDetailType === 'expense' ? 'Chi tiết chi phí' : 'Chi tiết doanh thu khoa'}
        open={financeDetailVisible}
        onCancel={() => setFinanceDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setFinanceDetailVisible(false)}>Đóng</Button>,
        ]}
        width={600}
      >
        {selectedFinanceRecord && financeDetailType === 'revenue' && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Ngày">{dayjs(selectedFinanceRecord.date).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Khoa/Phòng">{selectedFinanceRecord.department}</Descriptions.Item>
            <Descriptions.Item label="Loại dịch vụ">{selectedFinanceRecord.serviceType}</Descriptions.Item>
            <Descriptions.Item label="Số giao dịch">{selectedFinanceRecord.transactionCount}</Descriptions.Item>
            <Descriptions.Item label="BHYT">{formatCurrency(selectedFinanceRecord.insuranceAmount)}</Descriptions.Item>
            <Descriptions.Item label="BN chi trả">{formatCurrency(selectedFinanceRecord.patientAmount)}</Descriptions.Item>
            <Descriptions.Item label="Tổng doanh thu" span={2}>
              <Text strong>{formatCurrency(selectedFinanceRecord.totalAmount)}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
        {selectedFinanceRecord && financeDetailType === 'expense' && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Ngày">{dayjs(selectedFinanceRecord.date).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Danh mục">{selectedFinanceRecord.category}</Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>{selectedFinanceRecord.description}</Descriptions.Item>
            <Descriptions.Item label="Số tiền">{formatCurrency(selectedFinanceRecord.amount)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={selectedFinanceRecord.status === 2 ? 'green' : selectedFinanceRecord.status === 1 ? 'blue' : 'orange'}>
                {selectedFinanceRecord.status === 2 ? 'Đã thanh toán' : selectedFinanceRecord.status === 1 ? 'Đã duyệt' : 'Chờ duyệt'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">{selectedFinanceRecord.supplier || '-'}</Descriptions.Item>
            <Descriptions.Item label="Số hóa đơn">{selectedFinanceRecord.invoiceNumber || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {selectedFinanceRecord && financeDetailType === 'department' && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khoa/Phòng" span={2}>{selectedFinanceRecord.department}</Descriptions.Item>
            <Descriptions.Item label="Tổng doanh thu">{formatCurrency(selectedFinanceRecord.totalRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Tăng trưởng">
              <Text style={{ color: selectedFinanceRecord.growth >= 0 ? '#52c41a' : '#f5222d' }}>
                {selectedFinanceRecord.growth >= 0 ? '+' : ''}{selectedFinanceRecord.growth}%
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="BHYT">{formatCurrency(selectedFinanceRecord.insuranceRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Viện phí">{formatCurrency(selectedFinanceRecord.selfPayRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Dịch vụ">{formatCurrency(selectedFinanceRecord.serviceRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Số BN">{selectedFinanceRecord.patientCount}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Finance;
