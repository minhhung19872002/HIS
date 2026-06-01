import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, DatePicker, Input, InputNumber, Select } from 'antd';
import { searchVaccinations, recordVaccination } from '../api/immunization';
import type { Vaccination } from '../api/immunization';
import { SimpleV2Page, StatusBadge, Btn, ModalShell, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'scheduled' | 'completed' | 'missed' | 'deferred';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'info' },
  { v: 'completed', l: 'Đã tiêm',     tone: 'ok' },
  { v: 'missed',    l: 'Bỏ lỡ',       tone: 'crit' },
  { v: 'deferred',  l: 'Hoãn',        tone: 'warn' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'completed' : s === 2 ? 'missed' : s === 3 ? 'deferred' : 'scheduled';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const ImmunizationV2: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadVer, setReloadVer] = useState(0);

  const columns: ColumnDef<Vaccination>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i>
      </div>
    )},
    { key: 'vaccine', label: 'Vắc-xin', render: (r) => (
      <div className="cell-2l">
        <b>{r.vaccineName}</b>
        <i className="mono">{r.vaccineCode}</i>
      </div>
    )},
    { key: 'dose', label: 'Mũi', mono: true, width: 80, render: (r) => `${r.doseNumber}/${r.totalDoses}` },
    { key: 'lot', label: 'Số lô', mono: true, width: 130, render: (r) => r.lotNumber || '—' },
    { key: 'route', label: 'Đường tiêm', width: 100, render: (r) => `${r.route} · ${r.site}` },
    { key: 'when', label: 'Ngày tiêm', mono: true, width: 100, render: (r) => fmtDMY(r.vaccinationDate) },
    { key: 'next', label: 'Mũi tiếp', mono: true, width: 100, render: (r) => fmtDMY(r.nextDueDate) },
    { key: 'admin', label: 'Người tiêm', width: 180, render: (r) => r.administeredBy || '—' },
    { key: 'aefi', label: 'AEFI', width: 90, render: (r) =>
      r.adverseEvent ? <span className="chip crit">Có</span> : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <>
    <SimpleV2Page<Vaccination>
      key={reloadVer}
      title="Hồ sơ tiêm chủng"
      load={() => searchVaccinations()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / vắc-xin / số lô…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.vaccineName} ${r.vaccineCode} ${r.lotNumber}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      headerActions={() => (
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <TermIcon name="plus" size={12} /> Ghi nhận tiêm
        </Btn>
      )}
      kpis={(rows) => {
        const aefi = rows.filter((r) => r.adverseEvent).length;
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.vaccinationDate).isSame(today, 'day')).length;
        const overdue = rows.filter((r) => r.nextDueDate && dayjs(r.nextDueDate).isBefore(today)).length;
        return [
          { lbl: 'Tổng mũi', val: rows.length },
          { lbl: 'Hôm nay', val: todayCount, tone: 'info' },
          { lbl: 'Đã tiêm', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
          { lbl: 'Bỏ lỡ', val: rows.filter((r) => r.status === 2).length, tone: 'crit' },
          { lbl: 'Quá hạn mũi sau', val: overdue, tone: 'warn' },
          { lbl: 'AEFI', val: aefi, sub: 'phản ứng', tone: aefi > 0 ? 'crit' : 'ok' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Giới · NS</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'} · {fmtDMY(r.dateOfBirth)}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> VẮC-XIN</h5>
            <div className="rec-kv">
              <span>Tên</span><b>{r.vaccineName}</b>
              <span>Mã</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.vaccineCode}</span>
              <span>Số lô</span><span className="mono">{r.lotNumber}</span>
              <span>Mũi</span><b>{r.doseNumber}/{r.totalDoses}</b>
              <span>Đường tiêm</span><span>{r.route}</span>
              <span>Vị trí</span><span>{r.site}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="calendar" size={11} /> THỜI GIAN</h5>
            <div className="rec-kv">
              <span>Ngày tiêm</span><span>{fmtDMY(r.vaccinationDate)}</span>
              <span>Người tiêm</span><span>{r.administeredBy}</span>
              <span>Mũi tiếp</span><span>{fmtDMY(r.nextDueDate)}</span>
            </div>
          </div>
          {r.adverseEvent && (
            <div className="rec-section">
              <h5><TermIcon name="alert" size={11} /> AEFI - PHẢN ỨNG SAU TIÊM</h5>
              <div style={{ fontSize: 12.5, color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.adverseEvent}</div>
            </div>
          )}
          {r.notes && (
            <div className="rec-section">
              <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.vaccineCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.vaccineName} · Mũi ${r.doseNumber}/${r.totalDoses}`}
    />
    <VaccinationRecordModal
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onDone={() => { setCreateOpen(false); setReloadVer((v) => v + 1); }}
    />
    </>
  );
};

// ─────────────────────────── Record vaccination modal ───────────────────────
//
// Port từ v1 (pages/Immunization.tsx) modal "Ghi nhận tiêm chủng" — giữ nguyên
// 11 field (patientName, patientCode, vaccineName, lotNumber, doseNumber,
// totalDoses, site, route, vaccinationDate, nextDueDate, notes) + validate
// inline + format dates trước khi call API. Dùng raw useState (KHÔNG Antd Form)
// theo pattern v2 BloodIssueModal.

type SiteOption = 'Đùi trái' | 'Đùi phải' | 'Cánh tay trái' | 'Cánh tay phải';
type RouteOption = 'IM' | 'SC' | 'ID' | 'Oral';
const SITE_OPTS: { value: SiteOption; label: string }[] = [
  { value: 'Đùi trái', label: 'Đùi trái' },
  { value: 'Đùi phải', label: 'Đùi phải' },
  { value: 'Cánh tay trái', label: 'Cánh tay trái' },
  { value: 'Cánh tay phải', label: 'Cánh tay phải' },
];
const ROUTE_OPTS: { value: RouteOption; label: string }[] = [
  { value: 'IM', label: 'Tiêm bắp (IM)' },
  { value: 'SC', label: 'Tiêm dưới da (SC)' },
  { value: 'ID', label: 'Tiêm trong da (ID)' },
  { value: 'Oral', label: 'Uống' },
];

const VaccinationRecordModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [doseNumber, setDoseNumber] = useState<number>(1);
  const [totalDoses, setTotalDoses] = useState<number>(3);
  const [site, setSite] = useState<SiteOption | undefined>(undefined);
  const [route, setRoute] = useState<RouteOption | undefined>(undefined);
  const [vaccinationDate, setVaccinationDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [nextDueDate, setNextDueDate] = useState<dayjs.Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset state khi mở (theo pattern v2 BloodIssueModal)
  useEffect(() => {
    if (open) {
      setPatientName(''); setPatientCode(''); setVaccineName('');
      setLotNumber(''); setDoseNumber(1); setTotalDoses(3);
      setSite(undefined); setRoute(undefined);
      setVaccinationDate(dayjs()); setNextDueDate(null); setNotes('');
    }
  }, [open]);

  const submit = async () => {
    if (!patientName.trim()) { message.warning('Nhập họ tên bệnh nhân'); return; }
    if (!vaccineName.trim()) { message.warning('Nhập tên vắc-xin'); return; }
    if (!lotNumber.trim()) { message.warning('Nhập số lô'); return; }
    if (!site) { message.warning('Chọn vị trí tiêm'); return; }
    if (!route) { message.warning('Chọn đường tiêm'); return; }
    if (!vaccinationDate) { message.warning('Chọn ngày tiêm'); return; }
    setBusy(true);
    try {
      await recordVaccination({
        patientName: patientName.trim(),
        patientCode: patientCode.trim() || undefined,
        vaccineName: vaccineName.trim(),
        lotNumber: lotNumber.trim(),
        doseNumber,
        totalDoses,
        site,
        route,
        vaccinationDate: vaccinationDate.format('YYYY-MM-DD'),
        nextDueDate: nextDueDate ? nextDueDate.format('YYYY-MM-DD') : undefined,
        notes: notes.trim() || undefined,
      });
      message.success('Đã ghi nhận tiêm chủng');
      onDone();
    } catch {
      message.error('Ghi nhận tiêm chủng thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Ghi nhận tiêm chủng"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ImFld label="Họ tên bệnh nhân *">
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Họ và tên" />
        </ImFld>
        <ImFld label="Mã bệnh nhân">
          <Input value={patientCode} onChange={(e) => setPatientCode(e.target.value)} placeholder="Mã BN" />
        </ImFld>
        <ImFld label="Tên vắc-xin *" full>
          <Input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} placeholder="VD: DPT-VGB-Hib" />
        </ImFld>
        <ImFld label="Số lô *">
          <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Số lô" />
        </ImFld>
        <ImFld label="Liều thứ / Tổng liều">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <InputNumber value={doseNumber} onChange={(v) => setDoseNumber(Number(v) || 1)} min={1} style={{ flex: 1 }} />
            <span style={{ color: 'var(--t-2)' }}>/</span>
            <InputNumber value={totalDoses} onChange={(v) => setTotalDoses(Number(v) || 1)} min={1} style={{ flex: 1 }} />
          </div>
        </ImFld>
        <ImFld label="Vị trí tiêm *">
          <Select<SiteOption>
            value={site} onChange={setSite} placeholder="Chọn vị trí" style={{ width: '100%' }}
            options={SITE_OPTS}
          />
        </ImFld>
        <ImFld label="Đường tiêm *">
          <Select<RouteOption>
            value={route} onChange={setRoute} placeholder="Chọn đường" style={{ width: '100%' }}
            options={ROUTE_OPTS}
          />
        </ImFld>
        <ImFld label="Ngày tiêm *">
          <DatePicker value={vaccinationDate} onChange={setVaccinationDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </ImFld>
        <ImFld label="Ngày tiêm tiếp">
          <DatePicker value={nextDueDate} onChange={setNextDueDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </ImFld>
        <ImFld label="Ghi chú" full>
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ghi chú thêm…" />
        </ImFld>
      </div>
    </ModalShell>
  );
};

const ImFld: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>}
    {children}
  </div>
);

export default ImmunizationV2;
