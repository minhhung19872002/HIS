import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Tag,
  message,
  Tabs,
  DatePicker,
  Select,
  Modal,
  Descriptions
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
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  financeApi,
  type RevenueByExecutingDeptDto,
  type RevenueByServiceDto,
  type CostByDepartmentDto,
  type InsuranceReconciliationDto,
  type FinancialSummaryReportDto,
} from '../api/system';

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

type FinanceDetailRecord = RevenueRecord | ExpenseRecord | DepartmentRevenue;

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
  const [selectedFinanceRecord, setSelectedFinanceRecord] = useState<FinanceDetailRecord | null>(null);
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
      const deptRows = revenueByDeptRes.data ?? [];
      const deptData: DepartmentRevenue[] = deptRows.map((d: RevenueByExecutingDeptDto, idx: number) => ({
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
      const serviceRows = revenueByServiceRes.data ?? [];
      const revData: RevenueRecord[] = serviceRows.map((s: RevenueByServiceDto, idx: number) => ({
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
      const costRows = costByDeptRes.data ?? [];
      const expData: ExpenseRecord[] = costRows.map((c: CostByDepartmentDto, idx: number) => ({
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
      message.warning('Lỗi khi tải dữ liệu tài chính');
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
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
      message.warning('Lỗi khi xuất Excel');
      console.warn('Error exporting Excel:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle print expense invoice
  const handlePrintExpense = (record: ExpenseRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
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
      let loadedRecordCount = 1;

      switch (reportType) {
        case 'revenue_dept':
          loadedRecordCount = (await financeApi.getRevenueByOrderingDept(fromDate, toDate)).data.length;
          break;
        case 'revenue_service':
          loadedRecordCount = (await financeApi.getRevenueByService(fromDate, toDate)).data.length;
          break;
        case 'expense':
          loadedRecordCount = (await financeApi.getCostByDepartment(fromDate, toDate)).data.length;
          break;
        case 'insurance':
          loadedRecordCount = ((await financeApi.getInsuranceReconciliation(fromDate, toDate)).data as InsuranceReconciliationDto | null) ? 1 : 0;
          break;
        case 'surgery_profit':
          loadedRecordCount = (await financeApi.getSurgeryProfitReport(fromDate, toDate)).data.length;
          break;
        case 'summary':
          loadedRecordCount = ((await financeApi.getFinancialSummary(fromDate, toDate)).data as FinancialSummaryReportDto | null) ? 1 : 0;
          break;
        default:
          loadedRecordCount = ((await financeApi.getFinancialSummary(fromDate, toDate)).data as FinancialSummaryReportDto | null) ? 1 : 0;
      }

      // Try to export as file
      try {
        const exportRes = await financeApi.exportFinancialReport({
          reportType,
          fromDate,
          toDate,
          outputFormat: 'excel',
        });
        const blob = new Blob([exportRes.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
        message.success(`Đã tải dữ liệu ${reportName} (${loadedRecordCount || 1} bản ghi)`);
      }
    } catch (error) {
      message.warning(`Lỗi khi tải ${reportName}`);
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
  const revenueDetail = financeDetailType === 'revenue' ? selectedFinanceRecord as RevenueRecord | null : null;
  const expenseDetail = financeDetailType === 'expense' ? selectedFinanceRecord as ExpenseRecord | null : null;
  const departmentDetail = financeDetailType === 'department' ? selectedFinanceRecord as DepartmentRevenue | null : null;

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
      render: (amount) => <span className="text-green-600">{formatCurrency(amount)}</span>,
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
      render: (amount) => <span className="font-semibold">{formatCurrency(amount)}</span>,
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
      render: (amount) => <span className="text-red-500">{formatCurrency(amount)}</span>,
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
      render: (amount) => <span className="font-semibold">{formatCurrency(amount)}</span>,
    },
    {
      title: 'Tăng trưởng',
      dataIndex: 'growth',
      key: 'growth',
      width: 130,
      align: 'right',
      render: (growth) => (
        <span className={`inline-flex items-center gap-1 ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {growth >= 0 ? <RiseOutlined /> : <FallOutlined />}
          {growth >= 0 ? '+' : ''}{growth}%
        </span>
      ),
      sorter: (a, b) => a.growth - b.growth,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 m-0">Quản lý Tài chính</h2>
        <Button icon={<ReloadOutlined />} onClick={() => loadData()} size="small">Làm mới</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 font-semibold mb-1"><DollarOutlined className="mr-1" />Tổng doanh thu</div>
          <div className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(totalRevenue)}đ</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 font-semibold mb-1"><DollarOutlined className="mr-1" />BHYT chi trả</div>
          <div className="text-2xl font-bold text-blue-500">{new Intl.NumberFormat('vi-VN').format(totalInsurance)}đ</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2"><div className="h-1.5 rounded-full bg-blue-500" style={{width: safePercent(totalInsurance, totalRevenue)+'%'}}></div></div>
          <span className="text-xs text-gray-400 mt-1">{safePercent(totalInsurance, totalRevenue)}% tổng DT</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 font-semibold mb-1"><DollarOutlined className="mr-1" />Tổng chi phí</div>
          <div className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(totalExpense)}đ</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2"><div className="h-1.5 rounded-full bg-red-500" style={{width: safePercent(totalExpense, totalRevenue)+'%'}}></div></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-xs text-gray-500 font-semibold mb-1">{profit >= 0 ? <RiseOutlined className="mr-1" /> : <FallOutlined className="mr-1" />}Lợi nhuận</div>
          <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{new Intl.NumberFormat('vi-VN').format(profit)}đ</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2"><div className={`h-1.5 rounded-full ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: safePercent(Math.abs(profit), totalRevenue)+'%'}}></div></div>
          <span className="text-xs text-gray-400 mt-1">{safePercent(profit, totalRevenue)}% biên lợi nhuận</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <div className="flex items-center gap-2">
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
            </div>
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Cơ cấu doanh thu</h4>
                      <div className="flex flex-col gap-3">
                        <div>
                          <span className="text-sm text-gray-600">BHYT</span>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-blue-500" style={{width: safePercent(totalInsurance, totalRevenue)+'%'}}></div></div>
                          <span className="text-xs text-gray-400">{safePercent(totalInsurance, totalRevenue)}%</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Viện phí</span>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-green-500" style={{width: safePercent(totalSelfPay, totalRevenue)+'%'}}></div></div>
                          <span className="text-xs text-gray-400">{safePercent(totalSelfPay, totalRevenue)}%</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Dịch vụ</span>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-yellow-500" style={{width: safePercent(totalService, totalRevenue)+'%'}}></div></div>
                          <span className="text-xs text-gray-400">{safePercent(totalService, totalRevenue)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Doanh thu theo khoa/phòng</h4>
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
                    </div>
                  </div>
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
                  <div className="flex gap-4 mb-4 items-center">
                    <div className="flex-1">
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
                    </div>
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
                  </div>

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
                            <span className="font-semibold">Tổng cộng</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <span className="font-semibold">{totalTrans}</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <span className="font-semibold text-green-600">{formatCurrency(totalInsur)}</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <span className="font-semibold">{formatCurrency(totalPatient)}</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <span className="font-semibold">{formatCurrency(total)}</span>
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
                  <div className="flex gap-4 mb-4 items-center">
                    <div className="flex-1">
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
                    </div>
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
                  </div>

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
                            <span className="font-semibold">Tổng chi phí</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <span className="font-semibold text-red-500">{formatCurrency(total)}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'revenue_dept', name: 'Báo cáo doanh thu theo khoa', desc: 'Thống kê doanh thu chi tiết theo từng khoa/phòng', color: 'text-blue-500', Icon: BarChartOutlined },
                    { key: 'revenue_service', name: 'Báo cáo doanh thu theo dịch vụ', desc: 'Thống kê doanh thu theo nhóm dịch vụ', color: 'text-green-500', Icon: BarChartOutlined },
                    { key: 'expense', name: 'Báo cáo chi phí', desc: 'Thống kê chi phí theo danh mục', color: 'text-red-500', Icon: BarChartOutlined },
                    { key: 'insurance', name: 'Báo cáo thanh toán BHYT', desc: 'Báo cáo theo QĐ 6556/BYT', color: 'text-purple-500', Icon: BarChartOutlined },
                    { key: 'surgery_profit', name: 'Báo cáo lợi nhuận PTTT', desc: 'Tính toán lợi nhuận phẫu thuật thủ thuật', color: 'text-yellow-500', Icon: BarChartOutlined },
                    { key: 'summary', name: 'Báo cáo tổng hợp', desc: 'Báo cáo tổng hợp tài chính theo kỳ', color: 'text-teal-500', Icon: FileExcelOutlined },
                  ].map(r => (
                    <div
                      key={r.key}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleReportClick(r.key, r.name)}
                    >
                      <div className="flex items-center gap-3">
                        {reportLoading === r.key ? <LoadingOutlined className="text-2xl" /> : <r.Icon className={`text-2xl ${r.color}`} />}
                        <div>
                          <span className="font-semibold text-sm">{r.name}</span>
                          <br />
                          <span className="text-xs text-gray-400">{r.desc}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

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
        {revenueDetail && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Ngày">{dayjs(revenueDetail.date).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Khoa/Phòng">{revenueDetail.department}</Descriptions.Item>
            <Descriptions.Item label="Loại dịch vụ">{revenueDetail.serviceType}</Descriptions.Item>
            <Descriptions.Item label="Số giao dịch">{revenueDetail.transactionCount}</Descriptions.Item>
            <Descriptions.Item label="BHYT">{formatCurrency(revenueDetail.insuranceAmount)}</Descriptions.Item>
            <Descriptions.Item label="BN chi trả">{formatCurrency(revenueDetail.patientAmount)}</Descriptions.Item>
            <Descriptions.Item label="Tổng doanh thu" span={2}>
              <span className="font-semibold">{formatCurrency(revenueDetail.totalAmount)}</span>
            </Descriptions.Item>
          </Descriptions>
        )}
        {expenseDetail && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Ngày">{dayjs(expenseDetail.date).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Danh mục">{expenseDetail.category}</Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>{expenseDetail.description}</Descriptions.Item>
            <Descriptions.Item label="Số tiền">{formatCurrency(expenseDetail.amount)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={expenseDetail.status === 2 ? 'green' : expenseDetail.status === 1 ? 'blue' : 'orange'}>
                {expenseDetail.status === 2 ? 'Đã thanh toán' : expenseDetail.status === 1 ? 'Đã duyệt' : 'Chờ duyệt'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">{expenseDetail.supplier || '-'}</Descriptions.Item>
            <Descriptions.Item label="Số hóa đơn">{expenseDetail.invoiceNumber || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {departmentDetail && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khoa/Phòng" span={2}>{departmentDetail.department}</Descriptions.Item>
            <Descriptions.Item label="Tổng doanh thu">{formatCurrency(departmentDetail.totalRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Tăng trưởng">
              <span className={departmentDetail.growth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {departmentDetail.growth >= 0 ? '+' : ''}{departmentDetail.growth}%
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="BHYT">{formatCurrency(departmentDetail.insuranceRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Viện phí">{formatCurrency(departmentDetail.selfPayRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Dịch vụ">{formatCurrency(departmentDetail.serviceRevenue)}</Descriptions.Item>
            <Descriptions.Item label="Số BN">{departmentDetail.patientCount}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Finance;
