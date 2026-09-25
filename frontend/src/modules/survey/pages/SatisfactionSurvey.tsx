import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as file from '../../../services/file.service';
import dayjs from 'dayjs';
import { Form, Input, Select, Checkbox, Switch, InputNumber } from 'antd';
import {
  getSurveyResults, contactCallback, createCampaign, exportSurveys,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getConfig, updateConfig,
  getCampaigns, updateCampaignStatus, submitSurveyResult,
  getCallbacks, acknowledgeFeedback,
} from '../api/satisfactionSurvey';
import type {
  CreateCampaignDto, ContactCallbackDto,
  SurveyTemplate, SurveyQuestion, SurveyConfig, Campaign, FeedbackCallback,
} from '../api/satisfactionSurvey';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { downloadCsv, escapeCsvCell } from '../../../utils/csvExport';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, TopTabs, DrawerShell, DrSec, DrField, ModalShell, tk, ti, tw, te, cf, Ico,
  type ColumnDef, type TopTab,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { usePermission } from '../../../hooks/usePermission';

interface SurveyResult {
  id: string;
  patientCode: string;
  patientName: string;
  templateName: string;
  score: number;
  date: string;
  status: string;
  department?: string;
  comment?: string;
  answers?: string;
}

const PER = 18;

type ScoreKey = 'high' | 'mid' | 'low';
const SCORE_TABS = [
  { v: 'high' as ScoreKey, l: 'Hài lòng (≥4)', tone: 'ok' as const },
  { v: 'mid' as ScoreKey,  l: 'Trung bình (3)', tone: 'warn' as const },
  { v: 'low' as ScoreKey,  l: 'Không hài lòng (≤2)', tone: 'crit' as const },
];

const scoreKey = (s: number): ScoreKey => s >= 4 ? 'high' : s >= 3 ? 'mid' : 'low';
const toneFor = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s >= 4.5 ? 'ok' : s >= 3.5 ? 'info' : s >= 2.5 ? 'warn' : 'crit';

type ViewKey = 'results' | 'callbacks' | 'templates' | 'config';
const VIEW_TABS: TopTab<ViewKey>[] = [
  { v: 'results', l: 'Kết quả', ic: 'list' },
  { v: 'callbacks', l: 'Phản hồi cần xử lý', ic: 'phone' },
  { v: 'templates', l: 'Mẫu khảo sát', ic: 'file-text' },
  { v: 'config', l: 'Cấu hình', ic: 'settings' },
];

const TARGET_GROUPS = [
  { value: 'outpatient', label: 'Ngoại trú' },
  { value: 'inpatient', label: 'Nội trú' },
  { value: 'all', label: 'Tất cả' },
];

const QUESTION_TYPES: { value: SurveyQuestion['type']; label: string }[] = [
  { value: 'rating', label: 'Đánh giá 1-5 sao' },
  { value: 'yesno', label: 'Có / Không' },
  { value: 'text', label: 'Văn bản tự do' },
  { value: 'multiple_choice', label: 'Chọn nhiều' },
];

const CHANNEL_OPTIONS = [
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Ứng dụng', value: 'app' },
];

const CAMPAIGN_STATUS: Record<number, { l: string; tone: 'ok' | 'warn' | 'info' | 'crit' }> = {
  0: { l: 'Nháp', tone: 'info' }, 1: { l: 'Đang chạy', tone: 'ok' }, 2: { l: 'Đã đóng', tone: 'warn' }, 3: { l: 'Lưu trữ', tone: 'info' },
};
/** Allowed next statuses — mirrors BE SatisfactionSurveyService.UpdateCampaignStatusAsync. */
const CAMPAIGN_NEXT: Record<number, { to: number; l: string }[]> = {
  0: [{ to: 1, l: 'Kích hoạt' }, { to: 3, l: 'Lưu trữ' }],
  1: [{ to: 2, l: 'Đóng' }],
  2: [{ to: 1, l: 'Mở lại' }, { to: 3, l: 'Lưu trữ' }],
  3: [],
};

type AnswerValue = string | number | string[] | undefined;

/** SurveyFeedbackCallback.Status — BE: 0 Pending · 1 Contacted · 2 Resolved · 3 Closed. */
const CALLBACK_STATUS: Record<number, { l: string; tone: 'ok' | 'warn' | 'info' | 'crit' }> = {
  0: { l: 'Chờ liên hệ', tone: 'crit' }, 1: { l: 'Đã liên hệ', tone: 'warn' }, 2: { l: 'Đã xử lý', tone: 'ok' }, 3: { l: 'Đã đóng', tone: 'info' },
};

const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  autoSend: false, sendDelayHours: 24, channels: ['email'], reminderEnabled: false, reminderAfterHours: 48,
};

