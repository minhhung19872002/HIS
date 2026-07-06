/* =====================================================================
   HIS Terminal · Cổng Bác sĩ (Mobile-first) — port of design-system
   mod-doctor-portal-mobile.jsx. Standalone full-screen mobile app
   (phone-frame preview on desktop). Real examination API.
   ===================================================================== */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import { searchExaminations, getPhysicalExamination } from '../api/examination';
import type { ExaminationDto, PhysicalExaminationDto } from '../api/examination';
import { printEmrForm } from '../api/pdf';
import { storage, STORAGE_KEYS } from '../services/storage.service';
import {
  getInpatientList,
  createTreatmentSheet,
  createPrescription,
  createServiceOrder,
  printTreatmentSheet,
  searchMedicines,
} from '../api/inpatient';
import type { InpatientListDto, MedicineSearchItemDto } from '../api/inpatient';
import { getWarehouses } from '../api/warehouse';
import ClinicalTemplatePicker from '../components/ClinicalTemplatePicker';
import { TEMPLATE_TYPES } from '../api/clinicalTemplate';
import type { WarehouseDto } from '../api/warehouse';
import './portal-mobile.css';

type Tab = 'today' | 'queue' | 'patients' | 'inpatient' | 'me';

interface QRow { stt: number; name: string; pid: string; reason: string; time: string; status: 'next' | 'wait' | 'done'; room: string }
interface PRow { pid: string; name: string; visits: number; dx: string; lastVisit: string }

const lastName = (n: string) => (n || '').trim().split(' ').slice(-1)[0] || '';
const fmtD = (iso?: string) => (iso ? dayjs(iso).format('DD/MM') : '');

const Ico: React.FC<{ name: string; size?: number }> = ({ name, size = 22 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    stetho: <><path d="M6 3v6a4 4 0 0 0 8 0V3M10 3h-4M14 3h-4M10 13v3a4 4 0 0 0 8 0v-1" /><circle cx="18" cy="13" r="2" /></>,
    patients: <><circle cx="9" cy="8" r="3.5" /><path d="M3 21c1-4 3-5 6-5s5 1 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15 21c.5-2 1.5-3 3.5-3s2.5 1 3 3" /></>,
    msg: <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    sign: <path d="M3 17c4 0 4-10 8-10s2 7 5 7 3-3 5-3" />,
    play: <path d="M6 4l14 8-14 8z" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
    chevron: <path d="M9 6l6 6-6 6" />,
    logout: <path d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
    print: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    back: <path d="M19 12H5M12 5l-7 7 7 7" />,
    pill: <><path d="m18.5 2.5-16 16" /><path d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" /></>,
    lab: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  };
  return <svg {...p}>{paths[name] || paths.today}</svg>;
};

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  if (isMobile) return <div className="pp-app dp-app">{children}</div>;
  return (
    <div className="pp-frame-stage dp-frame-stage">
      <div className="pp-frame-bg"><div className="pp-frame-blob a" /><div className="pp-frame-blob b" /><div className="pp-frame-blob c" /></div>
      <div className="pp-frame-info">
        <div className="pp-frame-info-eyebrow">HIS Terminal · For Doctors</div>
        <h1>Cổng Bác sĩ</h1>
        <div className="pp-frame-feats">
          <div>· Hàng đợi &amp; bắt đầu khám</div>
          <div>· Ký số đơn / kết quả</div>
          <div>· Hồ sơ bệnh nhân</div>
          <div>· Hiệu suất ca trực</div>
        </div>
      </div>
      <div className="pp-frame-phone">
        <div className="pp-frame-notch" />
        <div className="pp-app dp-app">{children}</div>
        <div className="pp-frame-home" />
      </div>
    </div>
  );
};

const StatusBar: React.FC = () => (
  <div className="pp-status"><span>{dayjs().format('HH:mm')}</span><span className="pp-status-r"><span>•••</span><span>📶</span><span>🔋</span></span></div>
);

const TABS: { v: Tab; ic: string; l: string; badge?: number }[] = [
  { v: 'today', ic: 'today', l: 'Hôm nay' },
  { v: 'queue', ic: 'stetho', l: 'Hàng đợi' },
  { v: 'patients', ic: 'patients', l: 'Bệnh nhân' },
  { v: 'inpatient', ic: 'edit', l: 'Nội trú' },
  { v: 'me', ic: 'user', l: 'Tôi' },
];

