import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message, Spin, Card, Row, Col, Statistic, Tag, Progress, Badge, Button, Segmented, Space, Typography, Tooltip, Divider } from 'antd';
import {
  ReloadOutlined, UserOutlined, AlertOutlined, TeamOutlined, DollarOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ScissorOutlined, MedicineBoxOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../api/system';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

/* ------------------------------------------------------------------ */
/*  Inline helper components                                          */
/* ------------------------------------------------------------------ */

const NumberTicker = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display.toLocaleString('vi-VN')}</>;
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrendData {
  date: string;
  outpatients: number;
  admissions: number;
  revenue: number;
}

interface ServiceStatus {
  name: string;
  emoji: string;
  done: number;
  pending: number;
  color: string;
  bgColor: string;
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
  serviceStatuses: ServiceStatus[];
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

/* ------------------------------------------------------------------ */
/*  Glassmorphism style constants                                      */
/* ------------------------------------------------------------------ */

const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.5)',
};

const kpiGlassStyle: React.CSSProperties = {
  ...glassStyle,
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

/* ------------------------------------------------------------------ */
/*  Dashboard Component                                                */
/* ------------------------------------------------------------------ */

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [chartView, setChartView] = useState<string>('trend');
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
            { name: 'Kham benh', emoji: '\u{1F9D1}\u200D\u2695\uFE0F', done: d.opdCompleted ?? d.todayOutpatients ?? 0, pending: d.opdPending ?? Math.max(0, (d.todayOutpatients ?? 0) - (d.opdCompleted ?? 0)), color: '#1890ff', bgColor: 'bg-blue-50' },
            { name: 'CDHA', emoji: '\u{1FA7B}', done: d.radiologyCompleted ?? 0, pending: d.radiologyPending ?? 0, color: '#722ed1', bgColor: 'bg-purple-50' },
            { name: 'Xet nghiem', emoji: '\u{1F9EA}', done: d.labCompleted ?? 0, pending: d.labPending ?? 0, color: '#13c2c2', bgColor: 'bg-teal-50' },
            { name: 'Phau thuat', emoji: '\u{1FA78}', done: d.surgeryCompleted ?? d.todaySurgeries ?? 0, pending: d.surgeryPending ?? 0, color: '#eb2f96', bgColor: 'bg-pink-50' },
            { name: 'Thu thuat', emoji: '\u{1F48A}', done: d.procedureCompleted ?? 0, pending: d.procedurePending ?? 0, color: '#fa8c16', bgColor: 'bg-orange-50' },
            { name: 'Ke don', emoji: '\u{1F4CB}', done: d.prescriptionCompleted ?? 0, pending: d.prescriptionPending ?? 0, color: '#52c41a', bgColor: 'bg-green-50' },
          ],
          revenueByPatientType: [
            { name: 'BHYT', value: d.revenueBHYT ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.6), color: '#1890ff' },
            { name: 'Tu chi tra', value: d.revenueSelfPay ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.35), color: '#52c41a' },
            { name: 'Khac', value: d.revenueOther ?? Math.round((d.todayRevenue ?? d.totalRevenue ?? 0) * 0.05), color: '#faad14' },
          ].filter(r => r.value > 0),
        });
      }
      setLastUpdate(dayjs().format('HH:mm:ss'));
    } catch {
      console.warn('Error fetching dashboard');
      message.warning('Khong the tai du lieu tong quan');
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

  const pieData = useMemo(() => [
    { name: 'Ngoai tru', value: data.outpatientCount, color: '#1890ff' },
    { name: 'Cap cuu', value: data.emergencyCount, color: '#ff4d4f' },
    { name: 'Noi tru', value: data.inpatientCount, color: '#faad14' },
  ].filter(d => d.value > 0), [data.outpatientCount, data.emergencyCount, data.inpatientCount]);

  const deptBarData = useMemo(() => [...data.outpatientByDepartment]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(d => ({ name: d.departmentName.length > 12 ? d.departmentName.substring(0, 12) + '...' : d.departmentName, 'Benh nhan': d.count })),
    [data.outpatientByDepartment]);

  const chartViewOptions = [
    { value: 'trend', label: 'Xu huong' },
    { value: 'dept', label: 'Theo khoa' },
    { value: 'pie', label: 'Phan bo' },
  ];

  /* ---------------------------------------------------------------- */
  /*  KPI config                                                       */
  /* ---------------------------------------------------------------- */

  const kpiCards = [
    { label: 'Kham ngoai tru', value: data.outpatientCount, icon: <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />, gradient: 'linear-gradient(135deg, #1890ff, #36cfc9)', glowBg: '#e6f7ff' },
    { label: 'Cap cuu', value: data.emergencyCount, icon: <AlertOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />, gradient: 'linear-gradient(135deg, #ff4d4f, #ff85c0)', glowBg: '#fff1f0' },
    { label: 'Noi tru hien tai', value: data.inpatientCount, icon: <TeamOutlined style={{ fontSize: 20, color: '#faad14' }} />, gradient: 'linear-gradient(135deg, #faad14, #ffc53d)', glowBg: '#fffbe6' },
    { label: 'Doanh thu hom nay', value: data.totalRevenue, icon: <DollarOutlined style={{ fontSize: 20, color: '#52c41a' }} />, gradient: 'linear-gradient(135deg, #52c41a, #36cfc9)', glowBg: '#f6ffed', isCurrency: true },
  ];

  /* ---------------------------------------------------------------- */
  /*  Shimmer loading state                                            */
  /* ---------------------------------------------------------------- */

  if (loading && data.outpatientCount === 0) {
    return (
      <div style={{ padding: 4, minHeight: '100vh' }}>
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[1,2,3,4].map(i => (
            <Col span={6} key={i}>
              <div style={{ height: 112, borderRadius: 16, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            </Col>
          ))}
        </Row>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[1,2,3,4,5,6].map(i => (
            <Col span={4} key={i}>
              <div style={{ height: 64, borderRadius: 12, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            </Col>
          ))}
        </Row>
        <div style={{ height: 320, borderRadius: 16, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes borderGlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        .kpi-glow-wrapper {
          position: relative;
        }
        .kpi-glow-wrapper::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          opacity: 0.2;
          background-size: 200% 200%;
          animation: borderGlow 6s linear infinite;
          z-index: 0;
          transition: opacity 0.5s;
          pointer-events: none;
        }
        .kpi-glow-wrapper:hover::before {
          opacity: 0.4;
          filter: blur(4px);
        }
        .kpi-glow-wrapper .ant-card {
          position: relative;
          z-index: 1;
        }
        .svc-card .ant-card {
          transition: all 0.3s ease;
        }
        .svc-card:hover .ant-card {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          transform: translateY(-2px);
        }
        .dept-progress .ant-progress-text {
          font-size: 12px !important;
        }
      `}</style>

      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Gradient Mesh Background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: '#dbeafe', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '33%', right: '25%', width: 384, height: 384, background: '#e9d5ff', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite 2s' }} />
          <div style={{ position: 'absolute', bottom: '25%', left: '33%', width: 384, height: 384, background: '#cffafe', borderRadius: '50%', mixBlendMode: 'multiply', filter: 'blur(48px)', opacity: 0.3, animation: 'float 8s ease-in-out infinite 4s' }} />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Tong quan hoat dong - {dayjs().format('DD/MM/YYYY')}
              </Title>
            </Col>
            <Col>
              <Space>
                {lastUpdate && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Cap nhat: {lastUpdate}
                  </Text>
                )}
                <Button icon={<ReloadOutlined />} onClick={fetchDashboard}>
                  Lam moi
                </Button>
              </Space>
            </Col>
          </Row>
        </motion.div>

        {/* Row 1: KPI Cards with Animated Glow Borders */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {kpiCards.map((kpi, i) => (
            <Col xs={12} sm={12} lg={6} key={kpi.label}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                className="kpi-glow-wrapper"
                style={{ '--glow-gradient': kpi.gradient } as React.CSSProperties}
              >
                <style>{`
                  .kpi-glow-wrapper:nth-child(${i + 1})::before {
                    background: ${kpi.gradient};
                  }
                `}</style>
                <Card style={kpiGlassStyle} styles={{ body: { padding: 20 } }}>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>{kpi.label}</Text>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: kpi.glowBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {kpi.icon}
                    </div>
                  </Row>
                  <Statistic
                    value={kpi.value}
                    formatter={() => (
                      <span style={{ fontSize: 30, fontWeight: 700, color: '#1f2937' }}>
                        <NumberTicker value={kpi.value} duration={1200} />
                        {kpi.isCurrency && <span style={{ fontSize: 16, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>d</span>}
                      </span>
                    )}
                  />
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* Row 2: Secondary Stats */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6} lg={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
              <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Nhap vien</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <ArrowUpOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontSize: 20, fontWeight: 700 }}><NumberTicker value={data.admissionCount} /></span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Xuat vien</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <ArrowDownOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontSize: 20, fontWeight: 700 }}><NumberTicker value={data.dischargeCount} /></span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
              <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Phau thuat</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <ScissorOutlined style={{ color: '#722ed1' }} />
                  <span style={{ fontSize: 20, fontWeight: 700 }}><NumberTicker value={data.surgeryCount} /></span>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Giuong trong</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <MedicineBoxOutlined style={{ color: '#13c2c2' }} />
                  <span style={{ fontSize: 20, fontWeight: 700 }}><NumberTicker value={data.availableBeds} /></span>
                </div>
              </Card>
            </motion.div>
          </Col>
          {/* Patient Summary */}
          <Col xs={24} sm={12} lg={8}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
              <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Tong hop BN</Text>
                <Space size="large" wrap>
                  <Space size={6}>
                    <Badge status="processing" color="#1890ff" />
                    <Text style={{ fontSize: 13 }}>Ngoai tru: <b><NumberTicker value={data.outpatientCount} /></b></Text>
                  </Space>
                  <Space size={6}>
                    <Badge status="processing" color="#ff4d4f" />
                    <Text style={{ fontSize: 13 }}>Cap cuu: <b><NumberTicker value={data.emergencyCount} /></b></Text>
                  </Space>
                  <Space size={6}>
                    <Badge status="processing" color="#faad14" />
                    <Text style={{ fontSize: 13 }}>Noi tru: <b><NumberTicker value={data.inpatientCount} /></b></Text>
                  </Space>
                </Space>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Row 2.5: Service Status Cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          {data.serviceStatuses.map((svc, i) => (
            <Col xs={12} sm={8} lg={4} key={svc.name}>
              <motion.div
                className="svc-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              >
                <Card
                  style={{ ...glassStyle, borderLeft: `3px solid ${svc.color}` }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Space style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{svc.emoji}</span>
                    <Text strong style={{ fontSize: 13 }}>{svc.name}</Text>
                  </Space>
                  <Row justify="space-between" align="middle">
                    <Space size={4}>
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>Xong:</Text>
                      <Text strong style={{ color: '#52c41a', fontSize: 13 }}><NumberTicker value={svc.done} duration={800} /></Text>
                    </Space>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 13 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>Cho:</Text>
                      <Text strong style={{ color: '#fa8c16', fontSize: 13 }}><NumberTicker value={svc.pending} duration={800} /></Text>
                    </Space>
                  </Row>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* Row 3: Charts + Sidebar */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {/* Main Chart Area */}
          <Col xs={24} lg={16}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <Card
                style={glassStyle}
                title={
                  <Row justify="space-between" align="middle">
                    <Text strong style={{ fontSize: 15 }}>Bieu do hoat dong</Text>
                    <Segmented
                      value={chartView}
                      onChange={(val) => setChartView(val as string)}
                      options={chartViewOptions}
                      size="small"
                    />
                  </Row>
                }
                styles={{ header: { border: 'none', paddingBottom: 0 }, body: { padding: 16 } }}
              >
                <div ref={mainChartRef} style={{ height: 300 }}>
                  {!chartsReady ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Spin size="small" />
                    </div>
                  ) : mainChartWidth <= 0 ? null : chartView === 'trend' ? (
                    data.trends.length > 0 ? (
                      <AreaChart width={mainChartWidth - 32} height={270} data={data.trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12}
                          tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} />
                        <RechartsTooltip
                          formatter={(value: number | undefined, name?: string) => {
                            if (name === 'Doanh thu') return [`${(value ?? 0).toLocaleString('vi-VN')} d`, 'Doanh thu'];
                            return [value ?? 0, name ?? ''];
                          }}
                        />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="outpatients" name="Ngoai tru"
                          stroke="#1890ff" fill="#1890ff" fillOpacity={0.15} />
                        <Area yAxisId="left" type="monotone" dataKey="admissions" name="Nhap vien"
                          stroke="#faad14" fill="#faad14" fillOpacity={0.15} />
                        <Area yAxisId="right" type="monotone" dataKey="revenue" name="Doanh thu"
                          stroke="#52c41a" fill="#52c41a" fillOpacity={0.1} />
                      </AreaChart>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        <Text type="secondary">Chua co du lieu xu huong 7 ngay</Text>
                      </div>
                    )
                  ) : chartView === 'dept' ? (
                    deptBarData.length > 0 ? (
                      <BarChart width={mainChartWidth - 32} height={270} data={deptBarData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} angle={-25} textAnchor="end" />
                        <YAxis fontSize={12} />
                        <RechartsTooltip />
                        <Bar dataKey="Benh nhan" radius={[4, 4, 0, 0]}>
                          {deptBarData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        <Text type="secondary">Chua co du lieu theo khoa</Text>
                      </div>
                    )
                  ) : (
                    pieData.length > 0 ? (
                      <PieChart width={mainChartWidth - 32} height={270}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        <Text type="secondary">Chua co du lieu phan bo</Text>
                      </div>
                    )
                  )}
                </div>
              </Card>
            </motion.div>
          </Col>

          {/* Sidebar */}
          <Col xs={24} lg={8}>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              {/* Mini PieChart - Patient Distribution */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
                <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                  <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>Phan bo benh nhan</Text>
                  <div ref={patientPieRef}>
                    {patientPieWidth > 0 && pieData.length > 0 ? (
                      <PieChart width={patientPieWidth - 32} height={160}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`mp-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    ) : (
                      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary">Khong co du lieu</Text>
                      </div>
                    )}
                  </div>
                  <Space wrap style={{ marginTop: 8 }}>
                    {pieData.map(p => (
                      <Tag key={p.name} color={p.color} style={{ margin: 0 }}>{p.name}: {p.value}</Tag>
                    ))}
                  </Space>
                </Card>
              </motion.div>

              {/* Today's Activity Summary */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
                <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                  <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>Hoat dong hom nay</Text>
                  <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                    <Row justify="space-between">
                      <Text type="secondary"><ArrowUpOutlined style={{ color: '#1890ff', marginRight: 6 }} />Nhap vien</Text>
                      <Text strong><NumberTicker value={data.admissionCount} /></Text>
                    </Row>
                    <Row justify="space-between">
                      <Text type="secondary"><ArrowDownOutlined style={{ color: '#52c41a', marginRight: 6 }} />Xuat vien</Text>
                      <Text strong><NumberTicker value={data.dischargeCount} /></Text>
                    </Row>
                    <Row justify="space-between">
                      <Text type="secondary"><ScissorOutlined style={{ color: '#722ed1', marginRight: 6 }} />Phau thuat</Text>
                      <Text strong><NumberTicker value={data.surgeryCount} /></Text>
                    </Row>
                    <Row justify="space-between">
                      <Text type="secondary"><MedicineBoxOutlined style={{ color: '#13c2c2', marginRight: 6 }} />Giuong trong</Text>
                      <Text strong><NumberTicker value={data.availableBeds} /></Text>
                    </Row>
                  </Space>
                </Card>
              </motion.div>

              {/* Revenue by Patient Type */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                <Card style={glassStyle} styles={{ body: { padding: 16 } }}>
                  <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>Doanh thu theo doi tuong</Text>
                  <div ref={revenuePieRef}>
                    {revenuePieWidth > 0 && data.revenueByPatientType.length > 0 ? (
                      <PieChart width={revenuePieWidth - 32} height={140}>
                        <Pie
                          data={data.revenueByPatientType}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.revenueByPatientType.map((entry, idx) => (
                            <Cell key={`rp-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => `${v.toLocaleString('vi-VN')} d`} />
                      </PieChart>
                    ) : (
                      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary">Khong co du lieu</Text>
                      </div>
                    )}
                  </div>
                  <Space wrap style={{ marginTop: 8 }}>
                    {data.revenueByPatientType.map(r => (
                      <Tag key={r.name} color={r.color} style={{ margin: 0 }}>{r.name}: {r.value.toLocaleString('vi-VN')} d</Tag>
                    ))}
                  </Space>
                </Card>
              </motion.div>
            </Space>
          </Col>
        </Row>

        {/* Row 4: Department breakdown */}
        <Row gutter={[16, 16]}>
          {/* Outpatient by Department */}
          <Col xs={24} lg={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
              <Card
                style={glassStyle}
                title={<Text strong style={{ fontSize: 14 }}>Kham benh theo khoa</Text>}
                styles={{ header: { border: 'none' }, body: { padding: '8px 24px 24px' } }}
              >
                {data.outpatientByDepartment.length > 0 ? (
                  <Space orientation="vertical" size={10} style={{ width: '100%' }} className="dept-progress">
                    {[...data.outpatientByDepartment]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 8)
                      .map((dept, i) => (
                        <div key={dept.departmentName}>
                          <Row justify="space-between" style={{ marginBottom: 2 }}>
                            <Text style={{ fontSize: 13 }}>{dept.departmentName}</Text>
                            <Text strong style={{ fontSize: 13 }}>{dept.count}</Text>
                          </Row>
                          <Progress
                            percent={Math.round((dept.count / maxDeptCount) * 100)}
                            showInfo={false}
                            strokeColor={CHART_COLORS[i % CHART_COLORS.length]}
                            size="small"
                          />
                        </div>
                      ))}
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Text type="secondary">Chua co du lieu</Text>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>

          {/* Revenue by Department */}
          <Col xs={24} lg={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
              <Card
                style={glassStyle}
                title={<Text strong style={{ fontSize: 14 }}>Doanh thu theo khoa</Text>}
                styles={{ header: { border: 'none' }, body: { padding: '8px 24px 24px' } }}
              >
                {data.revenueByDepartment.length > 0 ? (
                  <Space orientation="vertical" size={10} style={{ width: '100%' }} className="dept-progress">
                    {[...data.revenueByDepartment]
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 8)
                      .map((dept, i) => (
                        <div key={dept.departmentName}>
                          <Row justify="space-between" style={{ marginBottom: 2 }}>
                            <Text style={{ fontSize: 13 }}>{dept.departmentName}</Text>
                            <Tooltip title={`${dept.revenue.toLocaleString('vi-VN')} d`}>
                              <Text strong style={{ fontSize: 13 }}>{(dept.revenue / 1000000).toFixed(1)}tr</Text>
                            </Tooltip>
                          </Row>
                          <Progress
                            percent={Math.round((dept.revenue / maxDeptRevenue) * 100)}
                            showInfo={false}
                            strokeColor={CHART_COLORS[i % CHART_COLORS.length]}
                            size="small"
                          />
                        </div>
                      ))}
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Text type="secondary">Chua co du lieu</Text>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
