// =====================================================================
// HIS Terminal · SỔ SẢN KHOA — v2  (F1.8 #154)
// 3 tabs: Sổ sinh đẻ · Sổ theo dõi nạo phá thai · Báo cáo BYT
// Bound to /api/obstetric-register/{births,abortions,report}
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, InputNumber, Select, DatePicker } from 'antd';
import {
  getBirths, saveBirth, deleteBirth,
  getAbortions, saveAbortion, deleteAbortion,
  getObstetricReport,
  type BirthRegisterDto, type AbortionRegisterDto, type ObstetricReportDto,
} from '../modules/administration/api/obstetricRegister';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, te, cf,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

type TabKey = 'birth' | 'abortion' | 'report';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'birth',    l: 'Sổ sinh đẻ',         ic: 'user' },
  { v: 'abortion', l: 'Sổ nạo phá thai',    ic: 'activity' },
  { v: 'report',   l: 'Báo cáo BYT',        ic: 'file-text' },
];

const DELIVERY_OPTS = ['Đẻ thường', 'Mổ lấy thai', 'Forceps', 'Giác hút'].map(v => ({ value: v, label: v }));
const GENDER_OPTS = [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }];
const CONDITION_OPTS = ['Sống', 'Chết', 'Dị tật'].map(v => ({ value: v, label: v }));
const ABORTION_METHOD_OPTS = ['Hút', 'Nạo', 'Thuốc'].map(v => ({ value: v, label: v }));

const PER = 20;
const ZERO = '00000000-0000-0000-0000-000000000000';
const fmtDate = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '-');

type EditState = Partial<BirthRegisterDto & AbortionRegisterDto> & { _isNew?: boolean };

