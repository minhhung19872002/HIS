// =====================================================================
// HIS Terminal · BÁO CÁO PHẢN ỨNG CÓ HẠI THUỐC (ADR) — v2
// Thông tư 51/2017/TT-BYT
// Module #5 #55-59 — Bound to /api/adr-report
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import { DatePicker, Input, InputNumber, Select } from 'antd';
import {
  getAdrReports,
  saveAdrReport,
  deleteAdrReport,
  getAdrReportSummary,
  type AdrReportDto,
  type AdrReportSummaryDto,
} from '../api/adrReport';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge,
  ActBtn, Btn, DrawerShell, DrSec, DrField, tk, te, cf,
  type ColumnDef,
} from '@/_v2kit';

// ─── Constants ──────────────────────────────────────────────────────────────

type TabKey = 'list' | 'summary';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'list',    l: 'Danh sách báo cáo', ic: 'file-text' },
  { v: 'summary', l: 'Tổng hợp',          ic: 'bar-chart' },
];

const GENDER_OPTS = [
  { value: 0, label: 'Không rõ' },
  { value: 1, label: 'Nam' },
  { value: 2, label: 'Nữ' },
];

const SEVERITY_OPTS = [
  { value: 1, label: '1 — Nhẹ' },
  { value: 2, label: '2 — Trung bình' },
  { value: 3, label: '3 — Nặng' },
  { value: 4, label: '4 — Nguy kịch / Tử vong' },
];

const CAUSALITY_OPTS = [
  { value: 'Chắc chắn',    label: 'Chắc chắn' },
  { value: 'Có khả năng',  label: 'Có khả năng' },
  { value: 'Có thể',       label: 'Có thể' },
  { value: 'Không chắc',   label: 'Không chắc' },
  { value: 'Không phân loại', label: 'Không phân loại' },
];

const ROUTE_OPTS = [
  { value: 'Uống',               label: 'Uống' },
  { value: 'Tiêm tĩnh mạch',    label: 'Tiêm tĩnh mạch' },
  { value: 'Tiêm bắp',          label: 'Tiêm bắp' },
  { value: 'Tiêm dưới da',      label: 'Tiêm dưới da' },
  { value: 'Nhỏ mắt/tai/mũi',  label: 'Nhỏ mắt/tai/mũi' },
  { value: 'Bôi ngoài da',      label: 'Bôi ngoài da' },
  { value: 'Xịt',               label: 'Xịt' },
  { value: 'Khác',              label: 'Khác' },
];

const PER = 20;
const GUID_EMPTY = '00000000-0000-0000-0000-000000000000';

const SEVERITY_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = {
  1: 'ok',
  2: 'warn',
  3: 'crit',
  4: 'crit',
};

const severityLabel = (s: number) =>
  SEVERITY_OPTS.find(o => o.value === s)?.label ?? String(s);

const fmtDate = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '-');

// ─── Edit form state ─────────────────────────────────────────────────────────

type EditState = {
  id?: string;
  patientName: string;
  patientCode: string;
  patientAge: string;
  gender: number;
  weight: number | undefined;
  drugName: string;
  drugDose: string;
  drugRoute: string;
  reactionDescription: string;
  reactionStartDate: string;
  severity: number;
  outcome: string;
  managementTaken: string;
  causality: string;
  reporterName: string;
  reportDate: string;
  notes: string;
};

