/* =====================================================================
   HIS Terminal · Cổng Bệnh nhân (Mobile-first) — port of
   design-system mod-patient-portal-mobile.jsx. Standalone full-screen
   mobile app (phone-frame preview on desktop). Real patientPortal API.
   ===================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import * as portal from '../api/patientPortal';
import './portal-mobile.css';

/* ---- loose display shapes (mapped from real DTOs) ---- */
interface ApptRow { id: string; date: string; time: string; dept: string; doctor: string; room: string; status: string; note?: string }
interface RxItem { name: string; dose: string; qty: number }
interface RxRow { id: string; date: string; doctor: string; days: number; refills?: number; status: string; items: RxItem[] }
interface LabItem { name: string; val: number | string; unit?: string; ref?: string; flag?: string }
interface LabRow { id: string; date: string; panel: string; status: string; abnormal: number; items: LabItem[] }
interface VitalRow { date: string; bp: string; hr: number; weight?: number }
interface UserInfo { name: string; pid: string; age: number | string; gender: string; phone: string; bhyt: string; bhytExp?: string; addr: string; bloodType: string; allergies: string[]; family: { name: string; rel: string; age: number }[] }

type Tab = 'home' | 'appts' | 'rx' | 'labs' | 'me';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const arr = (r: any): any[] => (Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.items) ? r.data.items : []);
const lastName = (n: string) => (n || '').trim().split(' ').slice(-1)[0] || '';
const fmtD = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '');

/* ─────────── Icons (subset of mock PpIco) ─────────── */
const Ico: React.FC<{ name: string; size?: number }> = ({ name, size = 22 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    pill: <><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)" /></>,
    flask: <><path d="M9 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V3" /><path d="M8 3h8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
    heart: <path d="M12 21s-7-4.5-9-9c-1.4-3.2.6-7 4-7 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.4 0 5.4 3.8 4 7-2 4.5-9 9-9 9z" />,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
    chevron: <path d="M9 6l6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    qr: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M21 14v7M14 21h7" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
    msg: <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" />,
    card: <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 11h20" /></>,
    shield: <path d="M12 3l8 3v6c0 5-3 8-8 9-5-1-8-4-8-9V6l8-3z" />,
    logout: <path d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
    back: <path d="M15 18l-6-6 6-6" />,
    phone: <path d="M22 16v3a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1c0 1 .5 3 1 4l-2 2a16 16 0 0 0 6 6l2-2c1 .5 3 1 4 1a1 1 0 0 1 1 1z" />,
    stethoscope: <><path d="M6 3v6a4 4 0 0 0 8 0V3M10 3h-4M14 3h-4M10 13v3a4 4 0 0 0 8 0v-1" /><circle cx="18" cy="13" r="2" /></>,
  };
  return <svg {...p}>{paths[name] || paths.home}</svg>;
};

const Sparkline: React.FC<{ values: number[]; color?: string }> = ({ values, color = '#3b82f6' }) => {
  if (!values.length) return null;
  const w = 240, h = 40, pad = 2;
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(1, max - min);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * (w - pad * 2) + pad},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(' ');
  return (
    <svg className="pp-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─────────── Phone frame (desktop preview / full-screen mobile) ─────────── */
const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  if (isMobile) return <div className="pp-app">{children}</div>;
  return (
    <div className="pp-frame-stage">
      <div className="pp-frame-bg"><div className="pp-frame-blob a" /><div className="pp-frame-blob b" /><div className="pp-frame-blob c" /></div>
      <div className="pp-frame-info">
        <div className="pp-frame-info-eyebrow">HIS Terminal</div>
        <h1>Cổng Bệnh nhân</h1>
        <div className="pp-frame-feats">
          <div>· Đặt khám &amp; tư vấn online</div>
          <div>· Tra đơn thuốc, kết quả XN</div>
          <div>· Thẻ BHYT &amp; hồ sơ gia đình</div>
          <div>· Theo dõi chỉ số sức khoẻ</div>
        </div>
      </div>
      <div className="pp-frame-phone">
        <div className="pp-frame-notch" />
        <div className="pp-app">{children}</div>
        <div className="pp-frame-home" />
      </div>
    </div>
  );
};

const StatusBar: React.FC = () => {
  const hm = dayjs().format('HH:mm');
  return (
    <div className="pp-status">
      <span>{hm}</span>
      <span className="pp-status-r"><span>•••</span><span>📶</span><span>🔋</span></span>
    </div>
  );
};

