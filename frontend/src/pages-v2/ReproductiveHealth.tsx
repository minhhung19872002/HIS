import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchPrenatal, createPrenatal, updatePrenatal,
  searchFamilyPlanning, createFamilyPlanning, updateFamilyPlanning,
  getStats, getHighRiskPregnancies,
} from '../modules/specialty/api/reproductiveHealth';
import type { PrenatalRecord, FamilyPlanningRecord, ReproductiveHealthStats } from '../modules/specialty/api/reproductiveHealth';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell, DrSec, DrField, CrudModal,
  useListData, useTabCounts, tk,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from './_v2kit';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');

// ── Prenatal config ───────────────────────────────────────────────────────────

type TabKey = 'qt' | 'khhgd';
type PrenatalStatus = 'active' | 'delivered' | 'completed' | 'cancelled';

const PRENATAL_TABS: StatusTab<PrenatalStatus>[] = [
  { v: 'active',    l: 'Đang theo dõi', tone: 'ok' },
  { v: 'delivered', l: 'Đã sinh',       tone: 'ok' },
  { v: 'completed', l: 'Hoàn tất',      tone: 'info' },
  { v: 'cancelled', l: 'Hủy',           tone: 'crit' },
];

const prenatalStatusKey = (s: number): PrenatalStatus =>
  s === 1 ? 'delivered' : s === 2 ? 'completed' : s === 3 ? 'cancelled' : 'active';

const RISK_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  low: 'ok', medium: 'warn', high: 'crit', very_high: 'crit',
};
const RISK_LABEL: Record<string, string> = {
  low: 'Thấp', medium: 'Trung bình', high: 'Cao', very_high: 'Rất cao',
};
const RISK_OPTIONS = Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l }));

const PRENATAL_CRUD_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName',         label: 'Họ tên sản phụ',      required: true },
  { key: 'patientCode',         label: 'Mã bệnh nhân' },
  { key: 'gestationalWeeks',    label: 'Tuần thai',            type: 'number', required: true },
  { key: 'expectedDeliveryDate',label: 'Ngày dự sinh',         type: 'date',   required: true },
  {
    key: 'riskLevel', label: 'Mức rủi ro', type: 'select', required: true,
    options: [
      { value: 'low',       label: 'Thấp' },
      { value: 'medium',    label: 'Trung bình' },
      { value: 'high',      label: 'Cao' },
      { value: 'very_high', label: 'Rất cao' },
    ],
  },
  { key: 'bloodType', label: 'Nhóm máu' },
  { key: 'gravida',   label: 'Số lần mang thai (G)', type: 'number' },
  { key: 'para',      label: 'Số lần sinh (P)',       type: 'number' },
  { key: 'doctorName',label: 'Bác sĩ phụ trách' },
  { key: 'notes',     label: 'Ghi chú',               type: 'textarea' },
];

// ── Family Planning config ────────────────────────────────────────────────────

type FpStatus = 'active' | 'discontinued' | 'changed';

const FP_TABS: StatusTab<FpStatus>[] = [
  { v: 'active',       l: 'Đang sử dụng',  tone: 'ok' },
  { v: 'discontinued', l: 'Ngừng sử dụng', tone: 'crit' },
  { v: 'changed',      l: 'Đổi biện pháp', tone: 'warn' },
];

const fpStatusKey = (s: number): FpStatus =>
  s === 1 ? 'discontinued' : s === 2 ? 'changed' : 'active';

const METHOD_LABEL: Record<string, string> = {
  iud:           'IUD/Vòng',
  pill:          'Viên uống',
  injection:     'Tiêm',
  implant:       'Que cấy',
  condom:        'Bao cao su',
  sterilization: 'Triệt sản',
  natural:       'Tự nhiên',
  other:         'Khác',
};
const METHOD_OPTIONS = Object.entries(METHOD_LABEL).map(([v, l]) => ({ v, l }));

