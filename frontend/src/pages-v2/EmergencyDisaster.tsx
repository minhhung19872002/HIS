import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Drawer, Select } from 'antd';
import { AlertOutlined, EyeOutlined, HomeOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TermIcon from '../layouts/terminal/Icon';
import { getActiveEvent, getVictims, type MCIVictimDto } from '../api/massCasualty';
import './EmergencyDisaster.css';

type TriageLevel = 1 | 2 | 3 | 4 | 5;
type EmergencyStatus = 'triage' | 'treating' | 'observing' | 'admitted' | 'discharged' | 'referred';

type TriageMeta = {
  level: TriageLevel;
  label: string;
  description: string;
  color: string;
  soft: string;
  border: string;
};

type StatusMeta = {
  value: EmergencyStatus;
  label: string;
  tone: 'critical' | 'warn' | 'info' | 'ok' | 'neutral';
};

type Vitals = {
  bp: string;
  hr: number;
  temp: number;
  spo2: number;
};

type EmergencyCase = {
  code: string;
  patientCode: string;
  patientName: string;
  age: number;
  gender: 'Nam' | 'Nữ';
  arrivalTime: string;
  triage: TriageLevel;
  status: EmergencyStatus;
  complaint: string;
  mode: string;
  doctor: string;
  bed?: string;
  gcs: number;
  vitals: Vitals;
};

const TRIAGE_LEVELS: TriageMeta[] = [
  { level: 1, label: 'Mức 1 · Hồi sức', description: 'Đe doạ tính mạng, xử trí ngay', color: '#c62828', soft: '#fef2f2', border: '#fecaca' },
  { level: 2, label: 'Mức 2 · Khẩn cấp', description: 'Cần tiếp cận trong 10 phút', color: '#dd6b20', soft: '#fff7ed', border: '#fed7aa' },
  { level: 3, label: 'Mức 3 · Cấp', description: 'Theo dõi sát và cận lâm sàng sớm', color: '#b7791f', soft: '#fffbeb', border: '#fde68a' },
  { level: 4, label: 'Mức 4 · Bán cấp', description: 'Có thể chờ ngắn hạn', color: '#0f766e', soft: '#ecfeff', border: '#99f6e4' },
  { level: 5, label: 'Mức 5 · Không cấp', description: 'Điều trị ngoại trú hoặc chờ khám', color: '#2f855a', soft: '#ecfdf5', border: '#bbf7d0' },
];

const STATUS_OPTIONS: StatusMeta[] = [
  { value: 'triage', label: 'Đang phân loại', tone: 'warn' },
  { value: 'treating', label: 'Đang xử trí', tone: 'critical' },
  { value: 'observing', label: 'Theo dõi', tone: 'info' },
  { value: 'admitted', label: 'Chuyển nội trú', tone: 'ok' },
  { value: 'discharged', label: 'Cho về', tone: 'neutral' },
  { value: 'referred', label: 'Chuyển tuyến', tone: 'info' },
];

const COMPLAINTS = [
  'Đau ngực dữ dội',
  'Khó thở cấp',
  'Chấn thương đầu',
  'Tai nạn giao thông',
  'Đau bụng cấp',
  'Co giật',
  'Sốt cao + co giật',
  'Ngất xỉu',
  'Bỏng độ 2',
  'Vết thương dao đâm',
  'Đột quỵ nghi ngờ',
  'Ngộ độc thuốc',
];

const NAMES = [
  'Nguyễn Văn Hùng',
  'Trần Thị Lan',
  'Lê Quốc Anh',
  'Phạm Hữu Nam',
  'Đỗ Thanh Hà',
  'Bùi Mai Hương',
  'Vũ Thuỳ Linh',
  'Trần Văn Thái',
  'Hoàng Thị Bích',
  'Phan Đăng Khoa',
  'Tô Anh Đức',
  'Lý Thuý Vy',
];

const DOCTORS = ['BS. Phan Văn Tâm', 'BS. Đỗ Thị Linh', 'BS. Nguyễn Đức Long', 'BS. Trần Hải Nam'];
const ARRIVAL_MODES = ['115', 'Tự đến', 'Người nhà đưa vào', 'Chuyển tuyến'];
const PAGE_SIZE = 18;

function seededNumber(seed: number): number {
  const value = Math.sin(seed * 999.91) * 10000;
  return value - Math.floor(value);
}

function seededPick<T>(items: T[], seed: number): T {
  return items[Math.floor(seededNumber(seed) * items.length) % items.length];
}

function buildEmergencySeed(): EmergencyCase[] {
  const base = dayjs().startOf('day');

  return Array.from({ length: 36 }, (_, index) => {
    const triageSeed = seededNumber(index + 4);
    const triage: TriageLevel =
      triageSeed < 0.08 ? 1 :
      triageSeed < 0.24 ? 2 :
      triageSeed < 0.55 ? 3 :
      triageSeed < 0.82 ? 4 : 5;
    const status = seededPick<EmergencyStatus>(
      ['triage', 'treating', 'observing', 'observing', 'admitted', 'discharged', 'referred'],
      index + 11,
    );
    const arrivalHour = 1 + Math.floor(seededNumber(index + 13) * 22);
    const arrivalMinute = Math.floor(seededNumber(index + 17) * 60);
    const hr = triage <= 2 ? 102 + Math.floor(seededNumber(index + 19) * 38) : 66 + Math.floor(seededNumber(index + 19) * 26);
    const temp = triage <= 2 ? 37.1 + seededNumber(index + 23) * 2.3 : 36 + seededNumber(index + 23) * 1.6;
    const spo2 = triage <= 2 ? 85 + Math.floor(seededNumber(index + 29) * 10) : 92 + Math.floor(seededNumber(index + 29) * 7);
    const systolic = triage <= 2 ? 82 + Math.floor(seededNumber(index + 31) * 28) : 108 + Math.floor(seededNumber(index + 31) * 24);
    const diastolic = triage <= 2 ? 52 + Math.floor(seededNumber(index + 37) * 18) : 68 + Math.floor(seededNumber(index + 37) * 18);

    return {
      code: `ER-${base.format('YYMMDD')}-${String(index + 1).padStart(3, '0')}`,
      patientCode: `BN${base.format('YY')}${String(10000 + index * 7).slice(-5)}`,
      patientName: seededPick(NAMES, index + 7),
      age: 18 + Math.floor(seededNumber(index + 41) * 68),
      gender: seededNumber(index + 43) > 0.48 ? ('Nam' as const) : ('Nữ' as const),
      arrivalTime: base.add(arrivalHour, 'hour').add(arrivalMinute, 'minute').toISOString(),
      triage,
      status,
      complaint: seededPick(COMPLAINTS, index + 47),
      mode: seededPick(ARRIVAL_MODES, index + 53),
      doctor: seededPick(DOCTORS, index + 59),
      bed: triage <= 3 ? `CC-${String((index % 8) + 1).padStart(2, '0')}` : undefined,
      gcs: triage <= 2 ? 8 + Math.floor(seededNumber(index + 61) * 5) : 14 + Math.floor(seededNumber(index + 61) * 2),
      vitals: {
        bp: `${systolic}/${diastolic}`,
        hr,
        temp: Number(temp.toFixed(1)),
        spo2,
      },
    };
  }).sort((left, right) => dayjs(right.arrivalTime).valueOf() - dayjs(left.arrivalTime).valueOf());
}

function toneClass(tone: StatusMeta['tone']): string {
  switch (tone) {
    case 'critical':
      return 'er-v2-badge critical';
    case 'warn':
      return 'er-v2-badge warn';
    case 'info':
      return 'er-v2-badge info';
    case 'ok':
      return 'er-v2-badge ok';
    default:
      return 'er-v2-badge';
  }
}

// ─── API DTO mapper ──────────────────────────────────────────────────────────
//
// Backend MCIVictimDto comes from /api/mci/events/{id}/victims and uses string
// triage categories ('Immediate'/'Delayed'/'Minor'/'Expectant'/'Deceased') +
// triage colors. The custom triage UI in this v2 page expects numeric levels
// 1–5 + a richer EmergencyCase shape (vitals/gcs/complaint/bed). This mapper
// translates real MCI victims into that shape, defaulting missing fields.

function triageFromCategory(cat?: string, color?: string): TriageLevel {
  const c = (cat || '').toLowerCase();
  const col = (color || '').toLowerCase();
  if (c === 'immediate' || col === 'red') return 1;
  if (c === 'delayed'   || col === 'yellow') return 3;
  if (c === 'minor'     || col === 'green') return 4;
  if (c === 'expectant' || c === 'deceased' || col === 'black') return 2;
  return 3;
}

function statusFromTreatment(s?: string, dispo?: string): EmergencyStatus {
  const t = (s || '').toLowerCase();
  const d = (dispo || '').toLowerCase();
  if (d === 'admitted')   return 'admitted';
  if (d === 'discharged') return 'discharged';
  if (d === 'transferred' || d === 'or' || d === 'icu') return 'referred';
  if (t.includes('treatment')) return 'treating';
  if (t.includes('observ'))    return 'observing';
  return 'triage';
}

function genderLabel(g?: string): 'Nam' | 'Nữ' {
  const v = (g || '').toLowerCase();
  if (v === 'female' || v === 'f' || v === 'nữ' || v === 'nu') return 'Nữ';
  return 'Nam';
}

function mapVictimToCase(v: MCIVictimDto): EmergencyCase {
  const triage = triageFromCategory(v.triageCategory, v.triageColor);
  return {
    code: v.victimCode || v.id,
    patientCode: v.patientCode || v.temporaryId || '—',
    patientName: v.fullName || v.temporaryId || `BN ${v.victimCode || v.id}`,
    age: v.estimatedAge ?? 0,
    gender: genderLabel(v.gender),
    arrivalTime: v.arrivalTime || v.createdAt || new Date().toISOString(),
    triage,
    status: statusFromTreatment(v.treatmentStatus, v.disposition),
    complaint: v.chiefComplaint || (v.injuries && v.injuries[0]) || '—',
    mode: v.identificationMethod || 'Tự đến',
    doctor: v.attendingDoctorName || '—',
    bed: v.bedNumber,
    gcs: v.gcsScore ?? (triage <= 2 ? 10 : 15),
    vitals: {
      bp: v.vitalSigns?.bloodPressure || '—',
      hr: v.vitalSigns?.heartRate ?? 0,
      temp: v.vitalSigns?.temperature ?? 0,
      spo2: v.vitalSigns?.oxygenSaturation ?? 0,
    },
  };
}

const EmergencyDisasterV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<EmergencyCase[]>(() => buildEmergencySeed());
  const [usingMock, setUsingMock] = useState(true);

  // Try real MCI API on mount; fall back to seed if no active event or empty.
  useEffect(() => {
    (async () => {
      try {
        const evt = await getActiveEvent();
        if (!evt?.data?.id) return; // no active MCI — keep seed for demo
        const vRes = await getVictims(evt.data.id);
        const list = Array.isArray(vRes?.data) ? vRes.data : [];
        if (list.length === 0) return; // active event but no victims yet — keep seed
        const real = list.map(mapVictimToCase)
          .sort((a, b) => dayjs(b.arrivalTime).valueOf() - dayjs(a.arrivalTime).valueOf());
        setRows(real);
        setUsingMock(false);
        message.success(`Đang hiển thị MCI thật: ${evt.data.eventName} (${real.length} ca)`);
      } catch {
        // API down or schema drift — silently keep seed for demo
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [statusFilter, setStatusFilter] = useState<'all' | EmergencyStatus>('all');
  const [triageFilter, setTriageFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);

  const counts = useMemo(() => {
    return STATUS_OPTIONS.reduce<Record<string, number>>(
      (accumulator, status) => {
        accumulator[status.value] = rows.filter((row) => row.status === status.value).length;
        return accumulator;
      },
      { all: rows.length },
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      if (triageFilter && String(row.triage) !== triageFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [row.patientName, row.patientCode, row.code, row.complaint]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter, triageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const metrics = useMemo(() => {
    const critical = rows.filter((row) => row.triage <= 2).length;
    const treating = rows.filter((row) => row.status === 'treating').length;
    const admitted = rows.filter((row) => row.status === 'admitted').length;
    const referred = rows.filter((row) => row.status === 'referred').length;
    const averageWait = Math.max(
      6,
      Math.round(rows.reduce((sum, row) => sum + (row.triage <= 2 ? 6 : row.triage === 3 ? 14 : 22), 0) / rows.length),
    );

    return [
      { label: 'Hôm nay', value: rows.length, meta: 'ca cấp cứu' },
      { label: 'Mức 1-2', value: critical, meta: 'nguy kịch', tone: 'critical' as const },
      { label: 'Đang xử trí', value: treating, meta: 'phòng hồi sức', tone: 'warn' as const },
      { label: 'Chuyển nội trú', value: admitted, meta: 'ca', tone: 'info' as const },
      { label: 'Chuyển tuyến', value: referred, meta: 'BV tuyến trên' },
      { label: 'Chờ TB', value: `${averageWait}p`, meta: 'đạt mục tiêu', tone: 'ok' as const },
    ];
  }, [rows]);

  const mutateRow = (code: string, patch: Partial<EmergencyCase>): void => {
    setRows((currentRows) => currentRows.map((row) => (row.code === code ? { ...row, ...patch } : row)));
    setSelectedCase((currentCase) => (currentCase?.code === code ? { ...currentCase, ...patch } : currentCase));
  };

  const openCase = (row: EmergencyCase): void => {
    setSelectedCase(row);
  };

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, triageFilter, search]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="er-v2-page">
      <div className="er-v2-strip">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            meta={metric.meta}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="er-v2-shell">
        <div className="er-v2-toolbar">
          <div className="er-v2-toolbar-left">
            <button
              className="er-v2-btn danger"
              type="button"
              onClick={() => message.success('Đã tiếp nhận ca cấp cứu mới')}
            >
              <TermIcon name="plus" size={14} />
              Tiếp nhận cấp cứu
            </button>
            <button
              className="er-v2-btn"
              type="button"
              onClick={() => message.warning('Đã kích hoạt quy trình Code Blue')}
            >
              <AlertOutlined />
              Code Blue
            </button>
          </div>

          <div className="er-v2-toolbar-right">
            <div className="er-v2-search">
              <TermIcon name="search" size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên BN, mã CC, triệu chứng..."
              />
            </div>
            <Select
              allowClear
              className="er-v2-select"
              placeholder="Lọc triage"
              value={triageFilter || undefined}
              onChange={(value) => setTriageFilter(value ?? '')}
              options={TRIAGE_LEVELS.map((item) => ({ value: String(item.level), label: item.label }))}
            />
            <span className="er-v2-timestamp">Cập nhật {dayjs().format('HH:mm')}</span>
            <span className={'er-v2-badge ' + (usingMock ? 'warn' : 'ok')} title={usingMock ? 'Không có MCI active — hiển thị dữ liệu mẫu' : 'Đang hiển thị MCI thật'}>
              {usingMock ? 'Demo' : 'Live'}
            </span>
          </div>
        </div>

        <div className="er-v2-tabs">
          <StatusTab
            label="Tất cả"
            active={statusFilter === 'all'}
            count={counts.all ?? 0}
            onClick={() => setStatusFilter('all')}
          />
          {STATUS_OPTIONS.map((status) => (
            <StatusTab
              key={status.value}
              label={status.label}
              active={statusFilter === status.value}
              count={counts[status.value] ?? 0}
              tone={status.tone}
              onClick={() => setStatusFilter(status.value)}
            />
          ))}
        </div>

        <div className="er-v2-table-wrap">
          <table className="er-v2-table">
            <thead>
              <tr>
                <th>Triage</th>
                <th>Mã CC</th>
                <th>Đến</th>
                <th>Bệnh nhân</th>
                <th>Lý do</th>
                <th>Đường vào</th>
                <th>Sinh hiệu</th>
                <th>Giường</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const triage = TRIAGE_LEVELS.find((item) => item.level === row.triage)!;
                const status = STATUS_OPTIONS.find((item) => item.value === row.status)!;
                return (
                  <tr key={row.code}>
                    <td>
                      <span
                        className="er-v2-triage-chip"
                        style={{ background: triage.color, borderColor: triage.color }}
                      >
                        {row.triage}
                      </span>
                    </td>
                    <td className="mono">{row.code}</td>
                    <td className="mono">{dayjs(row.arrivalTime).format('HH:mm')}</td>
                    <td>
                      <div className="er-v2-person">
                        <strong>{row.patientName}</strong>
                        <span>{row.patientCode} · {row.age}T · {row.gender}</span>
                      </div>
                    </td>
                    <td>{row.complaint}</td>
                    <td>{row.mode}</td>
                    <td className="mono">HA {row.vitals.bp} · SpO2 {row.vitals.spo2}%</td>
                    <td className="mono">{row.bed ?? '—'}</td>
                    <td>
                      <span className={toneClass(status.tone)}>{status.label}</span>
                    </td>
                    <td>
                      <div className="er-v2-actions">
                        <button type="button" className="er-v2-icon-btn" onClick={() => openCase(row)}>
                          <EyeOutlined />
                        </button>
                        {row.status === 'treating' && (
                          <button
                            type="button"
                            className="er-v2-icon-btn"
                            onClick={() => {
                              mutateRow(row.code, { status: 'admitted' });
                              message.success(`Đã chuyển ${row.patientName} sang nội trú`);
                            }}
                          >
                            <HomeOutlined />
                          </button>
                        )}
                        <button
                          type="button"
                          className="er-v2-icon-btn"
                          onClick={() => {
                            mutateRow(row.code, { status: 'discharged' });
                            message.success(`Đã hoàn tất xử trí cho ${row.patientName}`);
                          }}
                        >
                          <LogoutOutlined />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="er-v2-footer">
          <span>
            Hiển thị {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredRows.length)} / {filteredRows.length} ca
          </span>
          <div className="er-v2-pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Trước
            </button>
            <span>Trang {page}/{totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <Drawer
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `Ca cấp cứu · ${selectedCase.code}` : ''}
        placement="right"
        size="large"
      >
        {selectedCase && (
          <EmergencyCaseDrawerContent
            emergencyCase={selectedCase}
            onClose={() => setSelectedCase(null)}
            onAdmit={() => {
              mutateRow(selectedCase.code, { status: 'admitted' });
              message.success('Đã chuyển nội trú');
            }}
            onPrint={() => message.success('Đã tạo bản in hồ sơ cấp cứu')}
          />
        )}
      </Drawer>
    </div>
  );
};

type StatCardProps = {
  label: string;
  value: string | number;
  meta: string;
  tone?: 'critical' | 'warn' | 'info' | 'ok';
};

const StatCard: React.FC<StatCardProps> = ({ label, value, meta, tone }) => (
  <div className={`er-v2-strip-cell ${tone ?? ''}`.trim()}>
    <span className="label">{label}</span>
    <strong>{value}</strong>
    <span className="meta">{meta}</span>
  </div>
);

type StatusTabProps = {
  label: string;
  count: number;
  active: boolean;
  tone?: StatusMeta['tone'];
  onClick: () => void;
};

const StatusTab: React.FC<StatusTabProps> = ({ label, count, active, tone, onClick }) => (
  <button
    type="button"
    className={`er-v2-tab ${active ? 'active' : ''} ${tone ?? ''}`.trim()}
    onClick={onClick}
  >
    <span>{label}</span>
    <b>{count}</b>
  </button>
);

type EmergencyCaseDrawerContentProps = {
  emergencyCase: EmergencyCase;
  onClose: () => void;
  onAdmit: () => void;
  onPrint: () => void;
};

const EmergencyCaseDrawerContent: React.FC<EmergencyCaseDrawerContentProps> = ({
  emergencyCase,
  onClose,
  onAdmit,
  onPrint,
}) => {
  const triage = TRIAGE_LEVELS.find((item) => item.level === emergencyCase.triage)!;

  return (
    <div className="er-v2-drawer">
      <div className="er-v2-hero" style={{ background: triage.color }}>
        <div className="er-v2-hero-level">{emergencyCase.triage}</div>
        <div>
          <div className="er-v2-hero-title">{triage.label}</div>
          <div className="er-v2-hero-sub">{triage.description}</div>
        </div>
      </div>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Sinh hiệu hiện tại</div>
        <div className="er-v2-vitals">
          <VitalCard label="HA" value={emergencyCase.vitals.bp} unit="mmHg" />
          <VitalCard label="Mạch" value={emergencyCase.vitals.hr} unit="l/p" />
          <VitalCard label="Nhiệt" value={emergencyCase.vitals.temp} unit="°C" />
          <VitalCard label="SpO2" value={emergencyCase.vitals.spo2} unit="%" />
          <VitalCard label="GCS" value={emergencyCase.gcs} unit="/15" />
        </div>
      </section>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Thông tin tiếp nhận</div>
        <div className="er-v2-info-grid">
          <InfoField label="Bệnh nhân">{emergencyCase.patientName}</InfoField>
          <InfoField label="Mã BN">{emergencyCase.patientCode}</InfoField>
          <InfoField label="Lý do vào cấp cứu">{emergencyCase.complaint}</InfoField>
          <InfoField label="Đường vào">{emergencyCase.mode}</InfoField>
          <InfoField label="Giờ đến">{dayjs(emergencyCase.arrivalTime).format('HH:mm · DD/MM/YYYY')}</InfoField>
          <InfoField label="BS phụ trách">{emergencyCase.doctor}</InfoField>
          <InfoField label="Giường">{emergencyCase.bed ?? 'Chưa phân giường'}</InfoField>
          <InfoField label="Tình trạng ban đầu">
            {emergencyCase.triage <= 2 ? 'Nguy kịch, cần monitor liên tục' : 'Ổn định, theo dõi sát'}
          </InfoField>
        </div>
      </section>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Xử trí ban đầu</div>
        <div className="er-v2-treatment">
          {emergencyCase.triage <= 2
            ? 'Thiết lập đường truyền tĩnh mạch · Oxy mask 6L/phút · Theo dõi monitor liên tục · Hội chẩn chuyên khoa ngay.'
            : 'Khám lâm sàng · Chỉ định cận lâm sàng cấp · Theo dõi sinh hiệu mỗi 15 phút · Chuẩn bị giường theo dõi.'}
        </div>
      </section>

      <div className="er-v2-drawer-actions">
        <button type="button" className="er-v2-btn" onClick={onClose}>Đóng</button>
        <button type="button" className="er-v2-btn" onClick={onPrint}>In hồ sơ</button>
        <button type="button" className="er-v2-btn primary" onClick={onAdmit}>Chuyển nội trú</button>
      </div>
    </div>
  );
};

type VitalCardProps = {
  label: string;
  value: string | number;
  unit: string;
};

const VitalCard: React.FC<VitalCardProps> = ({ label, value, unit }) => (
  <div className="er-v2-vital-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{unit}</small>
  </div>
);

type InfoFieldProps = {
  label: string;
  children: React.ReactNode;
};

const InfoField: React.FC<InfoFieldProps> = ({ label, children }) => (
  <div className="er-v2-info-field">
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
);

export default EmergencyDisasterV2;
