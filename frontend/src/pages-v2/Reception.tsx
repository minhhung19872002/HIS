import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import * as receptionApi from '../api/reception';
import type { AdmissionDto, RoomOverviewDto, FeeRegistrationDto } from '../api/reception';
import TermIcon from '../layouts/terminal/Icon';

const statusLabel = (s: number) => {
  switch (s) {
    case 0: return { text: 'Chờ khám', cls: 'warn' as const };
    case 1: return { text: 'Đang khám', cls: 'cy' as const };
    case 2: return { text: 'Chờ kết luận', cls: 'info' as const };
    case 3: return { text: 'Hoàn tất', cls: 'ok' as const };
    default: return { text: 'Khác', cls: 'ghost' as const };
  }
};

const ReceptionV2: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rows, setRows] = useState<AdmissionDto[]>([]);
  const [rooms, setRooms] = useState<RoomOverviewDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; cls: 'ok' | 'crit' } | null>(null);

  // Load admissions (date filter). Also runs when user clicks "Làm mới".
  const loadAdmissions = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await receptionApi.getTodayAdmissions(undefined, dateStr);
      setRows(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmissions(date); }, [date]);
  useEffect(() => {
    receptionApi.getRoomOverview(undefined, dayjs().format('YYYY-MM-DD'))
      .then((r) => setRooms(r.data || []))
      .catch(() => setRooms([]));
  }, []);

  // Backend search (keyword hits /reception/patients/search which queries entire patient DB).
  const [searchResults, setSearchResults] = useState<AdmissionDto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const runSearch = async () => {
    const kw = keyword.trim();
    if (!kw) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await receptionApi.searchPatients(kw);
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } finally {
      setSearching(false);
    }
  };
  // Clear search when keyword emptied
  useEffect(() => { if (!keyword.trim()) setSearchResults(null); }, [keyword]);

  const displayedRows = searchResults !== null ? searchResults : rows;

  const stats = useMemo(() => ({
    total: rows.length,
    waiting: rows.filter((r) => r.status === 0).length,
    inProgress: rows.filter((r) => r.status === 1).length,
    completed: rows.filter((r) => r.status === 3).length,
    emergency: rows.filter((r) => r.isEmergency).length,
  }), [rows]);

  const selected = displayedRows.find((r) => r.id === selectedId);

  const showToast = (text: string, cls: 'ok' | 'crit') => {
    setToast({ text, cls });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRegister = async (dto: FeeRegistrationDto) => {
    try {
      await receptionApi.registerFeePatient(dto);
      setModalOpen(false);
      showToast('Đã đăng ký bệnh nhân', 'ok');
      loadAdmissions(date);
    } catch (e) {
      showToast('Đăng ký thất bại: ' + ((e as Error).message || 'lỗi không xác định'), 'crit');
    }
  };

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 1100, padding: '10px 14px',
          background: toast.cls === 'ok' ? 'var(--s-ok-bg)' : 'var(--s-crit-bg)',
          color: toast.cls === 'ok' ? '#15803d' : 'var(--s-crit)',
          border: '1px solid ' + (toast.cls === 'ok' ? '#bbf7d0' : '#fecaca'),
          borderRadius: 6, fontSize: 13, fontWeight: 500,
        }}>{toast.text}</div>
      )}

      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">
            {searchResults !== null ? 'Kết quả tìm kiếm toàn bộ DB' : 'Hàng chờ tiếp nhận'} · <b>{displayedRows.length}</b>
          </span>
          <span className="sub">{dayjs(date).format('DD/MM/YYYY')}</span>
          <div className="actions">
            <input type="date" className="input" style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} />
            <input
              type="text" className="input"
              placeholder="Tìm theo tên, mã BN, CCCD, SĐT, BHYT…"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            />
            <button className="btn" type="button" onClick={runSearch} disabled={searching}>
              <TermIcon name="search" size={13} />
              {searching ? 'Đang tìm…' : 'Tìm'}
            </button>
            {searchResults !== null && (
              <button className="btn ghost" type="button" onClick={() => { setKeyword(''); setSearchResults(null); }}>
                <TermIcon name="x" size={12} /> Xoá tìm
              </button>
            )}
            <button className="btn primary" type="button" onClick={() => setModalOpen(true)}>
              <TermIcon name="plus" size={13} />
              Tiếp nhận BN
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : displayedRows.length === 0 ? <div className="ph" style={{ margin: 14 }}>{searchResults !== null ? 'Không tìm thấy BN nào' : 'Chưa có bệnh nhân hôm nay'}</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>STT</th>
                  <th>Mã BN</th>
                  <th>Họ tên</th>
                  <th>Tuổi</th>
                  <th>Đối tượng</th>
                  <th>Phòng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const st = statusLabel(r.status);
                  return (
                    <tr key={r.id} className={r.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{r.queueNumber || '—'}</td>
                      <td className="mono">{r.patientCode}</td>
                      <td>
                        {r.patientName}{' '}
                        {r.isEmergency && <span className="chip crit" style={{ marginLeft: 6 }}>Cấp cứu</span>}
                      </td>
                      <td className="num">{r.age || '—'}</td>
                      <td>{r.patientTypeName}</td>
                      <td className="muted">{r.roomName || r.departmentName || '—'}</td>
                      <td><span className={`chip ${st.cls}`}>{st.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h">
            <span className="title">Tổng quan</span>
            <span className="sub">Thống kê nhanh</span>
          </div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng" value={stats.total} />
              <StatCell label="Chờ khám" value={stats.waiting} warn />
              <StatCell label="Đang khám" value={stats.inProgress} />
              <StatCell label="Hoàn tất" value={stats.completed} ok />
              <StatCell label="Cấp cứu" value={stats.emergency} crit />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn một dòng'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? (
              <div className="ph">Chọn bệnh nhân trong danh sách để xem chi tiết</div>
            ) : (
              <div className="stack-sm">
                <Field label="Mã hồ sơ" value={<span className="mono">{selected.medicalRecordCode}</span>} />
                <Field label="Mã BN" value={<span className="mono">{selected.patientCode}</span>} />
                <Field label="Họ tên" value={selected.patientName} />
                <Field label="Tuổi / giới" value={`${selected.age || '—'} · ${selected.genderName}`} />
                {selected.phoneNumber && <Field label="SĐT" value={selected.phoneNumber} />}
                {selected.identityNumber && <Field label="CCCD" value={<span className="mono">{selected.identityNumber}</span>} />}
                <Field label="Đối tượng" value={selected.patientTypeName} />
                {selected.insuranceNumber && (
                  <Field
                    label="BHYT"
                    value={
                      <span className="mono">
                        {selected.insuranceNumber}{' '}
                        {selected.isInsuranceValid
                          ? <span className="chip ok" style={{ marginLeft: 6 }}>Hợp lệ</span>
                          : <span className="chip warn" style={{ marginLeft: 6 }}>Hết hạn</span>}
                      </span>
                    }
                  />
                )}
                <Field label="Khoa / Phòng" value={`${selected.departmentName || '—'} · ${selected.roomName || '—'}`} />
                <Field label="Thời gian vào" value={<span className="mono">{dayjs(selected.admissionDate).format('HH:mm DD/MM')}</span>} />
                {selected.chiefComplaint && <Field label="Lý do khám" value={selected.chiefComplaint} />}
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button className="btn primary" type="button" onClick={() => navigate('/opd')}>
                    Gọi vào khám
                  </button>
                  <button className="btn" type="button" onClick={() => navigate('/reception')}>
                    Mở hồ sơ đầy đủ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <RegisterModal
          rooms={rooms}
          onClose={() => setModalOpen(false)}
          onSubmit={handleRegister}
        />
      )}
    </div>
  );
};