const DoctorPortalMobile: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [exams, setExams] = useState<ExaminationDto[]>([]);
  const [inpatients, setInpatients] = useState<InpatientListDto[]>([]);

  const doctorName = useMemo(() => {
    try { return storage.get<{ fullName?: string }>(STORAGE_KEYS.user)?.fullName || 'Bác sĩ'; } catch { return 'Bác sĩ'; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await searchExaminations({
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
          pageIndex: 1, pageSize: 300,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cancelled) setExams(((r as any)?.data?.items || []) as ExaminationDto[]);
      } catch { if (!cancelled) setExams([]); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load danh sách BN nội trú khi chuyển sang tab Nội trú
  useEffect(() => {
    if (tab !== 'inpatient') return;
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await getInpatientList({ status: 1, pageSize: 100 } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cancelled) setInpatients(((r as any)?.items ?? (r as any)?.data?.items ?? r ?? []) as InpatientListDto[]);
      } catch { if (!cancelled) setInpatients([]); }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const today = dayjs().startOf('day');
  const todayExams = useMemo(() => exams.filter((e) => dayjs(e.examinationDate).isSame(today, 'day')), [exams, today]);
  const queue: QRow[] = useMemo(() => todayExams
    .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0))
    .map((e) => ({
      stt: e.queueNumber || 0,
      name: e.patientName,
      pid: e.patientCode,
      reason: e.diagnosisName || 'Chờ chẩn đoán',
      time: dayjs(e.examinationDate).format('HH:mm'),
      status: e.status === 4 ? 'done' : e.status === 1 ? 'next' : 'wait',
      room: e.roomName || '',
    })), [todayExams]);
  const stats = useMemo(() => ({
    done: todayExams.filter((e) => e.status === 4).length,
    pending: todayExams.filter((e) => e.status !== 4).length,
    signs: todayExams.filter((e) => e.status === 3).length,
  }), [todayExams]);
  const next = queue.find((q) => q.status === 'next') || queue.find((q) => q.status === 'wait');

  const patients: PRow[] = useMemo(() => {
    const map = new Map<string, PRow & { _d: number }>();
    exams.forEach((e) => {
      const key = e.patientCode || e.patientId;
      const t = dayjs(e.examinationDate).valueOf();
      const cur = map.get(key);
      if (!cur) map.set(key, { pid: e.patientCode, name: e.patientName, visits: 1, dx: e.diagnosisName || '—', lastVisit: fmtD(e.examinationDate), _d: t });
      else { cur.visits += 1; if (t > cur._d) { cur._d = t; cur.dx = e.diagnosisName || cur.dx; cur.lastVisit = fmtD(e.examinationDate); } }
    });
    return Array.from(map.values()).sort((a, b) => b._d - a._d);
  }, [exams]);

  return (
    <PhoneFrame>
      <StatusBar />
      <div className="pp-scroll">
        {tab === 'today' && <Today doctorName={doctorName} stats={stats} next={next} queue={queue} go={setTab} onStart={() => message.info('Mở phiên khám')} />}
        {tab === 'queue' && <Queue queue={queue} onPick={() => message.info('Mở phiên khám')} />}
        {tab === 'patients' && <Patients patients={patients} allExams={exams} />}
        {tab === 'inpatient' && <Inpatient inpatients={inpatients} onMessage={message.info} />}
        {tab === 'me' && <Me doctorName={doctorName} stats={stats} onLogout={() => message.info('Tan ca / Đăng xuất')} />}
      </div>
      <nav className="pp-tabbar">
        {TABS.map((t) => (
          <button key={t.v} className={`pp-tab ${tab === t.v ? 'on' : ''}`} onClick={() => setTab(t.v)}>
            <span style={{ position: 'relative' }}><Ico name={t.ic} size={22} /></span><span>{t.l}</span>
          </button>
        ))}
      </nav>
    </PhoneFrame>
  );
};

const Today: React.FC<{ doctorName: string; stats: { done: number; pending: number; signs: number }; next?: QRow; queue: QRow[]; go: (t: Tab) => void; onStart: () => void }> = ({ doctorName, stats, next, go, onStart }) => {
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào trưa' : hour < 18 ? 'Chào chiều' : 'Chào tối';
  return (
    <>
      <header className="pp-home-hdr">
        <div>
          <div className="pp-home-greet">{greet}, {doctorName}</div>
          <div className="pp-home-name">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <div className="pp-home-icons"><button className="pp-circ"><Ico name="search" /></button><button className="pp-circ"><Ico name="bell" /><span className="pp-dot" /></button></div>
      </header>

      <section className="dp-oncall-card">
        <div className="dp-oncall-grid" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div>
            <div className="dp-oncall-l"><span className="dp-pulse" /> Đang trực</div>
            <div className="dp-oncall-h">Ca làm việc đến 17:30</div>
          </div>
          <button className="dp-oncall-toggle">Tan ca</button>
        </div>
        <div className="dp-oncall-stats">
          <div><b>{stats.done}</b><span>Đã khám</span></div>
          <div><b>{stats.pending}</b><span>Đang chờ</span></div>
          <div><b>{stats.signs}</b><span>Cần ký</span></div>
        </div>
      </section>

      <section className="pp-quick">
        {[
          { ic: 'stetho', l: 'Khám tiếp', c: 'blue', on: () => go('queue') },
          { ic: 'sign', l: `Ký (${stats.signs})`, c: 'purple', on: () => go('queue') },
          { ic: 'video', l: 'Video call', c: 'green', on: () => {} },
          { ic: 'edit', l: 'Ghi chú', c: 'amber', on: () => {} },
        ].map((q, i) => (
          <button key={i} className={`pp-quick-btn ${q.c}`} onClick={q.on}><span className="pp-quick-ic"><Ico name={q.ic} /></span><span>{q.l}</span></button>
        ))}
      </section>

      {next && (
        <section className="pp-section">
          <div className="pp-sec-hdr"><h3>BN tiếp theo</h3></div>
          <div className="pp-card dp-next" onClick={onStart}>
            <div className="dp-next-stt">{next.stt || '—'}</div>
            <div className="dp-next-body">
              <div className="dp-next-name">{next.name}</div>
              <div className="dp-next-meta">{next.pid}{next.room ? ` · ${next.room}` : ''}</div>
              <div className="dp-next-reason">"{next.reason}"</div>
            </div>
            <button className="dp-next-cta"><Ico name="play" size={18} /> Bắt đầu</button>
          </div>
        </section>
      )}

      <section className="pp-section">
        <div className="pp-sec-hdr"><h3>Hiệu suất hôm nay</h3></div>
        <div className="dp-perf-card">
          <div className="dp-perf-row">
            <span>BN đã khám</span>
            <div className="dp-perf-bar"><div style={{ width: `${stats.done + stats.pending > 0 ? Math.round(stats.done / (stats.done + stats.pending) * 100) : 0}%` }} /></div>
            <b>{stats.done}/{stats.done + stats.pending}</b>
          </div>
          <div className="dp-perf-row">
            <span>Còn chờ</span>
            <div className="dp-perf-bar warn"><div style={{ width: `${stats.done + stats.pending > 0 ? Math.round(stats.pending / (stats.done + stats.pending) * 100) : 0}%` }} /></div>
            <b>{stats.pending}</b>
          </div>
        </div>
      </section>
      <div className="pp-pad-bot" />
    </>
  );
};

const Queue: React.FC<{ queue: QRow[]; onPick: () => void }> = ({ queue, onPick }) => {
  const [filter, setFilter] = useState<'all' | 'wait' | 'done'>('all');
  const list = queue.filter((q) => filter === 'all' ? true : filter === 'wait' ? (q.status === 'wait' || q.status === 'next') : q.status === 'done');
  return (
    <>
      <div className="pp-page-hdr"><h2>Hàng đợi</h2><span className="dp-clock">{dayjs().format('HH:mm')}</span></div>
      <div className="pp-segmented" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tất cả · {queue.length}</button>
        <button className={filter === 'wait' ? 'on' : ''} onClick={() => setFilter('wait')}>Chờ · {queue.filter((q) => q.status !== 'done').length}</button>
        <button className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>Đã khám · {queue.filter((q) => q.status === 'done').length}</button>
      </div>
      <div className="pp-list">
        {list.map((q, i) => (
          <div key={`${q.pid}-${i}`} className={`pp-card dp-q-card ${q.status}`} onClick={onPick}>
            <div className="dp-q-stt t3">{q.stt || '—'}</div>
            <div className="dp-q-body">
              <div className="dp-q-name">{q.name}</div>
              <div className="dp-q-meta">{q.pid}{q.room ? ` · ${q.room}` : ''}</div>
              <div className="dp-q-reason">"{q.reason}"</div>
              <div className="dp-q-tags"><span className="dp-q-time">{q.time}</span></div>
            </div>
            {q.status === 'next' && <div className="dp-q-now">ĐANG GỌI</div>}
            {q.status === 'done' && <div className="dp-q-check">✓</div>}
          </div>
        ))}
        {list.length === 0 && <div className="pp-empty"><Ico name="stetho" size={42} /><div>Không có bệnh nhân trong hàng đợi</div></div>}
      </div>
    </>
  );
};

// ===================================================
// Tab Bệnh nhân — có màn xem chi tiết HSBA + in
// ===================================================

interface PatientEmrDetail {
  examinationId: string;
  patientName: string;
  patientCode: string;
  examinationDate: string;
  diagnosisName?: string;
  physicalExam?: PhysicalExaminationDto;
  loading: boolean;
}

const EmrDetailView: React.FC<{ detail: PatientEmrDetail; onBack: () => void }> = ({ detail, onBack }) => {
  const exam = detail.physicalExam;
  const handlePrint = () => printEmrForm(detail.examinationId, 'summary');

  return (
    <>
      <div className="pp-page-hdr" style={{ gap: 8 }}>
        <button className="pp-circ" onClick={onBack}><Ico name="back" size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{detail.patientName}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{detail.patientCode} · {dayjs(detail.examinationDate).format('DD/MM/YYYY')}</div>
        </div>
        <button
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        ><Ico name="print" size={15} />In</button>
      </div>

      {detail.loading ? (
        <div className="pp-empty"><div style={{ color: '#888' }}>Đang tải...</div></div>
      ) : (
        <div style={{ padding: '0 12px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Chẩn đoán */}
          <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#ad6800', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Chẩn đoán</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{detail.diagnosisName || '— Chưa có chẩn đoán —'}</div>
          </div>

          {/* Khám lâm sàng */}
          {exam && (
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#389e0d', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Khám lâm sàng</div>
              <EmrSection label="Tổng trạng" value={exam.generalAppearance} />
              <EmrSection label="Tim mạch" value={exam.cardiovascular} />
              <EmrSection label="Hô hấp" value={exam.respiratory} />
              <EmrSection label="Tiêu hóa" value={exam.gastrointestinal} />
              <EmrSection label="Thần kinh" value={exam.neurological} />
              <EmrSection label="Ghi chú khác" value={exam.otherFindings} />
            </div>
          )}

          {/* Đơn thuốc — hướng dẫn dùng API */}
          <EmrInfoCard icon="pill" label="Đơn thuốc / Dự trù" tone="#fff0f6" borderColor="#ffadd2" textColor="#c41d7f">
            <div style={{ fontSize: 12, color: '#888' }}>Xem đơn thuốc đầy đủ → mở Desktop hoặc tab Nội trú</div>
          </EmrInfoCard>

          {/* CLS */}
          <EmrInfoCard icon="lab" label="Chỉ định CLS" tone="#f0f5ff" borderColor="#adc6ff" textColor="#1d39c4">
            <div style={{ fontSize: 12, color: '#888' }}>Xem kết quả CLS đầy đủ → mở Desktop</div>
          </EmrInfoCard>

          {/* Nút in */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <button
              onClick={handlePrint}
              style={{ padding: '12px 0', borderRadius: 10, background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            ><Ico name="print" size={18} />In phiếu tóm tắt (wifi)</button>
            <button
              onClick={() => printEmrForm(detail.examinationId, 'treatment')}
              style={{ padding: '12px 0', borderRadius: 10, background: '#f0f0f0', color: '#333', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            ><Ico name="print" size={18} />In tờ điều trị</button>
          </div>
        </div>
      )}
    </>
  );
};

const EmrSection: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{value}</div>
    </div>
  ) : null;

const VitalChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ background: '#fff', border: '1px solid #d9f7be', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#8c8c8c' }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
  </div>
);

const EmrInfoCard: React.FC<{ icon: string; label: string; tone: string; borderColor: string; textColor: string; children: React.ReactNode }> = ({ icon, label, tone, borderColor, textColor, children }) => (
  <div style={{ background: tone, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '10px 14px' }}>
    <div style={{ fontSize: 11, color: textColor, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Ico name={icon} size={13} />{label}
    </div>
    {children}
  </div>
);

const Patients: React.FC<{ patients: PRow[]; allExams: ExaminationDto[] }> = ({ patients, allExams }) => {
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<PatientEmrDetail | null>(null);

  const list = patients.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.pid.toLowerCase().includes(q.toLowerCase()));

  const openEmr = async (p: PRow) => {
    // Lấy lần khám gần nhất của BN
    const lastExam = allExams
      .filter((e) => e.patientCode === p.pid)
      .sort((a, b) => dayjs(b.examinationDate).valueOf() - dayjs(a.examinationDate).valueOf())[0];
    if (!lastExam) return;

    const d: PatientEmrDetail = {
      examinationId: lastExam.id,
      patientName: p.name,
      patientCode: p.pid,
      examinationDate: lastExam.examinationDate,
      diagnosisName: lastExam.diagnosisName,
      loading: true,
    };
    setDetail(d);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const physExam = await getPhysicalExamination(lastExam.id) as any;
      setDetail({ ...d, physicalExam: physExam, loading: false });
    } catch {
      setDetail({ ...d, loading: false });
    }
  };

  if (detail) return <EmrDetailView detail={detail} onBack={() => setDetail(null)} />;

  return (
    <>
      <div className="pp-page-hdr"><h2>Bệnh nhân</h2></div>
      <div className="dp-search"><Ico name="search" size={18} /><input placeholder="Tìm tên / mã BN" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="pp-list">
        {list.map((p) => (
          <div key={p.pid} className="pp-card dp-p-card" onClick={() => openEmr(p)} style={{ cursor: 'pointer' }}>
            <div className="pp-avatar pp-avatar-md">{lastName(p.name).charAt(0)}</div>
            <div className="dp-p-body">
              <div className="dp-p-name">{p.name}</div>
              <div className="dp-p-meta">{p.pid} · {p.visits} lần</div>
              <div className="dp-p-dx">{p.dx}</div>
            </div>
            <div className="dp-p-last">{p.lastVisit}<small>lần cuối</small></div>
          </div>
        ))}
        {list.length === 0 && <div className="pp-empty"><Ico name="patients" size={42} /><div>Chưa có bệnh nhân</div></div>}
      </div>
    </>
  );
};

const Me: React.FC<{ doctorName: string; stats: { done: number; pending: number; signs: number }; onLogout: () => void }> = ({ doctorName, stats, onLogout }) => (
  <>
    <div className="pp-me-hdr">
      <div className="pp-avatar pp-avatar-lg">{lastName(doctorName).charAt(0)}</div>
      <div className="pp-me-name">{doctorName}</div>
      <div className="pp-me-meta">Bác sĩ · Đang trực</div>
      <div className="pp-me-meta">Hôm nay: {stats.done} đã khám · {stats.pending} đang chờ</div>
    </div>
    <div className="pp-me-list">
      {[
        { ic: 'stetho', l: 'Lịch trực', v: 'Ca sáng' },
        { ic: 'sign', l: 'Chờ ký', v: String(stats.signs) },
        { ic: 'bell', l: 'Thông báo', v: 'Bật' },
        { ic: 'msg', l: 'Trợ giúp' },
      ].map((r, i) => (
        <div key={i} className="pp-me-row"><div className="pp-me-ic"><Ico name={r.ic} size={18} /></div><div className="pp-me-rt"><div className="pp-me-rl">{r.l}</div>{r.v && <div className="pp-me-rv">{r.v}</div>}</div><Ico name="chevron" size={16} /></div>
      ))}
      <div className="pp-me-row danger" onClick={onLogout}><div className="pp-me-ic"><Ico name="logout" size={18} /></div><div className="pp-me-rt"><div className="pp-me-rl">Tan ca / Đăng xuất</div></div><Ico name="chevron" size={16} /></div>
    </div>
    <div className="pp-pad-bot" />
    <div className="pp-version">HIS Terminal · Cổng Bác sĩ</div>
  </>
);

// ===================================================
// Tab Nội trú — nhập tờ điều trị, dự trù thuốc, CLS
// ===================================================

type InpatientSubTab = 'list' | 'treatment' | 'rx' | 'cls';

const Inpatient: React.FC<{ inpatients: InpatientListDto[]; onMessage: (msg: string) => void }> = ({ inpatients, onMessage }) => {
  const [subTab, setSubTab] = useState<InpatientSubTab>('list');
  const [selected, setSelected] = useState<InpatientListDto | null>(null);
  const [q, setQ] = useState('');

  // Search filter
  const filtered = inpatients.filter((p) =>
    !q || p.patientName.toLowerCase().includes(q.toLowerCase()) || p.patientCode.toLowerCase().includes(q.toLowerCase())
  );

  const selectPatient = (p: InpatientListDto) => {
    setSelected(p);
    setSubTab('treatment');
  };

  const back = useCallback(() => {
    setSelected(null);
    setSubTab('list');
  }, []);

  if (subTab === 'list' || !selected) {
    return (
      <>
        <div className="pp-page-hdr"><h2>Nội trú</h2></div>
        <div className="dp-search"><Ico name="search" size={18} /><input placeholder="Tìm tên / mã BN nội trú" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pp-list">
          {filtered.map((p) => (
            <div key={p.admissionId} className="pp-card dp-p-card" onClick={() => selectPatient(p)} style={{ cursor: 'pointer' }}>
              <div className="pp-avatar pp-avatar-md">{lastName(p.patientName).charAt(0)}</div>
              <div className="dp-p-body">
                <div className="dp-p-name">{p.patientName}</div>
                <div className="dp-p-meta">{p.patientCode} · {p.roomName}{p.bedName ? `/${p.bedName}` : ''}</div>
                <div className="dp-p-dx">{p.mainDiagnosis || '—'}</div>
              </div>
              <div className="dp-p-last">{p.daysOfStay}<small>ngày</small></div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="pp-empty"><Ico name="patients" size={42} /><div>{inpatients.length === 0 ? 'Đang tải...' : 'Không có BN nội trú'}</div></div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pp-page-hdr" style={{ gap: 8 }}>
        <button className="pp-circ" onClick={back}><Ico name="chevron" size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.patientName}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{selected.patientCode} · {selected.roomName}{selected.bedName ? `/${selected.bedName}` : ''}</div>
        </div>
      </div>

      {/* Sub-tab: Tờ điều trị / Dự trù thuốc / CLS */}
      <div className="pp-segmented" style={{ gridTemplateColumns: 'repeat(3,1fr)', margin: '0 12px 8px' }}>
        <button className={subTab === 'treatment' ? 'on' : ''} onClick={() => setSubTab('treatment')}>Tờ ĐT</button>
        <button className={subTab === 'rx' ? 'on' : ''} onClick={() => setSubTab('rx')}>Dự trù</button>
        <button className={subTab === 'cls' ? 'on' : ''} onClick={() => setSubTab('cls')}>CLS</button>
      </div>

      {subTab === 'treatment' && <TreatmentForm admissionId={selected.admissionId} onMessage={onMessage} />}
      {subTab === 'rx' && <PrescriptionForm admissionId={selected.admissionId} onMessage={onMessage} />}
      {subTab === 'cls' && <ServiceOrderForm admissionId={selected.admissionId} onMessage={onMessage} />}
    </>
  );
};

// Mẫu diễn biến thường dùng — hardcode local const, không cần API
const PROGRESS_TEMPLATES = [
  'Bệnh nhân ổn định, tỉnh táo, tiếp xúc tốt. Dấu hiệu sinh tồn trong giới hạn bình thường.',
  'Bệnh nhân tiến triển tốt, giảm đau, ăn uống được. Tiếp tục điều trị theo phác đồ.',
  'Bệnh nhân còn đau vừa, mệt nhiều. Tiếp tục theo dõi và điều trị tích cực.',
  'Bệnh nhân nặng hơn, khó thở tăng. Đã xử trí cấp cứu, theo dõi sát.',
  'Bệnh nhân ổn định sau can thiệp. Không có biến chứng mới trong 24 giờ qua.',
];

// ---- Tờ điều trị ----
const TreatmentForm: React.FC<{ admissionId: string; onMessage: (m: string) => void }> = ({ admissionId, onMessage }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [progress, setProgress] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [orders, setOrders] = useState('');
  const [nursingOrders, setNursingOrders] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const save = async () => {
    if (!progress && !orders) { onMessage('Nhập ít nhất diễn biến hoặc y lệnh'); return; }
    setSaving(true);
    const progressWithDx = diagnosis.trim()
      ? `[Chẩn đoán: ${diagnosis.trim()}]\n${progress}`
      : progress;
    try {
      const r = await createTreatmentSheet({
        admissionId,
        treatmentDate: dayjs().toISOString(),
        progressNotes: progressWithDx || undefined,
        treatmentOrders: orders || undefined,
        nursingOrders: nursingOrders || undefined,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (r as any)?.id ?? (r as any)?.data?.id;
      setLastId(id ?? null);
      setDiagnosis(''); setProgress(''); setOrders(''); setNursingOrders('');
      onMessage('Đã lưu tờ điều trị');
    } catch { onMessage('Lưu thất bại — kiểm tra kết nối'); }
    finally { setSaving(false); }
  };

  const printLast = async () => {
    if (!lastId) { onMessage('Chưa có tờ điều trị vừa lưu'); return; }
    try {
      const blob = await printTreatmentSheet(lastId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = URL.createObjectURL((blob as any)?.data ?? blob);
      window.open(url, '_blank');
    } catch { onMessage('Không thể in — thử lại sau'); }
  };

  return (
    <div style={{ padding: '0 12px 24px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#555' }}>TỜ ĐIỀU TRỊ — {dayjs().format('DD/MM/YYYY')}</div>

      <label style={{ fontSize: 12, color: '#888' }}>Chẩn đoán</label>
      <textarea
        rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
        placeholder="Chẩn đoán bệnh chính / kèm theo..."
        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: 13 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label style={{ fontSize: 12, color: '#888' }}>Diễn biến lâm sàng</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setLibOpen(true)}
            style={{ fontSize: 11, color: '#1677ff', background: 'none', border: '1px solid #1677ff', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
          >Thư viện mẫu</button>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            style={{ fontSize: 11, color: '#1677ff', background: 'none', border: '1px solid #1677ff', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
          >Mẫu nhanh</button>
        </div>
      </div>
      {showTemplates && (
        <div style={{ marginBottom: 8, background: '#f5f5f5', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PROGRESS_TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => { setProgress(t); setShowTemplates(false); }}
              style={{ textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', lineHeight: 1.5 }}
            >{t}</button>
          ))}
        </div>
      )}
      <textarea
        rows={4} value={progress} onChange={(e) => setProgress(e.target.value)}
        placeholder="Tình trạng BN, dấu hiệu sinh tồn..."
        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: 13 }}
      />
      <ClinicalTemplatePicker
        open={libOpen}
        onClose={() => setLibOpen(false)}
        templateType={TEMPLATE_TYPES.DIEN_BIEN_BENH}
        onPick={(t) => setProgress(t.content)}
      />
      <label style={{ fontSize: 12, color: '#888' }}>Y lệnh</label>
      <textarea
        rows={3} value={orders} onChange={(e) => setOrders(e.target.value)}
        placeholder="Thuốc, xét nghiệm, chế độ..."
        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: 13 }}
      />
      <label style={{ fontSize: 12, color: '#888' }}>Y lệnh điều dưỡng</label>
      <textarea
        rows={2} value={nursingOrders} onChange={(e) => setNursingOrders(e.target.value)}
        placeholder="Theo dõi, chăm sóc..."
        style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: 13 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={save} disabled={saving}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: saving ? '#ccc' : '#1677ff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14 }}
        >{saving ? 'Đang lưu...' : 'Lưu tờ điều trị'}</button>
        {lastId && (
          <button
            onClick={printLast}
            style={{ padding: '10px 16px', borderRadius: 10, background: '#f0f0f0', border: 'none', fontWeight: 600, fontSize: 14 }}
          ><Ico name="sign" size={16} /></button>
        )}
      </div>
    </div>
  );
};

// ---- Dự trù thuốc (prescription) ----
const PrescriptionForm: React.FC<{ admissionId: string; onMessage: (m: string) => void }> = ({ admissionId, onMessage }) => {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<Array<{ medicineName: string; medicineId: string; quantity: number; dosage: string }>>([]);
  const [saving, setSaving] = useState(false);
  // Backend bắt buộc WarehouseId (Guid) + medicineId (Guid) → phải chọn kho thật + thuốc thật.
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [suggests, setSuggests] = useState<MedicineSearchItemDto[]>([]);

  useEffect(() => {
    getWarehouses()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setWarehouses(list);
        if (list.length > 0) setWarehouseId(list[0].id);
      })
      .catch(() => setWarehouses([]));
  }, []);

  // Autocomplete: tìm thuốc thật trong kho đã chọn (debounce nhẹ)
  useEffect(() => {
    if (!keyword.trim() || !warehouseId) { setSuggests([]); return; }
    const t = setTimeout(() => {
      searchMedicines(keyword.trim(), warehouseId)
        .then((r) => setSuggests((Array.isArray(r.data) ? r.data : []).slice(0, 8)))
        .catch(() => setSuggests([]));
    }, 300);
    return () => clearTimeout(t);
  }, [keyword, warehouseId]);

  const addMedicine = (m: MedicineSearchItemDto) => {
    setItems((prev) => prev.some((p) => p.medicineId === m.id)
      ? prev
      : [...prev, { medicineName: m.name, medicineId: m.id, quantity: 1, dosage: '' }]);
    setKeyword(''); setSuggests([]);
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const filled = items.filter((it) => it.medicineId);
    if (!filled.length) { onMessage('Thêm ít nhất 1 thuốc'); return; }
    if (!warehouseId) { onMessage('Chưa chọn kho'); return; }
    setSaving(true);
    try {
      await createPrescription({
        admissionId,
        prescriptionDate: dayjs().toISOString(),
        warehouseId,
        items: filled.map((it) => ({
          medicineId: it.medicineId,
          quantity: it.quantity,
          dosage: it.dosage || undefined,
          paymentSource: 1,
        })),
      });
      setItems([]);
      onMessage('Đã lưu dự trù thuốc');
    } catch { onMessage('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '0 12px 24px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#555' }}>DỰ TRÙ THUỐC</div>
      <select
        value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, marginBottom: 8, background: '#fff' }}
      >
        {warehouses.length === 0 && <option value="">— Không tải được danh sách kho —</option>}
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouseName}</option>)}
      </select>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm thuốc trong kho (gõ ≥2 ký tự)…"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }}
        />
        {suggests.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #ddd', borderRadius: 8, marginTop: 2, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
            {suggests.map((m) => (
              <div key={m.id} onClick={() => addMedicine(m)}
                style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                <b>{m.name}</b>{m.unit ? ` · ${m.unit}` : ''}{m.stock != null ? ` · tồn ${m.stock}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#f9f9f9', borderRadius: 8, padding: '6px 10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{it.medicineName}</div>
            <input
              value={it.dosage} onChange={(e) => setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, dosage: e.target.value } : p))}
              placeholder="Liều / cách dùng"
              style={{ width: '100%', fontSize: 12, border: 'none', background: 'transparent', outline: 'none', color: '#888' }}
            />
          </div>
          <input
            type="number" min={1} value={it.quantity}
            onChange={(e) => setItems((prev) => prev.map((p, idx) => idx === i ? { ...p, quantity: Number(e.target.value) } : p))}
            style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', textAlign: 'center', fontSize: 13 }}
          />
          <button onClick={() => removeItem(i)} style={{ padding: '4px 8px', borderRadius: 6, background: '#fff1f0', border: 'none', color: '#ff4d4f', fontWeight: 700 }}>✕</button>
        </div>
      ))}
      {items.length > 0 && (
        <button
          onClick={save} disabled={saving}
          style={{ width: '100%', padding: '10px 0', borderRadius: 10, marginTop: 8, background: saving ? '#ccc' : '#1677ff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14 }}
        >{saving ? 'Đang lưu...' : `Lưu dự trù (${items.length} thuốc)`}</button>
      )}
      {items.length === 0 && <div className="pp-empty" style={{ marginTop: 24 }}><Ico name="sign" size={36} /><div>Thêm thuốc vào dự trù</div></div>}
    </div>
  );
};

// ---- CLS (service orders) ----
const ServiceOrderForm: React.FC<{ admissionId: string; onMessage: (m: string) => void }> = ({ admissionId, onMessage }) => {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<Array<{ serviceName: string; serviceId: string }>>([]);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    if (!keyword.trim()) return;
    setItems((prev) => [...prev, { serviceName: keyword.trim(), serviceId: '' }]);
    setKeyword('');
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const filled = items.filter((it) => it.serviceName);
    if (!filled.length) { onMessage('Thêm ít nhất 1 dịch vụ CLS'); return; }
    setSaving(true);
    try {
      await createServiceOrder({
        admissionId,
        services: filled.map((it) => ({
          serviceId: it.serviceId || it.serviceName,
          quantity: 1,
          paymentSource: 1,
          isUrgent: false,
          isEmergency: false,
        })),
      });
      setItems([]);
      onMessage('Đã lưu chỉ định CLS');
    } catch { onMessage('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '0 12px 24px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#555' }}>CHỈ ĐỊNH CLS</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={keyword} onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Tên xét nghiệm / CĐHA (Enter để thêm)"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
        />
        <button onClick={addItem} style={{ padding: '8px 14px', borderRadius: 8, background: '#1677ff', color: '#fff', border: 'none', fontWeight: 700 }}>+</button>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#f9f9f9', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{it.serviceName}</div>
          <button onClick={() => removeItem(i)} style={{ padding: '4px 8px', borderRadius: 6, background: '#fff1f0', border: 'none', color: '#ff4d4f', fontWeight: 700 }}>✕</button>
        </div>
      ))}
      {items.length > 0 && (
        <button
          onClick={save} disabled={saving}
          style={{ width: '100%', padding: '10px 0', borderRadius: 10, marginTop: 8, background: saving ? '#ccc' : '#1677ff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14 }}
        >{saving ? 'Đang lưu...' : `Chỉ định CLS (${items.length} DV)`}</button>
      )}
      {items.length === 0 && <div className="pp-empty" style={{ marginTop: 24 }}><Ico name="stetho" size={36} /><div>Thêm dịch vụ CLS</div></div>}
    </div>
  );
};

export default DoctorPortalMobile;