const FP_CRUD_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Họ tên',        required: true },
  { key: 'patientCode', label: 'Mã bệnh nhân' },
  {
    key: 'method', label: 'Biện pháp', type: 'select', required: true,
    options: [
      { value: 'iud',           label: 'IUD/Vòng' },
      { value: 'pill',          label: 'Viên uống' },
      { value: 'injection',     label: 'Tiêm' },
      { value: 'implant',       label: 'Que cấy' },
      { value: 'condom',        label: 'Bao cao su' },
      { value: 'sterilization', label: 'Triệt sản' },
      { value: 'natural',       label: 'Tự nhiên' },
      { value: 'other',         label: 'Khác' },
    ],
  },
  { key: 'startDate',     label: 'Ngày bắt đầu', type: 'date', required: true },
  { key: 'nextVisitDate', label: 'Ngày tái khám', type: 'date' },
  { key: 'sideEffects',   label: 'Tác dụng phụ' },
  { key: 'doctorName',    label: 'Bác sĩ phụ trách' },
  { key: 'notes',         label: 'Ghi chú', type: 'textarea' },
];

const FP_STATUS_LABEL: Record<FpStatus, string> = {
  active:       'Đang sử dụng',
  discontinued: 'Ngừng sử dụng',
  changed:      'Đổi biện pháp',
};