const TABS: { v: Tab; ic: string; l: string }[] = [
  { v: 'home', ic: 'home', l: 'Trang chủ' },
  { v: 'appts', ic: 'calendar', l: 'Lịch hẹn' },
  { v: 'rx', ic: 'pill', l: 'Đơn thuốc' },
  { v: 'labs', ic: 'flask', l: 'Kết quả' },
  { v: 'me', ic: 'user', l: 'Cá nhân' },
];

const PatientPortalMobile: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [rx, setRx] = useState<RxRow[]>([]);
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [rxOpen, setRxOpen] = useState<RxRow | null>(null);
  const [labOpen, setLabOpen] = useState<LabRow | null>(null);
  const [apptOpen, setApptOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hr, ap, pr, lb, vt] = await Promise.allSettled([
        portal.getHealthRecord(),
        portal.getMyAppointments(),
        portal.getPrescriptions(),
        portal.getLabResults(),
        portal.getVitalSignHistory(),
      ]);
      if (cancelled) return;
      // user
      if (hr.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d: any = hr.value.data || {};
        setUser({
          name: d.patientName || d.fullName || 'Bệnh nhân',
          pid: d.patientCode || d.patientId || '—',
          age: d.age ?? '—', gender: d.gender === 2 || d.gender === 'Nữ' ? 'Nữ' : 'Nam',
          phone: d.phoneNumber || '—',
          bhyt: d.insuranceNumber || '—', bhytExp: d.insuranceExpiry,
          addr: d.address || '—', bloodType: d.bloodType || '—',
          allergies: Array.isArray(d.allergies) ? d.allergies.map((a: { allergenName?: string } | string) => typeof a === 'string' ? a : (a.allergenName || '')) : [],
          family: Array.isArray(d.familyMembers) ? d.familyMembers.map((f: { fullName?: string; relationship?: string; age?: number }) => ({ name: f.fullName || '', rel: f.relationship || '', age: f.age || 0 })) : [],
        });
      }
      // appointments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAppts(arr(ap.status === 'fulfilled' ? ap.value : null).map((a: any) => ({
        id: a.appointmentCode || a.id || '',
        date: fmtD(a.appointmentDate || a.scheduledDate),
        time: a.appointmentTime || (a.scheduledDate ? dayjs(a.scheduledDate).format('HH:mm') : ''),
        dept: a.departmentName || a.specialtyName || '—',
        doctor: a.doctorName || 'Chưa phân',
        room: a.roomName || a.room || '',
        status: (a.status === 0 || a.statusName === 'Đã đặt' || a.statusName === 'Scheduled') ? 'scheduled' : a.statusName === 'Hoàn thành' || a.status === 2 ? 'done' : 'scheduled',
        note: a.reason || a.note,
      })));
      // prescriptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRx(arr(pr.status === 'fulfilled' ? pr.value : null).map((p: any) => ({
        id: p.prescriptionCode || p.id || '',
        date: fmtD(p.prescriptionDate || p.createdAt),
        doctor: p.doctorName || '—',
        days: p.daysSupply || p.days || 0,
        refills: p.refillsRemaining,
        status: (p.status === 'Active' || p.isActive) ? 'active' : 'done',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: Array.isArray(p.items) ? p.items.map((it: any) => ({ name: it.medicineName || it.name || '', dose: it.usage || it.dose || it.instruction || '', qty: it.quantity || it.qty || 0 })) : [],
      })));
      // labs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLabs(arr(lb.status === 'fulfilled' ? lb.value : null).map((l: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = Array.isArray(l.items) ? l.items.map((it: any) => ({ name: it.testName || it.name || '', val: it.value ?? it.val ?? '', unit: it.unit, ref: it.referenceRange || it.ref, flag: it.flag || (it.isAbnormal ? 'H' : '') })) : [];
        return {
          id: l.resultCode || l.id || '',
          date: fmtD(l.resultDate || l.createdAt),
          panel: l.panelName || l.serviceName || 'Xét nghiệm',
          status: 'ready',
          abnormal: items.filter((x: LabItem) => x.flag === 'H' || x.flag === 'L').length,
          items,
        };
      }));
      // vitals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVitals(arr(vt.status === 'fulfilled' ? vt.value : null).map((v: any) => ({
        date: fmtD(v.measuredAt || v.date),
        bp: v.bloodPressure || (v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'),
        hr: v.heartRate || v.pulse || 0,
        weight: v.weight,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  const go = (t: Tab) => setTab(t);
  const bpVals = useMemo(() => vitals.map((v) => parseInt(v.bp) || 0).filter(Boolean), [vitals]);
  const hrVals = useMemo(() => vitals.map((v) => v.hr).filter(Boolean), [vitals]);

  return (
    <PhoneFrame>
      <StatusBar />
      <div className="pp-scroll">
        {tab === 'home' && <Home user={user} appts={appts} rx={rx} labs={labs} bpVals={bpVals} hrVals={hrVals} go={go} setApptOpen={setApptOpen} setRxOpen={setRxOpen} setLabOpen={setLabOpen} latestBp={vitals[0]?.bp} latestHr={vitals[0]?.hr} />}
        {tab === 'appts' && <Appts appts={appts} setApptOpen={setApptOpen} />}
        {tab === 'rx' && <RxList rx={rx} setRxOpen={setRxOpen} />}
        {tab === 'labs' && <Labs labs={labs} setLabOpen={setLabOpen} />}
        {tab === 'me' && <Me user={user} onLogout={() => message.info('Đăng xuất cổng BN')} />}
      </div>
      <nav className="pp-tabbar">
        {TABS.map((t) => (
          <button key={t.v} className={`pp-tab ${tab === t.v ? 'on' : ''}`} onClick={() => setTab(t.v)}>
            <Ico name={t.ic} size={22} /><span>{t.l}</span>
          </button>
        ))}
      </nav>

      <ApptSheet open={apptOpen} onClose={() => setApptOpen(false)} user={user} onBooked={() => { setApptOpen(false); message.success('Đã gửi yêu cầu đặt khám'); }} />
      <RxDetail rx={rxOpen} onClose={() => setRxOpen(null)} />
      <LabDetail lab={labOpen} onClose={() => setLabOpen(null)} />
    </PhoneFrame>
  );
};

