import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTbHivRecords, getTbHivRecordById, getTbHivStatistics, getFollowUps,
  createTbHivRecord, updateTbHivRecord, createFollowUp,
} from '../api/tbHivManagement';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import type {
  TbHivRecordDto, TbHivFollowUpDto, TbHivStatisticsDto,
  CreateTbHivRecordDto, CreateTbHivFollowUpDto,
} from '../api/tbHivManagement';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, tw, fmtDMYg,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────────────────── Trạng thái hồ sơ (0..5, phòng thủ cả enum-name chuỗi từ BE) ───────────────────────────

type StatusKey = 'onTreatment' | 'completed' | 'failed' | 'defaulted' | 'died' | 'transferred';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'onTreatment', l: 'Đang điều trị', tone: 'info' },
  { v: 'completed',   l: 'Hoàn thành',    tone: 'ok' },
  { v: 'failed',      l: 'Thất bại',      tone: 'crit' },
  { v: 'defaulted',   l: 'Bỏ trị',        tone: 'warn' },
  { v: 'died',        l: 'Tử vong',       tone: 'crit' },
  { v: 'transferred', l: 'Chuyển đi',     tone: 'info' },
];
const statusKey = (s: unknown): StatusKey => {
  switch (String(s)) {
    case '1': case 'Completed': return 'completed';
    case '2': case 'Failed': return 'failed';
    case '3': case 'Defaulted': case 'DefaultedLostToFollowUp': return 'defaulted';
    case '4': case 'Died': return 'died';
    case '5': case 'TransferredOut': return 'transferred';
    default: return 'onTreatment';
  }
};

const TYPE_LABEL: Record<number, string> = { 0: 'Lao', 1: 'HIV', 2: 'Đồng nhiễm Lao/HIV' };
const TYPE_TONE: Record<number, string> = { 0: 'ok', 1: 'crit', 2: 'warn' };
const CATEGORY_LABEL: Record<number, string> = {
  0: 'Mới', 1: 'Tái phát', 2: 'Thất bại', 3: 'Bỏ trị quay lại', 4: 'Khác',
};
const ADHERENCE_LABEL: Record<number, string> = { 0: 'Tốt', 1: 'Trung bình', 2: 'Kém' };
const ADHERENCE_TONE: Record<number, string> = { 0: 'ok', 1: 'warn', 2: 'crit' };

// ─────────────────────────── Options dùng chung form ───────────────────────────

const TYPE_OPTIONS = [
  { value: 0, label: 'Lao' },
  { value: 1, label: 'HIV' },
  { value: 2, label: 'Đồng nhiễm Lao/HIV' },
];
const CATEGORY_OPTIONS = [
  { value: 0, label: 'Mới' },
  { value: 1, label: 'Tái phát' },
  { value: 2, label: 'Thất bại' },
  { value: 3, label: 'Bỏ trị quay lại' },
  { value: 4, label: 'Khác' },
];
const AFB_OPTIONS = [
  { value: 'AFB(+)', label: 'AFB dương tính (+)' },
  { value: 'AFB(-)', label: 'AFB âm tính (-)' },
  { value: 'AFB(++)', label: 'AFB (++)' },
  { value: 'AFB(+++)', label: 'AFB (+++)' },
];
const GENEXPERT_OPTIONS = [
  { value: 'MTB detected, RIF sensitive', label: 'MTB(+), nhạy Rifampicin' },
  { value: 'MTB detected, RIF resistant', label: 'MTB(+), kháng Rifampicin' },
  { value: 'MTB not detected', label: 'MTB(-)' },
  { value: 'Invalid', label: 'Không hợp lệ' },
];
const ADHERENCE_OPTIONS = [
  { value: 0, label: 'Tốt' },
  { value: 1, label: 'Trung bình' },
  { value: 2, label: 'Kém' },
];

