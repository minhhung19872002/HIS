import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as surgeryApi from '../api/surgery';
import type { OperatingRoomDto, SurgeryScheduleDto, SurgeryScheduleItemDto } from '../api/surgery';
import './Surgery.css';

type SlotStat = 'done' | 'running' | 'sched' | 'prep' | 'cleanup' | 'break' | 'cancel';

const START = 6;
const END   = 19;
const SPAN  = END - START;

const pct = (h: number) => ((h - START) / SPAN) * 100;
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// Map backend status (0=Scheduled, 1=InProgress, 2=Completed, 3=Cancelled) to slot CSS class
const statusToSlotStat = (status: number): SlotStat => {
  switch (status) {
    case 1: return 'running';
    case 2: return 'done';
    case 3: return 'cancel';
    default: return 'sched';
  }
};

// Map operating room status to UI state (1=Available, 2=InUse, 3=Cleaning, 4=Maintenance/Off)
const roomStateClass = (status: number, hasRunning: boolean): 'live' | 'ready' | 'clean' | 'off' => {
  if (status === 4 || status === 0) return 'off';
  if (hasRunning) return 'live';
  if (status === 3) return 'clean';
  return 'ready';
};

const SurgeryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [, setSelSlot] = useState<string | null>(null);
  const [rooms, setRooms]       = useState<OperatingRoomDto[]>([]);
  const [schedule, setSchedule] = useState<SurgeryScheduleDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [date, setDate]         = useState(() => dayjs());

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      surgeryApi.getOperatingRooms(),
      surgeryApi.getSurgerySchedule(date.format('YYYY-MM-DD')),
    ]).then(([r, s]) => {
      if (r.status === 'fulfilled') setRooms(Array.isArray(r.value.data) ? r.value.data : []);
      if (s.status === 'fulfilled') setSchedule(Array.isArray(s.value.data) ? s.value.data : []);
      setLoading(false);
    });
  }, [date]);

  // Index schedule by operating room id
  const scheduleByRoom = useMemo(() => {
    const m = new Map<string, SurgeryScheduleItemDto[]>();
    schedule.forEach((s) => m.set(s.operatingRoomId, s.surgeries || []));
    return m;
  }, [schedule]);

  // Merged room rows with their slots, util, state
  const roomsWithSlots = useMemo(() => {
    return rooms.map((r) => {
      const items = scheduleByRoom.get(r.id) || [];
      const totalMin = items
        .filter((it) => it.status !== 3) // exclude cancelled
        .reduce((a, it) => a + (it.estimatedDuration || 0), 0);
      const util = Math.min(100, Math.round((totalMin / (SPAN * 60)) * 100));
      const hasRunning = items.some((it) => it.status === 1);
      return {
        ...r,
        slots: items,
        util,
        state: roomStateClass(r.status, hasRunning),
      };
    });
  }, [rooms, scheduleByRoom]);

  // KPIs derived from schedule
  const kpis = useMemo(() => {
    const all = schedule.flatMap((s) => s.surgeries || []);
    const running = all.filter((x) => x.status === 1).length;
    const done    = all.filter((x) => x.status === 2).length;
    const planned = all.filter((x) => x.status === 0).length;
    const cancelled = all.filter((x) => x.status === 3).length;
    const totalMin = all
      .filter((x) => x.status !== 3)
      .reduce((a, x) => a + (x.estimatedDuration || 0), 0);
    const utilAvg = rooms.length > 0
      ? Math.round((totalMin / (rooms.length * SPAN * 60)) * 100)
      : 0;
    return { running, done, planned, cancelled, utilAvg };
  }, [schedule, rooms]);

  // Surgeons working today: unique surgeon names from schedule
  const surgeons = useMemo(() => {
    const map = new Map<string, { rooms: Set<string>; current?: string; next?: string }>();
    schedule.forEach((s) => {
      (s.surgeries || []).forEach((it) => {
        if (!it.surgeonName) return;
        const ent = map.get(it.surgeonName) || { rooms: new Set(), current: undefined, next: undefined };
        ent.rooms.add(s.operatingRoomName);
        if (it.status === 1 && !ent.current) ent.current = `${s.operatingRoomName} · ${it.surgeryServiceName}`;
        else if (it.status === 0 && !ent.next) ent.next = `${dayjs(it.scheduledTime).format('HH:mm')} ${it.surgeryServiceName}`;
        map.set(it.surgeonName, ent);
      });
    });
    return Array.from(map, ([nm, info]) => ({
      nm,
      stat: info.current ? 'or' as const : 'free' as const,
      room: Array.from(info.rooms)[0] || '—',
      next: info.current || info.next || 'Rảnh',
    }));
  }, [schedule]);

  // Anesthesiologists from schedule (may be sparse)
  const anesthetists = useMemo(() => {
    const map = new Map<string, { rooms: Set<string>; running: boolean }>();
    schedule.forEach((s) => {
      (s.surgeries || []).forEach((it) => {
        if (!it.anesthesiologistName) return;
        const ent = map.get(it.anesthesiologistName) || { rooms: new Set(), running: false };
        ent.rooms.add(s.operatingRoomName);
        if (it.status === 1) ent.running = true;
        map.set(it.anesthesiologistName, ent);
      });
    });
    return Array.from(map, ([nm, info]) => ({
      nm,
      stat: info.running ? 'or' as const : 'free' as const,
      room: Array.from(info.rooms)[0] || '—',
    }));
  }, [schedule]);

  const nowHour = dayjs().hour() + dayjs().minute() / 60;

  return (
    <div className="or-wrap">
      {/* ====== TOP KPIs ====== */}
      <div className="or-top">
        <div className="or-kpi live">
          <div className="l">Đang mổ</div>
          <div className="v"><span className="dot" />{kpis.running}</div>
        </div>
        <div className="or-kpi">
          <div className="l">Trong kế hoạch</div>
          <div className="v">{kpis.planned}</div>
        </div>
        <div className="or-kpi ok">
          <div className="l">Đã xong</div>
          <div className="v">{kpis.done}</div>
        </div>
        <div className="or-kpi warn">
          <div className="l">Đã hủy</div>
          <div className="v">{kpis.cancelled}</div>
        </div>
        <div className="or-kpi">
          <div className="l">Công suất TB</div>
          <div className="v">{kpis.utilAvg}%</div>
        </div>
        <div className="or-kpi">
          <div className="l">Phòng mổ</div>
          <div className="v">{rooms.filter((r) => r.isActive).length} / {rooms.length}</div>
        </div>
      </div>

      <div className="or-body">
        {/* ====== DAY BAR ====== */}
        <div className="or-day-bar">
          <button onClick={() => setDate(date.subtract(1, 'day'))}>←</button>
          <div className="date">
            {date.format('dddd, DD/MM/YYYY')}
            {date.isSame(dayjs(), 'day') && <small>hôm nay</small>}
          </div>
          <button onClick={() => setDate(date.add(1, 'day'))}>→</button>
          <button onClick={() => setDate(dayjs())}>Hôm nay</button>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', gap: 14,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--t-2)', letterSpacing: '0.04em',
          }}>
            <LegendSw color="#f0fdf4" border="var(--s-ok)"   label="Đã xong" />
            <LegendSw color="var(--s-crit-bg)" border="var(--s-crit)" label="Đang mổ" />
            <LegendSw color="var(--a-cy-bg)"   border="var(--a-cy)"   label="Lịch" />
            <LegendSw color="var(--s-warn-bg)" border="var(--s-warn)" label="Đã hủy" />
          </div>
          <button className="p" onClick={() => message.success('✓ Đã mở form đặt lịch mổ')}>+ Đặt mổ mới</button>
        </div>

        {/* ====== GANTT ====== */}
        <div className="or-gantt">
          <div className="or-rooms-col">
            <div className="or-col-h">Phòng mổ</div>
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Đang tải...
              </div>
            ) : roomsWithSlots.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Chưa có phòng mổ
              </div>
            ) : roomsWithSlots.map((r) => (
              <div key={r.id} className="or-room-row">
                <div className="or-room-name">
                  <span className={'state ' + r.state} />
                  {r.code}
                </div>
                <div className="or-room-spec">{r.specialtyName || r.roomTypeName || r.name}</div>
                <div className="or-room-util">
                  {r.state === 'off' ? 'Đóng · bảo trì' : `Sử dụng: ${r.util}%`}
                </div>
              </div>
            ))}
          </div>
          <div className="or-tl-wrap">
            <div className="or-tl-col-h">
              {Array.from({ length: SPAN + 1 }, (_, i) => (
                <div
                  key={i}
                  className={'or-tl-tick ' + (Math.floor(nowHour) === START + i ? 'now' : '')}
                >
                  {String(START + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {roomsWithSlots.map((r) => (
              <div key={r.id} className="or-tl-row">
                {r.slots.map((s, i) => {
                  if (!s.scheduledTime) return null;
                  const start = dayjs(s.scheduledTime);
                  const startH = start.hour() + start.minute() / 60;
                  const durH = (s.estimatedDuration || 60) / 60;
                  if (startH + durH < START || startH > END) return null;
                  const stat = statusToSlotStat(s.status);
                  return (
                    <div
                      key={i}
                      className={'or-slot ' + stat}
                      style={{ left: `${pct(startH)}%`, width: `${(durH / SPAN) * 100}%` }}
                      onClick={() => {
                        setSelSlot(`${r.id}-${i}`);
                        message.info(`${s.surgeryServiceName} · ${s.patientName} · ${s.surgeonName || '—'}`);
                      }}
                    >
                      <div className="t">{hhmm(startH)}–{hhmm(startH + durH)} · {durH.toFixed(1)}h</div>
                      <div className="op">{s.surgeryServiceName}</div>
                      {s.patientName && <div className="pt">{s.patientName} · {s.surgeonName || '—'}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {date.isSame(dayjs(), 'day') && (
              <div className="or-now-line" style={{ left: `${pct(nowHour)}%` }} />
            )}
          </div>
        </div>

        {/* ====== SURGEONS + GAS ====== */}
        <div className="or-surgeons">
          <div className="or-surgeon-col">
            <div className="or-surgeon-h">
              <span>Phẫu thuật viên</span>
              <span className="n">{surgeons.length} · ca ngày</span>
            </div>
            {surgeons.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Chưa có PTV trong lịch hôm nay
              </div>
            ) : surgeons.map((s) => (
              <div key={s.nm} className="or-surgeon-row">
                <div className="or-surgeon-avatar">{s.nm.split(' ').slice(-1)[0]?.[0] || '?'}</div>
                <div>
                  <div className="or-surgeon-nm">{s.nm}</div>
                  <div className="or-surgeon-sub">{s.next}</div>
                </div>
                <span className={'or-surgeon-stat ' + s.stat}>
                  {s.stat === 'or' ? '● ' + s.room : 'RẢNH'}
                </span>
              </div>
            ))}
          </div>
          <div className="or-surgeon-col">
            <div className="or-surgeon-h">
              <span>Bác sĩ gây mê</span>
              <span className="n">{anesthetists.length} · ca ngày</span>
            </div>
            {anesthetists.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Chưa có dữ liệu BS gây mê
              </div>
            ) : anesthetists.map((s) => (
              <div key={s.nm} className="or-surgeon-row">
                <div
                  className="or-surgeon-avatar"
                  style={{ background: 'var(--s-mag-bg)', color: 'var(--s-mag)' }}
                >{s.nm.split(' ').slice(-1)[0]?.[0] || '?'}</div>
                <div>
                  <div className="or-surgeon-nm">{s.nm}</div>
                  <div className="or-surgeon-sub">{s.room}</div>
                </div>
                <span className={'or-surgeon-stat ' + s.stat}>
                  {s.stat === 'or' ? '● ' + s.room : 'RẢNH'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendSw: React.FC<{ color: string; border: string; label: string }> = ({ color, border, label }) => (
  <span>
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      background: color, border: `1px solid ${border}`,
      borderLeft: `3px solid ${border}`, borderRadius: 2,
      marginRight: 4, verticalAlign: 'middle',
    }} />
    {label}
  </span>
);

export default SurgeryV2;
