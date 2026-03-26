import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message, Spin } from 'antd';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../api/system';
import dayjs from 'dayjs';

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

  return (
    <Spin spinning={loading}>
      <div className="min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Lam moi
            </button>
          </div>
        </div>

        {/* Row 1: Main KPI Cards with Gradients */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Outpatient */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-100">Kham ngoai tru</span>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold">{data.outpatientCount}</div>
          </div>

          {/* Emergency */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-red-100">Cap cuu</span>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold">{data.emergencyCount}</div>
          </div>

          {/* Inpatient */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-amber-100">Noi tru hien tai</span>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold">{data.inpatientCount}</div>
          </div>

          {/* Revenue */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-emerald-100">Doanh thu hom nay</span>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold">{Number(data.totalRevenue).toLocaleString('vi-VN')} <span className="text-lg font-normal text-emerald-100">d</span></div>
          </div>
        </div>

        {/* Row 2: Secondary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">Nhap vien</div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-xl font-bold text-gray-800">{data.admissionCount}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">Xuat vien</div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xl font-bold text-gray-800">{data.dischargeCount}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">Phau thuat</div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold text-gray-800">{data.surgeryCount}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">Giuong trong</div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xl font-bold text-gray-800">{data.availableBeds}</span>
            </div>
          </div>
          {/* Patient Summary */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-2">Tong hop BN</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span className="text-sm text-gray-600">Ngoai tru: <b className="text-gray-800">{data.outpatientCount}</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-sm text-gray-600">Cap cuu: <b className="text-gray-800">{data.emergencyCount}</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-sm text-gray-600">Noi tru: <b className="text-gray-800">{data.inpatientCount}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2.5: Service Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {data.serviceStatuses.map((svc) => (
            <div
              key={svc.name}
              className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow duration-200"
              style={{ borderLeft: `3px solid ${svc.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{svc.emoji}</span>
                <span className="text-sm font-semibold text-gray-700">{svc.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-gray-400">Xong: </span>
                  <span className="text-sm font-bold text-green-600">{svc.done}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-gray-400">Cho: </span>
                  <span className="text-sm font-bold text-orange-600">{svc.pending}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 3: Charts + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Main Chart Area - 2/3 */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 pb-0 gap-3">
              <h3 className="text-base font-semibold text-gray-700">Bieu do hoat dong</h3>
              {/* Segmented Control - Pill Buttons */}
              <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                {chartViewOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setChartView(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                      chartView === opt.value
                        ? 'bg-white text-blue-600 shadow-sm'
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
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
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
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
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
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span className="text-sm">Chua co du lieu phan bo</span>
                  </div>
                )
              ) : null}
            </div>
          </div>

          {/* Right Sidebar - 1/3 */}
          <div className="flex flex-col gap-4">
            {/* Patient Distribution Mini Pie */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
                    <span className="text-sm font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hoat dong hom nay</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Nhap vien</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{data.admissionCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Xuat vien</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{data.dischargeCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Phau thuat</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{data.surgeryCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Giuong trong</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">{data.availableBeds}</span>
                </div>
              </div>
            </div>

            {/* Revenue by Patient Type */}
            {chartsReady && data.revenueByPatientType.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Department Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outpatient by Department */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-gray-700">Kham benh theo khoa</h3>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {data.outpatientByDepartment.length > 0 ? (
                <div className="space-y-3">
                  {data.outpatientByDepartment
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                    <div key={item.departmentName}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 truncate max-w-[70%]">{item.departmentName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{item.count} BN</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((item.count / maxDeptCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Chua co du lieu</span>
              )}
            </div>
          </div>

          {/* Revenue by Department */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-gray-700">Doanh thu theo khoa</h3>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {data.revenueByDepartment.length > 0 ? (
                <div className="space-y-3">
                  {data.revenueByDepartment
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item) => (
                    <div key={item.departmentName}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 truncate max-w-[60%]">{item.departmentName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{Number(item.revenue).toLocaleString('vi-VN')} d</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((item.revenue / maxDeptRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Chua co du lieu</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Spin>
  );
};

export default Dashboard;
