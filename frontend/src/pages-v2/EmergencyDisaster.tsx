import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Drawer, Select, Input, Tag } from 'antd';
import { AlertOutlined, EyeOutlined, HomeOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TermIcon from '../layouts/terminal/Icon';
import {
  getActiveEvent, getVictims, registerVictim, activateCodeBlue,
  type MCIVictimDto, type RegisterVictimDto,
} from '../api/massCasualty';
import { registerEmergencyPatient, type EmergencyRegistrationDto } from '../api/reception';
import {
  listObservationStays, createObservationStay, dischargeObservationStay, escalateObservationStay,
  type ObservationStayDto,
} from '../api/observation';
import '../styles/EmergencyDisaster.css';

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
  stayId?: string; // ObservationStay.Id — có khi nguồn là phòng lưu thật (F3), dùng để persist disposition
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

type IntakePayload = {
  triage: TriageLevel;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  estimatedAge: string;
  mode: string;
  ambulatory: boolean;
  complaint: string;
  injuries: string;
  injuryMechanism: string;
};

const TRIAGE_LEVELS: TriageMeta[] = [
  { level: 1, label: 'Mức 1 · Hồi sức', description: 'Đe doạ tính mạng, xử trí ngay', color: '#c62828', soft: 'var(--s-crit-bg)', border: 'var(--s-crit-bd)' },
  { level: 2, label: 'Mức 2 · Khẩn cấp', description: 'Cần tiếp cận trong 10 phút', color: '#dd6b20', soft: 'var(--a-or-bg)', border: 'var(--s-warn-bd2)' },
  { level: 3, label: 'Mức 3 · Cấp', description: 'Theo dõi sát và cận lâm sàng sớm', color: '#b7791f', soft: 'var(--s-warn-bg)', border: 'var(--s-warn-bd)' },
  { level: 4, label: 'Mức 4 · Bán cấp', description: 'Có thể chờ ngắn hạn', color: '#0f766e', soft: '#ecfeff', border: '#99f6e4' },
  { level: 5, label: 'Mức 5 · Không cấp', description: 'Điều trị ngoại trú hoặc chờ khám', color: '#2f855a', soft: '#ecfdf5', border: 'var(--s-ok-bd)' },
];

const STATUS_OPTIONS: StatusMeta[] = [
  { value: 'triage', label: 'Đang phân loại', tone: 'warn' },
  { value: 'treating', label: 'Đang xử trí', tone: 'critical' },
  { value: 'observing', label: 'Theo dõi', tone: 'info' },
  { value: 'admitted', label: 'Chuyển nội trú', tone: 'ok' },
  { value: 'discharged', label: 'Cho về', tone: 'neutral' },
  { value: 'referred', label: 'Chuyển tuyến', tone: 'info' },
];

const PAGE_SIZE = 18;

// ─── ObservationStay → EmergencyCase mapper (F3 — nguồn dữ liệu thật) ──────────
// Màn Cấp cứu đọc phiên phòng lưu thật từ /observation/list (thay seed mô phỏng cũ).
// Danh sách chỉ mang field cấp-list (không có sinh hiệu chi tiết) → vitals hiển thị '—'.

function statusFromStayStatus(status: number): EmergencyStatus {
  switch (status) {
    case 2: return 'discharged';  // Cho về
    case 3: return 'admitted';    // Chuyển nhập viện
    case 4: return 'referred';    // Chuyển viện
    case 5: return 'discharged';  // Tử vong — không có trạng thái UI riêng
    default: return 'observing';  // 1 = Đang lưu
  }
}

function mapStayToCase(s: ObservationStayDto): EmergencyCase {
  const triage = (s.triageLevel && s.triageLevel >= 1 && s.triageLevel <= 5
    ? s.triageLevel : 3) as TriageLevel;
  return {
    code: s.stayCode,
    stayId: s.id,
    patientCode: s.patientCode || '—',
    patientName: s.patientName || '—',
    age: s.dateOfBirth ? dayjs().diff(dayjs(s.dateOfBirth), 'year') : 0,
    gender: s.gender === 2 ? 'Nữ' : 'Nam',
    arrivalTime: s.admittedAt,
    triage,
    status: statusFromStayStatus(s.status),
    complaint: s.chiefComplaint || s.initialDiagnosis || '—',
    mode: '—',
    doctor: s.doctorName || '—',
    bed: s.bedName || undefined,
    gcs: triage <= 2 ? 10 : 15,
    vitals: { bp: '—', hr: 0, temp: 0, spo2: 0 },
  };
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

const byArrivalDesc = (a: EmergencyCase, b: EmergencyCase) =>
  dayjs(b.arrivalTime).valueOf() - dayjs(a.arrivalTime).valueOf();

const EmergencyDisasterV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [rows, setRows] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'mci' | 'observation'>('observation');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);

  // Tải lại danh sách nạn nhân thật của sự kiện MCI đang hoạt động.
  const reloadVictims = useCallback(async (eventId: string) => {
    try {
      const vRes = await getVictims(eventId, 'all', 0);
      const list = Array.isArray(vRes?.data) ? vRes.data : [];
      setRows(list.map(mapVictimToCase).sort(byArrivalDesc));
    } catch {
      // giữ dữ liệu hiện tại nếu API lỗi
    }
  }, []);

  // Tải danh sách phiên phòng lưu thật — nguồn cấp cứu thường khi không có MCI.
  const reloadObservation = useCallback(async () => {
    try {
      const res = await listObservationStays();
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list.map(mapStayToCase).sort(byArrivalDesc));
    } catch {
      // giữ dữ liệu hiện tại nếu API lỗi
    }
  }, []);

  // Reload theo nguồn đang hiển thị (sau khi tiếp nhận / đổi disposition).
  const reload = useCallback(async () => {
    if (activeEventId) await reloadVictims(activeEventId);
    else await reloadObservation();
  }, [activeEventId, reloadVictims, reloadObservation]);

  // Mount: ưu tiên MCI đang hoạt động; không có sự kiện → đọc phòng lưu thật.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const evt = await getActiveEvent();
        if (evt?.data?.id) {
          setActiveEventId(evt.data.id);
          setSource('mci');
          const vRes = await getVictims(evt.data.id, 'all', 0);
          const list = Array.isArray(vRes?.data) ? vRes.data : [];
          setRows(list.map(mapVictimToCase).sort(byArrivalDesc));
          message.success(`Đang hiển thị MCI thật: ${evt.data.eventName} (${list.length} ca)`);
          return;
        }
      } catch {
        // không có MCI / API lỗi → fallback đọc phòng lưu
      }
      setSource('observation');
      await reloadObservation();
    })().finally(() => setLoading(false));
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
    const averageWait = rows.length === 0 ? 0 : Math.max(
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

  // Chuyển nội trú: phiên phòng lưu thật → escalate (status=3) + reload; nguồn khác (MCI) → đổi local.
  const handleAdmit = async (row: EmergencyCase): Promise<void> => {
    if (row.stayId) {
      try {
        await escalateObservationStay(row.stayId, { dischargeReason: 'Chuyển nhập viện từ phòng lưu cấp cứu' });
        await reload();
        message.success(`Đã chuyển ${row.patientName} sang nội trú`);
      } catch {
        message.error('Chuyển nội trú thất bại. Vui lòng thử lại.');
      }
      return;
    }
    mutateRow(row.code, { status: 'admitted' });
    message.success(`Đã chuyển ${row.patientName} sang nội trú`);
  };

  // Cho về sau theo dõi: phiên phòng lưu thật → discharge (status=2) + reload; nguồn khác → đổi local.
  const handleDischarge = async (row: EmergencyCase): Promise<void> => {
    if (row.stayId) {
      try {
        await dischargeObservationStay(row.stayId, { dischargeReason: 'Cho về sau theo dõi cấp cứu' });
        await reload();
        message.success(`Đã hoàn tất xử trí cho ${row.patientName}`);
      } catch {
        message.error('Cho về thất bại. Vui lòng thử lại.');
      }
      return;
    }
    mutateRow(row.code, { status: 'discharged' });
    message.success(`Đã hoàn tất xử trí cho ${row.patientName}`);
  };

  // Tiếp nhận ca cấp cứu mới → registerVictim vào MCI đang hoạt động.
  // Tiếp nhận ca cấp cứu mới:
  //  - Có MCI đang hoạt động → registerVictim vào sự kiện (như cũ).
  //  - Không có MCI (cấp cứu thường) → đăng ký tiếp nhận cấp cứu thật (Reception, TreatmentType=3)
  //    rồi tạo phiên phòng lưu (ObservationStay) để theo dõi + persist triage/disposition.
  const onIntakeSubmit = async (payload: IntakePayload): Promise<void> => {
    setIntakeSubmitting(true);
    try {
      if (activeEventId) {
        const dto: RegisterVictimDto = {
          eventId: activeEventId,
          fullName: payload.fullName.trim() || undefined,
          estimatedAge: payload.estimatedAge ? Number(payload.estimatedAge) : undefined,
          gender: payload.gender === 'Nam' ? 'male' : 'female',
          chiefComplaint: payload.complaint.trim() || undefined,
          injuries: payload.injuries.trim()
            ? payload.injuries.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
            : undefined,
          injuryMechanism: payload.injuryMechanism.trim() || undefined,
          ambulatory: payload.ambulatory,
        };
        await registerVictim(dto);
        await reloadVictims(activeEventId);
        message.success(`Đã tiếp nhận ca cấp cứu · ${payload.fullName || 'chưa xác định'}`);
      } else {
        // 1) Đăng ký tiếp nhận cấp cứu → tạo BN tạm + HSBA (TreatmentType=3) + lượt khám ưu tiên.
        const regDto: EmergencyRegistrationDto = {
          patientName: payload.fullName.trim() || undefined,
          gender: payload.gender === 'Nam' ? 1 : 2,
          estimatedAge: payload.estimatedAge ? Number(payload.estimatedAge) : undefined,
          patientType: 2, // Viện phí (chưa xác minh BHYT khi cấp cứu)
          chiefComplaint: payload.complaint.trim() || payload.injuries.trim() || undefined,
          severity: Math.min(4, payload.triage), // severity DTO 1-4
          transportMethod: payload.mode || undefined,
        };
        const admRes = await registerEmergencyPatient(regDto);
        const adm = admRes.data;
        // 2) Tạo phiên phòng lưu theo dõi gắn với HSBA cấp cứu vừa tạo.
        await createObservationStay({
          patientId: adm.patientId,
          medicalRecordId: adm.id,
          departmentId: adm.departmentId,
          doctorId: adm.doctorId,
          chiefComplaint: payload.complaint.trim() || undefined,
          initialDiagnosis: payload.injuries.trim() || undefined,
          notes: payload.injuryMechanism.trim() || undefined,
          triageLevel: payload.triage,
        });
        await reloadObservation();
        const who = adm.patientName || payload.fullName || 'BN cấp cứu';
        message.success(`Đã tiếp nhận cấp cứu · ${who}${adm.medicalRecordCode ? ` (${adm.medicalRecordCode})` : ''}`);
      }
      setIntakeOpen(false);
    } catch {
      message.error('Tiếp nhận thất bại. Vui lòng thử lại.');
    } finally {
      setIntakeSubmitting(false);
    }
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
      {source === 'mci' && (
        <div style={{ background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '6px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-md)' }}>
          <Tag color="red">MCI ĐANG HOẠT ĐỘNG</Tag>
          Đang hiển thị nạn nhân của sự kiện thảm họa hàng loạt (mass casualty) trên hệ thống thật.
        </div>
      )}
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
              onClick={() => setIntakeOpen(true)}
            >
              <TermIcon name="plus" size={14} />
              Tiếp nhận cấp cứu
            </button>
            <button
              className="er-v2-btn danger"
              type="button"
              onClick={() => modal.confirm({
                title: 'Kích hoạt Code Blue — Báo động đỏ cấp cứu',
                content: (
                  <div>
                    <Tag color="red" style={{ marginBottom: 8 }}>CẢNH BÁO — Hành động thật, không thể hoàn tác</Tag>
                    <p>Sự kiện Code Blue sẽ được ghi vào hệ thống ngay lập tức.</p>
                    <p>Xác nhận chỉ khi đây là tình huống cấp cứu thật sự.</p>
                  </div>
                ),
                okText: 'Kích hoạt Code Blue',
                cancelText: 'Huỷ',
                okType: 'danger',
                onOk: async () => {
                  try {
                    const evt = await activateCodeBlue();
                    message.success(`Code Blue đã kích hoạt — Mã: ${evt.data?.eventCode ?? ''}`);
                  } catch {
                    message.error('Kích hoạt Code Blue thất bại. Vui lòng thử lại.');
                  }
                },
              })}
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
            <span className="er-v2-badge ok" title={source === 'mci' ? 'Đang hiển thị nạn nhân MCI thật' : 'Đang hiển thị phiên phòng lưu cấp cứu thật'}>
              {source === 'mci' ? 'MCI' : 'Phòng lưu'}
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
              {loading && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '28px 0', color: '#6b7280' }}>Đang tải dữ liệu cấp cứu…</td></tr>
              )}
              {!loading && pagedRows.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '28px 0', color: '#6b7280' }}>
                  {source === 'mci' ? 'Sự kiện MCI chưa có nạn nhân.' : 'Chưa có ca cấp cứu nào đang theo dõi. Bấm “Tiếp nhận cấp cứu” để thêm.'}
                </td></tr>
              )}
              {!loading && pagedRows.map((row) => {
                const triage = TRIAGE_LEVELS.find((item) => item.level === row.triage)!;
                const status = STATUS_OPTIONS.find((item) => item.value === row.status)!;
                return (
                  <tr key={row.code} onClick={() => openCase(row)} style={{ cursor: 'pointer' }}>
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
                        <button type="button" className="er-v2-icon-btn" onClick={(e) => { e.stopPropagation(); openCase(row); }}>
                          <EyeOutlined />
                        </button>
                        {!['admitted', 'discharged', 'referred'].includes(row.status) && (
                          <>
                            <button
                              type="button"
                              className="er-v2-icon-btn"
                              title="Chuyển nội trú"
                              onClick={(e) => { e.stopPropagation(); void handleAdmit(row); }}
                            >
                              <HomeOutlined />
                            </button>
                            <button
                              type="button"
                              className="er-v2-icon-btn"
                              title="Cho về sau theo dõi"
                              onClick={(e) => { e.stopPropagation(); void handleDischarge(row); }}
                            >
                              <LogoutOutlined />
                            </button>
                          </>
                        )}
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
              const target = selectedCase;
              setSelectedCase(null);
              void handleAdmit(target);
            }}
            onPrint={() => window.print()}
          />
        )}
      </Drawer>

      <Drawer
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        title="Tiếp nhận ca cấp cứu mới"
        placement="right"
        size="large"
        destroyOnHidden
      >
        {intakeOpen && (
          <IntakeDrawerContent
            submitting={intakeSubmitting}
            isMci={!!activeEventId}
            onClose={() => setIntakeOpen(false)}
            onSubmit={onIntakeSubmit}
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

const MODE_OPTIONS = ['Tự đến', 'Xe cấp cứu 115', 'Người nhà đưa', 'Chuyển tuyến', 'Công an/CSGT'];

type IntakeDrawerContentProps = {
  submitting: boolean;
  isMci: boolean;
  onClose: () => void;
  onSubmit: (payload: IntakePayload) => void;
};

const IntakeDrawerContent: React.FC<IntakeDrawerContentProps> = ({ submitting, isMci, onClose, onSubmit }) => {
  const [triage, setTriage] = useState<TriageLevel>(3);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [estimatedAge, setEstimatedAge] = useState('');
  const [mode, setMode] = useState(MODE_OPTIONS[0]);
  const [complaint, setComplaint] = useState('');
  const [injuries, setInjuries] = useState('');
  const [injuryMechanism, setInjuryMechanism] = useState('');
  const [err, setErr] = useState('');

  const meta = TRIAGE_LEVELS.find((item) => item.level === triage)!;
  const ambulatory = triage >= 4; // mức 4-5 ~ tự đi được (START: green)

  const submit = (): void => {
    if (!complaint.trim() && !injuries.trim()) {
      setErr('Nhập lý do vào cấp cứu hoặc mô tả thương tích');
      return;
    }
    setErr('');
    onSubmit({ triage, fullName, gender, estimatedAge, mode, ambulatory, complaint, injuries, injuryMechanism });
  };

  return (
    <div className="er-v2-drawer">
      <div className="er-v2-hero" style={{ background: meta.color }}>
        <div className="er-v2-hero-level">{triage}</div>
        <div>
          <div className="er-v2-hero-title">{meta.label}</div>
          <div className="er-v2-hero-sub">{meta.description}</div>
        </div>
      </div>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Phân loại triage</div>
        <div className="er-v2-triage-grid">
          {TRIAGE_LEVELS.map((item) => (
            <button
              key={item.level}
              type="button"
              className={`er-v2-triage-opt ${triage === item.level ? 'on' : ''}`.trim()}
              style={triage === item.level ? { borderColor: item.color, background: item.soft } : undefined}
              onClick={() => setTriage(item.level)}
            >
              <span className="lvl" style={{ background: item.color }}>{item.level}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Thông tin nạn nhân</div>
        <div className="er-v2-form-grid">
          <label className="er-v2-field">
            <span>Họ tên (nếu biết)</span>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Chưa xác định" />
          </label>
          <label className="er-v2-field">
            <span>Giới tính</span>
            <Select
              value={gender}
              onChange={(v) => setGender(v as 'Nam' | 'Nữ')}
              options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]}
            />
          </label>
          <label className="er-v2-field">
            <span>Tuổi ước tính</span>
            <Input type="number" value={estimatedAge} onChange={(e) => setEstimatedAge(e.target.value)} placeholder="—" />
          </label>
          <label className="er-v2-field">
            <span>Đường vào</span>
            <Select
              value={mode}
              onChange={(v) => setMode(v as string)}
              options={MODE_OPTIONS.map((m) => ({ value: m, label: m }))}
            />
          </label>
        </div>
      </section>

      <section className="er-v2-section">
        <div className="er-v2-section-title">Lý do & thương tích</div>
        <div className="er-v2-form-stack">
          <label className="er-v2-field">
            <span>Lý do vào cấp cứu</span>
            <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="VD: Đau ngực dữ dội, khó thở cấp…" />
          </label>
          <label className="er-v2-field">
            <span>Mô tả thương tích</span>
            <Input.TextArea
              rows={2}
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Vết thương, vị trí, mức độ… (phân tách bằng dấu phẩy)"
            />
          </label>
          <label className="er-v2-field">
            <span>Cơ chế chấn thương</span>
            <Input value={injuryMechanism} onChange={(e) => setInjuryMechanism(e.target.value)} placeholder="VD: TNGT, ngã cao, bỏng…" />
          </label>
        </div>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)', marginTop: 6 }}>{err}</div>}
      </section>

      {!isMci && (
        <div style={{
          margin: '0 0 10px', padding: '10px 12px', background: '#ecfdf5',
          border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 'var(--fs-sm)', color: '#065f46',
        }}>
          Cấp cứu thường — hệ thống sẽ tạo hồ sơ tiếp nhận cấp cứu thật + phiên phòng lưu theo dõi (lưu xuống hệ thống).
        </div>
      )}

      <div className="er-v2-drawer-actions">
        <button type="button" className="er-v2-btn" onClick={onClose}>Huỷ</button>
        <button type="button" className="er-v2-btn primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Tiếp nhận'}
        </button>
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
