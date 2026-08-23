import React, { useCallback, useEffect, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';

const { RangePicker } = DatePicker;
import {
  getChronicRecords, getChronicStatistics, getFollowUps,
  createChronicRecord, updateChronicRecord, closeChronicRecord,
  removeChronicRecord, reopenChronicRecord, createFollowUp,
} from '../api/chronicDisease';
import type {
  ChronicRecordDto, ChronicFollowUpDto, ChronicStatisticsDto, CreateChronicRecordDto,
} from '../api/chronicDisease';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, tw, cf,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';
import { RowActions, RefreshButton } from '../../../components/actions';

// ─── Trạng thái hồ sơ: 0=đang theo dõi · 1=cần tái khám · 2=đã đóng · 3=đã loại ───
type TabKey = 'active' | 'followup' | 'closed';
const STATUS_TABS: StatusTab<TabKey>[] = [
  { v: 'active', l: 'Đang theo dõi', tone: 'ok' },
  { v: 'followup', l: 'Cần tái khám', tone: 'warn' },
  { v: 'closed', l: 'Đã đóng', tone: 'info' },
];
// Backend lọc theo status dạng chuỗi: Active / Remission / Closed (giữ nguyên mapping v1)
const TAB_STATUS_PARAM: Record<TabKey, string> = { active: 'Active', followup: 'Remission', closed: 'Closed' };

const STATUS_META: Record<number, { l: string; tone: 'ok' | 'info' | 'warn' | 'crit' }> = {
  0: { l: 'Đang theo dõi', tone: 'ok' },
  1: { l: 'Cần tái khám', tone: 'warn' },
  2: { l: 'Đã đóng', tone: 'info' },
  3: { l: 'Đã loại', tone: 'crit' },
};
// Trạng thái lần tái khám: 0=đã hẹn · 1=đã khám · 2=bỏ lỡ
const FU_META: Record<number, { l: string; tone: 'ok' | 'info' | 'warn' | 'crit' }> = {
  0: { l: 'Đã hẹn', tone: 'info' },
  1: { l: 'Đã khám', tone: 'ok' },
  2: { l: 'Bỏ lỡ', tone: 'crit' },
};

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const EMPTY_STATS: ChronicStatisticsDto = { totalActive: 0, needFollowUp: 0, newThisMonth: 0, closedOrRemoved: 0 };
const PER = 20;

const INP: React.CSSProperties = {
  height: 30, padding: '0 8px', background: 'var(--bg-1)', color: 'var(--t-0)',
  border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)',
};

