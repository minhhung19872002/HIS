import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as receptionApi from '../api/reception';
import type { AdmissionDto } from '../api/reception';
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
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rows, setRows] = useState<AdmissionDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await receptionApi.getTodayAdmissions(undefined, date);
        if (Array.isArray(res.data)) setRows(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (r) =>
        r.patientName?.toLowerCase().includes(kw) ||
        r.patientCode?.toLowerCase().includes(kw) ||
        (r.phoneNumber || '').includes(kw) ||
        (r.identityNumber || '').includes(kw),
    );
  }, [rows, keyword]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      waiting: rows.filter((r) => r.status === 0).length,
      inProgress: rows.filter((r) => r.status === 1).length,
      completed: rows.filter((r) => r.status === 3).length,
      emergency: rows.filter((r) => r.isEmergency).length,
    }),
    [rows],
  );

  const selected = filtered.find((r) => r.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      {/* LEFT: queue table */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Hàng chờ tiếp nhận · <b>{filtered.length}</b></span>
          <span className="sub">{dayjs(date).format('DD/MM/YYYY')}</span>
          <div className="actions">
            <input
              type="date"
              className="input"
              style={{ width: 150 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm theo tên, mã BN, CCCD, SĐT…"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button className="btn primary" type="button">
              <TermIcon name="plus" size={13} />
              Tiếp nhận BN
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? (
            <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div className="ph" style={{ margin: 14 }}>Chưa có bệnh nhân khớp bộ lọc</div>
          ) : (
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
                {filtered.map((r) => {
                  const st = statusLabel(r.status);
                  return (
                    <tr
                      key={r.id}
                      className={r.id === selectedId ? 'sel' : ''}
                      onClick={() => setSelectedId(r.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono">{r.queueNumber || '—'}</td>
                      <td className="mono">{r.patientCode}</td>
                      <td>
                        {r.patientName}{' '}
                        {r.isEmergency && <span className="chip crit" style={{ marginLeft: 6 }}>Cấp cứu</span>}
                      </td>
                      <td className="num">{r.age || '—'}</td>
                      <td>{r.patientTypeName}</td>
                      <td className="muted">{r.roomName || r.departmentName || '—'}</td>
                      <td>
                        <span className={`chip ${st.cls}`}>{st.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RIGHT: stats + detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {/* Stats */}
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

        {/* Detail */}
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
                        {selected.isInsuranceValid ? (
                          <span className="chip ok" style={{ marginLeft: 6 }}>Hợp lệ</span>
                        ) : (
                          <span className="chip warn" style={{ marginLeft: 6 }}>Hết hạn</span>
                        )}
                      </span>
                    }
                  />
                )}
                <Field label="Khoa / Phòng" value={`${selected.departmentName || '—'} · ${selected.roomName || '—'}`} />
                <Field label="Thời gian vào" value={<span className="mono">{dayjs(selected.admissionDate).format('HH:mm DD/MM')}</span>} />
                {selected.chiefComplaint && <Field label="Lý do khám" value={selected.chiefComplaint} />}
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button className="btn primary" type="button">Gọi vào khám</button>
                  <button className="btn" type="button">In phiếu</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; crit?: boolean; ok?: boolean }> = ({ label, value, warn, crit, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div
      style={{
        fontSize: 26, fontWeight: 600, marginTop: 4,
        color: crit ? 'var(--s-crit)' : warn ? 'var(--s-warn)' : ok ? 'var(--s-ok)' : 'var(--t-0)',
      }}
    >
      {value}
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="label">{label}</div>
    <div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div>
  </div>
);

export default ReceptionV2;
