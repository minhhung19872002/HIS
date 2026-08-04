import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import {
  getDietOrders, getDietOrderById, createDietOrder, updateDietOrder, cancelDietOrder, getDietTypes,
  getPendingScreenings, getScreenings, createScreening, getActiveDietOrder, getDashboard, getMealPlan,
  getCanteenQueue, approveMealPlan, rejectMealPlan, markCanteenPrepared, markCanteenDistributed,
} from '../api/nutrition';
import type {
  CreateDietOrderDto, NutritionScreeningDto, NutritionDashboardDto, MealPlanDto, PlannedMealDto,
  CanteenQueueItemDto,
} from '../api/nutrition';
import { getInpatientList } from '../../inpatient/api/inpatient';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { openPrintWindow } from '../../../utils/printWindow';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal, ModalShell,
  DrawerShell, DrSec, DrField, tk, ti, te, tw,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

// ─────────────────────────── In phiếu chế độ ăn (dùng chung tab Sàng lọc + Chế độ ăn) ───────────────────────────

interface PrintableDietOrder {
  patientName?: string;
  bedNumber?: string;
  departmentName?: string;
  dietTypeName?: string;
  dietType?: string;
  energyKcal?: number;
  proteinGrams?: number;
  feedingRoute?: string;
}

const printDietOrderHtml = (order: PrintableDietOrder): void => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Phiếu dinh dưỡng</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 5px; }
        .meal-table { width: 100%; border-collapse: collapse; }
        .meal-table th, .meal-table td { border: 1px solid #000; padding: 8px; }
        .meal-table th { background: #f0f0f0; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header"><strong>${HOSPITAL_NAME}</strong><br/>Khoa Dinh dưỡng</div>
      <div class="title">PHIẾU KẾ HOẠCH DINH DƯỠNG</div>
      <table class="info-table">
        <tr>
          <td><strong>Họ tên:</strong> ${order.patientName || '—'}</td>
          <td><strong>Giường:</strong> ${order.bedNumber || '—'}</td>
        </tr>
        <tr>
          <td><strong>Khoa:</strong> ${order.departmentName || '—'}</td>
          <td><strong>Chế độ:</strong> ${order.dietTypeName || order.dietType || '—'}</td>
        </tr>
        <tr>
          <td><strong>Năng lượng:</strong> ${order.energyKcal ?? '—'} kcal/ngày</td>
          <td><strong>Protein:</strong> ${order.proteinGrams ?? '—'} g/ngày</td>
        </tr>
        <tr><td colspan="2"><strong>Đường cấp DD:</strong> ${order.feedingRoute || '—'}</td></tr>
      </table>
      <table class="meal-table">
        <thead>
          <tr><th>Bữa ăn</th><th>Giờ</th><th>Món ăn</th><th>Ghi chú</th></tr>
        </thead>
        <tbody>
          <tr><td>Sáng</td><td>07:00</td><td>Cháo/Bánh mì mềm</td><td></td></tr>
          <tr><td>Phụ sáng</td><td>09:30</td><td>Sữa/Trái cây</td><td></td></tr>
          <tr><td>Trưa</td><td>11:30</td><td>Cơm/Cháo + Thức ăn</td><td></td></tr>
          <tr><td>Phụ chiều</td><td>15:00</td><td>Sữa/Bánh</td><td></td></tr>
          <tr><td>Tối</td><td>17:30</td><td>Cơm/Cháo + Thức ăn</td><td></td></tr>
        </tbody>
      </table>
      <div style="margin-top: 30px; text-align: right;">
        <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
        <p><strong>Chuyên gia dinh dưỡng</strong></p>
        <p style="margin-top: 50px;">___________________</p>
      </div>
    </body>
    </html>
  `;
  openPrintWindow(html, { print: { delayMs: 300 } });
};

const DATE_INP: React.CSSProperties = {
  height: 30, padding: '0 8px', background: 'var(--bg-1)', color: 'var(--t-0)',
  border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)',
};

type MainTab = 'screening' | 'orders' | 'meals' | 'canteen';
const TOP_TABS: { v: MainTab; l: string; ic?: string }[] = [
  { v: 'screening', l: 'Sàng lọc dinh dưỡng', ic: 'stethoscope' },
  { v: 'orders',    l: 'Chế độ ăn',            ic: 'file-text' },
  { v: 'meals',     l: 'Quản lý bữa ăn',       ic: 'calendar' },
  // NangCap26 XII.5/XII.6 — khoa dinh dưỡng duyệt phiếu + nhà ăn chuẩn bị/phát
  { v: 'canteen',   l: 'Duyệt suất ăn · Nhà ăn', ic: 'check-circle' },
];

/** Nhãn + tông màu cho vòng đời phiếu suất ăn (XII.5/XII.6). */
const CANTEEN_STATUS: Record<string, { l: string; tone: 'info' | 'ok' | 'warn' | 'crit' }> = {
  Planned:     { l: 'Chờ duyệt',    tone: 'warn' },
  Approved:    { l: 'Đã duyệt',     tone: 'info' },
  Rejected:    { l: 'Từ chối',      tone: 'crit' },
  Prepared:    { l: 'Đã chuẩn bị',  tone: 'info' },
  Distributed: { l: 'Đã phát',      tone: 'ok' },
};

// ─────────────────────────── Sàng lọc NRS-2002 ───────────────────────────

type ScreenSKey = 'pending' | 'screened' | 'monitoring' | 'discharged';
const SCREEN_TABS = [
  { v: 'pending' as ScreenSKey,    l: 'Chờ sàng lọc',  tone: 'warn' as const },
  { v: 'screened' as ScreenSKey,   l: 'Đã sàng lọc',   tone: 'info' as const },
  { v: 'monitoring' as ScreenSKey, l: 'Đang theo dõi', tone: 'ok' as const },
  { v: 'discharged' as ScreenSKey, l: 'Đã xuất viện',  tone: 'info' as const },
];
const screenStatusKey = (s: number): ScreenSKey =>
  s === 1 ? 'screened' : s === 2 ? 'monitoring' : s === 3 ? 'discharged' : 'pending';

const RISK_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { low: 'ok', medium: 'warn', high: 'crit' };
const RISK_LABEL: Record<string, string> = { low: 'Thấp', medium: 'Vừa', high: 'Cao' };
const RISK_OPTIONS = [{ v: 'low', l: 'Thấp' }, { v: 'medium', l: 'Vừa' }, { v: 'high', l: 'Cao' }];
const riskBadge = (risk?: string) => {
  const key = (risk || '').toLowerCase();
  if (!key) return <span style={{ color: 'var(--t-2)' }}>—</span>;
  return <StatusBadge tone={RISK_TONE[key] ?? 'info'} dot>{RISK_LABEL[key] ?? risk}</StatusBadge>;
};

// Thang điểm NRS-2002 (giữ nguyên công thức nghiệp vụ đã dùng ở v1: nrsNutritionalScore =
// BMI + sụt cân + lượng ăn; nrsSeverityScore = mức độ bệnh; tổng 4 điểm >= 3 → nguy cơ CAO, >= 2 → VỪA).
const SCREEN_FIELDS: CrudFieldCfg[] = [
  { key: 'bmiScore', label: '1. BMI', type: 'radio', required: true, options: [
    { value: 0, label: 'BMI ≥ 20.5 (0 điểm)' },
    { value: 1, label: 'BMI 18.5–20.5 (1 điểm)' },
    { value: 2, label: 'BMI < 18.5 (2 điểm)' },
    { value: 3, label: 'BMI < 18.5 + toàn trạng kém (3 điểm)' },
  ] },
  { key: 'weightLossScore', label: '2. Sụt cân', type: 'radio', required: true, options: [
    { value: 0, label: 'Không sụt cân (0 điểm)' },
    { value: 1, label: 'Sụt > 5% trong 3 tháng (1 điểm)' },
    { value: 2, label: 'Sụt > 5% trong 2 tháng (2 điểm)' },
    { value: 3, label: 'Sụt > 5% trong 1 tháng (3 điểm)' },
  ] },
  { key: 'intakeScore', label: '3. Lượng ăn', type: 'radio', required: true, options: [
    { value: 0, label: 'Ăn bình thường (0 điểm)' },
    { value: 1, label: 'Ăn được 50–75% (1 điểm)' },
    { value: 2, label: 'Ăn được 25–50% (2 điểm)' },
    { value: 3, label: 'Ăn được < 25% (3 điểm)' },
  ] },
  { key: 'diseaseScore', label: '4. Mức độ bệnh', type: 'radio', required: true, options: [
    { value: 0, label: 'Bệnh nhẹ, không stress (0 điểm)' },
    { value: 1, label: 'Gãy xương hông, ung thư, bệnh mạn (1 điểm)' },
    { value: 2, label: 'Phẫu thuật lớn, đột quỵ, viêm phổi (2 điểm)' },
    { value: 3, label: 'Cháy nặng, ICU, ARDS (3 điểm)' },
  ] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

// ─────────────────────────── Quản lý bữa ăn ───────────────────────────

const MEAL_TYPE_LABEL: Record<string, string> = {
  Breakfast: 'Sáng', Lunch: 'Trưa', Dinner: 'Tối', Snack: 'Phụ',
  breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối', snack: 'Phụ',
};
const MEAL_TYPE_OPTIONS = [
  { v: 'Breakfast', l: 'Sáng' }, { v: 'Lunch', l: 'Trưa' }, { v: 'Dinner', l: 'Tối' }, { v: 'Snack', l: 'Phụ' },
];
const DELIVERY_LABEL: Record<number, string> = { 0: 'Chờ', 1: 'Đang chế biến', 2: 'Đã giao', 3: 'Đã ăn' };
const DELIVERY_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 0: 'info', 1: 'info', 2: 'warn', 3: 'ok' };

// ─────────────────────────── Chế độ ăn chỉ định (đơn dinh dưỡng) ───────────────────────────

type Row = {
  id: string;
  orderCode?: string;
  patientName?: string;
  patientCode?: string;
  medicalRecordCode?: string;
  departmentName?: string;
  bedNumber?: string;
  dietType?: string;
  dietTypeName?: string;
  dietCategory?: string;
  texture?: string;
  consistency?: string;
  calorieLevel?: number;
  proteinLevel?: number;
  energyKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  feedingRoute?: string;
  mealFrequency?: number;
  restrictions?: string[] | string;
  allergies?: string[] | string;
  status?: string | number;
  statusName?: string;
  orderedBy?: string;
  orderedByName?: string;
  startDate?: string;
  endDate?: string;
};

type SKey = 'active' | 'inactive';
const STATUS_TABS = [
  { v: 'active' as SKey,   l: 'Đang dùng', tone: 'ok' as const },
  { v: 'inactive' as SKey, l: 'Đã ngưng',  tone: 'warn' as const },
];

const isActive = (s: string | number | undefined) => s === 'Active' || s === 1 || s === '1';

const RESTRICTION_OPTIONS = [
  { value: 'salt', label: 'Giảm muối' }, { value: 'sugar', label: 'Giảm đường' }, { value: 'protein', label: 'Giảm đạm' },
  { value: 'fat', label: 'Giảm mỡ' }, { value: 'fiber', label: 'Giảm chất xơ' }, { value: 'potassium', label: 'Giảm Kali' },
];

const PER = 18;

const NutritionV2: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('screening');
  const [dashboard, setDashboard] = useState<NutritionDashboardDto | null>(null);

  // ── NangCap26 XII.5/XII.6: duyệt phiếu suất ăn + hàng đợi nhà ăn ──
  const [canteen, setCanteen] = useState<CanteenQueueItemDto[]>([]);
  const [canteenDate, setCanteenDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [canteenMeal, setCanteenMeal] = useState('');
  const [canteenLoading, setCanteenLoading] = useState(false);
  const [canteenBusy, setCanteenBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CanteenQueueItemDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Diet orders (Chế độ ăn) state ──
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [fRoute, setFRoute] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [dietTypeOpts, setDietTypeOpts] = useState<{ value: string; label: string }[]>([]);
  const [admissionOpts, setAdmissionOpts] = useState<{ value: string; label: string }[]>([]);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [cancelRow, setCancelRow] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // ── Sàng lọc NRS-2002 state ──
  const [screenPending, setScreenPending] = useState<NutritionScreeningDto[]>([]);
  const [screenAll, setScreenAll] = useState<NutritionScreeningDto[]>([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [screenSearch, setScreenSearch] = useState('');
  const [screenStab, setScreenStab] = useState<ScreenSKey | 'all'>('all');
  const [screenDept, setScreenDept] = useState('');
  const [screenRisk, setScreenRisk] = useState('');
  const [screenPage, setScreenPage] = useState(0);
  const [screenSel, setScreenSel] = useState<NutritionScreeningDto | null>(null);
  const [screenCrudOpen, setScreenCrudOpen] = useState(false);
  const [screenCrudInit, setScreenCrudInit] = useState<Record<string, unknown> | null>(null);

  // ── Quản lý bữa ăn state ──
  const [mealDate, setMealDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [mealPlan, setMealPlan] = useState<MealPlanDto | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('');
  const [mealPage, setMealPage] = useState(0);
  const [mealSel, setMealSel] = useState<PlannedMealDto | null>(null);

  // ── Diet order CRUD ──
  const openCreate = () => {
    setCrudInit({ texture: 'Regular', feedingRoute: 'Oral', mealFrequency: 3, snacksIncluded: false, energyKcal: 0, proteinGrams: 0, startDate: dayjs().format('YYYY-MM-DD') });
    setCrudOpen(true);
  };
  const openDietCreateFor = (admissionId: string) => {
    setCrudInit({ admissionId, texture: 'Regular', feedingRoute: 'Oral', mealFrequency: 3, snacksIncluded: false, energyKcal: 0, proteinGrams: 0, startDate: dayjs().format('YYYY-MM-DD') });
    setCrudOpen(true);
    setTab('orders');
  };
  const openEdit = async (r: Row) => {
    try { setCrudInit({ ...(await getDietOrderById(r.id)).data } as Record<string, unknown>); setCrudOpen(true); }
    catch { te('Không tải được chi tiết đơn'); }
  };
  const doCancel = async () => {
    if (!cancelRow) return;
    setCancelling(true);
    try {
      await cancelDietOrder(cancelRow.id, cancelReason.trim() || 'Ngưng theo chỉ định');
      tk('Đã ngưng đơn dinh dưỡng'); setCancelRow(null); setCancelReason(''); load();
    } catch { te('Ngưng đơn thất bại'); }
    finally { setCancelling(false); }
  };
  const printPatientDiet = async (admissionId: string) => {
    try {
      const order = (await getActiveDietOrder(admissionId)).data;
      if (!order) { tw('Bệnh nhân chưa có chế độ ăn chỉ định'); return; }
      printDietOrderHtml(order);
    } catch { tw('Bệnh nhân chưa có chế độ ăn chỉ định'); }
  };

  const dietFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true, disabledOnEdit: true },
    { key: 'dietType', label: 'Chế độ ăn', type: 'select', required: true, options: dietTypeOpts, showSearch: true },
    { key: 'texture', label: 'Cấu trúc', type: 'select', required: true, options: [
      { value: 'Regular', label: 'Thường' }, { value: 'Soft', label: 'Mềm' }, { value: 'Pureed', label: 'Xay nhuyễn' }, { value: 'Liquid', label: 'Lỏng' }] },
    { key: 'feedingRoute', label: 'Đường nuôi', type: 'select', required: true, options: [
      { value: 'Oral', label: 'Đường miệng' }, { value: 'NG', label: 'Sonde dạ dày (NG)' }, { value: 'PEG', label: 'Mở thông dạ dày (PEG)' }, { value: 'TPN', label: 'Nuôi tĩnh mạch (TPN)' }] },
    { key: 'restrictions', label: 'Hạn chế ăn uống', type: 'multiselect', options: RESTRICTION_OPTIONS },
    { key: 'energyKcal', label: 'Năng lượng (kcal)', type: 'number', required: true },
    { key: 'proteinGrams', label: 'Protein (g)', type: 'number', required: true },
    { key: 'fluidMl', label: 'Dịch (ml)', type: 'number' },
    { key: 'mealFrequency', label: 'Số bữa / ngày', type: 'number', required: true },
    { key: 'snacksIncluded', label: 'Có bữa phụ', type: 'switch' },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
    { key: 'specialInstructions', label: 'Hướng dẫn đặc biệt', type: 'textarea' },
  ], [admissionOpts, dietTypeOpts]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getDietOrders({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được đơn dinh dưỡng'); }
    finally { setLoading(false); }
  };

  const loadDashboard = async () => {
    try { setDashboard((await getDashboard(dayjs().format('YYYY-MM-DD'))).data || null); }
    catch { /* dashboard optional — KPI tự fallback về số liệu tính cục bộ */ }
  };

  const loadScreening = async () => {
    setScreenLoading(true);
    try {
      const [pending, all] = await Promise.all([getPendingScreenings(), getScreenings({ pageSize: 200 })]);
      setScreenPending(pending.data || []);
      const allBody = all.data as unknown;
      setScreenAll((Array.isArray(allBody) ? allBody : ((allBody as { items?: NutritionScreeningDto[] })?.items || [])) as NutritionScreeningDto[]);
    } catch { ti('Không tải được danh sách sàng lọc dinh dưỡng'); }
    finally { setScreenLoading(false); }
  };

  const loadMeals = async () => {
    setMealLoading(true);
    try { setMealPlan((await getMealPlan(mealDate)).data || null); }
    catch { setMealPlan(null); ti('Không tải được kế hoạch bữa ăn'); }
    finally { setMealLoading(false); }
  };

  // ── NangCap26 XII.5/XII.6 ──
  const loadCanteen = async () => {
    setCanteenLoading(true);
    try { setCanteen((await getCanteenQueue(canteenDate, canteenMeal || undefined)).data || []); }
    catch { setCanteen([]); ti('Không tải được hàng đợi nhà ăn'); }
    finally { setCanteenLoading(false); }
  };

  const doApprove = async (r: CanteenQueueItemDto) => {
    setCanteenBusy(r.mealPlanId);
    try {
      const res = await approveMealPlan(r.mealPlanId);
      tk(res.data?.billedItems
        ? `Đã duyệt · sinh khoản thu ${res.data.billedItems}/${res.data.totalItems} suất`
        : 'Đã duyệt (chế độ ăn không thu tiền)');
      await loadCanteen();
    } catch (e) {
      ti((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Duyệt thất bại');
    } finally { setCanteenBusy(null); }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { tw('Phải nhập lý do từ chối'); return; }
    setCanteenBusy(rejectTarget.mealPlanId);
    try {
      await rejectMealPlan(rejectTarget.mealPlanId, rejectReason.trim());
      tk('Đã từ chối phiếu suất ăn');
      setRejectTarget(null); setRejectReason('');
      await loadCanteen();
    } catch (e) {
      ti((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Từ chối thất bại');
    } finally { setCanteenBusy(null); }
  };

  const doCanteenStep = async (r: CanteenQueueItemDto, step: 'prepared' | 'distributed') => {
    setCanteenBusy(r.mealPlanId);
    try {
      if (step === 'prepared') await markCanteenPrepared(r.mealPlanId);
      else await markCanteenDistributed(r.mealPlanId);
      tk(step === 'prepared' ? 'Đã đánh dấu chuẩn bị xong' : 'Đã phát về khoa phòng');
      await loadCanteen();
    } catch (e) {
      ti((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại');
    } finally { setCanteenBusy(null); }
  };

  const canteenCols: ColumnDef<CanteenQueueItemDto>[] = [
    { key: 'meal', label: 'Bữa', width: 110, render: (r) => MEAL_TYPE_LABEL[r.mealType] || r.mealType },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName },
    { key: 'n', label: 'Số suất', width: 90, mono: true, render: (r) => r.totalPatients },
    { key: 'st', label: 'Trạng thái', width: 130, render: (r) => {
      const c = CANTEEN_STATUS[r.status] || { l: r.status, tone: 'info' as const };
      return <StatusBadge tone={c.tone} dot>{c.l}</StatusBadge>;
    } },
    { key: 'at', label: 'Mốc thời gian', render: (r) => (
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
        {r.approvedAt ? `Duyệt ${dayjs(r.approvedAt).format('HH:mm')}` : ''}
        {r.preparedAt ? ` · CB ${dayjs(r.preparedAt).format('HH:mm')}` : ''}
        {r.distributedAt ? ` · Phát ${dayjs(r.distributedAt).format('HH:mm')}` : ''}
        {!r.approvedAt && !r.preparedAt && !r.distributedAt ? '—' : ''}
      </span>
    ) },
    { key: 'act', label: '', render: (r) => {
      const busy = canteenBusy === r.mealPlanId;
      return (
        <span style={{ display: 'inline-flex', gap: 'var(--space-6)' }}>
          {r.status === 'Planned' && <>
            <Btn variant="primary" icon="check" disabled={busy} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); doApprove(r); }}>Duyệt</Btn>
            <Btn variant="ghost" icon="x" disabled={busy} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); setRejectTarget(r); setRejectReason(''); }}>Từ chối</Btn>
          </>}
          {r.status === 'Approved' && (
            <Btn variant="primary" icon="package" disabled={busy} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); doCanteenStep(r, 'prepared'); }}>Chuẩn bị xong</Btn>
          )}
          {(r.status === 'Approved' || r.status === 'Prepared') && (
            <Btn variant="ok" icon="truck" disabled={busy} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); doCanteenStep(r, 'distributed'); }}>Phát về khoa</Btn>
          )}
          {r.status === 'Distributed' && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Hoàn tất</span>}
          {r.status === 'Rejected' && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Đã từ chối</span>}
        </span>
      );
    } },
  ];

  useEffect(() => { loadScreening(); loadDashboard(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (tab === 'canteen') loadCanteen(); /* eslint-disable-next-line */ }, [tab, canteenDate, canteenMeal]);
  useEffect(() => { if (tab === 'orders') load(); /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { if (tab === 'meals') loadMeals(); /* eslint-disable-next-line */ }, [tab, mealDate]);
  useEffect(() => {
    (async () => {
      try {
        const [dt, ip] = await Promise.all([getDietTypes(), getInpatientList({ pageSize: 300 })]);
        setDietTypeOpts((dt.data || []).map((t) => ({ value: t.code, label: t.name })));
        setAdmissionOpts((ip.data?.items || []).map((p) => ({ value: p.admissionId, label: `${p.patientName} · ${p.bedName || p.roomName || p.departmentName}` })));
      } catch { /* options optional — modal vẫn mở được, chỉ thiếu gợi ý */ }
    })();
  }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);
  const routes = useMemo(() => {
    const set = new Set(items.map((r) => r.feedingRoute || 'Oral').filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.active = items.filter((r) => isActive(r.status)).length;
    c.inactive = items.length - c.active;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'active' && !isActive(r.status)) return false;
      if (stab === 'inactive' && isActive(r.status)) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (fRoute && (r.feedingRoute || 'Oral') !== fRoute) return false;
      if (!k) return true;
      return [r.orderCode, r.patientName, r.patientCode, r.medicalRecordCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept, fRoute]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ── Sàng lọc: dữ liệu dẫn xuất ──
  const combinedScreenings = useMemo(() => {
    const seen = new Set<string>(); const result: NutritionScreeningDto[] = [];
    for (const s of screenPending) if (!seen.has(s.id)) { seen.add(s.id); result.push(s); }
    for (const s of screenAll) if (!seen.has(s.id)) { seen.add(s.id); result.push(s); }
    return result;
  }, [screenPending, screenAll]);

  const screenDepts = useMemo(() => {
    const set = new Set(combinedScreenings.map((r) => r.departmentName).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [combinedScreenings]);

  const screenCounts = useMemo(() => {
    const c: Record<string, number> = { all: combinedScreenings.length };
    SCREEN_TABS.forEach((t) => { c[t.v] = combinedScreenings.filter((r) => screenStatusKey(r.status) === t.v).length; });
    return c;
  }, [combinedScreenings]);

  const screenFiltered = useMemo(() => {
    const k = screenSearch.trim().toLowerCase();
    return combinedScreenings.filter((r) => {
      if (screenStab !== 'all' && screenStatusKey(r.status) !== screenStab) return false;
      if (screenDept && r.departmentName !== screenDept) return false;
      if (screenRisk && (r.riskLevel || '').toLowerCase() !== screenRisk) return false;
      if (!k) return true;
      return [r.patientName, r.medicalRecordCode].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [combinedScreenings, screenSearch, screenStab, screenDept, screenRisk]);

  const screenTotalPages = Math.max(1, Math.ceil(screenFiltered.length / PER));
  const screenPaged = screenFiltered.slice(screenPage * PER, (screenPage + 1) * PER);

  // ── Bữa ăn: dữ liệu dẫn xuất ──
  const mealList = mealPlan?.meals || [];
  const mealFiltered = useMemo(() => {
    const k = mealSearch.trim().toLowerCase();
    return mealList.filter((m) => {
      if (mealTypeFilter && (m.mealType || '').toLowerCase() !== mealTypeFilter.toLowerCase()) return false;
      if (!k) return true;
      return [m.patientName, m.bedNumber].some((v) => (v || '').toLowerCase().includes(k));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlan, mealSearch, mealTypeFilter]);

  const mealTotalPages = Math.max(1, Math.ceil(mealFiltered.length / PER));
  const mealPaged = mealFiltered.slice(mealPage * PER, (mealPage + 1) * PER);

  const mealKpis = useMemo(() => {
    const total = mealList.length;
    const delivered = mealList.filter((m) => m.deliveryStatus >= 2).length;
    const eaten = mealList.filter((m) => m.deliveryStatus === 3).length;
    const avgConsumption = total ? Math.round(mealList.reduce((s, m) => s + (m.consumptionPct || 0), 0) / total) : 0;
    return { total, delivered, eaten, avgConsumption };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlan]);

  const kcal = (r: Row) => r.energyKcal ?? r.calorieLevel ?? '—';
  const protein = (r: Row) => r.proteinGrams ?? r.proteinLevel ?? '—';
  const allergyText = (r: Row) => {
    const a = r.allergies; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };
  const restrictText = (r: Row) => {
    const a = r.restrictions; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã đơn', code: true, render: (r) => r.orderCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode || r.medicalRecordCode || ''}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'diet', label: 'Chế độ ăn', render: (r) => (
      <StatusBadge tone="info">{r.dietTypeName || r.dietType || '—'}</StatusBadge>
    ) },
    { key: 'tex', label: 'Cấu trúc', render: (r) => r.texture || '—' },
    { key: 'kp', label: 'kcal · Pro', mono: true, render: (r) => `${kcal(r)} · ${protein(r)}g` },
    { key: 'route', label: 'Đường', render: (r) => r.feedingRoute || 'Oral' },
    { key: 'allerg', label: 'Dị ứng', render: (r) => {
      const t = allergyText(r);
      return t === '—' ? <span style={{ color: 'var(--t-2)' }}>—</span>
        : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--a-or-text)' }}>{t}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={isActive(r.status) ? 'ok' : 'warn'} dot>{r.statusName || (isActive(r.status) ? 'Đang dùng' : 'Đã ngưng')}</StatusBadge>
    ) },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      {isActive(r.status) && <ActBtn ic="x" title="Ngưng đơn" tone="crit" onClick={() => { setCancelRow(r); setCancelReason(''); }} />}
    </div>
  );

  // ── Sàng lọc: cột + hành động ──
  const openScreeningCreate = (r: NutritionScreeningDto) => {
    setScreenCrudInit({ admissionId: r.admissionId, patientName: r.patientName });
    setScreenCrudOpen(true);
  };

  const screenCols: ColumnDef<NutritionScreeningDto>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.medicalRecordCode || ''}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'tool', label: 'Công cụ', render: (r) => r.screeningTool || '—' },
    { key: 'score', label: 'Điểm', mono: true, render: (r) => {
      const s = r.nrsTotalScore ?? r.mustTotalScore;
      return s != null ? <StatusBadge tone={s >= 3 ? 'crit' : s >= 2 ? 'warn' : 'ok'}>{s}</StatusBadge> : '—';
    } },
    { key: 'risk', label: 'Nguy cơ DD', render: (r) => riskBadge(r.riskLevel) },
    { key: 'date', label: 'Ngày SL', mono: true, render: (r) => r.screeningDate ? dayjs(r.screeningDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = SCREEN_TABS.find((x) => x.v === screenStatusKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const screenActions = (r: NutritionScreeningDto) => (
    <div className="ab-actions">
      {r.status === 0
        ? <ActBtn ic="stethoscope" title="Sàng lọc" onClick={() => openScreeningCreate(r)} />
        : <ActBtn ic="eye" title="Chi tiết" onClick={() => setScreenSel(r)} />}
      {r.status >= 1 && r.requiresAssessment && (
        <ActBtn ic="plus" title="Lập KH dinh dưỡng" tone="warn" onClick={() => openDietCreateFor(r.admissionId)} />
      )}
    </div>
  );

  // ── Bữa ăn: cột ──
  const mealCols: ColumnDef<PlannedMealDto>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (m) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{m.patientName || '—'}</div>
        {m.bedNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>G {m.bedNumber}</div>}
      </div>
    ) },
    { key: 'type', label: 'Bữa ăn', render: (m) => MEAL_TYPE_LABEL[m.mealType] || m.mealType },
    { key: 'time', label: 'Giờ giao', mono: true, render: (m) => m.mealTime || '—' },
    { key: 'kp', label: 'kcal · Pro', mono: true, render: (m) => `${m.energyKcal} · ${m.proteinGrams}g` },
    { key: 'cons', label: 'Tiêu thụ', render: (m) => m.consumptionPct != null
      ? <StatusBadge tone={m.consumptionPct >= 75 ? 'ok' : m.consumptionPct >= 50 ? 'warn' : 'crit'}>{m.consumptionPct}%</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'delivery', label: 'Giao hàng', render: (m) => (
      <StatusBadge tone={DELIVERY_TONE[m.deliveryStatus] ?? 'info'} dot>{DELIVERY_LABEL[m.deliveryStatus] ?? m.deliveryStatus}</StatusBadge>
    ) },
  ];

  return (
    <div className="ab">
      <TopTabs<MainTab> tab={tab} setTab={setTab} tabs={TOP_TABS} />

      {/* ════════════ TAB: SÀNG LỌC DINH DƯỠNG (NRS-2002) ════════════ */}
      {tab === 'screening' && (
        <>
          <KpiStrip items={[
            { lbl: 'Chờ sàng lọc', val: dashboard?.pendingScreening ?? screenCounts.pending ?? 0, sub: 'cần xử lý', tone: 'warn' },
            { lbl: 'Nguy cơ cao', val: dashboard?.highRiskPatients ?? combinedScreenings.filter((r) => (r.riskLevel || '').toLowerCase() === 'high').length, sub: 'cần can thiệp', tone: 'crit' },
            { lbl: 'Đang theo dõi', val: dashboard?.activeAssessments ?? screenCounts.monitoring ?? 0, sub: 'theo dõi DD', tone: 'ok' },
            { lbl: 'Tổng bệnh nhân', val: dashboard?.totalPatients ?? combinedScreenings.length, sub: 'tổng số', tone: 'info' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={screenSearch} onChange={(v) => { setScreenSearch(v); setScreenPage(0); }}
              placeholder="Tìm BN / mã BA / khoa…" />
            <Filter value={screenDept} onChange={setScreenDept} options={screenDepts} placeholder="▾ Khoa" />
            <Filter value={screenRisk} onChange={setScreenRisk} options={RISK_OPTIONS} placeholder="▾ Nguy cơ" />
            <Btn variant="ghost" icon="x" onClick={() => { setScreenSearch(''); setScreenDept(''); setScreenRisk(''); setScreenStab('all'); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadScreening}>Làm mới</Btn>
          </div>

          <StatusTabs<ScreenSKey> value={screenStab} onChange={(v) => { setScreenStab(v); setScreenPage(0); }} tabs={SCREEN_TABS} counts={screenCounts} />

          <DataTable<NutritionScreeningDto>
            columns={screenCols} data={screenPaged} rowKey={(r) => r.id}
            onRowClick={setScreenSel} actions={screenActions}
            empty={screenLoading ? 'Đang tải…' : 'Chưa có bệnh nhân cần sàng lọc'}
          />
          <Pager page={screenPage} setPage={setScreenPage} totalPages={screenTotalPages} total={screenFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!screenSel}
            onClose={() => setScreenSel(null)}
            size="lg"
            title={screenSel ? `Sàng lọc — ${screenSel.patientName || '—'}` : ''}
            sub={screenSel ? `${screenSel.departmentName || '—'} · ${screenSel.screeningTool || 'NRS-2002'}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setScreenSel(null)}>Đóng</Btn>
              <Btn icon="print" onClick={() => screenSel && printPatientDiet(screenSel.admissionId)}>In phiếu DD</Btn>
              {screenSel?.status === 0 && (
                <Btn variant="primary" icon="stethoscope" onClick={() => { if (screenSel) openScreeningCreate(screenSel); setScreenSel(null); }}>Sàng lọc</Btn>
              )}
              {screenSel && screenSel.status >= 1 && screenSel.requiresAssessment && (
                <Btn variant="primary" icon="plus" onClick={() => { openDietCreateFor(screenSel.admissionId); setScreenSel(null); }}>Lập KH</Btn>
              )}
            </>}
          >
            {screenSel && <>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Họ tên">{screenSel.patientName || '—'}</DrField>
                <DrField lbl="Mã BA"><span style={{ fontFamily: 'var(--font-mono)' }}>{screenSel.medicalRecordCode || '—'}</span></DrField>
                <DrField lbl="Khoa">{screenSel.departmentName || '—'}</DrField>
                {screenSel.bedNumber && <DrField lbl="Giường">{screenSel.bedNumber}</DrField>}
              </DrSec>
              <DrSec title="Kết quả sàng lọc">
                <DrField lbl="Mã SL"><span style={{ fontFamily: 'var(--font-mono)' }}>{screenSel.screeningCode || '—'}</span></DrField>
                <DrField lbl="Công cụ">{screenSel.screeningTool || '—'}</DrField>
                <DrField lbl="Ngày SL">{screenSel.screeningDate ? dayjs(screenSel.screeningDate).format('DD/MM/YYYY') : '—'}</DrField>
                <DrField lbl="Tổng điểm">{screenSel.nrsTotalScore ?? screenSel.mustTotalScore ?? '—'}</DrField>
                <DrField lbl="Nguy cơ">{riskBadge(screenSel.riskLevel)}</DrField>
                <DrField lbl="Người SL">{screenSel.screenedByName || screenSel.screenedBy || '—'}</DrField>
                {screenSel.notes && <DrField lbl="Ghi chú">{screenSel.notes}</DrField>}
              </DrSec>
              <DrSec title="Trạng thái">
                <DrField lbl="TT hồ sơ">
                  <StatusBadge tone={SCREEN_TABS.find((t) => t.v === screenStatusKey(screenSel.status))?.tone} dot>
                    {SCREEN_TABS.find((t) => t.v === screenStatusKey(screenSel.status))?.l}
                  </StatusBadge>
                </DrField>
                {screenSel.requiresAssessment && <DrField lbl="Ghi chú">Cần lập kế hoạch dinh dưỡng chi tiết</DrField>}
              </DrSec>
            </>}
          </DrawerShell>

          <CrudModal
            open={screenCrudOpen}
            onClose={() => setScreenCrudOpen(false)}
            title={screenCrudInit?.patientName ? `Sàng lọc NRS-2002 — ${screenCrudInit.patientName}` : 'Sàng lọc dinh dưỡng (NRS-2002)'}
            fields={SCREEN_FIELDS}
            initial={screenCrudInit}
            size="lg"
            onSubmit={async (v) => {
              const admissionId = screenCrudInit?.admissionId as string | undefined;
              if (!admissionId) { te('Thiếu thông tin bệnh nhân'); return; }
              const bmiScore = Number(v.bmiScore) || 0;
              const weightLossScore = Number(v.weightLossScore) || 0;
              const intakeScore = Number(v.intakeScore) || 0;
              const diseaseScore = Number(v.diseaseScore) || 0;
              const totalScore = bmiScore + weightLossScore + intakeScore + diseaseScore;
              await createScreening({
                admissionId,
                screeningTool: 'NRS-2002',
                nrsNutritionalScore: bmiScore + weightLossScore + intakeScore,
                nrsSeverityScore: diseaseScore,
                mustBMIScore: bmiScore,
                mustWeightLossScore: weightLossScore,
                mustAcuteIllnessScore: diseaseScore,
                notes: (v.notes as string) || undefined,
              });
              const riskLabel = totalScore >= 3 ? 'CAO' : totalScore >= 2 ? 'VỪA' : 'THẤP';
              tk(`Đã hoàn thành sàng lọc — Nguy cơ ${riskLabel}`);
              loadScreening();
              loadDashboard();
              if (totalScore >= 2) openDietCreateFor(admissionId);
            }}
          />
        </>
      )}

      {/* ════════════ TAB: CHẾ ĐỘ ĂN CHỈ ĐỊNH ════════════ */}
      {tab === 'orders' && (
        <>
          <KpiStrip items={[
            { lbl: 'Đơn dinh dưỡng', val: items.length, sub: 'tổng' },
            { lbl: 'Đang dùng', val: counts.active, sub: `${Math.round((counts.active / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
            { lbl: 'Nuôi đặc biệt', val: items.filter((d) => (d.feedingRoute || 'Oral').toLowerCase() !== 'oral').length, sub: 'NG / TPN', tone: 'warn' },
            { lbl: 'Có dị ứng', val: items.filter((d) => {
              const a = d.allergies; return Array.isArray(a) ? a.length > 0 : !!a;
            }).length, sub: 'cần chú ý', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm BN / mã đơn / khoa…" />
            <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
            <Filter value={fRoute} onChange={setFRoute} options={routes} placeholder="▾ Đường nuôi" />
            <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setFRoute(''); setStab('all'); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
            <Btn variant="primary" icon="plus" onClick={openCreate}>Đơn mới</Btn>
          </div>

          <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<Row>
            columns={cols} data={paged} rowKey={(r) => r.id}
            onRowClick={setSel} actions={actions}
            empty={loading ? 'Đang tải…' : 'Chưa có đơn dinh dưỡng'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

          <DrawerShell
            open={!!sel}
            onClose={() => setSel(null)}
            size="lg"
            title={sel ? `Đơn ${sel.orderCode || '—'}` : ''}
            sub={sel ? `${sel.patientName || '—'} · ${sel.dietTypeName || sel.dietType || '—'}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
              <Btn icon="print" onClick={() => sel && printDietOrderHtml(sel)}>In thực đơn</Btn>
              {sel && isActive(sel.status) && (
                <Btn variant="crit" icon="x" onClick={() => { setCancelRow(sel); setCancelReason(''); setSel(null); }}>Ngưng đơn</Btn>
              )}
              <Btn variant="primary" icon="edit" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>Chỉnh sửa</Btn>
            </>}
          >
            {sel && <>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Họ tên">{sel.patientName || '—'}</DrField>
                <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || sel.medicalRecordCode || '—'}</span></DrField>
                <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
                {sel.bedNumber && <DrField lbl="Giường">{sel.bedNumber}</DrField>}
              </DrSec>
              <DrSec title="Chế độ ăn">
                <DrField lbl="Loại">{sel.dietTypeName || sel.dietType || '—'}</DrField>
                <DrField lbl="Phân loại">{sel.dietCategory || '—'}</DrField>
                <DrField lbl="Cấu trúc">{sel.texture || '—'}</DrField>
                <DrField lbl="Đường nuôi">{sel.feedingRoute || 'Oral'}</DrField>
                {sel.mealFrequency && <DrField lbl="Số bữa"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.mealFrequency}</span></DrField>}
              </DrSec>
              <DrSec title="Định lượng">
                <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                  <Line label="Năng lượng" value={`${kcal(sel)} kcal`} />
                  <Line label="Protein" value={`${protein(sel)} g`} />
                  {sel.fluidMl && <Line label="Dịch" value={`${sel.fluidMl} ml`} />}
                </div>
              </DrSec>
              <DrSec title="Hạn chế & dị ứng">
                <DrField lbl="Hạn chế">{restrictText(sel)}</DrField>
                <DrField lbl="Dị ứng">{allergyText(sel)}</DrField>
              </DrSec>
              <DrSec title="Chỉ định">
                <DrField lbl="BS">{sel.orderedByName || sel.orderedBy || '—'}</DrField>
                {sel.startDate && <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>}
                {sel.endDate && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={isActive(sel.status) ? 'ok' : 'warn'} dot>
                    {sel.statusName || (isActive(sel.status) ? 'Đang dùng' : 'Đã ngưng')}
                  </StatusBadge>
                </DrField>
              </DrSec>
            </>}
          </DrawerShell>

          <CrudModal
            open={crudOpen}
            onClose={() => setCrudOpen(false)}
            title={crudInit?.id ? 'Cập nhật đơn dinh dưỡng' : 'Đơn dinh dưỡng mới'}
            fields={dietFields}
            initial={crudInit}
            size="lg"
            onSubmit={async (v, editing) => {
              const dto = v as unknown as CreateDietOrderDto;
              if (editing && crudInit?.id) await updateDietOrder(crudInit.id as string, dto);
              else await createDietOrder(dto);
              tk(editing ? 'Đã cập nhật đơn dinh dưỡng' : 'Đã tạo đơn dinh dưỡng');
              load();
            }}
          />

          <ModalShell
            open={!!cancelRow}
            onClose={() => setCancelRow(null)}
            title="Ngưng đơn dinh dưỡng"
            sub={cancelRow?.orderCode}
            size="sm"
            footer={<>
              <Btn variant="ghost" onClick={() => setCancelRow(null)}>Huỷ</Btn>
              <Btn variant="crit" disabled={cancelling} onClick={doCancel}>{cancelling ? 'Đang ngưng…' : 'Ngưng đơn'}</Btn>
            </>}
          >
            <DrField lbl="Lý do ngưng">
              <Input.TextArea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Nhập lý do ngưng đơn…" />
            </DrField>
          </ModalShell>
        </>
      )}

      {/* ════════════ TAB: QUẢN LÝ BỮA ĂN ════════════ */}
      {tab === 'meals' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng bữa ăn', val: mealPlan?.totalPatients ?? mealKpis.total, sub: dayjs(mealDate).format('DD/MM/YYYY'), tone: 'info' },
            { lbl: 'Đã giao', val: mealKpis.delivered, sub: 'suất ăn', tone: 'warn' },
            { lbl: 'Đã ăn', val: mealKpis.eaten, sub: 'suất ăn', tone: 'ok' },
            { lbl: 'Tỉ lệ ăn TB', val: `${mealKpis.avgConsumption}%`, sub: 'tiêu thụ', tone: mealKpis.avgConsumption >= 75 ? 'ok' : mealKpis.avgConsumption >= 50 ? 'warn' : 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={mealSearch} onChange={(v) => { setMealSearch(v); setMealPage(0); }}
              placeholder="Tìm BN / giường…" />
            <input type="date" value={mealDate} onChange={(e) => { setMealDate(e.target.value); setMealPage(0); }} style={DATE_INP} title="Ngày kế hoạch bữa ăn" />
            <Filter value={mealTypeFilter} onChange={(v) => { setMealTypeFilter(v); setMealPage(0); }} options={MEAL_TYPE_OPTIONS} placeholder="▾ Bữa ăn" />
            <Btn variant="ghost" icon="x" onClick={() => { setMealSearch(''); setMealTypeFilter(''); setMealDate(dayjs().format('YYYY-MM-DD')); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadMeals}>Làm mới</Btn>
          </div>

          <DataTable<PlannedMealDto>
            columns={mealCols} data={mealPaged} rowKey={(m) => m.id}
            onRowClick={setMealSel}
            empty={mealLoading ? 'Đang tải…' : 'Chưa có kế hoạch bữa ăn cho ngày này'}
          />
          <Pager page={mealPage} setPage={setMealPage} totalPages={mealTotalPages} total={mealFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!mealSel}
            onClose={() => setMealSel(null)}
            size="md"
            title={mealSel ? `Bữa ${MEAL_TYPE_LABEL[mealSel.mealType] || mealSel.mealType} — ${mealSel.patientName || '—'}` : ''}
            sub={mealSel ? `${mealSel.mealTime || ''} · ${dayjs(mealDate).format('DD/MM/YYYY')}` : ''}
            footer={<Btn variant="ghost" onClick={() => setMealSel(null)}>Đóng</Btn>}
          >
            {mealSel && <>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Họ tên">{mealSel.patientName || '—'}</DrField>
                {mealSel.bedNumber && <DrField lbl="Giường">{mealSel.bedNumber}</DrField>}
              </DrSec>
              <DrSec title="Dinh dưỡng bữa ăn">
                <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                  <Line label="Năng lượng" value={`${mealSel.energyKcal} kcal`} />
                  <Line label="Protein" value={`${mealSel.proteinGrams} g`} />
                  <Line label="Carb" value={`${mealSel.carbGrams} g`} />
                  <Line label="Fat" value={`${mealSel.fatGrams} g`} />
                </div>
              </DrSec>
              {mealSel.menuItems.length > 0 && (
                <DrSec title="Món ăn">
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--t-0)' }}>
                    {mealSel.menuItems.map((it) => (
                      <li key={it.id}>{it.name} <span style={{ color: 'var(--t-2)' }}>({it.energyKcal} kcal)</span></li>
                    ))}
                  </ul>
                </DrSec>
              )}
              <DrSec title="Tình trạng">
                <DrField lbl="Tiêu thụ">{mealSel.consumptionPct != null ? `${mealSel.consumptionPct}%` : '—'}</DrField>
                <DrField lbl="Giao hàng">
                  <StatusBadge tone={DELIVERY_TONE[mealSel.deliveryStatus] ?? 'info'} dot>{DELIVERY_LABEL[mealSel.deliveryStatus] ?? mealSel.deliveryStatus}</StatusBadge>
                </DrField>
                {mealSel.specialInstructions && <DrField lbl="Ghi chú">{mealSel.specialInstructions}</DrField>}
                {mealSel.feedback && <DrField lbl="Phản hồi">{mealSel.feedback}</DrField>}
              </DrSec>
            </>}
          </DrawerShell>
        </>
      )}

      {/* NangCap26 XII.5/XII.6 — Duyệt phiếu suất ăn (khoa dinh dưỡng) + màn hình Nhà ăn */}
      {tab === 'canteen' && (
        <>
          <KpiStrip items={[
            { lbl: 'Chờ duyệt', val: canteen.filter((c) => c.status === 'Planned').length, sub: 'phiếu', tone: 'warn' },
            { lbl: 'Đã duyệt', val: canteen.filter((c) => c.status === 'Approved').length, sub: 'chờ chuẩn bị', tone: 'info' },
            { lbl: 'Đã chuẩn bị', val: canteen.filter((c) => c.status === 'Prepared').length, sub: 'chờ phát', tone: 'info' },
            { lbl: 'Đã phát', val: canteen.filter((c) => c.status === 'Distributed').length, sub: 'hoàn tất', tone: 'ok' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <input type="date" value={canteenDate} onChange={(e) => setCanteenDate(e.target.value)} style={DATE_INP} title="Ngày suất ăn" />
            <Filter value={canteenMeal} onChange={setCanteenMeal} options={MEAL_TYPE_OPTIONS} placeholder="▾ Bữa ăn" />
            <Btn variant="ghost" icon="x" onClick={() => { setCanteenMeal(''); setCanteenDate(dayjs().format('YYYY-MM-DD')); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadCanteen}>Làm mới</Btn>
          </div>

          <DataTable<CanteenQueueItemDto>
            columns={canteenCols} data={canteen} rowKey={(r) => r.mealPlanId}
            empty={canteenLoading ? 'Đang tải…' : 'Chưa có phiếu suất ăn cho ngày này'}
          />

          <ModalShell
            open={!!rejectTarget}
            onClose={() => setRejectTarget(null)}
            size="sm"
            tone="danger"
            title="Từ chối phiếu suất ăn"
            sub={rejectTarget ? `${MEAL_TYPE_LABEL[rejectTarget.mealType] || rejectTarget.mealType} · ${rejectTarget.departmentName}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setRejectTarget(null)}>Hủy</Btn>
              <Btn variant="crit" disabled={!!canteenBusy} onClick={doReject}>Từ chối</Btn>
            </>}
          >
            <label style={{ display: 'grid', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
              Lý do từ chối <span style={{ color: 'var(--a-cr-text)' }}>*</span>
              <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: khoa gửi sai số suất / trùng phiếu…" />
            </label>
          </ModalShell>
        </>
      )}
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--fs-md)' }}>
    <span style={{ color: 'var(--t-2)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--t-0)' }}>{value}</span>
  </div>
);

export default NutritionV2;
