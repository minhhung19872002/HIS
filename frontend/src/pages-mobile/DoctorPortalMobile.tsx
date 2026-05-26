/* =====================================================================
   HIS Terminal · Cổng Bác sĩ (Mobile-first) — port of design-system
   mod-doctor-portal-mobile.jsx. Standalone full-screen mobile app
   (phone-frame preview on desktop). Real examination API.
   ===================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import './portal-mobile.css';

type Tab = 'today' | 'queue' | 'patients' | 'msg' | 'me';

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
  { v: 'msg', ic: 'msg', l: 'Tin nhắn' },
  { v: 'me', ic: 'user', l: 'Tôi' },
];

const DoctorPortalMobile: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [exams, setExams] = useState<ExaminationDto[]>([]);

  const doctorName = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').fullName || 'Bác sĩ'; } catch { return 'Bác sĩ'; }
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
        {tab === 'patients' && <Patients patients={patients} />}
        {tab === 'msg' && <div className="pp-empty" style={{ marginTop: 60 }}><Ico name="msg" size={42} /><div>Chưa có tin nhắn</div></div>}
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

const Patients: React.FC<{ patients: PRow[] }> = ({ patients }) => {
  const [q, setQ] = useState('');
  const list = patients.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.pid.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="pp-page-hdr"><h2>Bệnh nhân</h2></div>
      <div className="dp-search"><Ico name="search" size={18} /><input placeholder="Tìm tên / mã BN" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="pp-list">
        {list.map((p) => (
          <div key={p.pid} className="pp-card dp-p-card">
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

export default DoctorPortalMobile;
