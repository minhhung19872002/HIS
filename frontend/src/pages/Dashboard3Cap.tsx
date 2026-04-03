/**
 * Dashboard3Cap.tsx
 * NangCap21 - HIS Đám Mây 3 Cấp: Tổng hợp Trạm YT → Huyện → Tỉnh
 * Dashboard đa chi nhánh với branch selector và 3-tier view
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Typography, Spin, Tag, message,
  Select, DatePicker, Tree, Button, Empty, Space, Divider, Badge,
  Segmented, Progress, Table, Tooltip
} from 'antd';
import {
  HomeOutlined, TeamOutlined, DollarOutlined, MedicineBoxOutlined,
  ExperimentOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ReloadOutlined, SafetyOutlined,
  ThunderboltOutlined, PlusOutlined, MinusOutlined,
  BankOutlined, UserSwitchOutlined, MenuOutlined,
  PieChartOutlined, BarChartOutlined, LineChartOutlined, UserOutlined
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getMultiFacilityDashboard, getBranchTree, getBranchesByLevel, getConsolidatedReport, getBranchDutyRoster } from '../api/multiFacility';
import type {
  MultiFacilityDashboardDto, BranchTreeDto, BranchSummary,
  DailyTrendItem, BranchDepartmentStat, PatientTypeBreakdown,
  ConsolidatedReportDto, BranchReportItem, BranchDutyRosterDto, DutyShiftItem, BranchStaffSummary
} from '../api/multiFacility';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Branch level colors
const LEVEL_COLORS: Record<string, string> = {
  'Tỉnh/Thành phố': '#1890ff',
  'Huyện/Quận': '#52c41a',
  'Trạm Y tế': '#faad14',
};

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

const formatCurrency = (v: number) => {
  if (!v) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

export default function Dashboard3Cap() {
  const [dashboard, setDashboard] = useState<MultiFacilityDashboardDto | null>(null);
  const [branchTree, setBranchTree] = useState<BranchTreeDto | null>(null);
  const [branchesByLevel, setBranchesByLevel] = useState<BranchTreeDto[]>([]);
  const [consolidatedReport, setConsolidatedReport] = useState<ConsolidatedReportDto | null>(null);
  const [dutyRoster, setDutyRoster] = useState<BranchDutyRosterDto | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dutyYear, setDutyYear] = useState<number>(new Date().getFullYear());
  const [dutyMonth, setDutyMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Build flat branch list for selector
  const flattenBranches = (nodes: BranchTreeDto[], level = 0): { key: string; title: string; level: number; data: BranchTreeDto }[] => {
    const result: { key: string; title: string; level: number; data: BranchTreeDto }[] = [];
    for (const node of nodes) {
      const prefix = '　'.repeat(level);
      result.push({
        key: node.id,
        title: `${prefix}${node.branchLevel === 'Tỉnh/Thành phố' ? '🏥' : node.branchLevel === 'Huyện/Quận' ? '🏢' : '🏨'} ${node.branchCode} - ${node.branchName}`,
        level,
        data: node
      });
      if (node.children?.length) {
        result.push(...flattenBranches(node.children, level + 1));
      }
    }
    return result;
  };

  const flatBranches = branchTree ? flattenBranches([branchTree]) : [];

  // Tree data for branch selector
  const buildTreeData = (nodes: BranchTreeDto[]): { key: string; title: string; children?: any[] }[] => {
    return nodes.map(n => ({
      key: n.id,
      title: `${n.branchName} ${n.branchLevel !== 'Tỉnh/Thành phố' ? `(${n.branchCode})` : ''}`,
      children: n.children?.length ? buildTreeData(n.children) : undefined,
      isLeaf: !n.children?.length,
    }));
  };

  const loadDashboard = useCallback(async (branchId?: string, date?: Date) => {
    setLoading(true);
    try {
      const [dash, tree, levels, report] = await Promise.allSettled([
        getMultiFacilityDashboard(branchId || undefined, date?.toISOString().split('T')[0]),
        getBranchTree(),
        getBranchesByLevel(),
        getConsolidatedReport(
          branchId || undefined,
          'patient',
          new Date(Date.now() - 30 * 86400000),
          date || new Date()
        )
      ]);

      if (dash.status === 'fulfilled') setDashboard(dash.value);
      else console.warn('Dashboard load failed:', (dash as PromiseRejectedResult).reason);

      if (tree.status === 'fulfilled') setBranchTree(tree.value);
      else console.warn('Branch tree load failed:', (tree as PromiseRejectedResult).reason);

      if (levels.status === 'fulfilled') setBranchesByLevel(levels.value);
      else console.warn('Branches by level failed:', (levels as PromiseRejectedResult).reason);

      if (report.status === 'fulfilled') setConsolidatedReport(report.value);
      else console.warn('Consolidated report failed:', (report as PromiseRejectedResult).reason);
    } catch (err) {
      console.warn('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDutyRoster = useCallback(async (branchId?: string, year?: number, month?: number) => {
    try {
      const roster = await getBranchDutyRoster(
        branchId || undefined,
        year || dutyYear,
        month || dutyMonth
      );
      setDutyRoster(roster);
    } catch (err) {
      console.warn('Failed to load duty roster:', err);
    }
  }, [dutyYear, dutyMonth]);

  useEffect(() => {
    loadDashboard(selectedBranchId || undefined, selectedDate);
  }, [loadDashboard, selectedBranchId, selectedDate]);

  useEffect(() => {
    if (activeTab === 'duty') {
      loadDutyRoster(selectedBranchId || undefined, dutyYear, dutyMonth);
    }
  }, [activeTab, selectedBranchId, dutyYear, dutyMonth, loadDutyRoster]);

  // Chart data: 7-day trend
  const trendData = dashboard?.weeklyTrends?.map(t => ({
    date: dayjs(t.date).format('DD/MM'),
    'Ngoại trú': t.outpatients,
    'Nhập viện': t.admissions,
    'Doanh thu (M)': t.revenue ? +(t.revenue / 1_000_000).toFixed(2) : 0,
  })) ?? [];

  // Patient type pie data
  const patientTypeData = dashboard?.patientTypes ? [
    { name: 'Thường', value: dashboard.patientTypes.general || 0 },
    { name: 'BHYT', value: dashboard.patientTypes.insurance || 0 },
    { name: 'Cấp cứu', value: dashboard.patientTypes.emergency || 0 },
    { name: 'Miễn phí', value: dashboard.patientTypes.free || 0 },
    { name: 'Khác', value: dashboard.patientTypes.other || 0 },
  ].filter(d => d.value > 0) : [];

  // Department stats bar data
  const deptData = dashboard?.departmentStats?.slice(0, 8).map(d => ({
    name: d.departmentName.length > 20 ? d.departmentName.slice(0, 18) + '...' : d.departmentName,
    'Khám': d.outpatientCount,
    'Nhập': d.admissionCount,
    'Doanh thu': d.revenue ? +(d.revenue / 1_000_000).toFixed(1) : 0,
  })) ?? [];

  // Sub-branch table columns
  const subBranchColumns: ColumnsType<BranchSummary> = [
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (name: string, row) => (
        <Space>
          <Tag color={LEVEL_COLORS[row.branchLevel] ?? 'default'}>
            {row.branchCode}
          </Tag>
          <Text>{name}</Text>
          <Text type="secondary">({row.branchLevel})</Text>
        </Space>
      ),
    },
    {
      title: 'Cấp',
      dataIndex: 'branchLevel',
      key: 'branchLevel',
      width: 130,
      render: (level: string) => (
        <Tag color={LEVEL_COLORS[level] ?? 'default'}>{level}</Tag>
      ),
    },
    {
      title: 'Ngoại trú',
      dataIndex: 'outpatients',
      key: 'outpatients',
      width: 100,
      align: 'right',
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: 'Nội trú',
      dataIndex: 'inpatients',
      key: 'inpatients',
      width: 100,
      align: 'right',
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Chi nhánh con',
      dataIndex: 'subBranchCount',
      key: 'subBranchCount',
      width: 110,
      align: 'center',
      render: (v: number) => <Badge count={v} style={{ backgroundColor: '#1890ff' }} />,
    },
  ];

  // Consolidated report columns
  const reportColumns: ColumnsType<BranchReportItem> = [
    {
      title: 'Chi nhánh',
      key: 'branch',
      render: (_, row) => (
        <Space>
          <Tag color={LEVEL_COLORS[row.branchLevel] ?? 'default'}>{row.branchCode}</Tag>
          <Text>{row.branchName}</Text>
        </Space>
      ),
    },
    {
      title: 'Cấp',
      dataIndex: 'branchLevel',
      key: 'branchLevel',
      width: 130,
      render: (v: string) => <Tag color={LEVEL_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'BN đăng ký',
      dataIndex: 'patientCount',
      key: 'patientCount',
      width: 110,
      align: 'right',
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: 'Lượt khám',
      dataIndex: 'visitCount',
      key: 'visitCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Nhập viện',
      dataIndex: 'admissionCount',
      key: 'admissionCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: '%',
      dataIndex: 'revenuePercentage',
      key: 'revenuePercentage',
      width: 70,
      align: 'right',
      render: (v: number) => v > 0 ? <Text type="secondary">{v}%</Text> : '-',
    },
  ];

  const totalRevenue = consolidatedReport?.totalRevenue ?? 0;
  const totalPatients = consolidatedReport?.totalPatients ?? 0;
  const totalVisits = consolidatedReport?.totalVisits ?? 0;
  const totalAdmissions = consolidatedReport?.totalAdmissions ?? 0;

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <BankOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Dashboard 3 Cấp - HIS Đám Mây
          </Title>
          <Tag color="blue">NangCap21</Tag>
        </Space>
        <Space>
          {/* Branch selector */}
          <Select
            placeholder="Chọn chi nhánh"
            allowClear
            style={{ width: 320 }}
            value={selectedBranchId || undefined}
            onChange={v => setSelectedBranchId(v || null)}
            showSearch
            optionFilterProp="children"
            treeDefaultExpandAll
            treeNodeFilterProp="title"
            dropdownRender={menu => (
              <div>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <Button
                  type="link"
                  size="small"
                  onClick={() => setSelectedBranchId(null)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <HomeOutlined /> Tất cả chi nhánh
                </Button>
              </div>
            )}
            treeData={branchTree ? buildTreeData([branchTree]) : []}
            treeLine
          />
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={d => d && setSelectedDate(d.toDate())}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadDashboard(selectedBranchId || undefined, selectedDate)}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Branch info banner */}
      {dashboard?.branchName && (
        <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
          <Space>
            <BankOutlined />
            <Text strong>{dashboard.branchName}</Text>
            <Tag color="blue">{dashboard.branchLevel}</Tag>
            <Text type="secondary">| Ngày: {dayjs(dashboard.reportDate).format('DD/MM/YYYY')}</Text>
          </Space>
        </Card>
      )}

      {/* Tab navigation */}
      <Segmented
        value={activeTab}
        onChange={v => setActiveTab(v as string)}
        options={[
          { label: '📊 Tổng quan', value: 'dashboard' },
          { label: '🌳 Cây chi nhánh', value: 'tree' },
          { label: '📈 Báo cáo tổng hợp', value: 'report' },
          { label: '👥 Lịch trực', value: 'duty' },
        ]}
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip="Đang tải dữ liệu dashboard 3 cấp..." />
        </div>
      ) : (
        <>
          {/* ======= TAB 1: Dashboard ======= */}
          {activeTab === 'dashboard' && dashboard && (
            <div>
              {/* KPI Cards */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #1890ff' }}>
                    <Statistic
                      title={<Text type="secondary">Ngoại trú hôm nay</Text>}
                      value={dashboard.todayOutpatients}
                      prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
                    <Statistic
                      title={<Text type="secondary">Nhập viện</Text>}
                      value={dashboard.todayAdmissions}
                      prefix={<PlusOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #faad14' }}>
                    <Statistic
                      title={<Text type="secondary">Xuất viện</Text>}
                      value={dashboard.todayDischarges}
                      prefix={<MinusOutlined style={{ color: '#faad14' }} />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #722ed1' }}>
                    <Statistic
                      title={<Text type="secondary">Doanh thu hôm nay</Text>}
                      value={dashboard.todayRevenue}
                      prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
                      formatter={v => formatCurrency(Number(v))}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #f5222d' }}>
                    <Statistic
                      title={<Text type="secondary">Cấp cứu</Text>}
                      value={dashboard.todayEmergency}
                      prefix={<ThunderboltOutlined style={{ color: '#f5222d' }} />}
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #13c2c2' }}>
                    <Statistic
                      title={<Text type="secondary">Nội trú hiện tại</Text>}
                      value={dashboard.currentInpatients}
                      prefix={<TeamOutlined style={{ color: '#13c2c2' }} />}
                      valueStyle={{ color: '#13c2c2' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #eb2f96' }}>
                    <Statistic
                      title={<Text type="secondary">Giường trống</Text>}
                      value={dashboard.availableBeds}
                      prefix={<MedicineBoxOutlined style={{ color: '#eb2f96' }} />}
                      suffix={`/ ${dashboard.availableBeds + (dashboard.currentInpatients || 0)}`}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ borderLeft: '3px solid #fa8c16' }}>
                    <Statistic
                      title={<Text type="secondary">Phẫu thuật</Text>}
                      value={dashboard.surgeries ?? 0}
                      prefix={<ExperimentOutlined style={{ color: '#fa8c16' }} />}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Charts Row */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {/* 7-day trend */}
                <Col xs={24} lg={16}>
                  <Card
                    size="small"
                    title={<Space><LineChartOutlined /> Xu hướng 7 ngày</Space>}
                  >
                    <Segmented
                      value="outpatients"
                      onChange={() => {}}
                      options={[
                        { label: 'Bệnh nhân', value: 'outpatients' },
                        { label: 'Doanh thu', value: 'revenue' },
                      ]}
                      size="small"
                      style={{ marginBottom: 12 }}
                    />
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Ngoại trú" stroke="#1890ff" fill="#e6f4ff" />
                        <Area type="monotone" dataKey="Nhập viện" stroke="#52c41a" fill="#f6ffed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Patient type pie */}
                <Col xs={24} lg={8}>
                  <Card
                    size="small"
                    title={<Space><PieChartOutlined /> Phân bổ đối tượng BN</Space>}
                  >
                    {patientTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={patientTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {patientTypeData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Không có dữ liệu" style={{ marginTop: 40 }} />
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Department stats */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={16}>
                  <Card size="small" title={<Space><BarChartOutlined /> Thống kê theo khoa/phòng</Space>}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={deptData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="Khám" fill="#1890ff" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Nhập" fill="#52c41a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Branch summary */}
                <Col xs={24} lg={8}>
                  <Card
                    size="small"
                    title={<Space><BankOutlined /> Tóm tắt chi nhánh</Space>}
                    extra={<Tag color="blue">{dashboard.subBranches?.length ?? 0} chi nhánh</Tag>}
                  >
                    {dashboard.subBranches && dashboard.subBranches.length > 0 ? (
                      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                        {(dashboard.subBranches as BranchSummary[])
                          .sort((a, b) => (b.outpatients + b.inpatients) - (a.outpatients + a.inpatients))
                          .map(br => {
                            const total = (br.outpatients || 0) + (br.inpatients || 0);
                            const pct = total > 0 ? Math.round((total / Math.max(dashboard.todayOutpatients + dashboard.todayAdmissions, 1)) * 100) : 0;
                            return (
                              <div key={br.branchId} style={{ marginBottom: 10 }}>
                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                  <Space>
                                    <Tag color={LEVEL_COLORS[br.branchLevel] ?? 'default'}>{br.branchCode}</Tag>
                                    <Text style={{ fontSize: 12 }}>{br.branchName}</Text>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{total} BN</Text>
                                </Space>
                                <Progress
                                  percent={pct}
                                  size="small"
                                  strokeColor={LEVEL_COLORS[br.branchLevel] ?? '#1890ff'}
                                  showInfo={false}
                                  style={{ marginTop: 3 }}
                                />
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <Empty description="Chưa có dữ liệu chi nhánh" />
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Sub-branches table */}
              <Card size="small" title={<Space><TeamOutlined /> Chi tiết theo chi nhánh</Space>}>
                <Table
                  columns={subBranchColumns}
                  dataSource={dashboard.subBranches}
                  rowKey="branchId"
                  size="small"
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: 700 }}
                />
              </Card>
            </div>
          )}

          {/* ======= TAB 2: Branch Tree ======= */}
          {activeTab === 'tree' && branchTree && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card size="small" title={<Space><MenuOutlined /> Cây chi nhánh (3 cấp)</Space>}>
                  <Tree
                    showTreeLine
                    defaultExpandAll
                    treeData={buildTreeData([branchTree])}
                    titleRender={(nodeData: any) => (
                      <Space>
                        {nodeData.key === branchTree.id ? (
                          <HomeOutlined style={{ color: '#1890ff' }} />
                        ) : nodeData.isLeaf ? (
                          <SafetyOutlined style={{ color: '#faad14' }} />
                        ) : (
                          <BankOutlined style={{ color: '#52c41a' }} />
                        )}
                        <Text>{nodeData.title}</Text>
                      </Space>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card size="small" title={<Space><UserSwitchOutlined /> Danh sách theo cấp</Space>}>
                  {(['Tỉnh/Thành phố', 'Huyện/Quận', 'Trạm Y tế'] as const).map(level => {
                    const items = branchesByLevel.filter(b => b.branchLevel === level);
                    return items.length > 0 ? (
                      <div key={level} style={{ marginBottom: 16 }}>
                        <Tag color={LEVEL_COLORS[level]} style={{ marginBottom: 8 }}>
                          {level} ({items.length})
                        </Tag>
                        {items.map(b => (
                          <Tag
                            key={b.id}
                            style={{ margin: '2px 4px', cursor: 'pointer' }}
                            onClick={() => setSelectedBranchId(b.id as any)}
                          >
                            {b.branchCode} - {b.branchName}
                          </Tag>
                        ))}
                      </div>
                    ) : null;
                  })}
                  {branchesByLevel.length === 0 && (
                    <Empty description="Chưa có dữ liệu chi nhánh" />
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* ======= TAB 3: Consolidated Report ======= */}
          {activeTab === 'report' && (
            <div>
              {/* Summary cards */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                  <Card size="small">
                    <Statistic title="Tổng bệnh nhân" value={totalPatients} prefix={<TeamOutlined />} />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small">
                    <Statistic title="Tổng lượt khám" value={totalVisits} prefix={<FileTextOutlined />} />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small">
                    <Statistic title="Tổng nhập viện" value={totalAdmissions} prefix={<PlusOutlined />} />
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Tổng doanh thu"
                      value={totalRevenue}
                      prefix={<DollarOutlined />}
                      formatter={v => formatCurrency(Number(v))}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Report table */}
              <Card size="small" title="Báo cáo theo chi nhánh">
                <Table
                  columns={reportColumns}
                  dataSource={consolidatedReport?.branchItems}
                  rowKey="branchId"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <Text strong>TỔNG CỘNG</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text strong>{totalPatients}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <Text strong>{totalVisits}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong>{totalAdmissions}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <Text strong>{formatCurrency(totalRevenue)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text strong>100%</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </Card>
            </div>
          )}

          {/* ======= TAB 4: Duty Roster ======= */}
          {activeTab === 'duty' && (
            <div>
              {/* Duty roster controls */}
              <Card size="small" style={{ marginBottom: 12 }}>
                <Space wrap>
                  <Select
                    value={dutyYear}
                    onChange={v => setDutyYear(v)}
                    style={{ width: 110 }}
                  >
                    {[2025, 2026, 2027].map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
                  </Select>
                  <Select
                    value={dutyMonth}
                    onChange={v => setDutyMonth(v)}
                    style={{ width: 110 }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <Select.Option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString('vi', { month: 'long' })}
                      </Select.Option>
                    ))}
                  </Select>
                  <Button icon={<ReloadOutlined />} onClick={() => loadDutyRoster(selectedBranchId || undefined, dutyYear, dutyMonth)}>
                    Làm mới
                  </Button>
                  {dutyRoster && (
                    <Tag color="blue">{dutyRoster.staffCount} nhân viên | {dutyRoster.totalShifts} ca trực</Tag>
                  )}
                </Space>
              </Card>

              <Row gutter={[12, 12]}>
                {/* Calendar heatmap */}
                <Col xs={24} lg={16}>
                  <Card size="small" title={<Space><ClockCircleOutlined /> Lịch trực tháng {new Date(dutyYear, dutyMonth - 1).toLocaleString('vi', { month: 'long', year: 'numeric' })}</Space>}>
                    {!dutyRoster || dutyRoster.shifts.length === 0 ? (
                      <Empty description="Chưa có lịch trực" />
                    ) : (
                      <>
                        {/* Staff summary cards */}
                        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                          {dutyRoster.staffSummary.slice(0, 6).map(s => (
                            <Col xs={24} sm={12} md={8} key={s.staffId}>
                              <Card size="small" style={{ background: '#fafafa' }}>
                                <Space direction="vertical" size={2}>
                                  <Text strong style={{ fontSize: 13 }}>{s.staffName}</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>{s.title} - {s.departmentName}</Text>
                                  <Space size={4}>
                                    <Tag color="blue">Sáng: {s.morningShifts}</Tag>
                                    <Tag color="green">Chiều: {s.afternoonShifts}</Tag>
                                    <Tag color="purple">Đêm: {s.nightShifts}</Tag>
                                  </Space>
                                </Space>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                        {/* Shift table by day */}
                        <Table
                          dataSource={Array.from(
                            { length: new Date(dutyYear, dutyMonth, 0).getDate() },
                            (_, i) => {
                              const day = i + 1;
                              const shiftsForDay = dutyRoster.shifts.filter(s => s.dayOfMonth === day);
                              const sgang = shiftsForDay.find(s => s.shiftType === 'Sang');
                              const chieu = shiftsForDay.find(s => s.shiftType === 'Chieu');
                              const dem = shiftsForDay.find(s => s.shiftType === 'Dem');
                              const dow = new Date(dutyYear, dutyMonth - 1, day).getDay();
                              return {
                                key: day,
                                day,
                                dow: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow],
                                sang: sgang ? `${sgang.staffName} (${sgang.title || ''})` : '-',
                                chieu: chieu ? `${chieu.staffName} (${chieu.title || ''})` : '-',
                                dem: dem ? `${dem.staffName} (${dem.title || ''})` : '-',
                              };
                            }
                          )}
                          columns={[
                            { title: 'Ngày', dataIndex: 'day', key: 'day', width: 60, align: 'center', render: d => <Text strong>{d}</Text> },
                            { title: 'Thứ', dataIndex: 'dow', key: 'dow', width: 50, align: 'center',
                              render: d => <Tag color={d === 'CN' ? 'red' : d === 'T7' ? 'orange' : 'default'}>{d}</Tag> },
                            { title: '☀ Sáng', dataIndex: 'sang', key: 'sang', render: t => t === '-' ? <Text type="secondary">-</Text> : <Text style={{ fontSize: 12 }}>{t}</Text> },
                            { title: '🌙 Chiều', dataIndex: 'chieu', key: 'chieu', render: t => t === '-' ? <Text type="secondary">-</Text> : <Text style={{ fontSize: 12 }}>{t}</Text> },
                            { title: '🌑 Đêm', dataIndex: 'dem', key: 'dem', render: t => t === '-' ? <Text type="secondary">-</Text> : <Text style={{ fontSize: 12 }}>{t}</Text> },
                          ]}
                          size="small"
                          pagination={{ pageSize: 15 }}
                          scroll={{ y: 400 }}
                        />
                      </>
                    )}
                  </Card>
                </Col>

                {/* Staff summary */}
                <Col xs={24} lg={8}>
                  <Card size="small" title={<Space><TeamOutlined /> Tổng hợp nhân viên ({dutyRoster?.staffCount || 0})</Space>}>
                    {dutyRoster && dutyRoster.staffSummary.length > 0 ? (
                      <Table
                        dataSource={dutyRoster.staffSummary}
                        rowKey="staffId"
                        size="small"
                        pagination={{ pageSize: 10 }}
                        columns={[
                          { title: 'Nhân viên', key: 'name',
                            render: (_, s: BranchStaffSummary) => (
                              <Space direction="vertical" size={0}>
                                <Text strong style={{ fontSize: 12 }}>{s.staffName}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{s.title}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{s.departmentName}</Text>
                              </Space>
                            )
                          },
                          { title: 'Sáng', dataIndex: 'morningShifts', key: 'morningShifts', width: 50, align: 'center',
                            render: v => <Tag color="blue">{v}</Tag> },
                          { title: 'Chiều', dataIndex: 'afternoonShifts', key: 'afternoonShifts', width: 50, align: 'center',
                            render: v => <Tag color="green">{v}</Tag> },
                          { title: 'Đêm', dataIndex: 'nightShifts', key: 'nightShifts', width: 50, align: 'center',
                            render: v => <Tag color="purple">{v}</Tag> },
                          { title: 'Tổng', dataIndex: 'totalShifts', key: 'totalShifts', width: 60, align: 'center',
                            render: v => <Text strong>{v}</Text> },
                        ]}
                      />
                    ) : (
                      <Empty description="Chưa có dữ liệu nhân viên trực" />
                    )}
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </>
      )}
    </div>
  );
}