// Khối Lao/HIV hiện theo loại hồ sơ đang chọn trong modal (parity v1) — ghép trong recFields useMemo
const RECORD_BASE_FIELDS: CrudFieldCfg[] = [
  { key: 'patientId', label: 'Mã bệnh nhân', required: true, placeholder: 'Mã bệnh nhân' },
  { key: 'recordType', label: 'Loại hồ sơ', type: 'select', required: true, options: TYPE_OPTIONS },
  { key: 'treatmentCategory', label: 'Phân loại điều trị', type: 'select', required: true, options: CATEGORY_OPTIONS },
  { key: 'regimen', label: 'Phác đồ điều trị', required: true, placeholder: 'VD: 2RHZE/4RH, TDF/3TC/DTG' },
  { key: 'startDate', label: 'Ngày bắt đầu điều trị', type: 'date', required: true },
];
const RECORD_TB_FIELDS: CrudFieldCfg[] = [
  { key: 'sputumSmearResult', label: 'Kết quả soi đờm (Lao)', type: 'select', options: AFB_OPTIONS },
  { key: 'geneXpertResult', label: 'Kết quả GeneXpert (Lao)', type: 'select', options: GENEXPERT_OPTIONS },
];
const CD4_RULES = [{ type: 'number' as const, min: 0, max: 3000, message: 'CD4 trong khoảng 0–3000' }];
const VL_RULES = [{ type: 'number' as const, min: 0, message: 'Viral Load không âm' }];
const RECORD_HIV_FIELDS: CrudFieldCfg[] = [
  { key: 'cd4Count', label: 'CD4 (tế bào/µL) (HIV)', type: 'number', placeholder: '0', rules: CD4_RULES },
  { key: 'viralLoad', label: 'Viral Load (copies/mL) (HIV)', type: 'number', placeholder: '0', rules: VL_RULES },
  { key: 'artRegimen', label: 'Phác đồ ART (HIV)', placeholder: 'VD: TDF/3TC/DTG' },
];
const RECORD_NOTES_FIELD: CrudFieldCfg = { key: 'notes', label: 'Ghi chú', type: 'textarea', placeholder: 'Ghi chú thêm…' };

const numOrUndef = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);
const strOrUndef = (v: unknown): string | undefined => (v ? String(v) : undefined);

const PER = 20;

// ─────────────────────────── Trang chính ───────────────────────────

