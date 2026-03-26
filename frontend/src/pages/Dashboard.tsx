import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message, Spin } from 'antd';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../api/system';
import dayjs from 'dayjs';

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

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`rounded-xl ${className || ''}`}
    style={{
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

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
/*  GlassCard wrapper                                                  */
/* ------------------------------------------------------------------ */

const GlassCard = ({ children, className, delay = 0, ...rest }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className={`relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${className || ''}`}
    {...rest}
  >
    {children}
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  KPI Card with animated gradient border                             */
/* ------------------------------------------------------------------ */

const KpiCard = ({ label, value, icon, gradient, glowColor, delay, isCurrency }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  delay: number;
  isCurrency?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className="relative group"
  >
    {/* Animated gradient border glow */}
    <div
      className={`absolute -inset-0.5 ${gradient} rounded-2xl opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-500`}
      style={{ backgroundSize: '200% 200%', animation: 'borderGlow 6s linear infinite' }}
    />
    {/* Glass card */}
    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${glowColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800">
        {isCurrency ? (
          <><NumberTicker value={value} duration={1200} /> <span className="text-lg font-normal text-gray-400">d</span></>
        ) : (
          <NumberTicker value={value} duration={1000} />
        )}
      </div>
    </div>
  </motion.div>
);

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
    { value: 'trend', label: 'Xu huong', icon: '\u{1F4C8}' },
    { value: 'dept', label: 'Theo khoa', icon: '\u{1F4CA}' },
    { value: 'pie', label: 'Phan bo', icon: '\u{1F4C0}' },
  ];

  /* ---------------------------------------------------------------- */
  /*  SVG Icons (unchanged)                                            */
  /* ---------------------------------------------------------------- */

  const icons = {
    user: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    alert: (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    group: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    currency: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    arrowUp: (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    arrowDown: (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    surgery: (
      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bed: (
      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    refresh: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    chartEmpty: (
      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    pieEmpty: (
      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    check: (
      <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  /* ---------------------------------------------------------------- */
  /*  Shimmer loading state                                            */
  /* ---------------------------------------------------------------- */

  if (loading && data.outpatientCount === 0) {
    return (
      <>
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
        <div className="min-h-screen p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[1,2,3,4].map(i => <Shimmer key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="h-16" />)}
          </div>
          <Shimmer className="h-80 mb-4" />
        </div>
      </>
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
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="relative min-h-screen">
        {/* Gradient Mesh Background */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'float 8s ease-in-out infinite' }} />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'float 8s ease-in-out infinite 2s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animation: 'float 8s ease-in-out infinite 4s' }} />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3"
        >
          <h2 className="text-xl font-bold text-gray-800">
            Tong quan hoat dong - {dayjs().format('DD/MM/YYYY')}
          </h2>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-sm text-gray-400">
                Cap nhat: {lastUpdate}
              </span>
            )}
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/80 backdrop-blur-sm border border-white/50 rounded-lg text-gray-600 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              {icons.refresh}
              Lam moi
            </button>
          </div>
        </motion.div>

        {/* Row 1: KPI Cards with Animated Glow Borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            label="Kham ngoai tru"
            value={data.outpatientCount}
            icon={icons.user}
            gradient="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-500"
            glowColor="bg-blue-100"
            delay={0}
          />
          <KpiCard
            label="Cap cuu"
            value={data.emergencyCount}
            icon={icons.alert}
            gradient="bg-gradient-to-r from-red-500 via-rose-400 to-pink-500"
            glowColor="bg-red-100"
            delay={0.1}
          />
          <KpiCard
            label="Noi tru hien tai"
            value={data.inpatientCount}
            icon={icons.group}
            gradient="bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500"
            glowColor="bg-amber-100"
            delay={0.2}
          />
          <KpiCard
            label="Doanh thu hom nay"
            value={data.totalRevenue}
            icon={icons.currency}
            gradient="bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500"
            glowColor="bg-emerald-100"
            delay={0.3}
            isCurrency
          />
        </div>

        {/* Row 2: Secondary Stats - Glassmorphism */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <GlassCard className="p-4" delay={0.15}>
            <div className="text-xs text-gray-400 mb-1">Nhap vien</div>
            <div className="flex items-center gap-2">
              {icons.arrowUp}
              <span className="text-xl font-bold text-gray-800"><NumberTicker value={data.admissionCount} /></span>
            </div>
          </GlassCard>
          <GlassCard className="p-4" delay={0.2}>
            <div className="text-xs text-gray-400 mb-1">Xuat vien</div>
            <div className="flex items-center gap-2">
              {icons.arrowDown}
              <span className="text-xl font-bold text-gray-800"><NumberTicker value={data.dischargeCount} /></span>
            </div>
          </GlassCard>
          <GlassCard className="p-4" delay={0.25}>
            <div className="text-xs text-gray-400 mb-1">Phau thuat</div>
            <div className="flex items-center gap-2">
              {icons.surgery}
              <span className="text-xl font-bold text-gray-800"><NumberTicker value={data.surgeryCount} /></span>
            </div>
          </GlassCard>
          <GlassCard className="p-4" delay={0.3}>
            <div className="text-xs text-gray-400 mb-1">Giuong trong</div>
            <div className="flex items-center gap-2">
              {icons.bed}
              <span className="text-xl font-bold text-gray-800"><NumberTicker value={data.availableBeds} /></span>
            </div>
          </GlassCard>
          {/* Patient Summary */}
          <GlassCard className="col-span-2 p-4" delay={0.35}>
            <div className="text-xs text-gray-400 mb-2">Tong hop BN</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span className="text-sm text-gray-600">Ngoai tru: <b className="text-gray-800"><NumberTicker value={data.outpatientCount} /></b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-sm text-gray-600">Cap cuu: <b className="text-gray-800"><NumberTicker value={data.emergencyCount} /></b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-sm text-gray-600">Noi tru: <b className="text-gray-800"><NumberTicker value={data.inpatientCount} /></b></span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Row 2.5: Service Status Cards - Horizontal scroll with snap */}
        <div className="flex gap-3 mb-6 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin">
          {data.serviceStatuses.map((svc, i) => (
            <motion.div
              key={svc.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className="snap-start min-w-[160px] flex-1 relative bg-white/80 backdrop-blur-xl rounded-2xl p-3.5 border border-white/50 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300"
              style={{ borderLeft: `3px solid ${svc.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{svc.emoji}</span>
                <span className="text-sm font-semibold text-gray-700">{svc.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  {icons.check}
                  <span className="text-xs text-gray-400">Xong: </span>
                  <span className="text-sm font-bold text-green-600"><NumberTicker value={svc.done} duration={800} /></span>
                </div>
                <div className="flex items-center gap-1">
                  {icons.clock}
                  <span className="text-xs text-gray-400">Cho: </span>
                  <span className="text-sm font-bold text-orange-600"><NumberTicker value={svc.pending} duration={800} /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Row 3: Charts + Sidebar - Bento grid 8/4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          {/* Main Chart Area - 8 cols */}
          <GlassCard className="lg:col-span-8" delay={0.2}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 pb-0 gap-3">
              <h3 className="text-base font-semibold text-gray-700">Bieu do hoat dong</h3>
              {/* Segmented Control - Pill Buttons with glow */}
              <div className="inline-flex bg-gray-100/80 backdrop-blur-sm rounded-xl p-1">
                {chartViewOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setChartView(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer ${
                      chartView === opt.value
                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div ref={mainChartRef} className="p-4" style={{ height: 300 }}>
              {!chartsReady ? (
                <div className="flex items-center justify-center h-full">
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
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    {icons.chartEmpty}
                    <span className="text-sm">Chua co du lieu xu huong 7 ngay</span>
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
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    {icons.chartEmpty}
                    <span className="text-sm">Chua co du lieu theo khoa</span>
                  </div>
                )
              ) : chartView === 'pie' ? (
                pieData.length > 0 ? (
                  <PieChart width={mainChartWidth - 32} height={270}>
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
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    {icons.pieEmpty}
                    <span className="text-sm">Chua co du lieu phan bo</span>
                  </div>
                )
              ) : null}
            </div>
          </GlassCard>

          {/* Right Sidebar - 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Patient Distribution Mini Pie */}
            <GlassCard className="p-4" delay={0.3}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Phan bo benh nhan</h3>
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
              ) : (
                <span className="text-sm text-gray-400">Chua co du lieu</span>
              )}
              <div className="mt-2 space-y-1.5">
                {pieData.map(d => (
                  <div key={d.name} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-800"><NumberTicker value={d.value} /></span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Today's Activity */}
            <GlassCard className="p-4" delay={0.35}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hoat dong hom nay</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Nhap vien', value: data.admissionCount, bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
                  { label: 'Xuat vien', value: data.dischargeCount, bgClass: 'bg-green-100', textClass: 'text-green-700' },
                  { label: 'Phau thuat', value: data.surgeryCount, bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
                  { label: 'Giuong trong', value: data.availableBeds, bgClass: 'bg-teal-100', textClass: 'text-teal-700' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center group/item hover:bg-gray-50/50 rounded-lg px-1 py-0.5 transition-colors">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.bgClass} ${item.textClass}`}>
                      <NumberTicker value={item.value} duration={600} />
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Revenue by Patient Type */}
            {chartsReady && data.revenueByPatientType.length > 0 && (
              <GlassCard className="p-4" delay={0.4}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Doanh thu theo doi tuong</h3>
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
                        formatter={(value: number | undefined, name?: string) => [`${(value ?? 0).toLocaleString('vi-VN')} d`, name ?? '']}
                      />
                    </PieChart>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1.5">
                  {data.revenueByPatientType.map(d => (
                    <div key={d.name} className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{Number(d.value).toLocaleString('vi-VN')} d</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Row 4: Department Breakdown - Bento 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outpatient by Department */}
          <GlassCard delay={0.25}>
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-gray-700">Kham benh theo khoa</h3>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {data.outpatientByDepartment.length > 0 ? (
                <div className="space-y-3">
                  {data.outpatientByDepartment
                    .sort((a, b) => b.count - a.count)
                    .map((item, i) => (
                    <motion.div
                      key={item.departmentName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03, duration: 0.3 }}
                      className="group/bar"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 truncate max-w-[70%]">{item.departmentName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{item.count} BN</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full group-hover/bar:from-blue-500 group-hover/bar:to-cyan-500 transition-colors duration-300"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((item.count / maxDeptCount) * 100)}%` }}
                          transition={{ delay: 0.4 + i * 0.03, duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Chua co du lieu</span>
              )}
            </div>
          </GlassCard>

          {/* Revenue by Department */}
          <GlassCard delay={0.3}>
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-gray-700">Doanh thu theo khoa</h3>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {data.revenueByDepartment.length > 0 ? (
                <div className="space-y-3">
                  {data.revenueByDepartment
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item, i) => (
                    <motion.div
                      key={item.departmentName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03, duration: 0.3 }}
                      className="group/bar"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 truncate max-w-[60%]">{item.departmentName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{Number(item.revenue).toLocaleString('vi-VN')} d</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-green-400 to-emerald-600 h-1.5 rounded-full group-hover/bar:from-emerald-500 group-hover/bar:to-teal-500 transition-colors duration-300"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((item.revenue / maxDeptRevenue) * 100)}%` }}
                          transition={{ delay: 0.4 + i * 0.03, duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Chua co du lieu</span>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </Spin>
  );
};

export default Dashboard;
