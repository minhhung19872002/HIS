import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Tag, message, Progress, Badge, Button, Segmented, Empty } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  AlertOutlined,
  ScissorOutlined,
  ReloadOutlined,
  HomeOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../api/system';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TrendData {
  date: string;
  outpatients: number;
  admissions: number;
  revenue: number;
}

interface ServiceStatus {
  name: string;
  icon: React.ReactNode;
  done: number;
  pending: number;
  color: string;
}

interface DashboardData {
  outpatientCount: number;
  inpatientCount: number;
  emergencyCount: number;
  surgeryCount: number;
  admissionCount: number;
  dischargeCount: number;
  availableBeds: number;
  totalRevenue: number;
  trends: TrendData[];
  outpatientByDepartment: { departmentName: string; count: number }[];
  revenueByDepartment: { departmentName: string; revenue: number }[];
  // Service status
  serviceStatuses: ServiceStatus[];
  // Revenue by patient type
  revenueByPatientType: { name: string; value: number; color: string }[];
}

type TrendPoint = {
  date?: string;
  outpatients?: number;
  admissions?: number;
  revenue?: number;
};

type DashboardApiExtras = {
  trends?: TrendPoint[];
  todayOutpatients?: number;
  currentInpatients?: number;
  todayEmergencies?: number;
  todaySurgeries?: number;
  todayAdmissions?: number;
  todayDischarges?: number;
  availableBeds?: number;
  todayRevenue?: number;
  opdCompleted?: number;
  opdPending?: number;
  radiologyCompleted?: number;
  radiologyPending?: number;
  labCompleted?: number;
  labPending?: number;
  surgeryCompleted?: number;
  surgeryPending?: number;
  procedureCompleted?: number;
  procedurePending?: number;
  prescriptionCompleted?: number;
  prescriptionPending?: number;
  revenueBHYT?: number;
  revenueSelfPay?: number;
  revenueOther?: number;
};

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [chartView, setChartView] = useState<string | number>('trend');
  const [chartsReady, setChartsReady] = useState(false);
  const mainChartRef = useRef<HTMLDivElement | null>(null);
  const patientPieRef = useRef<HTMLDivElement | null>(null);
  const revenuePieRef = useRef<HTMLDivElement | null>(null);
  const [mainChartWidth, setMainChartWidth] = useState(0);
  const [patientPieWidth, setPatientPieWidth] = useState(0);
  const [revenuePieWidth, setRevenuePieWidth] = useState(0);
  const [data, setData] = useState<DashboardData>({
    outpatientCount: 0, inpatientCount: 0, emergencyCount: 0, surgeryCount: 0,
    admissionCount: 0, dischargeCount: 0, availableBeds: 0, totalRevenue: 0,
    trends: [], outpatientByDepartment: [], revenueByDepartment: [],
    serviceStatuses: [], revenueByPatientType: [],
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, deptRes] = await Promise.allSettled([
        statisticsApi.getHospitalDashboard(),
        statisticsApi.getDepartmentStatistics(dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
      ]);

      const d = dashRes.status === 'fulfilled' ? (dashRes.value.data as HospitalDashboardDto & DashboardApiExtras) : null;
      const depts = deptRes.status === 'fulfilled' ? ((deptRes.value.data as DepartmentStatisticsDto[]) ?? []) : [];

      if (d) {
        const rawTrends = Array.isArray(d.trends) ? d.trends : [];
        setData({
          outpatientCount: d.todayOutpatients ?? d.outpatientCount ?? 0,
          inpatientCount: d.currentInpatients ?? d.inpatientCount ?? 0,
          emergencyCount: d.todayEmergencies ?? d.emergencyCount ?? 0,
          surgeryCount: d.todaySurgeries ?? d.surgeryCount ?? 0,
          admissionCount: d.todayAdmissions ?? d.admissionCount ?? 0,
          dischargeCount: d.todayDischarges ?? d.dischargeCount ?? 0,
          availableBeds: d.availableBeds ?? 0,
          totalRevenue: d.todayRevenue ?? d.totalRevenue ?? 0,
          trends: rawTrends.map((t: TrendPoint) => ({
            date: dayjs(t.date).format('DD/MM'),
            outpatients: t.outpatients ?? 0,
            admissions: t.admissions ?? 0,
            revenue: t.revenue ?? 0,
          })),
          outpatientByDepartment: Array.isArray(depts)
            ? depts.map((dep) => ({ departmentName: dep.departmentName ?? 'N/A', count: dep.outpatientCount ?? 0 })).filter((dept) => dept.count > 0)
            : d.outpatientByDepartment ?? [],
          revenueByDepartment: Array.isArray(depts)
            ? depts.map((dep) => ({ departmentName: dep.departmentName ?? 'N/A', revenue: dep.totalRevenue ?? 0 })).filter((dept) => dept.revenue > 0)
            : d.revenueByDepartment ?? [],
          serviceStatuses: [
            { name: 'Khám bệnh', icon: <UserOutlined />, done: d.opdCompleted ?? d.todayOutpatients ?? 0, pending: d.opdPending ?? Math.max(0, (d.todayOutpatients ?? 0) - (d.opdCompleted ?? 0)), color: '#1890ff' },
            { name: 'CĐHA', icon: <ExperimentOutlined />, done: d.radiologyCompleted ?? 0, pending: d.radiologyPending ?? 0, color: '#722ed1' },
            { name: 'Xét nghiệm', icon: <ExperimentOutlined />, done: d.labCompleted ?? 0, pending: d.labPending ?? 0, color: '#13c2c2' },
            { name: 'Phẫu thuật', icon: <ScissorOutlined />, done: d.surgeryCompleted ?? d.todaySurgeries ?? 0, pending: d.surgeryPending ?? 0, color: '#eb2f96' },
            { name: 'Thủ thuật', icon: <MedicineBoxOutlined />, done: d.procedureCompleted ?? 0, pending: d.procedurePending ?? 0, color: '#fa8c16' },
            { name: 'Kê đơn', icon: <FileTextOutlined />, done: d.prescriptionCompleted ?? 0, pending: d.prescriptionPending ?? 0, color: '#52c41a' },
          ],
          revenueByPatientType: [
            { name: 'BHYT', value: d.revenueBHYT ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.6), color: '#1890ff' },
            { name: 'Tự chi trả', value: d.revenueSelfPay ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.35), color: '#52c41a' },
            { name: 'Khác', value: d.revenueOther ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.05), color: '#faad14' },
          ].filter(r => r.value > 0),
        });
      }
      setLastUpdate(dayjs().format('HH:mm:ss'));
    } catch {
      console.warn('Error fetching dashboard');
      message.warning('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateWidths = () => {
      setMainChartWidth(mainChartRef.current?.clientWidth ?? 0);
      setPatientPieWidth(patientPieRef.current?.clientWidth ?? 0);
      setRevenuePieWidth(revenuePieRef.current?.clientWidth ?? 0);
    };

    updateWidths();

    const observer = new ResizeObserver(updateWidths);
    if (mainChartRef.current) observer.observe(mainChartRef.current);
    if (patientPieRef.current) observer.observe(patientPieRef.current);
    if (revenuePieRef.current) observer.observe(revenuePieRef.current);
    window.addEventListener('resize', updateWidths);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidths);
    };
  }, []);

  const maxDeptCount = Math.max(...data.outpatientByDepartment.map(d => d.count), 1);
  const maxDeptRevenue = Math.max(...data.revenueByDepartment.map(d => d.revenue), 1);

  // Memoize chart data to avoid re-computation on every render
  const pieData = useMemo(() => [
    { name: 'Ngoại trú', value: data.outpatientCount, color: '#1890ff' },
    { name: 'Cấp cứu', value: data.emergencyCount, color: '#ff4d4f' },
    { name: 'Nội trú', value: data.inpatientCount, color: '#faad14' },
  ].filter(d => d.value > 0), [data.outpatientCount, data.emergencyCount, data.inpatientCount]);

  const deptBarData = useMemo(() => [...data.outpatientByDepartment]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(d => ({ name: d.departmentName.length > 12 ? d.departmentName.substring(0, 12) + '...' : d.departmentName, 'Bệnh nhân': d.count })),
    [data.outpatientByDepartment]);

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Tổng quan hoạt động - {dayjs().format('DD/MM/YYYY')}</Title>
          <div>
            {lastUpdate && <Text type="secondary" style={{ marginRight: 12 }}>Cập nhật: {lastUpdate}</Text>}
            <Button icon={<ReloadOutlined />} size="small" onClick={fetchDashboard}>Làm mới</Button>
          </div>
        </div>

        {/* Row 1: Main KPIs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Khám ngoại trú"
                value={data.outpatientCount}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Cấp cứu"
                value={data.emergencyCount}
                prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Nội trú hiện tại"
                value={data.inpatientCount}
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Doanh thu hôm nay"
                value={data.totalRevenue}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                suffix="₫"
              />
            </Card>
          </Col>
        </Row>

        {/* Row 2: Secondary stats */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Nhập viện" value={data.admissionCount} prefix={<ArrowUpOutlined style={{ color: '#1890ff' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Xuất viện" value={data.dischargeCount} prefix={<ArrowDownOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Phẫu thuật" value={data.surgeryCount} prefix={<ScissorOutlined style={{ color: '#722ed1' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small">
              <Statistic title="Giường trống" value={data.availableBeds} prefix={<HomeOutlined style={{ color: '#13c2c2' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" title="Tổng hợp BN" style={{ height: '100%' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Badge status="processing" text={<Text>Ngoại trú: <b>{data.outpatientCount}</b></Text>} />
                <Badge status="error" text={<Text>Cấp cứu: <b>{data.emergencyCount}</b></Text>} />
                <Badge status="warning" text={<Text>Nội trú: <b>{data.inpatientCount}</b></Text>} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 2.5: Service Status mini cards */}
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {data.serviceStatuses.map((svc) => (
            <Col xs={12} sm={8} lg={4} key={svc.name}>
              <Card size="small" hoverable style={{ borderLeft: `3px solid ${svc.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: svc.color, fontSize: 18 }}>{svc.icon}</span>
                  <Text strong style={{ fontSize: 13 }}>{svc.name}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Xong: </Text>
                    <Text strong style={{ color: '#52c41a' }}>{svc.done}</Text>
                  </div>
                  <div>
                    <ClockCircleOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Chờ: </Text>
                    <Text strong style={{ color: '#fa8c16' }}>{svc.pending}</Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Row 3: Charts */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card
              size="small"
              title="Biểu đồ hoạt động"
              extra={
                <Segmented
                  size="small"
                  value={chartView}
                  onChange={setChartView}
                  options={[
                    { value: 'trend', icon: <LineChartOutlined />, label: 'Xu hướng' },
                    { value: 'dept', icon: <BarChartOutlined />, label: 'Theo khoa' },
                    { value: 'pie', icon: <PieChartOutlined />, label: 'Phân bố' },
                  ]}
                />
              }
            >
              <div ref={mainChartRef} style={{ height: 300 }}>
                {!chartsReady ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Spin size="small" />
                  </div>
                ) : mainChartWidth <= 0 ? null : chartView === 'trend' ? (
                  data.trends.length > 0 ? (
                    <AreaChart width={mainChartWidth} height={300} data={data.trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12}
                          tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} />
                        <RechartsTooltip
                          formatter={(value: number | undefined, name?: string) => {
                            if (name === 'Doanh thu') return [`${(value ?? 0).toLocaleString('vi-VN')} ₫`, 'Doanh thu'];
                            return [value ?? 0, name ?? ''];
                          }}
                        />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="outpatients" name="Ngoại trú"
                          stroke="#1890ff" fill="#1890ff" fillOpacity={0.15} />
                        <Area yAxisId="left" type="monotone" dataKey="admissions" name="Nhập viện"
                          stroke="#faad14" fill="#faad14" fillOpacity={0.15} />
                        <Area yAxisId="right" type="monotone" dataKey="revenue" name="Doanh thu"
                          stroke="#52c41a" fill="#52c41a" fillOpacity={0.1} />
                    </AreaChart>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Empty description="Chưa có dữ liệu xu hướng 7 ngày" />
                    </div>
                  )
                ) : chartView === 'dept' ? (
                  deptBarData.length > 0 ? (
                    <BarChart width={mainChartWidth} height={300} data={deptBarData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} angle={-25} textAnchor="end" />
                        <YAxis fontSize={12} />
                        <RechartsTooltip />
                        <Bar dataKey="Bệnh nhân" radius={[4, 4, 0, 0]}>
                          {deptBarData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                    </BarChart>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Empty description="Chưa có dữ liệu theo khoa" />
                    </div>
                  )
                ) : chartView === 'pie' ? (
                  pieData.length > 0 ? (
                    <PieChart width={mainChartWidth} height={300}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                    </PieChart>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Empty description="Chưa có dữ liệu phân bố" />
                    </div>
                  )
                ) : null}
              </div>
            </Card>
          </Col>

          {/* Right sidebar: Quick stats pie */}
          <Col xs={24} lg={8}>
            <Card size="small" title="Phân bố bệnh nhân" style={{ marginBottom: 16 }}>
              {chartsReady && pieData.length > 0 ? (
                <div ref={patientPieRef} style={{ height: 120 }}>
                  {patientPieWidth > 0 ? (
                    <PieChart width={patientPieWidth} height={120}>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={`mini-${i}`} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  ) : null}
                </div>
              ) : <Text type="secondary">Chưa có dữ liệu</Text>}
              <div style={{ marginTop: 8 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: d.color, marginRight: 6 }} />{d.name}</Text>
                    <Text strong>{d.value}</Text>
                  </div>
                ))}
              </div>
            </Card>
            <Card size="small" title="Hoạt động hôm nay">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Nhập viện</Text><Tag color="blue">{data.admissionCount}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Xuất viện</Text><Tag color="green">{data.dischargeCount}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Phẫu thuật</Text><Tag color="purple">{data.surgeryCount}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Giường trống</Text><Tag color="cyan">{data.availableBeds}</Tag>
                </div>
              </div>
            </Card>
            {chartsReady && data.revenueByPatientType.length > 0 && (
              <Card size="small" title="Doanh thu theo đối tượng" style={{ marginTop: 16 }}>
                <div ref={revenuePieRef} style={{ height: 130 }}>
                  {revenuePieWidth > 0 ? (
                    <PieChart width={revenuePieWidth} height={130}>
                      <Pie
                        data={data.revenueByPatientType}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {data.revenueByPatientType.map((entry, i) => (
                          <Cell key={`rev-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number | undefined, name?: string) => [`${(value ?? 0).toLocaleString('vi-VN')} ?`, name ?? '']}
                      />
                    </PieChart>
                  ) : null}
                </div>
                <div style={{ marginTop: 8 }}>
                  {data.revenueByPatientType.map(d => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: d.color, marginRight: 6 }} />
                        {d.name}
                      </Text>
                      <Text strong>{Number(d.value).toLocaleString('vi-VN')} ₫</Text>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Col>
        </Row>

        {/* Row 4: Department breakdown */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="Khám bệnh theo khoa" size="small" styles={{ body: { maxHeight: 350, overflowY: 'auto' } }}>
              {data.outpatientByDepartment.length > 0 ? (
                <div>
                  {data.outpatientByDepartment
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                    <div key={item.departmentName} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text ellipsis style={{ maxWidth: '70%' }}>{item.departmentName}</Text>
                        <Tag color="blue">{item.count} BN</Tag>
                      </div>
                      <Progress
                        percent={Math.round((item.count / maxDeptCount) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor="#1890ff"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu</Text>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Doanh thu theo khoa" size="small" styles={{ body: { maxHeight: 350, overflowY: 'auto' } }}>
              {data.revenueByDepartment.length > 0 ? (
                <div>
                  {data.revenueByDepartment
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item) => (
                    <div key={item.departmentName} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text ellipsis style={{ maxWidth: '60%' }}>{item.departmentName}</Text>
                        <Tag color="green">{Number(item.revenue).toLocaleString('vi-VN')} ₫</Tag>
                      </div>
                      <Progress
                        percent={Math.round((item.revenue / maxDeptRevenue) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor="#52c41a"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu</Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;

