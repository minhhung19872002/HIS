import React from 'react';
import * as file from '../../../services/file.service';
import { App as AntdApp, Drawer, Form, Input, Modal, Select, Switch, Tooltip } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  PlayCircleOutlined,
  PrinterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { financeApi, statisticsApi } from '../../system/api/system';
import type { DepartmentRevenueDto, HospitalDashboardDto } from '../../system/api/system';
import apiClient from '../../../services/apiClient';
import {
  deleteScheduledReport, getKPIDashboard, getReportHistory, getScheduledReports, runScheduledReportNow, saveScheduledReport,
} from '../api/reporting';
import type { KPIDashboardDto, ReportHistoryDto, ScheduledReportConfigDto } from '../api/reporting';
import { getWaitingPhaseAnalysis } from '../../reception/api/reception';
import ReportsHospitalTab from './ReportsHospitalTab';
import ReportBuilderTab from './ReportBuilderTab';
import '../../../styles/reports-v2.css';

type ReportCategoryId = 'operational' | 'clinical' | 'financial' | 'regulatory' | 'level6' | 'cost' | 'admin' | 'pharmacy';
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
  /** Legacy catalog text — NOT shown (real last run / schedule come from report history + scheduled configs). */
  lastRun: string;
  schedule: string;
  scope: string;
  owner: string;
};

// QA-R11: the "Tạo báo cáo mới" modal only toasted "chưa được triển khai" and "Cấu hình" / "Gửi báo cáo" were
// permanently disabled, although /reporting/scheduled (save / delete / run-now + e-mail) exists. One modal now edits
// the delivery config (SystemConfigs "ScheduledReport_*") of a report card.
type ScheduleForm = {
  reportCode: string;
  schedule: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  format: 'Excel' | 'PDF';
  recipients?: string;
  isActive: boolean;
};

const SCHEDULE_OPTIONS: Array<{ value: ScheduleForm['schedule']; label: string }> = [
  { value: 'Daily', label: 'Hằng ngày (hôm nay)' },
  { value: 'Weekly', label: 'Hằng tuần (7 ngày gần nhất)' },
  { value: 'Monthly', label: 'Hằng tháng (từ đầu tháng)' },
  { value: 'Quarterly', label: 'Hằng quý (từ đầu quý)' },
  { value: 'Yearly', label: 'Hằng năm (từ đầu năm)' },
];
const scheduleLabel = (s?: string) =>
  SCHEDULE_OPTIONS.find((o) => o.value.toLowerCase() === (s ?? '').toLowerCase())?.label.replace(/ \(.*\)$/, '') ?? (s || 'Thủ công');

/**
 * QA-R11: cards whose code has no data source in the export map (BE ReportingCompleteService.Export.cs ReportCodeMap /
 * HospitalReportService) — every "Tải PDF / Excel / In" answered 400 "chưa có nguồn dữ liệu". Shown as such instead.
 */
const NO_SOURCE_REPORTS = new Set([
  'RPT-004', 'RPT-005', 'RPT-104', 'RPT-105', 'RPT-302',
  'bhyt-16', 'bhyt-17', 'bhyt-18', 'pharma-bc-cong-tac', 'pharma-tieu-hao-bdm',
]);
const NO_SOURCE_HINT = 'Chưa có nguồn dữ liệu cho báo cáo này';

type DashboardPayload = Partial<HospitalDashboardDto> & Record<string, unknown>;
type DashboardTrendPoint = Record<string, unknown>;

