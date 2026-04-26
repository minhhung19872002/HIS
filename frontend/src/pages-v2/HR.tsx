import React, { useMemo, useState } from 'react';
import { App as AntdApp, Drawer, Modal, Select } from 'antd';
import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TermIcon from '../layouts/terminal/Icon';
import './HR.css';

type ShiftType = 'morning' | 'evening' | 'night' | 'off';

type ShiftMeta = {
  value: ShiftType;
  label: string;
  time: string;
  soft: string;
  border: string;
  text: string;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  department: string;
  quota: number;
};

type SwapRequest = {
  id: string;
  from: string;
  to: string;
  date: string;
  shift: ShiftType;
  reason: string;
  status: 'pending' | 'approved';
};

const SHIFT_TYPES: ShiftMeta[] = [
  { value: 'morning', label: 'Sáng', time: '07:00-15:00', soft: '#e6f6fb', border: '#b9e5f3', text: '#0f766e' },
  { value: 'evening', label: 'Chiều', time: '15:00-23:00', soft: '#fff4e8', border: '#fed7aa', text: '#c05621' },
  { value: 'night', label: 'Đêm', time: '23:00-07:00', soft: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  { value: 'off', label: 'Nghỉ', time: '—', soft: 'var(--d-1)', border: 'var(--line)', text: 'var(--t-3)' },
];

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const STAFF: StaffMember[] = [
  { id: 'BS001', name: 'BS. Nguyễn Văn Hùng', role: 'Trưởng khoa', department: 'Tim mạch', quota: 6 },
  { id: 'BS002', name: 'BS. Trần Thị Lan', role: 'Bác sĩ chính', department: 'Tim mạch', quota: 6 },
  { id: 'BS003', name: 'BS. Lê Quốc Anh', role: 'Bác sĩ', department: 'Nội', quota: 7 },
  { id: 'BS004', name: 'BS. Phạm Hữu Nam', role: 'Bác sĩ', department: 'Cấp cứu', quota: 8 },
  { id: 'BS005', name: 'BS. Đỗ Thanh Hà', role: 'Bác sĩ', department: 'Sản', quota: 6 },
  { id: 'DD001', name: 'ĐD. Vũ Thuỳ Linh', role: 'Trưởng ĐD', department: 'Tim mạch', quota: 7 },
  { id: 'DD002', name: 'ĐD. Bùi Mai Hương', role: 'Điều dưỡng', department: 'Nội', quota: 8 },
  { id: 'DD003', name: 'ĐD. Trần Văn Thái', role: 'Điều dưỡng', department: 'Cấp cứu', quota: 8 },
  { id: 'DD004', name: 'ĐD. Lý Thuý Vy', role: 'Điều dưỡng', department: 'Sản', quota: 7 },
  { id: 'DD005', name: 'ĐD. Hoàng Thị Bích', role: 'Điều dưỡng', department: 'Hồi sức', quota: 8 },
  { id: 'KTV01', name: 'KTV. Phan Đăng Khoa', role: 'KTV xét nghiệm', department: 'LIS', quota: 6 },
  { id: 'KTV02', name: 'KTV. Tô Anh Đức', role: 'KTV chẩn đoán hình ảnh', department: 'RIS', quota: 6 },
];

function seededValue(seed: number): number {
  const value = Math.sin(seed * 123.456) * 10000;
  return value - Math.floor(value);
}

function buildRotaSeed(): Record<string, ShiftType[]> {
  return STAFF.reduce<Record<string, ShiftType[]>>((accumulator, staff, staffIndex) => {
    accumulator[staff.id] = DAYS.map((_, dayIndex) => {
      if (staff.role === 'Trưởng khoa' || staff.role === 'Trưởng ĐD') {
        return dayIndex === 6 ? 'off' : 'morning';
      }

      const value = seededValue(staffIndex * 11 + dayIndex + 3);
      if (value < 0.46) return 'morning';
      if (value < 0.72) return 'evening';
      if (value < 0.87) return 'night';
      return 'off';
    });
    return accumulator;
  }, {});
}

const HRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [week, setWeek] = useState(43);
  const [rota, setRota] = useState<Record<string, ShiftType[]>>(() => buildRotaSeed());
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    from: '',
    to: '',
    date: '',
    shift: 'morning' as ShiftType,
    reason: '',
  });
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([
    { id: 'CH001', from: 'BS003', to: 'BS002', date: '2026-10-23', shift: 'night', reason: 'Việc gia đình', status: 'pending' },
    { id: 'CH002', from: 'DD002', to: 'DD005', date: '2026-10-25', shift: 'evening', reason: 'Khám sức khoẻ', status: 'pending' },
  ]);

  const departments = useMemo(
    () => [...new Set(STAFF.map((member) => member.department))],
    [],
  );

  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return STAFF.filter((member) => {
      if (departmentFilter && member.department !== departmentFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${member.name} ${member.id} ${member.role}`.toLowerCase().includes(query);
    });
  }, [departmentFilter, search]);

  const shiftCount = (staffId: string): number => (rota[staffId] ?? []).filter((shift) => shift !== 'off').length;

  const overtimeCount = (staffId: string): number => {
    const staff = STAFF.find((member) => member.id === staffId);
    if (!staff) {
      return 0;
    }
    return Math.max(0, shiftCount(staffId) - staff.quota);
  };

  const dayStats = useMemo(() => {
    return DAYS.map((_, dayIndex) => {
      const counts = { morning: 0, evening: 0, night: 0, off: 0 };
      visibleStaff.forEach((member) => {
        const shift = rota[member.id]?.[dayIndex] ?? 'off';
        counts[shift] += 1;
      });
      return counts;
    });
  }, [rota, visibleStaff]);

  const weekStart = dayjs('2026-10-20').add(week - 43, 'week');

  const metrics = useMemo(() => {
    const totalShifts = visibleStaff.reduce((sum, member) => sum + shiftCount(member.id), 0);
    const totalQuota = visibleStaff.reduce((sum, member) => sum + member.quota, 0);
    const totalOT = visibleStaff.reduce((sum, member) => sum + overtimeCount(member.id), 0);
    const pending = swapRequests.filter((request) => request.status === 'pending').length;
    const understaffed = dayStats.filter((stat) => stat.morning + stat.evening + stat.night < 6).length;

    return {
      totalShifts,
      totalQuota,
      totalOT,
      pending,
      understaffed,
    };
  }, [dayStats, swapRequests, visibleStaff]);

  const cycleShift = (staffId: string, dayIndex: number): void => {
    setRota((currentRota) => {
      const current = [...(currentRota[staffId] ?? [])];
      const currentIndex = SHIFT_TYPES.findIndex((item) => item.value === current[dayIndex]);
      current[dayIndex] = SHIFT_TYPES[(currentIndex + 1) % SHIFT_TYPES.length].value;
      return { ...currentRota, [staffId]: current };
    });
  };

  const approveSwap = (requestId: string): void => {
    setSwapRequests((currentRequests) =>
      currentRequests.map((request) => (request.id === requestId ? { ...request, status: 'approved' } : request)),
    );
    message.success('Đã duyệt yêu cầu đổi ca');
  };

  const rejectSwap = (requestId: string): void => {
    setSwapRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestId));
    message.warning('Đã từ chối yêu cầu đổi ca');
  };

  const submitSwapRequest = (): void => {
    if (!swapForm.from || !swapForm.to || !swapForm.date || !swapForm.reason) {
      message.warning('Cần điền đủ thông tin đổi ca');
      return;
    }

    const request: SwapRequest = {
      id: `CH${String(Date.now()).slice(-4)}`,
      ...swapForm,
      status: 'pending',
    };

    setSwapRequests((currentRequests) => [...currentRequests, request]);
    setSwapModalOpen(false);
    setSwapForm({ from: '', to: '', date: '', shift: 'morning', reason: '' });
    message.success('Đã gửi yêu cầu đổi ca');
  };

  return (
    <div className="hr-v2-page">
      <div className="hr-v2-strip">
        <RotaStatCard label="Nhân sự" value={visibleStaff.length} meta={`${new Set(visibleStaff.map((member) => member.department)).size} khoa`} />
        <RotaStatCard label="Ca đã xếp" value={metrics.totalShifts} meta={`/${metrics.totalQuota} quota`} tone="info" />
        <RotaStatCard label="Ngày OT" value={metrics.totalOT} meta="vượt quota" tone={metrics.totalOT > 5 ? 'warn' : 'ok'} />
        <RotaStatCard label="Yêu cầu đổi" value={metrics.pending} meta="chờ duyệt" tone="warn" />
        <RotaStatCard label="Ca thiếu" value={metrics.understaffed} meta="<6 NS/ngày" tone={metrics.understaffed > 0 ? 'critical' : 'ok'} />
        <RotaStatCard label="Tuần" value={`T${week}/2026`} meta={`${weekStart.format('DD/MM')} - ${weekStart.add(6, 'day').format('DD/MM')}`} />
      </div>

      <div className="hr-v2-shell">
        <div className="hr-v2-toolbar">
          <div className="hr-v2-toolbar-left">
            <div className="hr-v2-search">
              <TermIcon name="search" size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm nhân sự..."
              />
            </div>
            <Select
              allowClear
              className="hr-v2-select"
              placeholder="Lọc theo khoa"
              value={departmentFilter || undefined}
              onChange={(value) => setDepartmentFilter(value ?? '')}
              options={departments.map((department) => ({ value: department, label: department }))}
            />
            <button type="button" className="hr-v2-btn" onClick={() => setWeek((current) => current - 1)}>
              <LeftOutlined />
              Tuần trước
            </button>
            <button type="button" className="hr-v2-btn" onClick={() => setWeek((current) => current + 1)}>
              Tuần sau
              <RightOutlined />
            </button>
          </div>

          <div className="hr-v2-toolbar-right">
            <button type="button" className="hr-v2-btn" onClick={() => setSwapModalOpen(true)}>
              <SwapOutlined />
              Yêu cầu đổi ca
            </button>
            <button type="button" className="hr-v2-btn" onClick={() => message.success('Đã sao chép lịch từ tuần trước')}>
              <CopyOutlined />
              Copy tuần trước
            </button>
            <button type="button" className="hr-v2-btn" onClick={() => message.success('Đã xuất Excel lịch trực')}>
              <DownloadOutlined />
              Xuất Excel
            </button>
            <button type="button" className="hr-v2-btn primary" onClick={() => message.success('Đã chốt lịch trực tuần')}>
              <CheckOutlined />
              Chốt tuần
            </button>
          </div>
        </div>

        {swapRequests.some((request) => request.status === 'pending') && (
          <div className="hr-v2-alerts">
            <div className="hr-v2-alert-title">Yêu cầu đổi ca chờ duyệt</div>
            <div className="hr-v2-alert-list">
              {swapRequests.filter((request) => request.status === 'pending').map((request) => {
                const fromStaff = STAFF.find((member) => member.id === request.from);
                const toStaff = STAFF.find((member) => member.id === request.to);
                const shift = SHIFT_TYPES.find((item) => item.value === request.shift)!;
                return (
                  <div key={request.id} className="hr-v2-alert-row">
                    <span className="mono">{request.id}</span>
                    <strong>{fromStaff?.name}</strong>
                    <span>→</span>
                    <strong>{toStaff?.name}</strong>
                    <span className="muted">· Ca {shift.label} · {dayjs(request.date).format('DD/MM/YYYY')} · "{request.reason}"</span>
                    <div className="hr-v2-alert-actions">
                      <button type="button" className="hr-v2-btn" onClick={() => rejectSwap(request.id)}>Từ chối</button>
                      <button type="button" className="hr-v2-btn primary" onClick={() => approveSwap(request.id)}>Duyệt</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="hr-v2-table-wrap">
          <table className="hr-v2-table">
            <thead>
              <tr>
                <th className="sticky-col">Nhân sự</th>
                {DAYS.map((day, index) => (
                  <th key={day}>
                    {day}
                    <div>{weekStart.add(index, 'day').format('DD/MM')}</div>
                  </th>
                ))}
                <th>Ca</th>
                <th>OT</th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.map((member) => {
                const total = shiftCount(member.id);
                const overtime = overtimeCount(member.id);
                return (
                  <tr key={member.id}>
                    <td className="sticky-col clickable" onClick={() => setSelectedStaff(member)}>
                      <div className="hr-v2-person">
                        <strong>{member.name}</strong>
                        <span>{member.id} · {member.role} · {member.department}</span>
                      </div>
                    </td>
                    {(rota[member.id] ?? []).map((shiftValue, dayIndex) => {
                      const shift = SHIFT_TYPES.find((item) => item.value === shiftValue)!;
                      return (
                        <td key={`${member.id}-${dayIndex}`}>
                          <button
                            type="button"
                            className="hr-v2-shift"
                            style={{ background: shift.soft, borderColor: shift.border, color: shift.text }}
                            onClick={() => cycleShift(member.id, dayIndex)}
                          >
                            <strong>{shift.label}</strong>
                            <span>{shift.time}</span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="mono strong">{total}/{member.quota}</td>
                    <td className={`mono strong ${overtime > 0 ? 'warn' : 'muted'}`}>{overtime > 0 ? `+${overtime}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky-col">Σ NS theo ca</td>
                {dayStats.map((stats, index) => (
                  <td key={index}>
                    <MonthStat
                      morning={stats.morning}
                      evening={stats.evening}
                      night={stats.night}
                      total={stats.morning + stats.evening + stats.night}
                    />
                  </td>
                ))}
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="hr-v2-legend">
          <span className="label">Chú thích</span>
          {SHIFT_TYPES.map((shift) => (
            <span key={shift.value} className="legend-item">
              <span className="legend-dot" style={{ background: shift.soft, borderColor: shift.border }} />
              <b>{shift.label}</b>
              {shift.time !== '—' && <small>{shift.time}</small>}
            </span>
          ))}
          <span className="hint">Click ô để đổi ca · Click tên để xem chi tiết</span>
        </div>
      </div>

      <Drawer
        open={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        placement="right"
        size="large"
        title={selectedStaff?.name}
      >
        {selectedStaff && (
          <div className="hr-v2-drawer">
            <div className="hr-v2-drawer-head">
              <div>
                <strong>{selectedStaff.id}</strong>
                <span>{selectedStaff.role} · {selectedStaff.department}</span>
              </div>
            </div>
            <div className="hr-v2-mini-grid">
              <MiniStat label="Ca tuần này" value={shiftCount(selectedStaff.id)} />
              <MiniStat label="Quota" value={selectedStaff.quota} />
              <MiniStat label="OT" value={overtimeCount(selectedStaff.id)} tone={overtimeCount(selectedStaff.id) > 0 ? 'warn' : 'ok'} />
            </div>
            <div className="hr-v2-section">
              <div className="hr-v2-section-title">Lịch trong tuần</div>
              <div className="hr-v2-drawer-grid">
                {(rota[selectedStaff.id] ?? []).map((shiftValue, index) => {
                  const shift = SHIFT_TYPES.find((item) => item.value === shiftValue)!;
                  return (
                    <div key={index} className="hr-v2-drawer-shift" style={{ background: shift.soft, borderColor: shift.border }}>
                      <span>{DAYS[index]} · {weekStart.add(index, 'day').format('DD/MM')}</span>
                      <strong style={{ color: shift.text }}>{shift.label}</strong>
                      <small>{shift.time}</small>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hr-v2-drawer-actions">
              <button type="button" className="hr-v2-btn" onClick={() => message.success('Đã mở hồ sơ nhân sự')}>
                <UserOutlined />
                Hồ sơ NS
              </button>
              <button type="button" className="hr-v2-btn primary" onClick={() => message.success('Đã mở chế độ sửa lịch')}>
                <EditOutlined />
                Sửa lịch
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={swapModalOpen}
        title="Yêu cầu đổi ca"
        onCancel={() => setSwapModalOpen(false)}
        onOk={submitSwapRequest}
        okText="Gửi yêu cầu"
        cancelText="Huỷ"
      >
        <div className="hr-v2-form">
          <label>
            <span>Người trực</span>
            <Select
              value={swapForm.from || undefined}
              placeholder="Chọn nhân sự"
              onChange={(value) => setSwapForm((current) => ({ ...current, from: value }))}
              options={STAFF.map((member) => ({ value: member.id, label: member.name }))}
            />
          </label>
          <label>
            <span>Người thay</span>
            <Select
              value={swapForm.to || undefined}
              placeholder="Chọn người thay"
              onChange={(value) => setSwapForm((current) => ({ ...current, to: value }))}
              options={STAFF.map((member) => ({ value: member.id, label: member.name }))}
            />
          </label>
          <label>
            <span>Ngày</span>
            <input
              type="date"
              value={swapForm.date}
              onChange={(event) => setSwapForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label>
            <span>Ca trực</span>
            <Select
              value={swapForm.shift}
              onChange={(value) => setSwapForm((current) => ({ ...current, shift: value }))}
              options={SHIFT_TYPES.filter((shift) => shift.value !== 'off').map((shift) => ({
                value: shift.value,
                label: `${shift.label} (${shift.time})`,
              }))}
            />
          </label>
          <label className="full">
            <span>Lý do</span>
            <textarea
              rows={4}
              value={swapForm.reason}
              onChange={(event) => setSwapForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Mô tả lý do cần đổi ca..."
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

type RotaStatCardProps = {
  label: string;
  value: string | number;
  meta: string;
  tone?: 'critical' | 'warn' | 'info' | 'ok';
};

const RotaStatCard: React.FC<RotaStatCardProps> = ({ label, value, meta, tone }) => (
  <div className={`hr-v2-strip-cell ${tone ?? ''}`.trim()}>
    <span className="label">{label}</span>
    <strong>{value}</strong>
    <span className="meta">{meta}</span>
  </div>
);

type MiniStatProps = {
  label: string;
  value: string | number;
  tone?: 'warn' | 'ok';
};

const MiniStat: React.FC<MiniStatProps> = ({ label, value, tone }) => (
  <div className={`hr-v2-mini-stat ${tone ?? ''}`.trim()}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

type MonthStatProps = {
  morning: number;
  evening: number;
  night: number;
  total: number;
};

const MonthStat: React.FC<MonthStatProps> = ({ morning, evening, night, total }) => (
  <div className="hr-v2-day-stats">
    <div>
      <span className="morning">{morning}</span>
      <span>·</span>
      <span className="evening">{evening}</span>
      <span>·</span>
      <span className="night">{night}</span>
    </div>
    <strong className={total < 6 ? 'warn' : ''}>Σ {total}</strong>
  </div>
);

export default HRV2;
