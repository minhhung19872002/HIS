import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchDiseaseReports, getEpiStats, updateDiseaseReport, reportDisease, searchOutbreaks } from '../api/epidemiology';
import type { DiseaseReport, EpiStats, Outbreak } from '../api/epidemiology';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, te, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const DR_FIELDS: CrudFieldCfg[] = [
  { key: 'reportCode', label: 'Mã báo cáo', required: true, disabledOnEdit: true },
  { key: 'patientName', label: 'Họ tên BN', required: true },
  { key: 'patientCode', label: 'Mã BN' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'age', label: 'Tuổi', type: 'number' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'diseaseName', label: 'Tên bệnh', required: true },
  { key: 'diseaseCode', label: 'Mã bệnh (ICD)' },
  { key: 'diseaseGroup', label: 'Nhóm bệnh', type: 'select', options: [
    { value: 'A', label: 'Nhóm A · đặc biệt nguy hiểm' }, { value: 'B', label: 'Nhóm B · nguy hiểm' }, { value: 'C', label: 'Nhóm C · ít nguy hiểm' }] },
  { key: 'onsetDate', label: 'Ngày khởi phát', type: 'date' },
  { key: 'diagnosisDate', label: 'Ngày chẩn đoán', type: 'date' },
  { key: 'reportingDoctor', label: 'BS báo cáo' },
  { key: 'labConfirmed', label: 'XN khẳng định', type: 'switch' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Nháp' }, { value: 1, label: 'Đã gửi' }, { value: 2, label: 'Xác nhận' }, { value: 3, label: 'Đã đóng' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = { 0: 'Nháp', 1: 'Đã gửi', 2: 'Xác nhận', 3: 'Đóng' };

type SKey = 'draft' | 'submitted' | 'confirmed' | 'closed';
const STATUS_TABS = [
  { v: 'draft' as SKey,     l: 'Nháp',      tone: 'warn' as const },
  { v: 'submitted' as SKey, l: 'Đã gửi',    tone: 'info' as const },
  { v: 'confirmed' as SKey, l: 'Xác nhận',  tone: 'ok' as const },
  { v: 'closed' as SKey,    l: 'Đóng',      tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'draft' : n === 1 ? 'submitted' : n === 2 ? 'confirmed' : 'closed';

const GROUP_TONE: Record<string, 'crit' | 'warn' | 'info'> = { A: 'crit', B: 'warn', C: 'info' };

const PER = 18;

const EpidemiologyV2: React.FC = () => {
  const [items, setItems] = useState<DiseaseReport[]>([]);
  const [stats, setStats] = useState<EpiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<DiseaseReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchDiseaseReports({ keyword: search }), getEpiStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được báo cáo dịch tễ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fGroup && r.diseaseGroup !== fGroup) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.reportCode, r.diseaseName, r.diseaseCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<DiseaseReport>[] = [
    { key: 'code', label: 'Mã BC', code: true, render: (r) => r.reportCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.age}t</div>
      </div>
    ) },
    { key: 'dis', label: 'Bệnh', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.diseaseName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.diseaseCode}</div>
      </div>
    ) },
    { key: 'grp', label: 'Nhóm', render: (r) => (
      <StatusBadge tone={GROUP_TONE[r.diseaseGroup] || 'info'} dot>{r.diseaseGroup}</StatusBadge>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.address}</span> },
    { key: 'date', label: 'Báo cáo', mono: true, render: (r) => dayjs(r.reportDate).format('DD/MM/YYYY') },
    { key: 'lab', label: 'XN', render: (r) => r.labConfirmed
      ? <StatusBadge tone="ok" dot>Khẳng định</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openEdit = (r: DiseaseReport) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const sendReport = async (r: DiseaseReport) => {
    try { await updateDiseaseReport(r.id, { status: 1 }); tk(`Đã gửi ${r.reportCode}`); load(); }
    catch { te('Gửi báo cáo thất bại'); }
  };

  // Báo cáo mới
  const [newReportOpen, setNewReportOpen] = useState(false);

  // Ổ dịch
  const [outbreakOpen, setOutbreakOpen] = useState(false);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [outbreakLoading, setOutbreakLoading] = useState(false);
  const loadOutbreaks = async () => {
    setOutbreakLoading(true);
    try { const r = await searchOutbreaks(); setOutbreaks(r); }
    catch { ti('Không tải được danh sách ổ dịch'); }
    finally { setOutbreakLoading(false); }
  };

  const actions = (r: DiseaseReport) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      {r.status === 0 && (
        <ActBtn ic="send" title="Gửi báo cáo" onClick={() => sendReport(r)} />
      )}
    </div>
  );

  const groupOpts = [
    { v: 'A', l: 'Nhóm A · đặc biệt nguy hiểm' },
    { v: 'B', l: 'Nhóm B · nguy hiểm' },
    { v: 'C', l: 'Nhóm C · ít nguy hiểm' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng báo cáo', val: stats?.totalReports ?? items.length, sub: 'tổng số' },
        { lbl: 'XN khẳng định', val: stats?.confirmedCases ?? items.filter((r) => r.labConfirmed).length, sub: 'có chắc chắn', tone: 'info' },
        { lbl: 'Ổ dịch', val: stats?.activeOutbreaks ?? 0, sub: 'đang hoạt động', tone: 'warn' },
        { lbl: 'Tử vong', val: stats?.deathCount ?? 0, sub: 'liên quan', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã BC / bệnh…" />
        <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm bệnh" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => { setOutbreakOpen(true); loadOutbreaks(); }}>
          <Ico name="alert" size={12} /> Ổ dịch
        </Btn>
        <Btn variant="primary" onClick={() => { setNewReportOpen(true); }}>
          <Ico name="plus" size={12} /> Báo cáo mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<DiseaseReport>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có báo cáo dịch tễ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `BC ${sel.reportCode}` : ''}
        sub={sel ? `${sel.diseaseName} · ${sel.patientName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => window.print()}>
            <Ico name="print" size={12} /> In BC
          </Btn>
          <Btn onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa
          </Btn>
          {sel && sel.status === 0 && (
            <Btn variant="primary" onClick={() => { if (sel) sendReport(sel); setSel(null); }}>
              <Ico name="send" size={12} /> Gửi báo cáo
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.reportCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Tuổi · GT">{sel.age} tuổi · {sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Địa chỉ">{sel.address}</DrField>
          </DrSec>
          <DrSec title="Bệnh">
            <DrField lbl="Tên bệnh">{sel.diseaseName}</DrField>
            <DrField lbl="Mã bệnh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diseaseCode}</span></DrField>
            <DrField lbl="Nhóm">
              <StatusBadge tone={GROUP_TONE[sel.diseaseGroup] || 'info'} dot>Nhóm {sel.diseaseGroup}</StatusBadge>
            </DrField>
            <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="XN khẳng định">
              {sel.labConfirmed ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Chưa</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Báo cáo">
            <DrField lbl="Ngày BC">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="BS báo cáo">{sel.reportingDoctor}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.outcome && <DrField lbl="Diễn biến">{sel.outcome}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
            {sel.outbreakId && <DrField lbl="Liên quan ổ dịch"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.outbreakId}</span></DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title="Cập nhật báo cáo dịch tễ"
        fields={DR_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v) => {
          if (crudInit?.id) await updateDiseaseReport(String(crudInit.id), v);
          tk('Đã cập nhật báo cáo');
          load();
        }}
      />

      {/* Modal báo cáo bệnh mới */}
      <CrudModal
        open={newReportOpen}
        onClose={() => setNewReportOpen(false)}
        title="Báo cáo ca bệnh truyền nhiễm"
        fields={DR_FIELDS}
        initial={null}
        size="lg"
        onSubmit={async (v) => {
          await reportDisease(v as Partial<DiseaseReport>);
          tk('Đã gửi báo cáo ca bệnh');
          setNewReportOpen(false);
          load();
        }}
      />

      {/* Drawer danh sách ổ dịch */}
      <DrawerShell
        open={outbreakOpen}
        onClose={() => setOutbreakOpen(false)}
        size="lg"
        title="Danh sách ổ dịch"
        sub={`${outbreaks.length} ổ dịch`}
        footer={<Btn variant="ghost" onClick={() => setOutbreakOpen(false)}>Đóng</Btn>}
      >
        {outbreakLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
        ) : outbreaks.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có ổ dịch nào</div>
        ) : outbreaks.map((ob) => {
          const riskTone = ob.riskLevel >= 3 ? 'crit' : ob.riskLevel === 2 ? 'warn' : 'info';
          const stTone = ob.status === 0 ? 'warn' : ob.status === 1 ? 'crit' : 'ok';
          const stLabel = ['Nghi ngờ', 'Xác nhận', 'Kiểm soát', 'Đã giải quyết'][ob.status] ?? '—';
          return (
            <DrSec key={ob.id} title={ob.name}>
              <DrField lbl="Bệnh">{ob.diseaseName} · <span style={{ fontFamily: 'var(--font-mono)' }}>{ob.diseaseCode}</span></DrField>
              <DrField lbl="Địa điểm">{ob.location}</DrField>
              <DrField lbl="Bắt đầu">{dayjs(ob.startDate).format('DD/MM/YYYY')}</DrField>
              {ob.endDate && <DrField lbl="Kết thúc">{dayjs(ob.endDate).format('DD/MM/YYYY')}</DrField>}
              <DrField lbl="Ca bệnh / Tử vong">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{ob.caseCount} / {ob.deathCount}</span>
              </DrField>
              <DrField lbl="Mức độ rủi ro">
                <StatusBadge tone={riskTone} dot>{['', 'Thấp', 'Trung bình', 'Cao', 'Nguy cấp'][ob.riskLevel] ?? '—'}</StatusBadge>
              </DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={stTone} dot>{stLabel}</StatusBadge>
              </DrField>
              {ob.responseActions && <DrField lbl="Biện pháp">{ob.responseActions}</DrField>}
            </DrSec>
          );
        })}
      </DrawerShell>
    </div>
  );
};

export default EpidemiologyV2;