const EMPTY_STATS: ReproductiveHealthStats = {
  activePregnancies: 0, highRiskCount: 0, familyPlanningActive: 0, deliveriesThisMonth: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

const ReproductiveHealthV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('qt');

  // ── Prenatal state ────────────────────────────────────────────────────────
  const [prenatalRows, setPrenatalRows]   = useState<PrenatalRecord[]>([]);
  const [prenatalLoading, setPrenatalLoading] = useState(true);
  const [serverStats, setServerStats]     = useState<ReproductiveHealthStats>(EMPTY_STATS);

  const [prenatalSearch, setPrenatalSearch] = useState('');
  const [prenatalStatus, setPrenatalStatus] = useState<PrenatalStatus | 'all'>('all');
  const [prenatalRisk,   setPrenatalRisk]   = useState('');
  const [prenatalPage,   setPrenatalPage]   = useState(0);
  const [prenatalSel,    setPrenatalSel]    = useState<PrenatalRecord | null>(null);
  const [prenatalCrudOpen, setPrenatalCrudOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prenatalCrudInit, setPrenatalCrudInit] = useState<Record<string, any> | null>(null);

  const loadPrenatal = useCallback(async () => {
    setPrenatalLoading(true);
    const [prenatalRes, statsRes] = await Promise.allSettled([
      searchPrenatal(),
      getStats(),
      getHighRiskPregnancies(), // parallel warm-up; count comes from stats
    ]);
    if (prenatalRes.status === 'fulfilled') setPrenatalRows(prenatalRes.value);
    if (statsRes.status  === 'fulfilled') setServerStats(statsRes.value);
    setPrenatalLoading(false);
  }, []);

  useEffect(() => { void loadPrenatal(); }, [loadPrenatal]);

  const prenatalFiltered = useMemo(() => {
    let rows = prenatalRows;
    if (prenatalSearch) {
      const kw = prenatalSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.patientName.toLowerCase().includes(kw) ||
        r.patientCode.toLowerCase().includes(kw) ||
        r.recordCode.toLowerCase().includes(kw),
      );
    }
    if (prenatalStatus !== 'all') {
      rows = rows.filter((r) => prenatalStatusKey(r.status) === prenatalStatus);
    }
    if (prenatalRisk) {
      rows = rows.filter((r) => r.riskLevel === prenatalRisk);
    }
    return rows;
  }, [prenatalRows, prenatalSearch, prenatalStatus, prenatalRisk]);

  const prenatalCounts  = useTabCounts(prenatalRows, PRENATAL_TABS, (r) => prenatalStatusKey(r.status));
  const prenatalTotalPg = Math.ceil(prenatalFiltered.length / PAGE_SIZE);
  const prenatalDisplay = prenatalFiltered.slice(prenatalPage * PAGE_SIZE, (prenatalPage + 1) * PAGE_SIZE);

  const prenatalColumns: ColumnDef<PrenatalRecord>[] = useMemo(() => [
    { key: 'code',    label: 'Mã HS',       mono: true, width: 130, render: (r) => r.recordCode },
    {
      key: 'patient', label: 'Sản phụ', render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
      ),
    },
    { key: 'gw',     label: 'Tuần thai',   mono: true, width: 90,  render: (r) => `${r.gestationalWeeks}t` },
    { key: 'gp',     label: 'PARA',        mono: true, width: 100, render: (r) => `G${r.gravida ?? 0}P${r.para ?? 0}` },
    { key: 'edd',    label: 'Dự sinh',     mono: true, width: 110, render: (r) => fmtDMY(r.expectedDeliveryDate) },
    {
      key: 'risk',   label: 'Mức rủi ro',  width: 120, render: (r) => (
        <span className={`chip ${RISK_TONE[r.riskLevel] ?? 'info'}`}>{RISK_LABEL[r.riskLevel] ?? r.riskLevel}</span>
      ),
    },
    { key: 'visits', label: 'Số lần khám', mono: true, width: 100, render: (r) => r.visitCount ?? 0 },
    {
      key: 'status', label: 'TT', width: 140, render: (r) => {
        const sk = prenatalStatusKey(r.status);
        const def = PRENATAL_TABS.find((t) => t.v === sk);
        return <StatusBadge tone={def?.tone} dot>{def?.l}</StatusBadge>;
      },
    },
  ], []);

  // ── Family Planning state ─────────────────────────────────────────────────
  const fpLoader = useCallback(() => searchFamilyPlanning(), []);
  const { rows: fpRows, loading: fpLoading, reload: reloadFP } = useListData(fpLoader);

  const [fpSearch, setFpSearch] = useState('');
  const [fpMethod, setFpMethod] = useState('');
  const [fpStatus, setFpStatus] = useState<FpStatus | 'all'>('all');
  const [fpPage,   setFpPage]   = useState(0);
  const [fpSel,    setFpSel]    = useState<FamilyPlanningRecord | null>(null);
  const [fpCrudOpen, setFpCrudOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fpCrudInit, setFpCrudInit] = useState<Record<string, any> | null>(null);

  const fpFiltered = useMemo(() => {
    let rows = fpRows;
    if (fpSearch) {
      const kw = fpSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.patientName.toLowerCase().includes(kw) ||
        r.patientCode.toLowerCase().includes(kw) ||
        r.recordCode.toLowerCase().includes(kw),
      );
    }
    if (fpStatus !== 'all') {
      rows = rows.filter((r) => fpStatusKey(r.status) === fpStatus);
    }
    if (fpMethod) {
      rows = rows.filter((r) => r.method === fpMethod);
    }
    return rows;
  }, [fpRows, fpSearch, fpStatus, fpMethod]);

  const fpCounts  = useTabCounts(fpRows, FP_TABS, (r) => fpStatusKey(r.status));
  const fpTotalPg = Math.ceil(fpFiltered.length / PAGE_SIZE);
  const fpDisplay = fpFiltered.slice(fpPage * PAGE_SIZE, (fpPage + 1) * PAGE_SIZE);

  const fpColumns: ColumnDef<FamilyPlanningRecord>[] = useMemo(() => [
    { key: 'code',       label: 'Mã HS',       mono: true, width: 130, render: (r) => r.recordCode },
    {
      key: 'patient', label: 'Bệnh nhân', render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
      ),
    },
    { key: 'method',     label: 'Biện pháp',   width: 130, render: (r) => METHOD_LABEL[r.method] ?? r.method },
    { key: 'startDate',  label: 'Bắt đầu',     mono: true, width: 110, render: (r) => fmtDMY(r.startDate) },
    { key: 'nextVisit',  label: 'Tái khám',    mono: true, width: 110, render: (r) => fmtDMY(r.nextVisitDate) },
    { key: 'sideEffect', label: 'Tác dụng phụ', render: (r) => r.sideEffects || '—' },
    { key: 'doctor',     label: 'Bác sĩ',      width: 180, render: (r) => r.doctorName || '—' },
    {
      key: 'status', label: 'TT', width: 140, render: (r) => {
        const sk = fpStatusKey(r.status);
        const def = FP_TABS.find((t) => t.v === sk);
        return <StatusBadge tone={def?.tone} dot>{def?.l}</StatusBadge>;
      },
    },
  ], []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ab-page">
      <TopTabs<TabKey>
        tab={tab}
        setTab={setTab}
        tabs={[
          { v: 'qt',    l: 'Quản thai', ic: 'heart' },
          { v: 'khhgd', l: 'KHHGĐ',    ic: 'users' },
        ]}
      />

      {/* ── Tab 1: Quản thai ─────────────────────────────────────────────── */}
      {tab === 'qt' && (
        <>
          <KpiStrip items={[
            { lbl: 'Thai đang theo dõi', val: serverStats.activePregnancies,   tone: 'ok' },
            { lbl: 'Nguy cơ cao',        val: serverStats.highRiskCount,        tone: 'crit' },
            { lbl: 'Sinh trong tháng',   val: serverStats.deliveriesThisMonth, tone: 'ok' },
            { lbl: 'Đang KHHGĐ',         val: serverStats.familyPlanningActive, tone: 'info' },
          ]} />

          <div className="ab-toolbar">
            <SearchBox
              value={prenatalSearch}
              onChange={(v) => { setPrenatalSearch(v); setPrenatalPage(0); }}
              placeholder="Tìm sản phụ / mã HS…"
            />
            <Filter
              value={prenatalRisk}
              onChange={(v) => { setPrenatalRisk(v); setPrenatalPage(0); }}
              options={RISK_OPTIONS}
              placeholder="▾ Mức rủi ro"
            />
            <span className="spacer" />
            <button
              type="button"
              className="ab-btn primary"
              onClick={() => { setPrenatalCrudInit(null); setPrenatalCrudOpen(true); }}
            >
              + Thêm hồ sơ
            </button>
          </div>

          <StatusTabs<PrenatalStatus>
            value={prenatalStatus}
            onChange={(v) => { setPrenatalStatus(v as PrenatalStatus | 'all'); setPrenatalPage(0); }}
            tabs={PRENATAL_TABS}
            counts={prenatalCounts}
          />

          <DataTable<PrenatalRecord>
            columns={prenatalColumns}
            data={prenatalLoading ? [] : prenatalDisplay}
            rowKey={(r) => r.id}
            onRowClick={(r) => setPrenatalSel(r)}
            actions={(r) => (
              <>
                <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setPrenatalSel(r)} />
                <ActBtn
                  ic="edit"
                  title="Chỉnh sửa"
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setPrenatalCrudInit(r as unknown as Record<string, any>);
                    setPrenatalCrudOpen(true);
                  }}
                />
              </>
            )}
          />

          <Pager
            page={prenatalPage}
            totalPages={prenatalTotalPg}
            setPage={setPrenatalPage}
            total={prenatalFiltered.length}
            perPage={PAGE_SIZE}
          />

          {/* Prenatal detail drawer */}
          <DrawerShell
            open={prenatalSel !== null}
            onClose={() => setPrenatalSel(null)}
            title={prenatalSel ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
                <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{prenatalSel.recordCode}</span>
                <span style={{ fontSize: 14 }}>{prenatalSel.patientName}</span>
              </span>
            ) : ''}
            sub={prenatalSel
              ? `${prenatalSel.gestationalWeeks} tuần · G${prenatalSel.gravida}P${prenatalSel.para} · ${RISK_LABEL[prenatalSel.riskLevel] ?? prenatalSel.riskLevel}`
              : undefined}
          >
            {prenatalSel && (
              <>
                <DrSec title="Sản phụ">
                  <DrField lbl="Họ tên"><b>{prenatalSel.patientName}</b></DrField>
                  <DrField lbl="Mã BN"><span className="mono">{prenatalSel.patientCode}</span></DrField>
                  <DrField lbl="Mã HS"><span className="mono" style={{ color: 'var(--a-cy)' }}>{prenatalSel.recordCode}</span></DrField>
                  {prenatalSel.dateOfBirth && (
                    <DrField lbl="Ngày sinh">{fmtDMY(prenatalSel.dateOfBirth)}</DrField>
                  )}
                  {prenatalSel.bloodType && (
                    <DrField lbl="Nhóm máu"><b>{prenatalSel.bloodType}</b></DrField>
                  )}
                </DrSec>

                <DrSec title="Thai kỳ">
                  <DrField lbl="Tuần thai"><b>{prenatalSel.gestationalWeeks} tuần</b></DrField>
                  <DrField lbl="PARA"><b>G{prenatalSel.gravida}P{prenatalSel.para}</b></DrField>
                  <DrField lbl="Dự sinh">{fmtDMY(prenatalSel.expectedDeliveryDate)}</DrField>
                  <DrField lbl="Mức rủi ro">
                    <span className={`chip ${RISK_TONE[prenatalSel.riskLevel] ?? 'info'}`}>
                      {RISK_LABEL[prenatalSel.riskLevel] ?? prenatalSel.riskLevel}
                    </span>
                  </DrField>
                  <DrField lbl="Số lần khám"><b>{prenatalSel.visitCount ?? 0}</b></DrField>
                  <DrField lbl="Khám gần nhất">{fmtDMY(prenatalSel.lastVisitDate)}</DrField>
                  <DrField lbl="BS phụ trách">{prenatalSel.doctorName || '—'}</DrField>
                </DrSec>

                {prenatalSel.notes && (
                  <DrSec title="Ghi chú">
                    <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
                      {prenatalSel.notes}
                    </div>
                  </DrSec>
                )}
              </>
            )}
          </DrawerShell>

          {/* Prenatal CRUD modal */}
          <CrudModal
            open={prenatalCrudOpen}
            onClose={() => setPrenatalCrudOpen(false)}
            title={prenatalCrudInit ? 'Cập nhật hồ sơ thai phụ' : 'Thêm hồ sơ thai phụ'}
            fields={PRENATAL_CRUD_FIELDS}
            initial={prenatalCrudInit}
            onSubmit={async (values, isEditing) => {
              if (isEditing) {
                await updatePrenatal(values.id as string, values as Partial<PrenatalRecord>);
                tk('Đã cập nhật hồ sơ thai phụ');
              } else {
                await createPrenatal(values as Partial<PrenatalRecord>);
                tk('Đã tạo hồ sơ thai phụ mới');
              }
              void loadPrenatal();
            }}
          />
        </>
      )}

      {/* ── Tab 2: KHHGĐ ─────────────────────────────────────────────────── */}
      {tab === 'khhgd' && (
        <>
          <div className="ab-toolbar">
            <SearchBox
              value={fpSearch}
              onChange={(v) => { setFpSearch(v); setFpPage(0); }}
              placeholder="Tìm bệnh nhân / mã HS…"
            />
            <Filter
              value={fpMethod}
              onChange={(v) => { setFpMethod(v); setFpPage(0); }}
              options={METHOD_OPTIONS}
              placeholder="▾ Biện pháp"
            />
            <span className="spacer" />
            <button
              type="button"
              className="ab-btn primary"
              onClick={() => { setFpCrudInit(null); setFpCrudOpen(true); }}
            >
              + Thêm hồ sơ
            </button>
          </div>

          <StatusTabs<FpStatus>
            value={fpStatus}
            onChange={(v) => { setFpStatus(v as FpStatus | 'all'); setFpPage(0); }}
            tabs={FP_TABS}
            counts={fpCounts}
          />

          <DataTable<FamilyPlanningRecord>
            columns={fpColumns}
            data={fpLoading ? [] : fpDisplay}
            rowKey={(r) => r.id}
            onRowClick={(r) => setFpSel(r)}
            actions={(r) => (
              <>
                <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setFpSel(r)} />
                <ActBtn
                  ic="edit"
                  title="Chỉnh sửa"
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setFpCrudInit(r as unknown as Record<string, any>);
                    setFpCrudOpen(true);
                  }}
                />
              </>
            )}
          />

          <Pager
            page={fpPage}
            totalPages={fpTotalPg}
            setPage={setFpPage}
            total={fpFiltered.length}
            perPage={PAGE_SIZE}
          />

          {/* FP detail drawer */}
          <DrawerShell
            open={fpSel !== null}
            onClose={() => setFpSel(null)}
            title={fpSel ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
                <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{fpSel.recordCode}</span>
                <span style={{ fontSize: 14 }}>{fpSel.patientName}</span>
              </span>
            ) : ''}
            sub={fpSel
              ? `${METHOD_LABEL[fpSel.method] ?? fpSel.method} · ${FP_STATUS_LABEL[fpStatusKey(fpSel.status)]}`
              : undefined}
          >
            {fpSel && (
              <>
                <DrSec title="Bệnh nhân">
                  <DrField lbl="Họ tên"><b>{fpSel.patientName}</b></DrField>
                  <DrField lbl="Mã BN"><span className="mono">{fpSel.patientCode}</span></DrField>
                  <DrField lbl="Mã HS"><span className="mono" style={{ color: 'var(--a-cy)' }}>{fpSel.recordCode}</span></DrField>
                </DrSec>

                <DrSec title="Kế hoạch hóa gia đình">
                  <DrField lbl="Biện pháp"><b>{METHOD_LABEL[fpSel.method] ?? fpSel.method}</b></DrField>
                  <DrField lbl="Bắt đầu">{fmtDMY(fpSel.startDate)}</DrField>
                  <DrField lbl="Tái khám">{fmtDMY(fpSel.nextVisitDate)}</DrField>
                  {fpSel.sideEffects && (
                    <DrField lbl="Tác dụng phụ">{fpSel.sideEffects}</DrField>
                  )}
                  <DrField lbl="BS phụ trách">{fpSel.doctorName || '—'}</DrField>
                  <DrField lbl="Trạng thái">
                    <StatusBadge tone={FP_TABS.find((t) => t.v === fpStatusKey(fpSel.status))?.tone} dot>
                      {FP_STATUS_LABEL[fpStatusKey(fpSel.status)]}
                    </StatusBadge>
                  </DrField>
                </DrSec>

                {fpSel.notes && (
                  <DrSec title="Ghi chú">
                    <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
                      {fpSel.notes}
                    </div>
                  </DrSec>
                )}
              </>
            )}
          </DrawerShell>

          {/* FP CRUD modal */}
          <CrudModal
            open={fpCrudOpen}
            onClose={() => setFpCrudOpen(false)}
            title={fpCrudInit ? 'Cập nhật hồ sơ KHHGĐ' : 'Thêm hồ sơ KHHGĐ'}
            fields={FP_CRUD_FIELDS}
            initial={fpCrudInit}
            onSubmit={async (values, isEditing) => {
              if (isEditing) {
                await updateFamilyPlanning(values.id as string, values as Partial<FamilyPlanningRecord>);
                tk('Đã cập nhật hồ sơ KHHGĐ');
              } else {
                await createFamilyPlanning(values as Partial<FamilyPlanningRecord>);
                tk('Đã tạo hồ sơ KHHGĐ mới');
              }
              reloadFP();
            }}
          />
        </>
      )}
    </div>
  );
};

export default ReproductiveHealthV2;
