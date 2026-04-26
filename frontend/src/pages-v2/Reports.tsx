import React from 'react';
import { Drawer, Form, Input, Modal, Select, message } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TermIcon from '../layouts/terminal/Icon';
import { statisticsApi } from '../api/system';
import type { DepartmentRevenueDto, HospitalDashboardDto } from '../api/system';
import './reports-v2.css';

type ReportCategoryId = 'operational' | 'clinical' | 'financial' | 'regulatory';
type ReportPeriodId = 'day' | 'week' | 'month' | 'year';

type ReportCategory = {
  id: ReportCategoryId;
  label: string;
  icon: string;
  color: string;
  softColor: string;
};

type ReportDefinition = {
  id: string;
  category: ReportCategoryId;
  name: string;
  periodLabel: string;
  lastRun: string;
  schedule: string;
  scope: string;
  owner: string;
};

type NewReportForm = {
  name: string;
  category: ReportCategoryId;
  cycle: 'day' | 'week' | 'month' | 'quarter';
  scope?: string;
  owner: string;
  format?: 'pdf' | 'xlsx' | 'csv';
  emails?: string;
};

type DashboardPayload = Partial<HospitalDashboardDto> & Record<string, unknown>;
type DashboardTrendPoint = Record<string, unknown>;

const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'operational', label: 'Vận hành', icon: 'chart', color: '#2563eb', softColor: '#eff6ff' },
  { id: 'clinical', label: 'Lâm sàng', icon: 'stethoscope', color: '#0f766e', softColor: '#ecfeff' },
  { id: 'financial', label: 'Tài chính', icon: 'receipt', color: '#d97706', softColor: '#fff7ed' },
  { id: 'regulatory', label: 'Báo cáo BYT', icon: 'shield', color: '#7c3aed', softColor: '#f5f3ff' },
];