const EMPTY_EDIT: EditState = {
  patientName: '',
  patientCode: '',
  patientAge: '',
  gender: 0,
  weight: undefined,
  drugName: '',
  drugDose: '',
  drugRoute: '',
  reactionDescription: '',
  reactionStartDate: dayjs().toISOString(),
  severity: 1,
  outcome: '',
  managementTaken: '',
  causality: '',
  reporterName: '',
  reportDate: dayjs().toISOString(),
  notes: '',
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AdrReportsV2: React.FC = () => {
  const [tab, setTab]           = useTabState<TabKey>('list');
  const [rows, setRows]         = useState<AdrReportDto[]>([]);
  const [summary, setSummary]   = useState<AdrReportSummaryDto | null>(null);
  const [search, setSearch]     = useState('');
  const [filterFrom, setFilterFrom] = useState<string | undefined>(undefined);
  const [filterTo, setFilterTo]     = useState<string | undefined>(undefined);
  const [page, setPage]         = useState(0);
  const [edit, setEdit]         = useState<EditState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdrReports({
        from: filterFrom,
        to:   filterTo,
      });
      setRows(data);
    } catch {
      te('Không tải được danh sách ADR');
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo]);

  const reloadSummary = useCallback(async () => {
    try {
      const data = await getAdrReportSummary({ from: filterFrom, to: filterTo });
      setSummary(data);
    } catch {
      te('Không tải được tổng hợp ADR');
    }
  }, [filterFrom, filterTo]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { void reloadSummary(); }, [reloadSummary]);
  useEffect(() => { setPage(0); }, [filterFrom, filterTo]);

  // ── Client-side search ─────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const kw = search.toLowerCase();
    if (!kw) return rows;
    return rows.filter(r =>
      r.patientName.toLowerCase().includes(kw) ||
      (r.patientCode ?? '').toLowerCase().includes(kw) ||
      r.drugName.toLowerCase().includes(kw) ||
      r.reactionDescription.toLowerCase().includes(kw)
    );
  }, [rows, search]);

  const paged = filteredRows.slice(page * PER, (page + 1) * PER);

  // ── KPI strip ──────────────────────────────────────────────────────────────
  const kpis = [
    { lbl: 'Tổng báo cáo',     val: summary?.totalReports    ?? 0, tone: 'info' as const },
    { lbl: 'Nhẹ',              val: summary?.severityMild     ?? 0, tone: 'ok'   as const },
    { lbl: 'Trung bình',       val: summary?.severityModerate ?? 0, tone: 'warn' as const },
    { lbl: 'Nặng',             val: summary?.severitySevere   ?? 0, tone: 'crit' as const },
    { lbl: 'Nguy kịch/TV',     val: summary?.severityCritical ?? 0, tone: 'crit' as const },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const COLS: ColumnDef<AdrReportDto>[] = [
    { key: 'reportDate',    label: 'Ngày báo cáo',  width: 130,
      render: r => fmtDate(r.reportDate) },
    { key: 'patientName',   label: 'Tên bệnh nhân', width: 180 },
    { key: 'patientCode',   label: 'Mã BN',         width: 100, mono: true,
      render: r => r.patientCode ?? '-' },
    { key: 'drugName',      label: 'Thuốc nghi ngờ' },
    { key: 'reactionStartDate', label: 'Ngày khởi phát', width: 130,
      render: r => fmtDate(r.reactionStartDate) },
    { key: 'severity', label: 'Mức độ', width: 160,
      render: r => (
        <StatusBadge tone={SEVERITY_TONE[r.severity] ?? 'info'} dot>
          {severityLabel(r.severity)}
        </StatusBadge>
      ) },
    { key: 'causality',     label: 'Quan hệ nhân quả', width: 150,
      render: r => r.causality ?? '-' },
    { key: 'reporterName',  label: 'Người báo cáo',    width: 160,
      render: r => r.reporterName ?? '-' },
  ];

  // ── Drawer open / close ────────────────────────────────────────────────────
  const openNew = () => setEdit({ ...EMPTY_EDIT });

  const openEdit = (r: AdrReportDto) =>
    setEdit({
      id:                  r.id,
      patientName:         r.patientName,
      patientCode:         r.patientCode ?? '',
      patientAge:          r.patientAge,
      gender:              r.gender,
      weight:              r.weight,
      drugName:            r.drugName,
      drugDose:            r.drugDose ?? '',
      drugRoute:           r.drugRoute ?? '',
      reactionDescription: r.reactionDescription,
      reactionStartDate:   r.reactionStartDate,
      severity:            r.severity,
      outcome:             r.outcome ?? '',
      managementTaken:     r.managementTaken ?? '',
      causality:           r.causality ?? '',
      reporterName:        r.reporterName ?? '',
      reportDate:          r.reportDate,
      notes:               r.notes ?? '',
    });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const onDelete = (id: string) =>
    cf('Xóa phiếu ADR này?', async () => {
      try {
        await deleteAdrReport(id);
        tk('Đã xóa phiếu báo cáo ADR');
        void reload();
        void reloadSummary();
      } catch {
        te('Xóa thất bại');
      }
    }, { tone: 'crit' });

  // ── Save ───────────────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!edit) return;
    if (!edit.drugName.trim()) { te('Vui lòng nhập tên thuốc nghi ngờ'); return; }
    if (!edit.reactionDescription.trim()) { te('Vui lòng mô tả phản ứng có hại'); return; }
    if (!edit.patientName.trim()) { te('Vui lòng nhập tên bệnh nhân'); return; }

    setSaving(true);
    try {
      await saveAdrReport({
        id:                  edit.id ?? GUID_EMPTY,
        patientName:         edit.patientName,
        patientCode:         edit.patientCode || undefined,
        patientAge:          edit.patientAge,
        gender:              edit.gender,
        weight:              edit.weight,
        drugName:            edit.drugName,
        drugDose:            edit.drugDose || undefined,
        drugRoute:           edit.drugRoute || undefined,
        reactionDescription: edit.reactionDescription,
        reactionStartDate:   edit.reactionStartDate,
        severity:            edit.severity,
        outcome:             edit.outcome || undefined,
        managementTaken:     edit.managementTaken || undefined,
        causality:           edit.causality || undefined,
        reporterName:        edit.reporterName || undefined,
        reportDate:          edit.reportDate,
        notes:               edit.notes || undefined,
      });
      tk(edit.id ? 'Đã cập nhật phiếu ADR' : 'Đã tạo phiếu ADR mới');
      setEdit(null);
      void reload();
      void reloadSummary();
    } catch {
      te('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Summary tab content ────────────────────────────────────────────────────
  const renderSummary = () => (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-12)', marginBottom: 'var(--space-24)' }}>
        {[
          { label: 'Tổng số báo cáo',        val: summary?.totalReports ?? 0,    color: 'var(--clr-info)' },
          { label: 'Mức độ nhẹ (1)',          val: summary?.severityMild ?? 0,    color: 'var(--clr-ok)' },
          { label: 'Mức độ trung bình (2)',   val: summary?.severityModerate ?? 0, color: 'var(--clr-warn)' },
          { label: 'Mức độ nặng (3)',         val: summary?.severitySevere ?? 0,  color: 'var(--clr-crit)' },
          { label: 'Nguy kịch / Tử vong (4)', val: summary?.severityCritical ?? 0, color: 'var(--clr-crit)' },
        ].map(item => (
          <div
            key={item.label}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-3)',
              padding: '14px 18px',
            }}
          >
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-6)' }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      {summary && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-3)' }}>
          Khoảng thời gian:{' '}
          {summary.fromDate ? fmtDate(summary.fromDate) : 'Tất cả'} –{' '}
          {summary.toDate   ? fmtDate(summary.toDate)   : 'Tất cả'}
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Báo cáo phản ứng có hại thuốc (ADR)</h2>
        <div className="ab-actions">
          <DatePicker
            placeholder="Từ ngày"
            format="DD/MM/YYYY"
            value={filterFrom ? dayjs(filterFrom) : null}
            onChange={d => { setFilterFrom(d ? d.startOf('day').toISOString() : undefined); setPage(0); }}
            style={{ width: 140 }}
          />
          <DatePicker
            placeholder="Đến ngày"
            format="DD/MM/YYYY"
            value={filterTo ? dayjs(filterTo) : null}
            onChange={d => { setFilterTo(d ? d.endOf('day').toISOString() : undefined); setPage(0); }}
            style={{ width: 140 }}
          />
          <SearchBox
            value={search}
            onChange={v => { setSearch(v); setPage(0); }}
            placeholder="Tên BN, thuốc, phản ứng..."
          />
          <ActBtn ic="plus" title="Tạo phiếu ADR" onClick={openNew} />
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey>
        tabs={TABS}
        tab={tab}
        setTab={t => setTab(t)}
      />

      {tab === 'list' && (
        <>
          <DataTable<AdrReportDto>
            columns={COLS}
            data={paged}
            rowKey={r => r.id}
            loading={loading}
            onRowClick={openEdit}
            actions={row => (
              <ActBtn
                ic="trash"
                title="Xóa"
                tone="crit"
                onClick={e => { e.stopPropagation(); onDelete(row.id); }}
              />
            )}
          />
          <Pager
            page={page}
            totalPages={Math.ceil(filteredRows.length / PER)}
            setPage={setPage}
            total={filteredRows.length}
            perPage={PER}
          />
        </>
      )}

      {tab === 'summary' && renderSummary()}

      {/* ── Edit / Create Drawer ──────────────────────────────────────────── */}
      <DrawerShell
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Chỉnh sửa phiếu ADR' : 'Tạo phiếu ADR mới'}
        footer={
          <>
            <Btn onClick={() => setEdit(null)}>Hủy</Btn>
            <ActBtn ic="save" title="Lưu phiếu" onClick={onSave} loading={saving} />
          </>
        }
      >
        {edit && (
          <>
            {/* ── Thông tin bệnh nhân ─────────────────────────────────── */}
            <DrSec title="Thông tin bệnh nhân">
              <DrField lbl="Họ tên bệnh nhân" required>
                <Input
                  value={edit.patientName}
                  onChange={e => setEdit({ ...edit, patientName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  maxLength={200}
                />
              </DrField>
              <DrField lbl="Mã bệnh nhân">
                <Input
                  value={edit.patientCode}
                  onChange={e => setEdit({ ...edit, patientCode: e.target.value })}
                  placeholder="BN-001234"
                  maxLength={50}
                />
              </DrField>
              <DrField lbl="Tuổi">
                <Input
                  value={edit.patientAge}
                  onChange={e => setEdit({ ...edit, patientAge: e.target.value })}
                  placeholder="35 tuổi / 6 tháng"
                  maxLength={50}
                />
              </DrField>
              <DrField lbl="Giới tính">
                <Select
                  style={{ width: '100%' }}
                  value={edit.gender}
                  onChange={v => setEdit({ ...edit, gender: v })}
                  options={GENDER_OPTS}
                />
              </DrField>
              <DrField lbl="Cân nặng (kg)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={500}
                  precision={1}
                  value={edit.weight}
                  onChange={v => setEdit({ ...edit, weight: v ?? undefined })}
                  placeholder="VD: 65.5"
                />
              </DrField>
            </DrSec>

            {/* ── Thuốc nghi ngờ ──────────────────────────────────────── */}
            <DrSec title="Thuốc nghi ngờ gây phản ứng">
              <DrField lbl="Tên thuốc" required>
                <Input
                  value={edit.drugName}
                  onChange={e => setEdit({ ...edit, drugName: e.target.value })}
                  placeholder="VD: Amoxicillin 500mg"
                  maxLength={500}
                />
              </DrField>
              <DrField lbl="Liều dùng">
                <Input
                  value={edit.drugDose}
                  onChange={e => setEdit({ ...edit, drugDose: e.target.value })}
                  placeholder="VD: 500mg x 3 lần/ngày"
                  maxLength={200}
                />
              </DrField>
              <DrField lbl="Đường dùng">
                <Select
                  style={{ width: '100%' }}
                  value={edit.drugRoute || undefined}
                  onChange={v => setEdit({ ...edit, drugRoute: v ?? '' })}
                  options={ROUTE_OPTS}
                  allowClear
                  placeholder="Chọn đường dùng..."
                />
              </DrField>
            </DrSec>

            {/* ── Phản ứng có hại ─────────────────────────────────────── */}
            <DrSec title="Phản ứng có hại">
              <DrField lbl="Mô tả phản ứng" required>
                <Input.TextArea
                  rows={4}
                  value={edit.reactionDescription}
                  onChange={e => setEdit({ ...edit, reactionDescription: e.target.value })}
                  placeholder="Mô tả chi tiết triệu chứng, biểu hiện phản ứng..."
                />
              </DrField>
              <DrField lbl="Ngày khởi phát">
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  value={edit.reactionStartDate ? dayjs(edit.reactionStartDate) : null}
                  onChange={d => setEdit({ ...edit, reactionStartDate: d ? d.toISOString() : dayjs().toISOString() })}
                />
              </DrField>
              <DrField lbl="Mức độ nghiêm trọng" required>
                <Select
                  style={{ width: '100%' }}
                  value={edit.severity}
                  onChange={v => setEdit({ ...edit, severity: v })}
                  options={SEVERITY_OPTS}
                />
              </DrField>
              <DrField lbl="Kết quả / Hậu quả">
                <Input
                  value={edit.outcome}
                  onChange={e => setEdit({ ...edit, outcome: e.target.value })}
                  placeholder="Hồi phục hoàn toàn / Di chứng / Tử vong..."
                  maxLength={500}
                />
              </DrField>
            </DrSec>

            {/* ── Xử trí & Đánh giá ───────────────────────────────────── */}
            <DrSec title="Xử trí và đánh giá">
              <DrField lbl="Xử trí đã thực hiện">
                <Input.TextArea
                  rows={3}
                  value={edit.managementTaken}
                  onChange={e => setEdit({ ...edit, managementTaken: e.target.value })}
                  placeholder="Ngừng thuốc, dùng thuốc giải, chăm sóc hỗ trợ..."
                />
              </DrField>
              <DrField lbl="Quan hệ nhân quả">
                <Select
                  style={{ width: '100%' }}
                  value={edit.causality || undefined}
                  onChange={v => setEdit({ ...edit, causality: v ?? '' })}
                  options={CAUSALITY_OPTS}
                  allowClear
                  placeholder="Đánh giá theo thuật toán WHO-UMC..."
                />
              </DrField>
            </DrSec>

            {/* ── Thông tin báo cáo ───────────────────────────────────── */}
            <DrSec title="Thông tin báo cáo">
              <DrField lbl="Người báo cáo">
                <Input
                  value={edit.reporterName}
                  onChange={e => setEdit({ ...edit, reporterName: e.target.value })}
                  placeholder="Họ tên bác sĩ / dược sĩ..."
                  maxLength={200}
                />
              </DrField>
              <DrField lbl="Ngày báo cáo" required>
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  value={edit.reportDate ? dayjs(edit.reportDate) : null}
                  onChange={d => setEdit({ ...edit, reportDate: d ? d.toISOString() : dayjs().toISOString() })}
                />
              </DrField>
              <DrField lbl="Ghi chú">
                <Input.TextArea
                  rows={3}
                  value={edit.notes}
                  onChange={e => setEdit({ ...edit, notes: e.target.value })}
                  placeholder="Thông tin bổ sung..."
                />
              </DrField>
            </DrSec>

            {/* Read-only metadata when editing */}
            {edit.id && (
              <DrSec title="Thông tin hệ thống">
                <DrField lbl="ID phiếu">
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--t-3)' }}>
                    {edit.id}
                  </span>
                </DrField>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default AdrReportsV2;