const SatisfactionSurveyV2: React.FC = () => {
  // Export carries patient data and needs Report.Export on the server (Admin/Thu ngân) — hide it for others.
  const { can } = usePermission();
  const canExport = can('Report.Export');
  const [view, setView] = useState<ViewKey>('results');
  const [items, setItems] = useState<SurveyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<ScoreKey | 'all'>('all');
  const [fTmpl, setFTmpl] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SurveyResult | null>(null);

  // --- Chiến dịch mới ---
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);
  const [campaignForm] = Form.useForm<{ name: string; description?: string; startDate: string; endDate: string; targetCount?: number; notes?: string; templateId?: string }>();

  const submitCampaign = async () => {
    try {
      const v = await campaignForm.validateFields();
      setCampaignSubmitting(true);
      // QA-R11: a campaign could not be tied to a template from the UI, so "Nhập phiếu" never pre-selected its questions.
      const dto: CreateCampaignDto = {
        name: v.name, description: v.description, startDate: v.startDate, endDate: v.endDate, targetCount: v.targetCount, notes: v.notes,
        templateId: v.templateId, templateName: surveyTemplates.find((t) => t.id === v.templateId)?.name,
      };
      await createCampaign(dto);
      tk('Đã tạo chiến dịch khảo sát');
      setCampaignOpen(false);
      campaignForm.resetFields();
      load();
    } catch { tw('Tạo chiến dịch thất bại'); }
    finally { setCampaignSubmitting(false); }
  };

  // --- Liên hệ phản hồi ---
  const [callbackTarget, setCallbackTarget] = useState<SurveyResult | null>(null);
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);
  const [callbackForm] = Form.useForm<{ issueDescription?: string; contactedByName?: string; resolution?: string }>();

  const submitCallback = async () => {
    if (!callbackTarget) return;
    try {
      const v = await callbackForm.validateFields();
      setCallbackSubmitting(true);
      const dto: ContactCallbackDto = {
        surveyResultId: callbackTarget.id,
        patientCode: callbackTarget.patientCode,
        patientName: callbackTarget.patientName,
        issueDescription: v.issueDescription,
        contactedByName: v.contactedByName,
        resolution: v.resolution,
      };
      await contactCallback(dto);
      tk('Đã ghi nhận liên hệ phản hồi');
      setCallbackTarget(null);
      callbackForm.resetFields();
      load(); loadCallbacks();
    } catch (e) { if ((e as { errorFields?: unknown })?.errorFields) return; tw(friendlyErrorMessage(e, 'Ghi nhận liên hệ thất bại')); }
    finally { setCallbackSubmitting(false); }
  };

  // --- Chiến dịch: danh sách + chuyển trạng thái (QA-R3) ---
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignListOpen, setCampaignListOpen] = useState(false);
  const [campaignBusy, setCampaignBusy] = useState<string | null>(null);
  const loadCampaigns = async () => {
    try { setCampaigns(normalizeArrayResponse<Campaign>((await getCampaigns()).data)); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh sách chiến dịch')); }
  };
  useEffect(() => { loadCampaigns(); }, []);
  const changeCampaignStatus = async (c: Campaign, to: number) => {
    setCampaignBusy(c.id);
    try { await updateCampaignStatus(c.id, to); tk(`Đã chuyển "${c.name}" sang ${CAMPAIGN_STATUS[to]?.l}`); await loadCampaigns(); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không chuyển được trạng thái chiến dịch')); }
    finally { setCampaignBusy(null); }
  };
  const campaignOpts = useMemo(() => campaigns.map((c) => ({ v: c.id, l: `${c.name} (${CAMPAIGN_STATUS[c.status]?.l ?? c.status})` })), [campaigns]);

  // --- Phản hồi cần xử lý (QA-R11: GET /callbacks + acknowledge had no UI — a recorded contact could never be closed) ---
  const [callbacks, setCallbacks] = useState<FeedbackCallback[]>([]);
  const [cbLoading, setCbLoading] = useState(false);
  const [ackTarget, setAckTarget] = useState<FeedbackCallback | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [ackSaving, setAckSaving] = useState(false);
  const loadCallbacks = async () => {
    setCbLoading(true);
    try { setCallbacks(normalizeArrayResponse<FeedbackCallback>((await getCallbacks()).data)); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh sách phản hồi cần xử lý')); }
    finally { setCbLoading(false); }
  };
  useEffect(() => { loadCallbacks(); }, []);
  /** Latest callback per survey result → the results table "TT" column (was always "—"). */
  const cbByResult = useMemo(() => {
    const m = new Map<string, FeedbackCallback>();
    callbacks.forEach((c) => { if (c.surveyResultId && !m.has(c.surveyResultId)) m.set(c.surveyResultId, c); });
    return m;
  }, [callbacks]);
  const submitAck = async () => {
    if (!ackTarget) return;
    setAckSaving(true);
    try {
      await acknowledgeFeedback(ackTarget.id, ackNote.trim() || undefined);
      tk('Đã xác nhận xử lý phản hồi');
      setAckTarget(null);
      loadCallbacks();
    } catch (e) { tw(friendlyErrorMessage(e, 'Xác nhận xử lý thất bại')); }
    finally { setAckSaving(false); }
  };

  // --- Nhập phiếu khảo sát (QA-R3: POST /satisfaction-survey/results); entryQuestions is derived after the template state ---
  const [entryOpen, setEntryOpen] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryCampaign, setEntryCampaign] = useState<string | undefined>();
  const [entryTemplate, setEntryTemplate] = useState<string | undefined>();
  const [entryPatientCode, setEntryPatientCode] = useState('');
  const [entryScore, setEntryScore] = useState<number | null>(null);
  const [entryComment, setEntryComment] = useState('');
  const [entryAnswers, setEntryAnswers] = useState<Record<string, AnswerValue>>({});
  const openEntry = () => {
    setEntryCampaign(undefined); setEntryTemplate(undefined); setEntryPatientCode('');
    setEntryScore(null); setEntryComment(''); setEntryAnswers({});
    if (!surveyTemplates.length) loadTemplates();
    setEntryOpen(true);
  };
  const pickEntryCampaign = (id?: string) => {
    setEntryCampaign(id);
    const c = campaigns.find((x) => x.id === id);
    if (c?.templateId) { setEntryTemplate(c.templateId); setEntryAnswers({}); }
  };
  const submitEntry = async () => {
    const missing = entryQuestions.find((q) => q.required && (entryAnswers[q.id] === undefined || entryAnswers[q.id] === ''
      || (Array.isArray(entryAnswers[q.id]) && (entryAnswers[q.id] as string[]).length === 0)));
    if (missing) { tw(`Chưa trả lời câu bắt buộc: ${missing.text}`); return; }
    // Overall score: entered, else the mean of the rating questions.
    const ratings = entryQuestions.filter((q) => q.type === 'rating').map((q) => Number(entryAnswers[q.id])).filter((n) => n >= 1 && n <= 5);
    const overall = entryScore ?? (ratings.length ? Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10 : null);
    if (overall == null || overall < 1 || overall > 5) { tw('Nhập điểm hài lòng tổng thể (1–5)'); return; }
    setEntrySaving(true);
    try {
      await submitSurveyResult({
        campaignId: entryCampaign,
        templateId: entryTemplate,
        patientCode: entryPatientCode.trim() || undefined,
        overallScore: overall,
        answers: entryQuestions.length ? JSON.stringify(entryAnswers) : undefined,
        comment: entryComment.trim() || undefined,
      });
      tk('Đã ghi nhận phiếu khảo sát');
      setEntryOpen(false);
      load(); loadCampaigns();
    } catch (e) { tw(friendlyErrorMessage(e, 'Ghi nhận phiếu khảo sát thất bại')); }
    finally { setEntrySaving(false); }
  };

  // --- Xuất CSV ---
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportCampaign, setExportCampaign] = useState('');

  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      // QA-R3: BE now filters by campaign
      const res = await exportSurveys(exportCampaign ? { campaignId: exportCampaign, from: '2000-01-01' } : undefined);
      // interceptor không unwrap blob → res.data là Blob
      const blob: Blob = (res as unknown as { data: Blob }).data;
      if (blob instanceof Blob) {
        file.downloadBlob(blob, `khao-sat-hai-long-${dayjs().format('YYYY-MM-DD')}.csv`);
        tk('Đã xuất CSV');
      } else throw new Error('no blob');
    } catch {
      // fallback: xuất từ data đang hiển thị
      const header = ['Mã BN', 'Họ tên', 'Mẫu khảo sát', 'Khoa', 'Điểm', 'Ngày', 'Trạng thái'].map(escapeCsvCell).join(',');
      const rows = filtered.map((r) =>
        [r.patientCode, r.patientName, r.templateName, r.department || '', r.score, r.date ? dayjs(r.date).format('DD/MM/YYYY') : '', r.status]
          .map(escapeCsvCell).join(',')
      );
      downloadCsv(`khao-sat-hai-long-${dayjs().format('YYYY-MM-DD')}.csv`, [header, ...rows]);
      tk('Đã xuất CSV (dữ liệu hiển thị)');
    } finally { setCsvLoading(false); }
  };

  // --- Mẫu khảo sát (template CRUD + question builder) ---
  const [surveyTemplates, setSurveyTemplates] = useState<SurveyTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<SurveyTemplate | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplForm] = Form.useForm<{ name: string; description?: string; targetGroup: string }>();
  const [tplQuestions, setTplQuestions] = useState<SurveyQuestion[]>([]);
  const tplQCounterRef = useRef(0);

  const loadTemplates = async () => {
    setTplLoading(true);
    try {
      const res = await getTemplates();
      setSurveyTemplates(normalizeArrayResponse<SurveyTemplate>(res.data));
    } catch { setSurveyTemplates([]); ti('Không tải được mẫu khảo sát'); }
    finally { setTplLoading(false); }
  };

  const entryQuestions = useMemo(
    () => (surveyTemplates.find((t) => t.id === entryTemplate)?.questions || []).filter((q) => q.text.trim()),
    [surveyTemplates, entryTemplate],
  );

  const openTplModal = (t?: SurveyTemplate) => {
    if (t) {
      setEditingTpl(t);
      tplForm.setFieldsValue({ name: t.name, description: t.description, targetGroup: t.targetGroup });
      setTplQuestions(t.questions || []);
    } else {
      setEditingTpl(null);
      tplForm.resetFields();
      setTplQuestions([]);
    }
    setTplModalOpen(true);
  };

  const addTplQuestion = () => {
    tplQCounterRef.current += 1;
    setTplQuestions((qs) => [...qs, { id: `q_${Date.now()}_${tplQCounterRef.current}`, text: '', type: 'rating', required: true }]);
  };
  const updateTplQuestion = (id: string, patch: Partial<SurveyQuestion>) =>
    setTplQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeTplQuestion = (id: string) => setTplQuestions((qs) => qs.filter((q) => q.id !== id));

  const submitTemplate = async () => {
    try {
      const v = await tplForm.validateFields();
      if (!tplQuestions.some((q) => q.text.trim())) { tw('Cần ít nhất 1 câu hỏi có nội dung'); return; }
      setTplSaving(true);
      const payload: Partial<SurveyTemplate> = {
        name: v.name, description: v.description, targetGroup: v.targetGroup,
        questions: tplQuestions, status: 'active',
      };
      if (editingTpl) {
        await updateTemplate(editingTpl.id, payload);
        tk('Đã cập nhật mẫu khảo sát');
      } else {
        await createTemplate(payload);
        tk('Đã tạo mẫu khảo sát');
      }
      setTplModalOpen(false);
      loadTemplates();
    } catch { tw('Lưu mẫu khảo sát thất bại'); }
    finally { setTplSaving(false); }
  };

  const removeTemplate = (t: SurveyTemplate) => {
    cf(`Xóa mẫu khảo sát "${t.name}"?`, async () => {
      try { await deleteTemplate(t.id); tk('Đã xóa mẫu khảo sát'); loadTemplates(); }
      catch { te('Xóa mẫu khảo sát thất bại'); }
    }, { title: 'Xác nhận xóa mẫu', tone: 'crit', confirm: 'Xóa' });
  };

  // --- Cấu hình gửi khảo sát ---
  const [config, setConfig] = useState<SurveyConfig>(DEFAULT_SURVEY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await getConfig();
      if (res.data) setConfig(res.data);
    } catch { ti('Không tải được cấu hình khảo sát'); }
    finally { setConfigLoading(false); }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try { await updateConfig(config); tk('Đã lưu cấu hình khảo sát'); }
    catch { te('Lưu cấu hình thất bại'); }
    finally { setConfigSaving(false); }
  };

  useEffect(() => {
    if (view === 'templates') loadTemplates();
    if (view === 'config') loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSurveyResults();
      // BE có thể trả mảng thô hoặc { items: [] } — chuẩn hoá. Field name alias do BE evolve.
      interface RawSurveyRow {
        id?: string; patientCode?: string; patientName?: string;
        templateName?: string; score?: number; overallScore?: number;
        date?: string; createdAt?: string;
        status?: string;
        department?: string; departmentName?: string;
        comment?: string; answers?: string;
      }
      const data = normalizeArrayResponse<RawSurveyRow>(res.data);
      const rows: SurveyResult[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        templateName: r.templateName || '',
        // BE GET /results returns overallScore (score was always 0 → every row "—" and KPIs 0)
        score: r.score ?? r.overallScore ?? 0,
        date: r.date || r.createdAt || '',
        status: r.status || '',
        department: r.department || r.departmentName,
        comment: r.comment,
        answers: r.answers,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được phản hồi khảo sát'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const templates = useMemo(() => {
    const set = new Set(items.map((r) => r.templateName).filter(Boolean));
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    SCORE_TABS.forEach((s) => { c[s.v] = items.filter((r) => r.score > 0 && scoreKey(r.score) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && (r.score === 0 || scoreKey(r.score) !== stab)) return false;
      if (fTmpl && r.templateName !== fTmpl) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.templateName].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fTmpl]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));

  const avg = items.length ? items.reduce((s, r) => s + (r.score || 0), 0) / items.length : 0;
  const last30 = items.filter((r) => r.date && dayjs(r.date).isAfter(dayjs().subtract(30, 'day'))).length;
  const npsLike = items.length ? Math.round(((counts.high || 0) - (counts.low || 0)) / items.length * 100) : 0;

  // Department aggregation
  const byDept = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    items.forEach((r) => {
      const d = r.department || 'Khác';
      const m = map.get(d) || { sum: 0, count: 0 };
      m.sum += r.score || 0; m.count += 1;
      map.set(d, m);
    });
    return Array.from(map.entries())
      .map(([d, m]) => ({ d, avg: m.count ? m.sum / m.count : 0, n: m.count }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [items]);

  const cols: ColumnDef<SurveyResult>[] = [
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'tmpl', label: 'Mẫu khảo sát', render: (r) => r.templateName },
    { key: 'dept', label: 'Khoa', render: (r) => r.department || '—' },
    { key: 'score', label: 'Điểm', mono: true, render: (r) => (
      <StatusBadge tone={toneFor(r.score)} dot>{r.score?.toFixed(1) || '—'}</StatusBadge>
    ) },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => r.date ? dayjs(r.date).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'TT', render: (r) => {
      const cb = cbByResult.get(r.id);
      return cb ? <StatusBadge tone={CALLBACK_STATUS[cb.status]?.tone || 'info'} dot>{CALLBACK_STATUS[cb.status]?.l ?? cb.status}</StatusBadge> : (r.status || '—');
    } },
  ];

  // Question texts for the drawer's answers come from the templates (loaded lazily on the templates tab).
  const openDetail = (r: SurveyResult) => { if (!surveyTemplates.length) loadTemplates(); setSel(r); };

  const actions = (r: SurveyResult) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => openDetail(r)} />
      {r.score <= 2 && r.score > 0 && (
        <ActBtn ic="phone" title="Liên hệ phản hồi" onClick={() => { callbackForm.resetFields(); setCallbackTarget(r); }} tone="warn" />
      )}
    </div>
  );

  const tplCols: ColumnDef<SurveyTemplate>[] = [
    { key: 'name', label: 'Tên mẫu', render: (t) => (
      <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{t.name}</div>
    ) },
    { key: 'target', label: 'Đối tượng', render: (t) =>
      TARGET_GROUPS.find((g) => g.value === t.targetGroup)?.label || t.targetGroup || '—' },
    { key: 'qcount', label: 'Số câu hỏi', mono: true, render: (t) => t.questions?.length || 0 },
    { key: 'status', label: 'Trạng thái', render: (t) => (
      <StatusBadge tone={t.status === 'active' ? 'ok' : 'info'} dot>
        {t.status === 'active' ? 'Hoạt động' : 'Ngừng'}
      </StatusBadge>
    ) },
    { key: 'created', label: 'Ngày tạo', mono: true, render: (t) => t.createdAt ? dayjs(t.createdAt).format('DD/MM/YYYY') : '—' },
  ];

  const tplActions = (t: SurveyTemplate) => (
    <div className="ab-actions">
      <ActBtn ic="edit" title="Sửa" onClick={() => openTplModal(t)} />
      <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => removeTemplate(t)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phản hồi', val: items.length, sub: `${last30} trong 30 ngày` },
        { lbl: 'Điểm TB', val: avg.toFixed(2), sub: '/5', tone: toneFor(avg) === 'crit' ? 'crit' : toneFor(avg) === 'warn' ? 'warn' : 'ok' },
        { lbl: '≥4 sao', val: counts.high || 0, sub: `${Math.round(((counts.high || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: '3 sao', val: counts.mid || 0, sub: 'trung bình', tone: 'warn' },
        { lbl: '≤2 sao', val: counts.low || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'NPS-like', val: `${npsLike}%`, sub: 'điểm thuần', tone: npsLike >= 50 ? 'ok' : npsLike >= 0 ? 'warn' : 'crit' },
      ]} />

      <TopTabs<ViewKey> tab={view} setTab={setView} tabs={VIEW_TABS} />

      {view === 'results' && <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mẫu khảo sát…" />
        <Filter value={fTmpl} onChange={setFTmpl} options={templates} placeholder="▾ Mẫu khảo sát" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFTmpl(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await load() }} />
        <Filter value={exportCampaign} onChange={setExportCampaign} options={campaignOpts} placeholder="▾ Xuất theo chiến dịch" />
        {canExport && (
          <Btn variant="ghost" onClick={handleExportCsv} disabled={csvLoading}>
            <Ico name="download" size={12} /> {csvLoading ? 'Đang xuất…' : 'Xuất CSV'}
          </Btn>
        )}
        <Btn variant="ghost" onClick={() => { loadCampaigns(); setCampaignListOpen(true); }}>
          <Ico name="list" size={12} /> Chiến dịch
        </Btn>
        <Btn variant="ghost" onClick={() => { campaignForm.resetFields(); if (!surveyTemplates.length) loadTemplates(); setCampaignOpen(true); }}>
          <Ico name="plus" size={12} /> Chiến dịch mới
        </Btn>
        <Btn variant="primary" onClick={openEntry}>
          <Ico name="edit" size={12} /> Nhập phiếu khảo sát
        </Btn>
      </div>

      <StatusTabs<ScoreKey> value={stab} onChange={setStab} tabs={SCORE_TABS} counts={counts} />

      {/* Top dept performance bars (compact, before table) */}
      {byDept.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--d-1)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-8)' }}>TOP 5 KHOA THEO SỐ PHẢN HỒI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {byDept.map((d) => (
              <div key={d.d} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', fontSize: 'var(--fs-sm)' }}>
                <span style={{ width: 160, color: 'var(--t-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.d}</span>
                <div style={{ flex: 1, height: 12, background: 'var(--bg-1)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
                  <div style={{
                    width: `${(d.n / Math.max(1, byDept[0].n)) * 100}%`,
                    height: '100%',
                    background: toneFor(d.avg) === 'ok' ? 'var(--a-em-line)' : toneFor(d.avg) === 'warn' ? 'var(--a-or-line)' : toneFor(d.avg) === 'crit' ? 'var(--a-rd-line)' : 'var(--a-cy-line)',
                  }} />
                </div>
                <span style={{ width: 50, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--t-0)' }}>{d.n}</span>
                <span style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--t-2)' }}>{d.avg.toFixed(2)}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable<SurveyResult>
        columns={cols} data={filtered} page={page} perPage={PER} onSortChange={() => setPage(0)} rowKey={(r) => r.id}
        onRowClick={openDetail} actions={actions}
        loading={loading}
        empty="Chưa có phản hồi khảo sát"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {view === 'callbacks' && <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ color: 'var(--t-1)', fontWeight: 600 }}>Phản hồi cần xử lý ({callbacks.filter((c) => c.status < 2).length} chưa xong / {callbacks.length})</span>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await loadCallbacks() }} />
      </div>
      <DataTable<FeedbackCallback>
        columns={[
          { key: 'pat', label: 'Bệnh nhân', render: (c) => (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{c.patientName || '—'}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{[c.patientCode, c.patientPhone].filter(Boolean).join(' · ')}</div>
            </div>
          ) },
          { key: 'issue', label: 'Vấn đề', render: (c) => c.issueDescription || '—' },
          { key: 'by', label: 'Người liên hệ', render: (c) => c.contactedByName || '—' },
          { key: 'at', label: 'Liên hệ lúc', mono: true, render: (c) => c.contactedAt ? dayjs(c.contactedAt).format('DD/MM/YYYY HH:mm') : '—' },
          { key: 'res', label: 'Hướng xử lý', render: (c) => c.resolution || '—' },
          { key: 'ack', label: 'Ghi chú xác nhận', render: (c) => c.acknowledgmentNote || '—' },
          { key: 'st', label: 'Trạng thái', render: (c) => (
            <StatusBadge tone={CALLBACK_STATUS[c.status]?.tone || 'info'} dot>{CALLBACK_STATUS[c.status]?.l ?? c.status}</StatusBadge>
          ) },
        ]}
        data={callbacks} rowKey={(c) => c.id}
        actions={(c) => (
          <div className="ab-actions">
            {c.status < 2 && <ActBtn ic="check" title="Xác nhận đã xử lý" onClick={() => { setAckNote(''); setAckTarget(c); }} />}
          </div>
        )}
        loading={cbLoading}
        empty="Chưa có phản hồi cần liên hệ"
      />
      </>}

      {view === 'templates' && <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ color: 'var(--t-1)', fontWeight: 600 }}>Mẫu khảo sát ({surveyTemplates.length})</span>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await loadTemplates() }} />
        <Btn variant="primary" onClick={() => openTplModal()}>
          <Ico name="plus" size={12} /> Thêm mẫu mới
        </Btn>
      </div>
      <DataTable<SurveyTemplate>
        columns={tplCols} data={surveyTemplates} rowKey={(t) => t.id}
        actions={tplActions}
        loading={tplLoading}
        empty="Chưa có mẫu khảo sát"
      />
      </>}

      {view === 'config' && (
        <div style={{ padding: 'var(--space-16)', maxWidth: 560 }}>
          <Form layout="vertical">
            <Form.Item label="Tự động gửi khảo sát sau khi ra viện">
              <Switch
                checked={config.autoSend}
                onChange={(checked) => setConfig((c) => ({ ...c, autoSend: checked }))}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
              />
            </Form.Item>
            <Form.Item label="Thời gian gửi sau khi ra viện (giờ)">
              <InputNumber
                min={1}
                max={168}
                value={config.sendDelayHours}
                onChange={(val) => setConfig((c) => ({ ...c, sendDelayHours: val ?? 24 }))}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item label="Kênh gửi khảo sát">
              <Checkbox.Group
                options={CHANNEL_OPTIONS}
                value={config.channels}
                onChange={(vals) => setConfig((c) => ({ ...c, channels: vals as string[] }))}
              />
            </Form.Item>
            <Form.Item label="Gửi nhắc lại">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
                <Switch
                  checked={config.reminderEnabled}
                  onChange={(checked) => setConfig((c) => ({ ...c, reminderEnabled: checked }))}
                  checkedChildren="Bật"
                  unCheckedChildren="Tắt"
                />
                {config.reminderEnabled && <>
                  <span style={{ color: 'var(--t-1)' }}>Sau</span>
                  <InputNumber
                    min={1}
                    max={168}
                    value={config.reminderAfterHours}
                    onChange={(val) => setConfig((c) => ({ ...c, reminderAfterHours: val ?? 48 }))}
                    style={{ width: 100 }}
                  />
                  <span style={{ color: 'var(--t-1)' }}>giờ</span>
                </>}
              </div>
            </Form.Item>
            <Form.Item>
              <Btn variant="primary" onClick={saveConfig} disabled={configSaving || configLoading}>
                <Ico name="check" size={12} /> {configSaving ? 'Đang lưu…' : 'Lưu cấu hình'}
              </Btn>
            </Form.Item>
          </Form>
        </div>
      )}

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Phản hồi · ${sel.patientName}` : ''}
        sub={sel ? `${sel.patientCode} · ${sel.templateName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => window.print()}>
            <Ico name="print" size={12} /> In
          </Btn>
          {sel && sel.score <= 2 && sel.score > 0 && (
            <Btn variant="primary" onClick={() => { callbackForm.resetFields(); setCallbackTarget(sel); setSel(null); }}>
              <Ico name="phone" size={12} /> Liên hệ BN
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Khoa">{sel.department || '—'}</DrField>
          </DrSec>
          <DrSec title="Khảo sát">
            <DrField lbl="Mẫu">{sel.templateName}</DrField>
            <DrField lbl="Ngày phản hồi">{sel.date ? dayjs(sel.date).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Trạng thái">{cbByResult.get(sel.id) ? CALLBACK_STATUS[cbByResult.get(sel.id)!.status]?.l : (sel.status || '—')}</DrField>
            <DrField lbl="Góp ý">{sel.comment || '—'}</DrField>
          </DrSec>
          {(() => {
            // QA-R11: per-question answers were saved but never shown anywhere.
            let ans: Record<string, AnswerValue> = {};
            try { ans = sel.answers ? JSON.parse(sel.answers) : {}; } catch { ans = {}; }
            const keys = Object.keys(ans);
            if (!keys.length) return null;
            const qText = (id: string) => surveyTemplates.flatMap((t) => t.questions || []).find((q) => q.id === id)?.text || id;
            return (
              <DrSec title="Câu trả lời">
                {keys.map((k) => (
                  <DrField key={k} lbl={qText(k)}>{Array.isArray(ans[k]) ? (ans[k] as string[]).join(', ') : ans[k] === 'yes' ? 'Có' : ans[k] === 'no' ? 'Không' : String(ans[k] ?? '—')}</DrField>
                ))}
              </DrSec>
            );
          })()}
          <DrSec title="Đánh giá">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', color: `var(--a-${toneFor(sel.score) === 'ok' ? 'em' : toneFor(sel.score) === 'warn' ? 'or' : toneFor(sel.score) === 'crit' ? 'rd' : 'cy'}-text)` }}>
                {sel.score?.toFixed(1) || '—'}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>trên 5 sao</div>
              <div style={{ marginTop: 'var(--space-12)' }}>
                <StatusBadge tone={toneFor(sel.score)} dot>
                  {toneFor(sel.score) === 'ok' ? 'Rất hài lòng'
                    : toneFor(sel.score) === 'info' ? 'Hài lòng'
                    : toneFor(sel.score) === 'warn' ? 'Trung bình' : 'Không hài lòng'}
                </StatusBadge>
              </div>
            </div>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Modal tạo chiến dịch */}
      <ModalShell
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        size="md"
        title="Tạo chiến dịch khảo sát"
        footer={<>
          <Btn variant="ghost" onClick={() => setCampaignOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitCampaign} disabled={campaignSubmitting}>
            <Ico name="plus" size={12} /> {campaignSubmitting ? 'Đang tạo…' : 'Tạo chiến dịch'}
          </Btn>
        </>}
      >
        <Form form={campaignForm} layout="vertical">
          <Form.Item name="name" label="Tên chiến dịch" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
            <Input placeholder="VD: Khảo sát hài lòng tháng 6/2026" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về chiến dịch…" />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="templateId" label="Mẫu khảo sát">
            <Select allowClear placeholder="Chọn mẫu dùng cho chiến dịch" options={surveyTemplates.map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="targetCount" label="Mục tiêu số phản hồi">
            <Input type="number" min={1} placeholder="VD: 200" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* QA-R3: danh sách chiến dịch + chuyển trạng thái */}
      <ModalShell
        open={campaignListOpen}
        onClose={() => setCampaignListOpen(false)}
        size="lg"
        title="Chiến dịch khảo sát"
        footer={<Btn variant="ghost" onClick={() => setCampaignListOpen(false)}>Đóng</Btn>}
      >
        <DataTable<Campaign>
          columns={[
            { key: 'name', label: 'Chiến dịch', render: (c) => (
              <div><div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{c.name}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{c.campaignCode}</div></div>
            ) },
            { key: 'time', label: 'Thời gian', mono: true, render: (c) => `${dayjs(c.startDate).format('DD/MM')} – ${dayjs(c.endDate).format('DD/MM/YYYY')}` },
            { key: 'count', label: 'Phiếu', mono: true, render: (c) => `${c.actualCount}/${c.targetCount || '—'}` },
            { key: 'st', label: 'Trạng thái', render: (c) => (
              <StatusBadge tone={CAMPAIGN_STATUS[c.status]?.tone || 'info'} dot>{CAMPAIGN_STATUS[c.status]?.l ?? c.status}</StatusBadge>
            ) },
            { key: 'act', label: '', render: (c) => (
              <span style={{ display: 'inline-flex', gap: 'var(--space-6)' }}>
                {(CAMPAIGN_NEXT[c.status] || []).map((n) => (
                  <Btn key={n.to} variant={n.to === 1 ? 'primary' : 'ghost'} disabled={campaignBusy === c.id}
                    onClick={() => changeCampaignStatus(c, n.to)}>{n.l}</Btn>
                ))}
              </span>
            ) },
          ]}
          data={campaigns} rowKey={(c) => c.id}
          empty="Chưa có chiến dịch khảo sát"
        />
      </ModalShell>

      {/* QA-R3: nhập phiếu khảo sát */}
      <ModalShell
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        size="lg"
        title="Nhập phiếu khảo sát hài lòng"
        footer={<>
          <Btn variant="ghost" onClick={() => setEntryOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitEntry} disabled={entrySaving}>
            <Ico name="check" size={12} /> {entrySaving ? 'Đang lưu…' : 'Lưu phiếu'}
          </Btn>
        </>}
      >
        <Form layout="vertical">
          <Form.Item label="Chiến dịch (đang chạy)">
            <Select allowClear placeholder="Không thuộc chiến dịch" value={entryCampaign} onChange={pickEntryCampaign}
              options={campaigns.filter((c) => c.status === 1).map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item label="Mẫu khảo sát">
            <Select allowClear placeholder="Chọn mẫu để hiện câu hỏi" value={entryTemplate}
              onChange={(v) => { setEntryTemplate(v); setEntryAnswers({}); }}
              options={surveyTemplates.map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item label="Mã bệnh nhân (nếu có)">
            <Input value={entryPatientCode} onChange={(e) => setEntryPatientCode(e.target.value)} placeholder="VD: BN2026…" />
          </Form.Item>
          {entryQuestions.map((q, i) => (
            <Form.Item key={q.id} label={`${i + 1}. ${q.text}`} required={q.required}>
              {q.type === 'rating' ? (
                <Select placeholder="1–5" value={entryAnswers[q.id] as number | undefined}
                  onChange={(v) => setEntryAnswers((a) => ({ ...a, [q.id]: v }))}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ★` }))} style={{ width: 140 }} />
              ) : q.type === 'yesno' ? (
                <Select placeholder="Chọn" value={entryAnswers[q.id] as string | undefined}
                  onChange={(v) => setEntryAnswers((a) => ({ ...a, [q.id]: v }))}
                  options={[{ value: 'yes', label: 'Có' }, { value: 'no', label: 'Không' }]} style={{ width: 140 }} />
              ) : q.type === 'multiple_choice' ? (
                <Select mode="multiple" placeholder="Chọn" value={(entryAnswers[q.id] as string[] | undefined) || []}
                  onChange={(v) => setEntryAnswers((a) => ({ ...a, [q.id]: v }))}
                  options={(q.options || []).map((o) => ({ value: o, label: o }))} />
              ) : (
                <Input.TextArea rows={2} value={(entryAnswers[q.id] as string | undefined) || ''}
                  onChange={(e) => setEntryAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              )}
            </Form.Item>
          ))}
          <Form.Item label="Điểm hài lòng tổng thể (1–5)" extra={entryQuestions.some((q) => q.type === 'rating') ? 'Để trống = trung bình các câu đánh giá' : undefined}>
            <Select allowClear placeholder="1–5" value={entryScore ?? undefined} onChange={(v) => setEntryScore(v ?? null)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ★` }))} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="Góp ý">
            <Input.TextArea rows={2} value={entryComment} onChange={(e) => setEntryComment(e.target.value)} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* Modal liên hệ phản hồi */}
      <ModalShell
        open={!!callbackTarget}
        onClose={() => setCallbackTarget(null)}
        size="md"
        title={callbackTarget ? `Liên hệ phản hồi · ${callbackTarget.patientName}` : 'Liên hệ phản hồi'}
        footer={<>
          <Btn variant="ghost" onClick={() => setCallbackTarget(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitCallback} disabled={callbackSubmitting}>
            <Ico name="phone" size={12} /> {callbackSubmitting ? 'Đang ghi nhận…' : 'Ghi nhận liên hệ'}
          </Btn>
        </>}
      >
        <Form form={callbackForm} layout="vertical">
          <Form.Item name="issueDescription" label="Mô tả vấn đề BN phản ánh" rules={[{ required: true, message: 'Nhập vấn đề người bệnh phản ánh' }]}>
            <Input.TextArea rows={3} placeholder="BN phàn nàn về…" />
          </Form.Item>
          <Form.Item name="contactedByName" label="Người liên hệ (nhân viên)">
            <Input placeholder="Tên nhân viên xử lý" />
          </Form.Item>
          <Form.Item name="resolution" label="Hướng xử lý / kết quả">
            <Input.TextArea rows={2} placeholder="Đã giải thích / hẹn gặp / chuyển khoa…" />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* QA-R11: xác nhận đã xử lý phản hồi (POST /callbacks/{id}/acknowledge) */}
      <ModalShell
        open={!!ackTarget}
        onClose={() => setAckTarget(null)}
        size="md"
        title={ackTarget?.patientName ? `Xác nhận đã xử lý · ${ackTarget.patientName}` : 'Xác nhận đã xử lý'}
        footer={<>
          <Btn variant="ghost" onClick={() => setAckTarget(null)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitAck} disabled={ackSaving}>
            <Ico name="check" size={12} /> {ackSaving ? 'Đang lưu…' : 'Xác nhận'}
          </Btn>
        </>}
      >
        <Form layout="vertical">
          <Form.Item label="Ghi chú xử lý">
            <Input.TextArea rows={3} value={ackNote} onChange={(ev) => setAckNote(ev.target.value)} placeholder="Kết quả xử lý / phản hồi lại BN…" />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* Modal tạo/sửa mẫu khảo sát + question builder */}
      <ModalShell
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        size="lg"
        title={editingTpl ? 'Sửa mẫu khảo sát' : 'Thêm mẫu khảo sát mới'}
        footer={<>
          <Btn variant="ghost" onClick={() => setTplModalOpen(false)}>Hủy</Btn>
          <Btn onClick={addTplQuestion}>
            <Ico name="plus" size={12} /> Thêm câu hỏi
          </Btn>
          <Btn variant="primary" onClick={submitTemplate} disabled={tplSaving}>
            <Ico name="check" size={12} /> {tplSaving ? 'Đang lưu…' : 'Lưu mẫu'}
          </Btn>
        </>}
      >
        <Form form={tplForm} layout="vertical">
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true, message: 'Nhập tên mẫu khảo sát' }]}>
            <Input placeholder="VD: Khảo sát ngoại trú tháng 7/2026" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về mẫu khảo sát…" />
          </Form.Item>
          <Form.Item name="targetGroup" label="Đối tượng" rules={[{ required: true, message: 'Chọn đối tượng khảo sát' }]}>
            <Select options={TARGET_GROUPS} placeholder="Chọn đối tượng khảo sát" />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 'var(--space-12)' }}>
          <div style={{ fontWeight: 600, color: 'var(--t-0)', marginBottom: 'var(--space-8)' }}>
            Danh sách câu hỏi ({tplQuestions.length})
          </div>
          {tplQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-2)' }}>
              Chưa có câu hỏi — nhấn "Thêm câu hỏi" để bắt đầu
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              {tplQuestions.map((q, i) => (
                <div key={q.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-10)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
                    <Input
                      style={{ flex: 1 }}
                      placeholder={`Nội dung câu hỏi ${i + 1}`}
                      value={q.text}
                      onChange={(e) => updateTplQuestion(q.id, { text: e.target.value })}
                    />
                    <Select
                      style={{ width: 168 }}
                      value={q.type}
                      onChange={(v) => updateTplQuestion(q.id, { type: v })}
                      options={QUESTION_TYPES}
                    />
                    <Checkbox
                      checked={q.required}
                      onChange={(e) => updateTplQuestion(q.id, { required: e.target.checked })}
                    >
                      Bắt buộc
                    </Checkbox>
                    <Btn variant="ghost" onClick={() => removeTplQuestion(q.id)}>
                      <Ico name="x" size={12} />
                    </Btn>
                  </div>
                  {q.type === 'multiple_choice' && (
                    <div style={{ marginTop: 'var(--space-8)' }}>
                      <Select
                        mode="tags"
                        style={{ width: '100%' }}
                        placeholder="Nhập lựa chọn rồi Enter…"
                        value={q.options || []}
                        onChange={(vals) => updateTplQuestion(q.id, { options: vals as string[] })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
};

export default SatisfactionSurveyV2;