/* ─────────── Screens ─────────── */
const Home: React.FC<{
  user: UserInfo | null; appts: ApptRow[]; rx: RxRow[]; labs: LabRow[]; bpVals: number[]; hrVals: number[];
  latestBp?: string; latestHr?: number;
  go: (t: Tab) => void; setApptOpen: (b: boolean) => void; setRxOpen: (r: RxRow) => void; setLabOpen: (l: LabRow) => void;
}> = ({ user, appts, rx, labs, bpVals, hrVals, latestBp, latestHr, go, setApptOpen, setRxOpen, setLabOpen }) => {
  const next = appts.find((a) => a.status === 'scheduled');
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chúc bạn buổi trưa vui' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const activeRx = rx.filter((r) => r.status === 'active');
  return (
    <>
      <header className="pp-home-hdr">
        <div>
          <div className="pp-home-greet">{greet} ☀</div>
          <div className="pp-home-name">{lastName(user?.name || 'Bạn')}</div>
        </div>
        <div className="pp-home-icons">
          <button className="pp-circ"><Ico name="search" /></button>
          <button className="pp-circ"><Ico name="bell" /><span className="pp-dot" /></button>
        </div>
      </header>

      <section className="pp-bhyt-card">
        <div className="pp-bhyt-grid" />
        <div className="pp-bhyt-row"><span>BHYT {user?.bhytExp ? '· CÒN HẠN' : ''}</span><Ico name="shield" size={16} /></div>
        <div className="pp-bhyt-num">{user?.bhyt || '—'}</div>
        <div className="pp-bhyt-row"><span>{user?.name || ''}</span><span>{user?.bhytExp ? `HSD ${fmtD(user.bhytExp)}` : ''}</span></div>
        <button className="pp-bhyt-qr"><Ico name="qr" size={36} /></button>
      </section>

      <section className="pp-quick">
        {[
          { ic: 'calendar', l: 'Đặt khám', c: 'blue', on: () => setApptOpen(true) },
          { ic: 'video', l: 'Tư vấn online', c: 'purple', on: () => setApptOpen(true) },
          { ic: 'pill', l: 'Đơn thuốc', c: 'green', on: () => go('rx') },
          { ic: 'flask', l: 'Kết quả XN', c: 'amber', on: () => go('labs') },
        ].map((q, i) => (
          <button key={i} className={`pp-quick-btn ${q.c}`} onClick={q.on}>
            <span className="pp-quick-ic"><Ico name={q.ic} /></span><span>{q.l}</span>
          </button>
        ))}
      </section>

      {next && (
        <section className="pp-card pp-next-appt" onClick={() => go('appts')}>
          <div className="pp-next-hdr"><span className="pp-pill blue">LỊCH SẮP TỚI</span><span>{next.date}</span></div>
          <div className="pp-next-time">{next.time} · {next.dept}</div>
          <div className="pp-next-doc">{next.doctor}{next.room ? ` · Phòng ${next.room}` : ''}</div>
          <div className="pp-next-actions"><button>Hỏi đường</button><button>Đổi lịch</button><button className="primary">Check-in QR</button></div>
        </section>
      )}

      {(bpVals.length > 0 || hrVals.length > 0) && (
        <section className="pp-section">
          <div className="pp-sec-hdr"><h3>Sức khoẻ gần đây</h3></div>
          <div className="pp-vital-row">
            <div className="pp-vital">
              <div className="pp-vital-l">Huyết áp</div>
              <div className="pp-vital-v">{latestBp || '—'}<small>mmHg</small></div>
              <Sparkline values={bpVals} color="#ef4444" />
            </div>
            <div className="pp-vital">
              <div className="pp-vital-l">Nhịp tim</div>
              <div className="pp-vital-v">{latestHr || '—'}<small>bpm</small></div>
              <Sparkline values={hrVals} color="#f59e0b" />
            </div>
          </div>
        </section>
      )}

      {activeRx.length > 0 && (
        <section className="pp-section">
          <div className="pp-sec-hdr"><h3>Đơn thuốc đang dùng</h3><a onClick={() => go('rx')}>Xem tất cả</a></div>
          {activeRx.slice(0, 2).map((r) => (
            <div key={r.id} className="pp-card pp-rx-mini" onClick={() => setRxOpen(r)}>
              <div className="pp-rx-hdr"><span className="pp-pill green">ĐANG DÙNG{r.days ? ` · ${r.days}N` : ''}</span><span>{r.date}</span></div>
              {r.items.slice(0, 3).map((it, i) => (
                <div key={i} className="pp-rx-item"><Ico name="pill" size={18} /><div><div className="pp-rx-name">{it.name}</div><div className="pp-rx-dose">{it.dose}</div></div></div>
              ))}
            </div>
          ))}
        </section>
      )}

      {labs.length > 0 && (
        <section className="pp-section">
          <div className="pp-sec-hdr"><h3>Kết quả gần đây</h3><a onClick={() => go('labs')}>Xem tất cả</a></div>
          {labs.slice(0, 2).map((l) => (
            <div key={l.id} className="pp-card pp-lab-mini" onClick={() => setLabOpen(l)}>
              <div className="pp-lab-hdr">
                <Ico name="flask" size={18} />
                <div><div className="pp-lab-name">{l.panel}</div><div className="pp-lab-meta">{l.date} · {l.items.length} chỉ số</div></div>
                {l.abnormal > 0 ? <span className="pp-pill amber">{l.abnormal} BẤT THƯỜNG</span> : <span className="pp-pill green">BÌNH THƯỜNG</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {(user?.family?.length ?? 0) > 0 && (
        <section className="pp-section">
          <div className="pp-sec-hdr"><h3>Hồ sơ gia đình</h3><a>Quản lý</a></div>
          <div className="pp-fam">
            {user!.family.map((f) => (
              <div key={f.name} className="pp-fam-item">
                <div className="pp-avatar pp-avatar-sm">{lastName(f.name).charAt(0)}</div>
                <div className="pp-fam-name">{f.name.split(' ').slice(-2).join(' ')}</div>
                <div className="pp-fam-rel">{f.rel}{f.age ? ` · ${f.age}T` : ''}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!user && <div className="pp-empty" style={{ marginTop: 30 }}><Ico name="user" size={42} /><div>Đang tải hồ sơ…</div></div>}
      <div className="pp-pad-bot" />
    </>
  );
};

const Appts: React.FC<{ appts: ApptRow[]; setApptOpen: (b: boolean) => void }> = ({ appts, setApptOpen }) => {
  const [seg, setSeg] = useState<'up' | 'past'>('up');
  const ups = appts.filter((a) => a.status === 'scheduled');
  const past = appts.filter((a) => a.status !== 'scheduled');
  const list = seg === 'up' ? ups : past;
  return (
    <>
      <div className="pp-page-hdr"><h2>Lịch hẹn</h2><button className="pp-fab-mini" onClick={() => setApptOpen(true)}><Ico name="plus" size={20} /></button></div>
      <div className="pp-segmented">
        <button className={seg === 'up' ? 'on' : ''} onClick={() => setSeg('up')}>Sắp tới · {ups.length}</button>
        <button className={seg === 'past' ? 'on' : ''} onClick={() => setSeg('past')}>Đã khám · {past.length}</button>
      </div>
      <div className="pp-list">
        {list.map((a) => (
          <div key={a.id} className="pp-card pp-appt">
            <div className="pp-appt-date"><div className="d">{a.date.slice(0, 2)}</div><div className="m">/{a.date.slice(3, 5)}</div><div className="t">{a.time}</div></div>
            <div className="pp-appt-body">
              <div className="pp-appt-dept">{a.dept}</div>
              <div className="pp-appt-doc">{a.doctor}</div>
              {a.room && <div className="pp-appt-room">Phòng {a.room}</div>}
              {a.note && <div className="pp-appt-note">"{a.note}"</div>}
            </div>
            <div className={`pp-pill ${a.status === 'scheduled' ? 'blue' : 'gray'}`}>{a.status === 'scheduled' ? 'SẮP TỚI' : 'HOÀN TẤT'}</div>
          </div>
        ))}
        {list.length === 0 && <div className="pp-empty"><Ico name="calendar" size={42} /><div>Chưa có lịch hẹn</div></div>}
      </div>
    </>
  );
};

const RxList: React.FC<{ rx: RxRow[]; setRxOpen: (r: RxRow) => void }> = ({ rx, setRxOpen }) => (
  <>
    <div className="pp-page-hdr"><h2>Đơn thuốc</h2></div>
    <div className="pp-list">
      {rx.map((r) => (
        <div key={r.id} className="pp-card pp-rx-card" onClick={() => setRxOpen(r)}>
          <div className="pp-rx-hdr"><span className={`pp-pill ${r.status === 'active' ? 'green' : 'gray'}`}>{r.status === 'active' ? 'ĐANG DÙNG' : 'ĐÃ DÙNG'}</span><span>{r.date}</span></div>
          <div className="pp-rx-doc">{r.doctor}</div>
          {r.items.map((it, i) => (
            <div key={i} className="pp-rx-item"><Ico name="pill" size={18} /><div><div className="pp-rx-name">{it.name}</div><div className="pp-rx-dose">{it.dose}</div></div>{it.qty ? <div className="pp-rx-qty">×{it.qty}</div> : null}</div>
          ))}
        </div>
      ))}
      {rx.length === 0 && <div className="pp-empty"><Ico name="pill" size={42} /><div>Chưa có đơn thuốc</div></div>}
    </div>
  </>
);

const Labs: React.FC<{ labs: LabRow[]; setLabOpen: (l: LabRow) => void }> = ({ labs, setLabOpen }) => (
  <>
    <div className="pp-page-hdr"><h2>Kết quả xét nghiệm</h2></div>
    <div className="pp-list">
      {labs.map((l) => (
        <div key={l.id} className="pp-card pp-lab" onClick={() => setLabOpen(l)}>
          <div className="pp-lab-hdr">
            <div className="pp-lab-icon"><Ico name="flask" size={20} /></div>
            <div className="pp-lab-grow"><div className="pp-lab-name">{l.panel}</div><div className="pp-lab-meta">{l.id} · {l.date} · {l.items.length} chỉ số</div></div>
            <Ico name="chevron" size={18} />
          </div>
          <div className="pp-lab-bar">
            {l.items.slice(0, 5).map((it, i) => (
              <div key={i} className={`pp-lab-cell ${it.flag === 'H' || it.flag === 'L' ? 'abn' : ''}`}><div className="pp-lab-cell-l">{it.name}</div><div className="pp-lab-cell-v">{it.val}</div></div>
            ))}
          </div>
        </div>
      ))}
      {labs.length === 0 && <div className="pp-empty"><Ico name="flask" size={42} /><div>Chưa có kết quả xét nghiệm</div></div>}
    </div>
  </>
);

const Me: React.FC<{ user: UserInfo | null; onLogout: () => void }> = ({ user, onLogout }) => (
  <>
    <div className="pp-me-hdr">
      <div className="pp-avatar pp-avatar-lg">{lastName(user?.name || '?').charAt(0)}</div>
      <div className="pp-me-name">{user?.name || 'Bệnh nhân'}</div>
      <div className="pp-me-meta">{user?.pid} · {user?.age}T · {user?.gender}</div>
      {(user?.bloodType || user?.allergies?.length) && <div className="pp-me-meta">Nhóm máu {user?.bloodType || '—'}{user?.allergies?.length ? ` · Dị ứng: ${user.allergies.join(', ')}` : ''}</div>}
    </div>
    <div className="pp-me-list">
      {[
        { ic: 'card', l: 'Thẻ BHYT', v: user?.bhyt },
        { ic: 'phone', l: 'Số điện thoại', v: user?.phone },
        { ic: 'home', l: 'Địa chỉ', v: user?.addr },
      ].map((r, i) => (
        <div key={i} className="pp-me-row"><div className="pp-me-ic"><Ico name={r.ic} size={18} /></div><div className="pp-me-rt"><div className="pp-me-rl">{r.l}</div><div className="pp-me-rv">{r.v || '—'}</div></div><Ico name="chevron" size={16} /></div>
      ))}
    </div>
    <div className="pp-me-list">
      {[
        { ic: 'bell', l: 'Thông báo', v: 'Bật' },
        { ic: 'shield', l: 'Bảo mật & sinh trắc', v: 'Face ID' },
        { ic: 'msg', l: 'Trợ giúp & phản ánh' },
      ].map((r, i) => (
        <div key={i} className="pp-me-row"><div className="pp-me-ic"><Ico name={r.ic} size={18} /></div><div className="pp-me-rt"><div className="pp-me-rl">{r.l}</div>{r.v && <div className="pp-me-rv">{r.v}</div>}</div><Ico name="chevron" size={16} /></div>
      ))}
      <div className="pp-me-row danger" onClick={onLogout}><div className="pp-me-ic"><Ico name="logout" size={18} /></div><div className="pp-me-rt"><div className="pp-me-rl">Đăng xuất</div></div><Ico name="chevron" size={16} /></div>
    </div>
    <div className="pp-pad-bot" />
    <div className="pp-version">HIS Terminal · Cổng BN</div>
  </>
);

/* ─────────── Sheets ─────────── */
const PP_DEPTS = [
  { code: 'noi', name: 'Nội tổng quát', icon: 'stethoscope' },
  { code: 'tim', name: 'Tim mạch', icon: 'heart' },
  { code: 'mat', name: 'Mắt', icon: 'user' },
  { code: 'nhi', name: 'Nhi', icon: 'user' },
];

const ApptSheet: React.FC<{ open: boolean; onClose: () => void; user: UserInfo | null; onBooked: () => void }> = ({ open, onClose, user, onBooked }) => {
  const [step, setStep] = useState(0);
  const [dept, setDept] = useState<{ code: string; name: string } | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  useEffect(() => { if (open) { setStep(0); setDept(null); setDate(null); setSlot(null); } }, [open]);
  if (!open) return null;
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return { iso: d.format('YYYY-MM-DD'), dd: d.format('DD'), wd: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.day()] };
  });
  const slots = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30'];
  return (
    <div className="pp-sheet-bg" onClick={onClose}>
      <div className="pp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-sheet-hdr">
          {step > 0 && <button className="pp-icobtn" onClick={() => setStep((s) => s - 1)}><Ico name="back" /></button>}
          <h3>{['Chọn chuyên khoa', 'Chọn ngày', 'Chọn giờ', 'Xác nhận'][step]}</h3>
          <button className="pp-icobtn" onClick={onClose}>✕</button>
        </div>
        <div className="pp-sheet-step">
          {[0, 1, 2, 3].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`pp-stepdot ${step >= s ? 'on' : ''}`} />
              {i < 3 && <div className="pp-stepln" />}
            </React.Fragment>
          ))}
        </div>
        <div className="pp-sheet-body">
          {step === 0 && (
            <div className="pp-deptgrid">
              {PP_DEPTS.map((d) => (
                <button key={d.code} className={`pp-deptcard ${dept?.code === d.code ? 'on' : ''}`} onClick={() => { setDept(d); setStep(1); }}>
                  <Ico name={d.icon} size={28} /><span>{d.name}</span>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <>
              <div className="pp-sheet-info">{dept?.name}</div>
              <div className="pp-daygrid">
                {days.map((d) => (
                  <button key={d.iso} className={`pp-day ${date === d.iso ? 'on' : ''}`} onClick={() => { setDate(d.iso); setStep(2); }}>
                    <span className="pp-day-wd">{d.wd}</span><span className="pp-day-dd">{d.dd}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="pp-sheet-info">{dept?.name} · {date}</div>
              <div className="pp-slotgrid">
                {slots.map((s) => <button key={s} className={`pp-slot ${slot === s ? 'on' : ''}`} onClick={() => { setSlot(s); setStep(3); }}>{s}</button>)}
              </div>
            </>
          )}
          {step === 3 && (
            <div className="pp-confirm">
              <div className="pp-confirm-hdr">Xác nhận đặt khám</div>
              <div className="pp-confirm-row"><span>Bệnh nhân</span><b>{user?.name || '—'}</b></div>
              <div className="pp-confirm-row"><span>Chuyên khoa</span><b>{dept?.name}</b></div>
              <div className="pp-confirm-row"><span>Ngày khám</span><b>{date}</b></div>
              <div className="pp-confirm-row"><span>Giờ khám</span><b>{slot}</b></div>
              <div className="pp-confirm-row"><span>Phí dự kiến</span><b style={{ color: 'var(--pp-blue)' }}>0đ</b></div>
              <button className="pp-confirm-cta" onClick={onBooked}>Xác nhận đặt khám</button>
              <button className="pp-confirm-cancel" onClick={onClose}>Để sau</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RxDetail: React.FC<{ rx: RxRow | null; onClose: () => void }> = ({ rx, onClose }) => {
  if (!rx) return null;
  return (
    <div className="pp-sheet-bg" onClick={onClose}>
      <div className="pp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-sheet-hdr"><button className="pp-icobtn" onClick={onClose}><Ico name="back" /></button><h3>Đơn thuốc {rx.id}</h3><span style={{ width: 32 }} /></div>
        <div className="pp-sheet-body">
          <div className="pp-rx-detail-hdr">
            <div className="pp-rx-detail-doc">{rx.doctor}</div>
            <div className="pp-rx-detail-meta">{rx.date}{rx.days ? ` · ${rx.days} ngày` : ''}</div>
            <span className={`pp-pill ${rx.status === 'active' ? 'green' : 'gray'}`}>{rx.status === 'active' ? 'ĐANG DÙNG' : 'ĐÃ HOÀN TẤT'}</span>
          </div>
          {rx.items.map((it, i) => (
            <div key={i} className="pp-rx-item" style={{ padding: '12px 0' }}><Ico name="pill" size={18} /><div><div className="pp-rx-name">{it.name}</div><div className="pp-rx-dose">{it.dose}</div></div>{it.qty ? <div className="pp-rx-qty">×{it.qty}</div> : null}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LabDetail: React.FC<{ lab: LabRow | null; onClose: () => void }> = ({ lab, onClose }) => {
  if (!lab) return null;
  return (
    <div className="pp-sheet-bg" onClick={onClose}>
      <div className="pp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-sheet-hdr"><button className="pp-icobtn" onClick={onClose}><Ico name="back" /></button><h3>{lab.panel}</h3><span style={{ width: 32 }} /></div>
        <div className="pp-sheet-body">
          <div className="pp-rx-detail-meta" style={{ marginBottom: 10 }}>{lab.id} · {lab.date}</div>
          {lab.items.map((it, i) => (
            <div key={i} className="pp-me-row">
              <div className="pp-me-rt"><div className="pp-me-rl">{it.name}</div>{it.ref && <div className="pp-me-rv">Tham chiếu {it.ref}</div>}</div>
              <div style={{ fontWeight: 700, color: it.flag === 'H' || it.flag === 'L' ? 'var(--pp-red, #ef4444)' : 'inherit' }}>{it.val} {it.unit || ''} {it.flag ? `(${it.flag})` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientPortalMobile;
