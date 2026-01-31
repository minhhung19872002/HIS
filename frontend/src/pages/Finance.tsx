import React, { useState } from 'react';
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

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

// Mock data
const mockRevenueRecords: RevenueRecord[] = [
  {
    id: '1',
    date: '2026-01-30',
    department: 'Khoa Nội',
    serviceType: 'Khám bệnh',
    totalAmount: 15000000,
    insuranceAmount: 12000000,
    patientAmount: 3000000,
    transactionCount: 45,
  },
  {
    id: '2',
    date: '2026-01-30',
    department: 'Khoa Ngoại',
    serviceType: 'Phẫu thuật',
    totalAmount: 85000000,
    insuranceAmount: 60000000,
    patientAmount: 25000000,
    transactionCount: 5,
  },
  {
    id: '3',
    date: '2026-01-30',
    department: 'Khoa Xét nghiệm',
    serviceType: 'Xét nghiệm',
    totalAmount: 25000000,
    insuranceAmount: 20000000,
    patientAmount: 5000000,
    transactionCount: 120,
  },
  {
    id: '4',
    date: '2026-01-30',
    department: 'Khoa CĐHA',
    serviceType: 'Chẩn đoán hình ảnh',
    totalAmount: 35000000,
    insuranceAmount: 28000000,
    patientAmount: 7000000,
    transactionCount: 80,
  },
];

const mockExpenseRecords: ExpenseRecord[] = [
  {
    id: '1',
    date: '2026-01-30',
    category: 'Thuốc',
    description: 'Nhập thuốc kháng sinh',
    amount: 150000000,
    supplier: 'Công ty Dược ABC',
    invoiceNumber: 'HD260100001',
    status: 2,
  },
  {
    id: '2',
    date: '2026-01-30',
    category: 'Vật tư y tế',
    description: 'Nhập vật tư tiêu hao',
    amount: 50000000,
    supplier: 'Công ty Thiết bị y tế XYZ',
    invoiceNumber: 'HD260100002',
    status: 1,
  },
  {
    id: '3',
    date: '2026-01-29',
    category: 'Thiết bị',
    description: 'Bảo trì máy CT Scanner',
    amount: 25000000,
    supplier: 'Công ty Kỹ thuật Y tế',
    invoiceNumber: 'HD260100003',
    status: 0,
  },
];