const TbHivManagementV2: React.FC = () => {
  const [rows, setRows] = useState<TbHivRecordDto[]>([]);
  const [stats, setStats] = useState<TbHivStatisticsDto>({
    onTreatment: 0, tbCount: 0, hivCount: 0, coInfectionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);

  // Drawer chi tiết + lịch sử điều trị
  const [sel, setSel] = useState<TbHivRecordDto | null>(null);
  const [followUps, setFollowUps] = useState<TbHivFollowUpDto[]>([]);
  const [fuLoading, setFuLoading] = useState(false);

  // Modal tạo/sửa hồ sơ + modal lần điều trị
  const [crudOpen, setCrudOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TbHivRecordDto | null>(null);
  const [fuOpen, setFuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rec, st] = await Promise.allSettled([
        getTbHivRecords({
          pageSize: 500,
          keyword: search.trim() || undefined,
          recordType: typeFilter || undefined,
          treatmentCategory: categoryFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        getTbHivStatistics(),
      ]);
      if (rec.status === 'fulfilled') setRows(rec.value.items);
      if (st.status === 'fulfilled') setStats(st.value);
      // allSettled không ném ra ngoài → catch dưới không thấy; gom 1 toast cho nhánh rejected
      const failed = [rec, st].find((x): x is PromiseRejectedResult => x.status === 'rejected');
      if (failed) tw(friendlyErrorMessage(failed.reason, 'Không thể tải dữ liệu Lao/HIV'));
    } catch { tw('Không thể tải dữ liệu Lao/HIV'); }
    finally { setLoading(false); }
  }, [search, typeFilter, categoryFilter, fromDate, toDate]);
  useEffect(() => {
    setPage(0);
    const t = setTimeout(load, 300); // debounce gõ phím → tránh spam API
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (r: TbHivRecordDto) => {
    setSel(r);
    setFollowUps([]);
    setFuLoading(true);
    // List DTO của BE không có khối XN (soi đờm/CD4/VL/notes) → fetch detail để drawer đủ dữ liệu
    const [detail, fus] = await Promise.allSettled([getTbHivRecordById(r.id), getFollowUps(r.id)]);
    if (detail.status === 'fulfilled') setSel({ ...r, ...detail.value });
    else tw('Không thể tải đầy đủ chi tiết hồ sơ — đang hiển thị dữ liệu tóm tắt');
    if (fus.status === 'fulfilled') setFollowUps(fus.value);
    else tw('Không thể tải lịch sử điều trị');
    setFuLoading(false);
  };

  // Loại hồ sơ đang chọn trong modal → quyết định khối Lao/HIV hiển thị (parity v1)
  const [formRecordType, setFormRecordType] = useState<number | null>(null);
  const openCreate = () => { setEditRecord(null); setFormRecordType(null); setCrudOpen(true); };
  const openEdit = (r: TbHivRecordDto) => { setEditRecord(r); setFormRecordType(r.recordType); setCrudOpen(true); };

  const recFields = useMemo<CrudFieldCfg[]>(() => [
    ...RECORD_BASE_FIELDS,
    ...(formRecordType === 0 || formRecordType === 2 ? RECORD_TB_FIELDS : []),
    ...(formRecordType === 1 || formRecordType === 2 ? RECORD_HIV_FIELDS : []),
    RECORD_NOTES_FIELD,
  ], [formRecordType]);

  // BE không có endpoint in phiếu → dựng phiếu điều trị client-side từ detail + follow-ups
  const handlePrint = async (r: TbHivRecordDto) => {
    let d = r;
    let fus: TbHivFollowUpDto[] = [];
    const [detail, fuRes] = await Promise.allSettled([getTbHivRecordById(r.id), getFollowUps(r.id)]);
    if (detail.status === 'fulfilled') d = { ...r, ...detail.value };
    if (fuRes.status === 'fulfilled') fus = fuRes.value;
    const row = (lbl: string, val: unknown) =>
      `<tr><td class="l">${esc(lbl)}</td><td>${esc(val ?? '—')}</td></tr>`;
    const fuRows = fus.map((f) =>
      `<tr><td>${esc(fmtDMYg(f.visitDate))}</td><td>T${esc(f.treatmentMonth)}</td>` +
      `<td>${esc(ADHERENCE_LABEL[f.drugAdherence] ?? '—')}</td>` +
      `<td>${esc(f.weight != null ? `${f.weight}kg` : '—')}</td>` +
      `<td>${esc([f.sputumSmearResult, f.cd4Count != null ? `CD4 ${f.cd4Count}` : '', f.viralLoad != null ? `VL ${f.viralLoad}` : ''].filter(Boolean).join(' · ') || '—')}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu điều trị ${esc(d.registrationCode)}</title>
<style>
  body{font-family:'Times New Roman',serif;max-width:760px;margin:auto;padding:24px;font-size:14px;color:#000}
  h2{text-align:center;margin:12px 0 4px}  .sub{text-align:center;margin-bottom:16px;font-style:italic}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  td,th{border:1px solid #444;padding:5px 8px;text-align:left;vertical-align:top}
  td.l{width:180px;font-weight:bold;background:#f3f3f3}
  h3{margin:14px 0 6px;font-size:15px}
</style></head><body>
<h2>PHIẾU ĐIỀU TRỊ ${d.recordType === 1 ? 'HIV' : d.recordType === 2 ? 'LAO/HIV' : 'LAO'}</h2>
<div class="sub">Mã đăng ký: ${esc(d.registrationCode)}</div>
<h3>Bệnh nhân</h3>
<table>${row('Họ tên', d.patientName)}${row('Mã BN', d.patientCode)}${row('Loại hồ sơ', TYPE_LABEL[d.recordType])}${row('Phân loại điều trị', CATEGORY_LABEL[d.treatmentCategory] ?? 'Khác')}</table>
<h3>Điều trị</h3>
<table>${row('Phác đồ', d.regimen)}${row('Bắt đầu', fmtDMYg(d.startDate))}${row('Trạng thái', STATUS_TABS.find((x) => x.v === statusKey(d.status))?.l)}${d.recordType !== 1 ? row('Soi đờm (AFB)', d.sputumSmearResult) + row('GeneXpert', d.geneXpertResult) : ''}${d.recordType !== 0 ? row('CD4', d.cd4Count != null ? `${d.cd4Count} tế bào/µL` : '—') + row('Viral Load', d.viralLoad != null ? `${d.viralLoad} copies/mL` : '—') + row('Phác đồ ART', d.artRegimen) : ''}${d.notes ? row('Ghi chú', d.notes) : ''}</table>
<h3>Lịch sử điều trị (${fus.length})</h3>
<table><tr><th>Ngày khám</th><th>Tháng ĐT</th><th>Tuân thủ</th><th>Cân nặng</th><th>Xét nghiệm</th></tr>${fuRows || '<tr><td colspan="5">Chưa có lần điều trị nào</td></tr>'}</table>
</body></html>`;
    openPrintWindow(html, {
      focus: true, print: 'immediate',
      onBlocked: () => tw('Popup bị chặn — hãy cho phép popup để in phiếu'),
    });
  };

  const submitRecord = async (v: Record<string, unknown>, editing: boolean) => {
    const payload: CreateTbHivRecordDto = {
      patientId: String(v.patientId || ''),
      recordType: Number(v.recordType),
      treatmentCategory: Number(v.treatmentCategory),
      regimen: String(v.regimen || ''),
      startDate: String(v.startDate || ''),
      sputumSmearResult: strOrUndef(v.sputumSmearResult),
      geneXpertResult: strOrUndef(v.geneXpertResult),
      cd4Count: numOrUndef(v.cd4Count),
      viralLoad: numOrUndef(v.viralLoad),
      artRegimen: strOrUndef(v.artRegimen),
      notes: strOrUndef(v.notes),
    };
    if (editing && editRecord) {
      await updateTbHivRecord(editRecord.id, payload);
      tk('Đã cập nhật hồ sơ Lao/HIV');
    } else {
      await createTbHivRecord(payload);
      tk('Đã tạo hồ sơ Lao/HIV');
    }
    setEditRecord(null);
    load();
  };

  const recordInitial = useMemo(() => (editRecord ? {
    id: editRecord.id,
    patientId: editRecord.patientId,
    recordType: editRecord.recordType,
    treatmentCategory: editRecord.treatmentCategory,
    regimen: editRecord.regimen,
    startDate: editRecord.startDate,
    sputumSmearResult: editRecord.sputumSmearResult,
    geneXpertResult: editRecord.geneXpertResult,
    cd4Count: editRecord.cd4Count,
    viralLoad: editRecord.viralLoad,
    artRegimen: editRecord.artRegimen,
    notes: editRecord.notes,
  } : null), [editRecord]);

  // Field lần điều trị theo loại hồ sơ đang chọn (Lao → soi đờm, HIV → CD4/VL)
  const fuFields = useMemo<CrudFieldCfg[]>(() => {
    const rt = sel ? Number(sel.recordType) : -1;
    const f: CrudFieldCfg[] = [
      { key: 'visitDate', label: 'Ngày khám', type: 'date', required: true },
      { key: 'treatmentMonth', label: 'Tháng điều trị', type: 'number', placeholder: '1',
        rules: [{ required: true, message: 'Nhập Tháng điều trị' }, { type: 'number', min: 1, max: 36, message: 'Tháng điều trị 1–36' }] },
      { key: 'weight', label: 'Cân nặng (kg)', type: 'number', placeholder: '0',
        rules: [{ type: 'number', min: 0, max: 300, message: 'Cân nặng 0–300kg' }] },
      { key: 'drugAdherence', label: 'Tuân thủ thuốc', type: 'select', required: true, options: ADHERENCE_OPTIONS },
      { key: 'sideEffects', label: 'Tác dụng phụ', type: 'textarea', placeholder: 'Mô tả tác dụng phụ (nếu có)…' },
    ];
    if (rt === 0 || rt === 2) {
      f.push({ key: 'sputumSmearResult', label: 'Kết quả soi đờm', type: 'select', options: AFB_OPTIONS });
    }
    if (rt === 1 || rt === 2) {
      f.push({ key: 'cd4Count', label: 'CD4 (tế bào/µL)', type: 'number', placeholder: '0', rules: CD4_RULES });
      f.push({ key: 'viralLoad', label: 'Viral Load (copies/mL)', type: 'number', placeholder: '0', rules: VL_RULES });
    }
    f.push({ key: 'notes', label: 'Ghi chú', type: 'textarea', placeholder: 'Ghi chú thêm…' });
    return f;
  }, [sel]);

  const submitFollowUp = async (v: Record<string, unknown>) => {
    if (!sel) return;
    const payload: CreateTbHivFollowUpDto = {
      recordId: sel.id,
      visitDate: String(v.visitDate || ''),
      treatmentMonth: Number(v.treatmentMonth),
      weight: numOrUndef(v.weight),
      drugAdherence: Number(v.drugAdherence),
      sideEffects: strOrUndef(v.sideEffects),
      sputumSmearResult: strOrUndef(v.sputumSmearResult),
      cd4Count: numOrUndef(v.cd4Count),
      viralLoad: numOrUndef(v.viralLoad),
      notes: strOrUndef(v.notes),
    };
    await createFollowUp(payload);
    tk('Đã ghi nhận lần điều trị');
    try { setFollowUps(await getFollowUps(sel.id)); } catch { /* đã cảnh báo trong api */ }
  };

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  // keyword/loại/phân loại/ngày đã lọc server-side trong load(); chỉ còn tab trạng thái client-side
  const filtered = useMemo(
    () => rows.filter((r) => stab === 'all' || statusKey(r.status) === stab),
    [rows, stab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const columns: ColumnDef<TbHivRecordDto>[] = [
    { key: 'code', label: 'Mã ĐK', mono: true, width: 120, render: (r) => r.registrationCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode}{r.phoneNumber ? ` · ${r.phoneNumber}` : ''}</i>
      </div>
    ) },
    { key: 'type', label: 'Loại', width: 150,
      render: (r) => <span className={`chip ${TYPE_TONE[r.recordType] || 'info'}`}>{TYPE_LABEL[r.recordType] || '—'}</span> },
    { key: 'category', label: 'Phân loại', width: 120,
      render: (r) => CATEGORY_LABEL[r.treatmentCategory] || 'Khác' },
    { key: 'regimen', label: 'Phác đồ', render: (r) => r.regimen || '—' },
    { key: 'start', label: 'Bắt đầu', mono: true, width: 100, render: (r) => fmtDMYg(r.startDate) },
    { key: 'month', label: 'Tháng ĐT', mono: true, width: 90,
      render: (r) => (r.treatmentMonth ? `T${r.treatmentMonth}` : '—') },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const rowActions = (r: TbHivRecordDto) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Xem chi tiết', primary: true, onClick: () => openDetail(r) },
        { key: 'edit', icon: 'edit', label: 'Chỉnh sửa', primary: true,
          hidden: statusKey(r.status) !== 'onTreatment', onClick: () => openEdit(r) },
        { key: 'print', icon: 'printer', label: 'In phiếu điều trị', onClick: () => handlePrint(r) },
      ]} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang điều trị', val: stats.onTreatment, sub: 'toàn chương trình', tone: 'info' },
        { lbl: 'Lao', val: stats.tbCount, tone: 'ok' },
        { lbl: 'HIV', val: stats.hivCount, tone: 'crit' },
        { lbl: 'Đồng nhiễm Lao/HIV', val: stats.coInfectionCount, tone: 'warn' },
        { lbl: 'Tổng hồ sơ', val: rows.length, sub: 'đang hiển thị' },
        { lbl: 'Bỏ trị', val: counts.defaulted || 0, sub: 'cần truy vết', tone: 'warn' },
      ]} />

      <div className="ab-toolbar">
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ĐK / phác đồ…"
        />
        <Filter
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(0); }}
          options={[{ v: '0', l: 'Lao' }, { v: '1', l: 'HIV' }, { v: '2', l: 'Đồng nhiễm' }]}
          placeholder="▾ Loại bệnh"
        />
        <Filter
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPage(0); }}
          options={CATEGORY_OPTIONS.map((o) => ({ v: String(o.value), l: o.label }))}
          placeholder="▾ Phân loại ĐT"
        />
        <input
          type="date" className="ab-sel" value={fromDate} title="Bắt đầu ĐT từ ngày"
          onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
        />
        <input
          type="date" className="ab-sel" value={toDate} title="Bắt đầu ĐT đến ngày"
          onChange={(e) => { setToDate(e.target.value); setPage(0); }}
        />
        <span className="spacer" />
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm hồ sơ</Btn>
        <Btn variant="ghost" icon="refresh" loading={loading} onClick={load}>Làm mới</Btn>
      </div>

      <StatusTabs<StatusKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<TbHivRecordDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        actions={rowActions}
        empty={loading ? 'Đang tải…' : 'Không có hồ sơ Lao/HIV'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* ── Drawer chi tiết hồ sơ + lịch sử điều trị ── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.registrationCode}</span>
            <span>{sel.patientName}</span>
          </span>
        ) : ''}
        sub={sel ? `${TYPE_LABEL[sel.recordType] || '—'} · ${sel.regimen || '—'} · BĐ ${fmtDMYg(sel.startDate)}` : ''}
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
            <Btn variant="ghost" icon="printer" onClick={() => sel && handlePrint(sel)}>In phiếu</Btn>
            {sel && statusKey(sel.status) === 'onTreatment' && (
              <Btn variant="primary" icon="plus" onClick={() => setFuOpen(true)}>Thêm lần điều trị</Btn>
            )}
          </>
        )}
      >
        {sel && (
          <>
            <DrSec title="Bệnh nhân">
              <DrField lbl="Họ tên"><b>{sel.patientName}</b></DrField>
              <DrField lbl="Mã BN"><span className="mono">{sel.patientCode}</span></DrField>
              <DrField lbl="Mã ĐK">
                <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.registrationCode}</span>
              </DrField>
              {sel.phoneNumber && <DrField lbl="Điện thoại"><span className="mono">{sel.phoneNumber}</span></DrField>}
              {sel.address && <DrField lbl="Địa chỉ">{sel.address}</DrField>}
            </DrSec>

            <DrSec title="Điều trị">
              <DrField lbl="Loại hồ sơ">
                <span className={`chip ${TYPE_TONE[sel.recordType] || 'info'}`}>{TYPE_LABEL[sel.recordType] || '—'}</span>
              </DrField>
              <DrField lbl="Phân loại">{CATEGORY_LABEL[sel.treatmentCategory] || 'Khác'}</DrField>
              <DrField lbl="Phác đồ"><b>{sel.regimen || '—'}</b></DrField>
              <DrField lbl="Bắt đầu">{fmtDMYg(sel.startDate)}</DrField>
              <DrField lbl="Tháng ĐT">{sel.treatmentMonth ? `T${sel.treatmentMonth}` : '—'}</DrField>
              <DrField lbl="Trạng thái">
                {(() => {
                  const t = STATUS_TABS.find((x) => x.v === statusKey(sel.status));
                  return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
                })()}
              </DrField>
              {sel.doctorName && <DrField lbl="Bác sĩ">{sel.doctorName}</DrField>}
            </DrSec>

            {(sel.recordType === 0 || sel.recordType === 2) && (
              <DrSec title="Xét nghiệm Lao">
                <DrField lbl="Soi đờm (AFB)">
                  {sel.sputumSmearResult ? <span className="chip warn">{sel.sputumSmearResult}</span> : '—'}
                </DrField>
                <DrField lbl="GeneXpert">{sel.geneXpertResult || '—'}</DrField>
              </DrSec>
            )}

            {(sel.recordType === 1 || sel.recordType === 2) && (
              <DrSec title="Xét nghiệm HIV">
                <DrField lbl="CD4">
                  {sel.cd4Count != null ? (
                    <b className="mono" style={{ color: sel.cd4Count < 200 ? 'var(--s-crit)' : 'var(--s-ok)' }}>
                      {sel.cd4Count} tế bào/µL
                    </b>
                  ) : '—'}
                </DrField>
                <DrField lbl="Viral Load">
                  {sel.viralLoad != null ? (
                    <b className="mono" style={{ color: sel.viralLoad > 1000 ? 'var(--s-crit)' : 'var(--s-ok)' }}>
                      {sel.viralLoad.toLocaleString()} copies/mL
                    </b>
                  ) : '—'}
                </DrField>
                <DrField lbl="Phác đồ ART">{sel.artRegimen || '—'}</DrField>
              </DrSec>
            )}

            {sel.notes && (
              <DrSec title="Ghi chú">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.notes}</div>
              </DrSec>
            )}

            <DrSec title={`Lịch sử điều trị${followUps.length ? ` (${followUps.length})` : ''}`}>
              {fuLoading ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Đang tải…</div>
              ) : followUps.length === 0 ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Chưa có lần điều trị nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {followUps.map((fu) => (
                    <div key={fu.id} style={{
                      padding: '8px 12px', background: 'var(--bg-1)',
                      border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)', fontSize: 13,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b className="mono">{fmtDMYg(fu.visitDate)}</b>
                        <span className="chip info">T{fu.treatmentMonth}</span>
                        <span className={`chip ${ADHERENCE_TONE[fu.drugAdherence] || 'info'}`}>
                          Tuân thủ: {ADHERENCE_LABEL[fu.drugAdherence] || '—'}
                        </span>
                        {fu.weight != null && <span className="mono" style={{ color: 'var(--t-1)' }}>{fu.weight}kg</span>}
                        {fu.doctorName && <span style={{ color: 'var(--t-2)', fontSize: 12, marginLeft: 'auto' }}>{fu.doctorName}</span>}
                      </div>
                      {(fu.sputumSmearResult || fu.cd4Count != null || fu.viralLoad != null) && (
                        <div className="mono" style={{ marginTop: 4, color: 'var(--t-1)', fontSize: 12 }}>
                          {fu.sputumSmearResult && <span>Đờm: {fu.sputumSmearResult}</span>}
                          {fu.cd4Count != null && <span>{fu.sputumSmearResult ? ' · ' : ''}CD4: {fu.cd4Count}</span>}
                          {fu.viralLoad != null && <span>{(fu.sputumSmearResult || fu.cd4Count != null) ? ' · ' : ''}VL: {fu.viralLoad.toLocaleString()}</span>}
                        </div>
                      )}
                      {fu.sideEffects && (
                        <div style={{ marginTop: 4, color: 'var(--s-crit)', fontSize: 12 }}>Tác dụng phụ: {fu.sideEffects}</div>
                      )}
                      {fu.notes && <div style={{ marginTop: 4, color: 'var(--t-2)', fontSize: 12 }}>{fu.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* ── Modal tạo/sửa hồ sơ ── */}
      <CrudModal
        open={crudOpen}
        onClose={() => { setCrudOpen(false); setEditRecord(null); setFormRecordType(null); }}
        title={editRecord ? 'Chỉnh sửa hồ sơ Lao/HIV' : 'Thêm hồ sơ Lao/HIV'}
        sub="Chọn loại hồ sơ → khối Lao (soi đờm/GeneXpert) / HIV (CD4/VL/ART) hiện tương ứng"
        fields={recFields}
        initial={recordInitial}
        size="lg"
        onSubmit={submitRecord}
        onValuesChange={(ch) => { if ('recordType' in ch) setFormRecordType(ch.recordType as number); }}
      />

      {/* ── Modal thêm lần điều trị (theo dõi) ── */}
      <CrudModal
        open={fuOpen}
        onClose={() => setFuOpen(false)}
        title="Thêm lần điều trị"
        sub={sel ? `${sel.registrationCode} · ${sel.patientName}` : undefined}
        fields={fuFields}
        onSubmit={submitFollowUp}
      />
    </div>
  );
};

export default TbHivManagementV2;