const ObstetricRegistersV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('birth');
  const [births, setBirths] = useState<BirthRegisterDto[]>([]);
  const [abortions, setAbortions] = useState<AbortionRegisterDto[]>([]);
  const [report, setReport] = useState<ObstetricReportDto | null>(null);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs().endOf('day')]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const fromIso = range[0].toISOString();
  const toIso = range[1].toISOString();

  const reload = useCallback(async () => {
    try {
      if (tab === 'birth') setBirths(await getBirths(fromIso, toIso));
      else if (tab === 'abortion') setAbortions(await getAbortions(fromIso, toIso));
      else setReport(await getObstetricReport(fromIso, toIso));
    } catch { te('Không tải được dữ liệu'); }
  }, [tab, fromIso, toIso]);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);
  useEffect(() => { void reload(); }, [reload]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const kw = search.toLowerCase();
    if (tab === 'birth')
      return births.filter(b => !kw || b.motherName.toLowerCase().includes(kw) || (b.motherIdNumber ?? '').includes(kw));
    if (tab === 'abortion')
      return abortions.filter(a => !kw || a.patientName.toLowerCase().includes(kw) || (a.patientIdNumber ?? '').includes(kw));
    return [];
  }, [tab, births, abortions, search]);

  const paged = rows.slice(page * PER, (page + 1) * PER);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = [
    { lbl: 'Ca sinh', val: births.length, tone: 'info' as const },
    { lbl: 'Tổng trẻ', val: births.reduce((s, b) => s + (b.babyCount || 1), 0), tone: 'ok' as const },
    { lbl: 'Ca nạo/phá', val: abortions.length, tone: 'warn' as const },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const colsBirth: ColumnDef<BirthRegisterDto>[] = [
    { key: 'registerNo', label: 'STT', width: 60, mono: true },
    { key: 'deliveryDate', label: 'Ngày sinh', width: 150, render: r => fmtDate(r.deliveryDate) },
    { key: 'motherName', label: 'Sản phụ' },
    { key: 'motherAge', label: 'Tuổi', width: 60 },
    { key: 'deliveryMethod', label: 'Cách đẻ', width: 130, render: r => r.deliveryMethod || '-' },
    { key: 'babyGender', label: 'Giới', width: 70, render: r => r.babyGender === 1 ? 'Nam' : r.babyGender === 2 ? 'Nữ' : '-' },
    { key: 'babyWeight', label: 'CN (g)', width: 80, render: r => r.babyWeight ? r.babyWeight.toLocaleString('vi-VN') : '-' },
    { key: 'babyCondition', label: 'Tình trạng', width: 110, render: r => r.babyCondition || '-' },
  ];
  const colsAbortion: ColumnDef<AbortionRegisterDto>[] = [
    { key: 'registerNo', label: 'STT', width: 60, mono: true },
    { key: 'procedureDate', label: 'Ngày', width: 150, render: r => fmtDate(r.procedureDate) },
    { key: 'patientName', label: 'Người bệnh' },
    { key: 'patientAge', label: 'Tuổi', width: 60 },
    { key: 'gestationalWeeks', label: 'Tuổi thai', width: 90, render: r => r.gestationalWeeks ? `${r.gestationalWeeks} tuần` : '-' },
    { key: 'method', label: 'Phương pháp', width: 120, render: r => r.method || '-' },
    { key: 'complications', label: 'Tai biến', render: r => r.complications || '-' },
  ];

  // ── Row actions ────────────────────────────────────────────────────────────
  const onRowClick = (row: BirthRegisterDto | AbortionRegisterDto) => setEdit({ ...row });

  const onDelete = (id: string) => {
    cf('Xóa bản ghi này?', async () => {
      try {
        if (tab === 'birth') await deleteBirth(id); else await deleteAbortion(id);
        tk('Đã xóa'); void reload();
      } catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });
  };

  const openNewBirth = () => setEdit({ _isNew: true, registerNo: births.length + 1, deliveryDate: dayjs().toISOString(), babyCount: 1, babyGender: 1 });
  const openNewAbortion = () => setEdit({ _isNew: true, registerNo: abortions.length + 1, procedureDate: dayjs().toISOString() });

  // ── Save ───────────────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      if (tab === 'birth') {
        if (!edit.motherName?.trim()) { te('Nhập tên sản phụ'); setSaving(false); return; }
        await saveBirth({ ...edit, id: edit.id || ZERO } as Partial<BirthRegisterDto>);
      } else {
        if (!edit.patientName?.trim()) { te('Nhập tên người bệnh'); setSaving(false); return; }
        await saveAbortion({ ...edit, id: edit.id || ZERO } as Partial<AbortionRegisterDto>);
      }
      tk(edit.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setEdit(null); void reload();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const patch = (k: keyof EditState, v: unknown) => setEdit(e => (e ? { ...e, [k]: v } : e));

  // ── Render report ────────────────────────────────────────────────────────────
  const renderReport = () => {
    if (!report) return <div style={{ padding: 'var(--space-20)', color: 'var(--t-2)' }}>Chọn khoảng thời gian để xem báo cáo.</div>;
    const card = (title: string, kv: [string, React.ReactNode][]) => (
      <div className="rec-section" style={{ flex: 1, minWidth: 280 }}>
        <h5>{title}</h5>
        <div className="rec-kv">
          {kv.map(([k, v], i) => (<React.Fragment key={i}><span>{k}</span><b>{v}</b></React.Fragment>))}
        </div>
      </div>
    );
    return (
      <div style={{ display: 'flex', gap: 'var(--space-16)', flexWrap: 'wrap', marginTop: 'var(--space-12)' }}>
        {card('Sổ sinh đẻ', [
          ['Tổng ca sinh', report.totalDeliveries],
          ['Tổng số trẻ', report.totalBabies],
          ['Trẻ sống', report.babiesAlive],
          ['Trẻ tử vong', report.babiesDead],
          ['Trẻ nam / nữ', `${report.maleBabies} / ${report.femaleBabies}`],
          ...Object.entries(report.deliveriesByMethod).map(([m, c]) => [`• ${m}`, c] as [string, React.ReactNode]),
        ])}
        {card('Sổ nạo phá thai', [
          ['Tổng ca', report.totalAbortions],
          ['Có tai biến', report.abortionComplications],
          ...Object.entries(report.abortionsByMethod).map(([m, c]) => [`• ${m}`, c] as [string, React.ReactNode]),
        ])}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Sổ sản khoa</h2>
        <div className="ab-actions">
          <RangePicker
            value={range}
            onChange={v => { if (v && v[0] && v[1]) { setRange([v[0], v[1]]); setPage(0); } }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          {tab !== 'report' && (
            <SearchBox value={search} onChange={v => { setSearch(v); setPage(0); }} placeholder="Tìm tên hoặc CCCD..." />
          )}
          {tab === 'birth' && <ActBtn ic="plus" title="Thêm ca sinh" onClick={openNewBirth} />}
          {tab === 'abortion' && <ActBtn ic="plus" title="Thêm ca nạo/phá" onClick={openNewAbortion} />}
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={t => { setTab(t); setPage(0); }} />

      {tab === 'birth' && (
        <>
          <DataTable<BirthRegisterDto>
            columns={colsBirth} data={paged as BirthRegisterDto[]} rowKey={r => r.id}
            onRowClick={onRowClick}
            actions={row => <ActBtn ic="trash" title="Xóa" tone="crit" onClick={e => { e.stopPropagation(); onDelete(row.id); }} />}
          />
          <Pager page={page} totalPages={Math.ceil(rows.length / PER)} setPage={setPage} total={rows.length} perPage={PER} />
        </>
      )}

      {tab === 'abortion' && (
        <>
          <DataTable<AbortionRegisterDto>
            columns={colsAbortion} data={paged as AbortionRegisterDto[]} rowKey={r => r.id}
            onRowClick={onRowClick}
            actions={row => <ActBtn ic="trash" title="Xóa" tone="crit" onClick={e => { e.stopPropagation(); onDelete(row.id); }} />}
          />
          <Pager page={page} totalPages={Math.ceil(rows.length / PER)} setPage={setPage} total={rows.length} perPage={PER} />
        </>
      )}

      {tab === 'report' && renderReport()}

      {/* ── Edit drawer ─────────────────────────────────────────────────── */}
      <DrawerShell
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={tab === 'birth' ? (edit?.id ? 'Sửa ca sinh' : 'Thêm ca sinh') : (edit?.id ? 'Sửa ca nạo/phá' : 'Thêm ca nạo/phá')}
        footer={<>
          <Btn onClick={() => setEdit(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSave} loading={saving} />
        </>}
      >
        {edit && tab === 'birth' && (
          <DrSec title="Thông tin ca sinh">
            <DrField lbl="STT sổ"><InputNumber style={{ width: '100%' }} min={0} value={edit.registerNo} onChange={v => patch('registerNo', v ?? 0)} /></DrField>
            <DrField lbl="Ngày giờ sinh *">
              <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm"
                value={edit.deliveryDate ? dayjs(edit.deliveryDate) : null}
                onChange={d => patch('deliveryDate', d ? d.toISOString() : undefined)} />
            </DrField>
            <DrField lbl="Họ tên sản phụ *"><Input value={edit.motherName} onChange={e => patch('motherName', e.target.value)} maxLength={200} /></DrField>
            <DrField lbl="Tuổi mẹ"><InputNumber style={{ width: '100%' }} min={0} max={100} value={edit.motherAge} onChange={v => patch('motherAge', v ?? 0)} /></DrField>
            <DrField lbl="CCCD/CMND"><Input value={edit.motherIdNumber} onChange={e => patch('motherIdNumber', e.target.value)} maxLength={50} /></DrField>
            <DrField lbl="Địa chỉ"><Input value={edit.motherAddress} onChange={e => patch('motherAddress', e.target.value)} maxLength={500} /></DrField>
            <DrField lbl="Tuổi thai (tuần)"><InputNumber style={{ width: '100%' }} min={0} max={45} value={edit.gestationalWeeks} onChange={v => patch('gestationalWeeks', v ?? 0)} /></DrField>
            <DrField lbl="PARA / Số lần sinh"><Input value={edit.paraInfo} onChange={e => patch('paraInfo', e.target.value)} placeholder="VD: 2002" maxLength={100} /></DrField>
            <DrField lbl="Cách đẻ"><Select style={{ width: '100%' }} allowClear options={DELIVERY_OPTS} value={edit.deliveryMethod} onChange={v => patch('deliveryMethod', v)} /></DrField>
            <DrField lbl="Số con"><InputNumber style={{ width: '100%' }} min={1} max={10} value={edit.babyCount} onChange={v => patch('babyCount', v ?? 1)} /></DrField>
            <DrField lbl="Giới tính con"><Select style={{ width: '100%' }} options={GENDER_OPTS} value={edit.babyGender} onChange={v => patch('babyGender', v)} /></DrField>
            <DrField lbl="Cân nặng (gram)"><InputNumber style={{ width: '100%' }} min={0} max={9999} value={edit.babyWeight} onChange={v => patch('babyWeight', v ?? 0)} /></DrField>
            <DrField lbl="Tình trạng con"><Select style={{ width: '100%' }} allowClear options={CONDITION_OPTS} value={edit.babyCondition} onChange={v => patch('babyCondition', v)} /></DrField>
            <DrField lbl="BS/NHS đỡ đẻ"><Input value={edit.attendant} onChange={e => patch('attendant', e.target.value)} maxLength={200} /></DrField>
            <DrField lbl="Ghi chú"><Input.TextArea rows={2} value={edit.notes} onChange={e => patch('notes', e.target.value)} /></DrField>
          </DrSec>
        )}
        {edit && tab === 'abortion' && (
          <DrSec title="Thông tin ca nạo/phá thai">
            <DrField lbl="STT sổ"><InputNumber style={{ width: '100%' }} min={0} value={edit.registerNo} onChange={v => patch('registerNo', v ?? 0)} /></DrField>
            <DrField lbl="Ngày thực hiện *">
              <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm"
                value={edit.procedureDate ? dayjs(edit.procedureDate) : null}
                onChange={d => patch('procedureDate', d ? d.toISOString() : undefined)} />
            </DrField>
            <DrField lbl="Họ tên người bệnh *"><Input value={edit.patientName} onChange={e => patch('patientName', e.target.value)} maxLength={200} /></DrField>
            <DrField lbl="Tuổi"><InputNumber style={{ width: '100%' }} min={0} max={100} value={edit.patientAge} onChange={v => patch('patientAge', v ?? 0)} /></DrField>
            <DrField lbl="CCCD/CMND"><Input value={edit.patientIdNumber} onChange={e => patch('patientIdNumber', e.target.value)} maxLength={50} /></DrField>
            <DrField lbl="Địa chỉ"><Input value={edit.patientAddress} onChange={e => patch('patientAddress', e.target.value)} maxLength={500} /></DrField>
            <DrField lbl="Tuổi thai (tuần)"><InputNumber style={{ width: '100%' }} min={0} max={45} value={edit.gestationalWeeks} onChange={v => patch('gestationalWeeks', v ?? 0)} /></DrField>
            <DrField lbl="Phương pháp"><Select style={{ width: '100%' }} allowClear options={ABORTION_METHOD_OPTS} value={edit.method} onChange={v => patch('method', v)} /></DrField>
            <DrField lbl="Lý do"><Input value={edit.reason} onChange={e => patch('reason', e.target.value)} maxLength={500} /></DrField>
            <DrField lbl="Người thực hiện"><Input value={edit.performer} onChange={e => patch('performer', e.target.value)} maxLength={200} /></DrField>
            <DrField lbl="Tai biến/biến chứng"><Input.TextArea rows={2} value={edit.complications} onChange={e => patch('complications', e.target.value)} /></DrField>
            <DrField lbl="Ghi chú"><Input.TextArea rows={2} value={edit.notes} onChange={e => patch('notes', e.target.value)} /></DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default ObstetricRegistersV2;