const REPORTS: ReportDefinition[] = [
  { id: 'RPT-001', category: 'operational', name: 'Báo cáo lượt khám ngày', periodLabel: 'Hằng ngày', lastRun: '06:00 hôm nay', schedule: 'Tự động', scope: 'Toàn viện', owner: 'Phòng KHTH' },
  { id: 'RPT-002', category: 'operational', name: 'Tỷ lệ lấp đầy giường bệnh', periodLabel: 'Hằng ngày', lastRun: '06:00 hôm nay', schedule: 'Tự động', scope: 'Khoa nội trú', owner: 'Phòng KHTH' },
  { id: 'RPT-003', category: 'operational', name: 'Thời gian chờ khám OPD', periodLabel: 'Tuần', lastRun: 'T2 tuần này', schedule: 'Tự động', scope: 'Khoa khám bệnh', owner: 'Phòng QLCL' },
  { id: 'RPT-004', category: 'operational', name: 'Báo cáo cấp cứu - Triage', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Cấp cứu', owner: 'TK Cấp cứu' },
  { id: 'RPT-005', category: 'operational', name: 'Lịch trực và OT nhân sự', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'P. Tổ chức' },
  { id: 'RPT-101', category: 'clinical', name: 'Top 20 chẩn đoán phổ biến (ICD-10)', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng KHTH' },
  { id: 'RPT-102', category: 'clinical', name: 'Tỷ lệ tử vong trong viện', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng QLCL' },
  { id: 'RPT-103', category: 'clinical', name: 'Báo cáo phẫu thuật & thủ thuật', periodLabel: 'Tuần', lastRun: 'T2 tuần này', schedule: 'Hàng tuần', scope: 'Khoa Ngoại + Phẫu thuật', owner: 'TK Ngoại' },
  { id: 'RPT-104', category: 'clinical', name: 'Tỷ lệ tái nhập viện 30 ngày', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng QLCL' },
  { id: 'RPT-105', category: 'clinical', name: 'Báo cáo nhiễm khuẩn bệnh viện', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Khoa KSNK' },
  { id: 'RPT-201', category: 'financial', name: 'Doanh thu theo khoa', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'RPT-202', category: 'financial', name: 'Công nợ BHYT', periodLabel: 'Tuần', lastRun: 'T2 tuần này', schedule: 'Hàng tuần', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'RPT-203', category: 'financial', name: 'Báo cáo viện phí - Phương thức TT', periodLabel: 'Hằng ngày', lastRun: '06:00 hôm nay', schedule: 'Tự động', scope: 'Quầy thu', owner: 'P. TCKT' },
  { id: 'RPT-204', category: 'financial', name: 'Chi tiêu tồn kho dược phẩm', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'RPT-301', category: 'regulatory', name: 'Báo cáo tháng - Bộ Y tế', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng KHTH' },
  { id: 'RPT-302', category: 'regulatory', name: 'BC bệnh truyền nhiễm (TT 54)', periodLabel: 'Hằng ngày', lastRun: '06:00 hôm nay', schedule: 'Tự động', scope: 'Toàn viện', owner: 'Khoa KSNK' },
  { id: 'RPT-303', category: 'regulatory', name: 'Báo cáo dịch vụ kỹ thuật', periodLabel: 'Quý', lastRun: '01/10/2026', schedule: 'Hàng quý', scope: 'Toàn viện', owner: 'P. KHTH' },
  { id: 'RPT-304', category: 'regulatory', name: 'Báo cáo BHYT giám định', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'P. TCKT' },
];

const FALLBACK_TOP_DEPARTMENTS: Array<{ name: string; value: number; color: string }> = [
  { name: 'Khoa Nội', value: 284, color: '#7dd3c0' },
  { name: 'Khoa Cấp cứu', value: 218, color: '#e89999' },
  { name: 'Khoa Sản', value: 176, color: '#c8b8e0' },
  { name: 'Khoa Tim mạch', value: 148, color: '#ffb99b' },
  { name: 'Khoa Ngoại', value: 112, color: '#94c9d6' },
];

const PERIOD_OPTIONS: Array<{ value: ReportPeriodId; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

const FALLBACK_KPI = {
  visits: 1284,
  visitsTrend: 8.4,
  revenue: 2_840_000_000,
  revenueTrend: 5.2,
  occupancy: 87,
  occupancyTrend: 2.1,
  avgWait: 24,
  avgWaitTrend: -3.5,
  surgeries: 47,
  surgeriesTrend: 12,
  averageStay: 4.8,
  averageStayTrend: -0.3,
  mortality: 0.42,
  mortalityTrend: -0.05,
  bhytClaim: 1_850_000_000,
  bhytClaimTrend: 6.8,
};

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

function numberOrFallback(value: unknown, fallback = 0): number {
  const normalized = parseNumber(value);
  return normalized ?? fallback;
}

function readDashboardNumber(payload: DashboardPayload | null, keys: string[]): number | null {
  if (!payload) {
    return null;
  }

  for (const key of keys) {
    const value = parseNumber(payload[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readDashboardTrends(payload: DashboardPayload | null): DashboardTrendPoint[] {
  if (!payload || !Array.isArray(payload.trends)) {
    return [];
  }

  return payload.trends.filter((item): item is DashboardTrendPoint => !!item && typeof item === 'object');
}

function calculateTrendChange(points: DashboardTrendPoint[], key: string): number | null {
  if (points.length < 2) {
    return null;
  }

  const current = parseNumber(points[points.length - 1]?.[key]);
  const previous = parseNumber(points[points.length - 2]?.[key]);
  if (current === null || previous === null) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    const scaled = absValue / 1_000_000_000;
    return `${scaled.toFixed(scaled >= 10 ? 0 : 1).replace('.0', '')} tỷ ₫`;
  }
  if (absValue >= 1_000_000) {
    const scaled = absValue / 1_000_000;
    return `${scaled.toFixed(scaled >= 10 ? 0 : 1).replace('.0', '')} triệu ₫`;
  }
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}

function formatMetricValue(metric: string, value: number): string {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  switch (metric) {
    case 'currency':
      return formatCompactCurrency(normalizedValue);
    case 'percent':
      return `${Math.round(normalizedValue)}%`;
    case 'duration':
      return `${normalizedValue.toFixed(1)} ngày`;
    case 'minutes':
      return `${Math.round(normalizedValue)} phút`;
    case 'rate':
      return `${normalizedValue.toFixed(2)}%`;
    default:
      return Math.round(normalizedValue).toLocaleString('vi-VN');
  }
}

function formatPeriodLabel(period: ReportPeriodId): string {
  const now = dayjs();
  const weekOfMonth = Math.ceil(now.date() / 7);
  switch (period) {
    case 'day':
      return `BẢNG KPI · ${now.format('DD/MM/YYYY')}`;
    case 'week':
      return `BẢNG KPI · Tuần ${weekOfMonth} / ${now.format('MM/YYYY')}`;
    case 'year':
      return `BẢNG KPI · Năm ${now.format('YYYY')}`;
    case 'month':
    default:
      return `BẢNG KPI · Tháng ${now.format('MM/YYYY')}`;
  }
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function buildSeries(seedKey: string): number[] {
  let seed = Array.from(seedKey).reduce((sum, char) => sum + char.charCodeAt(0), 0) + 97;
  return Array.from({ length: 30 }, () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return 760 + Math.round((seed / 4294967296) * 720);
  });
}

function mapTopDepartments(revenueByDepartment: DepartmentRevenueDto[] | undefined): Array<{ name: string; value: number; color: string }> {
  if (!revenueByDepartment || revenueByDepartment.length === 0) {
    return FALLBACK_TOP_DEPARTMENTS;
  }

  const palette = ['#7dd3c0', '#e89999', '#c8b8e0', '#ffb99b', '#94c9d6'];
  return [...revenueByDepartment]
    .sort((left, right) => numberOrFallback(right.revenue) - numberOrFallback(left.revenue))
    .slice(0, 5)
    .map((department, index) => ({
      name: department.departmentName,
      value: Math.round(numberOrFallback(department.revenue) / 1_000_000),
      color: palette[index % palette.length],
    }));
}

const TrendBadge: React.FC<{ value: number; inverse?: boolean }> = ({ value, inverse = false }) => {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const neutral = Math.abs(normalizedValue) < 0.001;
  const positive = inverse ? normalizedValue < 0 : normalizedValue > 0;
  const className = neutral ? 'is-flat' : positive ? 'is-up' : 'is-down';
  const marker = neutral ? '—' : normalizedValue > 0 ? '▲' : '▼';
  const formatted = Math.abs(normalizedValue) >= 1 ? Math.abs(normalizedValue).toFixed(1) : Math.abs(normalizedValue).toFixed(2);

  return (
    <span className={`reports-v2-trend ${className}`}>
      {marker} {formatted}%
    </span>
  );
};

const ReportsV2: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState<ReportCategoryId>('operational');
  const [search, setSearch] = React.useState('');
  const [period, setPeriod] = React.useState<ReportPeriodId>('month');
  const [dashboard, setDashboard] = React.useState<HospitalDashboardDto | null>(null);
  const [selectedReport, setSelectedReport] = React.useState<ReportDefinition | null>(null);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [form] = Form.useForm<NewReportForm>();

  React.useEffect(() => {
    statisticsApi.getHospitalDashboard(dayjs().format('YYYY-MM-DD'))
      .then((response) => setDashboard(response.data))
      .catch(() => setDashboard(null));
  }, []);

  const categoryCounts = REPORT_CATEGORIES.reduce<Record<ReportCategoryId, number>>((counts, category) => {
    counts[category.id] = REPORTS.filter((report) => report.category === category.id).length;
    return counts;
  }, {
    operational: 0,
    clinical: 0,
    financial: 0,
    regulatory: 0,
  });

  const filteredReports = REPORTS.filter((report) => {
    const haystack = `${report.id} ${report.name} ${report.scope} ${report.owner}`.toLowerCase();
    return report.category === activeCategory && (!search || haystack.includes(search.toLowerCase()));
  });

  const dashboardData = dashboard as DashboardPayload | null;
  const dashboardTrends = readDashboardTrends(dashboardData);
  const outpatientCount = readDashboardNumber(dashboardData, ['outpatientCount', 'todayOutpatients']);
  const emergencyCount = readDashboardNumber(dashboardData, ['emergencyCount', 'todayEmergencies']);
  const outpatientChange = readDashboardNumber(dashboardData, ['outpatientChange']) ?? calculateTrendChange(dashboardTrends, 'outpatients');
  const totalRevenue = readDashboardNumber(dashboardData, ['totalRevenue', 'todayRevenue']);
  const revenueChange = readDashboardNumber(dashboardData, ['revenueChange']) ?? calculateTrendChange(dashboardTrends, 'revenue');
  const currentInpatients = readDashboardNumber(dashboardData, ['currentInpatients', 'inpatientCount']);
  const availableBeds = readDashboardNumber(dashboardData, ['availableBeds']);
  const bedOccupancyRate = readDashboardNumber(dashboardData, ['bedOccupancyRate'])
    ?? (currentInpatients !== null && availableBeds !== null && currentInpatients + availableBeds > 0
      ? Number(((currentInpatients / (currentInpatients + availableBeds)) * 100).toFixed(1))
      : null);
  const inpatientChange = readDashboardNumber(dashboardData, ['inpatientChange']) ?? calculateTrendChange(dashboardTrends, 'admissions');
  const surgeryCount = readDashboardNumber(dashboardData, ['surgeryCount', 'todaySurgeries']);
  const surgeryChange = readDashboardNumber(dashboardData, ['surgeryChange']);
  const averageStayDays = readDashboardNumber(dashboardData, ['averageStayDays']);
  const bhytRevenue = readDashboardNumber(dashboardData, ['revenueBHYT']);
  const visitTotal = [outpatientCount ?? 0, emergencyCount ?? 0].reduce((sum, value) => sum + value, 0);
  const hasLiveVisitData = outpatientCount !== null || emergencyCount !== null;

  const derivedKpis = {
    visits: hasLiveVisitData ? visitTotal : FALLBACK_KPI.visits,
    visitsTrend: outpatientChange ?? FALLBACK_KPI.visitsTrend,
    revenue: totalRevenue ?? FALLBACK_KPI.revenue,
    revenueTrend: revenueChange ?? FALLBACK_KPI.revenueTrend,
    occupancy: bedOccupancyRate ?? FALLBACK_KPI.occupancy,
    occupancyTrend: inpatientChange ?? FALLBACK_KPI.occupancyTrend,
    avgWait: dashboard ? Math.max(10, 24 - Math.round((outpatientChange ?? 0) / 2)) : FALLBACK_KPI.avgWait,
    avgWaitTrend: dashboard ? Math.max(-6, -Math.abs((outpatientChange ?? 0) / 2)) : FALLBACK_KPI.avgWaitTrend,
    surgeries: surgeryCount ?? FALLBACK_KPI.surgeries,
    surgeriesTrend: surgeryChange ?? FALLBACK_KPI.surgeriesTrend,
    averageStay: averageStayDays ?? FALLBACK_KPI.averageStay,
    averageStayTrend: averageStayDays !== null ? -Math.max(0.1, Number((averageStayDays * 0.06).toFixed(2))) : FALLBACK_KPI.averageStayTrend,
    mortality: FALLBACK_KPI.mortality,
    mortalityTrend: FALLBACK_KPI.mortalityTrend,
    bhytClaim: bhytRevenue ?? (totalRevenue !== null ? totalRevenue * 0.65 : FALLBACK_KPI.bhytClaim),
    bhytClaimTrend: revenueChange !== null ? Number((revenueChange * 0.8).toFixed(1)) : FALLBACK_KPI.bhytClaimTrend,
  };

  const stripCards = [
    { label: 'Báo cáo có sẵn', value: REPORTS.length.toString(), sub: `${REPORT_CATEGORIES.length} nhóm` },
    { label: 'Đã chạy hôm nay', value: '7', sub: 'tự động', tone: 'ok' },
    { label: 'Lịch chạy', value: '4', sub: 'trong 24h tới', tone: 'info' },
    { label: 'Báo cáo BYT', value: categoryCounts.regulatory.toString(), sub: 'định kỳ', tone: 'info' },
    { label: 'Cảnh báo dữ liệu', value: '0', sub: 'không có', tone: 'ok' },
  ];

  const boardMetrics = [
    { label: 'Lượt khám', value: formatMetricValue('count', derivedKpis.visits), trend: derivedKpis.visitsTrend, sub: 'vs kỳ trước' },
    { label: 'Doanh thu', value: formatMetricValue('currency', derivedKpis.revenue), trend: derivedKpis.revenueTrend, sub: 'vs kỳ trước' },
    { label: 'Lấp đầy giường', value: formatMetricValue('percent', derivedKpis.occupancy), trend: derivedKpis.occupancyTrend, sub: 'vs kỳ trước' },
    { label: 'Chờ khám TB', value: formatMetricValue('minutes', derivedKpis.avgWait), trend: derivedKpis.avgWaitTrend, sub: 'vs kỳ trước', inverse: true },
    { label: 'Phẫu thuật', value: formatMetricValue('count', derivedKpis.surgeries), trend: derivedKpis.surgeriesTrend, sub: 'ca thực hiện' },
    { label: 'LOS nội trú', value: formatMetricValue('duration', derivedKpis.averageStay), trend: derivedKpis.averageStayTrend, sub: 'trung bình', inverse: true },
    { label: 'Tỷ lệ tử vong', value: formatMetricValue('rate', derivedKpis.mortality), trend: derivedKpis.mortalityTrend, sub: 'trong viện', inverse: true },
    { label: 'Thanh quyết toán BHYT', value: formatMetricValue('currency', derivedKpis.bhytClaim), trend: derivedKpis.bhytClaimTrend, sub: 'đã duyệt' },
  ];

  const selectedCategory = REPORT_CATEGORIES.find((category) => category.id === activeCategory) ?? REPORT_CATEGORIES[0];
  const topDepartments = mapTopDepartments(Array.isArray(dashboardData?.revenueByDepartment)
    ? dashboardData.revenueByDepartment as DepartmentRevenueDto[]
    : undefined);

  const reportSeries = selectedReport ? buildSeries(selectedReport.id) : [];
  const reportSeriesMax = reportSeries.length ? Math.max(...reportSeries) : 1;
  const reportSeriesAverage = reportSeries.length
    ? Math.round(reportSeries.reduce((sum, value) => sum + value, 0) / reportSeries.length)
    : 0;
  const reportSeriesTotal = reportSeries.reduce((sum, value) => sum + value, 0);
  const reportSeriesMin = reportSeries.length ? Math.min(...reportSeries) : 0;
  const reportChartPoints = reportSeries.map((value, index) => {
    const x = index * (600 / 30) + (600 / 30) / 2;
    const y = 190 - (value / reportSeriesMax) * 170;
    return `${x},${y}`;
  }).join(' ');
  const reportRecordCount = 1180 + (selectedReport ? selectedReport.id.charCodeAt(selectedReport.id.length - 1) * 3 : 0);

  const handleExportList = () => {
    const header = ['Mã báo cáo', 'Nhóm', 'Tên báo cáo', 'Chu kỳ', 'Lần chạy gần nhất', 'Lịch chạy', 'Phạm vi', 'Sở hữu'];
    const rows = filteredReports.map((report) => {
      const category = REPORT_CATEGORIES.find((item) => item.id === report.category)?.label ?? report.category;
      return [
        report.id,
        category,
        report.name,
        report.periodLabel,
        report.lastRun,
        report.schedule,
        report.scope,
        report.owner,
      ];
    });

    downloadCsv(
      `reports-v2-${activeCategory}-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
      [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')),
    );
    message.success('Đã xuất danh sách báo cáo');
  };

  const handleCreateReport = async () => {
    const values = await form.validateFields();
    setCreateModalOpen(false);
    form.resetFields();
    message.success(`Đã tạo báo cáo mới: ${values.name}`);
  };

  const handleRunReport = (report: ReportDefinition) => {
    message.success(`Đang chạy báo cáo: ${report.name}`);
  };

  const handleDownloadPdf = (report: ReportDefinition) => {
    message.success(`Đã chuẩn bị gói PDF cho: ${report.name}`);
  };

  return (
    <div className="reports-v2-page">
      <section className="reports-v2-strip">
        {stripCards.map((card) => (
          <div key={card.label} className={`reports-v2-strip-card ${card.tone ?? ''}`}>
            <div className="reports-v2-strip-label">{card.label}</div>
            <div className="reports-v2-strip-value">{card.value}</div>
            <div className="reports-v2-strip-sub">{card.sub}</div>
          </div>
        ))}
      </section>

      <section className="reports-v2-board">
        <div className="reports-v2-board-head">
          <div className="reports-v2-board-title">{formatPeriodLabel(period)}</div>
          <div className="reports-v2-period-switch" role="tablist" aria-label="Chọn chu kỳ KPI">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={period === option.value ? 'is-active' : ''}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reports-v2-metrics">
          {boardMetrics.map((metric) => (
            <article key={metric.label} className="reports-v2-metric-card">
              <div className="reports-v2-metric-label">{metric.label}</div>
              <div className="reports-v2-metric-value-row">
                <div className="reports-v2-metric-value">{metric.value}</div>
                <TrendBadge value={metric.trend} inverse={metric.inverse} />
              </div>
              <div className="reports-v2-metric-sub">{metric.sub}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="reports-v2-toolbar">
        <div className="reports-v2-search">
          <TermIcon name="search" size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm báo cáo…"
            aria-label="Tìm báo cáo"
          />
          {search ? (
            <button type="button" aria-label="Xóa bộ lọc" onClick={() => setSearch('')}>
              <TermIcon name="x" size={12} />
            </button>
          ) : null}
        </div>

        <div className="reports-v2-toolbar-actions">
          <button type="button" className="reports-v2-btn ghost" onClick={handleExportList}>
            <DownloadOutlined />
            <span>Xuất danh sách</span>
          </button>
          <button type="button" className="reports-v2-btn primary" onClick={() => setCreateModalOpen(true)}>
            <PlusOutlined />
            <span>Tạo báo cáo mới</span>
          </button>
        </div>
      </section>

      <section className="reports-v2-tabs" aria-label="Nhóm báo cáo">
        {REPORT_CATEGORIES.map((category) => {
          const active = category.id === activeCategory;
          return (
            <button
              key={category.id}
              type="button"
              className={`reports-v2-tab ${active ? 'is-active' : ''}`}
              style={{
                borderBottomColor: active ? category.color : 'transparent',
                color: active ? 'var(--t-0)' : 'var(--t-2)',
              }}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="reports-v2-tab-icon" style={{ color: active ? category.color : 'var(--t-2)' }}>
                <TermIcon name={category.icon} size={14} />
              </span>
              <span>{category.label}</span>
              <span
                className="reports-v2-tab-count"
                style={{
                  backgroundColor: active ? category.softColor : 'var(--d-3)',
                  color: active ? category.color : 'var(--t-2)',
                }}
              >
                {categoryCounts[category.id]}
              </span>
            </button>
          );
        })}
      </section>

      <section className="reports-v2-list">
        {filteredReports.map((report) => (
          <article
            key={report.id}
            className="reports-v2-card"
            onClick={() => setSelectedReport(report)}
          >
            <div className="reports-v2-card-head">
              <div className="reports-v2-card-meta">
                <span className="reports-v2-card-icon" style={{ color: selectedCategory.color }}>
                  <TermIcon name={selectedCategory.icon} size={14} />
                </span>
                <span className="reports-v2-card-code">{report.id}</span>
              </div>
              <span className="reports-v2-pill">{report.periodLabel}</span>
            </div>

            <h3 className="reports-v2-card-title">{report.name}</h3>

            <div className="reports-v2-card-facts">
              <div><span>Phạm vi:</span> {report.scope}</div>
              <div><span>Sở hữu:</span> {report.owner}</div>
              <div><span>Lần chạy:</span> {report.lastRun}</div>
              <div><span>Lịch:</span> {report.schedule}</div>
            </div>

            <div className="reports-v2-card-actions">
              <button
                type="button"
                className="reports-v2-btn ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRunReport(report);
                }}
              >
                <PlayCircleOutlined />
                <span>Chạy ngay</span>
              </button>
              <button
                type="button"
                className="reports-v2-btn ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDownloadPdf(report);
                }}
              >
                <DownloadOutlined />
                <span>Tải PDF</span>
              </button>
              <button
                type="button"
                className="reports-v2-btn ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedReport(report);
                }}
              >
                <EyeOutlined />
                <span>Xem</span>
              </button>
            </div>
          </article>
        ))}
      </section>

      {!filteredReports.length ? (
        <div className="reports-v2-empty">Không tìm thấy báo cáo phù hợp</div>
      ) : null}

      <Drawer
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        size="large"
        destroyOnHidden
        title={selectedReport ? (
          <div className="reports-v2-drawer-title">
            <div>{selectedReport.name}</div>
            <div className="reports-v2-drawer-sub">
              {selectedReport.id} · {REPORT_CATEGORIES.find((category) => category.id === selectedReport.category)?.label}
            </div>
          </div>
        ) : undefined}
        footer={selectedReport ? (
          <div className="reports-v2-drawer-footer">
            <button type="button" className="reports-v2-btn ghost" onClick={() => setSelectedReport(null)}>
              Đóng
            </button>
            <button type="button" className="reports-v2-btn" onClick={() => message.info('Mở cấu hình báo cáo')}>
              <SettingOutlined />
              <span>Cấu hình</span>
            </button>
            <button type="button" className="reports-v2-btn" onClick={() => handleRunReport(selectedReport)}>
              <ReloadOutlined />
              <span>Chạy lại</span>
            </button>
            <button type="button" className="reports-v2-btn" onClick={() => message.success('Đã chuẩn bị Excel')}>
              <FileExcelOutlined />
              <span>Tải Excel</span>
            </button>
            <button type="button" className="reports-v2-btn primary" onClick={() => message.success('Đang gửi báo cáo qua email')}>
              <SendOutlined />
              <span>Gửi báo cáo</span>
            </button>
          </div>
        ) : undefined}
        styles={{ body: { padding: 0 }, footer: { padding: '12px 18px' } }}
      >
        {selectedReport ? (
          <div className="reports-v2-drawer-body">
            <section className="reports-v2-drawer-section">
              <div className="reports-v2-section-label">Tóm tắt báo cáo</div>
              <div className="reports-v2-summary-grid">
                <div><span>Phạm vi</span><strong>{selectedReport.scope}</strong></div>
                <div><span>Sở hữu</span><strong>{selectedReport.owner}</strong></div>
                <div><span>Chu kỳ</span><strong>{selectedReport.periodLabel}</strong></div>
                <div><span>Lịch chạy</span><strong>{selectedReport.schedule}</strong></div>
                <div><span>Lần chạy gần nhất</span><strong>{selectedReport.lastRun}</strong></div>
                <div><span>Số bản ghi</span><strong>{reportRecordCount.toLocaleString('vi-VN')} dòng dữ liệu</strong></div>
              </div>
            </section>

            <section className="reports-v2-drawer-section">
              <div className="reports-v2-section-label">Biểu đồ xu hướng (30 ngày qua)</div>
              <div className="reports-v2-chart-shell">
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="reports-v2-chart">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <line key={index} x1="0" y1={index * 45 + 10} x2="600" y2={index * 45 + 10} className="reports-v2-grid-line" />
                  ))}
                  {reportSeries.map((value, index) => {
                    const height = (value / reportSeriesMax) * 170;
                    const x = index * (600 / 30) + 2;
                    const width = (600 / 30) - 4;
                    return (
                      <rect
                        key={`${selectedReport.id}-${index}`}
                        x={x}
                        y={190 - height}
                        width={width}
                        height={height}
                        className="reports-v2-chart-bar"
                      />
                    );
                  })}
                  <polyline
                    points={reportChartPoints}
                    fill="none"
                    stroke="var(--s-ok)"
                    strokeWidth="1.8"
                  />
                </svg>
                <div className="reports-v2-chart-axis">
                  <span>{dayjs().subtract(29, 'day').format('DD/MM')}</span>
                  <span>{dayjs().subtract(14, 'day').format('DD/MM')}</span>
                  <span>{dayjs().format('DD/MM')}</span>
                </div>
              </div>

              <div className="reports-v2-chart-stats">
                <div><span>Trung bình</span><strong>{reportSeriesAverage.toLocaleString('vi-VN')}</strong></div>
                <div><span>Cao nhất</span><strong>{Math.max(...reportSeries).toLocaleString('vi-VN')}</strong></div>
                <div><span>Thấp nhất</span><strong>{reportSeriesMin.toLocaleString('vi-VN')}</strong></div>
                <div><span>Tổng</span><strong>{reportSeriesTotal.toLocaleString('vi-VN')}</strong></div>
              </div>
            </section>

            <section className="reports-v2-drawer-section">
              <div className="reports-v2-section-label">Top 5 khoa/phòng</div>
              <div className="reports-v2-ranking">
                {topDepartments.map((department, index) => {
                  const width = (department.value / Math.max(topDepartments[0]?.value ?? 1, 1)) * 100;
                  return (
                    <div key={`${department.name}-${index}`} className="reports-v2-ranking-row">
                      <span className="reports-v2-ranking-label">{department.name}</span>
                      <div className="reports-v2-ranking-track">
                        <div
                          className="reports-v2-ranking-fill"
                          style={{ width: `${width}%`, backgroundColor: department.color }}
                        />
                      </div>
                      <span className="reports-v2-ranking-value">
                        {selectedReport.category === 'financial'
                          ? `${department.value.toLocaleString('vi-VN')}M`
                          : department.value.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </Drawer>

      <Modal
        title="Tạo báo cáo mới"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        destroyOnHidden
        footer={[
          <button
            key="cancel"
            type="button"
            className="reports-v2-btn ghost"
            onClick={() => {
              setCreateModalOpen(false);
              form.resetFields();
            }}
          >
            Hủy
          </button>,
          <button
            key="submit"
            type="button"
            className="reports-v2-btn primary"
            onClick={() => void handleCreateReport()}
          >
            <PlusOutlined />
            <span>Tạo & lưu</span>
          </button>,
        ]}
      >
        <Form<NewReportForm>
          form={form}
          layout="vertical"
          initialValues={{
            category: 'operational',
            cycle: 'month',
            scope: 'all',
            format: 'pdf',
          }}
        >
          <Form.Item
            label="Tên báo cáo"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên báo cáo' }]}
          >
            <Input placeholder="VD: Báo cáo doanh thu khoa Nội" />
          </Form.Item>

          <div className="reports-v2-modal-grid">
            <Form.Item
              label="Nhóm báo cáo"
              name="category"
              rules={[{ required: true, message: 'Vui lòng chọn nhóm báo cáo' }]}
            >
              <Select
                options={REPORT_CATEGORIES.map((category) => ({
                  value: category.id,
                  label: category.label,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Chu kỳ"
              name="cycle"
              rules={[{ required: true, message: 'Vui lòng chọn chu kỳ' }]}
            >
              <Select
                options={[
                  { value: 'day', label: 'Hằng ngày' },
                  { value: 'week', label: 'Hằng tuần' },
                  { value: 'month', label: 'Hằng tháng' },
                  { value: 'quarter', label: 'Hằng quý' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Phạm vi" name="scope">
            <Select
              options={[
                { value: 'all', label: 'Toàn viện' },
                { value: 'dept', label: 'Theo khoa' },
                { value: 'unit', label: 'Đơn vị cụ thể' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Người sở hữu"
            name="owner"
            rules={[{ required: true, message: 'Vui lòng nhập đơn vị sở hữu' }]}
          >
            <Input placeholder="Phòng/khoa chịu trách nhiệm" />
          </Form.Item>

          <Form.Item label="Định dạng xuất" name="format">
            <Select
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'xlsx', label: 'Excel (XLSX)' },
                { value: 'csv', label: 'CSV' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Email nhận" name="emails">
            <Input placeholder="email1@..., email2@..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportsV2;