const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'operational', label: 'Vận hành',       icon: 'chart',      color: 'var(--a-cy)',   softColor: 'var(--s-info-soft)' },
  { id: 'clinical',   label: 'Lâm sàng',        icon: 'stethoscope', color: '#0f766e',      softColor: '#ecfeff' },
  { id: 'financial',  label: 'Tài chính',        icon: 'receipt',    color: 'var(--s-warn)', softColor: 'var(--a-or-bg)' },
  { id: 'regulatory', label: 'Báo cáo BYT',     icon: 'shield',     color: 'var(--s-mag)',  softColor: 'var(--s-mag-bg)' },
  { id: 'level6',     label: 'Đối chiếu L6',    icon: 'check',      color: '#7c3aed',       softColor: '#f5f3ff' },
  { id: 'cost',       label: 'Chi phí KCB',     icon: 'dollar',     color: '#0891b2',       softColor: '#ecfeff' },
  { id: 'admin',      label: 'Hành chính & CLS', icon: 'list',      color: '#0369a1',       softColor: '#e0f2fe' },
  { id: 'pharmacy',   label: 'BC Dược',          icon: 'pill',      color: '#15803d',       softColor: '#f0fdf4' },
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

  // ── Đối chiếu Level 6 (reconciliation) ───────────────────────────────────
  { id: 'supplier-procurement',  category: 'level6', name: 'Theo dõi trúng thầu theo NCC', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Khoa Dược/VTYT', owner: 'P. TCKT' },
  { id: 'revenue-by-record',     category: 'level6', name: 'Doanh thu chi phí theo HSBA',  periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện',     owner: 'P. TCKT' },
  { id: 'dept-cost-vs-fees',     category: 'level6', name: 'Chi phí khoa phòng vs viện phí', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'record-cost-summary',   category: 'level6', name: 'Tổng hợp chi phí HSBA: SD vs Thu', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'fees-vs-standards',     category: 'level6', name: 'Viện phí vs định mức DVKT',    periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện',     owner: 'P. TCKT' },
  { id: 'service-order-doctors', category: 'level6', name: 'BS chỉ định vs BS thực hiện',  periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện',     owner: 'Phòng QLCL' },
  { id: 'dispensing-vs-billing', category: 'level6', name: 'Xuất kho thuốc/VTYT vs viện phí', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Khoa Dược', owner: 'P. TCKT' },
  { id: 'dispensing-vs-standards', category: 'level6', name: 'Xuất kho vs định mức theo khoa', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Khoa Dược', owner: 'TK Dược' },

  // ── Chi phí KCB BHYT ─────────────────────────────────────────────────────
  { id: 'bhyt-16', category: 'cost', name: '16/BHYT - Danh mục thuốc chế phẩm YHCT thanh toán BHYT', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'bhyt-17', category: 'cost', name: '17/BHYT - Danh mục vị thuốc YHCT thanh toán BHYT',       periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'bhyt-18', category: 'cost', name: '18/BHYT - Thống kê DVKT sử dụng thuốc phóng xạ',        periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'bhyt-chi-phi-kcb', category: 'cost', name: 'Chi phí KCB theo bệnh nhân',                   periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện', owner: 'P. TCKT' },
  { id: 'bhyt-quyet-toan',  category: 'cost', name: 'Quyết toán BHYT theo đợt',                     periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Thủ công', scope: 'Toàn viện', owner: 'P. TCKT' },

  // ── Hành chính & CLS ─────────────────────────────────────────────────────
  { id: 'admin-so-kham',    category: 'admin', name: 'Sổ khám bệnh (chung, chuyên khoa, ngoại trú)', periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng KHTH' },
  { id: 'admin-so-vao-ra',  category: 'admin', name: 'Sổ vào viện, ra viện, chuyển viện',           periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'Phòng KHTH' },
  { id: 'admin-so-pt',      category: 'admin', name: 'Sổ phẫu thuật',                               periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Ngoại', owner: 'TK Ngoại' },
  { id: 'admin-xn',         category: 'admin', name: 'Thống kê xét nghiệm theo khoa',               periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa XN',    owner: 'TK XN' },
  { id: 'admin-cdha',       category: 'admin', name: 'Thống kê CĐHA theo loại',                     periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa CĐHA',  owner: 'TK CĐHA' },
  { id: 'admin-nhan-su',    category: 'admin', name: 'Thống kê lượt khám theo nhân sự',             periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'P. Tổ chức' },

  // ── BC Dược ───────────────────────────────────────────────────────────────
  { id: 'pharma-the-kho',        category: 'pharmacy', name: 'Thẻ kho',                              periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'pharma-bc-cong-tac',    category: 'pharmacy', name: 'BC công tác Dược bệnh viện',          periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'pharma-bc-sd-thuoc',    category: 'pharmacy', name: 'BC sử dụng thuốc',                    periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'TK Dược' },
  { id: 'pharma-ton-kho',        category: 'pharmacy', name: 'Báo cáo tồn kho dược phẩm',          periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'pharma-nhap-xuat',      category: 'pharmacy', name: 'Tổng hợp nhập — xuất — tồn',         periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Khoa Dược', owner: 'TK Dược' },
  { id: 'pharma-tieu-hao-bdm',   category: 'pharmacy', name: 'Tiêu hao theo danh mục thuốc BĐM',   periodLabel: 'Tháng', lastRun: '01/10/2026', schedule: 'Hàng tháng', scope: 'Toàn viện', owner: 'TK Dược' },
];

const PERIOD_OPTIONS: Array<{ value: ReportPeriodId; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

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

function periodRange(period: ReportPeriodId): { fromDate: string; toDate: string } {
  const now = dayjs();
  switch (period) {
    case 'day':   return { fromDate: now.format('YYYY-MM-DD'), toDate: now.format('YYYY-MM-DD') };
    case 'week':  return { fromDate: now.startOf('week').format('YYYY-MM-DD'), toDate: now.endOf('week').format('YYYY-MM-DD') };
    case 'year':  return { fromDate: now.startOf('year').format('YYYY-MM-DD'), toDate: now.endOf('year').format('YYYY-MM-DD') };
    default:      return { fromDate: now.startOf('month').format('YYYY-MM-DD'), toDate: now.endOf('month').format('YYYY-MM-DD') };
  }
}

// QA-R10: shared CSV helpers (BOM + quoting + formula-injection guard) instead of a local copy
const { downloadCsv, escapeCsvCell } = file;

/** Reads the error message out of a blob (responseType 'blob') error body; falls back to `fallback`. */
async function blobErrorMessage(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed?.message) return parsed.message;
    } catch { /* not JSON */ }
  }
  return friendlyErrorMessage(error, fallback);
}

/** History timestamps are UTC (CreatedAt) — parse as UTC so the VN time is shown. */
const utcDay = (s: string) => dayjs(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);

function mapTopDepartments(revenueByDepartment: DepartmentRevenueDto[] | undefined): Array<{ name: string; value: number; color: string }> {
  // QA-R3: no live data → empty list ("chưa có dữ liệu"), not five invented departments.
  if (!revenueByDepartment || revenueByDepartment.length === 0) {
    return [];
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
  const { message } = AntdApp.useApp();
  // #409: page-level tab — "Tổng quan" (dashboard hiện có) vs "140 Báo cáo bệnh viện" (report-runner)
  const [pageTab, setPageTab] = React.useState<'dashboard' | 'hospital' | 'builder'>('dashboard');
  const [activeCategory, setActiveCategory] = React.useState<ReportCategoryId>('operational');
  const [search, setSearch] = React.useState('');
  const [period, setPeriod] = React.useState<ReportPeriodId>('month');
  const [dashboard, setDashboard] = React.useState<HospitalDashboardDto | null>(null);
  const [selectedReport, setSelectedReport] = React.useState<ReportDefinition | null>(null);
  // null = closed; '' = opened from the toolbar (report selectable); a code = opened from that report's drawer
  const [scheduleFor, setScheduleFor] = React.useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = React.useState(false);
  const [runningReport, setRunningReport] = React.useState<string | null>(null);
  const [form] = Form.useForm<ScheduleForm>();
  // QA-R11: the Ngày/Tuần/Tháng/Năm switch only changed the title — every KPI stayed today's. Period KPIs + top depts.
  const [kpi, setKpi] = React.useState<KPIDashboardDto | null>(null);
  const [deptRevenue, setDeptRevenue] = React.useState<DepartmentRevenueDto[] | undefined>(undefined);
  const [avgWait, setAvgWait] = React.useState<number | null>(null);
  // QA-R3: real run history + schedules (the strip, "Lần chạy" and "Lịch" used to be hard-coded text).
  const [history, setHistory] = React.useState<ReportHistoryDto[]>([]);
  const [schedules, setSchedules] = React.useState<ScheduledReportConfigDto[]>([]);

  const loadRunInfo = React.useCallback(() => {
    getReportHistory(undefined, undefined, undefined, 200)
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]));
    getScheduledReports()
      .then((r) => setSchedules(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSchedules([]));
  }, []);

  React.useEffect(() => {
    statisticsApi.getHospitalDashboard(dayjs().format('YYYY-MM-DD'))
      .then((response) => setDashboard(response.data))
      .catch((error) => {
        message.warning(friendlyErrorMessage(error, 'Không tải được dữ liệu dashboard'));
        setDashboard(null);
      });
    loadRunInfo();
  }, [loadRunInfo]);

  React.useEffect(() => {
    const { fromDate, toDate } = periodRange(period);
    let cancelled = false;
    getKPIDashboard(fromDate, toDate)
      .then((r) => { if (!cancelled) setKpi(r.data ?? null); })
      .catch(() => { if (!cancelled) setKpi(null); });
    financeApi.getRevenueByExecutingDept(fromDate, toDate)
      .then((r) => {
        if (cancelled) return;
        setDeptRevenue((r.data ?? []).map((d) => ({ departmentId: d.departmentId, departmentName: d.departmentName, revenue: d.totalRevenue })));
      })
      .catch(() => { if (!cancelled) setDeptRevenue(undefined); });
    // "Chờ khám TB" was a permanent "—": registration → exam start of the period's OPD visits (F9.4 phase analysis).
    getWaitingPhaseAnalysis(fromDate, toDate)
      .then((w) => { if (!cancelled) setAvgWait(w && w.totalVisits > 0 ? w.registrationToExamMinutes : null); })
      .catch(() => { if (!cancelled) setAvgWait(null); });
    return () => { cancelled = true; };
  }, [period]);

  const lastRunOf = (code: string): string => {
    const last = history.find((h) => h.reportCode?.toLowerCase() === code.toLowerCase());
    return last ? utcDay(last.createdAt).format('DD/MM/YYYY HH:mm') : 'Chưa chạy';
  };
  const configOf = (code: string): ScheduledReportConfigDto | undefined =>
    schedules.find((x) => x.reportCode?.toLowerCase() === code.toLowerCase());
  const scheduleOf = (code: string): string => {
    const sch = configOf(code);
    return sch && sch.isActive ? `${scheduleLabel(sch.schedule)} · gửi khi bấm "Gửi báo cáo"` : 'Thủ công';
  };

  const categoryCounts = REPORT_CATEGORIES.reduce<Record<ReportCategoryId, number>>((counts, category) => {
    counts[category.id] = REPORTS.filter((report) => report.category === category.id).length;
    return counts;
  }, {
    operational: 0, clinical: 0, financial: 0, regulatory: 0,
    level6: 0, cost: 0, admin: 0, pharmacy: 0,
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
  // QA-R11: occupancy was currentInpatients / (currentInpatients + availableBeds) — inpatients without a bed count
  // too, so it showed 96,4% (53/55) while 13 of 15 beds were occupied (86,7%, /reporting/kpi KPI-C04 = bed board).
  const kpiItem = (code: string) => [...(kpi?.clinicalKPIs ?? []), ...(kpi?.financialKPIs ?? [])].find((k) => k.code === code);
  const kpiVisits = kpiItem('KPI-C01');
  const kpiRevenue = kpiItem('KPI-F01');
  const kpiBeds = kpiItem('KPI-C04');
  const bedOccupancyRate = kpiBeds ? kpiBeds.currentValue : readDashboardNumber(dashboardData, ['bedOccupancyRate']);
  const surgeryCount = readDashboardNumber(dashboardData, ['surgeryCount', 'todaySurgeries']);
  const surgeryChange = readDashboardNumber(dashboardData, ['surgeryChange']);
  const averageStayDays = readDashboardNumber(dashboardData, ['averageStayDays']);
  const bhytRevenue = readDashboardNumber(dashboardData, ['revenueBHYT']);
  const visitTotal = [outpatientCount ?? 0, emergencyCount ?? 0].reduce((sum, value) => sum + value, 0);
  const hasLiveVisitData = outpatientCount !== null || emergencyCount !== null;

  // QA-R3: every KPI comes from the live dashboard payload; a value it does not carry shows "—" / "chưa có
  // số liệu" (the page used to fall back to invented numbers — 1.284 lượt khám, 2,84 tỷ — or derived trends).
  const NO_DATA = '—';
  const metricText = (kind: string, value: number | null) => (value === null ? NO_DATA : formatMetricValue(kind, value));
  const subText = (value: number | null, text: string) => (value === null ? 'chưa có số liệu' : text);
  // Visits / revenue follow the selected period (/reporting/kpi, change vs the previous period of the same length);
  // without the KPI payload only the day view can fall back to today's dashboard.
  const visits = kpiVisits ? kpiVisits.currentValue : (period === 'day' && hasLiveVisitData ? visitTotal : null);
  const visitsTrend = kpiVisits ? kpiVisits.changePercent : (period === 'day' ? outpatientChange ?? 0 : 0);
  const periodRevenue = kpiRevenue ? kpiRevenue.currentValue : (period === 'day' ? totalRevenue : null);
  const periodRevenueTrend = kpiRevenue ? kpiRevenue.changePercent : (period === 'day' ? revenueChange ?? 0 : 0);
  const todayOnly = period === 'day' ? '' : ' (hôm nay)';

  const todayRuns = history.filter((h) => utcDay(h.createdAt).isSame(dayjs(), 'day')).length;
  const activeSchedules = schedules.filter((x) => x.isActive).length;
  const stripCards = [
    { label: 'Báo cáo có sẵn', value: REPORTS.length.toString(), sub: `${REPORT_CATEGORIES.length} nhóm` },
    { label: 'Đã chạy hôm nay', value: todayRuns.toString(), sub: 'theo lịch sử xuất', tone: 'ok' },
    { label: 'Cấu hình gửi', value: activeSchedules.toString(), sub: 'báo cáo đã cấu hình người nhận', tone: 'info' },
    { label: 'Báo cáo BYT', value: categoryCounts.regulatory.toString(), sub: 'định kỳ', tone: 'info' },
  ];

  const boardMetrics = [
    { label: 'Lượt khám', value: metricText('count', visits), trend: visitsTrend, sub: subText(visits, 'vs kỳ trước') },
    { label: 'Doanh thu', value: metricText('currency', periodRevenue), trend: periodRevenueTrend, sub: subText(periodRevenue, 'vs kỳ trước') },
    { label: 'Lấp đầy giường', value: metricText('percent', bedOccupancyRate), trend: 0, sub: subText(bedOccupancyRate, 'giường đang có BN') },
    { label: 'Chờ khám TB', value: metricText('minutes', avgWait), trend: 0, sub: subText(avgWait, 'đăng ký → bắt đầu khám'), inverse: true },
    { label: `Phẫu thuật${todayOnly}`, value: metricText('count', surgeryCount), trend: surgeryChange ?? 0, sub: subText(surgeryCount, 'ca thực hiện') },
    { label: 'LOS nội trú', value: metricText('duration', averageStayDays), trend: 0, sub: subText(averageStayDays, 'trung bình'), inverse: true },
    { label: 'Tỷ lệ tử vong', value: NO_DATA, trend: 0, sub: 'chưa có số liệu', inverse: true },
    { label: `Doanh thu BN BHYT${todayOnly}`, value: metricText('currency', bhytRevenue), trend: 0, sub: subText(bhytRevenue, 'hôm nay') },
  ];

  const selectedCategory = REPORT_CATEGORIES.find((category) => category.id === activeCategory) ?? REPORT_CATEGORIES[0];
  // QA-R11: /statistics/dashboard carries no revenueByDepartment, so "Top 5 khoa/phòng" was always empty.
  // Revenue of the selected period by executing department (/finance/revenue/executing-dept).
  const topDepartments = mapTopDepartments(deptRevenue ?? (Array.isArray(dashboardData?.revenueByDepartment)
    ? dashboardData.revenueByDepartment as DepartmentRevenueDto[]
    : undefined));


  const handleExportList = () => {
    const header = ['Mã báo cáo', 'Nhóm', 'Tên báo cáo', 'Chu kỳ', 'Lần chạy gần nhất', 'Lịch chạy', 'Phạm vi', 'Sở hữu'];
    const rows = filteredReports.map((report) => {
      const category = REPORT_CATEGORIES.find((item) => item.id === report.category)?.label ?? report.category;
      return [
        report.id,
        category,
        report.name,
        report.periodLabel,
        lastRunOf(report.id),
        scheduleOf(report.id),
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

  const openSchedule = (code: string) => {
    const cfg = code ? configOf(code) : undefined;
    form.setFieldsValue({
      reportCode: code || undefined,
      schedule: (SCHEDULE_OPTIONS.find((o) => o.value.toLowerCase() === (cfg?.schedule ?? '').toLowerCase())?.value) ?? 'Monthly',
      format: cfg?.format?.toLowerCase() === 'pdf' ? 'PDF' : 'Excel',
      recipients: cfg?.recipients ?? '',
      isActive: cfg ? cfg.isActive : true,
    });
    setScheduleFor(code);
  };

  const handleSaveSchedule = async () => {
    if (scheduleSaving) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setScheduleSaving(true);
    try {
      const existing = configOf(values.reportCode);
      await saveScheduledReport({
        id: existing?.id,
        reportCode: values.reportCode,
        schedule: values.schedule,
        cronExpression: existing?.cronExpression ?? '',
        format: values.format,
        recipients: (values.recipients ?? '').trim(),
        isActive: values.isActive,
      });
      message.success('Đã lưu cấu hình gửi báo cáo');
      setScheduleFor(null);
      loadRunInfo();
    } catch (error) {
      message.error(friendlyErrorMessage(error, 'Lưu cấu hình thất bại'));
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    const code = form.getFieldValue('reportCode') as string | undefined;
    const existing = code ? configOf(code) : undefined;
    if (!existing || scheduleSaving) return;
    setScheduleSaving(true);
    try {
      await deleteScheduledReport(existing.id);
      message.success('Đã xoá cấu hình gửi báo cáo');
      setScheduleFor(null);
      loadRunInfo();
    } catch (error) {
      message.error(friendlyErrorMessage(error, 'Xoá cấu hình thất bại'));
    } finally {
      setScheduleSaving(false);
    }
  };

  /** "Gửi báo cáo": produce the report for the configured cycle and e-mail it to the configured recipients. */
  const handleSendReport = async (report: ReportDefinition) => {
    const cfg = configOf(report.id);
    if (!cfg || !cfg.recipients?.trim()) {
      message.warning('Chưa có email người nhận — nhập trong "Cấu hình" rồi gửi lại');
      openSchedule(report.id);
      return;
    }
    if (runningReport === report.id) return;
    setRunningReport(report.id);
    try {
      await runScheduledReportNow(cfg.id);
      message.success(`Đã tạo báo cáo (${scheduleLabel(cfg.schedule).toLowerCase()}) và gửi tới ${cfg.recipients}`);
      loadRunInfo();
    } catch (error) {
      message.error(friendlyErrorMessage(error, 'Gửi báo cáo thất bại'));
    } finally {
      setRunningReport(null);
    }
  };

  const getDateRange = () => periodRange(period);

  const downloadBlob = async (url: string, filename: string) => {
    const resp = await apiClient.get(url, { responseType: 'blob' });
    const blob = new Blob([resp.data as BlobPart]);
    file.downloadBlob(blob, filename);
  };

  const handleRunReport = async (report: ReportDefinition) => {
    if (runningReport === report.id) return;
    setRunningReport(report.id);
    try {
      const { fromDate, toDate } = getDateRange();
      await downloadBlob(
        `/reporting/export/pdf/${report.id}?fromDate=${fromDate}&toDate=${toDate}`,
        `${report.id}_${dayjs().format('YYYYMMDD')}.pdf`,
      );
      message.success(`Đã tải PDF báo cáo: ${report.name}`);
      loadRunInfo();
    } catch (error) {
      message.error(await blobErrorMessage(error, 'Chạy báo cáo thất bại — thử lại sau'));
    } finally {
      setRunningReport(null);
    }
  };

  const handleDownloadExcel = async (report: ReportDefinition) => {
    if (runningReport === report.id) return;
    setRunningReport(report.id);
    try {
      const { fromDate, toDate } = getDateRange();
      await downloadBlob(
        `/reporting/export/excel/${report.id}?fromDate=${fromDate}&toDate=${toDate}`,
        `${report.id}_${dayjs().format('YYYYMMDD')}.xlsx`,
      );
      message.success(`Đã tải Excel: ${report.name}`);
      loadRunInfo();
    } catch (error) {
      message.error(await blobErrorMessage(error, 'Tải Excel thất bại — thử lại sau'));
    } finally {
      setRunningReport(null);
    }
  };

  const handlePrintReport = async (report: ReportDefinition) => {
    if (runningReport === report.id) return;
    setRunningReport(report.id);
    try {
      const { fromDate, toDate } = getDateRange();
      const resp = await apiClient.get(`/reporting/export/pdf/${report.id}`, {
        params: { fromDate, toDate },
        responseType: 'blob',
      });
      const blob = new Blob([resp.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      // Revoke after 60s — new tab has time to load before URL is freed
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (!win) {
        message.warning('Trình duyệt chặn cửa sổ pop-up — vui lòng cho phép và thử lại');
      }
    } catch (error) {
      message.error(await blobErrorMessage(error, 'Tải dữ liệu in thất bại — thử lại sau'));
    } finally {
      setRunningReport(null);
    }
  };

  return (
    <div className="reports-v2-page">
      <div className="reports-v2-page-tabs" role="tablist" aria-label="Chọn khu vực báo cáo" style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'dashboard'}
          className={pageTab === 'dashboard' ? 'is-active' : ''}
          onClick={() => setPageTab('dashboard')}
        >
          Tổng quan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'hospital'}
          className={pageTab === 'hospital' ? 'is-active' : ''}
          onClick={() => setPageTab('hospital')}
        >
          140 Báo cáo bệnh viện
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'builder'}
          className={pageTab === 'builder' ? 'is-active' : ''}
          onClick={() => setPageTab('builder')}
        >
          Báo cáo tùy chỉnh
        </button>
      </div>
      {pageTab === 'hospital' ? <ReportsHospitalTab /> : pageTab === 'builder' ? <ReportBuilderTab /> : (
      <>
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
          <button type="button" className="reports-v2-btn primary" onClick={() => openSchedule('')}>
            <PlusOutlined />
            <span>Cấu hình gửi báo cáo</span>
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
              <span className="reports-v2-pill">{NO_SOURCE_REPORTS.has(report.id) ? NO_SOURCE_HINT : report.periodLabel}</span>
            </div>

            <h3 className="reports-v2-card-title">{report.name}</h3>

            <div className="reports-v2-card-facts">
              <div><span>Phạm vi:</span> {report.scope}</div>
              <div><span>Sở hữu:</span> {report.owner}</div>
              <div><span>Lần chạy:</span> {lastRunOf(report.id)}</div>
              <div><span>Lịch:</span> {scheduleOf(report.id)}</div>
            </div>

            <div className="reports-v2-card-actions">
              <button
                type="button"
                className="reports-v2-btn ghost"
                disabled={runningReport === report.id || NO_SOURCE_REPORTS.has(report.id)}
                title={NO_SOURCE_REPORTS.has(report.id) ? NO_SOURCE_HINT : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRunReport(report);
                }}
              >
                <PlayCircleOutlined />
                <span>{runningReport === report.id ? 'Đang chạy…' : 'Tải PDF'}</span>
              </button>
              <button
                type="button"
                className="reports-v2-btn ghost"
                disabled={runningReport === report.id || NO_SOURCE_REPORTS.has(report.id)}
                title={NO_SOURCE_REPORTS.has(report.id) ? NO_SOURCE_HINT : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDownloadExcel(report);
                }}
              >
                <FileExcelOutlined />
                <span>Tải Excel</span>
              </button>
              <button
                type="button"
                className="reports-v2-btn ghost"
                disabled={runningReport === report.id || NO_SOURCE_REPORTS.has(report.id)}
                title={NO_SOURCE_REPORTS.has(report.id) ? NO_SOURCE_HINT : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  void handlePrintReport(report);
                }}
              >
                <PrinterOutlined />
                <span>In báo cáo</span>
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
            <Tooltip title={NO_SOURCE_REPORTS.has(selectedReport.id) ? NO_SOURCE_HINT : 'Chu kỳ số liệu, định dạng và email nhận khi gửi báo cáo'}>
              <button
                type="button"
                className="reports-v2-btn"
                disabled={NO_SOURCE_REPORTS.has(selectedReport.id)}
                onClick={() => openSchedule(selectedReport.id)}
              >
                <SettingOutlined />
                <span>Cấu hình</span>
              </button>
            </Tooltip>
            <button
              type="button"
              className="reports-v2-btn"
              disabled={runningReport === selectedReport.id || NO_SOURCE_REPORTS.has(selectedReport.id)}
              onClick={() => handleRunReport(selectedReport)}
            >
              <ReloadOutlined />
              <span>{runningReport === selectedReport.id ? 'Đang tải…' : 'Tải PDF'}</span>
            </button>
            <button
              type="button"
              className="reports-v2-btn"
              disabled={runningReport === selectedReport.id || NO_SOURCE_REPORTS.has(selectedReport.id)}
              onClick={() => handleDownloadExcel(selectedReport)}
            >
              <FileExcelOutlined />
              <span>Tải Excel</span>
            </button>
            <button
              type="button"
              className="reports-v2-btn"
              disabled={runningReport === selectedReport.id || NO_SOURCE_REPORTS.has(selectedReport.id)}
              onClick={() => void handlePrintReport(selectedReport)}
            >
              <PrinterOutlined />
              <span>In báo cáo</span>
            </button>
            <Tooltip title={NO_SOURCE_REPORTS.has(selectedReport.id) ? NO_SOURCE_HINT
              : configOf(selectedReport.id)?.recipients ? `Tạo báo cáo và gửi tới ${configOf(selectedReport.id)?.recipients}` : 'Chưa có email nhận — bấm để cấu hình'}>
              <button
                type="button"
                className="reports-v2-btn primary"
                disabled={runningReport === selectedReport.id || NO_SOURCE_REPORTS.has(selectedReport.id)}
                onClick={() => void handleSendReport(selectedReport)}
              >
                <SendOutlined />
                <span>{runningReport === selectedReport.id ? 'Đang gửi…' : 'Gửi báo cáo'}</span>
              </button>
            </Tooltip>
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
                <div><span>Lịch chạy</span><strong>{scheduleOf(selectedReport.id)}</strong></div>
                <div><span>Lần chạy gần nhất</span><strong>{lastRunOf(selectedReport.id)}</strong></div>
              </div>
            </section>

            <section className="reports-v2-drawer-section">
              <div className="reports-v2-section-label">Top 5 khoa/phòng theo doanh thu (triệu đ · {formatPeriodLabel(period).replace("BẢNG KPI · ", "")})</div>
              <div className="reports-v2-ranking">
                {topDepartments.length === 0 && <div className="reports-v2-empty">Chưa có dữ liệu doanh thu theo khoa</div>}
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
                        {`${department.value.toLocaleString('vi-VN')}M`}
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
        title={scheduleFor ? `Cấu hình gửi báo cáo · ${scheduleFor}` : 'Cấu hình gửi báo cáo'}
        open={scheduleFor !== null}
        onCancel={() => setScheduleFor(null)}
        forceRender
        zIndex={1100} /* opened from the report drawer — must stack above it */
        footer={[
          <button key="cancel" type="button" className="reports-v2-btn ghost" onClick={() => setScheduleFor(null)}>
            Hủy
          </button>,
          ...(scheduleFor && configOf(scheduleFor) ? [
            <button key="delete" type="button" className="reports-v2-btn ghost" disabled={scheduleSaving}
              onClick={() => void handleDeleteSchedule()}>
              Xoá cấu hình
            </button>,
          ] : []),
          <button key="submit" type="button" className="reports-v2-btn primary" disabled={scheduleSaving}
            onClick={() => void handleSaveSchedule()}>
            <SettingOutlined />
            <span>{scheduleSaving ? 'Đang lưu…' : 'Lưu cấu hình'}</span>
          </button>,
        ]}
      >
        <Form<ScheduleForm> form={form} layout="vertical">
          <Form.Item label="Báo cáo" name="reportCode" rules={[{ required: true, message: 'Chọn báo cáo' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              disabled={!!scheduleFor}
              options={REPORTS.filter((r) => !NO_SOURCE_REPORTS.has(r.id)).map((r) => ({ value: r.id, label: `${r.id} · ${r.name}` }))}
            />
          </Form.Item>
          <div className="reports-v2-modal-grid">
            <Form.Item label="Chu kỳ số liệu" name="schedule" rules={[{ required: true, message: 'Chọn chu kỳ' }]}>
              <Select options={SCHEDULE_OPTIONS} />
            </Form.Item>
            <Form.Item label="Định dạng" name="format" rules={[{ required: true, message: 'Chọn định dạng' }]}>
              <Select options={[{ value: 'Excel', label: 'Excel (XLSX)' }, { value: 'PDF', label: 'PDF' }]} />
            </Form.Item>
          </div>
          <Form.Item label="Email nhận" name="recipients" extra="Nhiều email cách nhau bởi dấu phẩy">
            <Input placeholder="ketoan@benhvien.vn, khth@benhvien.vn" />
          </Form.Item>
          <Form.Item label="Đang dùng" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div style={{ fontSize: 12, color: 'var(--t-2)' }}>
            Bấm &quot;Gửi báo cáo&quot; ở báo cáo để tạo file theo chu kỳ trên và gửi tới các email nhận.
            Hệ thống chưa có bộ hẹn giờ tự gửi — báo cáo không tự chạy theo lịch.
          </div>
        </Form>
      </Modal>
      </>
      )}
    </div>
  );
};

export default ReportsV2;