const CRUD_FIELDS: CrudFieldCfg[] = [
  { key: 'patientId', label: 'Mã bệnh nhân', required: true, placeholder: 'Nhập mã bệnh nhân' },
  { key: 'icdCode', label: 'Mã ICD', required: true, placeholder: 'VD: E11, I10, J45' },
  { key: 'diagnosisDate', label: 'Ngày chẩn đoán', required: true, type: 'date' },
  {
    key: 'followUpIntervalDays', label: 'Chu kỳ tái khám (ngày)', type: 'number', placeholder: '30',
    rules: [
      { required: true, message: 'Nhập chu kỳ tái khám' },
      { type: 'number', min: 1, max: 365, message: 'Chu kỳ từ 1 đến 365 ngày' },
    ],
  },
  { key: 'doctorId', label: 'Mã bác sĩ phụ trách', placeholder: 'Mã bác sĩ (tùy chọn)' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea', placeholder: 'Ghi chú thêm về tình trạng bệnh…' },
];

const ChronicDiseaseV2: React.FC = () => {
  const [rows, setRows] = useState<ChronicRecordDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChronicStatisticsDto>(EMPTY_STATS);

  const [tab, setTab] = useTabState<TabKey | 'all'>('active');
  const [search, setSearch] = useState('');
  const [icd, setIcd] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);

  const [sel, setSel] = useState<ChronicRecordDto | null>(null);
  const [fups, setFups] = useState<ChronicFollowUpDto[]>([]);
  const [fupsLoading, setFupsLoading] = useState(false);

  const [crudOpen, setCrudOpen] = useState(false);
  const [editRec, setEditRec] = useState<ChronicRecordDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rec, st] = await Promise.all([
        getChronicRecords({
          keyword: search.trim() || undefined,
          status: tab === 'all' ? undefined : TAB_STATUS_PARAM[tab],
          icdCode: icd.trim() || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: page + 1,
          pageSize: PER,
        }),
        getChronicStatistics(),
      ]);
      const items: ChronicRecordDto[] = Array.isArray(rec?.items)
        ? rec.items
        : Array.isArray(rec) ? (rec as unknown as ChronicRecordDto[]) : [];
      setRows(items);
      setTotal(typeof rec?.totalCount === 'number' ? rec.totalCount : items.length);
      setStats({ ...EMPTY_STATS, ...(st || {}) });
    } catch {
      tw('Không thể tải dữ liệu bệnh mạn tính');
    } finally {
      setLoading(false);
    }
  }, [tab, search, icd, fromDate, toDate, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (r: ChronicRecordDto) => {
    setSel(r);
    setFups([]);
    setFupsLoading(true);
    try {
      const f = await getFollowUps(r.id);
      setFups(Array.isArray(f) ? f : []);
    } catch {
      tw('Không thể tải lịch sử tái khám');
    } finally {
      setFupsLoading(false);
    }
  };

  const doClose = async (r: ChronicRecordDto) => {
    try { await closeChronicRecord(r.id, 'Đóng hồ sơ'); tk('Đã đóng hồ sơ'); load(); }
    catch { tw('Không thể đóng hồ sơ'); }
  };
  const doRemove = async (r: ChronicRecordDto) => {
    try { await removeChronicRecord(r.id); tk('Đã loại bỏ hồ sơ'); load(); }
    catch { tw('Không thể loại bỏ hồ sơ'); }
  };
  // "Mở lại hồ sơ" không có confirm chặn → cần guard in-flight chống double-click (#467 double-submit)
  const [reopening, setReopening] = useState<string | null>(null);
  const doReopen = async (r: ChronicRecordDto) => {
    if (reopening) return;
    setReopening(r.id);
    try { await reopenChronicRecord(r.id); tk('Đã mở lại hồ sơ'); load(); }
    catch { tw('Không thể mở lại hồ sơ'); }
    finally { setReopening(null); }
  };

  const addFollowUp = () => {
    if (!sel) return;
    const rec = sel;
    cf(
      `Ghi nhận tái khám cho BN ${rec.patientName} (${rec.icdCode} – ${rec.icdName}) — ngày ${dayjs().format('DD/MM/YYYY')}?`,
      () => {
        void (async () => {
          try {
            await createFollowUp({
              chronicRecordId: rec.id,
              visitDate: dayjs().format('YYYY-MM-DD'),
              notes: 'Tái khám định kỳ',
            });
            tk('Đã ghi nhận lần tái khám');
            const f = await getFollowUps(rec.id);
            setFups(Array.isArray(f) ? f : []);
            load();
          } catch {
            tw('Không thể ghi nhận tái khám');
          }
        })();
      },
      { title: 'Thêm lần tái khám', confirm: 'Lưu' },
    );
  };

  const counts: Record<string, number> = {
    active: stats.totalActive,
    followup: stats.needFollowUp,
    closed: stats.closedOrRemoved,
    all: stats.totalActive + stats.needFollowUp + stats.closedOrRemoved,
  };
  const totalPages = Math.max(1, Math.ceil(total / PER));

  const columns: ColumnDef<ChronicRecordDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}{r.phoneNumber ? ` · ${r.phoneNumber}` : ''}</i>
        </div>
      ),
    },
    {
      key: 'dx', label: 'ICD · Bệnh',
      render: (r) => (
        <div className="cell-2l">
          <b className="mono" style={{ color: 'var(--a-cy)' }}>{r.icdCode}</b>
          <i>{r.icdName}</i>
        </div>
      ),
    },
    { key: 'dxDate', label: 'Ngày CĐ', mono: true, width: 100, render: (r) => fmtDMY(r.diagnosisDate) },
    { key: 'doctor', label: 'BS phụ trách', width: 170, render: (r) => r.doctorName || '—' },
    {
      key: 'cycle', label: 'Chu kỳ', mono: true, width: 80,
      render: (r) => (r.followUpIntervalDays ? `${r.followUpIntervalDays} ngày` : '—'),
    },
    {
      key: 'next', label: 'Tái khám tiếp', mono: true, width: 110,
      render: (r) => {
        if (!r.nextFollowUpDate) return '—';
        const days = dayjs(r.nextFollowUpDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days <= 7 ? 'var(--s-warn)' : undefined;
        return <span style={{ color, fontWeight: days < 0 ? 600 : undefined }}>{fmtDMY(r.nextFollowUpDate)}</span>;
      },
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const m = STATUS_META[r.status];
        return <StatusBadge tone={m?.tone} dot>{m?.l || `TT ${r.status}`}</StatusBadge>;
      },
    },
  ];

  const rowActions = (r: ChronicRecordDto) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Xem chi tiết', primary: true, onClick: () => openDetail(r) },
        {
          key: 'edit', icon: 'edit', label: 'Chỉnh sửa', primary: true,
          hidden: r.status !== 0, onClick: () => { setEditRec(r); setCrudOpen(true); }
        },
        {
          key: 'close', icon: 'x', label: 'Đóng hồ sơ', tone: 'warn', hidden: r.status !== 0,
          confirm: `Đóng hồ sơ bệnh mạn tính của ${r.patientName}?`, onClick: () => { void doClose(r); }
        },
        {
          key: 'remove', icon: 'trash', label: 'Loại bỏ', tone: 'danger', hidden: r.status !== 0,
          confirm: `Loại bỏ hồ sơ bệnh mạn tính của ${r.patientName}? Thao tác không thể hoàn tác.`,
          onClick: () => { void doRemove(r); }
        },
        {
          key: 'reopen', icon: 'refresh', label: 'Mở lại hồ sơ', disabled: reopening === r.id,
          hidden: r.status !== 2 && r.status !== 3, onClick: () => { void doReopen(r); }
        },
      ]} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang theo dõi', val: stats.totalActive, sub: 'hồ sơ', tone: 'info' },
        { lbl: 'Cần tái khám', val: stats.needFollowUp, sub: 'sắp đến hẹn', tone: 'warn' },
        { lbl: 'Mới trong tháng', val: stats.newThisMonth, sub: 'chẩn đoán mới', tone: 'ok' },
        { lbl: 'Đã đóng/loại', val: stats.closedOrRemoved, sub: 'kết thúc' },
      ]} />

      <div className="ab-toolbar">
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN, mã BN, tên bệnh…"
        />
        <input
          placeholder="Mã ICD (VD: E11)" value={icd}
          onChange={(e) => { setIcd(e.target.value); setPage(0); }}
          style={{ ...INP, width: 130 }}
        />
        <RangePicker
          value={[
            fromDate ? dayjs(fromDate) : null,
            toDate ? dayjs(toDate) : null,
          ]}
          format="DD/MM/YYYY"
          placeholder={['Từ ngày chẩn đoán', 'Đến ngày chẩn đoán']}
          onChange={(dates) => {
            setFromDate(dates?.[0]?.format('YYYY-MM-DD') ?? '');
            setToDate(dates?.[1]?.format('YYYY-MM-DD') ?? '');
            setPage(0);
          }}
          style={INP}
        />
        <span className="spacer" />
        <Btn variant="primary" icon="plus" onClick={() => { setEditRec(null); setCrudOpen(true); }}>
          Thêm hồ sơ
        </Btn>
        <Btn variant="ghost" icon="printer" onClick={() => window.print()}>In DS</Btn>
        <RefreshButton onRefresh={async () => { await load(); }} />
      </div>

      <StatusTabs<TabKey>
        value={tab}
        onChange={(v) => { setTab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<ChronicRecordDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={openDetail}
        actions={rowActions}
        empty="Không có hồ sơ bệnh mạn tính"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={total} perPage={PER} />

      {/* Drawer chi tiết + lịch sử tái khám */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.icdCode}</span>
            <span>{sel.patientName}</span>
          </span>
        ) : ''}
        sub={sel ? `${sel.icdName} · CĐ ${fmtDMY(sel.diagnosisDate)}` : ''}
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
            <Btn variant="primary" icon="calendar" onClick={addFollowUp}>Thêm lần tái khám</Btn>
          </>
        )}
      >
        {sel && (
          <>
            <DrSec title="Bệnh nhân">
              <DrField lbl="Họ tên"><b>{sel.patientName}</b></DrField>
              <DrField lbl="Mã BN"><span className="mono">{sel.patientCode}</span></DrField>
              {sel.phoneNumber && <DrField lbl="Điện thoại"><span className="mono">{sel.phoneNumber}</span></DrField>}
              {sel.dateOfBirth && <DrField lbl="Ngày sinh">{fmtDMY(sel.dateOfBirth)}</DrField>}
            </DrSec>

            <DrSec title="Chẩn đoán">
              <DrField lbl="ICD"><b className="mono" style={{ color: 'var(--a-cy)' }}>{sel.icdCode}</b></DrField>
              <DrField lbl="Tên bệnh">{sel.icdName}</DrField>
              <DrField lbl="Ngày CĐ">{fmtDMY(sel.diagnosisDate)}</DrField>
              <DrField lbl="BS phụ trách">{sel.doctorName || '—'}</DrField>
              <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            </DrSec>

            <DrSec title="Theo dõi">
              <DrField lbl="Chu kỳ TK"><b>{sel.followUpIntervalDays} ngày</b></DrField>
              <DrField lbl="Tái khám tiếp"><span className="mono">{fmtDMY(sel.nextFollowUpDate)}</span></DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={STATUS_META[sel.status]?.tone} dot>
                  {STATUS_META[sel.status]?.l || `TT ${sel.status}`}
                </StatusBadge>
              </DrField>
              {sel.closedDate && <DrField lbl="Ngày đóng">{fmtDMY(sel.closedDate)}</DrField>}
              {sel.closedReason && <DrField lbl="Lý do đóng">{sel.closedReason}</DrField>}
            </DrSec>

            {sel.notes && (
              <DrSec title="Ghi chú">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.notes}</div>
              </DrSec>
            )}

            <DrSec title={`Lịch sử tái khám${fups.length ? ` (${fups.length})` : ''}`}>
              {fupsLoading ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Đang tải…</div>
              ) : fups.length === 0 ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Chưa có lần tái khám nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {fups.map((fu) => (
                    <div
                      key={fu.id}
                      style={{
                        padding: '8px 12px', background: 'var(--bg-1)',
                        border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)', fontSize: 12.5,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <b className="mono">{fmtDMY(fu.visitDate)}</b>
                        <span className={`chip ${FU_META[fu.status]?.tone || 'info'}`}>
                          {FU_META[fu.status]?.l || `TT ${fu.status}`}
                        </span>
                        {fu.doctorName && <span style={{ color: 'var(--t-2)', fontSize: 12 }}>BS: {fu.doctorName}</span>}
                        {fu.nextFollowUpDate && (
                          <span className="mono" style={{ marginLeft: 'auto', color: 'var(--t-2)', fontSize: 12 }}>
                            Hẹn tiếp: {fmtDMY(fu.nextFollowUpDate)}
                          </span>
                        )}
                      </div>
                      {fu.notes && <div style={{ marginTop: 4, color: 'var(--t-1)' }}>{fu.notes}</div>}
                      {fu.vitalSigns && <div style={{ marginTop: 2, color: 'var(--t-2)', fontSize: 12 }}>Sinh hiệu: {fu.vitalSigns}</div>}
                      {fu.prescriptionSummary && <div style={{ color: 'var(--t-2)', fontSize: 12 }}>Đơn thuốc: {fu.prescriptionSummary}</div>}
                      {fu.labSummary && <div style={{ color: 'var(--t-2)', fontSize: 12 }}>Xét nghiệm: {fu.labSummary}</div>}
                    </div>
                  ))}
                </div>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* Modal thêm / sửa hồ sơ */}
      <CrudModal
        open={crudOpen}
        onClose={() => { setCrudOpen(false); setEditRec(null); }}
        title={editRec ? 'Chỉnh sửa hồ sơ bệnh mạn tính' : 'Thêm hồ sơ bệnh mạn tính'}
        fields={CRUD_FIELDS}
        initial={editRec ? {
          id: editRec.id,
          patientId: editRec.patientId,
          icdCode: editRec.icdCode,
          diagnosisDate: editRec.diagnosisDate,
          followUpIntervalDays: editRec.followUpIntervalDays,
          doctorId: editRec.doctorId,
          notes: editRec.notes,
        } : null}
        onSubmit={async (v, editing) => {
          const payload: CreateChronicRecordDto = {
            patientId: String(v.patientId || '').trim(),
            icdCode: String(v.icdCode || '').trim(),
            diagnosisDate: String(v.diagnosisDate || ''),
            followUpIntervalDays: Number(v.followUpIntervalDays) || 0,
            doctorId: v.doctorId ? String(v.doctorId) : undefined,
            notes: v.notes ? String(v.notes) : undefined,
          };
          if (editing && editRec) {
            await updateChronicRecord(editRec.id, payload);
            tk('Đã cập nhật hồ sơ bệnh mạn tính');
          } else {
            await createChronicRecord(payload);
            tk('Đã tạo hồ sơ bệnh mạn tính');
          }
          load();
        }}
      />
    </div>
  );
};

export default ChronicDiseaseV2;