// ===== Register modal =====

const RegisterModal: React.FC<{
  rooms: RoomOverviewDto[];
  onClose: () => void;
  onSubmit: (dto: FeeRegistrationDto) => void | Promise<void>;
}> = ({ rooms, onClose, onSubmit }) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [patientCode, setPatientCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState(1);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (rooms.length && !roomId) setRoomId(rooms[0].roomId); }, [rooms, roomId]);

  const submit = async () => {
    setError(null);
    if (!roomId) { setError('Chọn phòng khám'); return; }
    if (mode === 'new') {
      if (!fullName.trim()) { setError('Nhập họ tên'); return; }
    } else {
      if (!patientCode.trim()) { setError('Nhập mã bệnh nhân'); return; }
    }
    const dto: FeeRegistrationDto = mode === 'new'
      ? {
        newPatient: {
          fullName: fullName.trim(), gender,
          dateOfBirth: dateOfBirth || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          address: address.trim() || undefined,
          identityNumber: identityNumber.trim() || undefined,
        },
        serviceType: 1, roomId,
      }
      : { patientCode: patientCode.trim(), serviceType: 1, roomId };
    try {
      setSubmitting(true);
      await onSubmit(dto);
    } catch {
      // handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" style={{ minWidth: 520, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <span className="title">Tiếp nhận bệnh nhân</span>
          <div className="actions" style={{ marginLeft: 'auto' }}>
            <button className="btn ghost icon" type="button" onClick={onClose}>
              <TermIcon name="x" size={14} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="seg" style={{ marginBottom: 14 }}>
            <button className={mode === 'new' ? 'active' : ''} type="button" onClick={() => setMode('new')}>BN mới</button>
            <button className={mode === 'existing' ? 'active' : ''} type="button" onClick={() => setMode('existing')}>BN cũ</button>
          </div>

          {mode === 'existing' ? (
            <div className="stack-sm">
              <div>
                <label className="label">Mã bệnh nhân</label>
                <input className="input" placeholder="BN202604..." value={patientCode} onChange={(e) => setPatientCode(e.target.value)} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Họ tên *</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="label">Giới tính</label>
                <select className="select" value={gender} onChange={(e) => setGender(Number(e.target.value))}>
                  <option value={1}>Nam</option>
                  <option value={2}>Nữ</option>
                  <option value={3}>Khác</option>
                </select>
              </div>
              <div>
                <label className="label">Ngày sinh</label>
                <input type="date" className="input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <label className="label">SĐT</label>
                <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div>
                <label className="label">CCCD/CMND</label>
                <input className="input" value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Địa chỉ</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <label className="label">Phòng khám *</label>
            <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.roomName} · {r.departmentName} ({r.waitingCount}/{r.totalPatientsToday})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 10, background: 'var(--s-crit-bg)', color: 'var(--s-crit)', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-f">
          <button className="btn" type="button" onClick={onClose} disabled={submitting}>Huỷ</button>
          <button className="btn primary" type="button" onClick={submit} disabled={submitting}>
            {submitting ? 'Đang xử lý…' : 'Đăng ký'}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; crit?: boolean; ok?: boolean }> = ({ label, value, warn, crit, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{
      fontSize: 26, fontWeight: 600, marginTop: 4,
      color: crit ? 'var(--s-crit)' : warn ? 'var(--s-warn)' : ok ? 'var(--s-ok)' : 'var(--t-0)',
    }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="label">{label}</div>
    <div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div>
  </div>
);

export default ReceptionV2;