const mockDepartmentRevenue: DepartmentRevenue[] = [
  {
    department: 'Khoa Nội',
    totalRevenue: 450000000,
    insuranceRevenue: 360000000,
    selfPayRevenue: 60000000,
    serviceRevenue: 30000000,
    patientCount: 1350,
    growth: 12.5,
  },
  {
    department: 'Khoa Ngoại',
    totalRevenue: 850000000,
    insuranceRevenue: 600000000,
    selfPayRevenue: 150000000,
    serviceRevenue: 100000000,
    patientCount: 320,
    growth: 8.3,
  },
  {
    department: 'Khoa Sản',
    totalRevenue: 380000000,
    insuranceRevenue: 280000000,
    selfPayRevenue: 60000000,
    serviceRevenue: 40000000,
    patientCount: 180,
    growth: -2.1,
  },
  {
    department: 'Khoa Xét nghiệm',
    totalRevenue: 750000000,
    insuranceRevenue: 600000000,
    selfPayRevenue: 100000000,
    serviceRevenue: 50000000,
    patientCount: 3600,
    growth: 15.2,
  },
  {
    department: 'Khoa CĐHA',
    totalRevenue: 1050000000,
    insuranceRevenue: 840000000,
    selfPayRevenue: 150000000,
    serviceRevenue: 60000000,
    patientCount: 2400,
    growth: 10.8,
  },
];

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [_revenueRecords] = useState<RevenueRecord[]>(mockRevenueRecords);
  const [_expenseRecords] = useState<ExpenseRecord[]>(mockExpenseRecords);
  const [departmentRevenue] = useState<DepartmentRevenue[]>(mockDepartmentRevenue);
  const [_dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);

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

  // Calculate totals
  const totalRevenue = departmentRevenue.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalInsurance = departmentRevenue.reduce((sum, d) => sum + d.insuranceRevenue, 0);
  const totalSelfPay = departmentRevenue.reduce((sum, d) => sum + d.selfPayRevenue, 0);
  const totalService = departmentRevenue.reduce((sum, d) => sum + d.serviceRevenue, 0);
  const totalExpense = mockExpenseRecords.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpense;

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
      render: () => (
        <Button size="small" icon={<PrinterOutlined />}>
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
              valueStyle={{ color: '#3f8600' }}
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
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={Math.round((totalInsurance / totalRevenue) * 100)}
              showInfo={false}
              strokeColor="#1890ff"
            />
            <Text type="secondary">{Math.round((totalInsurance / totalRevenue) * 100)}% tổng DT</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng chi phí"
              value={totalExpense}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<DollarOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={Math.round((totalExpense / totalRevenue) * 100)}
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
              valueStyle={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}
              prefix={profit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              suffix="VNĐ"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
            <Progress
              percent={Math.round((profit / totalRevenue) * 100)}
              showInfo={false}
              strokeColor={profit >= 0 ? '#52c41a' : '#ff4d4f'}
            />
            <Text type="secondary">{Math.round((profit / totalRevenue) * 100)}% biên lợi nhuận</Text>
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
                onChange={(dates) => {
                  if (dates) {
                    setDateRange([dates[0]!, dates[1]!]);
                  }
                }}
              />
              <Button icon={<FilterOutlined />}>Lọc</Button>
              <Button icon={<FileExcelOutlined />} onClick={() => message.info('Xuất Excel')}>
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
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text>BHYT</Text>
                            <Progress
                              percent={Math.round((totalInsurance / totalRevenue) * 100)}
                              strokeColor="#1890ff"
                            />
                          </div>
                          <div>
                            <Text>Viện phí</Text>
                            <Progress
                              percent={Math.round((totalSelfPay / totalRevenue) * 100)}
                              strokeColor="#52c41a"
                            />
                          </div>
                          <div>
                            <Text>Dịch vụ</Text>
                            <Progress
                              percent={Math.round((totalService / totalRevenue) * 100)}
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
                          rowKey="department"
                          size="small"
                          pagination={false}
                          scroll={{ x: 1100 }}
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
                      />
                    </Col>
                    <Col>
                      <Select defaultValue="all" style={{ width: 150 }}>
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
                    dataSource={mockRevenueRecords}
                    rowKey="id"
                    size="small"
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
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
                      />
                    </Col>
                    <Col>
                      <Select defaultValue="all" style={{ width: 150 }}>
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
                    dataSource={mockExpenseRecords}
                    rowKey="id"
                    size="small"
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
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
                      onClick={() => message.info('Xuất báo cáo doanh thu theo khoa')}
                    >
                      <Space>
                        <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
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
                      onClick={() => message.info('Xuất báo cáo doanh thu theo dịch vụ')}
                    >
                      <Space>
                        <BarChartOutlined style={{ fontSize: 24, color: '#52c41a' }} />
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
                      onClick={() => message.info('Xuất báo cáo chi phí')}
                    >
                      <Space>
                        <BarChartOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
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
                      onClick={() => message.info('Xuất báo cáo BHYT')}
                    >
                      <Space>
                        <BarChartOutlined style={{ fontSize: 24, color: '#722ed1' }} />
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
                      onClick={() => message.info('Xuất báo cáo lợi nhuận PTTT')}
                    >
                      <Space>
                        <BarChartOutlined style={{ fontSize: 24, color: '#faad14' }} />
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
                      onClick={() => message.info('Xuất báo cáo tổng hợp')}
                    >
                      <Space>
                        <FileExcelOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
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
    </div>
  );
};

export default Finance;
